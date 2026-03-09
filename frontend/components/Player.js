import WEAPON_CONFIG from './WeaponConfig.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        this.body = scene.matter.add.circle(x, y + 10, 5, {
            isSensor: true,
            inertia: Infinity,
            label: 'heroBody'
        });

        this.isAttacking = false;
        this.isSliding = false;
        this.canSlide = true;
        this.slideSpeed = 0;
        this.slideVec = new Phaser.Math.Vector2();
        this.currentWeapon = 'baseball';
        this.weaponSprite = null;
        this.activeHitbox = null;

        this.createSprite(x, y);
    }

    createSprite(x, y) {
        this.sprite = this.scene.add.sprite(x, y, "hero-idle-0").setScale(0.04);
        this.sprite.setOrigin(0.5, 0.8);

        // Initialise le sprite de l'arme (vide au début)
        this.weaponSprite = this.scene.add.sprite(x, y, "").setScale(0.04);
        this.weaponSprite.setOrigin(0.5, 0.65);
        this.weaponSprite.setVisible(false);

        const anims = this.scene.anims;

        const createDoubleAnim = (key, length, rate, repeat = -1) => {
    // 1. Anim du Héros (ne change pas)
    if (!anims.exists(key)) {
        anims.create({
            key: key,
            frames: Array.from({ length }, (_, i) => ({ key: `hero-${key}-${i}` })),
            frameRate: rate,
            repeat: repeat
        });
    }

    // 2. Anim de l'Arme (On corrige le tir ici)
            if (key === "attack") {
                const weaponKey = `${this.currentWeapon}-attack`; // Nom de l'anim : baseball-attack
                
                // ATTENTION : On utilise "attacking" car c'est ce qui est défini dans MainScene
                const textureKeyBase = `${this.currentWeapon}-attacking`; 
            
                if (!anims.exists(weaponKey)) {
                    anims.create({
                        key: weaponKey,
                        frames: Array.from({ length }, (_, i) => ({ 
                            key: `${textureKeyBase}-${i}` // Va chercher baseball-attacking-0, 1, etc.
                        })),
                        frameRate: rate,
                        repeat: repeat
                    });
                }
            }
        };

        createDoubleAnim("idle", 18, 20);
        createDoubleAnim("walk", 24, 44);
        createDoubleAnim("run", 12, 24);
        createDoubleAnim("kick", 12, 24, 0);
        createDoubleAnim("attack", 12, 30, 0);
        createDoubleAnim("slide", 6, 20, 0);

        this.sprite.play("idle");
    }

    // Remplace tes fonctions par celles-ci
    attack() {
        if (this.isAttacking) return;
        const config = WEAPON_CONFIG[this.currentWeapon];
        if (!config) return;

        this.isAttacking = true;
        this.weaponSprite.setVisible(true);
        this.playDualAnim("attack");

        this.activeHitbox = this.scene.matter.add.circle(this.sprite.x, this.sprite.y, config.radius, { 
            isSensor: true, 
            label: 'heroHitbox' 
        });

        this.sprite.once('animationcomplete-attack', () => {
            this.isAttacking = false;
            this.weaponSprite.setVisible(false);
            if (this.activeHitbox) {
                this.scene.matter.world.remove(this.activeHitbox);
                this.activeHitbox = null;
            }
            this.playDualAnim("idle");
        });
    }

    kick() {
        if (this.isAttacking || this.isSliding) return;
        this.isAttacking = true;

        this.playDualAnim("kick");

        this.activeHitbox = this.scene.matter.add.circle(this.sprite.x, this.sprite.y, 4, { 
            isSensor: true, 
            label: 'heroKick' 
        });

        this.sprite.once('animationcomplete-kick', () => {
            this.isAttacking = false;
            if (this.activeHitbox) {
                this.scene.matter.world.remove(this.activeHitbox);
                this.activeHitbox = null;
            }
            this.playDualAnim("idle");
        });
    }

    slide(vx, vy) {
        if (!this.canSlide || this.isAttacking || (vx === 0 && vy === 0)) return;
        this.isSliding = true;
        this.canSlide = false;
        this.slideSpeed = 0.45;
        this.slideVec.set(vx, vy).normalize();
        this.playDualAnim("slide");
        this.scene.time.delayedCall(3000, () => { this.canSlide = true; });
    }

    update(cursors, keys, delta, collisionBodies) {
    const pointer = this.scene.input.activePointer;
    pointer.updateWorldPoint(this.scene.cameras.main);
    const mouseX = pointer.worldX;
    const mouseY = pointer.worldY;

    let vx = 0, vy = 0;
    if (cursors.left.isDown || keys.Q.isDown) vx = -1;
    else if (cursors.right.isDown || keys.D.isDown) vx = 1;
    if (cursors.up.isDown || keys.Z.isDown) vy = -1;
    else if (cursors.down.isDown || keys.S.isDown) vy = 1;

    // Déclenchement des actions
    if (Phaser.Input.Keyboard.JustDown(keys.CTRL)) this.slide(vx, vy);

    // --- GESTION DYNAMIQUE DE LA VISÉE PENDANT L'ACTION ---
    if (this.isAttacking && this.activeHitbox) {
        const isMouseToLeft = mouseX < this.sprite.x;
        this.sprite.setFlipX(isMouseToLeft);
        this.weaponSprite.setFlipX(isMouseToLeft);

        // 2. Calcul de l'angle à partir du buste
        const centerX = this.sprite.x;
        const centerY = this.sprite.y - 10;
        const angle = Phaser.Math.Angle.Between(centerX, centerY, mouseX, mouseY);
        
        let range, offsetY = 0;
        if (this.activeHitbox.label === 'heroKick') {
            range = 8;
        } else {
            const config = WEAPON_CONFIG[this.currentWeapon];
            range = config.range;
            offsetY = config.offsetY;
        }

        const hx = centerX + Math.cos(angle) * range;
        const hy = centerY + Math.sin(angle) * range + offsetY;

        // On force la position de la hitbox
        this.scene.matter.body.setPosition(this.activeHitbox, { x: hx, y: hy });
    }

    // Logique de vitesse
    let finalVx, finalVy, currentSpeed;
    if (this.isSliding) {
        finalVx = this.slideVec.x; finalVy = this.slideVec.y;
        currentSpeed = this.slideSpeed * delta;
        this.slideSpeed *= 0.975;
        if (this.slideSpeed < 0.03) { this.isSliding = false; this.slideSpeed = 0; }
    } else {
        const isRunning = keys.SHIFT.isDown;
        const speed = isRunning ? 0.10 : 0.05;
        // Ralentissement pendant l'attaque pour plus de réalisme
        currentSpeed = speed * delta * (this.isAttacking ? 0.2 : 1.0);
        finalVx = vx; finalVy = vy;
    }

    // Animation de déplacement (seulement si on n'attaque pas et ne glisse pas)
    if (!this.isSliding && !this.isAttacking) {
        if (vx !== 0 || vy !== 0) {
            const anim = keys.SHIFT.isDown ? "run" : "walk";
            this.playDualAnim(anim);
            this.setDualFlip(vx < 0);
        } else {
            this.playDualAnim("idle");
        }
    }

    // Application du mouvement avec collisions
    const tryMove = (dx, dy) => {
        this.scene.matter.body.translate(this.body, { x: dx, y: dy });
        if (this.scene.matter.query.collides(this.body, collisionBodies).length > 0) {
            this.scene.matter.body.translate(this.body, { x: -dx, y: -dy });
        }
    };

    tryMove(finalVx * currentSpeed, 0);
    tryMove(0, finalVy * currentSpeed);

    // Synchronisation des sprites sur le corps physique
    this.sprite.x = this.body.position.x;
    this.sprite.y = this.body.position.y;
    this.weaponSprite.x = this.sprite.x;
    this.weaponSprite.y = this.sprite.y;
}

    playDualAnim(key) {
        this.sprite.play(key, true);

        if (key === "attack") {
            const weaponKey = `${this.currentWeapon}-attack`;

            if (this.scene.anims.exists(weaponKey)) {
                this.weaponSprite.setVisible(true);
                this.weaponSprite.setAlpha(1); // Sécurité
                this.weaponSprite.play(weaponKey, true);
            }
        } else {
            this.weaponSprite.setVisible(false);
            if (this.weaponSprite.anims && this.weaponSprite.anims.isPlaying) {
                this.weaponSprite.stop();
            }
        }
    }

    setDualFlip(isFlipped) {
        this.sprite.setFlipX(isFlipped);
        this.weaponSprite.setFlipX(isFlipped);
    }

    setWeapon(newWeaponName) {
    this.currentWeapon = newWeaponName;
    
    // On force la recréation des animations pour la nouvelle arme
    const animKeys = ["idle", "walk", "run", "attack", "slide", "kick"];
    const anims = this.scene.anims;

    animKeys.forEach(key => {
        const weaponKey = `${this.currentWeapon}-${key}`;
        if (!anims.exists(weaponKey)) {
            // On récupère les infos de l'anim du héros pour copier le timing
            const heroAnim = anims.get(key);
            anims.create({
                key: weaponKey,
                frames: Array.from({ length: heroAnim.frames.length }, (_, i) => ({ key: `${this.currentWeapon}-${key}-${i}` })),
                frameRate: heroAnim.frameRate,
                repeat: heroAnim.repeat
            });
        }
    });

    // On relance l'animation actuelle avec la nouvelle texture
    const currentKey = this.sprite.anims.currentAnim.key;
    this.weaponSprite.play(`${this.currentWeapon}-${currentKey}`);
}
}