// components/WeaponConfig.js
const WEAPON_CONFIG = {
    'baseball': {
        range: 10,      // Distance par rapport au centre du joueur
        radius: 9,     // Taille du cercle de collision
        offsetY: 0,     // Ajustement vertical (pour viser plus bas/haut)
        damage: 10,     // Optionnel : pour plus tard
        animationKey: 'attacking' // Pour faire le lien avec les textures
    },
    'knife': {
        range: 12,
        radius: 6,
        offsetY: 0,
        damage: 5,
        animationKey: 'stabbing'
    }
};

export default WEAPON_CONFIG;