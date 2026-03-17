export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        const { width, height } = this.scale;

        // --- RÉCUPÉRATION DU VOLUME SAUVEGARDÉ ---
        const savedVolume = localStorage.getItem('game_volume');
        if (savedVolume !== null) {
            this.sound.volume = parseFloat(savedVolume);
        }
        
        const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0.99)
            .setOrigin(0)
            .setInteractive(); 

        // On s'assure que cette scène est tout en haut (Z-index élevé)
        this.scene.bringToTop();

        this.add.text(width / 2, 50, 'RÉGLAGES', { 
            fontSize: '32px', 
            fontFamily: 'Arial Black',
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // --- 2. SECTION VOLUME (Version Slider) ---
        const volY = 135;
        const sliderWidth = 200;
        const sliderHeight = 10;
            
        // Label du volume
        const volLabel = this.add.text(width / 2, volY - 30, `VOLUME : ${Math.round(this.sound.volume * 100)}%`, { fontSize: '20px' }).setOrigin(0.5);
            
        // Fond de la barre de réglage
        const track = this.add.rectangle(width / 2, volY, sliderWidth, sliderHeight, 0x333333).setOrigin(0.5);
            
        // Le curseur (bouton mobile)
        // On calcule sa position X initiale en fonction du volume actuel
        let initialCursorX = (width / 2 - sliderWidth / 2) + (this.sound.volume * sliderWidth);
        const cursor = this.add.rectangle(initialCursorX, volY, 20, 30, 0x00ffff)
            .setInteractive({ useHandCursor: true, draggable: true });
            
        // --- LOGIQUE DE DRAG & DROP ---
        this.input.setDraggable(cursor);
            
        this.input.on('drag', (pointer, gameObject, dragX) => {
            // On limite le mouvement aux bornes de la barre
            const minX = width / 2 - sliderWidth / 2;
            const maxX = width / 2 + sliderWidth / 2;
            
            if (dragX >= minX && dragX <= maxX) {
                gameObject.x = dragX;
                
                // Calcul du volume (entre 0 et 1)
                const newVolume = (dragX - minX) / sliderWidth;
                this.sound.volume = newVolume;
                
                // Mise à jour visuelle et sauvegarde
                volLabel.setText(`VOLUME : ${Math.round(newVolume * 100)}%`);
                localStorage.setItem('game_volume', newVolume);
            }
        });
        // --- 3. SECTION TOUCHES (Mouvements + Actions) ---
        // On définit la liste des touches à gérer
        const controls = [
            { label: 'HAUT',    id: 'key_up',     default: 'Z' },
            { label: 'BAS',     id: 'key_down',   default: 'S' },
            { label: 'GAUCHE',  id: 'key_left',   default: 'Q' },
            { label: 'DROITE',  id: 'key_right',  default: 'D' },
            { label: 'SPRINT',  id: 'key_shift',  default: 'SHIFT' },
            { label: 'SLIDE',  id: 'key_ctrl',  default: 'CTRL' }
        ];

        const startY = 250;
        const spacing = 45;

        controls.forEach((control, index) => {
            const y = startY + (index * spacing);
            const currentKey = localStorage.getItem(control.id) || control.default;

            // Texte de l'action
            this.add.text(width / 2 - 120, y, control.label, { fontSize: '18px' }).setOrigin(0, 0.5);

            // Bouton pour changer
            const keyBtn = this.add.text(width / 2 + 50, y, `[ ${currentKey} ]`, { 
                fontSize: '18px', 
                fill: '#0ff',
                backgroundColor: '#111',
                padding: { x: 5, y: 2 }
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            keyBtn.on('pointerdown', () => {
                keyBtn.setText('[ APPUYEZ ]').setStyle({ fill: '#ff0' });
                
                // On attend la prochaine touche pressée une seule fois
                this.input.keyboard.once('keydown', (event) => {
                    let newKey = event.key.toUpperCase();

                    // Correction pour la touche Espace qui renvoie souvent " "
                    if (newKey === " ") newKey = "SPACE";
                    if (newKey === "CONTROL") newKey = "CTRL";
                    if (newKey === "ARROWUP") newKey = "UP";
                    if (newKey === "ARROWDOWN") newKey = "DOWN";
                    if (newKey === "ARROWLEFT") newKey = "LEFT";
                    if (newKey === "ARROWRIGHT") newKey = "RIGHT";
                    
                    localStorage.setItem(control.id, newKey);
                    keyBtn.setText(`[ ${newKey} ]`).setStyle({ fill: '#0ff' });
                    
                    // Optionnel : émettre un événement pour prévenir la GameScene immédiatement
                    this.events.emit('keyChanged');
                });
            });
        });

        // --- 4. BOUTON RETOUR AU JEU ---
        const btnBack = this.add.text((width / 2) -140, height - 60, 'RETOUR AU JEU', { 
            fontSize: '24px', backgroundColor: '#1e1e82', padding: { x: 20, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnBack.on('pointerdown', () => {
            this.scene.stop();
        });

        // --- 4. BOUTON RETOUR AU MENUE ---
        const btnQuit = this.add.text((width / 2) + 140, height - 60, 'RETOUR AU MENU', { 
            fontSize: '24px', backgroundColor: '#821e1e', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnQuit.on('pointerdown', () => {
            if (this.scene.isActive('GameScene'))
                this.scene.stop('GameScene');
            if (this.scene.isActive('UIScene'))
                this.scene.stop('UIScene');
            this.time.delayedCall(10, () => {
                this.scene.start('MenuScene');
            });
        });
    }
}