
/**
 * Service to interact with HuggingFace Inference API
 * Uses the free, public Inference API for image captioning.
 * Model: Salesforce/blip-image-captioning-large
 */

// Switched to FuseCap (Best for Detailed Descriptions). 
// NOTE: As per your log, THIS NEEDS WARMUP. It will say "Waking Up" for ~20s. Please Wait.
const HF_API_URL = "https://api-inference.huggingface.co/models/noamrot/FuseCap-ImageCaptioning-v1_0";

// Optional: User can add a key if public API is too busy
const STORAGE_KEY = 'visionaid_hf_key';

// PASTE YOUR READ TOKEN HERE
// PASTE YOUR READ TOKEN HERE
const HARDCODED_KEY = ''; // CLEARING FOR GITHUB PUSH SAFETY

export const getApiKey = () => HARDCODED_KEY || localStorage.getItem(STORAGE_KEY) || '';
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);

export const generateSceneDescription = async (predictions) => {
    const blob = await captureImageBlob();
    if (!blob) return "Camera error.";

    const apiKey = getApiKey();
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    return await fetchWithRetry(HF_API_URL, {
        method: "POST",
        headers: headers,
        body: blob,
    }, predictions);
};

// Retry Helper for "Model Loading" (503)
async function fetchWithRetry(url, options, predictions, retries = 3) {
    try {
        const response = await fetch(url, options);

        if (response.status === 503) {
            const data = await response.json();
            const waitTime = data.estimated_time || 5;
            if (retries > 0) {
                console.log(`Model Loading... Waiting ${waitTime}s`);
                // Keep the "Waking Up" message as it is distinct from an error
                return `System: AI Waking Up (${Math.ceil(waitTime)}s)...`;
            }
        }

        if (!response.ok) {
            console.warn("HF API Error:", response.status);
            // Fallback to local "Dumb AI"
            return fallbackLocalDescription(predictions);
        }

        const result = await response.json();
        // Format: [{"generated_text": "description..."}]
        if (Array.isArray(result) && result[0]?.generated_text) {
            return result[0].generated_text;
        } else {
            return fallbackLocalDescription(predictions);
        }
    } catch (error) {
        console.error("HF Request Failed:", error);
        return fallbackLocalDescription(predictions);
    }
}

// Helper: Capture current video frame as Blob
async function captureImageBlob() {
    const video = document.querySelector('video');
    if (!video) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; // Use actual resolution
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
}

// Fallback: Use the detection boxes we already have (Dumb AI)
function fallbackLocalDescription(predictions) {
    if (!predictions || predictions.length === 0) return "Nothing distinct detected.";

    // Simple logic: "I see a laptop and a bottle."
    const classes = predictions.map(p => p.class);
    const unique = [...new Set(classes)];
    if (unique.length === 0) return "Scene is unclear.";

    return `I see ${unique.join(', ')}.`;
}
