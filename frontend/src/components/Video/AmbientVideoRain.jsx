import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AmbientVideoRain({ category = 'general', onVideoClick, isVisible }) {
    const [floatingVideos, setFloatingVideos] = useState([]);

    const videoLibrary = {
        general: [
            { id: 'g1', title: 'Career Journey', duration: '12:45', thumb: '🎯', category: 'guide' },
            { id: 'g2', title: 'Success Story', duration: '15:20', thumb: '⭐', category: 'story' },
            { id: 'g3', title: 'Path Analysis', duration: '10:30', thumb: '📊', category: 'guide' },
            { id: 'g4', title: 'Real Experience', duration: '14:15', thumb: '💡', category: 'story' },
            { id: 'g5', title: 'Decision Tips', duration: '11:50', thumb: '🎓', category: 'guide' },
            { id: 'g6', title: 'Life After', duration: '13:40', thumb: '🚀', category: 'story' }
        ],
        class11: [
            { id: 'c1', title: 'Stream Selection', duration: '14:22', thumb: '🎯', category: 'guide' },
            { id: 'c2', title: '11th Success', duration: '12:15', thumb: '⭐', category: 'story' },
            { id: 'c3', title: 'PCM Journey', duration: '15:45', thumb: '🔬', category: 'story' },
            { id: 'c4', title: 'Commerce Path', duration: '13:20', thumb: '💼', category: 'guide' },
            { id: 'c5', title: 'Bio Student', duration: '14:50', thumb: '🏥', category: 'story' }
        ],
        maths: [
            { id: 'm1', title: 'JEE Success', duration: '16:30', thumb: '🎓', category: 'story' },
            { id: 'm2', title: 'Engineering', duration: '12:40', thumb: '⚙️', category: 'guide' },
            { id: 'm3', title: 'IIT Journey', duration: '18:15', thumb: '⭐', category: 'story' },
            { id: 'm4', title: 'Defense Path', duration: '14:25', thumb: '🎖️', category: 'guide' },
            { id: 'm5', title: 'Tech Career', duration: '15:55', thumb: '💻', category: 'story' }
        ],
        btech: [
            { id: 'b1', title: 'Campus Life', duration: '17:20', thumb: '🏛️', category: 'story' },
            { id: 'b2', title: 'Placement', duration: '15:45', thumb: '💰', category: 'guide' },
            { id: 'b3', title: 'CS Journey', duration: '16:30', thumb: '💻', category: 'story' },
            { id: 'b4', title: 'Internship', duration: '13:50', thumb: '🛠️', category: 'guide' },
            { id: 'b5', title: 'Startup Story', duration: '19:10', thumb: '🚀', category: 'story' }
        ]
    };

    const videos = videoLibrary[category] || videoLibrary.general;

    // Clear floating videos when category changes
    useEffect(() => {
        setFloatingVideos([]);
    }, [category]);

    useEffect(() => {
        if (!isVisible) return;
        const spawnVideo = () => {
            const video = videos[Math.floor(Math.random() * videos.length)];
            const side = Math.random() > 0.5 ? 'left' : 'right';
            const id = `${side}-${Date.now()}-${Math.random()}`;
            const duration = 15 + Math.random() * 10; // 15-25 seconds to float up

            const newVideo = {
                ...video,
                uniqueId: id,
                side,
                duration,
                startX: side === 'left' ? Math.random() * 10 : 85 + Math.random() * 10,
                delay: 0
            };

            setFloatingVideos(prev => [...prev, newVideo]);

            // Remove after animation completes
            setTimeout(() => {
                setFloatingVideos(prev => prev.filter(v => v.uniqueId !== id));
            }, duration * 1000 + 500);
        };

        // Initial spawn burst
        for (let i = 0; i < 4; i++) {
            setTimeout(() => spawnVideo(), i * 1000);
        }

        // Continuous spawning
        const interval = setInterval(() => {
            spawnVideo();
        }, 3000 + Math.random() * 2000); // Every 3-5 seconds

        return () => clearInterval(interval);
    }, [category, videos, isVisible]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 pointer-events-none z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <AnimatePresence>
                        {floatingVideos.map((video) => (
                            <motion.div
                                key={video.uniqueId}
                                initial={{
                                    y: '110vh',
                                    x: `${video.startX}%`,
                                    opacity: 0,
                                    scale: 0.8
                                }}
                                animate={{
                                    y: '-15vh',
                                    opacity: [0, 0.5, 0.5, 0],
                                    scale: [0.8, 1, 1, 0.9]
                                }}
                                exit={{ opacity: 0, scale: 0.5, x: video.side === 'left' ? -200 : 200 }}
                                transition={{
                                    duration: video.duration,
                                    ease: 'linear',
                                    opacity: {
                                        times: [0, 0.1, 0.9, 1],
                                        duration: video.duration
                                    }
                                }}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: 0,
                                    bottom: 0
                                }}
                            >
                                <motion.div
                                    onClick={() => onVideoClick && onVideoClick(video)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVideoClick?.(video); } }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Play ${video.title}`}
                                    whileHover={{
                                        scale: 1.15,
                                        opacity: 1,
                                        y: -10,
                                        transition: { duration: 0.3, ease: 'easeOut' }
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-28 h-20 bg-gradient-to-br from-[#A89060]/80 via-[#8A7550]/80 to-[#5a5038]/80 rounded-md p-2 text-white cursor-pointer shadow-lg backdrop-blur-sm border border-[#A89060]/30 hover:border-[#A89060]/60 fx-pop"
                                >
                                    {/* Gloss */}
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                        <div className="flex items-start justify-between">
                                            <span className="text-lg">{video.thumb}</span>
                                            <span className="text-[9px] font-mono bg-black/30 px-1 py-1 rounded">
                                                {video.duration}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[11px] leading-tight line-clamp-2">
                                                {video.title}
                                            </h4>
                                            <div className="text-[9px] font-mono text-white/70 mt-1">
                                                {video.category === 'story' ? '📖 STORY' : '📘 GUIDE'}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
