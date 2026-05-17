import Game from "./Game.js";

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
    this.hudScore = document.getElementById("hud-score");
    this.game = new Game({
      containerId: "game-container",
      onLevelComplete: (score) => {
        this.finishGame(score);
      },
      onScoreChange: (score) => {
        this.updateScore(score);
      },
    });
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
      this.startGame();
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
    this.game.start();
  }

  finishGame(score = 0) {
    this.game.stop();
    this.updateScore(score);
    this.showScreen("score");
  }

  updateScore(score) {
    this.finalScore.textContent = score;
    this.hudScore.textContent = score;
  }
}
