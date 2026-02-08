import React, { useState, useImperativeHandle, forwardRef } from 'react';

const TouchFeedback = forwardRef((props, ref) => {
    const [ripples, setRipples] = useState([]);

    useImperativeHandle(ref, () => ({
        trigger: (x, y) => {
            const id = Date.now();
            setRipples(prev => [...prev, { x, y, id }]);
            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== id));
            }, 600);
        }
    }));

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {ripples.map(r => (
                <span
                    key={r.id}
                    className="absolute rounded-full bg-white/40 animate-ping"
                    style={{
                        left: r.x,
                        top: r.y,
                        width: '100px',
                        height: '100px',
                        transform: 'translate(-50%, -50%)',
                        animationDuration: '0.6s'
                    }}
                />
            ))}
        </div>
    );
});

export default TouchFeedback;
