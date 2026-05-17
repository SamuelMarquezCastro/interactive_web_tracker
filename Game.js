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
    this.cameraX = 0;
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
    this.assets.platform = loadImage("assets/Map/small-platform.png");
    this.assets.spikes = loadImage("assets/Map/spikes.png");

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
      { x: 130, y: 510, w: 96, h: 16 },
      { x: 300, y: 465, w: 48, h: 16 },
      { x: 445, y: 525, w: 112, h: 16, spikes: [{ x: 0, w: 45 }] },
      { x: 620, y: 455, w: 48, h: 16 },
      { x: 780, y: 398, w: 96, h: 16, spikes: [{ x: 30, w: 30 }] },
      { x: 970, y: 508, w: 64, h: 16 },
      { x: 1135, y: 435, w: 48, h: 16 },
      { x: 1300, y: 360, w: 96, h: 16, spikes: [{ x: 15, w: 45 }] },
      { x: 1490, y: 430, w: 48, h: 16 },
      { x: 1660, y: 370, w: 64, h: 16 },
      { x: 1835, y: 315, w: 96, h: 16, spikes: [{ x: 30, w: 30 }] },
      { x: 2035, y: 390, w: 48, h: 16 },
      { x: 2210, y: 335, w: 80, h: 16 },
    ];

    this.gems = [
      { x: 130, y: 470, points: 10, collected: false },
      { x: 300, y: 420, points: 15, collected: false },
      { x: 620, y: 410, points: 20, collected: false },
      { x: 970, y: 468, points: 15, collected: false },
      { x: 1135, y: 390, points: 20, collected: false },
      { x: 1490, y: 385, points: 20, collected: false },
      { x: 1660, y: 325, points: 25, collected: false },
      { x: 2035, y: 345, points: 30, collected: false },
      { x: 2210, y: 290, points: 35, collected: false },
    ];

    this.goal = {
      x: 2410,
      y: 280,
      w: 40,
      h: 150,
    };
  }

  createPlayer() {
    this.player = {
      x: 110,
      y: 472,
      w: 18,
      h: 18,
      vx: 0,
      vy: 0,
      grounded: false,
    };
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
    this.checkSpikeHazards();
    this.collectGems();
    this.checkGoal();
    this.updatePlayerAnimation(moveRight, moveLeft);

    if (this.player.y > height + 80) {
      this.triggerDeath("You fell off the map!");
    }
  }

  applyHorizontalMovement(moveRight, moveLeft) {
    const runSpeed = 5.6;

    if (moveRight && !moveLeft) {
      this.player.vx = runSpeed;
    } else if (moveLeft && !moveRight) {
      this.player.vx = -runSpeed;
    } else {
      this.player.vx *= 0.82;

      if (Math.abs(this.player.vx) < 0.08) {
        this.player.vx = 0;
      }
    }

    this.player.x += this.player.vx;
    this.player.x = constrain(this.player.x, 40, this.levelWidth - 40);
  }

  applyGravity() {
    this.player.vy += 0.48;
    this.player.vy = Math.min(this.player.vy, 12);
    this.player.y += this.player.vy;
    this.player.grounded = false;
  }

  resolvePlatformCollisions(jumpPressed) {
    const playerLeft = this.player.x - this.player.w / 2;
    const playerRight = this.player.x + this.player.w / 2;
    const playerBottom = this.player.y + this.player.h / 2;
    const previousBottom = playerBottom - this.player.vy;
    let landingTop = null;

    for (const platform of this.platforms) {
      const left = platform.x - platform.w / 2;
      const right = platform.x + platform.w / 2;
      const top = platform.y - platform.h / 2;

      const overlapsX = playerRight > left + 2 && playerLeft < right - 2;
      const wasAbove = previousBottom <= top + 1;
      const crossedTop = playerBottom >= top;

      if (overlapsX && wasAbove && crossedTop && this.player.vy >= 0) {
        landingTop = landingTop === null ? top : Math.min(landingTop, top);
      }
    }

    if (landingTop !== null) {
      this.player.y = landingTop - this.player.h / 2;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    if (jumpPressed && !this.jumpPressedLastFrame && this.player.grounded) {
      this.player.vy = -10.8;
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

  checkSpikeHazards() {
    const playerLeft = this.player.x - this.player.w / 2 + 3;
    const playerRight = this.player.x + this.player.w / 2 - 3;
    const playerTop = this.player.y - this.player.h / 2 + 2;
    const playerBottom = this.player.y + this.player.h / 2 - 2;

    for (const platform of this.platforms) {
      if (!platform.spikes?.length) continue;

      const platformLeft = platform.x - platform.w / 2;
      const spikeTop = platform.y - platform.h / 2 - 10;
      const spikeBottom = spikeTop + 10;

      for (const spike of platform.spikes) {
        const left = platformLeft + spike.x;
        const right = left + spike.w;
        const overlaps =
          playerRight > left &&
          playerLeft < right &&
          playerBottom > spikeTop &&
          playerTop < spikeBottom;

        if (overlaps) {
          this.triggerDeath("You hit the spikes!");
          return;
        }
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
    this.updateCamera();

    this.drawSky();
    this.drawClouds();
    this.drawPlatforms();
    this.drawGems();
    this.drawGoalMarker();
    this.drawPlayer();

    if (!this.player) return;

    this.drawOverlayText();
  }

  drawSky() {
    if (this.assets.sky) {
      this.drawTiledLayer(this.assets.sky, 0, 420, height, 0.08, 1);
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
    for (const platform of this.platforms) {
      this.drawPlatform(platform);
      this.drawSpikes(platform);
    }
  }

  drawPlatform(platform) {
    if (!this.assets.platform) return;

    const tileSize = 16;
    const left = this.toScreenX(platform.x - platform.w / 2);
    const top = platform.y - platform.h / 2;
    const cols = Math.round(platform.w / tileSize);

    imageMode(CORNER);

    for (let col = 0; col < cols; col += 1) {
      image(this.assets.platform, left + col * tileSize, top, tileSize, tileSize);
    }
  }

  drawSpikes(platform) {
    if (!this.assets.spikes || !platform.spikes?.length) return;

    const platformLeft = this.toScreenX(platform.x - platform.w / 2);
    const drawY = platform.y - platform.h / 2 - 10;
    imageMode(CORNER);

    for (const spike of platform.spikes) {
      const cols = Math.round(spike.w / 15);

      for (let col = 0; col < cols; col += 1) {
        image(
          this.assets.spikes,
          platformLeft + spike.x + col * 15,
          drawY,
          15,
          10
        );
      }
    }
  }

  drawGems() {
    if (!this.assets.gem) return;

    imageMode(CENTER);

    for (const gem of this.gems) {
      if (gem.collected) continue;

      push();
      tint(255);
      image(this.assets.gem, this.toScreenX(gem.x), gem.y, 27, 23);
      pop();
    }
  }

  drawGoalMarker() {
    if (!this.goal) return;

    push();
    rectMode(CENTER);
    noStroke();
    fill(71, 85, 105);
    rect(this.toScreenX(this.goal.x), this.goal.y + 20, 8, this.goal.h);
    fill("#fef08a");
    triangle(
      this.toScreenX(this.goal.x) + 4,
      this.goal.y - 55,
      this.toScreenX(this.goal.x) + 4,
      this.goal.y - 15,
      this.toScreenX(this.goal.x) + 42,
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

    const offset = this.cameraX * parallax;
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
    if (!this.player) {
      this.cameraX = 0;
      return;
    }

    const leftDeadZone = width * 0.38;
    const targetLeft = constrain(
      this.player.x - leftDeadZone,
      0,
      this.levelWidth - width
    );

    this.cameraX = lerp(this.cameraX, targetLeft, 0.12);
  }

  centerCameraOnStart() {
    this.cameraX = 0;
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
    const movingHorizontally = Math.abs(this.player.vx) > 0.25;
    const clearlyAirborne = !this.player.grounded && Math.abs(this.player.vy) > 0.6;

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

    this.playerState = name;
  }

  triggerDeath(message) {
    this.isDying = true;
    this.deathTimer = 45;
    this.deathMessage = message;
    this.player.vx = 0;
    this.player.vy = 0;
    this.setPlayerAnimation("idle");
  }

  drawPlayer() {
    if (!this.player) return;

    const currentAni =
      this.playerState === "run"
        ? this.assets.playerRun
        : this.playerState === "jump"
          ? this.assets.playerJump
          : this.assets.playerIdle;

    if (!currentAni) return;

    imageMode(CENTER);
    animation(currentAni, this.toScreenX(this.player.x), this.player.y, 60, 58);
  }

  toScreenX(worldX) {
    return worldX - this.cameraX;
  }
}
