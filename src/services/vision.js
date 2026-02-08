import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;
let isBackendReady = false;

const initBackend = async () => {
    if (isBackendReady) return;
    try {
        await tf.setBackend('webgl');
        await tf.ready();
        isBackendReady = true;
    } catch (err) {
        console.warn("WebGL backend failed, falling back to CPU:", err);
        try {
            await tf.setBackend('cpu');
            await tf.ready();
            isBackendReady = true;
        } catch (cpuErr) {
            console.error("TensorFlow backend initialization failed:", cpuErr);
        }
    }
};

/**
 * Load the Coco-SSD model.
 * Call this early in the app lifecycle.
 */
export const loadModel = async () => {
    if (model) return model;

    await initBackend();

    try {
        console.log("Loading TensorFlow model...");
        model = await cocoSsd.load();
        console.log("Model loaded successfully.");
        return model;
    } catch (error) {
        console.error("Failed to load model:", error);
        throw error;
    }
};

/**
 * Detect objects in the given video/image element.
 * @param {HTMLVideoElement | HTMLImageElement} input
 * @returns {Promise<Array>} Array of predictions
 */
export const detectObjects = async (input) => {
    if (!model) {
        console.warn("Model not loaded yet.");
        return [];
    }
    try {
        const predictions = await model.detect(input);
        return predictions;
    } catch (err) {
        console.error("Detection error:", err);
        return [];
    }
};
