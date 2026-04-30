import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Atmosphere starfield — opacity-only twinkle (no scale animation),
 * lighter density than before. Per design spec: "animate opacity only".
 */
const Starfield = ({ density = 45 }) => {
  const stars = useMemo(() => {
    return Array.from({ length: density }, (_, i) => ({
      id: i,
      size: 0.6 + Math.random() * 1.4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 4 + Math.random() * 8,
      delay: Math.random() * 6,
      opacity: 0.18 + Math.random() * 0.42,
    }));
  }, [density]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Deep space gradient — indigo only, no extra coloured nebulae */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 32%, #0e0d1f 0%, #06070d 60%, #02030a 100%)',
        }}
      />

      {/* Stars — opacity twinkle only, no scale */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            width: star.size,
            height: star.size,
            left: `${star.x}%`,
            top: `${star.y}%`,
            background: 'rgba(255,255,255,0.92)',
            willChange: 'opacity',
          }}
          animate={{ opacity: [star.opacity, star.opacity * 0.32, star.opacity] }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Single subtle gold breathing nebula (bottom-right anchor) */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: '70%', top: '60%',
          width: '40%', height: '36%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,144,96,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default Starfield;
