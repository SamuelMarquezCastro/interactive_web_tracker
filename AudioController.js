export default class AudioController {
  constructor({ onCommand, onStatusChange }) {
    this.onCommand = onCommand;
    this.onStatusChange = onStatusChange;
    this.recognizer = null;
    this.isListening = false;
    this.lastCommandTimes = {
      clap: 0,
      snap: 0,
    };
    this.cooldowns = {
      clap: 550,
      snap: 700,
    };
    this.thresholds = {
      run: 0.82,
      jump: 0.9,
      snap: 0.92,
      background: 0.72,
    };
    this.minConfidenceGap = 0.18;
  }

  async enable() {
    if (this.isListening) {
      this.emitStatus("listening", "Mic is live. Snap to start.");
      return;
    }

    this.assertBrowserSupport();
    this.emitStatus("loading", "Loading audio model...");

    const recognizer = await this.createRecognizer();
    await recognizer.ensureModelLoaded();

    this.emitStatus("arming", "Waiting for microphone permission...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    await recognizer.listen(
      (result) => {
        this.handlePrediction(result, recognizer.wordLabels());
      },
      {
        includeSpectrogram: false,
        probabilityThreshold: 0,
        overlapFactor: 0.5,
        invokeCallbackOnNoiseAndUnknown: true,
      }
    );

    this.recognizer = recognizer;
    this.isListening = true;
    this.emitStatus("listening", "Mic is live. Snap to start.");
  }

  stop() {
    if (!this.recognizer || !this.isListening) return;
    this.recognizer.stopListening();
    this.isListening = false;
    this.emitStatus("idle", "Microphone paused.");
  }

  async createRecognizer() {
    if (!window.speechCommands) {
      throw new Error("speechCommands failed to load.");
    }

    const modelUrl = new URL("tm-my-audio-model/model.json", window.location.href).href;
    const metadataUrl = new URL(
      "tm-my-audio-model/metadata.json",
      window.location.href
    ).href;

    return window.speechCommands.create(
      "BROWSER_FFT",
      undefined,
      modelUrl,
      metadataUrl
    );
  }

  assertBrowserSupport() {
    if (!window.isSecureContext) {
      throw new Error("Microphone access requires localhost, file://, or HTTPS.");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not expose microphone access here.");
    }
  }

  handlePrediction(result, labels) {
    const entries = labels.map((label, index) => ({
      label,
      score: result.scores[index],
    }));

    entries.sort((a, b) => b.score - a.score);
    const top = entries[0];
    const second = entries[1];

    if (!top) return;

    const normalized = top.label.toLowerCase();
    const scoreGap = top.score - (second?.score ?? 0);
    const isConfident = scoreGap >= this.minConfidenceGap;
    const debug = this.formatDebug(top, second);

    if (normalized === "background noise" && top.score >= this.thresholds.background) {
      this.emitStatus("listening", "Listening for snap, clap, or A...", { debug });
      return;
    }

    if (!isConfident) {
      this.emitStatus(
        "listening",
        "Sound was too unclear. Try a cleaner clap, snap, or A.",
        { debug }
      );
      return;
    }

    this.emitStatus("hearing", `${top.label} ${Math.round(top.score * 100)}%`, {
      debug,
    });

    if (normalized === "a" && top.score >= this.thresholds.run) {
      this.onCommand?.({ type: "run", confidence: top.score });
      return;
    }

    if (
      normalized === "clap" &&
      top.score >= this.thresholds.jump &&
      this.readyFor("clap")
    ) {
      this.lastCommandTimes.clap = Date.now();
      this.onCommand?.({ type: "jump", confidence: top.score });
      return;
    }

    if (
      normalized === "snap" &&
      top.score >= this.thresholds.snap &&
      this.readyFor("snap")
    ) {
      this.lastCommandTimes.snap = Date.now();
      this.onCommand?.({ type: "snap", confidence: top.score });
      return;
    }

    this.emitStatus("listening", "Listening for snap, clap, or A...", { debug });
  }

  readyFor(command) {
    return Date.now() - this.lastCommandTimes[command] > this.cooldowns[command];
  }

  formatDebug(top, second) {
    if (!top) {
      return "Waiting for audio...";
    }

    const lead = `${top.label} ${Math.round(top.score * 100)}%`;
    const runnerUp = second
      ? ` · next ${second.label} ${Math.round(second.score * 100)}%`
      : "";

    return `Heard ${lead}${runnerUp}`;
  }

  emitStatus(state, detail, extras = {}) {
    this.onStatusChange?.({ state, detail, ...extras });
  }
}
