export default class Game {
  constructor({ containerId, onLevelComplete, onScoreChange }) {
    this.containerId = containerId;
    this.onLevelComplete = onLevelComplete;
    this.onScoreChange = onScoreChange;
    this.isInitialized = false;
    this.isActive = false;
    this.score = 0;
    this.levelWidth = 2600;
    this.assets = {};
    this.platforms = [];
    this.gems = [];
    this.goal = null;
    this.player = null;
    this.playerState = "idle";
    this.jumpPressedLastFrame = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathMessage = "";
    this.cloudLayers = [
      { y: 70, w: 260, h: 80, speed: 0.05, alpha: 0.8 },
      { y: 140, w: 210, h: 64, speed: 0.1, alpha: 0.45 },
    ];
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
    this.isDying = false;
    this.deathTimer = 0;
  }

  setup() {
    const canvas = createCanvas(this.getCanvasWidth(), this.getCanvasHeight());
    canvas.parent(this.containerId);
    this.resetLevel();
  }

  resetLevel() {
    if (typeof allSprites !== "undefined") {
      allSprites.deleteAll();
    }

    this.score = 0;
    this.onScoreChange?.(this.score);
    this.jumpPressedLastFrame = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathMessage = "";
    this.playerState = "idle";

    this.buildLevel();
    this.createPlayer();
    this.centerCameraOnStart();
  }

  buildLevel() {
    this.platforms = [
      { x: 180, y: 500, w: 250, h: 24 },
      { x: 470, y: 425, w: 170, h: 24 },
      { x: 730, y: 350, w: 150, h: 24 },
      { x: 970, y: 435, w: 180, h: 24 },
      { x: 1240, y: 325, w: 150, h: 24 },
      { x: 1510, y: 405, w: 180, h: 24 },
      { x: 1785, y: 295, w: 150, h: 24 },
      { x: 2050, y: 385, w: 170, h: 24 },
      { x: 2320, y: 305, w: 180, h: 24 },
    ];

    this.gems = [
      { x: 180, y: 450, points: 10, collected: false },
      { x: 470, y: 375, points: 15, collected: false },
      { x: 730, y: 300, points: 20, collected: false },
      { x: 970, y: 385, points: 15, collected: false },
      { x: 1240, y: 275, points: 25, collected: false },
      { x: 1510, y: 355, points: 20, collected: false },
      { x: 1785, y: 245, points: 30, collected: false },
      { x: 2050, y: 335, points: 20, collected: false },
      { x: 2320, y: 255, points: 35, collected: false },
    ];

    this.goal = {
      x: 2480,
      y: 245,
      w: 40,
      h: 150,
    };
  }

  createPlayer() {
    this.player = new Sprite(110, 462, 18, 18);
    this.player.collider = "none";
    this.player.rotationLock = true;
    this.player.vel.x = 0;
    this.player.vel.y = 0;
    this.player.addAni("idle", this.assets.playerIdle);
    this.player.addAni("run", this.assets.playerRun);
    this.player.addAni("jump", this.assets.playerJump);
    this.player.changeAni("idle");
    this.player.ani.scale = 2.2;
    this.player.layer = 10;
    this.player.debug = false;
    this.player.grounded = false;
  }

  update() {
    if (!this.isActive || !this.player) return;

    if (this.isDying) {
      this.deathTimer -= 1;

      if (this.deathTimer <= 0) {
        this.resetLevel();
      }

      return;
    }

    const moveRight = kb.pressing("d") || kb.pressing("right");
    const moveLeft = kb.pressing("a") || kb.pressing("left");
    const jumpPressed =
      kb.pressing("space") || kb.pressing("up") || kb.pressing("w");

    this.applyHorizontalMovement(moveRight, moveLeft);
    this.applyGravity();
    this.resolvePlatformCollisions(jumpPressed);
    this.jumpPressedLastFrame = jumpPressed;
    this.collectGems();
    this.checkGoal();
    this.updatePlayerAnimation(moveRight, moveLeft);

    if (this.player.y > height + 80) {
      this.triggerDeath("You fell off the map!");
    }
  }

  applyHorizontalMovement(moveRight, moveLeft) {
    const runSpeed = 4.2;

    if (moveRight && !moveLeft) {
      this.player.vel.x = runSpeed;
    } else if (moveLeft && !moveRight) {
      this.player.vel.x = -runSpeed;
    } else {
      this.player.vel.x *= 0.82;

      if (Math.abs(this.player.vel.x) < 0.08) {
        this.player.vel.x = 0;
      }
    }

    this.player.x += this.player.vel.x;
    this.player.x = constrain(this.player.x, 40, this.levelWidth - 40);
  }

  applyGravity() {
    this.player.vel.y += 0.48;
    this.player.vel.y = Math.min(this.player.vel.y, 12);
    this.player.y += this.player.vel.y;
    this.player.grounded = false;
  }

  resolvePlatformCollisions(jumpPressed) {
    const playerLeft = this.player.x - this.player.w / 2;
    const playerRight = this.player.x + this.player.w / 2;
    const playerBottom = this.player.y + this.player.h / 2;
    const previousBottom = playerBottom - this.player.vel.y;

    for (const platform of this.platforms) {
      const left = platform.x - platform.w / 2;
      const right = platform.x + platform.w / 2;
      const top = platform.y - platform.h / 2;

      const overlapsX = playerRight > left + 6 && playerLeft < right - 6;
      const wasAbove = previousBottom <= top + 2;
      const isCrossingTop = playerBottom >= top && playerBottom <= top + 22;

      if (overlapsX && wasAbove && isCrossingTop && this.player.vel.y >= 0) {
        this.player.y = top - this.player.h / 2;
        this.player.vel.y = 0;
        this.player.grounded = true;
        break;
      }
    }

    if (jumpPressed && !this.jumpPressedLastFrame && this.player.grounded) {
      this.player.vel.y = -10.8;
      this.player.grounded = false;
    }
  }

  collectGems() {
    for (const gem of this.gems) {
      if (gem.collected) continue;

      const dx = Math.abs(this.player.x - gem.x);
      const dy = Math.abs(this.player.y - gem.y);

      if (dx < 20 && dy < 22) {
        gem.collected = true;
        this.score += gem.points;
        this.onScoreChange?.(this.score);
      }
    }
  }

  checkGoal() {
    const dx = Math.abs(this.player.x - this.goal.x);
    const dy = Math.abs(this.player.y - this.goal.y);

    if (dx < 28 && dy < 90) {
      this.isActive = false;
      this.onLevelComplete?.(this.score);
    }
  }

  drawFrame() {
    background("#79b8ff");

    if (this.player && this.isActive) {
      this.updateCamera();
    } else if (this.player) {
      this.centerCameraOnStart();
    }

    this.drawSky();
    this.drawClouds();
    this.drawPlatforms();
    this.drawGems();
    this.drawGoalMarker();

    if (!this.player) return;

    camera.off();
    this.drawOverlayText();
    camera.on();
  }

  drawSky() {
    noFill();

    for (let y = 0; y < height; y += 2) {
      const blend = y / height;
      const r = lerp(66, 189, blend);
      const g = lerp(133, 239, blend);
      const b = lerp(245, 255, blend);

      stroke(r, g, b);
      line(0, y, width, y);
    }

    if (this.assets.sky) {
      this.drawTiledLayer(this.assets.sky, height - 295, 360, 295, 0.15, 0.95);
    }
  }

  drawClouds() {
    for (const layer of this.cloudLayers) {
      this.drawTiledLayer(
        this.assets.clouds,
        layer.y,
        layer.w,
        layer.h,
        layer.speed,
        layer.alpha
      );
    }
  }

  drawPlatforms() {
    if (!this.assets.tileset) return;

    imageMode(CORNER);

    for (const platform of this.platforms) {
      this.drawPlatformTiles(platform);
    }
  }

  drawPlatformTiles(platform) {
    const tileSize = 16;
    const left = platform.x - platform.w / 2;
    const top = platform.y - platform.h / 2;
    const cols = Math.round(platform.w / tileSize);

    for (let col = 0; col < cols; col += 1) {
      const dx = left + col * tileSize;
      const sx = col === 0 ? 0 : col === cols - 1 ? 32 : 16;

      image(this.assets.tileset, dx, top, tileSize, tileSize, sx, 0, 16, 16);
      image(
        this.assets.tileset,
        dx,
        top + 16,
        tileSize,
        tileSize,
        sx,
        16,
        16,
        16
      );
    }
  }

  drawGems() {
    if (!this.assets.gem) return;

    imageMode(CENTER);

    for (const gem of this.gems) {
      if (gem.collected) continue;

      push();
      tint(255);
      image(this.assets.gem, gem.x, gem.y, 27, 23);
      pop();
    }
  }

  drawGoalMarker() {
    if (!this.goal) return;

    push();
    rectMode(CENTER);
    noStroke();
    fill(71, 85, 105);
    rect(this.goal.x, this.goal.y + 20, 8, this.goal.h);
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
    parallax = 0,
    opacity = 1
  ) {
    if (!img) return;

    const offset = camera.x * parallax;
    const startX = -((offset % tileWidth) + tileWidth);

    push();
    tint(255, 255 * opacity);
    imageMode(CORNER);

    for (let x = startX; x < width + tileWidth; x += tileWidth) {
      image(img, x, drawY, tileWidth, tileHeight);
    }

    pop();
  }

  drawOverlayText() {
    fill(15, 23, 42, 185);
    rect(16, 16, 360, 88, 12);

    fill("#ffffff");
    textSize(16);
    textAlign(LEFT, TOP);

    if (this.isDying) {
      text(this.deathMessage, 30, 34);
      text("Restarting the level...", 30, 60);
      return;
    }

    text("Jump from platform to platform in the sky.", 30, 30);
    text("Collect gems and reach the flag.", 30, 52);
    text(`Current score: ${this.score}`, 30, 74);
  }

  updateCamera() {
    const followStart = width * 0.55;

    if (this.player.x <= followStart) {
      camera.x = width / 2;
      camera.y = height / 2;
      return;
    }

    const targetX = constrain(
      this.player.x + width * 0.08,
      width / 2,
      this.levelWidth - width / 2
    );

    camera.x = lerp(camera.x, targetX, 0.1);
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
    const movingHorizontally = Math.abs(this.player.vel.x) > 0.25;
    const clearlyAirborne = !this.player.grounded && Math.abs(this.player.vel.y) > 0.6;

    if (clearlyAirborne) {
      this.setPlayerAnimation("jump");
      return;
    }

    if (moveRight || moveLeft || movingHorizontally) {
      this.setPlayerAnimation("run");
      return;
    }

    this.setPlayerAnimation("idle");
  }

  setPlayerAnimation(name) {
    if (this.playerState === name) return;

    this.player.changeAni(name);
    this.player.ani.scale = 2.2;
    this.playerState = name;
  }

  triggerDeath(message) {
    this.isDying = true;
    this.deathTimer = 45;
    this.deathMessage = message;
    this.player.vel.x = 0;
    this.player.vel.y = 0;
    this.setPlayerAnimation("idle");
  }
}
