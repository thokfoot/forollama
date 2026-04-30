import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function VideoRainSidebar({ category = 'general', onVideoClick }) {
  const [activeVideos, setActiveVideos] = useState([]);
  const [isPausedLeft, setIsPausedLeft] = useState(false);
  const [isPausedRight, setIsPausedRight] = useState(false);

  const videoLibrary = {
    general: [
      { id: 'g1', title: 'Career Journey', duration: '12:45', thumb: '🎯', cat: 'guide', views: '24K' },
      { id: 'g2', title: 'Success Story', duration: '15:20', thumb: '⭐', cat: 'story', views: '18K' },
      { id: 'g3', title: 'Path Analysis', duration: '10:30', thumb: '📊', cat: 'guide', views: '32K' },
      { id: 'g4', title: 'Real Experience', duration: '14:15', thumb: '💡', cat: 'story', views: '45K' },
      { id: 'g5', title: 'Decision Tips', duration: '11:50', thumb: '🎓', cat: 'guide', views: '28K' },
      { id: 'g6', title: 'Life After', duration: '13:40', thumb: '🚀', cat: 'story', views: '56K' },
      { id: 'g7', title: 'Pivot Stories', duration: '16:20', thumb: '🔄', cat: 'story', views: '19K' },
      { id: 'g8', title: 'First Job', duration: '14:30', thumb: '💼', cat: 'guide', views: '67K' }
    ],
    class11: [
      { id: 'c1', title: 'Stream Selection', duration: '14:22', thumb: '📚', cat: 'guide', views: '89K' },
      { id: 'c2', title: '11th Success', duration: '12:15', thumb: '⭐', cat: 'story', views: '45K' },
      { id: 'c3', title: 'PCM Journey', duration: '15:45', thumb: '🔬', cat: 'story', views: '34K' },
      { id: 'c4', title: 'Commerce Path', duration: '13:20', thumb: '💹', cat: 'guide', views: '28K' },
      { id: 'c5', title: 'Bio Student', duration: '14:50', thumb: '🏥', cat: 'story', views: '52K' },
      { id: 'c6', title: 'Arts Choice', duration: '13:40', thumb: '🎨', cat: 'guide', views: '23K' }
    ],
    pcm: [
      { id: 'm1', title: 'JEE Success', duration: '16:30', thumb: '🎓', cat: 'story', views: '120K' },
      { id: 'm2', title: 'Engineering', duration: '12:40', thumb: '⚙️', cat: 'guide', views: '89K' },
      { id: 'm3', title: 'IIT Journey', duration: '18:15', thumb: '⭐', cat: 'story', views: '234K' },
      { id: 'm4', title: 'Defense Path', duration: '14:25', thumb: '🎖️', cat: 'guide', views: '67K' }
    ],
    pcb: [
      { id: 'p1', title: 'NEET Strategy', duration: '15:40', thumb: '📚', cat: 'guide', views: '189K' },
      { id: 'p2', title: 'Medical College', duration: '17:20', thumb: '🏥', cat: 'story', views: '156K' },
      { id: 'p3', title: 'Doctor Life', duration: '16:45', thumb: '👨‍⚕️', cat: 'story', views: '234K' }
    ],
    commerce: [
      { id: 'cm1', title: 'CA Journey', duration: '18:10', thumb: '📊', cat: 'story', views: '178K' },
      { id: 'cm2', title: 'Banking Prep', duration: '14:25', thumb: '🏦', cat: 'guide', views: '89K' },
      { id: 'cm3', title: 'MBA Path', duration: '15:50', thumb: '💼', cat: 'story', views: '134K' }
    ]
  };

  useEffect(() => {
    const videos = videoLibrary[category] || videoLibrary.general;
    setActiveVideos(videos);
  }, [category]);

  const leftVideos = activeVideos.slice(0, Math.ceil(activeVideos.length / 2));
  const rightVideos = activeVideos.slice(Math.ceil(activeVideos.length / 2));

  const cardHeight = 130;
  const leftScrollHeight = leftVideos.length * cardHeight;
  const rightScrollHeight = rightVideos.length * cardHeight;

  const VideoCard = ({ video, onHover }) => (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => onVideoClick && onVideoClick(video)}
      className="group flex-shrink-0 cursor-pointer w-full"
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-xl group-hover:shadow-2xl group-hover:shadow-[#A89060]/20 fx-pop">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-700/50 to-neutral-900">
          <motion.span
            className="text-5xl opacity-80 group-hover:opacity-100 group-hover:scale-110 fx-pop"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {video.thumb}
          </motion.span>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/90 rounded text-[11px] font-bold text-white">
          {video.duration}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <svg className="w-5 h-5 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-700">
          <div className="h-full bg-red-600" style={{ width: `${30 + Math.random() * 50}%` }} />
        </div>
      </div>
      <div className="mt-2 px-1">
        <h4 className="font-semibold text-[12px] text-white leading-tight line-clamp-2 group-hover:text-[#A89060] transition-colors">
          {video.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-neutral-400">{video.views} views</span>
          <span className="text-[11px] text-neutral-500">•</span>
          <span className="text-[11px] text-neutral-400 uppercase">{video.cat}</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      {/* LEFT SIDEBAR */}
      <div
        className="fixed left-0 top-0 bottom-0 w-[15%] z-0 pointer-events-none bg-[#0a0a0a]/95 backdrop-blur-md border-r border-white/5 hidden md:block"
        onMouseEnter={() => setIsPausedLeft(true)}
        onMouseLeave={() => setIsPausedLeft(false)}
      >
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

        <div className="h-full overflow-hidden py-16 px-3">
          <motion.div
            className="flex flex-col gap-4"
            animate={{ y: isPausedLeft ? undefined : [0, -leftScrollHeight] }}
            transition={{ y: { duration: leftVideos.length * 4, ease: 'linear', repeat: Infinity, repeatType: 'loop' } }}
          >
            {[...leftVideos, ...leftVideos, ...leftVideos].map((video, i) => (
              <VideoCard key={`left-${video.id}-${i}`} video={video} onHover={setIsPausedLeft} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[15%] z-0 pointer-events-none bg-[#0a0a0a]/95 backdrop-blur-md border-l border-white/5 hidden md:block"
        onMouseEnter={() => setIsPausedRight(true)}
        onMouseLeave={() => setIsPausedRight(false)}
      >
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

        <div className="h-full overflow-hidden py-16 px-3">
          <motion.div
            className="flex flex-col gap-4"
            initial={{ y: -rightScrollHeight }}
            animate={{ y: isPausedRight ? undefined : [-rightScrollHeight, 0] }}
            transition={{ y: { duration: rightVideos.length * 4, ease: 'linear', repeat: Infinity, repeatType: 'loop' } }}
          >
            {[...rightVideos, ...rightVideos, ...rightVideos].map((video, i) => (
              <VideoCard key={`right-${video.id}-${i}`} video={video} onHover={setIsPausedRight} />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Category Indicator */}
      <motion.div
        key={category}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
      >
        <div className="px-6 py-2 bg-black/80 backdrop-blur-xl border border-[#A89060]/30 rounded-full">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-medium text-sm">{category === 'general' ? 'All Videos' : category.toUpperCase()}</span>
            <span className="text-neutral-400 text-xs">{activeVideos.length} videos</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default memo(VideoRainSidebar);
