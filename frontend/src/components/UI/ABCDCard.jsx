import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Icon Tile Card Grid - Cinema Spotlight style
 * Each option: { value, label, icon (emoji), grade }
 * 2x2 square glassmorphism tiles with big icon + short label
 */

const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const GRADE_COLORS = {
    A: { border: 'rgba(45,212,191,0.75)',  glow: 'rgba(45,212,191,0.30)',  bg: 'rgba(45,212,191,0.11)',  text: '#2DD4BF' },
    B: { border: 'rgba(129,140,248,0.75)', glow: 'rgba(129,140,248,0.30)', bg: 'rgba(129,140,248,0.11)', text: '#818CF8' },
    C: { border: 'rgba(205,184,138,0.75)', glow: 'rgba(205,184,138,0.30)', bg: 'rgba(205,184,138,0.11)', text: '#CDB88A' },
    D: { border: 'rgba(251,113,133,0.75)', glow: 'rgba(251,113,133,0.30)', bg: 'rgba(251,113,133,0.11)', text: '#FB7185' },
};
const GRADES = ['A', 'B', 'C', 'D'];

export default function ABCDCard({ value, onChange, onAutoAdvance, options = [] }) {
    /* Misclick-back affordance: show undo for 1.8 s after selection (mobile thumb reaction time) */
    const [showUndo, setShowUndo] = useState(false);
    const advanceTimer = useRef(null);
    const undoTimer    = useRef(null);

    const handleSelect = (optValue) => {
        /* Cancel any in-flight advance from a previous tap */
        clearTimeout(advanceTimer.current);
        clearTimeout(undoTimer.current);

        onChange(optValue);
        setShowUndo(true);

        /* Auto-advance after 800ms */
        if (onAutoAdvance) {
            advanceTimer.current = setTimeout(() => {
                setShowUndo(false);
                onAutoAdvance();
            }, 800);
        }

        /* Hide undo button after 1500 ms — "control not panic" sweet spot (mobile thumb reaction time) */
        undoTimer.current = setTimeout(() => setShowUndo(false), 1500);
    };

    const handleUndo = () => {
        clearTimeout(advanceTimer.current);
        clearTimeout(undoTimer.current);
        setShowUndo(false);
        onChange('');
    };

    return (
        <div
            data-abcd-card
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(8px, 1.6vw, 14px)',
                width: '100%',
            }}
        >
            {options.slice(0, 4).map((opt, i) => {
                const grade = opt.grade || GRADES[i];
                const g = GRADE_COLORS[grade] || GRADE_COLORS.A;
                const selected = value === opt.value;

                return (
                    <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        initial={{ opacity: 0, scale: 0.88, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ ...SPRING, delay: i * 0.07 }}
                        whileHover={!selected ? { y: -4, scale: 1.04 } : {}}
                        whileTap={{ scale: 0.95 }}
                        data-abcd-card
                        aria-pressed={selected}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'clamp(4px, 0.8dvh, 8px)',
                            padding: 'clamp(10px, 2dvh, 20px) clamp(10px, 2vw, 18px)',
                            height: 'clamp(110px, 20dvh, 170px)',
                            borderRadius: 18,
                            border: '1.5px solid ' + (selected ? g.border : 'rgba(255,255,255,0.09)'),
                            background: selected
                                ? g.bg
                                : 'linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            boxShadow: selected
                                ? '0 0 0 1px ' + g.border + ', 0 10px 40px ' + g.glow + ', 0 0 70px ' + g.glow
                                : '0 2px 14px rgba(0,0,0,0.35)',
                            transition: 'background 0.22s, border 0.22s, box-shadow 0.28s',
                        }}
                    >
                        {/* Ambient radial glow when selected */}
                        {selected && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    position: 'absolute', inset: 0,
                                    background: 'radial-gradient(ellipse at 50% 20%, ' + g.glow + ', transparent 68%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}

                        {/* ICON / EMOJI */}
                        <span
                            aria-hidden="true"
                            style={{
                                fontSize: 'clamp(22px, 4dvh, 38px)',
                                lineHeight: 1,
                                position: 'relative',
                                zIndex: 1,
                                transform: selected ? 'scale(1.15)' : 'scale(1)',
                                transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
                                filter: selected ? 'none' : 'saturate(0.7)',
                            }}
                        >
                            {opt.icon || '\u25C6'}
                        </span>

                        {/* LABEL */}
                        <span
                            style={{
                                fontSize: 'clamp(9.5px, 1.1vw, 13px)',
                                fontWeight: selected ? 700 : 500,
                                color: selected ? g.text : 'rgba(255,255,255,0.60)',
                                letterSpacing: '-0.005em',
                                lineHeight: 1.25,
                                textAlign: 'center',
                                position: 'relative',
                                zIndex: 1,
                                transition: 'color 0.22s',
                                maxWidth: '100%',
                                wordBreak: 'break-word',
                            }}
                        >
                            {opt.label}
                        </span>

                        {/* Selected bottom accent bar */}
                        <AnimatePresence>
                            {selected && (
                                <motion.span
                                    key="bar"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    exit={{ scaleX: 0 }}
                                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                                        background: 'linear-gradient(90deg, transparent, ' + g.border + ', transparent)',
                                        transformOrigin: 'left',
                                        borderRadius: '0 0 18px 18px',
                                    }}
                                />
                            )}
                        </AnimatePresence>
                    </motion.button>
                );
            })}

            {/* ── Misclick-back affordance ── appears for 1s after any selection ── */}
            <AnimatePresence>
                {showUndo && (
                    <motion.button
                        key="undo-back"
                        type="button"
                        onClick={handleUndo}
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0,  scale: 1 }}
                        exit={{    opacity: 0, y: 4,  scale: 0.94 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '7px 18px',
                            borderRadius: 99,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(12px)',
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                            width: 'fit-content',
                            margin: '0 auto',
                        }}
                    >
                        ← Undo
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
