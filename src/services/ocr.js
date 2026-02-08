import Tesseract from 'tesseract.js';

let worker = null;

export const initOCR = async () => {
    if (worker) return worker;
    console.log("Initializing Tesseract...");
    worker = await Tesseract.createWorker('eng');
    // worker.loadLanguage('eng');
    // worker.initialize('eng');
    console.log("Tesseract ready.");
    return worker;
};

export const readText = async (videoElement) => {
    if (!videoElement) return null;

    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to image data URL or blob is handled by Tesseract
    // Tesseract.js can take canvas directly
    try {
        if (!worker) await initOCR();

        const { data: { text, confidence } } = await worker.recognize(canvas);

        if (confidence > 50 && text.trim().length > 5) {
            return text.replace(/\s+/g, ' ').trim();
        }
        return null;
    } catch (err) {
        console.error("OCR Error:", err);
        return null;
    }
};
