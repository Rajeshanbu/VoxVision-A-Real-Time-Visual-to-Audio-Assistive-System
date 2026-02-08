
import React, { useState, useEffect, useRef } from 'react';
import CameraFeed from './components/CameraFeed';
import { generateSceneDescription } from './services/huggingface'; // Switched to HF
import { loadModel, detectObjects } from './services/vision';
import { analyzeNavigationFrame } from './services/navigation';
import { speak, stopSpeaking } from './services/audio';
import { describeScene } from './services/scene';
import { readText } from './services/ocr';
import { initSpeechRecognition, startListening } from './services/speech';

function AppSimple() {
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [spokenText, setSpokenText] = useState("System Ready");
    const [modelLoaded, setModelLoaded] = useState(false);
    const [currentMode, setCurrentMode] = useState('NAV');

    // Removed stale apiKey state. always fetch fresh.

    // Use Refs for Logic Loop (prevents stale closures in CameraFeed)
    const lastSpokenRef = useRef(0);
    const lastSpokenTextRef = useRef("");
    const currentModeRef = useRef('NAV'); // This already exists, but the diff shows it being added here. I'll keep the existing one and ensure it's correctly used.
    const predictionsRef = useRef([]);
    const touchStartRef = useRef(null);
    const isReadingRef = useRef(false); // Lock for OCR

    useEffect(() => {
        loadModel().then(() => setModelLoaded(true));
    }, []);

    // Audio & Voice Command Init
    const enableAudio = () => {
        speak("System Online. Swipe Left or Right to change modes. Tap to repeat.");
        setIsAudioEnabled(true);
        initSpeechRecognition(handleVoiceCommand);
        startListening();
    };

    const handleVoiceCommand = (cmd) => {
        const command = cmd.toLowerCase();
        if (command.includes('nav')) changeMode('NAV');
        else if (command.includes('assistant') || command.includes('describe')) changeMode('ASSISTANT');
        else if (command.includes('read')) changeMode('READ');
    };

    const speakText = (text, priority) => {
        if (!text) return;
        if (isPaused && priority !== 'high') return;

        const now = Date.now();

        // Safety: If it's an emergency, speak immediately
        // If it's normal, just check duplication (don't repeat same sentence for 5s)
        if (priority !== 'emergency' && priority !== 'high') {
            if (text === lastSpokenTextRef.current && now - lastSpokenRef.current < 4000) return;
            // Removed the Global 3s silence to fix "System Mute" bug, relying on individual throttles
            if (now - lastSpokenRef.current < 1000) return; // minimal 1s spacing
        }

        console.log("SPEAKING:", text); // Debug log
        speak(text, priority);
        lastSpokenTextRef.current = text;
        lastSpokenRef.current = now;
        setSpokenText(text);
    };

    const changeMode = (mode) => {
        if (mode === currentMode) return;
        setCurrentMode(mode);
        currentModeRef.current = mode; // Update Ref
        lastSpokenTextRef.current = ""; // Reset dedup

        // HARD STOP on switch
        stopSpeaking();

        // Short delay to ensure the "Stop" takes effect before announcing new mode
        setTimeout(() => {
            speakText(`${mode} Mode Activated.`, 'high');
        }, 100);

        // AI Context Trigger
        if (mode === 'NAV') {
            setTimeout(async () => {
                if (currentModeRef.current !== 'NAV') return;

                // Allow AI to run even if predictions are empty (it will describe "Nothing distinct")
                const context = await generateSceneDescription(predictionsRef.current);

                if (currentModeRef.current === 'NAV') {
                    if (context) speakText(context);
                    // Silent fail is okay here, but if user reports "not working", we might want to know.
                    // Let's rely on the periodic check for error feedback
                }
            }, 1000);
        }
    };

    // Gesture Handling
    const handleTouchStart = (e) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const handleTouchEnd = (e) => {
        if (!touchStartRef.current) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - touchStartRef.current.x;
        const diffY = endY - touchStartRef.current.y;
        const duration = Date.now() - touchStartRef.current.time;

        // Tap (Short, no movement)
        if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30 && duration < 300) {
            if (isPaused) {
                setIsPaused(false);
                speak("Resumed.", "high");
            } else {
                setIsPaused(true);
                stopSpeaking();
                speak("Paused.", "high");
            }
            return;
        }

        // Horizontal Swipe
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            const modes = ['NAV', 'ASSISTANT', 'READ']; // Removed FIND
            const idx = modes.indexOf(currentMode);
            if (diffX > 0) { // Right Swipe -> Next
                const next = modes[(idx + 1) % modes.length];
                changeMode(next);
            } else { // Left Swipe -> Prev
                const prev = modes[(idx - 1 + modes.length) % modes.length];
                changeMode(prev);
            }
        }
    };

    // Vision Loop
    const handleFrame = async (videoElement) => {
        if (!modelLoaded || !isAudioEnabled) return;

        try {
            // Use Ref for instant check inside async loop
            // NOTE: We don't want to block detection updates, but we block ACTIONS
            const mode = currentModeRef.current;

            // Only run detection if we are in a mode that needs it (All do currently)
            const results = await detectObjects(videoElement);
            predictionsRef.current = results;

            // Re-check mode after await (User might have switched during detection)
            if (currentModeRef.current !== mode) return;

            if (mode === 'NAV') {
                const analysis = analyzeNavigationFrame(results);
                if (analysis) {
                    // Logic moved to speakText global pacer, so we can just fire away
                    // But we keep a loose check here to avoid spamming the function call
                    if (Date.now() - lastSpokenRef.current > 1000) {
                        // Only attempt to speak if we haven't tried in the last 500ms (prevent stack overflow)
                        // Note: We rely on speakText's internal checks for the actual logic, 
                        // but we need to stop hammering the function.
                        speakText(analysis.text, analysis.type === 'EMERGENCY' ? 'emergency' : 'normal');
                    }
                }
            } else if (mode === 'ASSISTANT') {
                if (Date.now() - lastSpokenRef.current > 10000) {
                    // HF Service handles its own fallback, just call it.
                    const desc = await generateSceneDescription(results);
                    // Re-check after 2nd await
                    if (currentModeRef.current !== 'ASSISTANT') return;

                    if (desc) speakText(desc);
                    else speakText(describeScene(results));
                }
            } else if (mode === 'READ') {
                // Prevent queue storm: Only read if not currently reading
                if (!isReadingRef.current && Date.now() - lastSpokenRef.current > 2000) {
                    isReadingRef.current = true;
                    setSpokenText("Scanning text..."); // Visual feedback 

                    const text = await readText(videoElement);
                    isReadingRef.current = false; // Unlock

                    // Re-check mode after await
                    if (currentModeRef.current !== 'READ') return;

                    if (text && text.length > 5) { // Min length filter
                        speakText("Reading: " + text);
                    } else {
                        setSpokenText("No text found.");
                    }
                }
            } else if (mode === 'FIND') {
                // (Optional) Add Finder logic if implemented in handleFrame
            }
        } catch (e) { console.error(e); }
    };

    // Periodic AI Context (Nav Mode)
    useEffect(() => {
        if (currentMode !== 'NAV' || !isAudioEnabled) return;

        const runAI = async () => {
            // Debug visual:
            // setSpokenText("AI Checking...");

            const context = await generateSceneDescription(predictionsRef.current);
            console.log("AI Result:", context);

            if (currentMode === 'NAV') {
                if (context) {
                    speakText(context);
                } else {
                    speakText("AI Unknown Failure.");
                }
            }
        };

        const interval = setInterval(runAI, 6000); // Check every 6 seconds for debug

        return () => clearInterval(interval);
    }, [currentMode, isAudioEnabled]);

    // ... (rest of render) ...

    return (
        <div
            className="relative w-full h-full bg-black touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="absolute inset-0 z-0 opacity-50">
                <CameraFeed onFrame={handleFrame} />
            </div>

            {/* Live Captions Overlay */}
            {isAudioEnabled && (
                <div className="fixed bottom-0 left-0 w-full p-8 bg-black/80 backdrop-blur-sm z-50 pointer-events-none border-t border-white/20">
                    <p className="text-yellow-400 text-2xl font-black text-center drop-shadow-md leading-relaxed">
                        {spokenText || "Listening..."}
                    </p>
                </div>
            )}

            {/* Blind-Friendly UI: High Contrast, Audio Trigger */}
            {!isAudioEnabled ? (
                <button
                    onClick={enableAudio}
                    className="fixed inset-0 z-50 w-screen h-screen bg-black/60 backdrop-blur-md text-white font-black text-4xl flex flex-col items-center justify-center p-8 text-center cursor-pointer tracking-tight"
                >
                    <div className="mb-6 text-8xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">👓</div>
                    TAP SCREEN TO START VISION AID
                </button>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-white text-9xl font-black opacity-10">{currentMode[0]}</div>
                    <div className="mt-8 px-6 py-3 bg-black/80 text-white text-2xl font-bold rounded-full backdrop-blur-sm border border-white/10">
                        {currentMode} MODE
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppSimple;
