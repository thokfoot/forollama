import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';

// Inline SVG placeholder — rich colored thumbnails (no external dependency)
const makeStill = (seed) => {
    const hue = (seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360;
    const hue2 = (hue + 40) % 360;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>`
        + `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>`
        + `<stop offset='0%' stop-color='hsl(${hue},55%,22%)'/>` 
        + `<stop offset='100%' stop-color='hsl(${hue2},40%,14%)'/></linearGradient></defs>`
        + `<rect width='96' height='96' fill='url(#g)' rx='4'/>`
        + `<circle cx='48' cy='42' r='18' fill='hsl(${hue},60%,35%)' opacity='0.6'/>`
        + `<polygon points='42,34 58,42 42,50' fill='rgba(255,255,255,0.85)'/>`
        + `<rect x='16' y='68' width='64' height='5' rx='2.5' fill='rgba(255,255,255,0.25)'/>`
        + `<rect x='22' y='78' width='44' height='3' rx='1.5' fill='rgba(255,255,255,0.15)'/>`
        + `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const STILLS_GENERAL = [
    makeStill('career1'), makeStill('career2'), makeStill('career3'),
    makeStill('career4'), makeStill('career5'), makeStill('career6'),
    makeStill('career7'), makeStill('career8'), makeStill('career9'),
    makeStill('career10'),
];

const STILLS_BY_CAT = {
    science: [makeStill('science1'), makeStill('science2'), makeStill('science3'), makeStill('science4'), makeStill('science5'), makeStill('science6')],
    pcm: [makeStill('physics1'), makeStill('maths2'), makeStill('chem3'), makeStill('pcm4'), makeStill('pcm5'), makeStill('pcm6')],
    pcb: [makeStill('bio1'), makeStill('med2'), makeStill('pcb3'), makeStill('pcb4'), makeStill('pcb5'), makeStill('pcb6')],
    commerce: [makeStill('comm1'), makeStill('comm2'), makeStill('comm3'), makeStill('comm4'), makeStill('comm5'), makeStill('comm6')],
    'arts-humanities': [makeStill('arts1'), makeStill('arts2'), makeStill('arts3'), makeStill('arts4'), makeStill('arts5'), makeStill('arts6')],
    'vocational-skill': [makeStill('skill1'), makeStill('skill2'), makeStill('skill3'), makeStill('skill4'), makeStill('skill5'), makeStill('skill6')],
    postgrad: [makeStill('pg1'), makeStill('pg2'), makeStill('pg3'), makeStill('pg4'), makeStill('pg5'), makeStill('pg6')],
    'career-pivots': [makeStill('pivot1'), makeStill('pivot2'), makeStill('pivot3'), makeStill('pivot4'), makeStill('pivot5'), makeStill('pivot6')],
};

function getStillsForCategory(category) {
    if (!category || category === 'general') return STILLS_GENERAL;
    if (STILLS_BY_CAT[category]) return STILLS_BY_CAT[category];
    const key = Object.keys(STILLS_BY_CAT).find(k => category.includes(k) || k.includes(category));
    return key ? STILLS_BY_CAT[key] : STILLS_GENERAL;
}

const getYoutubeThumb = (youtubeId) => `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;

function extractYoutubeId(video = {}) {
    const direct = String(video?.youtubeId || video?.videoId || '').trim();
    if (direct) return direct;
    const thumb = String(video?.thumbnail || '').trim();
    const mThumb = thumb.match(/\/vi\/([^/]+)\//);
    if (mThumb?.[1]) return mThumb[1];
    const url = String(video?.url || video?.youtubeUrl || '').trim();
    const mWatch = url.match(/[?&]v=([^&]+)/);
    if (mWatch?.[1]) return mWatch[1];
    const mShort = url.match(/youtu\.be\/([^?&/]+)/);
    if (mShort?.[1]) return mShort[1];
    return '';
}

/** Min viewport width to show video sidebars. 320px — visible on all phones. */
export const SIDEBAR_MIN_WIDTH = 320;

const fmtTime = (sec) => {
    if (!sec) return null;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

function Thumb({ src, size, thumbW, title, isVideo, video, onVideoClick }) {
    const startLabel = isVideo && video?.start ? fmtTime(video.start) : null;
    const profession = isVideo && video?.profession ? video.profession : null;
    const sectionShort = isVideo && video?.sectionLabel ? video.sectionLabel : null;
    const isBridge = Boolean(isVideo && video?.isBridge);
    const tooltipTitle = title || (isVideo ? 'Career clip' : 'Career still');
    const [loaded, setLoaded] = useState(false);
    const [imgSrc, setImgSrc] = useState(() => {
        if (isVideo) {
            const id = extractYoutubeId(video) || String(src || '').trim();
            return id ? getYoutubeThumb(id) : makeStill(String(tooltipTitle));
        }
        return src;
    });

    useEffect(() => {
        setLoaded(false);
        if (isVideo) {
            const id = extractYoutubeId(video) || String(src || '').trim();
            setImgSrc(id ? getYoutubeThumb(id) : makeStill(String(tooltipTitle)));
            return;
        }
        setImgSrc(src || makeStill(String(tooltipTitle)));
    }, [isVideo, video, src, tooltipTitle]);

    return (
        <div
            className="flex-shrink-0 rounded-lg overflow-hidden border border-white/8 hover:border-white/30 fx-pop cursor-pointer relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
            style={{ width: thumbW || size, height: size, background: '#111' }}
            onClick={isVideo && onVideoClick && video ? () => onVideoClick(video) : undefined}
            role={isVideo && onVideoClick ? 'button' : undefined}
            tabIndex={isVideo && onVideoClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (!isVideo || !onVideoClick || !video) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onVideoClick(video);
                }
            }}
            aria-label={tooltipTitle}
        >
            {/* Shimmer skeleton while image loads */}
            {!loaded && (
                <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg" style={{ zIndex: 1 }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                        style={{ animation: 'shimmer 1.4s infinite', backgroundSize: '200% 100%' }} />
                </div>
            )}
            <img
                src={imgSrc}
                alt={tooltipTitle}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setImgSrc(makeStill(String(tooltipTitle || 'video-fallback')));
                    setLoaded(true);
                }}
                className="w-full h-full object-cover transition-opacity duration-500"
                style={{ opacity: loaded ? 0.82 : 0.25 }}
            />
            {/* Play icon overlay on hover */}
            {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                            <polygon points="2,1 9,5 2,9" />
                        </svg>
                    </div>
                </div>
            )}
            {/* Video title tooltip on hover */}
            {isVideo && title && (
                <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-white/90 text-[10px] leading-tight line-clamp-2 font-medium">{title}</p>
                </div>
            )}
            {startLabel && (
                <span className="absolute bottom-1 right-1 text-[11px] font-mono bg-black/70 text-[var(--gold-300)] px-1 rounded leading-4 pointer-events-none">
                    {startLabel}
                </span>
            )}
            {sectionShort && (
                <span className={`absolute top-1 left-1 text-[10px] font-mono px-1 rounded leading-4 pointer-events-none max-w-[80%] truncate ${isBridge ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-black/70 text-white/75'}`}>
                    {isBridge ? 'Next: ' : ''}{sectionShort}
                </span>
            )}
            {profession && (
                <span className="absolute bottom-1 left-1 right-5 text-[10px] font-mono bg-black/60 text-white/60 px-1 rounded leading-3 truncate pointer-events-none">
                    {profession}
                </span>
            )}
        </div>
    );
}

function Column({ side, paused, items, onVideoClick, isMobile }) {
    const [hovered, setHovered] = useState(false);
    const [touched, setTouched] = useState(false);
    const touchTimerRef = useRef(null);
    const mobileScrollRef = useRef(null);
    const dragRef = useRef({ isDragging: false, startY: 0, scrollStart: 0 });
    const prevItemsRef = useRef(items);
    const isTablet = !isMobile && typeof window !== 'undefined' && window.innerWidth < 1024;
    const size = isMobile ? 28 : isTablet ? 44 : 68;
    const thumbW = isMobile ? 34 : undefined;
    const gap  = isMobile ? 4  : isTablet ? 6 : 10;
    const list = useMemo(() => {
        const out = [];
        for (let r = 0; r < 4; r++) items.forEach((it) => out.push(it));
        return out;
    }, [items]);
    const mobileLoop = useMemo(() => {
        if (!isMobile) return [];
        if (!items.length) return [];
        return [...items, ...items, ...items];
    }, [isMobile, items]);
    const totalH = list.length * (size + gap);
    const goesUp = side === 'left';
    /* Per design spec: Left = Current chapter (gold), Right = History (indigo). */
    const railLabel = side === 'left' ? 'Current chapter' : 'History';
    const railAccent = side === 'left' ? 'rgba(205,184,138,0.92)' : 'rgba(185,194,255,0.92)';

    // Keep rails reliably auto-scrolling; pause only for explicit touch interaction on mobile.
    // On mobile, ignore the external `paused` prop for auto-scroll — mobile browsers
    // fire hasFocus()=false unreliably which kills scrolling.
    const isPaused = isMobile ? touched : (paused || touched);
    const modeLabel = touched ? 'MANUAL' : (isPaused ? 'PAUSED' : 'AUTO');

    const handleTouchStart = () => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        setTouched(true);
    };
    const handleTouchEnd = () => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        touchTimerRef.current = setTimeout(() => setTouched(false), 2500);
    };

    // --- Grab-to-scroll handlers for mobile ---
    const handlePointerDown = (e) => {
        if (!isMobile || !mobileScrollRef.current) return;
        dragRef.current = { isDragging: true, startY: e.clientY, scrollStart: mobileScrollRef.current.scrollTop };
        handleTouchStart();
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e) => {
        if (!dragRef.current.isDragging || !mobileScrollRef.current) return;
        const dy = dragRef.current.startY - e.clientY;
        mobileScrollRef.current.scrollTop = dragRef.current.scrollStart + dy;
    };
    const handlePointerUp = () => {
        dragRef.current.isDragging = false;
        handleTouchEnd();
    };

    // --- Auto-scroll to top when items change (new node selected) ---
    useEffect(() => {
        if (prevItemsRef.current === items) return;
        prevItemsRef.current = items;
        if (isMobile && mobileScrollRef.current) {
            const segment = Math.max(1, items.length) * (size + gap);
            mobileScrollRef.current.scrollTo({ top: segment, behavior: 'smooth' });
        }
    }, [items, isMobile, size, gap]);

    useEffect(() => {
        if (!isMobile) return;
        if (!mobileScrollRef.current) return;
        if (items.length <= 1) return;
        if (isPaused) return;

        const el = mobileScrollRef.current;
        const segment = Math.max(1, items.length) * (size + gap);

        // Start from middle segment so looping reset is seamless.
        if (el.scrollTop < segment * 0.5) {
            el.scrollTop = segment;
        }

        let raf = 0;
        const speed = 0.6; // px/frame — visible slow scroll on 30px thumbs
        const tick = () => {
            if (!mobileScrollRef.current) return;
            const node = mobileScrollRef.current;
            node.scrollTop += speed;
            if (node.scrollTop >= segment * 2) {
                node.scrollTop = segment;
            }
            raf = window.requestAnimationFrame(tick);
        };

        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [isMobile, isPaused, items.length, size, gap]);

    useEffect(() => {
        return () => {
            if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        };
    }, []);

    if (isMobile) {
        return (
            <div
                className={`fixed top-0 bottom-0 z-30 overflow-hidden ${side === 'left' ? 'left-0' : 'right-0'}`}
                style={{
                    width: '36px',
                    cursor: 'grab',
                    paddingLeft: side === 'left' ? 'env(safe-area-inset-left, 0px)' : undefined,
                    paddingRight: side === 'right' ? 'env(safe-area-inset-right, 0px)' : undefined,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(180deg, rgba(5,5,8,0.9) 0%, transparent 15%, transparent 85%, rgba(5,5,8,0.9) 100%)',
                    }}
                />
                <div
                    ref={mobileScrollRef}
                    className="relative w-full h-full overflow-y-auto kinetic-scroll"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'none',
                        paddingTop: gap,
                        paddingBottom: gap,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <div className="flex flex-col items-center" style={{ gap }}>
                        {mobileLoop.map((it, i) => (
                            <Thumb
                                key={`${side}-mob-${i}`}
                                src={it.src}
                                size={size}
                                thumbW={thumbW}
                                title={it.title}
                                isVideo={it.isVideo}
                                video={it.video}
                                onVideoClick={onVideoClick}
                            />
                        ))}
                    </div>
                </div>
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050508] to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-10" />
            </div>
        );
    }

    return (
        <aside
            className={`flex-shrink-0 w-auto h-full flex flex-col items-center glass-morphism border-x border-white/5 relative z-10 fx-pop ease-out overflow-hidden ${
                side === 'left' ? 'order-first' : 'order-last'
            }`}
            style={{ 
                width: isMobile ? '42px' : isTablet ? '64px' : '92px',
                borderRight: side === 'left' ? '1px solid rgba(168,144,96,0.15)' : 'none',
                borderLeft: side === 'right' ? '1px solid rgba(168,144,96,0.15)' : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Header / Label */}
            <div className="w-full py-3 flex flex-col items-center justify-center gap-2 border-b border-white/5 bg-white/2">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-glow-gold" style={{ background: railAccent }} />
                <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-white/40 vertical-text select-none">
                    {railLabel}
                </span>
            </div>

            {/* Manual/Auto Mode Indicator (subtle) */}
            <div className="absolute top-[108px] left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[7px] font-mono text-white/20 tracking-tighter">{modeLabel}</span>
            </div>

            {/* Scrolling Content */}
            <div
                ref={mobileScrollRef}
                className="flex-1 w-full overflow-y-auto overflow-x-hidden kinetic-scroll relative flex flex-col items-center py-4 gap-3 no-scrollbar"
                style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    scrollBehavior: touched ? 'auto' : 'smooth'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {(isMobile ? mobileLoop : list).map((it, i) => (
                    <Thumb 
                        key={`${it.id || i}-${i}`} 
                        src={it.src || it.thumbnail} 
                        size={size} 
                        thumbW={thumbW}
                        title={it.title} 
                        isVideo={it.isVideo !== false} 
                        video={it.video || it} 
                        onVideoClick={onVideoClick} 
                    />
                ))}
            </div>

            {/* Footer / Fade */}
            <div className="w-full h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </aside>
    );
}

const verticalTextStyle = `
.vertical-text {
    writing-mode: vertical-lr;
    text-orientation: mixed;
    transform: rotate(180deg);
}
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
`;

export default function KineticSidebar({ category, path, videos, historyVideos, onVideoClick, zoomLevel, isVisible, paused }) {
    const isMobile = useIsMobile();
    const isTablet = !isMobile && typeof window !== 'undefined' && window.innerWidth < 1024;
    
    /* Spec: rail items follow the meaning of the rail.
       Left  = Current chapter clips (the active node's videos)
       Right = History clips (already-walked-path videos) */
    const leftItems = useMemo(() => videos || [], [videos]);
    const rightItems = useMemo(() => historyVideos || [], [historyVideos]);

    if (!isVisible) return null;

    return (
        <>
            <style>{verticalTextStyle}</style>
            <div className="fixed inset-y-0 left-0 z-40 pointer-events-none flex items-stretch">
                <div className="pointer-events-auto flex items-stretch">
                    {leftItems.length > 0 && (
                        <Column 
                            side="left" 
                            paused={paused} 
                            items={leftItems} 
                            onVideoClick={onVideoClick} 
                            isMobile={isMobile} 
                        />
                    )}
                </div>
            </div>
            <div className="fixed inset-y-0 right-0 z-40 pointer-events-none flex items-stretch">
                <div className="pointer-events-auto flex items-stretch">
                    {rightItems.length > 0 && (
                        <Column 
                            side="right" 
                            paused={paused} 
                            items={rightItems} 
                            onVideoClick={onVideoClick} 
                            isMobile={isMobile} 
                        />
                    )}
                </div>
            </div>
        </>
    );
}
