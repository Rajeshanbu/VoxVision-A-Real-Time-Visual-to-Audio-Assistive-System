import { generateSceneDescription, setApiKey, getApiKey } from './services/gemini';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import CameraFeed from './components/CameraFeed';
import ModeSelector from './components/ModeSelector';
import StartOverlay from './components/StartOverlay';
import TouchFeedback from './components/TouchFeedback';
import { loadModel, detectObjects } from './services/vision';
import { analyzeNavigationFrame } from './services/navigation';
import { speak, stopSpeaking } from './services/audio';
import { describeScene } from './services/scene';
import { readText } from './services/ocr';
import { initSpeechRecognition, startListening } from './services/speech';

function App() {
  const [started, setStarted] = useState(false);
  console.log("App Render. Started:", started);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState('NAV');
  const [predictions, setPredictions] = useState([]);
  const [lastSpoken, setLastSpoken] = useState(0);
  const [findTarget, setFindTarget] = useState('chair');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKeyState] = useState(getApiKey());

  // Load model on mount
  useEffect(() => {
    loadModel().then(() => {
      setModelLoaded(true);
    });
  }, []);

  // Keep track of latest predictions without triggering re-renders in effects
  const predictionsRef = useRef([]);
  useEffect(() => {
    predictionsRef.current = predictions;
  }, [predictions]);

  // Periodic Context Check for Navigation (Hybrid Mode)
  useEffect(() => {
    console.log("Status Check - Mode:", currentMode, "HasKey:", !!apiKey);
    if (currentMode !== 'NAV' || !apiKey) return;

    console.log("AI Interval Started");
    const interval = setInterval(async () => {
      console.log("AI Interval Tick. Predictions:", predictionsRef.current.length);
      if (predictionsRef.current.length > 0) {
        const context = await generateSceneDescription(predictionsRef.current);
        if (context) {
          console.log("AI Context Generated:", context);
          speakText(context);
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [currentMode, apiKey]);

  const saveKey = (key) => {
    setApiKey(key);
    setApiKeyState(key);
    setShowSettings(false);
    speakText("API Key Saved. AI Features Enabled.");
  };

  const testAI = async () => {
    speakText("Testing AI connection...");
    console.log("Testing AI with key:", apiKey);
    if (!apiKey) {
      speakText("No API Key found.");
      return;
    }
    const result = await generateSceneDescription([{ class: 'test object', score: 0.9 }]);
    if (result) speakText("AI Check Passed: " + result);
    else speakText("AI Check Failed. Check console.");
  };

  // Robust Double Tap Logic using simple click counting
  const touchFeedbackRef = useRef(null);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const handleGlobalClick = (e) => {
    // Visual feedback
    if (touchFeedbackRef.current) {
      touchFeedbackRef.current.trigger(e.clientX, e.clientY);
    }

    tapCountRef.current += 1;

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    tapTimeoutRef.current = setTimeout(() => {
      if (tapCountRef.current === 2) {
        cycleMode();
      }
      tapCountRef.current = 0;
    }, 400); // 400ms window for double tap
  };

  const cycleMode = () => {
    const modes = ['NAV', 'ASSISTANT', 'READ', 'FIND'];
    const currentIdx = modes.indexOf(currentMode);
    const nextIdx = (currentIdx + 1) % modes.length;
    handleModeChange(modes[nextIdx]);
  };

  const handleCommand = (command) => {
    // Navigation Mode commands
    if (command.includes('navigation') || command.includes('navigate')) {
      handleModeChange('NAV');
    }

    // Assistant Mode commands
    else if (command.includes('assistant')) {
      handleModeChange('ASSISTANT');
    } else if (currentMode === 'ASSISTANT' && (command.includes('what') || command.includes('describe'))) {
      // Trigger immediate description
      // We can force a description by resetting lastSpoken
      speakText("Analyzing scene...");
      setLastSpoken(0);
    }

    // Read Mode commands
    else if (command.includes('read') || command.includes('text')) {
      handleModeChange('READ');
    }

    // Find Mode commands
    else if (command.includes('find') || command.includes('search')) {
      const words = command.split(' ');
      const findIndex = words.findIndex(w => w === 'find' || w === 'search');
      if (findIndex !== -1 && words[findIndex + 1]) {
        const target = words[findIndex + 1];
        setFindTarget(target);
        if (currentMode !== 'FIND') handleModeChange('FIND');
        speakText(`Searching for ${target}`);
      } else {
        handleModeChange('FIND');
      }
    }

    // Global Stop
    else if (command.includes('stop') || command.includes('pause')) {
      stopSpeaking();
      speakText("Paused.");
    }
  };

  const handleStart = () => {
    setStarted(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speak("System Online. Listening for commands. Navigation Mode Active.");
    }

    // Initialize Speech Recognition
    const recognition = initSpeechRecognition(handleCommand);
    if (recognition) {
      startListening();
    }
  };

  const [lastSpokenText, setLastSpokenText] = useState("");

  const speakText = (text, priority) => {
    // Deduplication logic
    if (text === lastSpokenText && priority !== 'emergency') {
      // If it's the same text, wait at least 5 seconds before repeating
      if (Date.now() - lastSpoken < 5000) return;
    }

    setIsSpeaking(true);
    speak(text, priority);
    setLastSpokenText(text);
    setLastSpoken(Date.now());
    setTimeout(() => setIsSpeaking(false), 2500);
  };

  const handleModeChange = (mode) => {
    setCurrentMode(mode);
    stopSpeaking();
    setLastSpokenText(""); // Reset duplicate check on mode switch
    speakText(`${mode} Mode.`);

    // Immediate Context Check for Nav
    if (mode === 'NAV' && apiKey) {
      setTimeout(async () => {
        speakText("Updating context...");
        if (predictionsRef.current.length > 0) {
          const context = await generateSceneDescription(predictionsRef.current);
          if (context) speakText(context);
        }
      }, 2000);
    }
  };

  const processAssistant = useCallback(async (results) => {
    // Assistant mode is now reactive to voice OR periodic?
    // User asked for "Audio input only for assistant mode..."
    // Let's keep it periodic (every 10s maybe?) but allow voice to trigger it instantly.
    const now = Date.now();
    if (now - lastSpoken > 8000) {
      // Try AI first
      let text = "";
      if (apiKey) {
        speakText("Analyzing with Cloud AI...");
        const aiDesc = await generateSceneDescription(results);
        if (aiDesc) text = aiDesc;
      }

      if (!text) {
        text = describeScene(results);
      }

      speakText(text);
      // setLastSpoken handled in speakText
    }
  }, [lastSpoken, apiKey]);

  const processReading = async (videoElement) => {
    const now = Date.now();
    if (now - lastSpoken > 4000) {
      const text = await readText(videoElement);
      if (text) {
        speakText("Reading: " + text);
        setLastSpoken(now);
      }
    }
  };

  const processFindMode = useCallback((results) => {
    const target = results.find(r => r.class === findTarget);
    const now = Date.now();

    if (target && (now - lastSpoken > 2500)) {
      const cx = target.bbox[0] + (target.bbox[2] / 2);
      const width = 1280;
      let dir = "ahead";
      if (cx < width * 0.4) dir = "left";
      else if (cx > width * 0.6) dir = "right";

      speakText(`Found ${findTarget} ${dir}.`);
      setLastSpoken(now);
    }
  }, [findTarget, lastSpoken]);

  const processNavigation = useCallback((results) => {
    const analysis = analyzeNavigationFrame(results);
    if (!analysis) return;

    const now = Date.now();
    const throttle = analysis.type === 'EMERGENCY' ? 1500 : 3500;

    if (now - lastSpoken > throttle) {
      speakText(analysis.text, analysis.type === 'EMERGENCY' ? 'emergency' : 'normal');
    }
  }, [lastSpoken]);

  const handleFrame = async (videoElement) => {
    if (!modelLoaded || !started) return;

    try {
      const results = await detectObjects(videoElement);
      setPredictions(results);

      const emergencyCheck = analyzeNavigationFrame(results);
      if (emergencyCheck && emergencyCheck.type === 'EMERGENCY') {
        const now = Date.now();
        if (now - lastSpoken > 1000) {
          speakText(emergencyCheck.text, 'emergency');
          setLastSpoken(now);
        }
        return;
      }

      if (currentMode === 'READ') {
        await processReading(videoElement);
        return;
      }

      if (currentMode === 'NAV') {
        processNavigation(results);
      } else if (currentMode === 'ASSISTANT') {
        processAssistant(results);
      } else if (currentMode === 'FIND') {
        processFindMode(results);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="relative w-full h-full bg-black select-none overflow-hidden touch-none"
      onClick={handleGlobalClick}
    >
      <TouchFeedback ref={touchFeedbackRef} />
      {!started && <StartOverlay onStart={handleStart} visible={true} />}

      <CameraFeed onFrame={handleFrame} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/90 to-transparent z-10 flex justify-between items-start pointer-events-none">
        <div>
          <h1 className="text-white text-2xl font-black tracking-tight drop-shadow-md">VisionAID</h1>
          <p className={`text-sm font-mono mt-1 ${modelLoaded ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
            {modelLoaded ? '● ONLINE' : '○ INITIALIZING...'}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-4xl text-white font-bold opacity-30 tracking-widest">{currentMode}</div>
          {isSpeaking && (
            <div className="flex gap-1 mt-2">
              <div className="w-2 h-6 bg-white animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-8 bg-white animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-4 bg-white animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          )}
        </div>
        {/* Settings Button */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 pointer-events-auto"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl text-white font-bold mb-4">Settings</h2>
          <input
            type="text"
            placeholder="Enter Gemini API Key"
            defaultValue={apiKey}
            className="w-full p-4 rounded bg-gray-900 text-white border border-gray-700 mb-4"
            id="apiKeyInput"
          />
          <div className="flex gap-4">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold"
              onClick={testAI}
            >
              Test AI
            </button>
            <button
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold"
              onClick={() => saveKey(document.getElementById('apiKeyInput').value)}
            >
              Save
            </button>
            <button
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-bold"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </button>
          </div>
          <p className="text-gray-500 mt-8 text-sm text-center">
            Get a key from Google AI Studio.<br />
            If left empty, app runs in Offline Mode.
          </p>
        </div>
      )}

      {/* Debug Overlay */}
      <div className="absolute top-24 left-4 z-0 opacity-50 pointer-events-none">
        {predictions.slice(0, 3).map((p, i) => (
          <div key={i} className="text-xs text-white bg-black/40 px-2 py-1 mb-1 rounded">
            {p.class} ({Math.round(p.score * 100)}%)
          </div>
        ))}
      </div>

      <ModeSelector currentMode={currentMode} onSelectMode={handleModeChange} />
    </div>
  );
}

export default App;
