import AudioController from "./AudioController.js";
import Game from "./Game.js";

export default class App {
  constructor() {
    this.storageKey = "mountain-quest-scores";
    this.currentScreen = "start";
    this.voiceRunUntil = 0;
    this.voiceJumpQueued = false;
    this.audioEnabled = false;
    this.voiceRunHoldMs = 220;
    this.jumpRunCarryMs = 430;
    this.savedScores = this.loadSavedScores();

    this.startScreen = document.getElementById("start-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.scoreScreen = document.getElementById("score-screen");
    this.startButton = document.getElementById("start-button");
    this.finishButton = document.getElementById("finish-button");
    this.restartButton = document.getElementById("restart-button");
    this.finalScore = document.getElementById("final-score");
    this.bestScore = document.getElementById("best-score");
    this.hudScore = document.getElementById("hud-score");
    this.startLastScore = document.getElementById("start-last-score");
    this.startBestScore = document.getElementById("start-best-score");
    this.audioStatus = document.getElementById("audio-status");
    this.audioDetail = document.getElementById("audio-detail");
    this.audioLive = document.getElementById("audio-live");
    this.game = new Game({
      containerId: "game-container",
      getInputState: () => this.consumeGameInput(),
      onLevelComplete: (score) => {
        this.finishGame(score);
      },
      onScoreChange: (score) => {
        this.updateScore(score);
      },
    });
    this.audio = new AudioController({
      onCommand: (command) => {
        this.handleAudioCommand(command);
      },
      onStatusChange: (status) => {
        this.handleAudioStatus(status);
      },
    });
  }

  init() {
    this.renderStoredScores();
    this.updateScore(this.savedScores.lastScore);
    this.showScreen("start");
    this.addEventListeners();
  }

  showScreen(screen) {
    this.startScreen.classList.remove("active");
    this.gameScreen.classList.remove("active");
    this.scoreScreen.classList.remove("active");

    if (screen === "start") this.startScreen.classList.add("active");
    if (screen === "game") this.gameScreen.classList.add("active");
    if (screen === "score") this.scoreScreen.classList.add("active");

    this.currentScreen = screen;
  }

  addEventListeners() {
    this.startButton?.addEventListener("click", async () => {
      await this.enableAudio();
    });

    this.finishButton?.addEventListener("click", () => {
      this.finishGame(this.game.score);
    });

    this.restartButton?.addEventListener("click", () => {
      this.game.stop();
      this.updateScore(0);
      this.showScreen("start");
    });

    // tijdelijke testcontrols tot Teachable Machine is gekoppeld
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.startGame();
      }

      if (e.key === "Escape") {
        this.finishGame(this.game.score);
      }
    });
  }

  startGame() {
    this.showScreen("game");
    this.voiceJumpQueued = false;
    this.game.start();
  }

  finishGame(score = 0) {
    this.game.stop();
    this.saveScores(score);
    this.updateScore(score);
    this.showScreen("score");
  }

  updateScore(score) {
    this.finalScore.textContent = score;
    this.hudScore.textContent = score;
  }

  async enableAudio() {
    if (this.audioEnabled) {
      this.handleAudioStatus({
        state: "listening",
        detail: "Mic is already active. Snap to start.",
      });
      return;
    }

    try {
      await this.audio.enable();
      this.audioEnabled = true;
      this.startButton.textContent = "Microphone ready";
    } catch (error) {
      console.error(error);
      this.handleAudioStatus({
        state: "error",
        detail:
          error?.message ||
          "Could not enable the microphone. You can still use keyboard controls.",
      });
    }
  }

  handleAudioCommand(command) {
    if (command.type === "run") {
      this.voiceRunUntil = Date.now() + this.voiceRunHoldMs;
      return;
    }

    if (command.type === "jump") {
      this.queueVoiceJump();
      return;
    }

    if (command.type === "snap") {
      if (this.currentScreen === "start") {
        this.startGame();
        return;
      }

      if (this.currentScreen === "game") {
        this.queueVoiceJump();
        return;
      }

      if (this.currentScreen === "score") {
        this.showScreen("start");
      }
    }
  }

  handleAudioStatus(status) {
    const stateLabel = {
      idle: "Mic: off",
      loading: "Mic: loading",
      arming: "Mic: permission",
      listening: "Mic: listening",
      hearing: "Mic: active",
      error: "Mic: error",
    };

    this.audioStatus.textContent = status.detail;
    this.audioDetail.textContent =
      this.audioEnabled || status.state === "hearing"
        ? "Snap starts. In-game: say A to run. Clap or snap to jump."
        : "Keyboard fallback stays available even without microphone input.";
    this.audioLive.textContent = `${stateLabel[status.state] || "Mic"}${
      status.state === "hearing" ? ` · ${status.detail}` : ""
    }`;
  }

  queueVoiceJump() {
    this.voiceJumpQueued = true;
    this.voiceRunUntil = Math.max(
      this.voiceRunUntil,
      Date.now() + this.jumpRunCarryMs
    );
  }

  consumeGameInput() {
    const jumpQueued = this.voiceJumpQueued;
    this.voiceJumpQueued = false;

    return {
      run: Date.now() < this.voiceRunUntil,
      jump: jumpQueued,
    };
  }

  loadSavedScores() {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (!stored) {
        return { lastScore: 0, bestScore: 0 };
      }

      const parsed = JSON.parse(stored);

      return {
        lastScore: Number.isFinite(parsed?.lastScore) ? parsed.lastScore : 0,
        bestScore: Number.isFinite(parsed?.bestScore) ? parsed.bestScore : 0,
      };
    } catch (error) {
      console.warn("Could not read saved scores.", error);
      return { lastScore: 0, bestScore: 0 };
    }
  }

  saveScores(score) {
    this.savedScores = {
      lastScore: score,
      bestScore: Math.max(this.savedScores.bestScore, score),
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.savedScores));
    } catch (error) {
      console.warn("Could not save scores.", error);
    }

    this.renderStoredScores();
  }

  renderStoredScores() {
    this.bestScore.textContent = this.savedScores.bestScore;
    this.startLastScore.textContent = this.savedScores.lastScore;
    this.startBestScore.textContent = this.savedScores.bestScore;
  }
}
