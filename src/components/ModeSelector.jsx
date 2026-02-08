import React from 'react';

const MODES = [
    { id: 'NAV', label: 'Navigation', color: 'bg-blue-600' },
    { id: 'ASSISTANT', label: 'Assistant', color: 'bg-green-600' },
    { id: 'READ', label: 'Read', color: 'bg-purple-600' },
    { id: 'FIND', label: 'Find', color: 'bg-orange-600' },
];

const ModeSelector = ({ currentMode, onSelectMode }) => {
    return (
        <div className="absolute bottom-0 left-0 w-full p-4 flex gap-2 overflow-x-auto bg-black/80 backdrop-blur-md z-20 pb-8">
            {MODES.map((mode) => (
                <button
                    key={mode.id}
                    onClick={() => onSelectMode(mode.id)}
                    className={`flex-shrink-0 px-6 py-4 rounded-xl text-white font-bold text-lg transition-all transform ${currentMode === mode.id
                            ? `${mode.color} scale-105 border-2 border-white shadow-lg`
                            : 'bg-gray-800 border border-gray-600 opacity-70'
                        }`}
                >
                    {mode.label}
                </button>
            ))}
        </div>
    );
};

export default ModeSelector;
