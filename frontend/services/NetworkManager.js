/**
 * @class NetworkManager
 * @description Gère la communication WebSocket avec le serveur.
 * Centralise les événements réseau pour éviter de polluer les scènes.
 */

class NetworkManager {
    constructor() {
        this.socket = null;
        this.url = "http://localhost:3001";
    }

    init(gameInstance) {
        this.socket = io(this.url);

        this.socket.on("connect", () => {
            console.log(`[Network] Connected to ${this.url}`);
        });

        this.socket.on("user-action", (data) => {
            this.handleUserAction(gameInstance, data);
        });

        this.socket.on("connect_error", (err) => {
            console.error("[Network] Connection failed:", err.message);
        });
    }

    handleUserAction(game, data) {
        console.log("[Network] Action received:", data);
        
        const gameScene = game.scene.getScene('GameScene');
        
        if (gameScene && game.scene.isActive('GameScene')) {
            gameScene.handleAction(data.action);
        }
    }

    //Méthode pour envoyer des données au serveur
    sendAction(actionType, payload) {
        if (this.socket) {
            this.socket.emit("player-action", { type: actionType, ...payload });
        }
    }
}

export const networkManager = new NetworkManager();