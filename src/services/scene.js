/**
 * Generates natural language descriptions of the scene.
 */
export const describeScene = (predictions, width = 1280, height = 720) => {
    if (!predictions || predictions.length === 0) {
        return "The view is clear.";
    }

    // Group by class
    const counts = {};
    predictions.forEach(p => {
        counts[p.class] = (counts[p.class] || 0) + 1;
    });

    // Formulate sentence
    const items = Object.entries(counts).map(([name, count]) => {
        return `${count} ${name}${count > 1 ? 's' : ''}`;
    });

    if (items.length === 0) return "Nothing detected.";

    // Spatial description for the largest object
    const sorted = [...predictions].sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]));
    const mainObj = sorted[0];
    const cx = mainObj.bbox[0] + (mainObj.bbox[2] / 2);

    let position = "ahead";
    if (cx < width * 0.4) position = "to your left";
    else if (cx > width * 0.6) position = "to your right";

    const mainDesc = `There is a ${mainObj.class} ${position}.`;
    const otherDesc = `I also see ${items.filter(i => !i.includes(mainObj.class)).join(', ')}.`;

    if (items.length === 1 && items[0].includes(mainObj.class)) {
        return mainDesc;
    }

    return `${mainDesc} ${items.length > 1 ? otherDesc : ''}`;
};
