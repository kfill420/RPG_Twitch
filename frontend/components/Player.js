export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // 1. Initialisation du Sprite et des Animations
        this.createSprite(x, y);

        // 2. Physique Matter (Hitbox aux pieds)
        this.body = scene.matter.add.circle(x, y + 10, 5, {
            isSensor: true,
            inertia: Infinity,
            label: 'heroBody'
        });

        // 3. Variables d'état
        this.isAttacking = false;
        this.isSliding = false;
        this.canSlide = true;
        this.slideSpeed = 0;
        this.slideVec = new Phaser.Math.Vector2();
    }

    createSprite(x, y) {
        this.sprite = this.scene.add.sprite(x, y, "hero-idle-0").setScale(0.04);
        this.sprite.setOrigin(0.5, 0.8);

        const anims = this.scene.anims;
        if (!anims.exists('idle')) {
            anims.create({ key: "idle", frames: Array.from({ length: 18 }, (_, i) => ({ key: `hero-idle-${i}` })), frameRate: 20, repeat: -1 });
            anims.create({ key: "walk", frames: Array.from({ length: 24 }, (_, i) => ({ key: `hero-walk-${i}` })), frameRate: 44, repeat: -1 });
            anims.create({ key: "run", frames: Array.from({ length: 12 }, (_, i) => ({ key: `hero-run-${i}` })), frameRate: 24, repeat: -1 });
            anims.create({ key: "attack", frames: Array.from({ length: 12 }, (_, i) => ({ key: `hero-attack-${i}` })), frameRate: 30, repeat: 0 });
            anims.create({ key: "slide", frames: Array.from({ length: 6 }, (_, i) => ({ key: `hero-slide-${i}` })), frameRate: 20, repeat: 0 });
        }
        this.sprite.play("idle");
    }

    attack(pointer) {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.sprite.play("attack", true);

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);
        this.sprite.setFlipX(pointer.worldX < this.sprite.x);

        const hx = this.sprite.x + Math.cos(angle) * 10;
        const hy = this.sprite.y + Math.sin(angle) * 10;
        const hitbox = this.scene.matter.add.circle(hx, hy, 5, { isSensor: true, label: 'heroHitbox' });

        this.sprite.once('animationcomplete-attack', () => {
            this.isAttacking = false;
            this.scene.matter.world.remove(hitbox);
            this.sprite.play("idle");
        });
    }

    slide(vx, vy) {
        if (!this.canSlide || this.isAttacking || (vx === 0 && vy === 0)) return;
        this.isSliding = true;
        this.canSlide = false;
        this.slideSpeed = 0.45;
        this.slideVec.set(vx, vy).normalize();
        this.sprite.play("slide", true);
        this.scene.time.delayedCall(3000, () => { this.canSlide = true; });
    }

    update(cursors, keys, delta, collisionBodies) {
        let vx = 0, vy = 0;
        if (cursors.left.isDown || keys.Q.isDown) vx = -1;
        else if (cursors.right.isDown || keys.D.isDown) vx = 1;
        if (cursors.up.isDown || keys.Z.isDown) vy = -1;
        else if (cursors.down.isDown || keys.S.isDown) vy = 1;

        if (Phaser.Input.Keyboard.JustDown(keys.CTRL)) this.slide(vx, vy);

        let finalVx, finalVy, currentSpeed;
        if (this.isSliding) {
            finalVx = this.slideVec.x; finalVy = this.slideVec.y;
            currentSpeed = this.slideSpeed * delta;
            this.slideSpeed *= 0.975;
            if (this.slideSpeed < 0.03) { this.isSliding = false; this.slideSpeed = 0; }
        } else {
            const isRunning = keys.SHIFT.isDown;
            const speed = isRunning ? 0.10 : 0.05;
            currentSpeed = speed * delta * (this.isAttacking ? 0.2 : 1.0);
            finalVx = vx; finalVy = vy;
        }

        // Animation logic
        if (!this.isSliding && !this.isAttacking) {
            if (vx !== 0 || vy !== 0) {
                this.sprite.play(keys.SHIFT.isDown ? "run" : "walk", true);
                this.sprite.setFlipX(vx < 0);
            } else {
                this.sprite.play("idle", true);
            }
        }

        // Movement with collision check
        const tryMove = (dx, dy) => {
            this.scene.matter.body.translate(this.body, { x: dx, y: dy });
            if (this.scene.matter.query.collides(this.body, collisionBodies).length > 0) {
                this.scene.matter.body.translate(this.body, { x: -dx, y: -dy });
            }
        };

        tryMove(finalVx * currentSpeed, 0);
        tryMove(0, finalVy * currentSpeed);

        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
    }
}