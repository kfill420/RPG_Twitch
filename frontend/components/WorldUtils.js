export const setupWorld = (scene, map) => {
    const sortingGroup = scene.add.group();

    // Récupération des buissons
    const bushLayer = map.getObjectLayer('Bushes');
    if (bushLayer) {
        bushLayer.objects.forEach(obj => {
            const key = obj.width === 48 ? "buisson1" : "buisson2";
            const bush = scene.add.sprite(obj.x, obj.y, key).setOrigin(0, 1);
            sortingGroup.add(bush);
        });
    }

    return sortingGroup;
};

export const applyYSorting = (group, heroSprite) => {
    group.getChildren().forEach(child => {
        // Offset de +8 pour le héros afin qu'il passe derrière plus tard
        const depthOffset = (child === heroSprite) ? 8 : 0;
        child.setDepth(child.y + depthOffset);
    });
};