export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene', active: true });
        this.slots = [];
        this.maxSlots = 3; // On commence à 3
    }

    create() {
        // 1. Barre de Vie (Rouge)
        this.add.text(10, 10, 'HP', { fontSize: '12px', fill: '#fff' });
        this.hpBar = this.add.graphics();
        
        // 2. Barre de Stamina (Verte/Jaune)
        this.add.text(10, 30, 'ST', { fontSize: '12px', fill: '#fff' });
        this.staminaBar = this.add.graphics();

        // 3. Conteneur pour l'Inventaire (Slots)
        this.inventoryContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height - 40);
        this.drawInventory();

        // Écouter les événements du joueur
        const mainScene = this.scene.get('MainScene');
        mainScene.events.on('updateUI', this.updateUI, this);
    }

    drawInventory() {
        // On nettoie le conteneur avant de redessiner
        this.inventoryContainer.removeAll();
        this.slots = [];

        const slotSize = 32;
        const spacing = 4;
        const totalWidth = (this.maxSlots * slotSize) + ((this.maxSlots - 1) * spacing);
        const startX = -totalWidth / 2;

        for (let i = 0; i < this.maxSlots; i++) {
            const x = startX + (i * (slotSize + spacing)) + (slotSize / 2);
            
            // Le fond du slot (comme Minecraft)
            const bg = this.add.rectangle(x, 0, slotSize, slotSize, 0x000000, 0.5);
            bg.setStrokeStyle(2, 0xffffff, 0.8);
            
            this.inventoryContainer.add(bg);
            this.slots.push({ x, bg });
        }
    }

    updateUI(data) {
        // Mise à jour HP (0 à 100)
        this.hpBar.clear();
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(40, 12, (data.hp / data.maxHp) * 100, 8);

        // Mise à jour Stamina
        this.staminaBar.clear();
        this.staminaBar.fillStyle(0x00ff00, 1);
        this.staminaBar.fillRect(40, 32, (data.stamina / data.maxStamina) * 100, 8);
    }

    // Fonction pour augmenter le nombre de slots plus tard
    upgradeInventory(amount) {
        this.maxSlots += amount;
        this.drawInventory();
    }
}