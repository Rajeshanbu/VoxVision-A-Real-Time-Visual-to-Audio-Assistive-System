/**
 * Advanced Navigation Logic V2
 * - Implements Gap Finding for realistic pathing
 * - Remaps labels for better context
 */

const REMAP_LABELS = {
    'refrigerator': 'large obstacle',
    'toilet': 'obstacle',
    'chair': 'chair',
    'couch': 'couch',
    'bed': 'bed',
    'dining table': 'table',
    'tv': 'TV',
    'laptop': 'laptop',
    'mouse': 'mouse',
    'keyboard': 'keyboard',
    'cell phone': 'phone',
    'book': 'book',
    'bottle': 'bottle',
    'cup': 'cup',
    'fork': 'fork',
    'knife': 'knife',
    'spoon': 'spoon',
    'bowl': 'bowl',
    'person': 'person',
};

export const analyzeNavigationFrame = (predictions, width = 1280, height = 720) => {
    // 1. Filter and Remap
    const validObjects = predictions
        .filter(p => p.score > 0.50) // Lowered threshold to catch more
        .map(p => ({
            ...p,
            label: REMAP_LABELS[p.class] || p.class,
            center: p.bbox[0] + p.bbox[2] / 2,
            area: p.bbox[2] * p.bbox[3],
            coverage: (p.bbox[2] * p.bbox[3]) / (width * height)
        }));

    if (validObjects.length === 0) {
        // Return null instead of "Path clear" to allow silent scanning?
        // Or return generic "Scanning..." periodically?
        // Let's return "Path Clear" so the user knows it's working, but App.jsx
        // will filter duplicates so it won't spam.
        return { type: 'NAV', text: "Path clear." };
    }

    // 2. Immediate Hazard Check (Stop condition)
    // If a large obstacle is right in front (> 20% coverage and central)
    const centerZone = { start: width * 0.35, end: width * 0.65 };
    const hazard = validObjects.find(p =>
        p.coverage > 0.20 &&
        p.center > centerZone.start &&
        p.center < centerZone.end
    );

    if (hazard) {
        return { type: 'EMERGENCY', text: `Stop. ${hazard.label} ahead.` };
    }

    // 3. Gap Finding Strategy
    // We sort objects left-to-right to find open spaces
    // We consider the "horizon" line (middle height) or just horizontal slices

    // Sort by X position
    validObjects.sort((a, b) => a.bbox[0] - b.bbox[0]);

    // Define frame boundaries
    let gaps = [];
    let currentX = 0;

    // Consider objects that are significant enough to block path (> 5% area or wide)
    const blockingObjects = validObjects.filter(p => p.coverage > 0.05);

    blockingObjects.forEach(obj => {
        const start = obj.bbox[0];
        const end = obj.bbox[0] + obj.bbox[2];

        if (start > currentX) {
            gaps.push({ start: currentX, end: start, size: start - currentX });
        }
        currentX = Math.max(currentX, end);
    });

    // Check final gap after last object
    if (currentX < width) {
        gaps.push({ start: currentX, end: width, size: width - currentX });
    }

    // Find largest gap
    gaps.sort((a, b) => b.size - a.size);
    const bestGap = gaps[0];

    // 4. Directional Logic based on Best Gap
    if (bestGap && bestGap.size > width * 0.4) {
        const gapCenter = bestGap.start + (bestGap.size / 2);

        if (gapCenter < width * 0.4) {
            return { type: 'NAV', text: "Gap on Left. Turn Left." };
        } else if (gapCenter > width * 0.6) {
            return { type: 'NAV', text: "Gap on Right. Turn Right." };
        } else {
            return { type: 'NAV', text: "Forward is clear." };
        }
    }

    // Fallback: If no good gaps, describe nearest obstacle to avoid
    // Find closest (largest area)
    const closest = validObjects.sort((a, b) => b.area - a.area)[0];
    if (closest.center < width * 0.5) {
        return { type: 'NAV', text: `Avoid ${closest.label} on Left.` };
    } else {
        return { type: 'NAV', text: `Avoid ${closest.label} on Right.` };
    }
};
