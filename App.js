export default class App {
  constructor() {
    this.currentScreen = "start";

    this.startScreen = document.getElementById("start-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.scoreScreen = document.getElementById("score-screen");
    this.startButton = document.getElementById("start-button");
    this.finishButton = document.getElementById("finish-button");
    this.restartButton = document.getElementById("restart-button");
    this.finalScore = document.getElementById("final-score");
  }

  init() {
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
    this.startButton?.addEventListener("click", () => {
      this.showScreen("game");
    });

    this.finishButton?.addEventListener("click", () => {
      this.updateScore(0);
      this.showScreen("score");
    });

    this.restartButton?.addEventListener("click", () => {
      this.updateScore(0);
      this.showScreen("start");
    });

    // tijdelijke testcontrols tot Teachable Machine is gekoppeld
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.showScreen("game");
      }

      if (e.key === "Escape") {
        this.updateScore(0);
        this.showScreen("score");
      }
    });
  }

  updateScore(score) {
    this.finalScore.textContent = score;
  }
}
