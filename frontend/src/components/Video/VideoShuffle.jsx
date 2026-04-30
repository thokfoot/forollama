import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoShuffle({ selectedNode, onVideoClick, onClose }) {
    const videoData = {
        class11: [
            { id: 1, title: 'Stream Selection', duration: '14:22', thumb: '🎯' },
            { id: 2, title: 'Career Paths', duration: '9:15', thumb: '🚀' },
            { id: 3, title: 'Subject Guide', duration: '11:40', thumb: '📚' }
        ],
        maths: [
            { id: 1, title: 'PCM Benefits', duration: '16:30', thumb: '🔬' },
            { id: 2, title: 'Engineering', duration: '12:10', thumb: '⚙️' },
            { id: 3, title: 'Tech Careers', duration: '15:20', thumb: '💻' }
        ],
        default: [
            { id: 1, title: 'Career Guide', duration: '12:00', thumb: '🎯' },
            { id: 2, title: 'Decisions', duration: '10:30', thumb: '🤔' },
            { id: 3, title: 'Success', duration: '11:45', thumb: '⭐' }
        ]
    };
    const videos = useMemo(() => {
        if (!selectedNode) return [];
        return videoData[selectedNode.id] || videoData.default;
    }, [selectedNode]);

    if (!selectedNode || videos.length === 0) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50"
            >
                {/* Micro Cards */}
                <div className="flex flex-col gap-2">
                    {videos.map((video, idx) => (
                        <motion.div
                            key={video.id}
                            initial={{
                                rotateY: -90,
                                opacity: 0
                            }}
                            animate={{
                                rotateY: 0,
                                opacity: 1
                            }}
                            transition={{
                                type: 'spring',
                                delay: idx * 0.1
                            }}
                            onClick={() => onVideoClick && onVideoClick(video)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVideoClick?.(video); } }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Play ${video.title}`}
                            whileHover={{ y: -2 }}
                            className="w-28 h-20 bg-gradient-to-br from-[#A89060] to-[#6b5a2b] rounded-md p-2 text-white cursor-pointer shadow-lg"
                        >
                            <div className="flex flex-col justify-between h-full">
                                <span className="text-lg">{video.thumb}</span>
                                <h4 className="font-bold text-[11px] line-clamp-2">
                                    {video.title}
                                </h4>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
