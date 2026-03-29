/**
 * @class SettingsScene
 * @description Gère l'interface des réglages (Volume et Remapping des touches).
 * Cette scène est généralement lancée en mode "Overlay" par-dessus la GameScene.
 */

import { networkManager } from '../services/NetworkManager.js';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        const { width, height } = this.scale;

        // --- 1. PERSISTANCE ET INITIALISATION ---
        const savedVolume = localStorage.getItem('game_volume');
        if (savedVolume !== null) {
            this.sound.volume = parseFloat(savedVolume);
        }

        // --- 2. INTERFACE DE FOND (BLOCKER) ---
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9)
            .setOrigin(0)
            .setInteractive();

        this.scene.bringToTop();

        // Titre principal
        this.add.text(width / 2, 50, 'RÉGLAGES', { 
            fontSize: '32px', 
            fontFamily: 'Arial Black',
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // --- 3. SECTION VOLUME (SLIDER) ---
        this.createVolumeSlider(width, 135);

        // --- 4. SECTION CONTRÔLES (KEYBINDING) ---
        this.createKeybindingMenu(width, 250);

        // --- 5. BOUTONS DE NAVIGATION ---
        this.createNavigationButtons(width, height);
    }

    // Crée le curseur de réglage du volume
    createVolumeSlider(width, y) {
        const sliderWidth = 200;
        const sliderHeight = 10;
        
        const volLabel = this.add.text(width / 2, y - 30, 
            `VOLUME : ${Math.round(this.sound.volume * 100)}%`, 
            { fontSize: '20px' }
        ).setOrigin(0.5);
            
        // Barre grise (le rail)
        this.add.rectangle(width / 2, y, sliderWidth, sliderHeight, 0x333333).setOrigin(0.5);
            
        // Position initiale du curseur basée sur le volume actuel
        let initialX = (width / 2 - sliderWidth / 2) + (this.sound.volume * sliderWidth);
        
        const cursor = this.add.rectangle(initialX, y, 20, 30, 0x00ffff)
            .setInteractive({ useHandCursor: true, draggable: true });

        // Logique de glissement
        this.input.on('drag', (pointer, gameObject, dragX) => {
            const minX = width / 2 - sliderWidth / 2;
            const maxX = width / 2 + sliderWidth / 2;
            
            // On contraint le curseur entre min et max
            let finalX = Phaser.Math.Clamp(dragX, minX, maxX);
            gameObject.x = finalX;
            
            // Conversion de la position X en valeur 0 à 1
            const newVolume = (finalX - minX) / sliderWidth;
            this.sound.volume = newVolume;
            
            // Mise à jour visuelle et stockage
            volLabel.setText(`VOLUME : ${Math.round(newVolume * 100)}%`);
            localStorage.setItem('game_volume', newVolume);
        });
    }

    // Crée la liste interactive pour changer les touches du clavier
    createKeybindingMenu(width, startY) {
        const controls = [
            { label: 'HAUT',    id: 'key_up',    default: 'Z' },
            { label: 'BAS',     id: 'key_down',  default: 'S' },
            { label: 'GAUCHE',  id: 'key_left',  default: 'Q' },
            { label: 'DROITE',  id: 'key_right', default: 'D' },
            { label: 'SPRINT',  id: 'key_shift', default: 'SHIFT' },
            { label: 'SLIDE',   id: 'key_ctrl',  default: 'CTRL' }
        ];

        const spacing = 45;

        controls.forEach((control, index) => {
            const y = startY + (index * spacing);
            const currentKey = localStorage.getItem(control.id) || control.default;

            this.add.text(width / 2 - 120, y, control.label, { fontSize: '18px' }).setOrigin(0, 0.5);

            const keyBtn = this.add.text(width / 2 + 50, y, `[ ${currentKey} ]`, { 
                fontSize: '18px', fill: '#0ff', backgroundColor: '#111', padding: { x: 5, y: 2 }
            }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

            keyBtn.on('pointerdown', () => {
                keyBtn.setText('[ APPUYEZ ]').setStyle({ fill: '#ff0' });
                
                this.input.keyboard.once('keydown', (event) => {
                    let newKey = event.key.toUpperCase();

                    const replacements = {
                        " ": "SPACE",
                        "CONTROL": "CTRL",
                        "ESCAPE": "ESC",
                        "ARROWUP": "UP",
                        "ARROWDOWN": "DOWN",
                        "ARROWLEFT": "LEFT",
                        "ARROWRIGHT": "RIGHT"
                    };
                    
                    if (replacements[newKey]) newKey = replacements[newKey];
                    
                    localStorage.setItem(control.id, newKey);
                    keyBtn.setText(`[ ${newKey} ]`).setStyle({ fill: '#0ff' });
                    
                    this.events.emit('keyChanged');
                });
            });
        });
    }

    // Boutons Retour et Quitter
    createNavigationButtons(width, height) {
        // Bouton Retour : Ferme simplement cette scène
        const btnBack = this.add.text((width / 2) - 140, height - 60, 'RETOUR AU JEU', { 
            fontSize: '24px', backgroundColor: '#1e1e82', padding: { x: 20, y: 10 } 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnBack.on('pointerdown', () => this.scene.stop());

        // Bouton Quitter
        const btnQuit = this.add.text((width / 2) + 140, height - 60, 'RETOUR AU MENU', { 
            fontSize: '24px', backgroundColor: '#821e1e', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btnQuit.on('pointerdown', () => {
            console.log("Tentative de quitter via NetworkManager...");

            if (networkManager && networkManager.socket) {
                networkManager.socket.emit("leaveGameManual");
                networkManager.socket.disconnect();
                networkManager.pendingPlayers = null;
            } 

            const scenesToStop = ['GameScene', 'UIScene', 'SettingsScene'];
            scenesToStop.forEach(s => {
                if (this.scene.isActive(s)) this.scene.stop(s);
            });
            
            this.scene.start('MenuScene');
        });

        // Effets hover
        [btnBack, btnQuit].forEach(btn => {
            btn.on('pointerover', () => btn.setAlpha(0.8));
            btn.on('pointerout', () => btn.setAlpha(1));
        });
    }
}