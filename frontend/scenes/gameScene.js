export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data) {
    this.rt = data.rt; // RenderTexture fourni par MainScene
  }

  preload() {
    this.load.tilemapTiledJSON("map", "./assets/map.tmj");
    this.load.image("tiles", "./assets/exterior.png");

    for (let i = 0; i <= 17; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-idle-${i}`,
        `./assets/character/forest_ranger/3/idle/0_Forest_Ranger_Idle_${num}.png`
      );
    }

    for (let i = 0; i <= 11; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-run-${i}`,
        `./assets/character/forest_ranger/3/running/0_Forest_Ranger_Running_${num}.png`
      );
    }
  }

  create() {
    this.Matter = Phaser.Physics.Matter.Matter;

    /* ================= MAP ================= */

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("exte", "tiles");

    map.createLayer("Ground0", tileset, 0, 0);
    map.createLayer("Ground1", tileset, 0, 0);
    map.createLayer("Ground2", tileset, 0, 0);

    const obstacle0 = map.createLayer("Obstacle0", tileset, 0, 0);
    const obstacle1 = map.createLayer("Obstacle1", tileset, 0, 0);
    const obstacle2 = map.createLayer("Obstacle2", tileset, 0, 0);
    const obstacle3Collision = map.createLayer("Obstacle3_Collision", tileset, 0, 0);
    const obstacle3Visual = map.createLayer("Obstacle3_Visual", tileset, 0, 0);

    const above = map.createLayer("Above1", tileset, 0, 0);
    above.setDepth(9999);

    obstacle3Visual.setDepth(5000);

    /* ================= COLLISIONS ================= */

    obstacle0.setCollisionBetween(1, 10000);
    obstacle1.setCollisionBetween(1, 10000);
    obstacle2.setCollisionBetween(1, 10000);
    obstacle3Collision.setCollisionBetween(1, 10000);

    this.matter.world.convertTilemapLayer(obstacle0);
    this.matter.world.convertTilemapLayer(obstacle1);
    this.matter.world.convertTilemapLayer(obstacle2);
    this.matter.world.convertTilemapLayer(obstacle3Collision);

    /* ================= HERO ================= */

    this.heroSprite = this.add.sprite(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      "hero-idle-0"
    ).setScale(0.05);

    this.heroSprite.setOrigin(0.5, 0.7);

    // ⚠️ PAS SENSOR → vraie collision physique
    this.heroBody = this.matter.add.circle(
      this.heroSprite.x,
      this.heroSprite.y,
      8,
      {
        isSensor: false,
        inertia: Infinity,
        frictionAir: 0.2
      }
    );

    /* ================= ANIMS ================= */

    this.anims.create({
      key: "idle",
      frames: Array.from({ length: 18 }, (_, i) => ({ key: `hero-idle-${i}` })),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "run",
      frames: Array.from({ length: 12 }, (_, i) => ({ key: `hero-run-${i}` })),
      frameRate: 12,
      repeat: -1
    });

    this.heroSprite.play("idle");

    /* ================= CAMERA ================= */

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.cameraTarget = new Phaser.Math.Vector2(
      this.heroSprite.x,
      this.heroSprite.y
    );

    this.cameras.main.startFollow(this.cameraTarget, true, 0.15, 0.15);
    this.cameras.main.roundPixels = true;

    /* ================= INPUT ================= */

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D");

    /* ================= STATS ================= */

    this.speed = 2; 
    // 2 = lent
    // 4 = normal
    // 6 = rapide
    // 8 = très rapide
  }

  update(time, delta) {

    /* ================= INPUT DIR ================= */

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.Q.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) dx = 1;

    if (this.cursors.up.isDown || this.keys.Z.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) dy = 1;

    /* ================= NORMALIZE ================= */

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    /* ================= PHYSICS ================= */

    this.Matter.Body.setVelocity(this.heroBody, {
      x: dx * this.speed,
      y: dy * this.speed
    });

    /* ================= SYNC SPRITE ================= */

    this.heroSprite.x = this.heroBody.position.x;
    this.heroSprite.y = this.heroBody.position.y;

    this.heroSprite.setDepth(this.heroSprite.y);

    /* ================= ANIMS ================= */

    if (dx !== 0 || dy !== 0) {
      if (this.heroSprite.anims.currentAnim?.key !== "run") {
        this.heroSprite.play("run");
      }
    } else {
      if (this.heroSprite.anims.currentAnim?.key !== "idle") {
        this.heroSprite.play("idle");
      }
    }

    /* ================= FLIP ================= */

    if (dx > 0) this.heroSprite.setFlipX(false);
    else if (dx < 0) this.heroSprite.setFlipX(true);

    /* ================= CAMERA TARGET ================= */

    this.cameraTarget.x = this.heroSprite.x;
    this.cameraTarget.y = this.heroSprite.y;

    /* ================= RENDER TEXTURE ================= */

    if (this.rt) {
      this.rt.clear();
      this.rt.draw(this.children.list);
    }
  }
}
