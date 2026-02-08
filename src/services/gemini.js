/**
 * Service to interact with Google Gemini API
 * used for detailed scene descriptions.
 */

const STORAGE_KEY = 'visionaid_gemini_key';

// PASTE YOUR API KEY HERE
const HARDCODED_KEY = ''; // CLEARING FOR GITHUB PUSH SAFETY

export const getApiKey = () => HARDCODED_KEY || localStorage.getItem(STORAGE_KEY) || '';
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);

export const generateSceneDescription = async (predictions) => {
    const apiKey = getApiKey();
    if (!apiKey) return "System Error: No API Key found.";

    // 1. Process Spatial Data
    const width = 640; // Approx video width
    const spacialMap = predictions.map(p => {
        const cx = p.bbox[0] + (p.bbox[2] / 2);
        let pos = "ahead";
        if (cx < width * 0.33) pos = "on your left";
        else if (cx > width * 0.66) pos = "on your right";
        return `${p.class} (${pos})`;
    });

    const contextString = spacialMap.join(', ');

    // 2. "Sighted Guide" Persona Prompt
    const prompt = `You are a helpful sighted guide walking next to a blind user. 
    Here is what is currently visible: ${contextString || "Nothing distinct yet"}.
    
    INSTRUCTIONS:
    1. Speak naturally, like a friend. Start with "There is..." or "I see...".
    2. Mention the most important obstacles or safe paths first.
    3. Keep it under 15 words. Fast and clear.
    
    Example: "There is a chair on your left."`;

    try {
        // Confirmed Model for User: gemini-2.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            if (data.error.code === 429) {
                return "Daily Limit Reached. AI unavailable.";
            }
            return `API Error: ${data.error.message.split(':')[0]}`;
        }

        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "AI Error: Response Blocked or Empty.";
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        return `Connection Error: ${error.message}`;
    }
};
