import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import careersData from '../../data/careers.json';
import { useIsMobile } from '../../hooks/useIsMobile';

const TREE = careersData;

function deepClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function isCollapsedPersonaTree(tree) {
    const branches = Array.isArray(tree?.children) ? tree.children : [];
    if (branches.length < 3) return true;
    // Reject only if any persona branch has zero children (truly collapsed)
    return branches.some((b) => !b?.children?.length);
}

/* ─── Planet visual configs ─── */
const BASE_PLANETS = [
    { id: 'earth',   r: 10.5, c1: '#4FC3F7' },
    { id: 'mars',    r: 9,    c1: '#EF7C5A' },
    { id: 'jupiter', r: 13.5, c1: '#D4A968' },
    { id: 'saturn',  r: 11,   c1: '#E8D090' },
    { id: 'neptune', r: 10,   c1: '#6496DC' },
    { id: 'uranus',  r: 10.5, c1: '#7ADFE8' },
];

const DEFAULT_TREE_LAYOUT = {
    global: {
        preferNodePosition: true,
        autoDistributeFallback: true,
        layout: {
            marginXRatio: 0.06,
            minNodeSpacingX: 28,
            rootY: 22,
            zoomedRootY: 18,
            childrenYStart: 36,
            zoomedChildrenYStart: 32,
            childrenYEndDesktop: 88,
            childrenYEndMobile: 92,
            targetRows: 2,
            maxCols: 0,
        },
        node: { sizeScale: 1, shape: 'planet' },
        scaling: {
            mode: 'count-based',
            tiers: [
                { minCount: 8, scale: 0.55 },
                { minCount: 6, scale: 0.60 },
                { minCount: 4, scale: 0.68 },
                { minCount: 3, scale: 0.82 },
            ],
            fallbackScale: 0.88,
        },
        labels: {
            rootWidth: 160,
            minWidth: 64,
            mobileMinWidth: 88,
            maxWidth: 180,
            mobileSidebarGutter: 22,
            mobileGap: 2,
            desktopDenseWidth: 88,
            desktopMidWidth: 104,
            desktopSparseWidth: 136,
            desktopDenseRatio: 0.075,
            desktopMidRatio: 0.09,
            desktopSparseRatio: 0.125,
            nonRootOffsetY: 16,
            rootOffsetY: 42,
        },
        mobile: {
            densityPenalty: 0.05,
            densityFloor: 0.72,
            baselineWidth: 390,
            baselineHeight: 780,
            minNodeScale: 0.35,
            swipeThreshold: 35,
        },
        planets: {
            earth: { r: 10.5, c1: '#4FC3F7' },
            mars: { r: 9, c1: '#EF7C5A' },
            jupiter: { r: 13.5, c1: '#D4A968' },
            saturn: { r: 11, c1: '#E8D090' },
            neptune: { r: 10, c1: '#6496DC' },
            uranus: { r: 10.5, c1: '#7ADFE8' },
        },
        connector: {
            curve: 0.25,
            baseThickness: 1,
            midThickness: 0.333,
            thinThickness: 0.125,
            activeThickness: 0.667,
        },
        linkedSiblingShapes: true,
        linkedSiblingShapesByRoot: {},
        siblingTemplates: {},
        siblingTemplatesMobile: {},
        sunTemplateDesktop: { x: 50, y: 20 },
        sunTemplateMobile: { x: 50, y: 18 },
    },
    nodes: {},
};

const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

/* ═══════════════ COLLISION DETECTION & AVOIDANCE ═══════════════ */
/**
 * Detect if two label bounding boxes collide (with padding buffer)
 */
const labelBoundingBoxCollide = (a, b, padding = 8) => {
    const aLeft = a.x;
    const aRight = a.x + a.w;
    const aTop = a.y;
    const aBottom = a.y + a.h;
    
    const bLeft = b.x;
    const bRight = b.x + b.w;
    const bTop = b.y;
    const bBottom = b.y + b.h;
    
    return !(aRight + padding < bLeft || bRight + padding < aLeft || 
             aBottom + padding < bTop || bBottom + padding < aTop);
};

/**
 * Compute adaptive font size based on node density
 * More nodes → smaller typography; fewer nodes → larger typography
 */
const computeAdaptiveTypography = (nodeCount, isMobile, baseSizeSpecs) => {
    if (!baseSizeSpecs) return isMobile ? '13px' : '15px';
    
    // High density (8+ nodes): small
    if (nodeCount >= 8) {
        return isMobile 
            ? `${clampNum(12 * 0.95, 11, 15)}px`
            : 'clamp(13px, 1.05vw, 15px)';
    }
    // Medium density (5-7 nodes): medium-small
    if (nodeCount >= 5) {
        return isMobile 
            ? `${clampNum(13 * 1.0, 11, 16)}px`
            : 'clamp(14px, 1.15vw, 16px)';
    }
    // Low density (3-4 nodes): medium
    if (nodeCount >= 3) {
        return isMobile 
            ? `${clampNum(14 * 1.0, 12, 17)}px`
            : 'clamp(15px, 1.3vw, 17px)';
    }
    // Sparse (1-2 nodes): large
    return isMobile 
        ? `${clampNum(15 * 1.08, 12, 19)}px`
        : 'clamp(16px, 1.5vw, 19px)';
};

/**
 * Resolve label position with collision avoidance
 * Shifts label up/down if it collides with other labels
 */
const resolveCollisionAvoidance = (labels, maxHeight, preferUp = true) => {
    if (!labels || labels.length < 2) return labels;
    
    const sorted = [...labels].sort((a, b) => a.proposedTop - b.proposedTop);
    const resolved = [];
    const MIN_GAP = 6;
    
    sorted.forEach((label, idx) => {
        let finalTop = label.proposedTop;
        
        // Check collision with previously resolved labels
        let hasCollision = true;
        let attempts = 0;
        const maxAttempts = 8;
        
        while (hasCollision && attempts < maxAttempts) {
            hasCollision = false;
            
            for (const other of resolved) {
                if (labelBoundingBoxCollide(
                    { x: label.x, y: finalTop, w: label.w, h: label.h },
                    { x: other.x, y: other.y, w: other.w, h: other.h },
                    MIN_GAP
                )) {
                    hasCollision = true;
                    // Shift up or down
                    const shift = label.h + MIN_GAP;
                    if (preferUp && finalTop >= label.h + 12) {
                        finalTop -= shift;
                    } else if (finalTop + label.h * 2 < maxHeight - 20) {
                        finalTop += shift;
                    } else if (finalTop >= label.h + 12) {
                        finalTop -= shift;
                    }
                    break;
                }
            }
            
            attempts++;
        }
        
        resolved.push({ ...label, y: clampNum(finalTop, 24, maxHeight - label.h - 24) });
    });
    
    return resolved;
};

/* ═══════════════ SVG DEFS ═══════════════ */
function SvgDefs() {
    return (
        <defs>
            <filter id="glow-sun" x="-100%" y="-100%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="2.8" result="b" />
                <feFlood floodColor="#CDB88A" floodOpacity="0.50" />
                <feComposite in2="b" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-sun-hover" x="-120%" y="-120%" width="440%" height="440%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feFlood floodColor="#E9DCC2" floodOpacity="0.65" />
                <feComposite in2="b" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-planet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-planet-hover" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-thread" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Planet sphere gradients */}
            <radialGradient id="grad-sun" cx="40%" cy="35%" r="65%">
                <stop offset="0%"   stopColor="#FFF8E2" stopOpacity="1" />
                <stop offset="18%"  stopColor="#F4DFA8" stopOpacity="1" />
                <stop offset="42%"  stopColor="#D8BE7E" stopOpacity="1" />
                <stop offset="68%"  stopColor="#A88950" stopOpacity="0.95" />
                <stop offset="88%"  stopColor="#7E5F32" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#3A2812" stopOpacity="0.92" />
            </radialGradient>
            <radialGradient id="grad-earth" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#D8E8F2" />
                <stop offset="18%"  stopColor="#7AA0BC" />
                <stop offset="42%"  stopColor="#3C5C7A" />
                <stop offset="70%"  stopColor="#1A2E48" />
                <stop offset="100%" stopColor="#070D1C" />
            </radialGradient>
            <radialGradient id="grad-mars" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#F4D8B0" />
                <stop offset="20%"  stopColor="#C68850" />
                <stop offset="48%"  stopColor="#7E4A22" />
                <stop offset="75%"  stopColor="#4A2A12" />
                <stop offset="100%" stopColor="#180A04" />
            </radialGradient>
            <radialGradient id="grad-jupiter" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#FAEFD0" />
                <stop offset="18%"  stopColor="#E8CC8E" />
                <stop offset="42%"  stopColor="#B89058" />
                <stop offset="70%"  stopColor="#735E32" />
                <stop offset="100%" stopColor="#2C1F0B" />
            </radialGradient>
            <radialGradient id="grad-saturn" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#FFF4D6" />
                <stop offset="18%"  stopColor="#EFD89A" />
                <stop offset="42%"  stopColor="#C9A35A" />
                <stop offset="70%"  stopColor="#8E6A2C" />
                <stop offset="100%" stopColor="#34260F" />
            </radialGradient>
            <radialGradient id="grad-neptune" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#B9C2FF" />
                <stop offset="20%"  stopColor="#6F7AE6" />
                <stop offset="45%"  stopColor="#2B2F6B" />
                <stop offset="72%"  stopColor="#14163A" />
                <stop offset="100%" stopColor="#080A1E" />
            </radialGradient>
            <radialGradient id="grad-uranus" cx="36%" cy="30%" r="62%">
                <stop offset="0%"   stopColor="#EDE6D2" />
                <stop offset="20%"  stopColor="#BFB496" />
                <stop offset="45%"  stopColor="#7A7558" />
                <stop offset="72%"  stopColor="#403D2D" />
                <stop offset="100%" stopColor="#181712" />
            </radialGradient>
            <radialGradient id="shadow-sphere" cx="68%" cy="65%" r="58%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor="#000010" stopOpacity="0.75" />
                <stop offset="45%"  stopColor="#000008" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="threadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#D4B876" stopOpacity="0.95" />
                <stop offset="50%"  stopColor="#A89060" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#A8893E" stopOpacity="0.5" />
            </linearGradient>
            {/* Clip paths — sized to ~35-37% of each body radius */}
            <clipPath id="clip-sun">     <circle cx="0" cy="0" r="5.2" /></clipPath>
            <clipPath id="clip-earth">   <circle cx="0" cy="0" r="3.1" /></clipPath>
            <clipPath id="clip-mars">    <circle cx="0" cy="0" r="2.7" /></clipPath>
            <clipPath id="clip-jupiter"> <circle cx="0" cy="0" r="4.1" /></clipPath>
            <clipPath id="clip-saturn">  <circle cx="0" cy="0" r="3.3" /></clipPath>
            <clipPath id="clip-neptune"> <circle cx="0" cy="0" r="2.9" /></clipPath>
            <clipPath id="clip-uranus">  <circle cx="0" cy="0" r="3.1" /></clipPath>
        </defs>
    );
}

/* ═══════════════ THREAD PATH (orbit lines) ═══════════════ */
const ThreadPath = React.memo(function ThreadPath({ d, active, delay = 0, widths = null }) {
    const baseDelay = delay * 0.02;
    const sparkDelay = `${(delay * 0.55).toFixed(2)}s`;
    const sparkDur = active ? `6s` : `9s`;
    const w = {
        base: Math.max(0.05, Number(widths?.base ?? 1.2)),
        mid: Math.max(0.05, Number(widths?.mid ?? 0.4)),
        thin: Math.max(0.02, Number(widths?.thin ?? 0.15)),
        active: Math.max(0.05, Number(widths?.active ?? 0.8)),
    };
    return (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}>
            <motion.path d={d} stroke="rgba(168,144,96,0.10)" strokeWidth={w.base} fill="none" strokeLinecap="round"
                filter="url(#glow-thread)"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: baseDelay, ease: [0.22, 1, 0.36, 1] }} />
            <motion.path d={d} stroke="url(#threadGrad)" strokeWidth={w.mid} fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: baseDelay, ease: [0.22, 1, 0.36, 1] }} />
            <motion.path d={d} stroke="rgba(230,210,150,0.35)" strokeWidth={w.thin} fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: baseDelay, ease: 'easeOut' }} />
            {active && (
                <motion.path d={d} stroke="#D4B876" strokeWidth={w.active} fill="none" strokeLinecap="round"
                    filter="url(#glow-thread)"
                    animate={{ opacity: [0.05, 0.25, 0.05] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
            )}
            <g filter="url(#glow-thread)">
                <circle r="0.5" fill="rgba(255,255,220,0.35)">
                    <animateMotion path={d} dur={sparkDur} begin={sparkDelay} repeatCount="indefinite"
                        calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1" />
                    <animate attributeName="opacity" values="0;0.7;1;0.7;0"
                        keyTimes="0;0.15;0.5;0.85;1" dur={sparkDur} begin={sparkDelay} repeatCount="indefinite" />
                </circle>
                <circle r="0.22" fill="white">
                    <animateMotion path={d} dur={sparkDur} begin={sparkDelay} repeatCount="indefinite"
                        calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1" />
                    <animate attributeName="opacity" values="0;0.9;1;0.9;0"
                        keyTimes="0;0.15;0.5;0.85;1" dur={sparkDur} begin={sparkDelay} repeatCount="indefinite" />
                </circle>
            </g>
        </motion.g>
    );
});

/* Updated SunNode visuals */
const SunNode = React.memo(function SunNode({
    cx,
    cy,
    onClick,
    disableAnim,
    emoji = '',
    enablePressDrag = false,
    isDragging = false,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    isMatched = false,
    matchedNodeIdsCount = 0,
    isMirrorPath = false,
    nodeDimmed = false,
}) {
    const R = 14; // Dominant size for the central star
    const [hovered, setHovered] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    return (
        <motion.g
            animate={{ x: cx, y: cy }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
                cursor: enablePressDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                pointerEvents: 'auto',
                touchAction: enablePressDrag ? 'none' : 'manipulation',
                transformBox: 'fill-box',
                transformOrigin: 'center',
                filter: isMirrorPath
                    ? 'drop-shadow(0 0 18px rgba(120, 220, 200, 0.9)) drop-shadow(0 0 28px rgba(168, 144, 96, 0.75))'
                    : (isMatched ? 'drop-shadow(0 0 15px rgba(255, 140, 66, 0.8))' : undefined),
                opacity: nodeDimmed
                    ? 0.22
                    : (matchedNodeIdsCount > 0 && !isMatched ? 0.45 : 1),
                transition: 'all 0.3s ease'
            }}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label="Root node"
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            onMouseEnter={() => {
                if (!disableAnim) setHovered(true);
            }}
            onMouseLeave={() => {
                if (!disableAnim) setHovered(false);
            }}
            onPointerEnter={() => {
                if (!disableAnim) setHovered(true);
            }}
            onPointerLeave={() => {
                if (!disableAnim) setHovered(false);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {/* Hit area */}
            <circle cx="0" cy="0" r={R + 10} fill="transparent" stroke="none" style={{ pointerEvents: 'auto' }} />

            {focused && (
                <circle cx="0" cy="0" r={R + 4.8} fill="none" stroke="#A89060" strokeWidth="0.95" opacity="0.95" />
            )}
            
            {/* Subtle background glow */}
            <circle cx="0" cy="0" r={R + 3.5} fill="none" stroke="#CDB88A" strokeWidth="0.30" opacity="0.40" />
            
            {/* Enhanced sun body with professional gradient */}
            <circle cx="0" cy="0" r={R} fill="url(#grad-sun)" filter={hovered ? 'url(#glow-sun-hover)' : 'url(#glow-sun)'} />
            
            {/* Subtle inner brightspot for depth */}
            <circle cx="-2.5" cy="-2.8" r={R * 0.35} fill="#FFF4E6" opacity="0.3" />
            
            {/* Refined corona rays (subtle instead of bold) */}
            {Array.from({ length: 16 }, (_, t) => {
                const angle = (t / 16) * 2 * Math.PI;
                const r1 = R + 0.8;
                const r2 = R + 4.2;
                return (
                    <line
                        key={t}
                        x1={Math.cos(angle) * r1}
                        y1={Math.sin(angle) * r1}
                        x2={Math.cos(angle) * r2}
                        y2={Math.sin(angle) * r2}
                        stroke="#E9DCC2"
                        strokeWidth="0.3"
                        opacity="0.42"
                        strokeLinecap="round"
                    />
                );
            })}
            
            {/* Animated outer corona halo */}
            <circle
                r={R + 4.5}
                fill="none"
                stroke="#CDB88A"
                strokeWidth="0.2"
                opacity="0.30"
            >
                <animate
                    attributeName="r"
                    values={`${R + 4.5};${R + 7.5};${R + 4.5}`}
                    dur="4s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="opacity"
                    values="0.2;0.05;0.2"
                    dur="4s"
                    repeatCount="indefinite"
                />
            </circle>
        </motion.g>
    );
});

/* Updated glow filter for the sun */
const SunGlowFilter = (
    <filter id="glow-sun" x="-100%" y="-100%" width="400%" height="400%">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feFlood floodColor="#C4B080" floodOpacity="0.6" />
        <feComposite in2="b" operator="in" result="glow" />
        <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
        </feMerge>
    </filter>
);

/* ═══════════════ PLANET BODY COMPONENTS ═══════════════ */
const EarthBody = React.memo(function EarthBody({ R, disableAnim }) {
    return (
        <>
            <g clipPath="url(#clip-earth)">
                <circle r={R} fill="url(#grad-earth)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="30s" repeatCount="indefinite" />
                    <path d={`M ${R*.12},${-R*.08} C ${R*.38},${-R*.22} ${R*.42},${-R*.18} ${R*.4},${R*.06} C ${R*.45},${R*.35} ${R*.38},${R*.58} ${R*.32},${R*.65} C ${R*.1},${R*.72} ${-R*.05},${R*.58} ${-R*.08},${R*.38} C ${-R*.15},${R*.12} ${-R*.04},${R*.04} ${R*.12},${-R*.08}Z`} fill="#7A8264" fillOpacity="0.68" />
                    <path d={`M ${-R*.52},${-R*.06} C ${-R*.38},${-R*.18} ${-R*.28},${R*.02} ${-R*.3},${R*.28} C ${-R*.32},${R*.55} ${-R*.48},${R*.66} ${-R*.62},${R*.52} C ${-R*.72},${R*.36} ${-R*.68},${R*.1} ${-R*.6},${-R*.04} C ${-R*.56},${-R*.08} ${-R*.54},${-R*.06} ${-R*.52},${-R*.06}Z`} fill="#5E7048" fillOpacity="0.68" />
                    <path d={`M ${-R*.68},${-R*.62} C ${-R*.5},${-R*.78} ${-R*.18},${-R*.7} ${-R*.15},${-R*.48} C ${-R*.12},${-R*.25} ${-R*.35},${-R*.1} ${-R*.52},${-R*.18} C ${-R*.68},${-R*.28} ${-R*.76},${-R*.45} ${-R*.68},${-R*.62}Z`} fill="#6E7A52" fillOpacity="0.62" />
                    <ellipse cx={R*.05} cy={-R*.4} rx={R*.18} ry={R*.12} fill="#788A60" fillOpacity="0.58" />
                    <path d={`M ${R*.22},${-R*.56} C ${R*.52},${-R*.68} ${R*.82},${-R*.52} ${R*.85},${-R*.22} C ${R*.88},${R*.08} ${R*.62},${R*.2} ${R*.3},${R*.12} C ${R*.1},${R*.06} ${R*.08},${-R*.18} ${R*.22},${-R*.56}Z`} fill="#6E8056" fillOpacity="0.58" />
                    <ellipse cx={R*.62} cy={R*.48} rx={R*.22} ry={R*.14} fill="#8A7E50" fillOpacity="0.62" />
                    <g opacity="0.60">
                        <ellipse cx={-R*.2} cy={-R*.3} rx={R*.52} ry={R*.09} fill="#FFFFFF" />
                        <ellipse cx={R*.28} cy={R*.22} rx={R*.48} ry={R*.07} fill="#FFFFFF" />
                        <ellipse cx={-R*.42} cy={R*.55} rx={R*.38} ry={R*.06} fill="#FFFFFF" />
                        <ellipse cx={R*.1} cy={-R*.62} rx={R*.44} ry={R*.07} fill="rgba(255,255,255,0.82)" />
                    </g>
                </g>
                <ellipse cx={0} cy={-R*.8} rx={R*.5} ry={R*.22} fill="rgba(228,244,255,0.92)" />
                <ellipse cx={0} cy={-R*.82} rx={R*.32} ry={R*.12} fill="rgba(248,252,255,0.96)" />
                <ellipse cx={0} cy={R*.8} rx={R*.42} ry={R*.18} fill="rgba(228,248,255,0.88)" />
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.36} cy={-R*.38} rx={R*.28} ry={R*.18} fill="rgba(255,255,255,0.24)" transform={`rotate(-32,${-R*.36},${-R*.38})`} />
            </g>
        </>
    );
});

const MarsBody = React.memo(function MarsBody({ R, disableAnim }) {
    return (
        <>
            <g clipPath="url(#clip-mars)">
                <circle r={R} fill="url(#grad-mars)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="31s" repeatCount="indefinite" />
                    <ellipse cx={-R*.38} cy={-R*.22} rx={R*.5} ry={R*.38} fill="rgba(190,140,80,0.28)" />
                    <ellipse cx={R*.4} cy={-R*.12} rx={R*.38} ry={R*.28} fill="rgba(200,150,90,0.24)" />
                    <path d={`M ${-R*.78},${R*.08} C ${-R*.3},${R*.02} ${R*.12},${R*.18} ${R*.72},${R*.12}`} fill="none" stroke="rgba(60,38,18,0.55)" strokeWidth={R*.16} strokeLinecap="round" />
                    <path d={`M ${-R*.78},${R*.08} C ${-R*.3},${R*.02} ${R*.12},${R*.18} ${R*.72},${R*.12}`} fill="none" stroke="rgba(40,22,10,0.50)" strokeWidth={R*.07} strokeLinecap="round" />
                    <ellipse cx={R*.52} cy={R*.48} rx={R*.32} ry={R*.22} fill="rgba(46,28,14,0.40)" />
                    <ellipse cx={0} cy={R*.1} rx={R*.9} ry={R*.25} fill="rgba(220,170,110,0.12)" />
                </g>
                <ellipse cx={0} cy={-R*.78} rx={R*.46} ry={R*.2} fill="rgba(228,238,248,0.88)" />
                <ellipse cx={0} cy={-R*.82} rx={R*.28} ry={R*.1} fill="rgba(245,250,255,0.95)" />
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.34} cy={-R*.36} rx={R*.24} ry={R*.15} fill="rgba(245,212,168,0.24)" transform={`rotate(-28,${-R*.34},${-R*.36})`} />
            </g>
        </>
    );
});

const JupiterBody = React.memo(function JupiterBody({ R, disableAnim }) {
    const bands = [
        { y: -R, h: R*0.18, fill: '#D4C8A8', op: 0.42 }, { y: -R*0.82, h: R*0.22, fill: '#A88950', op: 0.58 },
        { y: -R*0.6, h: R*0.12, fill: '#E2D2A6', op: 0.36 }, { y: -R*0.48, h: R*0.26, fill: '#7A5A28', op: 0.66 },
        { y: -R*0.22, h: R*0.32, fill: '#F4E8C8', op: 0.42 }, { y: R*0.1, h: R*0.32, fill: '#785220', op: 0.70 },
        { y: R*0.42, h: R*0.18, fill: '#CDB088', op: 0.40 }, { y: R*0.6, h: R*0.22, fill: '#8F7038', op: 0.52 },
        { y: R*0.82, h: R*0.18, fill: '#BFA882', op: 0.40 },
    ];
    return (
        <>
            <g clipPath="url(#clip-jupiter)">
                <circle r={R} fill="url(#grad-jupiter)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="12s" repeatCount="indefinite" />
                    {bands.map((b, i) => <rect key={i} x={-R-0.1} y={b.y} width={(R+0.1)*2} height={b.h} fill={b.fill} fillOpacity={b.op} />)}
                    <ellipse cx={R*.38} cy={R*.24} rx={R*.28} ry={R*.16} fill="#A8782E" fillOpacity="0.78" />
                    <ellipse cx={R*.38} cy={R*.24} rx={R*.22} ry={R*.1} fill="#8A5A1E" fillOpacity="0.55" />
                    <ellipse cx={R*.38} cy={R*.24} rx={R*.32} ry={R*.19} fill="none" stroke="rgba(180,140,72,0.48)" strokeWidth={R*.04} />
                    <ellipse cx={-R*.28} cy={R*.5} rx={R*.12} ry={R*.07} fill="rgba(240,235,200,0.70)" />
                    <ellipse cx={-R*.6} cy={-R*.32} rx={R*.16} ry={R*.06} fill="rgba(120,90,40,0.40)" />
                    <ellipse cx={R*.2} cy={-R*.38} rx={R*.14} ry={R*.05} fill="rgba(108,82,38,0.36)" />
                </g>
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.36} cy={-R*.38} rx={R*.22} ry={R*.14} fill="rgba(255,248,220,0.20)" transform={`rotate(-28,${-R*.36},${-R*.38})`} />
            </g>
        </>
    );
});

const SaturnBody = React.memo(function SaturnBody({ R, disableAnim }) {
    return (
        <>
            <g clipPath="url(#clip-saturn)">
                <circle r={R} fill="url(#grad-saturn)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="13s" repeatCount="indefinite" />
                    <rect x={-R-0.1} y={-R} width={(R+0.1)*2} height={R*0.2} fill="#9A7E42" fillOpacity="0.30" />
                    <rect x={-R-0.1} y={-R*0.8} width={(R+0.1)*2} height={R*0.18} fill="#B69042" fillOpacity="0.25" />
                    <rect x={-R-0.1} y={-R*0.3} width={(R+0.1)*2} height={R*0.2} fill="#A08236" fillOpacity="0.22" />
                    <rect x={-R-0.1} y={R*0.2} width={(R+0.1)*2} height={R*0.18} fill="#967632" fillOpacity="0.22" />
                    <rect x={-R-0.1} y={R*0.65} width={(R+0.1)*2} height={R*0.35} fill="#856E2A" fillOpacity="0.28" />
                </g>
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.34} cy={-R*.36} rx={R*.26} ry={R*.16} fill="rgba(255,252,220,0.24)" transform={`rotate(-30,${-R*.34},${-R*.36})`} />
            </g>
        </>
    );
});

const NeptuneBody = React.memo(function NeptuneBody({ R, disableAnim }) {
    return (
        <>
            <g clipPath="url(#clip-neptune)">
                <circle r={R} fill="url(#grad-neptune)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="20s" repeatCount="indefinite" />
                    <rect x={-R-0.1} y={-R*.55} width={(R+0.1)*2} height={R*0.2} fill="rgba(20,22,58,0.40)" />
                    <rect x={-R-0.1} y={R*.15} width={(R+0.1)*2} height={R*0.18} fill="rgba(22,24,62,0.36)" />
                    <ellipse cx={R*.2} cy={R*.22} rx={R*.38} ry={R*.22} fill="rgba(10,12,42,0.72)" />
                    <ellipse cx={R*.2} cy={R*.22} rx={R*.28} ry={R*.15} fill="rgba(8,10,32,0.55)" />
                    <ellipse cx={-R*.18} cy={R*.1} rx={R*.18} ry={R*.1} fill="rgba(178,194,255,0.78)" />
                    <ellipse cx={-R*.18} cy={R*.1} rx={R*.1} ry={R*.06} fill="rgba(210,220,255,0.86)" />
                    <ellipse cx={R*.02} cy={-R*.18} rx={R*.42} ry={R*.07} fill="rgba(155,168,230,0.44)" />
                </g>
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.36} cy={-R*.36} rx={R*.24} ry={R*.15} fill="rgba(160,170,220,0.22)" transform={`rotate(-30,${-R*.36},${-R*.36})`} />
            </g>
        </>
    );
});

const UranusBody = React.memo(function UranusBody({ R, disableAnim }) {
    return (
        <>
            <g clipPath="url(#clip-uranus)">
                <circle r={R} fill="url(#grad-uranus)" />
                <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="-360 0 0" dur="22s" repeatCount="indefinite" />
                    <rect x={-R-0.1} y={-R*.18} width={(R+0.1)*2} height={R*0.36} fill="rgba(180,160,110,0.16)" />
                    <ellipse cx={0} cy={-R*.72} rx={R*.58} ry={R*.28} fill="rgba(220,210,180,0.30)" />
                    <ellipse cx={0} cy={-R*.82} rx={R*.38} ry={R*.14} fill="rgba(238,230,200,0.38)" />
                </g>
                <circle r={R} fill="url(#shadow-sphere)" />
                <ellipse cx={-R*.36} cy={-R*.36} rx={R*.26} ry={R*.17} fill="rgba(232,222,194,0.25)" transform={`rotate(-30,${-R*.36},${-R*.36})`} />
            </g>
        </>
    );
});

/* Saturn and Uranus ring system */
const SATURN_RINGS = [
    { sc: 1.2,  color: 'rgba(120,98,52,0.24)',   w: 0.35 },
    { sc: 1.42, color: 'rgba(240,212,140,0.26)', w: 0.95 },
    { sc: 1.6,  color: 'rgba(252,232,170,0.22)', w: 0.85 },
    { sc: 1.78, color: 'rgba(8,6,2,0.20)',       w: 0.28 },
    { sc: 1.91, color: 'rgba(212,180,108,0.22)', w: 0.85 },
    { sc: 2.1,  color: 'rgba(184,150,80,0.18)',  w: 0.55 },
    { sc: 2.28, color: 'rgba(180,150,80,0.14)',  w: 0.18 },
];
const SATURN_RY = 0.42;

const URANUS_RINGS = [
    { sc: 1.32, color: 'rgba(85,205,218,0.16)',  w: 0.16 },
    { sc: 1.48, color: 'rgba(100,218,228,0.18)', w: 0.16 },
    { sc: 1.62, color: 'rgba(92,212,222,0.16)',  w: 0.14 },
    { sc: 1.76, color: 'rgba(88,208,218,0.14)',  w: 0.14 },
    { sc: 1.94, color: 'rgba(118,228,238,0.20)', w: 0.18 },
];
const URANUS_RY = 0.8;

function PlanetRings({ R, rings, ry_ratio, front }) {
    return (
        <g>
            {rings.map((ring, i) => {
                const a = R * ring.sc;
                const o = a * ry_ratio;
                return front
                    ? <path key={i} d={`M ${-a},0 A ${a},${o},0,0,1,${a},0`} fill="none" stroke={ring.color} strokeWidth={ring.w} />
                    : <ellipse key={i} cx="0" cy="0" rx={a} ry={o} fill="none" stroke={ring.color} strokeWidth={ring.w} />;
            })}
        </g>
    );
}

/* ═══════════════ PLANET NODE ═══════════════ */
const PlanetNode = React.memo(function PlanetNode({
    cx,
    cy,
    planets,
    planetIdx,
    onClick,
    hasChildren,
    disableAnim,
    scale = 1,
    shape = 'planet',
    emoji = '',
    enablePressDrag = false,
    isDragging = false,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    isMatched = false,
    matchedNodeIdsCount = 0,
    isMirrorPath = false,
    nodeDimmed = false,
}) {
    const usablePlanets = Array.isArray(planets) && planets.length ? planets : BASE_PLANETS;
    const planet = usablePlanets[planetIdx % usablePlanets.length];
    const r = planet.r * scale;
    const hitR = Math.max(r + 8, 22); // Ensure minimum 44px tappable area on mobile
    const [hovered, setHovered] = React.useState(false);
    const [ripple, setRipple] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const normalizedShape = typeof shape === 'string' ? shape.toLowerCase() : 'planet';

    return (
        <motion.g
            animate={{ x: cx, y: cy }}
            whileHover={{ scale: 1.12 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ 
                cursor: enablePressDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer', 
                pointerEvents: 'auto', 
                touchAction: enablePressDrag ? 'none' : 'manipulation',
                transformBox: 'fill-box',
                transformOrigin: 'center',
                filter: isMirrorPath
                    ? 'drop-shadow(0 0 14px rgba(110, 230, 210, 0.9)) drop-shadow(0 0 24px rgba(168, 144, 96, 0.65))'
                    : (isMatched ? 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.7))' : undefined),
                opacity: nodeDimmed
                    ? 0.22
                    : (matchedNodeIdsCount > 0 && !isMatched ? 0.45 : 1),
                transition: 'all 0.3s ease'
            }}
            role="button" tabIndex={0} aria-label={emoji || 'Career node'}
            onClick={(e) => { setRipple(true); setTimeout(() => setRipple(false), 500); onClick?.(e); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRipple(true); setTimeout(() => setRipple(false), 500); onClick?.(e); } }}
            onMouseEnter={() => { if (!disableAnim) setHovered(true); }}
            onMouseLeave={() => { if (!disableAnim) setHovered(false); }}
            onPointerEnter={() => { if (!disableAnim) setHovered(true); }}
            onPointerLeave={() => { if (!disableAnim) setHovered(false); }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        >
            {/* Hit area — minimum size for touch accessibility */}
            <circle cx="0" cy="0" r={hitR} fill="transparent" stroke="none" style={{ pointerEvents: 'auto' }} />

            {focused && (
                <circle cx="0" cy="0" r={r + 4.1} fill="none" stroke="#A89060" strokeWidth="0.85" opacity="0.95" />
            )}

            {normalizedShape === 'diamond' && (
                <rect
                    x={-r * 1.04}
                    y={-r * 1.04}
                    width={r * 2.08}
                    height={r * 2.08}
                    rx={1.4}
                    fill="none"
                    stroke={`${planet.c1}66`}
                    strokeWidth="0.28"
                    transform="rotate(45)"
                />
            )}
            {normalizedShape === 'square' && (
                <rect
                    x={-r * 1.05}
                    y={-r * 1.05}
                    width={r * 2.1}
                    height={r * 2.1}
                    rx={2.2}
                    fill="none"
                    stroke={`${planet.c1}66`}
                    strokeWidth="0.28"
                />
            )}
            {/* Back rings */}
            {planet.id === 'saturn' && <PlanetRings R={r} rings={SATURN_RINGS} ry_ratio={SATURN_RY} front={false} />}
            {planet.id === 'uranus' && <PlanetRings R={r} rings={URANUS_RINGS} ry_ratio={URANUS_RY} front={false} />}

            {/* Planet body */}
            <g filter={hovered ? 'url(#glow-planet-hover)' : 'url(#glow-planet)'}>
                {planet.id === 'earth'   && <EarthBody   R={r} disableAnim={disableAnim} />}
                {planet.id === 'mars'    && <MarsBody    R={r} disableAnim={disableAnim} />}
                {planet.id === 'jupiter' && <JupiterBody R={r} disableAnim={disableAnim} />}
                {planet.id === 'saturn'  && <SaturnBody  R={r} disableAnim={disableAnim} />}
                {planet.id === 'neptune' && <NeptuneBody R={r} disableAnim={disableAnim} />}
                {planet.id === 'uranus'  && <UranusBody  R={r} disableAnim={disableAnim} />}
            </g>

            {/* Front rings */}
            {planet.id === 'saturn' && <PlanetRings R={r} rings={SATURN_RINGS} ry_ratio={SATURN_RY} front={true} />}
            {planet.id === 'uranus' && <PlanetRings R={r} rings={URANUS_RINGS} ry_ratio={URANUS_RY} front={true} />}

            {/* Click ripple */}
            {ripple && (
                <circle cx="0" cy="0" r={r} fill="none" stroke="white" strokeWidth="0.6" opacity="0">
                    <animate attributeName="r" from={r} to={r + 7} dur="0.5s" fill="freeze" />
                    <animate attributeName="opacity" values="0.55;0" dur="0.5s" fill="freeze" />
                </circle>
            )}



            {/* Has-children indicator dots */}
            {hasChildren && (
                <g>
                    {/* Glow halo behind each dot */}
                    {[-2.6, 0, 2.6].map((x, i) => (
                        <circle key={`glow-${i}`} cx={x} cy={-(r + 2)} r="2.2" fill="#4ade80" opacity="0">
                            <animate attributeName="opacity" values="0.18;0.05;0.18" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                        </circle>
                    ))}
                    {/* Main dots */}
                    {[-2.6, 0, 2.6].map((x, i) => (
                        <circle key={i} cx={x} cy={-(r + 2)} r="1.1" fill="#4ade80">
                            <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                            <animate attributeName="r" values="1.1;0.85;1.1" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                        </circle>
                    ))}
                </g>
            )}
        </motion.g>
    );
});

/* ═══════════════ MAIN COMPONENT ═══════════════ */
const InteractiveTimeline = ({
    onNodeSelect, onPathChange, onRecenterStart, onRecenterComplete,
    onNodeVideoRequest,
    onActiveNodePosition, onBack,
    searchQuery = '', activeFilters = {}, searchMatches = [],
    initialZoomStack = [], initialActivePath = [],
    isAdmin = false,
    forceMobile,
    framed = false,
    adminDragEnabled = false,
    onAdminNodeLayoutUpdate,
    onAdminNodeLayoutCommit,
    onAdminLayoutConfigUpdate,
    focusMode = false,
    mirrorPathNodeIds = [],
}) => {
    const detectedMobile = useIsMobile();
    const isMobile = typeof forceMobile === 'boolean' ? forceMobile : detectedMobile;
    const shouldReduceMotion = useReducedMotion();
    const [zoomStack, setZoomStack] = useState(initialZoomStack);
    const [activePath, setActivePath] = useState(initialActivePath);
    const [expanded, setExpanded] = useState(true);
    const containerRef = useRef(null);
    const [cSize, setCSize] = useState({ w: 0, h: 0 });
    const [transitioning, setTransitioning] = useState(false);
    const [pendingRoot, setPendingRoot] = useState(null);
    const [leafToast, setLeafToast] = useState(null);
    const [leafNode, setLeafNode] = useState(null);
    const [demandNode, setDemandNode] = useState(null);
    const [demandSubmitting, setDemandSubmitting] = useState(false);
    const [demandSubmitted, setDemandSubmitted] = useState(false);
    const [demandError, setDemandError] = useState('');
    const [videoCounts, setVideoCounts] = useState({});
    const [treeData, setTreeData] = useState(null);
    const [layoutConfig, setLayoutConfig] = useState(DEFAULT_TREE_LAYOUT);
    const [fetchError, setFetchError] = useState(null);
    // ── World-class UX additions ──
    const [hoveredId, setHoveredId] = useState(null);
    const [kbFocusId, setKbFocusId] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [zoomOriginPct, setZoomOriginPct] = useState({ x: 50, y: 50 });
    const [labelCutouts, setLabelCutouts] = useState([]);
    const [enableHighlightMode, setEnableHighlightMode] = useState(false); // Show path highlight (disabled by default)
    // Ink-reveal entrance: runs once on first mount — gold scan line sweeps down, scrim fades out.
    const [inkRevealActive, setInkRevealActive] = useState(!shouldReduceMotion);
    useEffect(() => {
        if (shouldReduceMotion) { setInkRevealActive(false); return; }
        const t = setTimeout(() => setInkRevealActive(false), 1100);
        return () => clearTimeout(t);
    }, [shouldReduceMotion]);
    const canvasSvgRef = useRef(null);
    const threadMaskIdRef = useRef(`thread-label-mask-${Math.random().toString(36).slice(2, 10)}`);
    const longPressTimerRef = useRef(null);
    const dragStateRef = useRef(null);
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const suppressNextClickRef = useRef(false);
    const labelBoundsRef = useRef([]); // Track label positions for collision detection
    const TREE = treeData || { id: 'start', label: 'Start', children: [] };
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    const LAYOUT_SYNC_KEY = 'cr_layout_updated_at';

    const toYoutubeId = useCallback((value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (!raw.includes('http')) return raw;
        try {
            const u = new URL(raw);
            if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '').trim();
            if (u.hostname.includes('youtube.com')) {
                return (u.searchParams.get('v') || '').trim();
            }
        } catch {
            return '';
        }
        return '';
    }, []);

    const buildNodeVideoPayload = useCallback((node) => {
        if (!node) return null;
        const youtubeId = toYoutubeId(node.youtubeId || node.videoUrl || node.videoId);
        const directSrc = youtubeId ? '' : String(node.videoUrl || node.src || '').trim();
        if (!youtubeId && !directSrc) return null;
        return {
            id: `node_${String(node.id || 'direct')}`,
            title: String(node.videoTitle || node.label || 'Career interview').trim(),
            youtubeId,
            src: directSrc || undefined,
            start: Number(node.startSec || node.start || 0) || 0,
            end: Number(node.endSec || node.end || 0) || 0,
        };
    }, [toYoutubeId]);

    // Search highlight state
    const [matchedNodeIds, setMatchedNodeIds] = useState(new Set());
    const mirrorPathSet = useMemo(
        () => new Set(Array.isArray(mirrorPathNodeIds) ? mirrorPathNodeIds.filter(Boolean) : []),
        [mirrorPathNodeIds]
    );
    const focusMirrorActive = Boolean(focusMode) && mirrorPathSet.size > 0;
    const activePathIdSet = useMemo(() => new Set(activePath), [activePath]);

    // Sync chats to backend helper
    const syncChatToBackend = useCallback(async (message, role) => {
        try {
            await fetch(`${API}/api/sync-chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, role })
            });
        } catch (err) {
            console.error('Chat sync failed:', err);
        }
    }, [API]);

    // Handle Search Matching
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setMatchedNodeIds(new Set());
            return;
        }

        const fetchMatches = async () => {
            try {
                const res = await fetch(`${API}/api/videos/search?q=${encodeURIComponent(searchQuery)}`);
                const results = await res.json();
                const nodeIds = new Set(results.map(r => r.segment.nodeId));
                setMatchedNodeIds(nodeIds);
            } catch (err) {
                console.error('Search match fetch failed:', err);
            }
        };

        const timer = setTimeout(fetchMatches, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, API]);

    const treeLayout = layoutConfig && typeof layoutConfig === 'object' ? layoutConfig : DEFAULT_TREE_LAYOUT;
    const treeLayoutGlobal = treeLayout.global && typeof treeLayout.global === 'object' ? treeLayout.global : DEFAULT_TREE_LAYOUT.global;
    const treeNodeLayout = treeLayout.nodes && typeof treeLayout.nodes === 'object' ? treeLayout.nodes : {};
    const layoutDefaults = treeLayoutGlobal.layout && typeof treeLayoutGlobal.layout === 'object'
        ? treeLayoutGlobal.layout
        : DEFAULT_TREE_LAYOUT.global.layout;
    const connectorDefaults = treeLayoutGlobal.connector && typeof treeLayoutGlobal.connector === 'object'
        ? treeLayoutGlobal.connector
        : DEFAULT_TREE_LAYOUT.global.connector;
    const nodeDefaults = treeLayoutGlobal.node && typeof treeLayoutGlobal.node === 'object'
        ? treeLayoutGlobal.node
        : DEFAULT_TREE_LAYOUT.global.node;
    const scalingDefaults = treeLayoutGlobal.scaling && typeof treeLayoutGlobal.scaling === 'object'
        ? treeLayoutGlobal.scaling
        : DEFAULT_TREE_LAYOUT.global.scaling;
    const labelDefaults = treeLayoutGlobal.labels && typeof treeLayoutGlobal.labels === 'object'
        ? treeLayoutGlobal.labels
        : DEFAULT_TREE_LAYOUT.global.labels;
    const planetDefaults = treeLayoutGlobal.planets && typeof treeLayoutGlobal.planets === 'object'
        ? treeLayoutGlobal.planets
        : DEFAULT_TREE_LAYOUT.global.planets;
    const mobileConfig = treeLayoutGlobal.mobile && typeof treeLayoutGlobal.mobile === 'object'
        ? treeLayoutGlobal.mobile
        : DEFAULT_TREE_LAYOUT.global.mobile;
    const preferNodePosition = treeLayoutGlobal.preferNodePosition !== false;
    const autoDistributeFallback = treeLayoutGlobal.autoDistributeFallback !== false;
    const linkedSiblingShapes = treeLayoutGlobal.linkedSiblingShapes !== false;
    const linkedSiblingShapesByRoot = treeLayoutGlobal.linkedSiblingShapesByRoot && typeof treeLayoutGlobal.linkedSiblingShapesByRoot === 'object'
        ? treeLayoutGlobal.linkedSiblingShapesByRoot
        : {};
    const siblingTemplates = treeLayoutGlobal.siblingTemplates && typeof treeLayoutGlobal.siblingTemplates === 'object'
        ? treeLayoutGlobal.siblingTemplates
        : {};
    const siblingTemplatesMobile = treeLayoutGlobal.siblingTemplatesMobile && typeof treeLayoutGlobal.siblingTemplatesMobile === 'object'
        ? treeLayoutGlobal.siblingTemplatesMobile
        : {};
    const sunTemplateDesktop = treeLayoutGlobal.sunTemplateDesktop && typeof treeLayoutGlobal.sunTemplateDesktop === 'object'
        ? treeLayoutGlobal.sunTemplateDesktop
        : null;
    const sunTemplateMobile = treeLayoutGlobal.sunTemplateMobile && typeof treeLayoutGlobal.sunTemplateMobile === 'object'
        ? treeLayoutGlobal.sunTemplateMobile
        : null;

    const connectorBase = clampNum(Number(connectorDefaults.baseThickness || 1), 0.2, 4);
    const connectorMid = clampNum(Number(connectorDefaults.midThickness || 0.333), 0.05, 3);
    const connectorThin = clampNum(Number(connectorDefaults.thinThickness || 0.125), 0.02, 2);
    const connectorActive = clampNum(Number(connectorDefaults.activeThickness || 0.667), 0.1, 4);
    const connectorCurveDefault = clampNum(Number(connectorDefaults.curve || 0.25), 0.05, 0.85);

    const edgeSpread = layoutDefaults?.edgeSpread ?? 'balanced';
    const edgePadFactor = edgeSpread === 'safe' ? 1.0 : edgeSpread === 'full' ? 0.15 : 0.4;
    const slotPad = edgeSpread === 'safe' ? 0.12 : edgeSpread === 'full' ? 0.01 : 0.04;
    
    // Dynamic margin based on screen width/height ratio
    const spreadMarginXRatio = useMemo(() => {
        if (!isMobile) return (edgeSpread === 'safe' ? 0.08 : edgeSpread === 'full' ? 0.01 : 0.035);
        
        // On mobile, use aspect ratio to determine if we need more side margin
        if (cSize.w > 0 && cSize.h > 0) {
            const aspect = cSize.w / cSize.h;
            if (aspect < 0.5) return 0.06; // Very narrow (iPhone SE)
            if (aspect < 0.7) return 0.08; // Normal mobile
            return 0.1; // Wider mobile/tablet
        }
        return 0.08;
    }, [isMobile, edgeSpread, cSize.w, cSize.h]);

    const marginXRatio = spreadMarginXRatio;
    const effectiveMarginXRatio = marginXRatio;
    const fallbackLayout = DEFAULT_TREE_LAYOUT.global.layout || {};
    const minNodeSpacingX = clampNum(
        Number(layoutDefaults.minNodeSpacingX ?? (isMobile ? 10 : 22)),
        6,
        48
    );
    const rootY = clampNum(Number(layoutDefaults.rootY ?? fallbackLayout.rootY ?? 28), 0, 100);
    const zoomedRootY = clampNum(Number(layoutDefaults.zoomedRootY ?? fallbackLayout.zoomedRootY ?? 18), 0, 100);
    const childrenYStart = clampNum(Number(layoutDefaults.childrenYStart ?? fallbackLayout.childrenYStart ?? 32), 0, 100);
    const zoomedChildrenYStart = clampNum(Number(layoutDefaults.zoomedChildrenYStart ?? fallbackLayout.zoomedChildrenYStart ?? 22), 0, 100);
    const childrenYEndDesktop = clampNum(Number(layoutDefaults.childrenYEndDesktop ?? fallbackLayout.childrenYEndDesktop ?? 72), 0, 100);
    const childrenYEndMobile = clampNum(Number(layoutDefaults.childrenYEndMobile ?? fallbackLayout.childrenYEndMobile ?? 84), 0, 100);
    const targetRows = Math.max(1, Math.round(Number(layoutDefaults.targetRows || 2)));
    const hardMaxCols = Math.max(0, Math.round(Number(layoutDefaults.maxCols || 0)));
    const activeSunTemplate = isMobile ? sunTemplateMobile : sunTemplateDesktop;
    const sunTemplateXPct = isFiniteNum(activeSunTemplate?.x) ? clampNum(Number(activeSunTemplate.x), 5, 95) : null;
    const sunTemplateYPct = isFiniteNum(activeSunTemplate?.y) ? clampNum(Number(activeSunTemplate.y), 5, 95) : null;

    const resolveVisualScaleByCount = useCallback((count) => {
        const tiers = Array.isArray(scalingDefaults.tiers) ? scalingDefaults.tiers : [];
        const sorted = tiers
            .map((t) => ({
                minCount: Math.max(0, Math.round(Number(t?.minCount || 0))),
                scale: clampNum(Number(t?.scale || 1), 0.2, 2),
            }))
            .filter((t) => t.minCount > 0)
            .sort((a, b) => b.minCount - a.minCount); // Fixed missing closing parenthesis

        for (const t of sorted) {
            if (count >= t.minCount) return t.scale;
        }
        return scalingDefaults.fallbackScale || 1;
    }, [scalingDefaults]);

    const planetDefs = useMemo(() => {
        return BASE_PLANETS.map((p) => {
            const cfg = planetDefaults[p.id] && typeof planetDefaults[p.id] === 'object' ? planetDefaults[p.id] : {};
            return {
                ...p,
                r: clampNum(Number(cfg.r || p.r), 3, 20),
                c1: typeof cfg.c1 === 'string' && cfg.c1.trim() ? cfg.c1.trim() : p.c1,
            };
        });
    }, [planetDefaults]);

    const getPlanetByIndex = useCallback((idx) => {
        const arr = planetDefs && planetDefs.length ? planetDefs : BASE_PLANETS;
        return arr[Math.max(0, idx) % arr.length];
    }, [planetDefs]);

    const getNodeVisual = useCallback((node) => {
        const nodeCfg = node && node.id ? treeNodeLayout[node.id] || {} : {};
        const visual = node && node.visual && typeof node.visual === 'object' ? node.visual : {};

        const xRaw = Number(isMobile ? (nodeCfg.mobileX ?? nodeCfg.x) : (nodeCfg.x ?? nodeCfg.mobileX));
        const yRaw = Number(isMobile ? (nodeCfg.mobileY ?? nodeCfg.y) : (nodeCfg.y ?? nodeCfg.mobileY));
        const sizeScaleRaw = Number(nodeCfg.sizeScale ?? visual.sizeScale ?? nodeDefaults.sizeScale ?? 1);
        const planetIdxRaw = Number(nodeCfg.planetIdx ?? visual.planetIdx);
        const connectorThicknessRaw = Number(nodeCfg.connectorThickness ?? visual.connectorThickness);
        const connectorCurveRaw = Number(nodeCfg.connectorCurve ?? visual.connectorCurve);

        return {
            x: xRaw,
            y: yRaw,
            sizeScale: isFiniteNum(sizeScaleRaw) ? clampNum(sizeScaleRaw, 0.4, 3.5) : 1,
            shape: String(nodeCfg.shape || visual.shape || nodeDefaults.shape || 'planet').toLowerCase(),
            planetIdx: isFiniteNum(planetIdxRaw) ? Math.max(0, Math.round(planetIdxRaw)) : null,
            connectorThickness: isFiniteNum(connectorThicknessRaw) ? clampNum(connectorThicknessRaw, 0.2, 5) : 1,
            connectorCurve: isFiniteNum(connectorCurveRaw) ? clampNum(connectorCurveRaw, 0.05, 0.85) : connectorCurveDefault,
        };
    }, [treeNodeLayout, nodeDefaults, connectorCurveDefault, isMobile]);

    const getPinnedNodePos = useCallback((node) => {
        if (!node || typeof node !== 'object') return null;
        const v = getNodeVisual(node);
        const xFromCfg = isFiniteNum(v.x) ? clampNum(v.x, 0, 100) : null;
        const yFromCfg = isFiniteNum(v.y) ? clampNum(v.y, 0, 100) : null;
        if (xFromCfg !== null && yFromCfg !== null) return { x: xFromCfg, y: yFromCfg };
        // On mobile, skip node.pos fallback — those values are for desktop layout;
        // let auto-distribution fill the full mobile viewport instead.
        if (isMobile) return null;
        if (!preferNodePosition) return null;
        const p = node.pos && typeof node.pos === 'object' ? node.pos : null;
        const x = p ? Number(p.x) : NaN;
        const y = p ? Number(p.y) : NaN;
        if (isFiniteNum(x) && isFiniteNum(y)) return { x: clampNum(x, 0, 100), y: clampNum(y, 0, 100) };
        return null;
    }, [getNodeVisual, preferNodePosition, isMobile]);

    /* ── browser back ↔ tree back sync refs ── */
    const zoomStackLenRef = useRef(0);
    const handleBackRef   = useRef(null);
    const onBackRef       = useRef(null);

    /* ── fetch per-node video counts ── */
    useEffect(() => {
        fetch(`${API}/api/video-counts`)
            .then(r => r.ok ? r.json() : {})
            .then(d => setVideoCounts(d))
            .catch(() => {});
    }, [API]);

    const refreshLayoutConfig = useCallback(() => {
        // Prefer confirmed latest layout from API.
        // Only use cache as offline fallback to avoid stale template rendering.
        fetch(`${API}/api/tree-layout?t=${Date.now()}`, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const layout = d && typeof d === 'object' && d.layout ? d.layout : null;
                if (layout && typeof layout === 'object') {
                    setLayoutConfig(layout);
                    try {
                        localStorage.setItem('cr_layout_config_cache', JSON.stringify(layout));
                    } catch (e) { console.debug("[non-fatal]", e?.message); }
                    return;
                }
                throw new Error('No layout from API');
            })
            .catch(() => {
                try {
                    const cached = localStorage.getItem('cr_layout_config_cache');
                    if (!cached) return;
                    const layout = JSON.parse(cached);
                    if (layout && typeof layout === 'object' && layout.nodes) {
                        setLayoutConfig(layout);
                    }
                } catch (e) { console.debug("[non-fatal]", e?.message); }
            });
    }, [API]);

    useEffect(() => {
        fetch(`${API}/api/careers/public`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d && typeof d === 'object' && d.id && !isCollapsedPersonaTree(d)) {
                    setTreeData(d);
                    setFetchError(null);
                } else {
                    setTreeData(careersData);
                    setFetchError(null);
                }
            })
            .catch(() => {
                setFetchError('Unable to load career tree. Check your connection.');
                setTreeData(careersData);
            });

        refreshLayoutConfig();
    }, [API, refreshLayoutConfig]);

    useEffect(() => {
        const onFocus = () => refreshLayoutConfig();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refreshLayoutConfig();
        };
        const onSameTabLayoutUpdate = (e) => {
            const layout = e?.detail;
            if (layout && typeof layout === 'object') {
                setLayoutConfig(layout);
                return;
            }
            refreshLayoutConfig();
        };
        const onStorage = (e) => {
            if (e.key === LAYOUT_SYNC_KEY) refreshLayoutConfig();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('cr-layout-updated', onSameTabLayoutUpdate);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('cr-layout-updated', onSameTabLayoutUpdate);
            window.removeEventListener('storage', onStorage);
        };
    }, [refreshLayoutConfig]);

    /* ── Auto-enable highlight mode when user zooms into tree ── */
    useEffect(() => {
        // Enable highlight mode when user has navigated beyond root (zoomStack.length > 0)
        // This shows which path they've chosen vs unexplored branches
        setEnableHighlightMode(zoomStack.length > 0);
    }, [zoomStack.length]);

    /* ── helpers ── */
    const find = useCallback((id, n = TREE) => {
        if (n.id === id) return n;
        if (n.children) for (const c of n.children) { const f = find(id, c); if (f) return f; }
        return null;
    }, [TREE]);

    const pathTo = useCallback((id, n = TREE, trail = []) => {
        if (n.id === id) return [...trail, n.id];
        if (n.children) for (const c of n.children) { const f = pathTo(id, c, [...trail, n.id]); if (f?.length) return f; }
        return [];
    }, [TREE]);

    const subtreeIds = useCallback((n, s = new Set()) => {
        if (!n) return s; s.add(n.id);
        if (n.children) n.children.forEach(c => subtreeIds(c, s));
        return s;
    }, []);

    const root = useCallback(() => {
        if (zoomStack.length === 0) return TREE;
        return find(zoomStack[zoomStack.length - 1]) || TREE;
    }, [zoomStack, find]);

    const activePageRootId = zoomStack.length > 0 ? zoomStack[0] : TREE.id;
    const activeLinkedSiblingShapes = useMemo(() => {
        if (Object.prototype.hasOwnProperty.call(linkedSiblingShapesByRoot, activePageRootId)) {
            return linkedSiblingShapesByRoot[activePageRootId] !== false;
        }
        return linkedSiblingShapes;
    }, [linkedSiblingShapesByRoot, activePageRootId, linkedSiblingShapes]);

    const leafAutoHintRef = useRef('');
    const latestLayoutConfigRef = useRef(layoutConfig);

    useEffect(() => {
        latestLayoutConfigRef.current = layoutConfig;
    }, [layoutConfig]);

    const defaultSiblingTemplate = useCallback((count) => {
        const n = Math.max(0, Number(count) || 0);
        if (n <= 0) return [];

        const rowPlan = (() => {
            if (n === 1) return [1];
            if (n === 2) return [2];
            if (n === 3) return [1, 2];
            if (n === 4) return isMobile ? [2, 2] : [2, 2];
            if (n === 5) return isMobile ? [2, 3] : [2, 3];
            if (n === 6) return isMobile ? [3, 3] : [1, 2, 3];
            if (n === 7) return isMobile ? [2, 2, 3] : [2, 2, 3];
            if (n === 8) return isMobile ? [2, 3, 3] : [2, 3, 3];
            if (n === 9) return isMobile ? [3, 3, 3] : [2, 3, 4];
            const rows = [];
            let remaining = n;
            const maxPerRow = isMobile ? 3 : 4;
            while (remaining > 0) {
                const take = Math.min(maxPerRow, remaining);
                rows.push(take);
                remaining -= take;
            }
            return rows;
        })();

        const rowYFractions = (() => {
            const rc = rowPlan.length;
            if (rc <= 1) return [isMobile ? 0.45 : 0.42];
            if (rc === 2) return [isMobile ? 0.28 : 0.3, isMobile ? 0.64 : 0.64];
            if (rc === 3) return [isMobile ? 0.2 : 0.22, isMobile ? 0.46 : 0.48, isMobile ? 0.72 : 0.74];
            if (rc === 4) return [0.16, 0.38, 0.6, 0.82];
            return rowPlan.map((_, i) => 0.14 + (i * (0.74 / Math.max(1, rc - 1))));
        })();

        const getRowSlots = (countInRow) => {
            if (countInRow <= 1) return [0.5];
            const out = [];
            for (let i = 0; i < countInRow; i++) {
                out.push(slotPad + (1 - 2 * slotPad) * i / Math.max(1, countInRow - 1));
            }
            return out;
        };

        const template = [];
        let cursor = 0;
        rowPlan.forEach((countInRow, rowIdx) => {
            const slots = getRowSlots(countInRow);
            const y = clampNum((rowYFractions[rowIdx] ?? 0.5) * 100, 8, 92);
            for (let col = 0; col < countInRow && cursor < n; col += 1) {
                const x = clampNum((slots[col] ?? 0.5) * 100, 0, 100);
                template.push({ x, y });
                cursor += 1;
            }
        });
        return template;
    }, [isMobile, slotPad]);

    const getTemplateForCount = useCallback((count) => {
        const n = Math.max(0, Number(count) || 0);
        if (n <= 0) return [];
        // Use mobile templates on mobile, desktop templates on desktop
        const templateMap = isMobile ? siblingTemplatesMobile : siblingTemplates;
        const raw = templateMap[String(n)];
        const fallback = defaultSiblingTemplate(n);
        if (!Array.isArray(raw) || raw.length !== n) return fallback;
        const normalized = raw.map((pt, idx) => {
            const f = fallback[idx] || { x: 50, y: 50 };
            return {
                x: clampNum(Number(pt?.x ?? f.x), 0, 100),
                y: clampNum(Number(pt?.y ?? f.y), 8, 92),
            };
        });
        return normalized;
    }, [isMobile, siblingTemplates, siblingTemplatesMobile, defaultSiblingTemplate]);

    // If navigation lands directly on a leaf node (e.g. restore/deep-link),
    // show the endpoint CTA so the single-sun view doesn't feel like missing nodes.
    useEffect(() => {
        const current = root();
        const currentId = current?.id || '';
        const childCount = Array.isArray(current?.children) ? current.children.length : 0;
        const isLeafZoom = treeData && zoomStack.length > 0 && current && childCount === 0 && currentId !== TREE.id;

        // If current node has children or the tree isn't loaded yet, never keep a stale endpoint overlay visible.
        if (!isLeafZoom || !currentId) {
            leafAutoHintRef.current = '';
            setLeafToast(null);
            setLeafNode(null);
            return;
        }
        if (leafAutoHintRef.current === currentId) return;

        leafAutoHintRef.current = currentId;
        setLeafToast(current.label || 'Career endpoint');
        setLeafNode(current);

        const timer = setTimeout(() => {
            setLeafToast(null);
            setLeafNode(null);
        }, 6000);

        return () => clearTimeout(timer);
    }, [zoomStack, root]);

    const vbW = useMemo(() => {
        if (cSize.w > 0 && cSize.h > 0) {
            const aspect = cSize.w / cSize.h;
            // On mobile (portrait), we want a wider coordinate space for better horizontal spreading
            if (aspect < 0.7) return Math.max(160, 140 * aspect);
            return Math.max(140, 100 * aspect);
        }
        return 178;
    }, [cSize.w, cSize.h]);

    // vbH dynamically matches the container aspect ratio so SVG viewBox fills the container exactly
    // and HTML label pixel positions match SVG planet pixel positions.
    const vbH = useMemo(() => {
        if (cSize.w > 0 && cSize.h > 0) return Math.round(vbW * (cSize.h / cSize.w));
        return 100;
    }, [vbW, cSize.w, cSize.h]);
    const yScale = vbH / 100; // multiplier to convert stored 0-100 coords → viewBox coords
    const canAdminPressDrag = Boolean(isAdmin && adminDragEnabled);

    const CHILDREN_Y_END = isMobile ? childrenYEndMobile : childrenYEndDesktop;

    const clientToSvgCoords = useCallback((clientX, clientY) => {
        const svg = canvasSvgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * vbW;
        const y = ((clientY - rect.top) / rect.height) * vbH;
        return { x, y };
    }, [vbW, vbH]);

    const getPos = useCallback((node) => {
        const isZoomed = zoomStack.length > 0;
        const currentRootNode = isZoomed ? (find(zoomStack[zoomStack.length - 1]) || TREE) : TREE;
        const isDirectChildOfCurrentRoot = Boolean(currentRootNode?.children?.some((c) => c.id === node.id));
        // ── Zoomed root always sits at algorithmic center-top — never use a stored child-level position for it ──
        const isCurrentZoomedRoot = isZoomed && node.id === zoomStack[zoomStack.length - 1];
        const shouldUseManualNodePos = !isCurrentZoomedRoot && !(activeLinkedSiblingShapes && isDirectChildOfCurrentRoot);

        // ── Check if there's a manually-set position in layoutConfig (including live drag updates) ──
        const nodeLayoutConfig = shouldUseManualNodePos ? treeNodeLayout[node.id] : null;
        if (nodeLayoutConfig && typeof nodeLayoutConfig === 'object') {
            const posKey = isMobile ? 'mobileX' : 'x';
            const yPosKey = isMobile ? 'mobileY' : 'y';
            const storedX = nodeLayoutConfig[posKey];
            const storedY = nodeLayoutConfig[yPosKey];
            
            if (typeof storedX === 'number' && typeof storedY === 'number') {
                // Convert from percentage-based (0-100) to viewBox coordinates
                const x = (storedX / 100) * vbW;
                const y = (storedY / 100) * vbH;
                return { x, y };
            }
        }

        // ── Otherwise: Calculate algorithmically ──
        const cx = sunTemplateXPct != null ? (sunTemplateXPct / 100) * vbW : vbW / 2;
        const marginX = vbW * effectiveMarginXRatio;
        const rawRootY = sunTemplateYPct != null
            ? (sunTemplateYPct / 100) * vbH
            : (isZoomed ? zoomedRootY : rootY) * yScale;
        const rawChildrenYStart = (isZoomed ? zoomedChildrenYStart : childrenYStart) * yScale;
        const reservedTopPx = framed
            ? (isMobile ? (isZoomed ? 120 : 110) : (isZoomed ? 108 : 100))
            : (isMobile ? (isZoomed ? 106 : 96) : (isZoomed ? 96 : 88));
        const topReserveY = cSize.h > 0 ? (reservedTopPx / cSize.h) * vbH : 0;
        const effectiveRootY = sunTemplateYPct != null ? rawRootY : Math.max(rawRootY, topReserveY);
        const effectiveChildrenYStart = Math.max(rawChildrenYStart, effectiveRootY + (isMobile ? 10 : 8));
        const usableH = CHILDREN_Y_END * yScale - effectiveChildrenYStart;

        const placeChildren = (children, rY, yStart, yEnd) => {
            const n = children.length;
            if (n === 0) return null;

            // Arc layout patterns (low-high-low smile) — fractions of usableH
            const countScale = resolveVisualScaleByCount(children.length);
            const largestPlanetRadius = children.reduce((maxRadius, item, itemIdx) => {
                const visual = getNodeVisual(item);
                const planet = getPlanetByIndex(visual.planetIdx ?? itemIdx);
                const radius = planet.r * countScale * Number(visual.sizeScale || 1);
                return Math.max(maxRadius, radius);
            }, 0);

            // Pin first/last nodes close to stage edges while keeping a small safe gap.
                const edgePad = Math.max(largestPlanetRadius * edgePadFactor, isMobile ? 1 : 2);
            const minX = marginX + edgePad;
            const maxX = vbW - marginX - edgePad;

            if (activeLinkedSiblingShapes && n >= 2) {
                const template = getTemplateForCount(n);
                const linkedById = new Map(children.map((child, idx) => {
                    const pt = template[idx] || { x: 50, y: 50 };
                    const xFrac = clampNum(pt.x / 100, 0, 1);
                    const yFrac = clampNum(pt.y / 100, 0.08, 0.92);
                    const x = clampNum(minX + (maxX - minX) * xFrac, minX, maxX);
                    const y = yStart + usableH * yFrac;
                    return [child.id, { x, y }];
                }));
                return (child) => linkedById.get(child.id) || null;
            }

            // Balanced staged rows so all branches follow the same clean visual rhythm.
            const rowPlan = (() => {
                if (n <= 0) return [];
                if (n === 1) return [1];
                if (n === 2) return [2];
                if (n === 3) return [1, 2];
                if (n === 4) return isMobile ? [2, 2] : [2, 2]; // Keep same for 4
                if (n === 5) return isMobile ? [2, 3] : [2, 3];
                if (n === 6) return isMobile ? [3, 3] : [1, 2, 3];
                if (n === 7) return isMobile ? [2, 2, 3] : [2, 2, 3];
                if (n === 8) return isMobile ? [2, 3, 3] : [2, 3, 3];
                if (n === 9) return isMobile ? [3, 3, 3] : [2, 3, 4];

                // For larger sets, keep row size capped to avoid overcrowding.
                const rows = [];
                let remaining = n;
                const maxPerRow = isMobile ? 3 : 4;
                while (remaining > 0) {
                    const take = Math.min(maxPerRow, remaining);
                    rows.push(take);
                    remaining -= take;
                }
                return rows;
            })();

            const rowYFractions = (() => {
                const rc = rowPlan.length;
                if (rc <= 1) return [isMobile ? 0.38 : 0.42];
                if (rc === 2) return [isMobile ? 0.15 : 0.3, isMobile ? 0.75 : 0.64];
                if (rc === 3) return [isMobile ? 0.12 : 0.22, isMobile ? 0.44 : 0.48, isMobile ? 0.76 : 0.74];
                if (rc === 4) return [0.16, 0.38, 0.6, 0.82];
                return rowPlan.map((_, i) => 0.14 + (i * (0.74 / Math.max(1, rc - 1))));
            })();

            const getRowSlots = (countInRow) => {
                if (countInRow <= 1) return [0.5];
                const out = [];
                for (let i = 0; i < countInRow; i++) {
                    out.push(slotPad + (1 - 2 * slotPad) * i / Math.max(1, countInRow - 1));
                }
                return out;
            };

            const staged = [];
            let cursor = 0;
            rowPlan.forEach((countInRow, rowIdx) => {
                const slots = getRowSlots(countInRow);
                const rowY = yStart + usableH * clampNum(rowYFractions[rowIdx] ?? 0.5, 0.08, 0.92);
                for (let col = 0; col < countInRow && cursor < n; col += 1) {
                    const child = children[cursor];
                    const xFrac = clampNum(slots[col] ?? 0.5, 0, 1);
                    const x = clampNum(minX + (maxX - minX) * xFrac, minX, maxX);
                    staged.push({ id: child.id, x, y: rowY });
                    cursor += 1;
                }
            });

            const stagedById = new Map(staged.map((item) => [item.id, { x: item.x, y: item.y }]));

            return (child) => {
                return stagedById.get(child.id) || null;
            };
        };

        // Safe-zone boundaries: keep planets clear of sidebars and bottom CTA
        // At root level (no zoom), always prefer dynamic child placement.
        if (!isZoomed) {
            if (!autoDistributeFallback) return { x: cx, y: 50 * yScale };
            if (node.id === TREE.id) return { x: cx, y: expanded ? effectiveRootY : 50 * yScale };
            if (TREE.children) {
                const slot = placeChildren(TREE.children, effectiveRootY, effectiveChildrenYStart, CHILDREN_Y_END * yScale);
                if (slot) { const pos = slot(node); if (pos) return pos; }
            }
            return { x: cx, y: 50 * yScale };
        }

        // When zoomed in, check pinned positions first, then auto-distribute
        const r = find(zoomStack[zoomStack.length - 1]);
        if (!r) return { x: cx, y: 50 * yScale };
        if (node.id === r.id) return { x: cx, y: effectiveRootY };
        // While zoomed, keep using dynamic child placement for consistent spacing.
        if (r.children) {
            const slot = placeChildren(r.children, effectiveRootY, effectiveChildrenYStart, CHILDREN_Y_END * yScale);
            if (slot) { const pos = slot(node); if (pos) return pos; }
        }
        return { x: cx, y: 50 * yScale };
    }, [zoomStack, find, vbW, vbH, yScale, expanded, getPinnedNodePos, autoDistributeFallback, effectiveMarginXRatio, edgePadFactor, slotPad, minNodeSpacingX, targetRows, hardMaxCols, rootY, zoomedRootY, childrenYStart, zoomedChildrenYStart, CHILDREN_Y_END, resolveVisualScaleByCount, getNodeVisual, getPlanetByIndex, framed, isMobile, cSize.h, treeNodeLayout, TREE, activeLinkedSiblingShapes, getTemplateForCount, sunTemplateXPct, sunTemplateYPct]);

    const nodeVisible = useCallback((id) => {
        const r = root();
        if (!r) return false;
        if (zoomStack.length === 0 && !expanded && id !== TREE.id) return false;
        if (id !== r.id && !r.children?.some(c => c.id === id)) return false;
        if (searchMatches?.length > 0 && !searchMatches.includes(id)) return false;
        if (searchQuery) {
            const n = find(id) || {};
            const q = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            const txt = ((n.label || '') + ' ' + (n.id || '')).toLowerCase();
            if (!q.every(t => txt.includes(t))) return false;
        }
        return true;
    }, [root, searchQuery, searchMatches, find, expanded, zoomStack.length]);

    // Mobile double-tap: first tap = show popup, second tap within 400ms = navigate/play
    const lastTapRef = useRef({ id: null, time: 0 });

    const handleClick = (node) => {
        console.log('handleClick called with node:', node?.id);
        if (transitioning) return;
        if (node.id === 'start' && !expanded) {
            setExpanded(true);
            return;
        }
        if (node.id === 'start') {
            if (zoomStack.length > 0) {
                setZoomStack([]);
                setActivePath(['start']);
                onPathChange?.([]);
                onBack?.([]);
            }
            return;
        }

        // Mobile: first tap → show popup; second tap within 400ms → act
        if (isMobile) {
            const now = Date.now();
            const last = lastTapRef.current;
            if (last.id === node.id && now - last.time < 400) {
                // Double-tap confirmed → act
                lastTapRef.current = { id: null, time: 0 };
                setHoveredId(null);
            } else {
                // First tap → show popup
                lastTapRef.current = { id: node.id, time: now };
                setHoveredId(node.id);
                return; // don't navigate yet
            }
        }

        const p = pathTo(node.id);
        setActivePath(p);
        onNodeSelect?.(node);
        onPathChange?.(p.slice(1));
        onRecenterComplete?.(node);

        // If direct video exists → play it; otherwise open demand modal
        const nodeVideo = buildNodeVideoPayload(node);
        if (nodeVideo) {
            onNodeVideoRequest?.(nodeVideo);
            return;
        }

        setLeafToast(null);
        setLeafNode(null);
        setDemandError('');
        setDemandSubmitted(false);
        setDemandNode(node);
    };


    const handleSubmitDemand = useCallback(async () => {
        if (!demandNode || demandSubmitting) return;
        setDemandError('');
        setDemandSubmitting(true);
        try {
            const payload = {
                nodeId: String(demandNode.id || ''),
                nodeLabel: String(demandNode.label || ''),
                path: activePath.slice(1),
                source: 'interactive-timeline',
            };
            const res = await fetch(`${API}/api/demands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                throw new Error(data?.error || 'Demand request failed');
            }
            setDemandSubmitted(true);
        } catch (err) {
            setDemandError(err?.message || 'Demand request failed');
        } finally {
            setDemandSubmitting(false);
        }
    }, [demandNode, demandSubmitting, activePath, API]);

    const clearPressDragState = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        dragStateRef.current = null;
        setDraggingNodeId(null);
    }, []);

    // Ref to always hold the freshest dragged position — avoids stale closure on commit
    const lastDragPosRef = useRef({});

    const applyDraggedNodePosition = useCallback((nodeId, xVb, yVb) => {
        if (!nodeId) return;
        // Don't save position for the current zoomed root — its placement is always algorithmic (center-top)
        if (zoomStack.length > 0 && nodeId === zoomStack[zoomStack.length - 1]) return;

        const currentRootNode = zoomStack.length > 0
            ? (find(zoomStack[zoomStack.length - 1]) || TREE)
            : TREE;
        const siblings = Array.isArray(currentRootNode?.children) ? currentRootNode.children : [];
        const siblingIndex = siblings.findIndex((s) => s.id === nodeId);

        if (activeLinkedSiblingShapes && siblingIndex >= 0 && siblings.length >= 2) {
            const isZoomed = zoomStack.length > 0;
            const marginX = vbW * effectiveMarginXRatio;
            const rawRootY = (isZoomed ? zoomedRootY : rootY) * yScale;
            const rawChildrenYStart = (isZoomed ? zoomedChildrenYStart : childrenYStart) * yScale;
            const reservedTopPx = framed
                ? (isMobile ? (isZoomed ? 112 : 102) : (isZoomed ? 88 : 80))
                : (isMobile ? (isZoomed ? 98 : 88) : (isZoomed ? 80 : 72));
            const topReserveY = cSize.h > 0 ? (reservedTopPx / cSize.h) * vbH : 0;
            const effectiveRootY = Math.max(rawRootY, topReserveY);
            const yStart = Math.max(rawChildrenYStart, effectiveRootY + (isMobile ? 10 : 8));
            const usableH = CHILDREN_Y_END * yScale - yStart;

            const countScale = resolveVisualScaleByCount(siblings.length);
            const largestPlanetRadius = siblings.reduce((maxRadius, item, itemIdx) => {
                const visual = getNodeVisual(item);
                const planet = getPlanetByIndex(visual.planetIdx ?? itemIdx);
                const radius = planet.r * countScale * Number(visual.sizeScale || 1);
                return Math.max(maxRadius, radius);
            }, 0);
            const edgePad = Math.max(largestPlanetRadius * edgePadFactor, isMobile ? 1 : 2);
            const minX = marginX + edgePad;
            const maxX = vbW - marginX - edgePad;

            const xTemplate = clampNum(((xVb - minX) / Math.max(1, maxX - minX)) * 100, 0, 100);
            const yTemplate = clampNum(((yVb - yStart) / Math.max(1, usableH)) * 100, 8, 92);
            const templateCountKey = String(siblings.length);

            setLayoutConfig((prev) => {
                const next = deepClone(prev || DEFAULT_TREE_LAYOUT);
                if (!next.global || typeof next.global !== 'object') next.global = deepClone(DEFAULT_TREE_LAYOUT.global);
                // Write to mobile or desktop template map based on current isMobile state
                const tplKey = isMobile ? 'siblingTemplatesMobile' : 'siblingTemplates';
                if (!next.global[tplKey] || typeof next.global[tplKey] !== 'object') next.global[tplKey] = {};
                if (next.global.linkedSiblingShapes === undefined) next.global.linkedSiblingShapes = true;

                const template = Array.isArray(next.global[tplKey][templateCountKey])
                    ? deepClone(next.global[tplKey][templateCountKey])
                    : getTemplateForCount(siblings.length);

                while (template.length < siblings.length) {
                    template.push({ x: 50, y: 50 });
                }
                template[siblingIndex] = { x: Math.round(xTemplate), y: Math.round(yTemplate) };
                next.global[tplKey][templateCountKey] = template;

                latestLayoutConfigRef.current = next;
                onAdminLayoutConfigUpdate?.(next);
                return next;
            });

            return;
        }

        const xPct = clampNum((xVb / vbW) * 100, 2, 98);
        const yPct = clampNum((yVb / vbH) * 100, 2, 98);
        const primaryXKey = isMobile ? 'mobileX' : 'x';
        const primaryYKey = isMobile ? 'mobileY' : 'y';
        const mirrorXKey = isMobile ? 'x' : 'mobileX';
        const mirrorYKey = isMobile ? 'y' : 'mobileY';
        const roundX = Math.round(xPct);
        const roundY = Math.round(yPct);

        // Store fresh values in ref so commit callback can read them synchronously
        lastDragPosRef.current[nodeId] = { x: roundX, y: roundY };

        setLayoutConfig((prev) => {
            const next = deepClone(prev || DEFAULT_TREE_LAYOUT);
            if (!next.nodes || typeof next.nodes !== 'object') next.nodes = {};
            if (!next.nodes[nodeId] || typeof next.nodes[nodeId] !== 'object') next.nodes[nodeId] = {};
            next.nodes[nodeId][primaryXKey] = roundX;
            next.nodes[nodeId][primaryYKey] = roundY;
            next.nodes[nodeId][mirrorXKey] = roundX;
            next.nodes[nodeId][mirrorYKey] = roundY;
            latestLayoutConfigRef.current = next;
            onAdminLayoutConfigUpdate?.(next);
            return next;
        });

        if (typeof onAdminNodeLayoutUpdate === 'function') {
            onAdminNodeLayoutUpdate(nodeId, primaryXKey, roundX);
            onAdminNodeLayoutUpdate(nodeId, primaryYKey, roundY);
            onAdminNodeLayoutUpdate(nodeId, mirrorXKey, roundX);
            onAdminNodeLayoutUpdate(nodeId, mirrorYKey, roundY);
        }
    }, [zoomStack, find, TREE, activeLinkedSiblingShapes, vbW, vbH, yScale, effectiveMarginXRatio, edgePadFactor, slotPad, rootY, zoomedRootY, childrenYStart, zoomedChildrenYStart, CHILDREN_Y_END, framed, isMobile, cSize.h, resolveVisualScaleByCount, getNodeVisual, getPlanetByIndex, getTemplateForCount, onAdminLayoutConfigUpdate, onAdminNodeLayoutUpdate]);

    const handleNodePointerDown = useCallback((e, node) => {
        if (!canAdminPressDrag || !node?.id) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // Do NOT setPointerCapture — drag uses window-level listeners
        e.preventDefault();
        const coords = clientToSvgCoords(e.clientX, e.clientY);
        if (!coords) return;

        dragStateRef.current = {
            nodeId: node.id,
            node,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            dragging: false,
        };
        suppressNextClickRef.current = false;

        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
            const st = dragStateRef.current;
            if (!st || st.nodeId !== node.id) return;
            const current = clientToSvgCoords(st.lastX, st.lastY);
            st.dragging = true;
            suppressNextClickRef.current = true;
            setDraggingNodeId(node.id);
            if (current) {
                applyDraggedNodePosition(node.id, current.x, current.y);
            } else {
                applyDraggedNodePosition(node.id, coords.x, coords.y);
            }
        }, 280);
    }, [canAdminPressDrag, clientToSvgCoords, applyDraggedNodePosition]);

    const handleNodePointerMove = useCallback((e, node) => {
        if (!canAdminPressDrag || !node?.id) return;
    }, [canAdminPressDrag]);

    const handleNodePointerUp = useCallback((e, node) => {
        if (!canAdminPressDrag || !node?.id) return;
    }, [canAdminPressDrag]);

    const handleNodePointerCancel = useCallback(() => {
        if (!canAdminPressDrag) return;
        clearPressDragState();
    }, [canAdminPressDrag, clearPressDragState]);

    useEffect(() => {
        if (!canAdminPressDrag) return;

        const onWinPointerMove = (e) => {
            const st = dragStateRef.current;
            if (!st) return;
            if (st.pointerId !== undefined && e.pointerId !== st.pointerId) return;

            st.lastX = e.clientX;
            st.lastY = e.clientY;

            if (!st.dragging) return;
            e.preventDefault();
            const coords = clientToSvgCoords(e.clientX, e.clientY);
            if (!coords) return;
            applyDraggedNodePosition(st.nodeId, coords.x, coords.y);
        };

        const finishPointer = (e, isCancel = false) => {
            const st = dragStateRef.current;
            if (!st) return;
            if (st.pointerId !== undefined && e.pointerId !== st.pointerId) return;

            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }

            if (isCancel) {
                clearPressDragState();
                return;
            }

            if (st.dragging) {
                suppressNextClickRef.current = true;
                setDraggingNodeId(null);
                dragStateRef.current = null;
                // Pass the fresh x/y directly from ref — avoids stale React state closure
                const freshPos = lastDragPosRef.current[st.nodeId];
                if (freshPos) {
                    onAdminNodeLayoutCommit?.(st.nodeId, freshPos.x, freshPos.y, latestLayoutConfigRef.current);
                } else {
                    onAdminNodeLayoutCommit?.(st.nodeId, undefined, undefined, latestLayoutConfigRef.current);
                }
                setTimeout(() => { suppressNextClickRef.current = false; }, 120);
                return;
            }

            dragStateRef.current = null;
            handleClick(st.node);
        };

        const onWinPointerCancel = (e) => finishPointer(e, true);

        window.addEventListener('pointermove', onWinPointerMove, { passive: false });
        window.addEventListener('pointerup', finishPointer);
        window.addEventListener('pointercancel', onWinPointerCancel);

        return () => {
            window.removeEventListener('pointermove', onWinPointerMove);
            window.removeEventListener('pointerup', finishPointer);
            window.removeEventListener('pointercancel', onWinPointerCancel);
        };
    }, [canAdminPressDrag, clientToSvgCoords, applyDraggedNodePosition, onAdminNodeLayoutCommit, handleClick, clearPressDragState]);

    const handleBack = () => {
        if (transitioning) return;
        if (zoomStack.length > 0) {
            // Go back one level
            const newStack = zoomStack.slice(0, -1);
            setZoomStack(newStack);
            const nid = newStack.length > 0 ? newStack[newStack.length - 1] : 'start';
            const p = nid === 'start' ? ['start'] : pathTo(nid);
            setActivePath(p);
            onPathChange?.(newStack);
            onBack?.(newStack);
        } else {
            // At root, exit to pyramid
            setZoomStack([]);
            setActivePath(['start']);
            onPathChange?.([]);
            onBack?.([]);
        }
    };

    /* ── sync handleBack into ref so popstate listener stays stable ── */
    handleBackRef.current = handleBack;
    onBackRef.current = onBack;

    /* ── also keep handleClick stable for keyboard handler ── */
    const handleClickRef = useRef(null);
    handleClickRef.current = handleClick;

    /* ── push one history entry on mount so browser back exits to pyramid ── */
    useEffect(() => {
        window.history.pushState({ pwTreeLevel: 0 }, '');
    }, []);

    /* ── browser ← button → exit to pyramid ── */
    useEffect(() => {
        const onPopState = () => {
            handleBackRef.current?.();
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    /* ── navigate to prev/next sibling of current root ── */
    const handleSiblingNav = useCallback((dir /* -1 prev | +1 next */) => {
        if (transitioning || zoomStack.length === 0) return;
        const currentId = zoomStack[zoomStack.length - 1];
        const parentId = zoomStack.length >= 2 ? zoomStack[zoomStack.length - 2] : null;
        const parentNode = parentId ? find(parentId) : TREE;
        const siblings = parentNode?.children;
        if (!siblings || siblings.length < 2) return;
        const currentIdx = siblings.findIndex(c => c.id === currentId);
        if (currentIdx === -1) return;
        const nextIdx = (currentIdx + dir + siblings.length) % siblings.length;
        const nextNode = siblings[nextIdx];
        if (!nextNode) return;
        // Only navigate into nodes that have children (sub-nodes); for leaves just select
        if (!nextNode.children?.length) {
            const p = pathTo(nextNode.id);
            setActivePath(p);
            onNodeSelect?.(nextNode);
            onPathChange?.(p.slice(1));
            return;
        }
        setTransitioning(true);
        const pos = getPos(nextNode);
        if (pos) setZoomOriginPct({ x: (pos.x / vbW) * 100, y: pos.y });
        setPendingRoot(nextNode.id);
        onRecenterStart?.(nextNode);
        const ns = [...zoomStack.slice(0, -1), nextNode.id];
        setTimeout(() => {
            setZoomStack(ns);
            const p = pathTo(nextNode.id);
            setActivePath(p);
            onPathChange?.(p.slice(1));
            onNodeSelect?.(nextNode);
            setTimeout(() => { setTransitioning(false); setPendingRoot(null); onRecenterComplete?.(nextNode); }, 350);
        }, 180);
    }, [transitioning, zoomStack, find, pathTo, getPos, vbW, onNodeSelect, onPathChange, onRecenterStart, onRecenterComplete]);

    const handleSiblingNavRef = useRef(null);
    handleSiblingNavRef.current = handleSiblingNav;

    const swipeThresholdRef = useRef(35);
    swipeThresholdRef.current = Number(mobileConfig.swipeThreshold || 35);

    /* ── swipe left/right on touch devices → browser back/forward ── */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let startX = 0;
        let startY = 0;
        let active = false;
        const onTouchStart = (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            active = true;
        };
        const onTouchEnd = (e) => {
            if (!active) return;
            active = false;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            // Require horizontal distance past threshold and less vertical than horizontal
            if (Math.abs(dx) < swipeThresholdRef.current || Math.abs(dy) > Math.abs(dx) * 0.5) return;
            if (dx > 0) {
                window.history.back();
            } else {
                window.history.forward();
            }
        };
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    /* ── jump back to a specific breadcrumb depth ── */
    const handleBreadcrumbJump = (zoomDepth) => {
        if (transitioning || zoomDepth >= zoomStack.length) return;
        setTransitioning(true);
        const ns = zoomStack.slice(0, zoomDepth);
        setPendingRoot(ns[ns.length - 1] || null);
        onRecenterStart?.();
        setTimeout(() => {
            setZoomStack(ns);
            const nid = ns[ns.length - 1] || 'start';
            const p = nid === 'start' ? ['start'] : pathTo(nid);
            setActivePath(p);
            onPathChange?.(ns);
            onBack?.(ns);
            setTimeout(() => { setTransitioning(false); setPendingRoot(null); onRecenterComplete?.(); }, 350);
        }, 220);
    };

    /* ── computed data ── */
    const allNodes = useMemo(() => {
        const ns = [];
        const walk = n => { ns.push(n); n.children?.forEach(walk); };
        walk(TREE);
        return ns;
    }, [TREE]);

    const glowSet = useMemo(() => {
        const r = root();
        const s = new Set(activePath);
        r?.children?.forEach(c => s.add(c.id));
        if (r) s.add(r.id);
        return s;
    }, [activePath, root]);

    const keepIds = useMemo(() => {
        if (!pendingRoot) return null;
        const t = find(pendingRoot);
        return t ? subtreeIds(t) : null;
    }, [pendingRoot, find, subtreeIds]);

    const visible = useMemo(() => {
        const r = root();
        return allNodes.map(n => {
            if (!nodeVisible(n.id)) return null;
            const pos = getPos(n);
            if (!pos || typeof pos.x !== 'number') return null;
            const isRoot = n.id === r.id;
            const hasChildren = n.children?.length > 0;
            // Never vaporize the root (sun) node — keep it visible during all transitions
            const shouldVaporize = !isRoot && transitioning && keepIds && !keepIds.has(n.id);
            const isGlowing = glowSet.has(n.id) || (keepIds && keepIds.has(n.id));
            const visual = getNodeVisual(n);
            return { node: n, pos, isRoot, hasChildren, shouldVaporize, isGlowing, visual };
        }).filter(Boolean);
    }, [allNodes, root, getPos, nodeVisible, transitioning, keepIds, glowSet, getNodeVisual]);

    /* ── keyboard navigation: ←/→ cycle siblings, Enter drill-in, Esc back ── */
    useEffect(() => {
        const onKeyDown = (e) => {
            if (!expanded) return;
            const children = visible.filter(v => !v.isRoot);
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (!children.length) return;
                e.preventDefault();
                const idx = children.findIndex(v => v.node.id === kbFocusId);
                const next = e.key === 'ArrowRight'
                    ? (idx + 1) % children.length
                    : (idx - 1 + children.length) % children.length;
                setKbFocusId(children[next].node.id);
            } else if (e.key === 'Escape') {
                if (kbFocusId) setKbFocusId(null);
                else handleBackRef.current?.();
            } else if ((e.key === 'Enter' || e.key === ' ') && kbFocusId) {
                e.preventDefault();
                const node = find(kbFocusId);
                if (node) { setKbFocusId(null); handleClickRef.current?.(node); }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [visible, kbFocusId, expanded, find]);

    const threadPath = (parentPos, childPos, curveRatio = connectorCurveDefault) => {
        if (!parentPos || !childPos || typeof parentPos.x !== 'number') return '';
        const midY = parentPos.y + (childPos.y - parentPos.y) * clampNum(curveRatio, 0.05, 0.85);
        return `M ${parentPos.x} ${parentPos.y} C ${parentPos.x} ${midY}, ${childPos.x} ${midY}, ${childPos.x} ${childPos.y}`;
    };

    const paths = useMemo(() => {
        const out = [];
        const r = root();
        r?.children?.forEach(c => {
            if (nodeVisible(c.id) && nodeVisible(r.id)) {
                const childVisual = getNodeVisual(c);
                const thicknessScale = childVisual.connectorThickness || 1;
                const d = threadPath(getPos(r), getPos(c), childVisual.connectorCurve || connectorCurveDefault);
                if (d) {
                    out.push({
                        id: `${r.id}-${c.id}`,
                        d,
                        active: glowSet.has(c.id) && glowSet.has(r.id),
                        widths: {
                            base: connectorBase * thicknessScale,
                            mid: connectorMid * thicknessScale,
                            thin: connectorThin * thicknessScale,
                            active: connectorActive * thicknessScale,
                        },
                    });
                }
            }
        });
        return out;
    }, [activePath, zoomStack, nodeVisible, getPos, root, glowSet, getNodeVisual, connectorCurveDefault, connectorBase, connectorMid, connectorThin, connectorActive]);

    /* ── effects ── */
    useEffect(() => {
        if (onActiveNodePosition) onActiveNodePosition(getPos(root()));
    }, [zoomStack, root, getPos, onActiveNodePosition]);

    useEffect(() => {
        const measure = () => {
            if (containerRef.current) setCSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
        };
        measure();
        window.addEventListener('resize', measure);
        let ro;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            ro = new ResizeObserver(measure);
            ro.observe(containerRef.current);
        }
        return () => { window.removeEventListener('resize', measure); ro?.disconnect(); };
    }, []);

    /* ── breadcrumb data ── */
    const shorten = (s = '') => { if (s.length <= 18) return s; return s.slice(0, 17) + '…'; };
    const breadcrumbs = useMemo(() => {
        const crumbs = [{ id: 'start', label: shorten(TREE.label || 'Start'), zoomDepth: 0 }];
        for (let i = 0; i < zoomStack.length; i++) {
            const n = find(zoomStack[i]);
            if (n) crumbs.push({ id: n.id, label: shorten(n.label || n.id), zoomDepth: i + 1 });
        }
        if (crumbs.length > 3) {
            return [crumbs[0], { id: '__ellipsis__', label: '...', isEllipsis: true, zoomDepth: -1 }, crumbs[crumbs.length - 2], crumbs[crumbs.length - 1]];
        }
        return crumbs;
    }, [zoomStack, find]);

    /* ═══════════════ RENDER ═══════════════ */
    let planetCounter = -1;
    const visibleNodeCount = visible.filter(v => !v.isRoot).length;
    const mobileBaseW = Number(mobileConfig.baselineWidth || 390);
    const mobileBaseH = Number(mobileConfig.baselineHeight || 780);
    const mobileDensityPenalty = Number(mobileConfig.densityPenalty || 0.05);
    const mobileDensityFloorVal = Number(mobileConfig.densityFloor || 0.72);
    const mobileMinNodeScale = Number(mobileConfig.minNodeScale || 0.35);
    const mobileViewportScale = isMobile
        ? clampNum(Math.min((cSize.w || 360) / mobileBaseW, (cSize.h || 780) / mobileBaseH), 0.78, 1.08)
        : 1;
    const mobileDensityScale = isMobile
        ? clampNum(1 - Math.max(0, visibleNodeCount - 4) * mobileDensityPenalty, mobileDensityFloorVal, 1)
        : 1;
    const mobileAutoNodeScale = isMobile
        ? clampNum(mobileViewportScale * mobileDensityScale, 0.7, 1.08)
        : 1;

    useEffect(() => {
        const host = containerRef.current;
        if (!host || cSize.w <= 0 || cSize.h <= 0) {
            setLabelCutouts([]);
            return;
        }

        const hostRect = host.getBoundingClientRect();
        if (!hostRect.width || !hostRect.height) {
            setLabelCutouts([]);
            return;
        }

        const labels = host.querySelectorAll('[data-node-label-id]');
        const cutouts = [];
        labels.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) return;

            const padX = 4;
            const padY = 2;
            const x = ((r.left - hostRect.left) / hostRect.width) * vbW;
            const y = ((r.top - hostRect.top) / hostRect.height) * vbH;
            const w = (r.width / hostRect.width) * vbW;
            const h = (r.height / hostRect.height) * vbH;

            cutouts.push({
                id: el.getAttribute('data-node-label-id') || `cutout-${cutouts.length}`,
                x: clampNum(x - padX, 0, vbW),
                y: clampNum(y - padY, 0, vbH),
                w: clampNum(w + padX * 2, 0, vbW),
                h: clampNum(h + padY * 2, 0, vbH),
            });
        });

        setLabelCutouts(cutouts);
    }, [visible, cSize.w, cSize.h, vbW, vbH, zoomStack, isMobile, mobileAutoNodeScale, draggingNodeId]);

    const overlayPos = framed ? 'absolute' : 'fixed';
    const topOffset = framed ? 'top-2' : 'top-[68px]';
    const mobileTopOffset = framed ? 'top-2' : 'top-[62px]';
    const framedTopInset = 0;

    return (
        <section
            ref={containerRef}
            className="absolute inset-0 z-10 w-full h-full"
            style={framed ? { top: `${framedTopInset}px` } : undefined}
        >

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none z-[5]" style={{
                background: 'radial-gradient(ellipse 60% 55% at 50% 45%, transparent 0%, rgba(2,2,3,0.35) 65%, rgba(2,2,3,0.88) 100%)'
            }} />

            {/* Ink-reveal entrance — gold scan-line + scrim, one-shot on first mount. */}
            <AnimatePresence>
                {inkRevealActive && (
                    <motion.div
                        key="ink-reveal"
                        className="absolute inset-0 z-[46] pointer-events-none overflow-hidden"
                        data-testid="tree-ink-reveal"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {/* Full-canvas scrim — fades with inkRevealActive */}
                        <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 0.9 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                            style={{ background: 'radial-gradient(ellipse 80% 65% at 50% 45%, rgba(2,3,8,0.75), rgba(1,1,4,0.98))' }}
                        />
                        {/* Top gold hairline that sweeps down, leaving the constellation revealed */}
                        <motion.div
                            className="absolute left-0 right-0 h-[2px]"
                            initial={{ top: '-2%', opacity: 0 }}
                            animate={{ top: ['-2%', '40%', '102%'], opacity: [0, 1, 0] }}
                            transition={{ duration: 0.9, times: [0, 0.55, 1], ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(205,184,138,0.95) 20%, rgba(238,216,160,1) 50%, rgba(205,184,138,0.95) 80%, transparent 100%)',
                                boxShadow: '0 0 18px 4px rgba(205,184,138,0.55), 0 0 36px 10px rgba(205,184,138,0.22)',
                            }}
                        />
                        {/* Echo hairline — follows 120ms behind, thinner */}
                        <motion.div
                            className="absolute left-0 right-0 h-px"
                            initial={{ top: '-4%', opacity: 0 }}
                            animate={{ top: ['-4%', '38%', '100%'], opacity: [0, 0.6, 0] }}
                            transition={{ duration: 0.9, delay: 0.12, times: [0, 0.55, 1], ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(205,184,138,0.45) 50%, transparent 100%)',
                            }}
                        />
                        {/* Editorial grain while the reveal plays */}
                        <motion.div
                            className="absolute inset-0"
                            initial={{ opacity: 0.22 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.95 }}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.40'/%3E%3C/svg%3E")`,
                                backgroundSize: '180px 180px',
                                mixBlendMode: 'overlay',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fetch error banner */}
            {fetchError && (
                <div className="glass-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[45] flex flex-col items-center gap-4 p-8 rounded-2xl shadow-2xl"
                    style={{ maxWidth: 320 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(168,144,96,0.6)" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    <p className="text-white/70 text-sm text-center leading-relaxed">{fetchError}</p>
                    <button
                        onClick={() => { setFetchError(null); window.location.reload(); }}
                        className="glass-card px-4 py-2 rounded-full text-xs font-semibold hover:border-white/20 text-[#A89060]/85 hover:text-[#A89060] fx-pop hover:-translate-y-1"
                    >Retry</button>
                </div>
            )}

            {/* ═══ MOBILE: single unified nav bar (back + path + share) ═══ */}
            {isMobile && (
                <AnimatePresence>
                    {zoomStack.length > 0 && (
                        <motion.div
                            key="mobile-nav-bar"
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            className={`${overlayPos} ${mobileTopOffset} left-0 right-0 z-[40] flex items-center gap-2 px-4 py-2 overflow-hidden`}
                            style={{
                                background: 'linear-gradient(180deg, rgba(4,4,8,0.92) 70%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                paddingTop: 'env(safe-area-inset-top, 6px)',
                            }}
                        >
                            {/* Back button — compact icon+text */}
                            <motion.button
                                onClick={() => window.history.back()}
                                whileTap={{ scale: 0.9 }}
                                className="glass-card flex-none flex items-center gap-2 px-4 py-2 rounded-full fx-pop hover:border-white/20 hover:-translate-y-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
                                style={{
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A89060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                <span className="text-xs font-semibold tracking-wide" style={{ color: '#A89060', fontFamily: "'Manrope', system-ui, sans-serif" }}>Back</span>
                            </motion.button>

                            {/* Depth dots + current node — flex-1 center */}
                            <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                                {/* Depth dots */}
                                <div
                                    className="flex items-center gap-2 flex-shrink-0"
                                    aria-label={`Level ${zoomStack.length}`}
                                    role="status"
                                >
                                    <span className="sr-only">Level {zoomStack.length}</span>
                                    {[...Array(Math.min(zoomStack.length, 4))].map((_, i) => (
                                        <span key={i} aria-hidden="true" className="w-1.5 h-1.5 rounded-full"
                                            style={{ background: i === zoomStack.length - 1 ? '#A89060' : 'rgba(168,144,96,0.3)' }} />
                                    ))}
                                </div>
                                {/* Current node label */}
                                {(() => {
                                    const last = breadcrumbs[breadcrumbs.length - 1];
                                    return last ? (
                                        <span className="glass-card truncate text-xs font-bold tracking-wide px-4 py-2 rounded-full"
                                            style={{ color: '#A89060', maxWidth: '50vw', fontFamily: "'Manrope', system-ui, sans-serif" }}>
                                            {last.label}
                                        </span>
                                    ) : null;
                                })()}
                            </div>

                            {/* Share icon — compact */}
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => {
                                    try { navigator.clipboard.writeText(window.location.href); } catch (e) { console.debug("[non-fatal]", e?.message); }
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                }}
                                aria-label={isCopied ? 'Link copied' : 'Copy path link'}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
                                style={{
                                    background: isCopied ? 'rgba(74,222,128,0.15)' : 'rgba(168,144,96,0.08)',
                                    borderColor: isCopied ? 'rgba(74,222,128,0.45)' : 'rgba(168,144,96,0.28)',
                                }}
                            >
                                {isCopied ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="2 6.5 5 9.5 10 3" />
                                    </svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(168,144,96,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="4" y="4" width="7" height="7" rx="1.5" />
                                        <path d="M8 4V2.5A.5.5 0 0 0 7.5 2H1.5A.5.5 0 0 0 1 2.5v6A.5.5 0 0 0 1.5 9H3" />
                                    </svg>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* ═══ DESKTOP: breadcrumb pill + back button + share (unchanged) ═══ */}
            {!isMobile && (
                <>
                    {/* Breadcrumb pill */}
                    <div className={`${overlayPos} ${topOffset} z-40 inset-x-0 flex justify-center`}>
                        <motion.div
                            role="navigation"
                            aria-label="Current career path"
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="glass-card flex items-center justify-center gap-2 px-6 py-2 rounded-full shadow-2xl pointer-events-auto"
                            style={{
                                maxWidth: 'calc(100vw - clamp(160px, 25vw, 320px))',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.64) 60%)',
                                boxShadow: '0 0 20px rgba(168,144,96,0.1), inset 0 0 14px rgba(168,144,96,0.05)',
                                pointerEvents: zoomStack.length > 0 ? 'auto' : 'none',
                            }}
                        >
                            <span className="text-xs uppercase tracking-[0.24em] text-white/70 mr-2" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>Path</span>
                            <AnimatePresence mode="wait">
                                {zoomStack.length === 0 ? (
                                    <motion.span key="placeholder"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="flex items-center gap-2 px-2 py-0"
                                    >
                                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'rgba(168,144,96,0.35)' }} />
                                        <span className="text-xs uppercase tracking-[0.12em] font-bold" style={{ color: 'rgba(168,144,96,0.6)', fontFamily: "'Manrope', system-ui, sans-serif" }}>
                                            your career path will appear here
                                        </span>
                                    </motion.span>
                                ) : (
                                    <motion.span key="crumbs"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="flex items-center gap-2"
                                    >
                                        {breadcrumbs.map((crumb, i) => {
                                            const isLast = i === breadcrumbs.length - 1;
                                            if (crumb.isEllipsis) return (
                                                <span key="__ellipsis__" className="flex items-center gap-2">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 mx-2">
                                                        <path d="M2 1.5 L5.5 4 L2 6.5" stroke="rgba(168,144,96,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span className="text-[11px] text-white/35 tracking-[1px] px-2">...</span>
                                                </span>
                                            );
                                            return (
                                                <span key={crumb.id} className="flex items-center gap-2">
                                                    {i > 0 && (
                                                        <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0 mx-2">
                                                            <path d="M2 1.5 L5.5 4 L2 6.5" stroke="rgba(168,144,96,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                    <button
                                                        onClick={!isLast && !crumb.isEllipsis ? () => handleBreadcrumbJump(crumb.zoomDepth) : undefined}
                                                        aria-current={isLast ? 'page' : undefined}
                                                        aria-disabled={isLast ? 'true' : undefined}
                                                        tabIndex={isLast ? -1 : 0}
                                                        style={{
                                                            background: isLast ? 'rgba(168,144,96,0.12)' : 'none',
                                                            border: 'none',
                                                            padding: isLast ? '0px 8px 0px 6px' : '0px 4px',
                                                            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            cursor: isLast ? 'default' : 'pointer',
                                                            borderRadius: isLast ? '999px' : undefined,
                                                            fontFamily: "'Manrope', system-ui, sans-serif",
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: isLast ? 6 : 0,
                                                        }}
                                                        className={`text-xs tracking-[0.04em] font-semibold fx-pop leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70 ${
                                                            isLast ? 'text-[#A89060]' : 'text-white/40 hover:text-[#A89060]/70'
                                                        }`}
                                                    >
                                                        {isLast && (
                                                            <motion.span
                                                                aria-hidden="true"
                                                                animate={{ opacity: [1, 0.25, 1] }}
                                                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                                                className="shrink-0 w-1.5 h-1.5 rounded-full"
                                                                style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80, 0 0 4px #1ea853' }}
                                                            />
                                                        )}
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {crumb.label}
                                                        </span>
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.div>
                        {/* Share path button */}
                        <AnimatePresence>
                            {zoomStack.length > 0 && (
                                <motion.button
                                    key="share-btn"
                                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                                    transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                                    onClick={() => {
                                        try { navigator.clipboard.writeText(window.location.href); } catch (e) { console.debug("[non-fatal]", e?.message); }
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }}
                                    className="glass-card ml-2 flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl fx-pop hover:border-white/20 hover:-translate-y-1 pointer-events-auto touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
                                    style={{
                                        background: isCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${isCopied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.10)'}`,
                                        boxShadow: isCopied ? '0 0 8px rgba(74,222,128,0.2)' : 'none',
                                    }}
                                >
                                    {isCopied ? (
                                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="2 6.5 5 9.5 10 3" />
                                        </svg>
                                    ) : (
                                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="rgba(168,144,96,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="4" width="7" height="7" rx="1.5" />
                                            <path d="M8 4V2.5A.5.5 0 0 0 7.5 2H1.5A.5.5 0 0 0 1 2.5v6A.5.5 0 0 0 1.5 9H3" />
                                        </svg>
                                    )}
                                    <span className="text-xs font-bold uppercase tracking-[0.8px]"
                                        style={{ color: isCopied ? '#4ade80' : 'rgba(168,144,96,0.85)' }}>
                                        {isCopied ? 'Copied!' : 'Share'}
                                    </span>
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Back button + depth indicator */}
                    <AnimatePresence>
                        {zoomStack.length > 0 && (
                            <motion.div
                                key="back-row"
                                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                                className={`${overlayPos} ${topOffset} z-[40] flex items-center gap-2`}
                                style={{ left: framed ? '12px' : 'clamp(78px, calc(12vw + 10px), 142px)' }}
                            >
                                <motion.button
                                    onClick={() => window.history.back()}
                                    className="glass-card flex items-center gap-2 px-4 py-2 rounded-full hover:border-white/20 fx-pop group cursor-pointer shadow-2xl touch-manipulation hover:-translate-y-1"
                                    whileHover={{ y: -4 }} whileTap={{ scale: 0.93 }}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                                         className="stroke-[#A89060]/70 group-hover:stroke-[#A89060] transition-colors">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    <span className="text-xs uppercase tracking-[2px] text-white/60 group-hover:text-[#A89060] transition-colors font-semibold" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>Back</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            <AnimatePresence>
                {demandNode && (
                    <>
                        <motion.div
                            key="demand-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.24 }}
                            className="absolute inset-0 z-[78] bg-black/65 backdrop-blur-md"
                            onClick={() => {
                                if (demandSubmitting) return;
                                setDemandNode(null);
                                setDemandSubmitted(false);
                                setDemandError('');
                            }}
                        />
                        <motion.div
                            key="demand-modal"
                            initial={{ opacity: 0, y: 14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute left-1/2 top-1/2 z-[79] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2"
                        >
                            <div className="glass-card rounded-2xl border border-white/15 p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-[#A89060]/90" />
                                    <span className="text-[11px] uppercase tracking-[0.16em] text-[#A89060]/90">Career Demand</span>
                                </div>
                                <p className="text-base font-semibold leading-relaxed text-white">
                                    We are searching for livelihood videos for this career path. Would you like to watch one?
                                </p>
                                <p className="mt-3 text-sm text-white/65">
                                    Selected path: <span className="text-white/85">{demandNode.label}</span>
                                </p>
                                {demandError && (
                                    <p className="mt-4 text-sm text-rose-300">{demandError}</p>
                                )}
                                {demandSubmitted && (
                                    <p className="mt-4 text-sm text-emerald-300">Demand submitted. Team will prioritize this interview.</p>
                                )}
                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (demandSubmitting) return;
                                            setDemandNode(null);
                                            setDemandSubmitted(false);
                                            setDemandError('');
                                        }}
                                        className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 fx-pop hover:-translate-y-1 hover:border-white/30 hover:text-white"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        disabled={demandSubmitting || demandSubmitted}
                                        onClick={handleSubmitDemand}
                                        className="rounded-xl border border-[#A89060]/45 bg-[#A89060]/15 px-4 py-2 text-sm font-semibold text-[#f0e3c5] fx-pop hover:-translate-y-1 hover:bg-[#A89060]/22 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {demandSubmitting ? 'Sending...' : demandSubmitted ? 'Requested' : 'Request Interview (Send Demand)'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Leaf endpoint CTA card */}
            <AnimatePresence>
                {leafToast && (
                    <>
                        {/* Full-screen blur backdrop */}
                        <motion.div
                            key="leaf-backdrop"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="hidden"
                            style={{}}
                        />
                        {/* Centered card */}
                        <motion.div
                            key="leaf-cta"
                            initial={{ opacity: 0, scale: 0.88, x: '-50%' }}
                            animate={{ opacity: 1, scale: 1, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.92, x: '-50%' }}
                            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                            className={`${overlayPos} left-1/2 z-[76] pointer-events-none`}
                            style={{
                                bottom: isMobile ? 'max(16px, env(safe-area-inset-bottom, 0px) + 16px)' : '24px',
                                width: isMobile ? 'min(85vw, 340px)' : 'min(92vw, 420px)',
                                maxWidth: 'calc(100vw - 20px)',
                            }}
                        >
                        <div className="w-full pointer-events-none"
                            style={{ filter: 'drop-shadow(0 16px 64px rgba(0,0,0,0.9))' }}
                        >
                        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#A89060]/80 shrink-0" />
                                    <span className="text-xs uppercase tracking-[0.22em] text-[#A89060]/80 font-bold">Final node</span>
                                </div>
                                <span className="text-xs text-white/50 uppercase tracking-[0.18em]">Auto hide</span>
                            </div>
                            <div className="px-6 py-4">
                                <p className="text-white font-bold text-base leading-snug mb-2">
                                    {leafNode?.emoji || ''} {leafToast}
                                </p>
                                <p className="text-white/70 text-sm leading-relaxed">
                                    This node sits at the end of the current path.
                                </p>
                            </div>
                            <div className="px-6 pb-6">
                                <p className="text-white/50 text-xs">Keeps flowing while you explore.</p>
                            </div>
                        </div>
                        </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Search empty state */}
            {searchQuery.trim() !== '' && visible.filter(v => !v.isRoot).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-[25] pointer-events-none">
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                        padding: '2rem 2.5rem', background: 'rgba(0,0,0,0.55)',
                        borderRadius: 16, border: '1px solid rgba(168,144,96,0.15)', backdropFilter: 'blur(12px)',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="14" cy="14" r="9" stroke="rgba(168,144,96,0.45)" strokeWidth="1.8" />
                            <line x1="21" y1="21" x2="28" y2="28" stroke="rgba(168,144,96,0.45)" strokeWidth="1.8" strokeLinecap="round" />
                            <line x1="10" y1="14" x2="18" y2="14" stroke="rgba(168,144,96,0.3)" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                        <p style={{ color: 'rgba(168,144,96,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
                            No results for &ldquo;{searchQuery.trim()}&rdquo;
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: 0, letterSpacing: '0.05em' }}>
                            Try a different keyword
                        </p>
                    </div>
                </div>
            )}

            {/* SVG Canvas — only render after treeData is loaded to avoid lone-sun flash */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: treeData ? 1 : 0 }} transition={{ duration: 0.5 }}
                className="absolute inset-0" style={{ zIndex: 10, pointerEvents: treeData ? 'auto' : 'none' }}>
                <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                <svg ref={canvasSvgRef} className="absolute inset-0 w-full h-full" viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'auto', touchAction: canAdminPressDrag ? 'none' : 'manipulation' }}>
                    <SvgDefs />
                    <defs>
                        <mask id={threadMaskIdRef.current}>
                            <rect x="0" y="0" width={vbW} height={vbH} fill="white" />
                            {labelCutouts.map((cut) => (
                                <rect
                                    key={`cut-${cut.id}`}
                                    x={cut.x}
                                    y={cut.y}
                                    width={cut.w}
                                    height={cut.h}
                                    rx={Math.max(2, cut.h * 0.12)}
                                    ry={Math.max(2, cut.h * 0.12)}
                                    fill="black"
                                />
                            ))}
                        </mask>
                    </defs>
                    <g mask={`url(#${threadMaskIdRef.current})`}>
                    <AnimatePresence mode="sync">
                        {paths.map((p, i) => (
                            <ThreadPath key={p.id} d={p.d} active={p.active} delay={i} widths={p.widths} />
                        ))}
                    </AnimatePresence>
                    </g>
                    <AnimatePresence mode="sync">
                        {visible.map((item, i) => {
                            const pIdx = item.isRoot ? 0 : ++planetCounter;
                            const nodePlanetIdx = item.visual?.planetIdx;
                            const resolvedPlanetIdx = Number.isFinite(nodePlanetIdx)
                                ? nodePlanetIdx
                                : pIdx;
                            const nodeScale = Number(item.visual?.sizeScale || 1);
                            const baseScale = resolveVisualScaleByCount(visibleNodeCount);
                            const inMirrorPath = !item.isRoot && mirrorPathSet.has(item.node.id);
                            const onNavPath = activePathIdSet.has(item.node.id);
                            const nodeDimmed = focusMirrorActive && !item.isRoot && !inMirrorPath && !onNavPath;
                            return (
                                <motion.g key={item.node.id}
                                    style={{ originX: `${item.pos.x}px`, originY: `${item.pos.y}px` }}
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                    {item.isRoot
                                        ? <SunNode cx={item.pos.x} cy={item.pos.y} onClick={() => handleClick(item.node)} disableAnim={isMobile || shouldReduceMotion} emoji={item.node.emoji || ''}
                                            enablePressDrag={canAdminPressDrag}
                                            isDragging={draggingNodeId === item.node.id}
                                            onPointerDown={(e) => handleNodePointerDown(e, item.node)}
                                            onPointerMove={(e) => handleNodePointerMove(e, item.node)}
                                            onPointerUp={(e) => { handleNodePointerUp(e, item.node); }}
                                            onPointerCancel={handleNodePointerCancel}
                                            isMatched={matchedNodeIds.has(item.node.id)}
                                            matchedNodeIdsCount={matchedNodeIds.size}
                                            isMirrorPath={false}
                                            nodeDimmed={false}
                                        />
                                        : <PlanetNode cx={item.pos.x} cy={item.pos.y} planets={planetDefs} planetIdx={resolvedPlanetIdx} onClick={() => handleClick(item.node)} hasChildren={item.hasChildren} disableAnim={isMobile || shouldReduceMotion}
                                            scale={Math.max(baseScale * nodeScale * mobileAutoNodeScale, mobileMinNodeScale)}
                                            shape={item.visual?.shape || 'planet'}
                                            emoji={item.node.emoji || ''}
                                            enablePressDrag={canAdminPressDrag}
                                            isDragging={draggingNodeId === item.node.id}
                                            onPointerDown={(e) => handleNodePointerDown(e, item.node)}
                                            onPointerMove={(e) => handleNodePointerMove(e, item.node)}
                                            onPointerUp={(e) => { handleNodePointerUp(e, item.node); }}
                                            onPointerCancel={handleNodePointerCancel}
                                            isMatched={matchedNodeIds.has(item.node.id)}
                                            matchedNodeIdsCount={matchedNodeIds.size}
                                            isMirrorPath={inMirrorPath}
                                            nodeDimmed={nodeDimmed}
                                        />
                                    }
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>
                    {/* Keyboard focus ring — dashed rotating circle around focused planet */}
                    {kbFocusId && (() => {
                        const kbItem = visible.find(v => v.node.id === kbFocusId);
                        if (!kbItem || kbItem.isRoot) return null;
                        const pScale = resolveVisualScaleByCount(visibleNodeCount) * mobileAutoNodeScale;
                        const kbPlanetIdx = visible.filter(v => !v.isRoot).findIndex(v => v.node.id === kbFocusId);
                        const pl = getPlanetByIndex(kbPlanetIdx);
                        const ringR = pl.r * pScale + 3.5;
                        return (
                            <circle key="kb-focus-ring"
                                cx={kbItem.pos.x} cy={kbItem.pos.y} r={ringR}
                                fill="none" stroke="white" strokeWidth="0.7"
                                strokeDasharray="2.2 1.8" opacity="0.75">
                                <animateTransform attributeName="transform" type="rotate"
                                    from={`0 ${kbItem.pos.x} ${kbItem.pos.y}`} to={`360 ${kbItem.pos.x} ${kbItem.pos.y}`}
                                    dur="2.8s" repeatCount="indefinite" />
                            </circle>
                        );
                    })()}
                </svg>
                </div>{/* end zoom-inner */}
            </motion.div>

            {/* HTML Labels */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
                <AnimatePresence mode="sync">
                    {(() => {
                        let labelPlanetIdx = -1;
                        const _totalNRC = visible.filter(v => !v.isRoot).length;
                        const planetScale = resolveVisualScaleByCount(_totalNRC) * mobileAutoNodeScale;
                        const cw = cSize.w || 1;
                        const ch = cSize.h || 1;
                        const activePathSet = new Set(activePath);
                        const placedLabels = [];
                        
                        return visible.map((item, vi) => {
                            // Root text is intentionally hidden; breadcrumb provides root context.
                            if (item.isRoot) return null;

                            const svgScale = ch / vbH;
                            const lx = Math.round(item.pos.x / vbW * cw);
                            const ty = Math.round(item.pos.y / vbH * ch);

                            let rPx, labelColor, labelCursor, labelPointer, planetColor = null;
                            labelPlanetIdx++;
                            const nodePlanetIdx = Number.isFinite(item.visual?.planetIdx)
                                ? item.visual.planetIdx
                                : labelPlanetIdx;
                            const pl = getPlanetByIndex(nodePlanetIdx);
                            planetColor = pl.c1;
                            rPx = pl.r * planetScale * Number(item.visual?.sizeScale || 1) * svgScale;
                            labelColor = item.hasChildren ? pl.c1 : '#ccc';
                            labelCursor = 'pointer';
                            labelPointer = 'auto';

                            const rootHaloR = Math.round(rPx * 2.25);
                            // Keep label close to node but add adaptive spacing on dense/small mobile layouts.
                            // Desktop: planet glow/rings extend ~2x rPx visually, push labels well below
                            const LABEL_GAP_PX = isMobile
                                ? clampNum(Math.round(2 + rPx * 0.07 + Math.max(0, _totalNRC - 4) * 0.45), 2, 10)
                                : Math.round(rPx * 1.55 + 8);
                            const offY = Math.round(rPx + LABEL_GAP_PX);

                            const _nrc = _totalNRC;
                            const mobileLabelScale = isMobile
                                ? clampNum(Math.min(cw / mobileBaseW, ch / mobileBaseH) * clampNum(1 - Math.max(0, _nrc - 4) * mobileDensityPenalty, mobileDensityFloorVal, 1), 0.7, 1.08)
                                : 1;
                            // Reserve a hard 44px safe gutter per side on mobile so labels don't collide
                            // with the fixed 36px KineticSidebar rails on narrow screens (e.g., 375px).
                            const mobileDynamicGutter = isMobile
                                ? 44
                                : 0;
                            // On desktop, keep labels away from the right sidebar edge (KineticSidebar ~8px safe zone)
                            const desktopGutter = !isMobile ? 8 : 0;
                            const sidebarGutter = isMobile ? mobileDynamicGutter : desktopGutter;
                            const availW = cw - sidebarGutter * 2;
                            const labelW = isMobile
                                ? Math.min(
                                    Number(labelDefaults.maxWidth || 180),
                                    Math.max(
                                        clampNum(Math.round(Number(labelDefaults.mobileMinWidth || 90) * mobileLabelScale), 64, 240),
                                        Math.floor(availW / Math.max(1, _nrc)) - clampNum(Math.round(Number(labelDefaults.mobileGap || 4) + Math.max(0, (390 - cw) / 140)), 2, 16)
                                    )
                                )
                                : Math.min(
                                    _nrc >= 7
                                        ? Number(labelDefaults.desktopDenseWidth || 100)
                                        : _nrc >= 5
                                            ? Number(labelDefaults.desktopMidWidth || 130)
                                            : Math.min(180, Number(labelDefaults.desktopSparseWidth || 170)),
                                    Math.max(
                                        Number(labelDefaults.minWidth || 80),
                                        Math.round(cw * (_nrc >= 7
                                            ? Number(labelDefaults.desktopDenseRatio || 0.085)
                                            : _nrc >= 5
                                                ? Number(labelDefaults.desktopMidRatio || 0.10)
                                                : Number(labelDefaults.desktopSparseRatio || 0.14)
                                        ))
                                    )
                                );
                            const optimizedLabelW = isMobile && _nrc === 3
                                ? clampNum(Math.round(cw * 0.34), 110, 160)
                                : (isMobile && _nrc === 4
                                    ? clampNum(Math.round(cw * 0.28), 95, 140)
                                    : (isMobile && _nrc <= 6 && _nrc >= 5
                                        ? clampNum(Math.round(cw * 0.22), 80, 110)
                                        : (isMobile && _nrc <= 3 ? Math.max(labelW, 110) : labelW)));
                            const halfLW = Math.round(optimizedLabelW / 2);
                            // Clamp lx within the visible area (outside fixed sidebars)
                            const lxMin = sidebarGutter + halfLW + 4;
                            const lxMax = cw - sidebarGutter - halfLW - 4;
                            const safeLx = Math.round(Math.max(lxMin, Math.min(lx, lxMax)));
                            const rawTop = Math.round(ty + offY);
                            // Dynamic guards for different mobile heights
                            // Trigger compact mode aggressively when there are many planets to prevent label overlap
                            const compactDesktop = !isMobile && (ch < 880 || _nrc >= 4);
                            const bottomGuard = ch - (
                                isMobile
                                    ? Math.max(60, Math.round(ch * 0.10))
                                    : Math.max(80, Math.round(ch * 0.12))
                            );
                            const topMin = isMobile ? Math.max(60, Math.round(ch * 0.10)) : 90;
                            const rawSafe = rawTop;
                            // FIXED: Don't clamp label position if this node is being dragged — keep it with the planet
                            const safeTop = draggingNodeId === item.node.id ? rawTop : Math.max(topMin, Math.min(rawSafe, bottomGuard));
                            const hoverColor = !item.isRoot ? '#fff' : undefined;
                            const clipCount = item.node.sectionId && videoCounts[item.node.sectionId] || 0;
                            const mobileLineClamp = isMobile ? (_nrc >= 7 ? 2 : 4) : 3;
                            // Check if node is on the active path
                            const onActivePath = activePathSet.has(item.node.id);
                            const inMirrorPathLbl = focusMirrorActive && mirrorPathSet.has(item.node.id);
                            const shouldFocusDim = focusMirrorActive && !inMirrorPathLbl && !onActivePath;
                            const shouldDim = (enableHighlightMode && activePathSet.size > 0 && !onActivePath) || shouldFocusDim;
                            const isHoveredLabel = hoveredId === item.node.id;
                            const showSubtitle = isMobile
                                ? (onActivePath || _nrc <= 3 || (cw >= 420 && _nrc <= 5))
                                : (!compactDesktop || onActivePath || isHoveredLabel);
                            const subtitleClamp = isMobile ? (_nrc >= 6 ? 1 : 2) : 2;
                            const effectiveLabelW = optimizedLabelW;
                            const effectiveHalfLW = Math.round(effectiveLabelW / 2);
                            const rawLabelLeft = Math.round(safeLx - effectiveHalfLW);
                            const labelLeft = clampNum(rawLabelLeft, sidebarGutter + 4, cw - sidebarGutter - effectiveLabelW - 4);
                            const labelTop = safeTop;
                            let adjustedLabelLeft = labelLeft;
                            let adjustedLabelTop = labelTop;

                            // Lightweight mobile collision mitigation: nudge X first, then Y if still overlapping.
                            if (isMobile) {
                                const laneThreshold = Math.round(clampNum(30 * mobileLabelScale, 24, 38));
                                for (const prev of placedLabels) {
                                    const nearY = Math.abs(adjustedLabelTop - prev.top) < laneThreshold;
                                    const overlapX = adjustedLabelLeft < prev.left + prev.width && adjustedLabelLeft + effectiveLabelW > prev.left;
                                    if (nearY && overlapX) {
                                        const overlapAmount = (prev.left + prev.width) - adjustedLabelLeft;
                                        const push = Math.round(Math.max(8, overlapAmount + 6));
                                        const direction = safeLx >= cw / 2 ? 1 : -1;
                                        const candidateX = clampNum(
                                            adjustedLabelLeft + direction * push,
                                            sidebarGutter + 4,
                                            cw - sidebarGutter - effectiveLabelW - 4
                                        );
                                        // Check if horizontal nudge actually resolved the overlap
                                        const stillOverlapsX = candidateX < prev.left + prev.width && candidateX + effectiveLabelW > prev.left;
                                        if (stillOverlapsX && nearY) {
                                            // Horizontal nudge hit viewport edge; push down vertically instead
                                            adjustedLabelTop = prev.top + laneThreshold;
                                        } else {
                                            adjustedLabelLeft = candidateX;
                                        }
                                    }
                                }
                                placedLabels.push({ left: adjustedLabelLeft, width: effectiveLabelW, top: adjustedLabelTop });
                            }
                            
                            // Compute adaptive font size based on node density
                            const adaptiveSize = computeAdaptiveTypography(_nrc, isMobile);
                            const effectiveAdaptiveSize = (!isMobile && compactDesktop)
                                ? 'clamp(12px, 0.95vw, 14px)'
                                : adaptiveSize;
                            const hoverTextColor = isHoveredLabel && hoverColor ? hoverColor : (shouldDim ? 'rgba(220,220,226,0.88)' : labelColor);
                            const hoverTextShadow = isHoveredLabel
                                ? (shouldDim
                                    ? '0 1px 4px rgba(0,0,0,0.95), 0 0 8px rgba(140,140,160,0.36)'
                                    : '0 1px 4px rgba(0,0,0,0.95), 0 0 8px rgba(168,144,96,0.4)')
                                : (onActivePath
                                    ? `0 1px 3px rgba(0,0,0,0.9), 0 0 12px ${planetColor}55`
                                    : '0 1px 3px rgba(0,0,0,0.9)');

                            return (
                                <motion.div
                                    key={`lbl-${item.node.id}`}
                                    data-node-label-id={item.node.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: shouldDim ? 0.72 : 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    onPointerUp={!item.isRoot ? () => handleClick(item.node) : undefined}
                                    onMouseEnter={(!item.isRoot && !isMobile) ? () => setHoveredId(item.node.id) : undefined}
                                    onMouseLeave={(!item.isRoot && !isMobile) ? () => setHoveredId(null) : undefined}
                                    onPointerEnter={(!item.isRoot && !isMobile) ? () => setHoveredId(item.node.id) : undefined}
                                    onPointerLeave={(!item.isRoot && !isMobile) ? () => setHoveredId(null) : undefined}
                                    style={{
                                        position: 'absolute',
                                        left: `${adjustedLabelLeft}px`,
                                        width: effectiveLabelW,
                                        top: `${adjustedLabelTop}px`,
                                        zIndex: isHoveredLabel ? 120 : (onActivePath ? 90 : Math.max(20, Math.round(ty / 6))),
                                        textAlign: 'center',
                                        // Adaptive typography based on density
                                        fontSize: effectiveAdaptiveSize,
                                        fontWeight: onActivePath ? 800 : 700,
                                        fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
                                        color: hoverTextColor,
                                        letterSpacing: isMobile ? '0.2px' : '1px',
                                        lineHeight: 1.25,
                                        // Clamp multi-line wrapping: max lines on mobile/desktop
                                        ...(!isHoveredLabel && isMobile ? {
                                            display: '-webkit-box',
                                            WebkitLineClamp: mobileLineClamp,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        } : {
                                            whiteSpace: isHoveredLabel ? 'normal' : undefined,
                                            overflow: isHoveredLabel ? 'visible' : undefined,
                                        }),
                                        textShadow: hoverTextShadow,
                                        ...(isMobile ? { padding: '4px 2px', minHeight: '28px' } : {}),
                                        pointerEvents: labelPointer,
                                        touchAction: 'manipulation',
                                        cursor: labelCursor,
                                        userSelect: 'none',
                                        transform: isHoveredLabel ? 'scale(1.12)' : 'scale(1)',
                                        transformOrigin: 'center top',
                                        transition: 'color 0.18s ease, transform 0.2s ease, text-shadow 0.2s ease, opacity 0.18s ease, font-weight 0.15s ease',
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                    }}
                                    title={`${item.node.label}${item.node.subtitle ? ` - ${item.node.subtitle}` : ''}`}
                                >
                                    {item.node.emoji && !isMobile && <div style={{ fontSize: '1.15em', lineHeight: 1, marginBottom: 2 }}>{item.node.emoji}</div>}
                                    <div>{isMobile && item.node.emoji ? `${item.node.emoji} ${item.node.label}` : item.node.label}</div>
                                    {/* Condensed subtitle on mobile (1 line), full on desktop */}
                                    {!item.isRoot && item.node.subtitle && (showSubtitle || isHoveredLabel) && (
                                        <span style={{
                                            display: isMobile && !isHoveredLabel ? '-webkit-box' : 'block',
                                            marginTop: 2,
                                            fontSize: isMobile ? `${Math.round(clampNum(10 * mobileLabelScale, 9, 12))}px` : 'clamp(11px, 1.0vw, 13px)',
                                            fontWeight: onActivePath ? 600 : 500,
                                            letterSpacing: '0.04em', textTransform: 'none',
                                            color: shouldDim ? 'rgba(245,245,250,0.58)' : 'rgba(255,255,255,0.75)', fontStyle: 'italic',
                                            lineHeight: 1.35,
                                            ...((isMobile || compactDesktop) && !isHoveredLabel ? {
                                                WebkitLineClamp: subtitleClamp,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            } : {}),
                                        }}>{item.node.subtitle}</span>
                                    )}
                                    {!item.isRoot && clipCount > 0 && (!compactDesktop || onActivePath || isHoveredLabel) && (
                                        <span style={{
                                            display: 'block', marginTop: 3, fontSize: 10, fontWeight: onActivePath ? 700 : 600,
                                            letterSpacing: '0.6px',
                                            color: shouldDim
                                                ? 'rgba(214,214,220,0.66)'
                                                : (planetColor ? `${planetColor}cc` : 'rgba(168,144,96,0.76)'),
                                        }}>
                                            &#9654; {clipCount} clip{clipCount === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        });
                    })()}
                </AnimatePresence>
            </div>

            {/* Node Fruit Popup:
                 Desktop → floating tooltip above the node (original behaviour)
                 Mobile  → bottom sheet (slides up from bottom, one-thumb friendly) */}
            <AnimatePresence>
                {hoveredId && (() => {
                    const hItem = visible.find(v => v.node.id === hoveredId);
                    if (!hItem || hItem.isRoot) return null;
                    const cw = cSize.w || 1;
                    const ch = cSize.h || 1;
                    const px = Math.round(hItem.pos.x / vbW * cw);
                    const py = Math.round(hItem.pos.y / vbH * ch);
                    const _n = visible.filter(v => !v.isRoot).length;
                    const pScale = resolveVisualScaleByCount(_n);
                    const hPlanetIdx = visible.filter(v => !v.isRoot).findIndex(v => v.node.id === hoveredId);
                    const pl = getPlanetByIndex(hPlanetIdx);
                    const rPx = pl.r * pScale * (ch / vbH);
                    const clipCount = (hItem.node.sectionId && videoCounts[hItem.node.sectionId]) || 0;
                    const hasVideo = clipCount > 0 || !!buildNodeVideoPayload(hItem.node);
                    const TW = 220;
                    const tooltipX = Math.max(TW / 2 + 8, Math.min(px, cw - TW / 2 - 8));
                    const tooltipY = Math.max(12, py - rPx - 12);

                    // Extract Prize / Price / Voice from node data
                    const prize = hItem.node.prize || hItem.node.salary || hItem.node.outcome || null;
                    const price = hItem.node.price || hItem.node.struggle || hItem.node.reality || null;
                    const voice = hItem.node.quote || hItem.node.voice || hItem.node.testimonial || null;

                    /* ── MOBILE: Bottom Sheet ── */
                    if (isMobile) {
                        return (
                            <>
                                {/* Scrim — tap to dismiss */}
                                <motion.div
                                    key="bottom-sheet-scrim"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    onClick={() => setHoveredId(null)}
                                    style={{
                                        position: 'fixed', inset: 0,
                                        background: 'rgba(0,0,0,0.45)',
                                        zIndex: 200,
                                        touchAction: 'none',
                                    }}
                                />
                                {/* Sheet */}
                                <motion.div
                                    key={`bottom-sheet-${hoveredId}`}
                                    initial={{ y: '100%', opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: '100%', opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                                    style={{
                                        position: 'fixed',
                                        bottom: 0, left: 0, right: 0,
                                        zIndex: 201,
                                        background: 'rgba(5,5,10,0.98)',
                                        backdropFilter: 'blur(24px)',
                                        WebkitBackdropFilter: 'blur(24px)',
                                        borderTop: `1px solid ${pl.c1}45`,
                                        borderRadius: '20px 20px 0 0',
                                        boxShadow: `0 -8px 40px rgba(0,0,0,0.8), 0 0 0 1px ${pl.c1}15`,
                                        overflow: 'hidden',
                                        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                                    }}
                                >
                                    {/* Drag handle */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'center',
                                        paddingTop: 10, paddingBottom: 6,
                                    }}>
                                        <div style={{
                                            width: 36, height: 4, borderRadius: 99,
                                            background: 'rgba(255,255,255,0.18)',
                                        }} />
                                    </div>

                                    {/* Header */}
                                    <div style={{ padding: '6px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: pl.c1, lineHeight: 1.2 }}>
                                                {hItem.node.emoji ? `${hItem.node.emoji} ` : ''}{hItem.node.label}
                                            </p>
                                            {hItem.node.subtitle && (
                                                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                                    {hItem.node.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        {/* Dismiss X */}
                                        <button
                                            onClick={() => setHoveredId(null)}
                                            style={{
                                                flexShrink: 0, marginLeft: 12,
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.08)',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                color: 'rgba(255,255,255,0.6)',
                                                fontSize: 14, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                            aria-label="Close"
                                        >×</button>
                                    </div>

                                    {/* Prize / Price / Voice rows */}
                                    <div style={{ padding: '10px 18px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 1 }}>🏆</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#4ade80', letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Prize</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
                                                {prize || (hItem.hasChildren ? 'Multiple outcome paths inside →' : 'Career endpoint — real destination')}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 18px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 1 }}>⚡</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#f97316', letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Price</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5 }}>
                                                {price || (clipCount > 0 ? `${clipCount} real struggle story${clipCount > 1 ? 's' : ''} recorded` : 'Raw reality — not filtered')}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 18px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: 14, flexShrink: 0, paddingTop: 1 }}>💬</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: `${pl.c1}cc`, letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Voice</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                {voice || (hasVideo ? '"Click to hear the real story"' : '"No interview yet — be the first to request one"')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action bar */}
                                    <div style={{ padding: '10px 18px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10, alignItems: 'center' }}>
                                        {hasVideo ? (
                                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', color: `${pl.c1}cc` }}>
                                                ▶ {clipCount || 1} clip{(clipCount || 1) === 1 ? '' : 's'} · double-tap to watch
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,165,0,0.80)', letterSpacing: '0.3px' }}>
                                                📌 double-tap → request interview
                                            </span>
                                        )}
                                        {hItem.hasChildren && (
                                            <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.75)', fontWeight: 600, letterSpacing: '0.3px', marginLeft: 'auto' }}>
                                                ↓ {hItem.node.children?.length} paths
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            </>
                        );
                    }

                    /* ── DESKTOP: Floating tooltip above the node (unchanged) ── */
                    return (
                        <motion.div
                            key={`popup-${hoveredId}`}
                            initial={{ opacity: 0, y: 8, scale: 0.93 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.93 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                position: 'absolute',
                                left: tooltipX - TW / 2,
                                top: tooltipY - 120,
                                width: TW,
                                pointerEvents: 'none',
                                zIndex: 50,
                            }}
                        >
                            {/* Arrow */}
                            <div style={{
                                position: 'absolute', bottom: -6, left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0, height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid rgba(5,5,10,0.98)',
                            }} />

                            {/* Main card */}
                            <div style={{
                                background: 'rgba(5,5,10,0.98)',
                                backdropFilter: 'blur(18px)',
                                WebkitBackdropFilter: 'blur(18px)',
                                border: `1px solid ${pl.c1}45`,
                                borderRadius: 12,
                                overflow: 'hidden',
                                boxShadow: `0 0 0 1px ${pl.c1}15, 0 16px 40px rgba(0,0,0,0.9), 0 0 24px ${pl.c1}12`,
                            }}>
                                {/* Header */}
                                <div style={{ padding: '9px 12px 7px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: pl.c1, lineHeight: 1.2 }}>
                                        {hItem.node.emoji ? `${hItem.node.emoji} ` : ''}{hItem.node.label}
                                    </p>
                                    {hItem.node.subtitle && (
                                        <p style={{ margin: '2px 0 0', fontSize: 8.5, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                            {hItem.node.subtitle}
                                        </p>
                                    )}
                                </div>

                                {/* Prize row */}
                                <div style={{ padding: '6px 12px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0, paddingTop: 1 }}>🏆</span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: '#4ade80', letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Prize</p>
                                        <p style={{ margin: '1px 0 0', fontSize: 8.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>
                                            {prize || (hItem.hasChildren ? 'Multiple outcome paths inside →' : 'Career endpoint — real destination')}
                                        </p>
                                    </div>
                                </div>

                                {/* Price row */}
                                <div style={{ padding: '6px 12px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 9, flexShrink: 0, paddingTop: 1 }}>⚡</span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: '#f97316', letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Price</p>
                                        <p style={{ margin: '1px 0 0', fontSize: 8.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                                            {price || (clipCount > 0 ? `${clipCount} real struggle story${clipCount > 1 ? 's' : ''} recorded` : 'Raw reality — not filtered')}
                                        </p>
                                    </div>
                                </div>

                                {/* Voice row */}
                                <div style={{ padding: '6px 12px 8px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 9, flexShrink: 0, paddingTop: 1 }}>💬</span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: `${pl.c1}cc`, letterSpacing: '0.18em', textTransform: 'uppercase' }}>The Voice</p>
                                        <p style={{ margin: '1px 0 0', fontSize: 8.5, color: 'rgba(255,255,255,0.60)', lineHeight: 1.4, fontStyle: 'italic' }}>
                                            {voice || (hasVideo ? '"Click to hear the real story"' : '"No interview yet — be the first to request one"')}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer bar */}
                                <div style={{ padding: '5px 12px 7px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {hasVideo ? (
                                        <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.3px', color: `${pl.c1}cc` }}>
                                            ▶ {clipCount || 1} clip{(clipCount || 1) === 1 ? '' : 's'} · click to watch
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,165,0,0.75)', letterSpacing: '0.3px' }}>
                                            📌 click → request interview
                                        </span>
                                    )}
                                    {hItem.hasChildren && (
                                        <span style={{ fontSize: 7.5, color: 'rgba(74,222,128,0.7)', fontWeight: 600, letterSpacing: '0.3px', marginLeft: 'auto' }}>
                                            ↓ {hItem.node.children?.length} paths
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

        </section>
    );
};

export default InteractiveTimeline;
