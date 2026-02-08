// Speech Recognition Service using Web Speech API

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

export const initSpeechRecognition = (onCommand) => {
    if (!SpeechRecognition) {
        console.error("Speech Recognition not supported in this browser.");
        return null;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        console.log("Voice recognition active.");
    };

    recognition.onend = () => {
        isListening = false;
        console.log("Voice recognition ended. Restarting...");
        // Auto-restart for continuous listening
        try {
            if (recognition) recognition.start();
        } catch (e) {
            console.error("Restart error:", e);
        }
    };

    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();
        console.log("Voice Command:", command);

        if (onCommand) {
            onCommand(command);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
    };

    return recognition;
};

export const startListening = () => {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    }
};

export const stopListening = () => {
    if (recognition) {
        recognition.stop();
        recognition = null; // Prevent auto-restart logic in onend if we manually stop? 
        // Actually, for this app we want it always on unless explicitly closed.
    }
};
