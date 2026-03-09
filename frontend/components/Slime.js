export default class Slime {
    constructor(scene, x, y, type = 1) {
        this.scene = scene;
        this.type = type;
        this.hp = 3;
        this.isHurt = false;
        this.isDead = false;

        // Création du sprite avec Matter
        this.sprite = scene.matter.add.sprite(x, y, `slime${type}-idle`, 0);
        this.sprite.setBody({ type: 'circle', radius: 12 }); // Hitbox circulaire au centre
        this.sprite.setFixedRotation();
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

    update(playerSprite) {
        if (this.isDead || this.isHurt) return;

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        
        // IA : Si le joueur est à portée (ex: 150px), le slime le suit
        if (distance < 150 && distance > 15) {
            const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
            const speed = 0.001; // Force légère pour Matter
            
            this.sprite.applyForce({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });

            // Déterminer la direction pour l'anim
            const deg = Phaser.Math.RadToDeg(angle);
            let dir = 'down';

            if (deg >= -135 && deg <= -45) dir = 'up';
            else if (deg > -45 && deg < 45) dir = 'right';
            else if (deg >= 45 && deg <= 135) dir = 'down';
            else dir = 'left';

            this.sprite.play(`slime${this.type}-run-${dir}`, true);
        } else {
            // Idle selon la dernière direction ou face
            this.sprite.play(`slime${this.type}-idle-down`, true);
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