export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        const { width, height } = this.scale;

        // --- INTERFACE VISUELLE ---
        // Barre de fond (grise)
        this.add.rectangle(width / 2, height / 2, 400, 30, 0x333333);
        
        // Barre de progression (bleue)
        const progressBar = this.add.rectangle(width / 2 - 200, height / 2, 0, 30, 0x00ffff).setOrigin(0, 0.5);
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'CHARGEMENT...', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2 + 50, '0%', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // --- ÉVÉNEMENTS DE CHARGEMENT ---
        this.load.on('progress', (value) => {
            progressBar.width = 400 * value;
            percentText.setText(Math.round(value * 100) + '%');
        });

        this.load.on('complete', () => {
            // Une fois fini, on lance la vraie scène de jeu
            this.scene.start('GameScene');
        });

        // --- CHARGE ICI TOUS TES ASSETS DE JEU ---
        // (Déplace ici les load.image, load.spritesheet, load.audio de ta GameScene)
        this.load.image('hero', './assets/hero.png');
        // Simule un gros chargement pour tester (optionnel)
        /* for(let i=0; i<100; i++) { this.load.image('test'+i, './assets/particle.png'); } */
    }
}