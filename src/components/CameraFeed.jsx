import React, { useRef, useEffect, useState } from 'react';

const CameraFeed = ({ onFrame }) => {
    const videoRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Use rear camera on mobile
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError("Could not access camera. Please allow permissions.");
            }
        };

        startCamera();

        return () => {
            // Cleanup stream
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // Frame processing loop
    useEffect(() => {
        let animationFrameId;

        const processFrame = () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
                if (onFrame) {
                    onFrame(videoRef.current);
                }
            }
            animationFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();

        return () => cancelAnimationFrame(animationFrameId);
    }, [onFrame]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-red-500 p-4 text-center">
                <h2 className="text-xl font-bold">{error}</h2>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-black">
            {/* Helper to ensure video covers screen but maintains aspect ratio */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(1)' }} // Mirror if using front camera, but we are using rear logic
            />
            {/* Overlay for debugging or UI can be added here */}
        </div>
    );
};

export default CameraFeed;
