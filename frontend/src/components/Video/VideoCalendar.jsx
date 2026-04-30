import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoCalendar = ({ selectedNode, onClose }) => {
  const mockVideos = {
    class11: [
      { id: 1, title: 'Stream Selection Guide', duration: '14:22' },
      { id: 2, title: 'Career Possibilities for 11th', duration: '9:15' },
      { id: 3, title: 'Subject Importance', duration: '11:40' },
      { id: 4, title: 'Future Paths from 11th', duration: '13:05' },
      { id: 5, title: 'Success Stories - Class 11', duration: '16:30' },
    ],
    class12: [
      { id: 1, title: '12th Stream Decisions', duration: '12:45' },
      { id: 2, title: 'College Preparation', duration: '15:20' },
      { id: 3, title: 'Career After 12th', duration: '10:30' },
    ],
    degree: [
      { id: 1, title: 'Choosing Your Degree', duration: '14:10' },
      { id: 2, title: 'Top Industries for Graduates', duration: '17:50' },
      { id: 3, title: 'Internship Guide', duration: '11:15' },
    ],
    maths: [
      { id: 1, title: 'Mathematics Career Paths', duration: '16:30' },
      { id: 2, title: 'Engineering vs Other Options', duration: '12:10' },
      { id: 3, title: 'Top Maths-Based Careers', duration: '14:45' },
      { id: 4, title: 'JEE Preparation Strategy', duration: '18:20' },
    ],
    bio: [
      { id: 1, title: 'Medical Career Overview', duration: '15:50' },
      { id: 2, title: 'NEET vs Other Medical Exams', duration: '13:30' },
      { id: 3, title: 'Biology Career Options', duration: '12:15' },
    ],
    commerce: [
      { id: 1, title: 'Commerce Career Paths', duration: '13:20' },
      { id: 2, title: 'CA, CS, CMA Explained', duration: '15:40' },
      { id: 3, title: 'Business Opportunities', duration: '12:00' },
    ],
    btech: [
      { id: 1, title: 'Engineering Branches Guide', duration: '17:30' },
      { id: 2, title: 'Top Engineering Colleges', duration: '14:20' },
      { id: 3, title: 'Tech Career Roadmap', duration: '16:00' },
      { id: 4, title: 'Placement Success Stories', duration: '13:45' },
    ],
    bca: [
      { id: 1, title: 'BCA vs B.Tech Comparison', duration: '12:30' },
      { id: 2, title: 'Software Career Without Engineering', duration: '15:10' },
      { id: 3, title: 'BCA Success Stories', duration: '11:20' },
    ],
    nda: [
      { id: 1, title: 'NDA Exam Preparation', duration: '18:40' },
      { id: 2, title: 'Life in Armed Forces', duration: '16:25' },
      { id: 3, title: 'NDA Selection Process', duration: '14:50' },
    ],
    default: [
      { id: 1, title: 'Career Exploration', duration: '12:00' },
      { id: 2, title: 'Path Decisions', duration: '10:30' },
      { id: 3, title: 'Making the Right Choice', duration: '11:45' },
    ],
  };

  const videos = useMemo(() => {
    if (!selectedNode) return [];
    return mockVideos[selectedNode.id] || mockVideos.default;
  }, [selectedNode]);

  const getWatchAllText = () => {
    if (!selectedNode) return 'WATCH ALL';
    const levelMap = {
      class11: 'WATCH ALL DECISIONS OF 11TH LEVEL',
      class12: 'WATCH ALL DECISIONS OF 12TH LEVEL',
      degree: 'WATCH ALL DECISIONS OF DEGREE LEVEL',
      maths: 'WATCH ALL MATHS STREAM PATHS',
      bio: 'WATCH ALL BIO STREAM PATHS',
      commerce: 'WATCH ALL COMMERCE PATHS',
      btech: 'WATCH ALL B.TECH CAREERS',
      bca: 'WATCH ALL BCA CAREERS',
      nda: 'WATCH ALL NDA PREPARATION',
    };
    return levelMap[selectedNode.id] || 'WATCH ALL DECISIONS';
  };

  if (!selectedNode || videos.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedNode.id}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-sm py-6 px-6 z-50 border-t border-[#A89060]/20"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-[#A89060] text-sm font-mono mb-2">📺 {getWatchAllText()}</h3>
            <p className="text-gray-400 text-xs">Scroll to explore more decisions</p>
          </div>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="text-gray-400 hover:text-[#A89060] transition-colors font-mono text-sm border border-gray-400/30 px-3 py-1 rounded"
          >
            [CLOSE]
          </motion.button>
        </div>

        {/* Video Cards Carousel - Shuffling Calendar Style */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {videos.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{
                rotateX: -90,
                opacity: 0,
                x: Math.random() * 100 - 50,
                y: Math.random() * 50 - 25
              }}
              animate={{
                rotateX: 0,
                opacity: 1,
                x: 0,
                y: 0
              }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 140,
                damping: 18,
                delay: idx * 0.08,
              }}
              style={{ transformStyle: 'preserve-3d', perspective: '1000px', transformOrigin: 'bottom' }}
              whileHover={{ y: -2, rotateY: 2 }}
              whileTap={{ scale: 0.95 }}
              className="w-44 h-32 flex-shrink-0 bg-gradient-to-br from-[#A89060] via-[#8A7550] to-[#5a5038] rounded-lg p-3 text-white cursor-pointer shadow-xl hover:shadow-2xl fx-pop border border-[#A89060]/40"
            >
              {/* Gloss effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <h4 className="font-bold text-sm mb-1 line-clamp-2">{video.title}</h4>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-gray-200 font-mono">▶ PLAY</span>
                  <span className="text-xs font-mono text-gray-300">{video.duration}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCalendar;
