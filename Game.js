export default class Game {
  constructor({ containerId, onLevelComplete, onScoreChange, getInputState }) {
    this.containerId = containerId;
    this.onLevelComplete = onLevelComplete;
    this.onScoreChange = onScoreChange;
    this.getInputState = getInputState;
    this.isInitialized = false;
    this.isActive = false;
    this.score = 0;
    this.levelWidth = 3900;
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
    this.platformTileSize = 52;
    this.playerBody = { w: 20, h: 18 };
    this.playerArt = { w: 56, h: 54, yOffset: 16 };
    this.cloudLayers = [
      { y: 54, w: 320, h: 96, speed: 0.024, alpha: 0.3 },
      { y: 118, w: 260, h: 80, speed: 0.055, alpha: 0.18 },
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
    const t = this.platformTileSize;

    this.platforms = [
      this.makePlatform(260, 560, 5),
      this.makePlatform(640, 486, 3),
      this.makePlatform(960, 426, 4),
      this.makePlatform(1350, 544, 6, [{ tile: 2, tilesWide: 2 }]),
      this.makePlatform(1775, 456, 3),
      this.makePlatform(2085, 384, 3),
      this.makePlatform(2450, 470, 5, [{ tile: 1, tilesWide: 3 }]),
      this.makePlatform(2860, 348, 3),
      this.makePlatform(3190, 440, 4),
      this.makePlatform(3580, 338, 5),
      this.makePlatform(3960, 270, 3),
    ];

    this.gems = [
      { x: 260, y: 486, points: 10, collected: false },
      { x: 640, y: 412, points: 10, collected: false },
      { x: 960, y: 352, points: 15, collected: false },
      { x: 1180, y: 300, points: 25, collected: false },
      { x: 1775, y: 382, points: 15, collected: false },
      { x: 2085, y: 304, points: 20, collected: false },
      { x: 2860, y: 270, points: 25, collected: false },
      { x: 3420, y: 260, points: 30, collected: false },
      { x: 3960, y: 194, points: 40, collected: false },
    ];

    this.goal = {
      x: 4230,
      y: 198,
      w: 40,
      h: 150,
    };

    this.levelWidth = 4500;
  }

  createPlayer() {
    const startPlatform = this.platforms[0];
    const spawnTop = startPlatform.y - startPlatform.h / 2;

    this.player = {
      x: startPlatform.x - startPlatform.w / 2 + this.platformTileSize * 1.4,
      y: spawnTop - this.playerBody.h / 2,
      w: this.playerBody.w,
      h: this.playerBody.h,
      vx: 0,
      vy: 0,
      grounded: false,
    };
  }

  makePlatform(x, y, tilesWide, spikeTiles = []) {
    const spikes = spikeTiles.map((spike) => ({
      x: spike.tile * this.platformTileSize,
      w: spike.tilesWide * this.platformTileSize,
    }));

    return {
      x,
      y,
      w: tilesWide * this.platformTileSize,
      h: this.platformTileSize,
      spikes,
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
    const externalInput = this.getInputState?.() || { run: false, jump: false };
    const jumpPressed =
      kb.pressing("space") || kb.pressing("up") || kb.pressing("w");
    const runPressed = moveRight || externalInput.run;

    this.applyHorizontalMovement(runPressed, moveLeft);
    this.applyGravity();
    this.resolvePlatformCollisions(jumpPressed || externalInput.jump);
    this.jumpPressedLastFrame = jumpPressed || externalInput.jump;
    this.checkSpikeHazards();
    this.collectGems();
    this.checkGoal();
    this.updatePlayerAnimation(runPressed, moveLeft);

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
    this.player.vy += 0.5;
    this.player.vy = Math.min(this.player.vy, 13);
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

      const landingWindow = Math.max(12, Math.abs(this.player.vy) + 6);
      const overlapsX = playerRight > left + 8 && playerLeft < right - 8;
      const wasAbove = previousBottom <= top + landingWindow;
      const crossedTop = playerBottom >= top - 6;

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
      this.player.vy = -11.2;
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
      this.drawTiledLayer(this.assets.sky, 0, 420, height, 0.04, 1);
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

    const tileSize = this.platformTileSize;
    const left = this.toScreenX(platform.x - platform.w / 2);
    const top = platform.y - tileSize / 2;
    const cols = Math.round(platform.w / tileSize);

    imageMode(CORNER);

    for (let col = 0; col < cols; col += 1) {
      image(this.assets.platform, left + col * tileSize, top, tileSize, tileSize);
    }
  }

  drawSpikes(platform) {
    if (!this.assets.spikes || !platform.spikes?.length) return;

    const platformLeft = this.toScreenX(platform.x - platform.w / 2);
    const spikeHeight = 24;
    const spikeWidth = 36;
    const drawY = platform.y - this.platformTileSize / 2 - spikeHeight + 6;
    imageMode(CORNER);

    for (const spike of platform.spikes) {
      const cols = Math.round(spike.w / spikeWidth);

      for (let col = 0; col < cols; col += 1) {
        image(
          this.assets.spikes,
          platformLeft + spike.x + col * spikeWidth,
          drawY,
          spikeWidth,
          spikeHeight
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
      image(this.assets.gem, this.toScreenX(gem.x), gem.y, 34, 30);
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
    rect(18, 18, 410, 92, 14);

    fill("#ffffff");
    textSize(16);
    textAlign(LEFT, TOP);

    if (this.isDying) {
      text(this.deathMessage, 34, 36);
      text("Restarting the level...", 34, 64);
      return;
    }

    text("Follow the sky route and dodge the spikes.", 34, 32);
    text("Snap starts. Say A to run. Clap or snap to jump.", 34, 54);
    text(`Current score: ${this.score}`, 34, 76);
  }

  updateCamera() {
    if (!this.player) {
      this.cameraX = 0;
      return;
    }

    const leftDeadZone = width * 0.34;
    const lookAhead = Math.max(0, this.player.vx) * 18;
    const targetLeft = constrain(
      this.player.x - leftDeadZone + lookAhead,
      0,
      this.levelWidth - width
    );

    this.cameraX = lerp(this.cameraX, targetLeft, 0.1);
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
    animation(
      currentAni,
      this.toScreenX(this.player.x),
      this.player.y - this.playerArt.yOffset,
      this.playerArt.w,
      this.playerArt.h
    );
  }

  toScreenX(worldX) {
    return worldX - this.cameraX;
  }
}
