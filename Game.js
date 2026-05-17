export default class Game {
  constructor({ containerId, onLevelComplete, onScoreChange }) {
    this.containerId = containerId;
    this.onLevelComplete = onLevelComplete;
    this.onScoreChange = onScoreChange;
    this.isInitialized = false;
    this.isActive = false;
    this.score = 0;
    this.levelWidth = 2200;
    this.jumpPressedLastFrame = false;
    this.groundedFrames = 0;
    this.solids = [];
    this.gems = [];
    this.playerState = "idle";
    this.assets = {};
  }

  init() {
    if (this.isInitialized) return;

    if (!window.p5) {
      throw new Error("p5 failed to load before the game started.");
    }

    window.preload = () => this.preload();
    window.setup = () => this.setup();
    window.update = () => this.update();
    window.drawFrame = () => this.drawFrame();
    window.windowResized = () => this.handleResize();

    this.sketch = new window.p5();
    this.isInitialized = true;
  }

  preload() {
    this.assets.sky = loadImage("assets/Map/sunny-mountains-sky.png");
    this.assets.clouds = loadImage("assets/Map/clouds.png");
    this.assets.backMountains = loadImage("assets/Map/back.png");
    this.assets.middleMountains = loadImage("assets/Map/middle.png");
    this.assets.tileset = loadImage("assets/Map/tileset.png");

    this.assets.playerIdle = loadAnimation(
      "assets/Foxy/idle/player-idle-1.png",
      "assets/Foxy/idle/player-idle-2.png",
      "assets/Foxy/idle/player-idle-3.png",
      "assets/Foxy/idle/player-idle-4.png"
    );

    this.assets.playerRun = loadAnimation(
      "assets/Foxy/run/player-run-1.png",
      "assets/Foxy/run/player-run-2.png",
      "assets/Foxy/run/player-run-3.png",
      "assets/Foxy/run/player-run-4.png",
      "assets/Foxy/run/player-run-5.png",
      "assets/Foxy/run/player-run-6.png"
    );

    this.assets.playerJump = loadAnimation(
      "assets/Foxy/jump/player-jump-1.png",
      "assets/Foxy/jump/player-jump-2.png"
    );

    this.assets.gem = loadImage("assets/Items/gem-3.png");
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
    this.gems = [];
    this.jumpPressedLastFrame = false;
    this.groundedFrames = 0;
    this.playerState = "idle";
    this.onScoreChange?.(this.score);

    this.createPlayer();
    this.createLevelGeometry();
    this.createGems();
    this.createGoal();
    this.centerCameraOnStart();
  }

  createPlayer() {
    this.player = new Sprite(120, 260, 28, 30);
    this.player.rotationLock = true;
    this.player.friction = 0;
    this.player.drag = 4;
    this.player.addAni("idle", this.assets.playerIdle);
    this.player.addAni("run", this.assets.playerRun);
    this.player.addAni("jump", this.assets.playerJump);
    this.player.changeAni("idle");
    this.player.ani.scale = 2.2;
    this.player.layer = 15;
    this.player.debug = false;
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
    platform.visible = false;
    this.solids.push(platform);
  }

  createGoal() {
    this.goal = new Sprite(this.levelWidth - 120, 380, 36, 140, "static");
    this.goal.color = "#fde047";
    this.goal.stroke = "#a16207";
    this.goal.visible = false;
  }

  createGems() {
    const gemSpots = [
      { x: 310, y: 345, points: 10 },
      { x: 620, y: 280, points: 15 },
      { x: 930, y: 235, points: 20 },
      { x: 1250, y: 295, points: 20 },
      { x: 1560, y: 210, points: 25 },
      { x: 1890, y: 270, points: 30 },
    ];

    gemSpots.forEach((gemSpot) => {
      const gem = new Sprite(gemSpot.x, gemSpot.y, 20, 20, "static");
      gem.img = this.assets.gem;
      gem.img.scale = 1.8;
      gem.points = gemSpot.points;
      gem.layer = 10;
      this.gems.push(gem);
    });
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

    if (isGrounded) {
      this.groundedFrames = Math.min(this.groundedFrames + 1, 12);
    } else {
      this.groundedFrames = 0;
    }

    if (jumpPressed && !this.jumpPressedLastFrame && this.groundedFrames > 0) {
      this.player.vel.y = -11;
      this.groundedFrames = 0;
    }

    this.jumpPressedLastFrame = jumpPressed;
    this.updatePlayerAnimation(moveRight, moveLeft);
    this.collectGems();

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
    if (this.player && this.isActive) {
      this.updateCamera();
    } else if (this.player) {
      this.centerCameraOnStart();
    }

    this.drawBackdrop();
    this.drawPlatforms();
    this.drawGoalMarker();

    if (!this.player) return;

    camera.off();
    this.drawOverlayText();
    camera.on();
  }

  drawBackdrop() {
    imageMode(CORNER);

    this.drawTiledLayer(this.assets.sky, 0, width, height, 0);
    this.drawTiledLayer(this.assets.clouds, 36, 360, 112, 0.08);
    this.drawTiledLayer(this.assets.backMountains, height - 245, 340, 210, 0.16);
    this.drawTiledLayer(
      this.assets.middleMountains,
      height - 205,
      190,
      205,
      0.24
    );

    noStroke();
    fill(76, 201, 240, 120);
    rect(0, height - 86, width, 86);
    fill(147, 197, 253, 105);
    rect(0, height - 112, width, 20);
  }

  drawPlatforms() {
    if (!this.assets.tileset) return;

    imageMode(CORNER);

    this.solids.forEach((platform) => {
      this.drawPlatformTiles(platform);
    });
  }

  drawPlatformTiles(platform) {
    const tileSize = 16;
    const left = platform.x - platform.w / 2;
    const top = platform.y - platform.h / 2;
    const cols = Math.max(1, Math.round(platform.w / tileSize));
    const rows = Math.max(1, Math.round(platform.h / tileSize));

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const dx = left + col * tileSize;
        const dy = top + row * tileSize;
        const sx = col === 0 ? 0 : col === cols - 1 ? 32 : 16;
        const sy = row === 0 ? 0 : row === rows - 1 ? 48 : 16;

        image(
          this.assets.tileset,
          dx,
          dy,
          tileSize,
          tileSize,
          sx,
          sy,
          tileSize,
          tileSize
        );
      }
    }
  }

  drawGoalMarker() {
    if (!this.goal) return;

    push();
    rectMode(CENTER);
    noStroke();
    fill(71, 85, 105);
    rect(this.goal.x, this.goal.y + 10, 8, 150);
    fill("#fef08a");
    triangle(
      this.goal.x + 4,
      this.goal.y - 55,
      this.goal.x + 4,
      this.goal.y - 15,
      this.goal.x + 42,
      this.goal.y - 35
    );
    pop();
  }

  drawTiledLayer(
    img,
    drawY = 0,
    tileWidth = width,
    tileHeight = height,
    parallax = 0
  ) {
    if (!img) return;

    const offset = camera.x * parallax;
    const startX = -((offset % tileWidth) + tileWidth);

    for (let x = startX; x < width + tileWidth; x += tileWidth) {
      image(img, x, drawY, tileWidth, tileHeight);
    }
  }

  drawOverlayText() {
    fill(15, 23, 42, 185);
    rect(16, 16, 360, 88, 12);

    fill("#ffffff");
    textSize(16);
    textAlign(LEFT, TOP);
    text("Collect the gems and reach the yellow marker.", 30, 30);
    text("Easy gems are low. The higher gems are worth more points.", 30, 52);
    text(`Current score: ${this.score}`, 30, 74);
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

  updatePlayerAnimation(moveRight, moveLeft) {
    const movingHorizontally = Math.abs(this.player.vel.x) > 0.45;
    const clearlyAirborne =
      this.groundedFrames === 0 && Math.abs(this.player.vel.y) > 0.6;

    if (clearlyAirborne) {
      this.setPlayerAnimation("jump", 2.2);
      return;
    }

    if ((moveRight || moveLeft || movingHorizontally) && this.groundedFrames > 1) {
      this.setPlayerAnimation("run", 2.2);
      return;
    }

    this.setPlayerAnimation("idle", 2.2);
  }

  setPlayerAnimation(name, scale) {
    if (this.playerState === name) return;

    this.player.changeAni(name);
    this.player.ani.scale = scale;
    this.playerState = name;
  }

  collectGems() {
    this.gems = this.gems.filter((gem) => {
      if (!gem || gem.removed) return false;

      if (this.player.overlapping(gem)) {
        this.score += gem.points;
        this.onScoreChange?.(this.score);
        gem.remove();
        return false;
      }

      return true;
    });
  }
}
