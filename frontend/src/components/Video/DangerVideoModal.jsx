import React, { useState, useEffect, useRef } from 'react';

const getYoutubeThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

const DangerVideoModal = ({ open, onClose, videoId, startTime, title }) => {
    const [play, setPlay] = useState(false);
    const closeRef = useRef(null);

    useEffect(() => {
        if (open) {
            setPlay(false);
        }
    }, [open, videoId, startTime]);

    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose?.();
            // Focus trap
            if (e.key === 'Tab') {
                const modal = closeRef.current?.closest('[role="dialog"]');
                if (!modal) return;
                const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="danger-video-title">
            <div className="pw-panel p-6 max-w-lg w-full relative flex flex-col items-center mx-3">
                <button ref={closeRef} onClick={onClose} className="absolute top-3 right-3 text-[#A89060] text-2xl font-bold hover:text-white transition-colors min-w-[44px] min-h-[44px]" aria-label="Close video">×</button>
                <div className="mb-4 w-full flex flex-col items-center">
                    <div id="danger-video-title" className="text-xl font-bold text-[#A89060] mb-2 text-center">{title}</div>
                    {!play ? (
                        <button className="relative group" onClick={() => setPlay(true)}>
                            <img src={getYoutubeThumbnail(videoId)} alt="Video thumbnail" className="rounded-xl w-full max-w-xs border border-[#A89060]/45" />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-[#A89060]/88 rounded-full p-4 group-hover:scale-110 transition-transform shadow-[0_8px_18px_rgba(168,144,96,0.35)]">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="gold" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                </span>
                            </span>
                        </button>
                    ) : (
                        <div className="w-full aspect-video max-w-xs">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startTime}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                className="rounded-lg w-full h-full"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DangerVideoModal;
