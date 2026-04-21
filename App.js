export default class App {
  constructor() {
    this.currentScreen = "start";

    this.startScreen = document.getElementById("start-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.scoreScreen = document.getElementById("score-screen");
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
    // tijdelijke test (later vervangen door clap)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.showScreen("game");
      }

      if (e.key === "Escape") {
        this.showScreen("score");
      }
    });
  }
}
