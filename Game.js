export default class Game {
  constructor({ containerId, onLevelComplete }) {
    this.containerId = containerId;
    this.onLevelComplete = onLevelComplete;
    this.isInitialized = false;
    this.isActive = false;
    this.score = 0;
    this.levelWidth = 2200;
    this.jumpPressedLastFrame = false;
    this.solids = [];
  }

  init() {
    if (this.isInitialized) return;

    if (!window.p5) {
      throw new Error("p5 failed to load before the game started.");
    }

    window.setup = () => this.setup();
    window.update = () => this.update();
    window.drawFrame = () => this.drawFrame();
    window.windowResized = () => this.handleResize();

    this.sketch = new window.p5();
    this.isInitialized = true;
  }

  start() {
    this.isActive = true;

    if (!this.isInitialized) {
      this.init();
      return;
    }

    this.resetLevel();
  }

  stop() {
    this.isActive = false;
  }

  setup() {
    const canvas = createCanvas(this.getCanvasWidth(), this.getCanvasHeight());
    canvas.parent(this.containerId);

    world.gravity.y = 18;
    this.resetLevel();
  }

  resetLevel() {
    if (typeof allSprites !== "undefined") {
      allSprites.deleteAll();
    }

    this.score = 0;
    this.solids = [];
    this.jumpPressedLastFrame = false;

    this.createPlayer();
    this.createLevelGeometry();
    this.createGoal();
    this.centerCameraOnStart();
  }

  createPlayer() {
    this.player = new Sprite(120, 260, 36, 52);
    this.player.color = "#f97316";
    this.player.stroke = "#7c2d12";
    this.player.strokeWeight = 2;
    this.player.rotationLock = true;
    this.player.friction = 0;
    this.player.drag = 4;
  }

  createLevelGeometry() {
    this.addPlatform(this.levelWidth / 2, 470, this.levelWidth, 80, "#2f855a");
    this.addPlatform(360, 390, 180, 24, "#3f9b67");
    this.addPlatform(620, 330, 140, 24, "#3f9b67");
    this.addPlatform(920, 285, 160, 24, "#3f9b67");
    this.addPlatform(1240, 345, 180, 24, "#3f9b67");
    this.addPlatform(1560, 260, 160, 24, "#3f9b67");
    this.addPlatform(1880, 320, 180, 24, "#3f9b67");
  }

  addPlatform(x, y, w, h, color) {
    const platform = new Sprite(x, y, w, h, "static");
    platform.color = color;
    platform.stroke = "#1f5133";
    this.solids.push(platform);
  }

  createGoal() {
    this.goal = new Sprite(this.levelWidth - 120, 380, 36, 140, "static");
    this.goal.color = "#fde047";
    this.goal.stroke = "#a16207";
  }

  update() {
    if (!this.isActive || !this.player) return;

    const moveRight = kb.pressing("d") || kb.pressing("right");
    const moveLeft = kb.pressing("a") || kb.pressing("left");
    const jumpPressed =
      kb.pressing("space") || kb.pressing("up") || kb.pressing("w");

    if (moveRight && !moveLeft) {
      this.player.vel.x = 4.2;
    } else if (moveLeft && !moveRight) {
      this.player.vel.x = -4.2;
    } else {
      this.player.vel.x *= 0.82;

      if (Math.abs(this.player.vel.x) < 0.1) {
        this.player.vel.x = 0;
      }
    }

    const isGrounded = this.solids.some((platform) =>
      this.player.colliding(platform)
    );

    if (jumpPressed && !this.jumpPressedLastFrame && isGrounded) {
      this.player.vel.y = -11;
    }

    this.jumpPressedLastFrame = jumpPressed;

    if (this.player.y > 700) {
      this.resetLevel();
    }

    if (this.player.overlapping(this.goal)) {
      this.isActive = false;
      this.onLevelComplete?.(this.score);
    }
  }

  drawFrame() {
    background("#7dd3fc");
    this.drawBackdrop();

    if (!this.player) return;

    if (this.isActive) {
      this.updateCamera();
    } else {
      this.centerCameraOnStart();
    }

    camera.off();
    this.drawOverlayText();
    camera.on();
  }

  drawBackdrop() {
    noStroke();
    fill("#d9f99d");
    rect(0, height - 150, width, 150);

    fill("#bfdbfe");
    ellipse(width * 0.18, 120, 220, 90);
    ellipse(width * 0.52, 90, 180, 72);
    ellipse(width * 0.82, 140, 200, 82);
  }

  drawOverlayText() {
    fill(15, 23, 42, 180);
    rect(16, 16, 310, 64, 12);

    fill("#ffffff");
    textSize(16);
    textAlign(LEFT, TOP);
    text("Reach the yellow marker to finish the test level.", 30, 30);
    text("This step is keyboard-only so we can tune movement first.", 30, 52);
  }

  updateCamera() {
    camera.x = constrain(this.player.x, width / 2, this.levelWidth - width / 2);
    camera.y = height / 2;
  }

  centerCameraOnStart() {
    if (typeof camera === "undefined") return;
    camera.x = width / 2;
    camera.y = height / 2;
  }

  handleResize() {
    if (typeof resizeCanvas === "undefined") return;

    resizeCanvas(this.getCanvasWidth(), this.getCanvasHeight());
    this.centerCameraOnStart();
  }

  getCanvasWidth() {
    const container = document.getElementById(this.containerId);
    return Math.min(container?.clientWidth || 960, 1100);
  }

  getCanvasHeight() {
    return Math.max(420, Math.min(window.innerHeight * 0.62, 620));
  }
}
