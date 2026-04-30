import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

const STUDENT_IMG = 'https://images.pexels.com/photos/4145190/pexels-photo-4145190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1100';
const LIVELIHOOD_IMG = 'https://images.pexels.com/photos/13545236/pexels-photo-13545236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1100';

const buildEntryLevels = (config = {}) => ([
    {
        id: 'student',
        label: config.studentLabel || 'For Students',
        eyebrow: config.studentEyebrow || 'School to first decisions',
        subtitle: config.studentSubtitle || 'Streams, college choices, internships and the first major fork in the road — told by people who’ve walked it.',
        path: ['student'],
        accent: '#CDB88A',
        accentSoft: 'rgba(205,184,138,0.18)',
        chip: '· Class 10 · 12th · College · First job',
        image: STUDENT_IMG,
        testid: 'quick-entry-students-card',
    },
    {
        id: 'professional',
        label: config.livelihoodLabel || 'For Earning Livelihood',
        eyebrow: config.livelihoodEyebrow || 'Job-holders, freelancers, business owners',
        subtitle: config.livelihoodSubtitle || 'Real career switches, salary truths, side hustles and the regrets nobody puts on LinkedIn.',
        path: ['professional'],
        accent: '#E07A5F',
        accentSoft: 'rgba(224,122,95,0.18)',
        chip: '· 0–5 yrs · 5–10 yrs · Switches · Money',
        image: LIVELIHOOD_IMG,
        testid: 'quick-entry-earning-card',
    },
]);

export default function QuickEntryScreen({ onSelect, onSkip, config }) {
    const [selected, setSelected] = useState(null);
    const isMobile = useIsMobile();
    const shouldReduceMotion = useReducedMotion();
    const ENTRY_LEVELS = buildEntryLevels(config || {});
    const browseLabel = config?.browseLabel || 'Browse all careers';

    const handleSelect = (item, index) => {
        setSelected(index);
        window.setTimeout(() => onSelect(item.path), 240);
    };

    return (
        <div
            className="absolute inset-0 z-10 flex h-full min-h-0 w-full flex-col items-center overflow-hidden"
            style={{
                paddingTop: isMobile ? 'calc(var(--nav-height) + env(safe-area-inset-top, 0px) + 8px)' : 'calc(var(--nav-height) + 18px)',
                paddingBottom: isMobile ? 'max(8px, env(safe-area-inset-bottom, 0px))' : '20px',
                paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
            }}
        >
            {/* Atmosphere */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 70% 55% at 50% 8%, rgba(205,184,138,0.10), transparent 70%), radial-gradient(ellipse 50% 40% at 50% 95%, rgba(20,22,58,0.34), transparent 75%)',
                }} />
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`,
                    opacity: 0.07,
                    mixBlendMode: 'overlay',
                }} />
            </div>

            <div className="relative z-[1] flex h-full min-h-0 w-full max-w-[1100px] flex-1 flex-col mx-auto" style={{ gap: 'var(--space-y-section)' }}>
                {/* HEADER */}
                <motion.section
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center w-full shrink-0"
                >
                    <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 'clamp(9.5px, 0.9vw, 10.5px)', letterSpacing: '0.34em' }}>Chapter Zero</span>
                    <h1 className="font-display font-semibold tracking-tightest text-balance text-white"
                        style={{ fontSize: 'clamp(1.3rem, min(3.8vw, 5dvh), 2.6rem)', lineHeight: 1.08, marginTop: 'var(--space-y-tight)' }}>
                        Where do you find <span className="text-gradient">yourself</span> right now?
                    </h1>
                    <p className="text-white/55 max-w-md mx-auto" style={{ fontSize: 'clamp(0.78rem, min(1vw, 1.4dvh), 0.92rem)', marginTop: 'var(--space-y-tight)', lineHeight: 1.5 }}>
                        Pick the lens that fits your life today. <span className="text-white/35">You can change it later.</span>
                    </p>
                </motion.section>

                {/* CARDS */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-2" style={{ gap: 'clamp(0.6rem, 1.6vw, 1.4rem)' }}>
                        {ENTRY_LEVELS.map((item, idx) => {
                            const isSelected = selected === idx;
                            return (
                                <motion.button
                                    key={item.id}
                                    onClick={() => handleSelect(item, idx)}
                                    data-testid={item.testid}
                                    whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                                    whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                                    className={`group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[22px] text-left fx-pop ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70 ${
                                        isSelected ? 'border-[1.5px] border-[#A89060]/55 shadow-[0_0_60px_rgba(205,184,138,0.18)]' : 'border border-white/10 hover:border-[#A89060]/35'
                                    }`}
                                    style={{
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)',
                                        backdropFilter: 'blur(14px)',
                                        WebkitBackdropFilter: 'blur(14px)',
                                        boxShadow: '0 26px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.045)',
                                    }}
                                >
                                    {/* IMAGE HEAD */}
                                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', minHeight: 'clamp(80px, 16dvh, 160px)', background: idx === 0 ? 'linear-gradient(135deg, #1c1828 0%, #2a2030 60%, #1a1a26 100%)' : 'linear-gradient(135deg, #2a1a1f 0%, #2c1518 60%, #1a1014 100%)' }}>
                                        <img
                                            src={item.image}
                                            alt=""
                                            loading="eager"
                                            decoding="async"
                                            fetchPriority="high"
                                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                            style={{ filter: 'saturate(0.92) brightness(0.85) contrast(1.04)' }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        {/* Dark overlay for legibility */}
                                        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,6,10,0.10) 0%, rgba(5,6,10,0.55) 65%, rgba(5,6,10,0.92) 100%)' }} />
                                        {/* Gold hairline */}
                                        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${item.accent}80, transparent)` }} />
                                        {/* Accent glow */}
                                        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${item.accentSoft}, transparent 70%)`, filter: 'blur(20px)' }} />
                                        {/* Eyebrow chip on image */}
                                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                                            <span className="pw-chip" style={{ borderColor: `${item.accent}50`, background: `${item.accent}1a`, color: item.accent }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.accent, boxShadow: `0 0 8px ${item.accent}` }} />
                                                {item.eyebrow}
                                            </span>
                                            <span className="text-[10px] font-mono text-white/45 tracking-[0.16em] uppercase">0{idx + 1}</span>
                                        </div>
                                    </div>

                                    {/* BODY */}
                                    <div className="flex flex-1 flex-col" style={{ padding: 'var(--pad-card-y) var(--pad-card-x)', gap: 'var(--space-y-block)' }}>
                                        <h3 className="font-display font-semibold text-white tracking-tightest"
                                            style={{ fontSize: 'clamp(1.05rem, min(2vw, 2.6dvh), 1.7rem)', lineHeight: 1.12 }}>
                                            {item.label}
                                        </h3>
                                        <p className="t-body text-white/65" style={{ fontSize: 'clamp(0.78rem, min(0.95vw, 1.3dvh), 0.92rem)', lineHeight: 1.5 }}>
                                            {item.subtitle}
                                        </p>
                                        <div className="font-mono uppercase tracking-[0.16em] text-white/40" data-mute="true" style={{ fontSize: 'clamp(9.5px, 0.85vw, 10.5px)' }}>{item.chip}</div>
                                        <div className="mt-auto pt-3 flex items-center justify-between">
                                            <span className="text-[11px] uppercase tracking-[0.20em] font-bold" style={{ color: item.accent }}>Tap to enter</span>
                                            <span
                                                aria-hidden="true"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border fx-pop group-hover:translate-x-1 group-hover:scale-110"
                                                style={{ borderColor: `${item.accent}40`, color: item.accent, background: `${item.accent}10` }}
                                            >
                                                →
                                            </span>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* SKIP / BROWSE  */}
                    <div className="flex items-center justify-center gap-3" style={{ marginTop: 'var(--space-y-block)' }}>
                        <motion.button
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                            onClick={() => onSkip?.()}
                            data-testid="quick-entry-browse-all"
                            className="glass-card inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold text-[#CDB88A]/85 hover:text-[#CDB88A] fx-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70 hover:border-[#A89060]/45"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <span>{browseLabel}</span>
                        </motion.button>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
