/**
 * @class Slime
 * @description Gère l'IA, les animations directionnelles et les sons spatiaux des ennemis.
 */

export default class Slime {
    constructor(scene, x, y, type = 1) {
        this.scene = scene;
        this.type = type;

        // --- 1. CONFIGURATION DES STATS ---
        const stats = {
            1: { hp: 2, damage: 1, speed: 0.15, chaseSpeed: 0.30, range: 18 },
            2: { hp: 2, damage: 1, speed: 0.25, chaseSpeed: 0.45, range: 15 },
            3: { hp: 5, damage: 2, speed: 0.12, chaseSpeed: 0.25, range: 22 },
        };
        const config = stats[type] || stats[1];

        // --- 2. ÉTATS & IA ---
        this.hp = config.hp;
        this.damage = config.damage;
        this.baseSpeed = config.speed;
        this.chaseSpeed = config.chaseSpeed;
        this.attackRange = config.range;

        this.isHurt = false;
        this.isDead = false;
        this.isAttacking = false;
        this.state = "WANDER"; // WANDER ou CHASE
        
        this.detectionRange = 100;
        this.nextDecisionTime = 0;
        this.wanderVec = new Phaser.Math.Vector2();
        this.lastDir = 'down';

        // --- 3. PHYSIQUE (Matter.js) ---
        this.sprite = scene.matter.add.sprite(x, y, `slime${type}-idle`, 0);
        this.sprite.setScale(0.8);
        this.sprite.setBody({ type: 'circle', radius: 7 }); 
        this.sprite.setFixedRotation();
        this.sprite.setFrictionAir(0.1);
        this.sprite.body.label = 'enemy'; 

        this.createAnims();
    }

    // Crée les animations directionnelles basées sur les spritesheets 
    createAnims() {
        const anims = this.scene.anims;
        const t = this.type;
        const directions = ['down', 'up', 'left', 'right'];
        
        directions.forEach((dir, rowIndex) => {
            // IDLE
            if (!anims.exists(`slime${t}-idle-${dir}`)) {
                anims.create({
                    key: `slime${t}-idle-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-idle`, { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
            // RUN
            if (!anims.exists(`slime${t}-run-${dir}`)) {
                anims.create({
                    key: `slime${t}-run-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-run`, { start: rowIndex * 8, end: (rowIndex * 8) + 7 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
            // ATTACK
            if (!anims.exists(`slime${t}-attack-${dir}`)) {
                anims.create({
                    key: `slime${t}-attack-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-attack`, { start: rowIndex * 10, end: (rowIndex * 10) + 9 }),
                    frameRate: 12,
                    repeat: 0
                });
            }
        });

        // DEATH 
        if (!anims.exists(`slime${t}-death`)) {
            anims.create({
                key: `slime${t}-death`,
                frames: anims.generateFrameNumbers(`slime${t}-death`, { start: 0, end: 9 }),
                frameRate: 12,
                repeat: 0
            });
        }
    }

    // Boucle de mise à jour appelée par GameScene
    update(playerSprite, staticBodies) {
        if (this.isDead || !this.sprite.body) return;

        

        if (this.isHurt || this.isAttacking) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        const playerIsDead = this.scene.player && this.scene.player.isDead;
        const distanceToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        const time = this.scene.time.now;

        // 1. Changement d'état
        if (playerIsDead) {
            this.state = 'WANDER';
        } else if (distanceToPlayer < this.attackRange) {
            this.attack(playerSprite);
            return;
        } else if (distanceToPlayer < this.detectionRange) {
            this.state = 'CHASE';
        } else {
            this.state = 'WANDER';
        }

        // 2. Calcul du vecteur de mouvement
        let moveVec = new Phaser.Math.Vector2(0, 0);
        let speed = this.baseSpeed;

        if (this.state === 'CHASE') {
            speed = this.chaseSpeed;
            const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
            moveVec.set(Math.cos(angle), Math.sin(angle));
        } else {
            if (time > this.nextDecisionTime) {
                const isIdling = Math.random() > 0.6;
                if (isIdling) {
                    this.wanderVec.set(0, 0);
                } else {
                    const randomAngle = Math.random() * Math.PI * 2;
                    this.wanderVec.set(Math.cos(randomAngle), Math.sin(randomAngle));
                }
                this.nextDecisionTime = time + Phaser.Math.Between(2000, 4000);
            }
            moveVec.copy(this.wanderVec);
        }

        // 3. Application du mouvement et Animation
        if (moveVec.length() > 0) {
            const vx = moveVec.x * speed * this.scene.game.loop.delta;
            const vy = moveVec.y * speed * this.scene.game.loop.delta;

            this.sprite.setVelocity(vx, vy);
            this.updateDirectionalAnim(moveVec, 'run');
            this.handleMoveSounds();
        } else {
            this.sprite.setVelocity(0, 0);
            this.sprite.play(`slime${this.type}-idle-${this.lastDir}`, true);
        }
    }

    // Détermine quelle animation jouer (up, down, left, right) selon le vecteur
    updateDirectionalAnim(vec, type) {
        const angle = Phaser.Math.RadToDeg(Math.atan2(vec.y, vec.x));
        let dir = 'down';

        if (angle >= -135 && angle <= -45) dir = 'up';
        else if (angle > -45 && angle < 45) dir = 'right';
        else if (angle >= 45 && angle <= 135) dir = 'down';
        else dir = 'left';

        this.lastDir = dir;
        this.sprite.play(`slime${this.type}-${type}-${dir}`, true);
    }

    handleMoveSounds() {
        const frame = this.sprite.anims.currentFrame?.index;
        // Déclenche le son sur une frame précise de l'anim de course
        if (frame === 4 && !this.hasPlayedMoveSound) {
            const spatial = this.getSpatialConfig();
            this.scene.sound.play('slime-move', { 
                volume: 0.1 * spatial.volumeMod, 
                pan: spatial.pan,
                rate: Phaser.Math.FloatBetween(0.8, 1.2)
            });
            this.hasPlayedMoveSound = true;
        } else if (frame !== 4) {
            this.hasPlayedMoveSound = false;
        }
    }

    attack(playerSprite) {
        if (this.isAttacking || (this.scene.player && this.scene.player.isDead)) return;
        this.isAttacking = true;
        this.sprite.setVelocity(0, 0);

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        this.updateDirectionalAnim(new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)), 'attack');

        const attackFrames = { 1: 6, 2: 7, 3: 4 };
        const impactFrame = attackFrames[this.type] || 5;

        const onUpdate = (anim, frame) => {
            if (frame.index === impactFrame) {
                const sound = this.type === 3 ? 'ground-explosion' : this.type === 2 ? 'metal-bite' : 'slime-splash';

                const spatial = this.getSpatialConfig(); 
                this.scene.sound.play(sound, { 
                    volume: 0.2 * spatial.volumeMod, 
                    pan: spatial.pan,
                    detune: Phaser.Math.Between(-200, 200)
                });

                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);

                if (dist < this.attackRange + 15 && this.scene.player) {
                    this.scene.player.takeDamage(this.damage, this.sprite);
                }

                this.sprite.off('animationupdate', onUpdate);
            }
        };

        this.sprite.on('animationupdate', onUpdate);

        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
        });

        this.sprite.on('animationupdate', onUpdate);
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
        });
    }

    takeDamage(amount) {
        if (this.isHurt || this.isDead || this.hp <= 0) return;

        this.hp -= amount;
        this.isHurt = true;
        this.sprite.setTint(0xff0000);

        const spatial = this.getSpatialConfig(); 
        this.scene.sound.play('slime-hit', { 
            volume: 0.4,
            pan: spatial.pan,
            detune: Phaser.Math.Between(-200, 200)
        });

        if (this.hp <= 0) {
            this.die();
        } else {
            this.scene.time.delayedCall(300, () => {
                this.isHurt = false;
                this.sprite.clearTint();
            });
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.sprite.setVelocity(0, 0);
        this.sprite.setSensor(true);
        this.sprite.play(`slime${this.type}-death`);
        
        this.scene.sound.play('death-mob', { 
            volume: 0.5,
            rate: Phaser.Math.FloatBetween(0.8, 1.2)
         });

        this.sprite.once('animationcomplete', () => {
            this.sprite.destroy();
        });
    }

    // Calcule le volume et le pan en fonction de la position à l'écran
    getSpatialConfig() {
        const cam = this.scene.cameras.main;
        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, cam.midPoint.x, cam.midPoint.y);
        const volumeMod = Phaser.Math.Clamp(1 - (dist / 350), 0, 1);
        const pan = Phaser.Math.Clamp((this.sprite.x - cam.midPoint.x) / (cam.width / 2), -1, 1);
        return { volumeMod, pan };
    }
}