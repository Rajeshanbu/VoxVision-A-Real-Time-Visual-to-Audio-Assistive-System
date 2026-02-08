import React from 'react';

const StartOverlay = ({ onStart, visible }) => {
  if (!visible) return null;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onStart(); }}
      onTouchEnd={(e) => { e.stopPropagation(); onStart(); }}
      style={{ zIndex: 9999 }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-6 cursor-pointer"
    >
      <div className="text-center space-y-8 pointer-events-none">
        <h1 className="text-5xl font-black text-white tracking-tighter">VisionAID</h1>
        <div className="w-32 h-32 mx-auto rounded-full bg-white animate-pulse flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center">
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[30px] border-l-white border-b-[15px] border-b-transparent ml-2"></div>
          </div>
        </div>
        <p className="text-2xl text-white font-bold">Tap Screen to Start</p>
        <p className="text-gray-400">Full Voice Control Enabled</p>
      </div>
    </div>
  );
};

export default StartOverlay;
