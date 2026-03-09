export default class Slime {
    constructor(scene, x, y, type = 1) {
        this.scene = scene;
        this.type = type;
        this.hp = 3;
        this.isHurt = false;
        this.isDead = false;
        this.state = "WANDER";
        this.nextDecisionTime = 0;
        this.wanderVec = new Phaser.Math.Vector2();
        this.detectionRange = 70;

        // Création du sprite avec Matter
        this.sprite = scene.matter.add.sprite(x, y, `slime${type}-idle`, 0);
        this.sprite.setBody({ type: 'circle', radius: 12 }); // Hitbox circulaire au centre
        this.sprite.setFixedRotation();
        this.sprite.setFrictionAir(0.1);
        this.sprite.body.label = 'enemy'; // Important pour les collisions dans MainScene

        this.createAnims();
        
        // Direction par défaut (Face = ligne 0)
        this.currentRow = 0; 
    }

    createAnims() {
        const anims = this.scene.anims;
        const t = this.type;
        
        // On crée les animations pour chaque ligne (direction)
        // 0: Face, 1: Dos, 2: Gauche, 3: Droite (ou selon ton PNG)
        const directions = ['down', 'up', 'left', 'right'];
        
        directions.forEach((dir, rowIndex) => {
            // Idle (6 colonnes)
            if (!anims.exists(`slime${t}-idle-${dir}`)) {
                anims.create({
                    key: `slime${t}-idle-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-idle`, { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
            // Run (8 colonnes)
            if (!anims.exists(`slime${t}-run-${dir}`)) {
                anims.create({
                    key: `slime${t}-run-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-run`, { start: rowIndex * 8, end: (rowIndex * 8) + 7 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
        });

        // Animation de mort (10 colonnes - On prend souvent la ligne de face)
        if (!anims.exists(`slime${t}-death`)) {
            anims.create({
                key: `slime${t}-death`,
                frames: anims.generateFrameNumbers(`slime${t}-death`, { start: 0, end: 9 }),
                frameRate: 12,
                repeat: 0
            });
        }
    }

    update(playerSprite, staticBodies) {
        if (this.isDead || this.isHurt) return;

        const distanceToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        const time = this.scene.time.now;

        // --- MACHINE À ÉTATS ---
        if (distanceToPlayer < this.detectionRange) {
            this.state = 'CHASE';
        } else if (this.state === 'CHASE' && distanceToPlayer > this.detectionRange * 1.5) {
            // Le slime abandonne si le joueur s'éloigne trop
            this.state = 'WANDER';
            this.nextDecisionTime = 0; 
        }

        let moveVec = new Phaser.Math.Vector2(0, 0);
        let speed = 0;

        if (this.state === 'CHASE') {
            // Logique de poursuite
            const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
            moveVec.set(Math.cos(angle), Math.sin(angle));
            speed = 0.25;
        } else {
            // Logique d'errance (WANDER)
            if (time > this.nextDecisionTime) {
                // Décider d'une nouvelle direction ou d'une pause
                const pause = Math.random() > 0.7; // 30% de chance de rester immobile
                if (pause) {
                    this.wanderVec.set(0, 0);
                } else {
                    // Direction aléatoire
                    const randomAngle = Math.random() * Math.PI * 2;
                    this.wanderVec.set(Math.cos(randomAngle), Math.sin(randomAngle));
                }
                this.nextDecisionTime = time + Phaser.Math.Between(1000, 3000); // Prochaine décision dans 1-3s
            }
            moveVec.copy(this.wanderVec);
            speed = 0.1; // Plus lent quand il erre
        }

        // --- APPLICATION DU MOUVEMENT ---
        if (moveVec.length() > 0) {
            const vx = moveVec.x * speed;
            const vy = moveVec.y * speed;

            // On vérifie les murs avant de valider le déplacement
            this.scene.matter.body.translate(this.sprite.body, { x: vx, y: 0 });
            if (this.scene.matter.query.collides(this.sprite.body, staticBodies).length > 0) {
                this.scene.matter.body.translate(this.sprite.body, { x: -vx, y: 0 });
                this.nextDecisionTime = 0; // Force une nouvelle direction si on tape un mur
            }

            this.scene.matter.body.translate(this.sprite.body, { x: 0, y: vy });
            if (this.scene.matter.query.collides(this.sprite.body, staticBodies).length > 0) {
                this.scene.matter.body.translate(this.sprite.body, { x: 0, y: -vy });
                this.nextDecisionTime = 0;
            }

            // --- ANIMATIONS ---
            const angle = Math.atan2(moveVec.y, moveVec.x);
            const deg = Phaser.Math.RadToDeg(angle);
            let dir = 'down';
            if (deg >= -135 && deg <= -45) dir = 'up';
            else if (deg > -45 && deg < 45) dir = 'right';
            else if (deg >= 45 && deg <= 135) dir = 'down';
            else dir = 'left';

            this.sprite.play(`slime${this.type}-run-${dir}`, true);
        } else {
            this.sprite.play(`slime${this.type}-idle-down`, true);
            this.sprite.setVelocity(0, 0);
        }
    }

    takeDamage(amount) {
        if (this.isHurt || this.isDead) return;

        this.hp -= amount;
        this.isHurt = true;

        // Feedback visuel
        this.sprite.setTint(0xff0000);
        
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
        this.isDead = true;
        this.sprite.setSensor(true); // Plus de collisions
        this.sprite.setVelocity(0, 0);
        this.sprite.play(`slime${this.type}-death`);
        
        this.sprite.once('animationcomplete', () => {
            this.sprite.destroy();
            // Optionnel : Retirer de la liste des ennemis de la scene
        });
    }
}