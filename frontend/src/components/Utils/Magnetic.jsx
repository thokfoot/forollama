import React, { useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const isCoarsePointer = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(pointer: coarse)').matches;
};

export default function Magnetic({ children, strength = 8, className = '' }) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.35 });
    const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.35 });

    const handleMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        x.set((relX / rect.width) * strength * 2);
        y.set((relY / rect.height) * strength * 2);
    }, [strength, x, y]);

    const handleLeave = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    const handlePointerUp = useCallback(() => {
        // Strictly gate haptics to coarse pointers to avoid desktop warnings.
        if (!isCoarsePointer()) return;
        if (canVibrate()) navigator.vibrate(10);
    }, []);

    return (
        <motion.div
            className={className}
            style={{ x: springX, y: springY }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onPointerUp={handlePointerUp}
        >
            {children}
        </motion.div>
    );
}
