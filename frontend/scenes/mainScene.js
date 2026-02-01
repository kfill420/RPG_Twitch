import Player from '../components/Player.js';
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';

export default class MainScene extends Phaser.Scene {
    constructor() { super("MainScene"); }

    preload() {
        this.load.tilemapTiledJSON("map", "./assets/map2.tmj");
        this.load.image("tiles", "./assets/exterior2.png");
        this.load.image("buisson1", "./assets/environment/Bush1_3x3.png");
        this.load.image("buisson2", "./assets/environment/Bush2_2x2.png");

        const loadHeroAnims = (key, folder, prefix, count) => {
            for (let i = 0; i <= count; i++) {
                const num = i.toString().padStart(3, "0");
                this.load.image(
                    `hero-${key}-${i}`, 
                    `./assets/character/forest_ranger/3/${folder}/0_Forest_Ranger_${prefix}_${num}.png`
                );
            }
        };

        loadHeroAnims('idle',   'idle',    'Idle',    17);
        loadHeroAnims('walk',   'walking', 'Walking', 23);
        loadHeroAnims('run',    'running', 'Running', 11);
        loadHeroAnims('attack', 'kicking', 'Kicking', 11);
        loadHeroAnims('slide',  'sliding', 'Sliding', 5);
    }

    create() {
        const map = this.make.tilemap({ key: "map" });
        const tileset = map.addTilesetImage("exterior", "tiles");

        // 1. Couches de sol (Ground)
        map.createLayer("Ground0", tileset, 0, 0);
        map.createLayer("Ground1", tileset, 0, 0);
        map.createLayer("Ground2", tileset, 0, 0);

        // 2. Obstacles standards
        const obstacle0 = map.createLayer("Obstacle0", tileset, 0, 0);
        const obstacle1 = map.createLayer("Obstacle1", tileset, 0, 0);
        const obstacle2 = map.createLayer("Obstacle2", tileset, 0, 0);

        // 3. Obstacle 3 (Séparation Visuel / Collision)
        const obstacle3Collision = map.createLayer("Obstacle3_Collision", tileset, 0, 0);
        const obstacle3Visual = map.createLayer("Obstacle3_Visual", tileset, 0, 0);
        // On met le visuel de l'obstacle 3 assez haut mais sous le Above
        obstacle3Visual.setDepth(5000);

        // 4. Configuration des Collisions Matter pour les Tilemaps
        const collisionLayers = [obstacle0, obstacle1, obstacle2, obstacle3Collision];
        collisionLayers.forEach(layer => {
            layer.setCollisionBetween(1, 10000);
            this.matter.world.convertTilemapLayer(layer);
        });

        // 5. Initialisation du Joueur
        this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

        // 6. World Objects (Buissons) & Y-Sorting Group
        this.sortingGroup = setupWorld(this, map);
        this.sortingGroup.add(this.player.sprite);

        // 7. Couche "Above" (Toujours au premier plan)
        const above = map.createLayer("Above1", tileset, 0, 0);
        this.aboveContainer = this.add.container(0, 0);
        this.aboveContainer.add(above);
        this.aboveContainer.setDepth(9999); // Maximum pour passer au-dessus de tout

        // 8. Inputs & Caméra
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("Z,Q,S,D,SHIFT,CTRL");
        
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player.sprite, false, 0.1, 0.1).setZoom(4);
        
        this.input.on("pointerdown", (p) => this.player.attack(p));
        
        // On récupère les corps statiques pour le moteur de collision du Player
        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);
    }

    update(time, delta) {
        // Logique de mouvement du joueur
        this.player.update(this.cursors, this.keys, delta, this.staticBodies);
        
        // Tri de profondeur entre les buissons et le joueur
        applyYSorting(this.sortingGroup, this.player.sprite);
    }
}