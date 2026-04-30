import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';

/* 6 titles × 320 ms = 1 920 ms — fits the 1.7–2.0 s sweet-spot perfectly */
const DEFAULT_TITLES = ['DOCTOR', 'ENGINEER', 'SCIENTIST', 'ARTIST', 'ENTREPRENEUR', 'OFFICER'];

/* Real lived-experience quotes (kept, slightly trimmed for editorial feel) */
const ALL_QUOTES = [
    { quote: "Climbed 12 years. The view wasn't worth it.", name: 'Rajan M.', role: 'Senior VP, Banking', regret: true },
    { quote: "Nobody told me I'd miss my sister's wedding for a rotation.", name: 'Dr. Priya S.', role: 'Cardiologist', regret: true },
    { quote: "Quit consulting at 38. Became a teacher. Never looked back.", name: 'Vikram D.', role: 'High School Teacher', regret: false },
    { quote: "Great salary. Still hollow after ten years.", name: 'Sneha T.', role: 'Staff Eng., Top Tech Co.', regret: true },
    { quote: "Chose money over passion at 24. Regret it every morning.", name: 'Arjun K.', role: 'Investment Banker', regret: true },
    { quote: "Took a 40% pay cut for meaningful work. Worth it.", name: 'Meera R.', role: 'NGO Program Director', regret: false },
    { quote: "IIT. IIM. Corner office. Still searching for meaning.", name: 'Rahul V.', role: 'Management Consultant', regret: true },
    { quote: "Left law to open a bakery. Happiest I've ever been.", name: 'Ananya S.', role: 'Pâtissier & Founder', regret: false },
];

const DESKTOP_POSITIONS = [
    'top-[14%] left-[2.5%] text-left',
    'top-[14%] right-[2.5%] text-right',
    'bottom-[6%] left-[2.5%] text-left',
    'bottom-[6%] right-[2.5%] text-right',
];

/* Cinematic atmospheric backdrop — grid + bloom + grain */
function AtmosphereBackdrop() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Editorial grid (very faint) */}
            <div className="absolute inset-0" style={{
                backgroundImage: `
                    linear-gradient(rgba(205,184,138,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(205,184,138,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '72px 72px',
                maskImage: 'radial-gradient(ellipse 78% 65% at 50% 48%, black 18%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(ellipse 78% 65% at 50% 48%, black 18%, transparent 72%)',
            }} />

            {/* Aurora bloom layers (gold + indigo + ember) */}
            <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0.55, 0.78, 0.6] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    background: `
                        radial-gradient(45% 30% at 18% 22%, rgba(205,184,138,0.22), transparent 70%),
                        radial-gradient(48% 32% at 82% 28%, rgba(74, 85, 198, 0.18), transparent 70%),
                        radial-gradient(40% 28% at 50% 86%, rgba(224,122,95,0.10), transparent 75%)
                    `,
                    filter: 'blur(36px)',
                }}
            />

            {/* Central golden bloom focal pool */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                animate={{ opacity: [0.35, 0.55, 0.4], scale: [1, 1.08, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: 720, height: 480,
                    background: 'radial-gradient(ellipse, rgba(205,184,138,0.18) 0%, rgba(205,184,138,0.04) 45%, transparent 70%)',
                    filter: 'blur(28px)',
                }}
            />

            {/* Constellation glow dots */}
            {[
                { x: 18, y: 24 }, { x: 82, y: 22 }, { x: 28, y: 72 }, { x: 76, y: 70 }, { x: 50, y: 12 }, { x: 12, y: 50 }, { x: 88, y: 52 },
            ].map((p, i) => (
                <motion.div
                    key={`dot-${i}`}
                    className="absolute rounded-full"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: 4, height: 4, background: 'rgba(220,201,166,0.95)', boxShadow: '0 0 14px 3px rgba(205,184,138,0.55)' }}
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 3.6 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
                />
            ))}

            {/* Vignette */}
            <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 100%)',
            }} />

            {/* Film grain */}
            <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`,
                backgroundSize: '180px 180px',
                opacity: 0.10,
                mixBlendMode: 'overlay',
            }} />
        </div>
    );
}

export default function IdentityFlipper({ onComplete, config, continueData, onContinue, forceSkipFlip = false }) {
    const isMobile = useIsMobile();
    const shouldReduceMotion = useReducedMotion();
    const titles = config?.titles?.length > 0 ? config.titles : DEFAULT_TITLES;
    const tagline = config?.tagline || 'Every path is someone’s real story.';
    const buttonText = config?.buttonText || 'Begin the journey';
    const flipDuration = config?.flipDuration || 1950;  /* 6 titles × 320 ms ≈ 1920 ms; +30 ms breathing room */
    const flipSpeed = config?.flipSpeed || 320;   /* 320 ms/word — readable, cinematic */

    const mobileDescription = "Anonymous stories from people who've actually been there.";

    /* ── sessionStorage intro guard: play once per session only ── */
    const alreadyPlayed = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('cri_intro_played') === '1'
        : false;

    const [idx, setIdx] = useState(0);
    const [flipping, setFlipping] = useState(!alreadyPlayed);   // skip if already played
    const [showMsg, setShowMsg]   = useState(alreadyPlayed);    // land on CTA immediately
    const [cornerIdxs, setCornerIdxs] = useState([0, 2, 5, 7]);
    const [mobileQIdx, setMobileQIdx] = useState(0);

    const skipToMsg = () => { setFlipping(false); setShowMsg(true); };

    // Phase 1 — controlled flip
    useEffect(() => {
        if (shouldReduceMotion || forceSkipFlip || alreadyPlayed) {
            setFlipping(false); setShowMsg(true); return;
        }
        if (!flipping) return;
        /* Mark session so the intro only plays once */
        try { sessionStorage.setItem('cri_intro_played', '1'); } catch (_) {}
        const iv = setInterval(() => setIdx(i => (i + 1) % titles.length), flipSpeed);
        const stop = setTimeout(() => { setFlipping(false); setShowMsg(true); }, flipDuration);
        return () => { clearInterval(iv); clearTimeout(stop); };
    }, [flipping, titles.length, flipSpeed, flipDuration, shouldReduceMotion, forceSkipFlip, alreadyPlayed]);

    // Keyboard skip
    useEffect(() => {
        if (!flipping) return;
        const handler = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); skipToMsg(); } };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [flipping]);

    // Cycle corner quotes
    useEffect(() => {
        if (!showMsg) return;
        const delays = [4700, 6300, 5500, 7100];
        const timers = delays.map((ms, i) =>
            setInterval(() => {
                setCornerIdxs(prev => {
                    const next = [...prev];
                    const inUse = new Set(next);
                    let pick, attempts = 0;
                    do { pick = Math.floor(Math.random() * ALL_QUOTES.length); attempts++; } while ((pick === next[i] || inUse.has(pick)) && attempts < 20);
                    next[i] = pick;
                    return next;
                });
            }, ms)
        );
        const mobileTimer = setInterval(() => setMobileQIdx(i => i + 1), 4500);
        return () => { timers.forEach(clearInterval); clearInterval(mobileTimer); };
    }, [showMsg]);

    return (
        <div
            className="relative flex h-full min-h-0 w-full flex-col items-center overflow-hidden"
            style={{
                background: 'radial-gradient(ellipse 90% 70% at 50% 42%, #0e0d18 0%, #07060c 50%, #030307 100%)',
                paddingLeft: 'var(--space-x-page)',
                paddingRight: 'var(--space-x-page)',
                paddingTop:  'calc(var(--nav-height) + var(--space-y-page))',
                paddingBottom: 'var(--space-y-page)',
            }}
            onClick={flipping ? skipToMsg : undefined}
        >
            <AtmosphereBackdrop />

            {/* Corner editorial brackets */}
            {[
                { pos: 'top-6 left-6', anchor: 'top-0 left-0', hDir: '90deg', vDir: '180deg' },
                { pos: 'top-6 right-6', anchor: 'top-0 right-0', hDir: '-90deg', vDir: '180deg' },
                { pos: 'bottom-6 left-6', anchor: 'bottom-0 left-0', hDir: '90deg', vDir: '0deg' },
                { pos: 'bottom-6 right-6', anchor: 'bottom-0 right-0', hDir: '-90deg', vDir: '0deg' },
            ].map((c, i) => (
                <div key={`corner-${i}`} data-collapse-on-short="true" className={`absolute ${c.pos} w-20 h-20 pointer-events-none hidden md:block`} aria-hidden="true">
                    <div className={`absolute ${c.anchor}`} style={{ width: 56, height: 1, background: `linear-gradient(${c.hDir}, rgba(205,184,138,0.55), transparent)` }} />
                    <div className={`absolute ${c.anchor}`} style={{ height: 56, width: 1, background: `linear-gradient(${c.vDir}, rgba(205,184,138,0.55), transparent)` }} />
                </div>
            ))}

            {/* Skip button */}
            {flipping && (
                <div className="absolute bottom-9 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 safe-area-bottom">
                    <span className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] text-white/55 font-medium">
                        {isMobile ? 'tap anywhere to skip' : 'press Space or click to skip'}
                    </span>
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); skipToMsg(); }}
                        className="glass-card text-[11px] uppercase tracking-[0.22em] text-white/82 hover:text-white px-7 py-2.5 rounded-full fx-pop touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70 hover:border-white/20 hover:-translate-y-0.5"
                        whileTap={{ scale: 0.95 }}
                    >
                        Skip intro
                    </motion.button>
                </div>
            )}

            {/* MAIN STAGE */}
            <div className="relative z-10 flex flex-col items-center my-auto w-full" style={{ paddingLeft: 'var(--space-x-page)', paddingRight: 'var(--space-x-page)', gap: 'var(--space-y-section)' }} onClick={e => e.stopPropagation()}>
                {!showMsg ? (
                    /* FLIP PHASE — editorial title sequence */
                    <div className="relative flex flex-col items-center justify-center w-full" style={{ minHeight: 'min(34dvh, 240px)' }}>
                        <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 'clamp(9.5px, 0.9vw, 11px)', letterSpacing: '0.32em', marginBottom: 'var(--space-y-section)' }}>
                            — Career Records Of India —
                        </span>
                        <p className="font-display italic text-white/40 tracking-tight" style={{ fontSize: 'clamp(0.78rem, min(1.05vw, 1.4dvh), 1rem)', marginBottom: 'var(--space-y-tight)' }}>a record of every</p>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 1.01 }}
                                transition={{ duration: 0.10, ease: [0.16, 1, 0.3, 1] }}
                                className="flex items-center justify-center select-none"
                            >
                                <span
                                    className="font-display font-bold tracking-tightest leading-tightest"
                                    style={{
                                        fontSize: 'clamp(2rem, min(8.4vw, 11dvh), 6rem)',
                                        lineHeight: 1.02,
                                        background: 'linear-gradient(140deg, #f7eed7 0%, #d6bf8a 38%, #a78a52 70%, #6e5a36 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        textShadow: 'none',
                                        filter: 'drop-shadow(0 0 36px rgba(205,184,138,0.30))',
                                    }}
                                >
                                    {titles[idx]}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                        <p className="font-display italic text-white/40 tracking-tight" style={{ fontSize: 'clamp(0.78rem, min(1.05vw, 1.4dvh), 1rem)', marginTop: 'var(--space-y-tight)' }}>that ever lived in India.</p>

                        {/* Bottom progress hairline */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: flipDuration / 1000, ease: 'linear' }}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-px w-32 origin-left"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(205,184,138,0.7), transparent)' }}
                        />
                    </div>
                ) : (
                    /* CTA PHASE */
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="text-center flex flex-col items-center max-w-2xl" style={{ gap: 'var(--space-y-section)' }}
                    >
                        {/* Eyebrow */}
                        <motion.span
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="pw-eyebrow text-[#CDB88A]"
                            style={{ fontSize: 'clamp(9.5px, 0.9vw, 11px)', letterSpacing: '0.32em' }}
                        >
                            — An interactive documentary —
                        </motion.span>

                        {/* Tagline — editorial display */}
                        <h1
                            className="font-display font-bold leading-tightest tracking-tightest text-balance"
                            style={{
                                fontSize: 'clamp(1.7rem, min(5.6vw, 7.6dvh), 3.6rem)',
                                lineHeight: 1.04,
                                background: 'linear-gradient(140deg, #fff7e2 0%, #e3cb98 32%, #b89e6a 60%, #7e6940 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                filter: 'drop-shadow(0 6px 36px rgba(205,184,138,0.18))',
                            }}
                        >
                            {tagline}
                        </h1>

                        {/* Cinematic gold rule */}
                        <div className="relative flex items-center justify-center h-2" style={{ width: 'clamp(8rem, 24vw, 16rem)' }} aria-hidden="true">
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute h-px w-full origin-center"
                                style={{ background: 'linear-gradient(90deg, transparent, #A89060 50%, transparent)' }}
                            />
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.7, 0.3] }}
                                transition={{ delay: 0.95, duration: 1.0, ease: 'easeOut', times: [0, 0.4, 1] }}
                                className="absolute w-full h-1"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(205,184,138,0.7), transparent)', filter: 'blur(4px)' }}
                            />
                        </div>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5, duration: 0.6 }}
                            className="t-body text-white/65 text-pretty" style={{ maxWidth: 'min(44ch, 92vw)', fontFamily: 'var(--font-sans)' }}
                        >
                            {isMobile ? mobileDescription : 'Real journeys from Indians who’ve actually walked the path — hostels, exam halls, first jobs, regrets, pivots. Anonymous, honest, unfiltered.'}
                        </motion.p>

                        {/* Primary CTA */}
                        <motion.button
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                            onClick={() => onComplete?.()}
                            data-testid="hero-primary-cta"
                            className="pw-btn-primary group relative uppercase tracking-[0.18em] rounded-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70" style={{ padding: 'clamp(0.7rem, 1.6dvh, 1rem) clamp(1.6rem, 4vw, 2.6rem)', fontSize: 'clamp(11px, 1vw, 13px)' }}
                            whileHover={isMobile || shouldReduceMotion ? undefined : { y: -3 }}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        >
                            <motion.span
                                initial={{ x: '-130%', opacity: 0 }}
                                animate={{ x: '220%', opacity: [0, 1, 0] }}
                                transition={{ delay: 1.6, duration: 1.0, ease: 'easeInOut', times: [0, 0.5, 1] }}
                                aria-hidden="true"
                                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,236,180,0.55), transparent)', pointerEvents: 'none' }}
                            />
                            <span className="relative font-bold">{buttonText}</span>
                            <span aria-hidden="true" className="relative ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </motion.button>

                        {/* Secondary CTA — resume last path */}
                        {continueData && onContinue && (
                            <motion.button
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                                onClick={onContinue}
                                data-testid="hero-secondary-cta"
                                whileHover={isMobile || shouldReduceMotion ? undefined : { y: -3 }}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                                className="glass-card touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70 flex items-center gap-4 p-3.5 px-5 rounded-2xl fx-pop hover:border-[#A89060]/35"
                                style={{
                                    minWidth: isMobile ? 0 : 360,
                                    width: isMobile ? 'min(92vw, 360px)' : 'auto',
                                    maxWidth: isMobile ? '92vw' : 460,
                                }}
                            >
                                <span className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[#A89060]/15 text-[#CDB88A] text-sm leading-none">↩</span>
                                <span className="flex flex-col items-start gap-1 flex-1 min-w-0">
                                    <span className="text-[10.5px] font-bold tracking-[0.20em] uppercase text-[#CDB88A]/85">Resume last chapter</span>
                                    <span className="text-[14px] font-semibold text-white/92 truncate w-full">{continueData.nodeLabel}</span>
                                </span>
                                <span className="ml-3 text-lg text-white/55 leading-none">›</span>
                            </motion.button>
                        )}

                        {/* Mobile cycling testimonial */}
                        <div data-mute="true" className="md:hidden w-full text-center pointer-events-none border-t border-white/8 pt-3 relative" style={{ height: 'clamp(5rem, 14dvh, 7rem)' }}>
                            <AnimatePresence mode="wait">
                                {(() => { const t = ALL_QUOTES[mobileQIdx % ALL_QUOTES.length]; return (
                                    <motion.div
                                        key={`mob-${mobileQIdx}`}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute inset-x-0 top-3"
                                    >
                                        <p className="t-quote text-[15px] leading-relaxed">“{t.quote}”</p>
                                        <div className="mt-2 flex items-center justify-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.regret ? 'rgba(208,122,122,0.92)' : 'rgba(111,175,138,0.92)' }} />
                                            <p className={`text-[11.5px] font-semibold ${t.regret ? 'text-[#D07A7A]/90' : 'text-[#6FAF8A]/90'}`}>{t.name}</p>
                                            <span className="text-white/30">•</span>
                                            <p className="text-white/45 text-[11.5px]">{t.role}</p>
                                        </div>
                                    </motion.div>
                                ); })()}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Desktop: 4 corner archival testimonial slips */}
            {showMsg && DESKTOP_POSITIONS.map((pos, i) => {
                const t = ALL_QUOTES[cornerIdxs[i] % ALL_QUOTES.length];
                return (
                    <div key={i} data-mute="true" className={`hidden md:block absolute z-10 max-w-[15rem] pointer-events-none ${pos}`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${i}-${cornerIdxs[i]}`}
                                initial={{ opacity: 0, y: 12, rotate: i % 2 === 0 ? -1.2 : 1.2 }}
                                animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.2 : 1.2 }}
                                exit={{ opacity: 0, y: -10, rotate: i % 2 === 0 ? -1.2 : 1.2 }}
                                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                                className="pw-panel-archival px-5 py-4"
                            >
                                <span className="absolute top-2 right-3 text-[9px] uppercase tracking-[0.24em] text-[#CDB88A]/45 font-mono">° {String(i + 1).padStart(2, '0')}</span>
                                <p className="t-quote text-[13.5px] leading-snug text-white/82">“{t.quote}”</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.regret ? 'rgba(208,122,122,0.92)' : 'rgba(111,175,138,0.92)', boxShadow: t.regret ? '0 0 8px rgba(208,122,122,0.55)' : '0 0 8px rgba(111,175,138,0.55)' }} />
                                    <p className={`text-[11px] font-bold tracking-wide ${t.regret ? 'text-[#D07A7A]/92' : 'text-[#6FAF8A]/92'}`}>{t.name}</p>
                                </div>
                                <p className="text-white/42 text-[11px] mt-1">{t.role}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
