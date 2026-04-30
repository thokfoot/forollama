import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CategorizedVideoWalls({ category = 'general', onVideoClick }) {
  const [leftWall, setLeftWall] = useState([]);
  const [rightWall, setRightWall] = useState([]);

  const videoLibrary = {
    general: {
      stories: [
        { id: 'gs1', title: 'From Confused to Clear', duration: '14:20', thumb: '⭐', type: 'success' },
        { id: 'gs2', title: 'My Career Switch', duration: '16:45', thumb: '🌟', type: 'success' },
        { id: 'gs3', title: 'Found My Passion', duration: '12:30', thumb: '💫', type: 'success' },
        { id: 'gs4', title: 'The Right Choice', duration: '15:10', thumb: '✨', type: 'success' },
        { id: 'gs5', title: 'Life Changed After', duration: '13:55', thumb: '🎯', type: 'success' }
      ],
      guides: [
        { id: 'gg1', title: 'How to Decide', duration: '11:40', thumb: '📘', type: 'guide' },
        { id: 'gg2', title: 'Career Planning 101', duration: '14:15', thumb: '📚', type: 'guide' },
        { id: 'gg3', title: 'Research Method', duration: '12:50', thumb: '🔍', type: 'guide' },
        { id: 'gg4', title: 'Talk to Mentors', duration: '10:30', thumb: '👥', type: 'guide' },
        { id: 'gg5', title: 'Final Step Guide', duration: '13:20', thumb: '🎓', type: 'guide' }
      ]
    },
    class11: {
      stories: [
        { id: 'c11s1', title: 'Picked PCM, No Regrets', duration: '15:30', thumb: '🔬', type: 'success' },
        { id: 'c11s2', title: 'Commerce Was Perfect', duration: '14:45', thumb: '💼', type: 'success' },
        { id: 'c11s3', title: 'Medical Dream Start', duration: '16:20', thumb: '🏥', type: 'success' },
        { id: 'c11s4', title: 'Stream Selection Win', duration: '13:50', thumb: '⭐', type: 'success' }
      ],
      guides: [
        { id: 'c11g1', title: 'Stream Selection Guide', duration: '12:40', thumb: '📋', type: 'guide' },
        { id: 'c11g2', title: 'Subject Combo Tips', duration: '11:55', thumb: '📊', type: 'guide' },
        { id: 'c11g3', title: 'Future After Streams', duration: '14:10', thumb: '🔮', type: 'guide' },
        { id: 'c11g4', title: 'Pressure vs Passion', duration: '13:30', thumb: '💭', type: 'guide' }
      ]
    },
    maths: {
      stories: [
        { id: 'ms1', title: 'JEE Success Story', duration: '18:40', thumb: '🎯', type: 'success' },
        { id: 'ms2', title: 'IIT Life Reality', duration: '17:20', thumb: '🏛️', type: 'success' },
        { id: 'ms3', title: 'Defense Academy Journey', duration: '16:55', thumb: '🎖️', type: 'success' },
        { id: 'ms4', title: 'Engineering to Startup', duration: '19:10', thumb: '🚀', type: 'success' }
      ],
      guides: [
        { id: 'mg1', title: 'JEE Preparation Path', duration: '15:25', thumb: '📐', type: 'guide' },
        { id: 'mg2', title: 'B.Tech vs BCA Choice', duration: '13:40', thumb: '⚙️', type: 'guide' },
        { id: 'mg3', title: 'Defense Exam Prep', duration: '14:50', thumb: '📖', type: 'guide' },
        { id: 'mg4', title: 'Coaching vs Self Study', duration: '12:30', thumb: '🤔', type: 'guide' }
      ]
    },
    btech: {
      stories: [
        { id: 'bts1', title: 'Campus to Google', duration: '20:15', thumb: '💻', type: 'success' },
        { id: 'bts2', title: 'Startup from Hostel', duration: '18:50', thumb: '🚀', type: 'success' },
        { id: 'bts3', title: 'Placement Success', duration: '17:35', thumb: '💰', type: 'success' },
        { id: 'bts4', title: 'Research to PhD', duration: '19:40', thumb: '🔬', type: 'success' }
      ],
      guides: [
        { id: 'btg1', title: 'Branch Selection Tips', duration: '14:20', thumb: '🎯', type: 'guide' },
        { id: 'btg2', title: 'Internship Strategy', duration: '15:10', thumb: '🛠️', type: 'guide' },
        { id: 'btg3', title: 'Placement Preparation', duration: '16:45', thumb: '📈', type: 'guide' },
        { id: 'btg4', title: 'Higher Studies Options', duration: '13:55', thumb: '🎓', type: 'guide' }
      ]
    }
  };

  const currentLibrary = videoLibrary[category] || videoLibrary.general;

  // Flicker effect when category changes
  useEffect(() => {
    const flickerTimeout = setTimeout(() => {
      setLeftWall([]);
      setRightWall([]);
    }, 50);

    return () => clearTimeout(flickerTimeout);
  }, [category]);

  // Spawn videos for both walls
  useEffect(() => {
    if (leftWall.length > 0 || rightWall.length > 0) return;

    const spawnVideo = (side, videos) => {
      const video = videos[Math.floor(Math.random() * videos.length)];
      const id = `${side}-${Date.now()}-${Math.random()}`;
      const duration = 18 + Math.random() * 12;
      
      const newVideo = {
        ...video,
        uniqueId: id,
        duration,
        startX: side === 'left' ? 2 + Math.random() * 8 : 90 + Math.random() * 8,
        delay: 0
      };

      if (side === 'left') {
        setLeftWall(prev => [...prev, newVideo]);
        setTimeout(() => setLeftWall(prev => prev.filter(v => v.uniqueId !== id)), duration * 1000 + 500);
      } else {
        setRightWall(prev => [...prev, newVideo]);
        setTimeout(() => setRightWall(prev => prev.filter(v => v.uniqueId !== id)), duration * 1000 + 500);
      }
    };

    // Initial burst
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        spawnVideo('left', currentLibrary.stories);
        spawnVideo('right', currentLibrary.guides);
      }, i * 800);
    }

    // Continuous spawning
    const leftInterval = setInterval(() => spawnVideo('left', currentLibrary.stories), 3500 + Math.random() * 2000);
    const rightInterval = setInterval(() => spawnVideo('right', currentLibrary.guides), 3500 + Math.random() * 2000);

    return () => {
      clearInterval(leftInterval);
      clearInterval(rightInterval);
    };
  }, [category, currentLibrary, leftWall.length, rightWall.length]);

  const allVideos = [...leftWall, ...rightWall];

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <AnimatePresence>
        {allVideos.map((video) => (
          <motion.div
            key={video.uniqueId}
            initial={{ y: '110vh', x: `${video.startX}%`, opacity: 0, scale: 0.8 }}
            animate={{ y: '-15vh', opacity: [0, 0.5, 0.5, 0], scale: [0.8, 1, 1, 0.9] }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              duration: video.duration,
              ease: 'linear',
              opacity: { times: [0, 0.1, 0.9, 1], duration: video.duration }
            }}
            className="absolute pointer-events-auto"
            style={{ left: 0, bottom: 0 }}
          >
            <motion.div
              onClick={() => onVideoClick && onVideoClick(video)}
              whileHover={{ y: -4, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
              whileTap={{ scale: 0.95 }}
              className="relative w-28 h-20 bg-gradient-to-br from-[#A89060]/70 via-[#8A7550]/70 to-[#5a5038]/70 rounded-lg p-2 text-white cursor-pointer shadow-2xl backdrop-blur-md border border-white/10 hover:border-white/20 fx-pop"
            >
              {/* Category badge */}
              <div className="absolute -top-1 -right-1 z-20">
                <div className={`text-[10px] font-mono px-2 py-1 rounded ${
                  video.type === 'success' ? 'bg-green-500/80 text-white' : 'bg-blue-500/80 text-white'
                }`}>
                  {video.type === 'success' ? '📖' : '📘'}
                </div>
              </div>

              {/* Gloss */}
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <span className="text-lg">{video.thumb}</span>
                  <span className="text-[9px] font-mono bg-black/30 px-2 py-1 rounded">
                    {video.duration}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-[11px] leading-tight line-clamp-2">
                    {video.title}
                  </h4>
                  <div className="text-[9px] font-mono text-white/70 mt-1">
                    {video.type === 'success' ? 'SUCCESS STORY' : 'DECISION GUIDE'}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Wall labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="text-[#A89060]/30 font-mono text-xs writing-mode-vertical transform -rotate-180 tracking-widest">
          SUCCESS STORIES
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div className="text-[#A89060]/30 font-mono text-xs writing-mode-vertical transform -rotate-180 tracking-widest">
          DECISION GUIDES
        </div>
      </motion.div>
    </div>
  );
}
