import { motion, AnimatePresence } from 'framer-motion';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Quote, ArrowLeft } from 'lucide-react';

function VideoLibrary({ selectedVideo, allVideos, onClose, onNavigate, visitorMirrorProfile = null }) {
    const closeBtnRef = useRef(null);
    const videoRef = useRef(null);
    const dialogRef = useRef(null);
    const [resolvedNodeVideo, setResolvedNodeVideo] = useState(null);
    const [resolvingNodeVideo, setResolvingNodeVideo] = useState(false);
    const [progress, setProgress] = useState(0);              /* 0..1 of segment elapsed */
    const [segmentEnded, setSegmentEnded] = useState(false);  /* triggers quote takeover */

    useEffect(() => {
        let ignore = false;
        const nodeId = String(selectedVideo?.nodeId || '').trim();
        if (!selectedVideo || !nodeId) {
            setResolvedNodeVideo(null);
            setResolvingNodeVideo(false);
            return () => { };
        }
        const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        const run = async () => {
            setResolvingNodeVideo(true);
            try {
                const marks = String(visitorMirrorProfile?.marks || '').trim();
                const entry = String(visitorMirrorProfile?.entry || '').trim();
                const hasProfile = Boolean(marks || entry);
                const q = new URLSearchParams();
                if (marks) q.set('marks', marks);
                if (entry) q.set('entry', entry);
                if (hasProfile) q.set('strict', '1');
                const qs = q.toString() ? `?${q.toString()}` : '';
                const res = await fetch(`${API}/api/videos/for-node/${encodeURIComponent(nodeId)}${qs}`);
                const data = await res.json().catch(() => ({}));
                const first = Array.isArray(data?.clips) ? data.clips[0] : null;
                if (ignore || !first) { if (!ignore) setResolvedNodeVideo(null); return; }
                setResolvedNodeVideo({
                    id: first.clipId || `${first.interviewId || 'node'}-${nodeId}`,
                    title: first.label || selectedVideo.title || 'Career segment',
                    youtubeId: first.youtubeId || first.videoId || '',
                    start: Number(first.startSec ?? first.start ?? 0) || 0,
                    end: Number(first.endSec ?? first.end ?? 0) || 0,
                });
            } catch {
                if (!ignore) setResolvedNodeVideo(null);
            } finally {
                if (!ignore) setResolvingNodeVideo(false);
            }
        };
        run();
        return () => { ignore = true; };
    }, [selectedVideo, visitorMirrorProfile]);

    const effectiveVideo = useMemo(() => {
        if (!selectedVideo) return null;
        return resolvedNodeVideo || selectedVideo;
    }, [resolvedNodeVideo, selectedVideo]);

    /* Reset state when video changes */
    useEffect(() => {
        setProgress(0);
        setSegmentEnded(false);
    }, [effectiveVideo?.id, effectiveVideo?.youtubeId]);

    /* Drive progress + segmentEnded from segment duration (works without YT IFrame API).
       Honest enough for the cinematic "quote takeover" cue. */
    useEffect(() => {
        if (!effectiveVideo) return undefined;
        const start = Number(effectiveVideo.start || 0);
        const end = Number(effectiveVideo.end || 0);
        const dur = Math.max(0, end - start);
        if (!dur) return undefined;          /* unknown duration → can't drive */
        if (segmentEnded) return undefined;
        const startedAt = Date.now();
        const tick = setInterval(() => {
            const elapsed = (Date.now() - startedAt) / 1000;
            const ratio = Math.min(1, elapsed / dur);
            setProgress(ratio);
            if (ratio >= 1) {
                clearInterval(tick);
                setSegmentEnded(true);
            }
        }, 250);
        return () => clearInterval(tick);
    }, [effectiveVideo, segmentEnded]);

    const playlist = Array.isArray(allVideos) ? allVideos : [];
    const idx = playlist.findIndex(v => v.id === selectedVideo?.id);
    const prevVideo = idx > 0 ? playlist[idx - 1] : null;
    const nextVideo = idx !== -1 && idx < playlist.length - 1 ? playlist[idx + 1] : null;
    const hasPrev = Boolean(prevVideo && onNavigate);
    const hasNext = Boolean(nextVideo && onNavigate);

    useEffect(() => {
        if (!effectiveVideo) return;
        const prevFocus = document.activeElement;
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); }
            if (e.key === 'ArrowLeft' && hasPrev) { e.preventDefault(); onNavigate(prevVideo); }
            if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); onNavigate(nextVideo); }
            if (e.key === 'Tab' && dialogRef.current) {
                const focusables = dialogRef.current.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', onKey);
        setTimeout(() => closeBtnRef.current?.focus(), 50);
        document.documentElement.classList.add('motion-paused');
        const videoEl = videoRef.current;
        const onPlay = async () => {
            try { const m = await import('../../lib/telemetry'); m.track && m.track('video.play', { id: effectiveVideo.id, title: effectiveVideo.title }); }
            catch (e) { console.debug('[Telemetry] play event not sent', e); }
        };
        videoEl?.addEventListener?.('play', onPlay);
        return () => {
            document.removeEventListener('keydown', onKey);
            videoEl?.removeEventListener?.('play', onPlay);
            prevFocus?.focus?.();
            document.documentElement.classList.remove('motion-paused');
        };
    }, [effectiveVideo, onClose, hasPrev, hasNext, prevVideo, nextVideo, onNavigate]);

    if (!effectiveVideo) return null;

    const segDur = (effectiveVideo.end || 0) - (effectiveVideo.start || 0);
    const fmtTime = (s) => {
        if (!s) return '0:00';
        const m = Math.floor(s / 60);
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={`Video player: ${effectiveVideo.title}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl"
                style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(11,12,31,0.78), rgba(3,4,8,0.92))' }}
                onClick={onClose}
                data-testid="video-library-modal"
            >
                {/* Cinematic vignette + grain */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.40'/%3E%3C/svg%3E")`,
                    backgroundSize: '180px 180px', opacity: 0.06, mixBlendMode: 'overlay',
                }} />

                <motion.div
                    initial={{ scale: 0.94, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.94, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                    onClick={(e) => e.stopPropagation()}
                    ref={dialogRef}
                    className="relative w-[calc(100%-1.5rem)] sm:w-full sm:max-w-3xl mx-3 sm:mx-6 max-h-[92dvh] flex flex-col rounded-[24px] overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20,22,42,0.86) 0%, rgba(10,12,20,0.96) 100%)',
                        border: '1px solid rgba(205,184,138,0.22)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(205,184,138,0.10), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 80px rgba(205,184,138,0.06)',
                    }}
                >
                    {/* Top header */}
                    <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#A89060]/15">
                        <div className="flex items-center gap-3 min-w-0">
                            {hasPrev && (
                                <motion.button
                                    onClick={() => onNavigate(prevVideo)}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.94 }}
                                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[#A89060]/45 hover:bg-[#A89060]/10 text-white/65 hover:text-[#CDB88A] transition-colors"
                                    aria-label="Previous video"
                                    title="Previous (←)"
                                >
                                    <ChevronLeft size={15} />
                                </motion.button>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="pw-eyebrow text-[#CDB88A]/85" style={{ fontSize: 9.5, letterSpacing: '0.28em' }}>Career segment</span>
                                <motion.h2
                                    key={effectiveVideo.id}
                                    initial={{ opacity: 0, x: 6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.06 }}
                                    className="mt-1 font-display text-[15px] sm:text-[17px] font-semibold text-white truncate tracking-tightest"
                                >
                                    {effectiveVideo.title}
                                </motion.h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {playlist.length > 1 && idx !== -1 && (
                                <span className="pw-chip-soft font-mono" style={{ fontSize: 11 }}>{idx + 1} / {playlist.length}</span>
                            )}
                            {hasNext && (
                                <motion.button
                                    onClick={() => onNavigate(nextVideo)}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.94 }}
                                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[#A89060]/45 hover:bg-[#A89060]/10 text-white/65 hover:text-[#CDB88A] transition-colors"
                                    aria-label="Next video"
                                    title="Next (→)"
                                >
                                    <ChevronRight size={15} />
                                </motion.button>
                            )}
                            <motion.button
                                ref={closeBtnRef}
                                whileHover={{ y: -1, rotate: 90 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={onClose}
                                data-testid="video-library-close-button"
                                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[#D07A7A]/45 hover:bg-[#D07A7A]/10 text-white/72 hover:text-[#D07A7A] transition-colors"
                                aria-label="Close (Esc)"
                                title="Close (Esc)"
                            >
                                <X size={16} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Player frame with cinematic ambient bloom */}
                    <div className="relative bg-black flex-1 min-h-0">
                        {/* Outer gold hairline glow */}
                        <div className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: 'inset 0 0 0 1px rgba(205,184,138,0.12), inset 0 0 80px rgba(205,184,138,0.06)' }} />
                        {effectiveVideo.youtubeId ? (
                            <div className="relative aspect-video">
                                {resolvingNodeVideo && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-[11.5px] uppercase tracking-[0.18em] text-[#CDB88A]/85">
                                        <span className="pw-spinner !w-5 !h-5 mr-3" />
                                        Loading mapped segment
                                    </div>
                                )}
                                <iframe
                                    key={`${effectiveVideo.youtubeId}-${effectiveVideo.start || 0}-${effectiveVideo.end || 0}`}
                                    title={effectiveVideo.title}
                                    src={`https://www.youtube.com/embed/${effectiveVideo.youtubeId}?start=${effectiveVideo.start || 0}${effectiveVideo.end ? `&end=${effectiveVideo.end}` : ''}&autoplay=1&rel=0&modestbranding=1`}
                                    className="absolute inset-0 w-full h-full"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />

                                {/* Quote takeover at segment end — editorial subtitle moment */}
                                <AnimatePresence>
                                    {segmentEnded && (
                                        <motion.div
                                            key="quote-takeover"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.32 }}
                                            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
                                            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(110,47,38,0.55), rgba(3,4,8,0.96))' }}
                                            role="region"
                                            aria-label="Segment ended"
                                            data-testid="video-quote-takeover"
                                        >
                                            {/* Grain */}
                                            <div className="absolute inset-0 pointer-events-none" style={{
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`,
                                                backgroundSize: '180px 180px', opacity: 0.10, mixBlendMode: 'overlay',
                                            }} />

                                            <motion.span
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.12, duration: 0.4 }}
                                                className="pw-eyebrow"
                                                style={{ fontSize: 10.5, letterSpacing: '0.34em', color: '#EE9777' }}
                                            >
                                                — End of segment —
                                            </motion.span>
                                            <motion.p
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.22, duration: 0.5 }}
                                                className="t-quote mt-4 max-w-[42ch] text-balance"
                                                style={{ fontSize: 'clamp(1.05rem, 1.7vw, 1.35rem)', color: 'rgba(255,255,255,0.92)' }}
                                            >
                                                “{effectiveVideo.title}”
                                            </motion.p>
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.4, duration: 0.5 }}
                                                className="mt-3 text-white/55 text-[13px] max-w-md"
                                            >
                                                Want to see what came after?
                                            </motion.p>
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5, duration: 0.45 }}
                                                className="mt-6 flex items-center gap-3 flex-wrap justify-center"
                                            >
                                                {effectiveVideo.youtubeId && (
                                                    <a
                                                        href={`https://youtu.be/${effectiveVideo.youtubeId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="pw-btn-primary !py-2.5 !px-5 text-[11.5px] uppercase tracking-[0.18em] inline-flex items-center gap-2"
                                                        style={{ borderColor: 'rgba(224,122,95,0.55)' }}
                                                    >
                                                        <Maximize2 size={12} /> Watch full
                                                    </a>
                                                )}
                                                <button
                                                    onClick={onClose}
                                                    className="pw-btn-secondary !py-2.5 !px-5 text-[11.5px] uppercase tracking-[0.18em] inline-flex items-center gap-2"
                                                    data-testid="video-quote-takeover-return"
                                                >
                                                    <ArrowLeft size={12} /> Return to tree
                                                </button>
                                            </motion.div>
                                            {hasNext && (
                                                <motion.button
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.7, duration: 0.4 }}
                                                    onClick={() => onNavigate(nextVideo)}
                                                    className="mt-5 text-white/45 hover:text-[#CDB88A] text-[12px] tracking-[0.06em] underline underline-offset-4 fx-soft"
                                                >
                                                    Or play the next segment →
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <video ref={videoRef} controls className="w-full max-h-[70dvh] object-contain" aria-label={`Video: ${effectiveVideo.title}`}>
                                <source src={effectiveVideo.src} type="video/mp4" />
                            </video>
                        )}
                    </div>

                    {/* Footer: segment progress + meta */}
                    <div className="px-5 py-3.5 border-t border-[#A89060]/15 flex items-center justify-between gap-4 bg-[#070812]/60">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="font-mono text-[11px] text-[#CDB88A]/85 whitespace-nowrap">
                                {fmtTime(effectiveVideo.start || 0)}
                            </span>
                            <div className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/[0.06] relative">
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        background: 'linear-gradient(90deg, rgba(205,184,138,0.95), rgba(205,184,138,0.55))',
                                        boxShadow: '0 0 12px rgba(205,184,138,0.35)',
                                    }}
                                    animate={{ width: `${Math.round(progress * 100)}%` }}
                                    transition={{ duration: 0.25, ease: 'linear' }}
                                />
                            </div>
                            <span className="font-mono text-[11px] text-[#CDB88A]/85 whitespace-nowrap">
                                {fmtTime(effectiveVideo.end || 0)}
                            </span>
                        </div>
                        {segDur > 0 && (
                            <span className="pw-chip-soft hidden sm:inline-flex font-mono" style={{ fontSize: 11 }}>
                                <Quote size={10} className="opacity-60" /> {Math.round(segDur)}s segment
                            </span>
                        )}
                        {effectiveVideo.youtubeId && (
                            <a
                                href={`https://youtu.be/${effectiveVideo.youtubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid="video-library-watch-full-button"
                                className="pw-btn-secondary !py-2 !px-3 text-[11px] uppercase tracking-[0.16em] flex items-center gap-1.5"
                            >
                                <Maximize2 size={11} /> Watch full
                            </a>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default memo(VideoLibrary);
