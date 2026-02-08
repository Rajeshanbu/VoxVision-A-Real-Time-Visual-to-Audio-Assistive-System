// Text-to-Speech Service

let synthesis = window.speechSynthesis;
let voices = [];

const loadVoices = () => {
    voices = synthesis.getVoices();
};

if (synthesis.onvoiceschanged !== undefined) {
    synthesis.onvoiceschanged = loadVoices;
}

export const speak = (text, priority = 'normal') => {
    if (!synthesis) return;

    // Emergency messages should interrupt
    if (priority === 'emergency') {
        synthesis.cancel();
    } else if (synthesis.speaking && priority === 'low') {
        // Don't interrupt for low priority details
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a good English voice
    // const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
    // if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.1; // Slightly faster for navigation
    utterance.pitch = 1.0;

    synthesis.speak(utterance);
};

export const stopSpeaking = () => {
    if (synthesis) synthesis.cancel();
}
