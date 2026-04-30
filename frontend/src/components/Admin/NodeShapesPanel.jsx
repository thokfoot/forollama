import { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, Smartphone, RefreshCw, Save, Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const COUNTS = [2, 3, 4, 5, 6];

const SPREAD_PRESETS = [
    { key: 'safe',     label: 'Safe',      desc: 'Nodes stay away from edges', marginXRatio: 0.08 },
    { key: 'balanced', label: 'Balanced',  desc: 'Comfortable middle ground',  marginXRatio: 0.035 },
    { key: 'full',     label: 'Full Edge', desc: 'Nodes reach the sides',      marginXRatio: 0.01 },
];

const PLANET_COLORS = [
    '#4FC3F7', '#EF7C5A', '#D4A968', '#E8D090', '#6496DC', '#7ADFE8',
];

/* ────────────────────────────────────────────────────────────
   Coordinate configs — exact mirror of the actual frontend
   Desktop: viewBox 178×100  (16:9 widescreen, yScale=1)
   Mobile:  viewBox 140×280  (390×780 portrait phone, yScale=2.8)
   ─────────────────────────────────────────────────────────── */
const DESKTOP_CFG = {
    VB_W: 178, VB_H: 100,
    ZONE_T: 28,
    ZONE_B: 86,
    SUN_CX: 89, SUN_CY: 22,
    NAV_H: 7.5,
    CRUMB_H: 3,
    SIDEBAR_W: 0,
    DISPLAY_W: 356, DISPLAY_H: 200,
    MINI_W: 68, MINI_H: 38,
    FIT_T: 12.5,
    FIT_B: 86,
};
const MOBILE_CFG = {
    VB_W: 140, VB_H: 280,
    ZONE_T: 78.4,
    ZONE_B: 254.8,
    SUN_CX: 70, SUN_CY: 78.4,
    NAV_H: 32,
    CRUMB_H: 0,
    SIDEBAR_W: 0,
    DISPLAY_W: 156, DISPLAY_H: 312,
    MINI_W: 38, MINI_H: 76,
    FIT_T: 34,
    FIT_B: 254.8,
};

function getCfg(isMobileMode, edgeSpread = 'balanced') {
    const base = isMobileMode ? MOBILE_CFG : DESKTOP_CFG;
    const marginRatio = edgeSpread === 'safe' ? 0.08 : edgeSpread === 'full' ? 0.01 : 0.035;
    const zoneLeft = base.VB_W * marginRatio;
    return {
        ...base,
        ZONE_L: zoneLeft,
        ZONE_R: base.VB_W - zoneLeft,
        SIDEBAR_W: isMobileMode ? zoneLeft : 0,
    };
}
const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));

function tplToSvg(x, y, cfg) {
    return {
        cx: cfg.ZONE_L + (x / 100) * (cfg.ZONE_R - cfg.ZONE_L),
        cy: cfg.ZONE_T + (y / 100) * (cfg.ZONE_B - cfg.ZONE_T),
    };
}

function clientToTpl(svgElem, clientX, clientY, cfg) {
    const rect = svgElem.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * cfg.VB_W;
    const svgY = ((clientY - rect.top) / rect.height) * cfg.VB_H;
    const zw = cfg.ZONE_R - cfg.ZONE_L;
    const zh = cfg.ZONE_B - cfg.ZONE_T;
    return {
        x: Math.round(Math.max(0, Math.min(100, ((svgX - cfg.ZONE_L) / zw) * 100))),
        y: Math.round(Math.max(8, Math.min(92, ((svgY - cfg.ZONE_T) / zh) * 100))),
    };
}

function clientToSunTpl(svgElem, clientX, clientY, cfg, radius) {
    const rect = svgElem.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * cfg.VB_W;
    const svgY = ((clientY - rect.top) / rect.height) * cfg.VB_H;
    const minX = cfg.ZONE_L + radius + 1;
    const maxX = cfg.ZONE_R - radius - 1;
    const minY = cfg.FIT_T + radius + 1;
    const maxY = cfg.FIT_B - radius - 1;
    const safeX = clampNum(svgX, minX, maxX);
    const safeY = clampNum(svgY, minY, maxY);
    return {
        x: Math.round((safeX / cfg.VB_W) * 100),
        y: Math.round((safeY / cfg.VB_H) * 100),
    };
}

function deepClone(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

/* ────────────────────────────────────────────────────────────
   Desktop SVG chrome — nav bar + breadcrumb strip
   Renders inside viewBox "0 0 178 100"
   ─────────────────────────────────────────────────────────── */
function DesktopChrome({ cfg }) {
    const { VB_W, VB_H, NAV_H, CRUMB_H, ZONE_L, ZONE_T, ZONE_R, ZONE_B, FIT_T, FIT_B } = cfg;
    const sepY = NAV_H;
    const crumbY = NAV_H + CRUMB_H;
    return (
        <g>
            <defs>
                <radialGradient id="dsk-bg" cx="50%" cy="20%" r="80%">
                    <stop offset="0%" stopColor="#0c0c18" />
                    <stop offset="100%" stopColor="#020203" />
                </radialGradient>
            </defs>
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#dsk-bg)" />
            {/* Nav bar */}
            <rect x="0" y="0" width={VB_W} height={NAV_H} fill="#0a0a16" />
            {/* Logo pill */}
            <rect x="3" y="2" width="14" height="3.5" rx="0.8" fill="#1a1a28" />
            <circle cx="6" cy="3.75" r="1.2" fill="#F59E0B" opacity="0.7" />
            <rect x="8.5" y="3" width="7" height="1.5" rx="0.4" fill="#444460" />
            {/* Nav tabs */}
            {[['Dashboard', 15], ['Career Tree', 18], ['Videos', 14], ['Settings', 15]].map(([, w], i) => (
                <rect key={i} x={22 + i * 22} y="2.4" width={w} height="3"
                    rx="0.7"
                    fill={i === 1 ? 'rgba(245,158,11,0.18)' : 'transparent'}
                    stroke={i === 1 ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.04)'}
                    strokeWidth="0.3"
                />
            ))}
            {/* Right buttons */}
            <rect x="148" y="2.5" width="11" height="2.8" rx="0.7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            <rect x="161" y="2.5" width="13" height="2.8" rx="0.7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            <line x1="0" y1={sepY} x2={VB_W} y2={sepY} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            {/* Breadcrumb strip */}
            <rect x="0" y={sepY} width={VB_W} height={CRUMB_H} fill="#08080e" opacity="0.6" />
            <text x="5" y={crumbY - 0.6} fontSize="2.2" fill="rgba(255,255,255,0.25)">← Career Records</text>
            <line x1="0" y1={crumbY} x2={VB_W} y2={crumbY} stroke="rgba(255,255,255,0.04)" strokeWidth="0.2" />
            {/* Full fit area (sun + nodes) */}
            <rect x={ZONE_L} y={FIT_T} width={ZONE_R - ZONE_L} height={FIT_B - FIT_T}
                fill="none" stroke="rgba(80,220,255,0.30)" strokeWidth="0.45" rx="1" />
            {/* Children zone boundary */}
            <rect x={ZONE_L} y={ZONE_T} width={ZONE_R - ZONE_L} height={ZONE_B - ZONE_T}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4"
                strokeDasharray="2.5 1.5" rx="1" />
            <text x={ZONE_L + 0.8} y={FIT_T - 0.8} fontSize="2.1" fill="rgba(80,220,255,0.35)">sun + nodes fit area</text>
            <text x={ZONE_L + 0.8} y={ZONE_T - 0.8} fontSize="2.2" fill="rgba(255,255,255,0.2)">children zone</text>
        </g>
    );
}

/* ────────────────────────────────────────────────────────────
   Mobile SVG chrome — nav + left/right video sidebar strips
   Renders inside viewBox "0 0 140 280"
   ─────────────────────────────────────────────────────────── */
function MobileChrome({ cfg }) {
    const { VB_W, VB_H, NAV_H, SIDEBAR_W, ZONE_L, ZONE_T, ZONE_R, ZONE_B, FIT_T, FIT_B } = cfg;
    const thumbW = SIDEBAR_W - 3;
    const thumbH = 28;
    const thumbGap = 4;
    const thumbsStartY = NAV_H + 3;
    const numThumbs = Math.floor((VB_H - thumbsStartY) / (thumbH + thumbGap));
    const thumbs = Array.from({ length: numThumbs }, (_, i) => ({ y: thumbsStartY + i * (thumbH + thumbGap) }));
    return (
        <g>
            <defs>
                <radialGradient id="mob-bg" cx="50%" cy="15%" r="85%">
                    <stop offset="0%" stopColor="#0d0d1c" />
                    <stop offset="100%" stopColor="#020203" />
                </radialGradient>
                <radialGradient id="thumb-l" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#1e1e2e" /><stop offset="100%" stopColor="#0a0a12" />
                </radialGradient>
                <radialGradient id="thumb-r" cx="70%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#1a1e2e" /><stop offset="100%" stopColor="#0a0a12" />
                </radialGradient>
            </defs>
            {/* Background */}
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#mob-bg)" />
            {/* Sidebar backgrounds */}
            <rect x="0" y="0" width={SIDEBAR_W} height={VB_H} fill="#0a0a14" />
            <rect x={VB_W - SIDEBAR_W} y="0" width={SIDEBAR_W} height={VB_H} fill="#0a0a14" />
            {/* Sidebar separators */}
            <line x1={SIDEBAR_W} y1={NAV_H} x2={SIDEBAR_W} y2={VB_H} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
            <line x1={VB_W - SIDEBAR_W} y1={NAV_H} x2={VB_W - SIDEBAR_W} y2={VB_H} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
            {/* Left video thumbnails */}
            {thumbs.map((t, i) => (
                <g key={`lt-${i}`}>
                    <rect x="1.5" y={t.y} width={thumbW} height={thumbH} rx="1.5" fill="url(#thumb-l)" />
                    <rect x="1.5" y={t.y + thumbH - 5} width={thumbW} height="5" rx="1.5" fill="rgba(255,184,48,0.10)" />
                    <circle cx={SIDEBAR_W / 2} cy={t.y + thumbH * 0.42} r="3" fill="rgba(255,255,255,0.09)" />
                </g>
            ))}
            {/* Right video thumbnails */}
            {thumbs.map((t, i) => (
                <g key={`rt-${i}`}>
                    <rect x={VB_W - SIDEBAR_W + 1.5} y={t.y} width={thumbW} height={thumbH} rx="1.5" fill="url(#thumb-r)" />
                    <rect x={VB_W - SIDEBAR_W + 1.5} y={t.y + thumbH - 5} width={thumbW} height="5" rx="1.5" fill="rgba(99,150,220,0.10)" />
                    <circle cx={VB_W - SIDEBAR_W / 2} cy={t.y + thumbH * 0.42} r="3" fill="rgba(255,255,255,0.09)" />
                </g>
            ))}
            {/* Sidebar PREV/NEXT labels */}
            <text x={SIDEBAR_W / 2} y={NAV_H + 10} fontSize="2.6" fill="rgba(255,255,255,0.15)"
                textAnchor="middle">PREV</text>
            <text x={VB_W - SIDEBAR_W / 2} y={NAV_H + 10} fontSize="2.6" fill="rgba(255,255,255,0.15)"
                textAnchor="middle">NEXT</text>
            {/* Nav bar overlay (on top of sidebars) */}
            <rect x="0" y="0" width={VB_W} height={NAV_H} fill="#0a0a18" />
            <line x1="0" y1={NAV_H} x2={VB_W} y2={NAV_H} stroke="rgba(255,255,255,0.07)" strokeWidth="0.4" />
            {/* Back chevron */}
            <polyline
                points={`${SIDEBAR_W + 4},${NAV_H * 0.38} ${SIDEBAR_W + 2},${NAV_H * 0.5} ${SIDEBAR_W + 4},${NAV_H * 0.62}`}
                fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"
            />
            {/* Breadcrumb */}
            <text x={SIDEBAR_W + 7} y={NAV_H * 0.65} fontSize="4.5" fill="rgba(255,255,255,0.5)"
                fontWeight="500">Career Records
            </text>
            {/* Logo */}
            <circle cx={VB_W - SIDEBAR_W - 5} cy={NAV_H * 0.5} r="3.5" fill="#1a1428" />
            <circle cx={VB_W - SIDEBAR_W - 5} cy={NAV_H * 0.5} r="2" fill="#F59E0B" opacity="0.5" />
            {/* Full fit area (sun + nodes) */}
            <rect x={ZONE_L} y={FIT_T} width={ZONE_R - ZONE_L} height={FIT_B - FIT_T}
                fill="none" stroke="rgba(80,220,255,0.36)" strokeWidth="0.8" rx="1.7" />
            {/* Children zone boundary */}
            <rect x={ZONE_L} y={ZONE_T} width={ZONE_R - ZONE_L} height={ZONE_B - ZONE_T}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6"
                strokeDasharray="3 2" rx="1.5" />
            <text x={ZONE_L + 1} y={FIT_T - 1.5} fontSize="3.1" fill="rgba(80,220,255,0.40)">sun + nodes fit area</text>
            <text x={ZONE_L + 1} y={ZONE_T - 1.5} fontSize="3.5" fill="rgba(255,255,255,0.2)">children zone</text>
        </g>
    );
}

/* ────────────────────────────────────────────────────────────
   Mini thumbnail — overview grid
   ─────────────────────────────────────────────────────────── */
function MiniPreview({ tpl, isMobileMode, sunTpl, edgeSpread }) {
    const cfg = getCfg(isMobileMode, edgeSpread);
    const { VB_W, VB_H, SIDEBAR_W, NAV_H, ZONE_L, ZONE_T, ZONE_R, ZONE_B, MINI_W, MINI_H } = cfg;
    const sunR = isMobileMode ? 3.5 : 2.5;
    const minSunX = cfg.ZONE_L + sunR + 1;
    const maxSunX = cfg.ZONE_R - sunR - 1;
    const minSunY = cfg.FIT_T + sunR + 1;
    const maxSunY = cfg.FIT_B - sunR - 1;
    const SUN_CX = clampNum(((sunTpl?.x ?? 50) / 100) * VB_W, minSunX, maxSunX);
    const SUN_CY = clampNum(((sunTpl?.y ?? 20) / 100) * VB_H, minSunY, maxSunY);
    return (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width={MINI_W} height={MINI_H} className="block">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="#0d0d1c" rx="1" />
            {isMobileMode && (
                <>
                    <rect x="0" y="0" width={SIDEBAR_W} height={VB_H} fill="#0a0a14" />
                    <rect x={VB_W - SIDEBAR_W} y="0" width={SIDEBAR_W} height={VB_H} fill="#0a0a14" />
                    <line x1={SIDEBAR_W} y1={NAV_H} x2={SIDEBAR_W} y2={VB_H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <line x1={VB_W - SIDEBAR_W} y1={NAV_H} x2={VB_W - SIDEBAR_W} y2={VB_H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                </>
            )}
            <rect x="0" y="0" width={VB_W} height={NAV_H} fill="#0a0a18" />
            <line x1="0" y1={NAV_H} x2={VB_W} y2={NAV_H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
            <rect x={ZONE_L} y={ZONE_T} width={ZONE_R - ZONE_L} height={ZONE_B - ZONE_T}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={isMobileMode ? '0.8' : '0.5'}
                strokeDasharray="3 2" rx="1" />
            <circle cx={SUN_CX} cy={SUN_CY} r={isMobileMode ? '3.5' : '2.5'} fill="#FFB830" opacity="0.85" />
            {tpl.map((pt, i) => {
                const { cx, cy } = tplToSvg(pt.x, pt.y, cfg);
                const color = PLANET_COLORS[i % PLANET_COLORS.length];
                const midY = (SUN_CY + cy) / 2;
                return (
                    <g key={i}>
                        <path d={`M ${SUN_CX} ${SUN_CY} C ${SUN_CX} ${midY}, ${cx} ${midY}, ${cx} ${cy}`}
                            stroke="#FFB830" strokeWidth={isMobileMode ? '0.8' : '0.5'} fill="none" opacity="0.3" />
                        <circle cx={cx} cy={cy} r={isMobileMode ? '4.5' : '3'} fill={color} opacity="0.85" />
                    </g>
                );
            })}
        </svg>
    );
}

// Mirror of InteractiveTimeline's defaultSiblingTemplate — pure function, no hooks
function defaultTemplate(count, isMobile) {
    const n = Math.max(0, Number(count) || 0);
    if (n <= 0) return [];
    const rowPlan = (() => {
        if (n === 1) return [1]; if (n === 2) return [2]; if (n === 3) return [1, 2];
        if (n === 4) return [2, 2]; if (n === 5) return [2, 3]; if (n === 6) return [1, 2, 3];
        if (n === 7) return [2, 2, 3]; if (n === 8) return [2, 3, 3]; if (n === 9) return [2, 3, 4];
        const rows = []; let rem = n;
        while (rem > 0) { rows.push(Math.min(4, rem)); rem -= rows[rows.length - 1]; }
        return rows;
    })();
    const rowYFractions = (() => {
        const rc = rowPlan.length;
        if (rc <= 1) return [isMobile ? 0.45 : 0.42];
        if (rc === 2) return [isMobile ? 0.28 : 0.3, 0.64];
        if (rc === 3) return [isMobile ? 0.2 : 0.22, isMobile ? 0.46 : 0.48, isMobile ? 0.72 : 0.74];
        if (rc === 4) return [0.16, 0.38, 0.6, 0.82];
        return rowPlan.map((_, i) => 0.14 + (i * (0.74 / Math.max(1, rc - 1))));
    })();
    const getRowSlots = (c) => {
        if (c <= 1) return [0.5]; if (c === 2) return [0.24, 0.76];
        if (c === 3) return [0.12, 0.5, 0.88]; if (c === 4) return [0.08, 0.36, 0.64, 0.92];
        const out = []; for (let i = 0; i < c; i++) out.push(0.08 + (0.84 * i) / Math.max(1, c - 1)); return out;
    };
    const tpl = []; let cursor = 0;
    rowPlan.forEach((countInRow, rowIdx) => {
        const slots = getRowSlots(countInRow);
        const y = Math.min(92, Math.max(8, (rowYFractions[rowIdx] ?? 0.5) * 100));
        for (let col = 0; col < countInRow && cursor < n; col++) {
            tpl.push({ x: Math.min(95, Math.max(5, (slots[col] ?? 0.5) * 100)), y }); cursor++;
        }
    });
    return tpl;
}

/* ──────────────────────────────────────────────────────────
   Main NodeShapesPanel
   ─────────────────────────────────────────────────────────── */
export default function NodeShapesPanel({ layoutConfig, token, onLayoutSaved, showToast }) {
    const [viewMode, setViewMode] = useState('desktop');
    const [selectedCount, setSelectedCount] = useState(2);
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [deskTemplates, setDeskTemplates] = useState({});
    const [moboTemplates, setMoboTemplates] = useState({});
    const [sunDesk, setSunDesk] = useState({ x: 50, y: 20 });
    const [sunMobo, setSunMobo] = useState({ x: 50, y: 20 });
    const [edgeSpread, setEdgeSpread] = useState(() =>
        layoutConfig?.global?.layout?.edgeSpread ?? 'balanced'
    );

    useEffect(() => {
        setDeskTemplates(
            layoutConfig?.global?.siblingTemplates && typeof layoutConfig.global.siblingTemplates === 'object'
                ? deepClone(layoutConfig.global.siblingTemplates) : {}
        );
        setMoboTemplates(
            layoutConfig?.global?.siblingTemplatesMobile && typeof layoutConfig.global.siblingTemplatesMobile === 'object'
                ? deepClone(layoutConfig.global.siblingTemplatesMobile) : {}
        );
        const rawSunDesk = layoutConfig?.global?.sunTemplateDesktop;
        const rawSunMobo = layoutConfig?.global?.sunTemplateMobile;
        setSunDesk({
            x: clampNum(Number(rawSunDesk?.x ?? 50), 5, 95),
            y: clampNum(Number(rawSunDesk?.y ?? 20), 5, 95),
        });
        setSunMobo({
            x: clampNum(Number(rawSunMobo?.x ?? 50), 5, 95),
            y: clampNum(Number(rawSunMobo?.y ?? 20), 5, 95),
        });
        setEdgeSpread(layoutConfig?.global?.layout?.edgeSpread ?? 'balanced');
        setIsDirty(false);
    }, [layoutConfig]);

    const isMobileMode = viewMode === 'mobile';
    const cfg = getCfg(isMobileMode, edgeSpread);
    const templates = isMobileMode ? moboTemplates : deskTemplates;
    const setTemplates = isMobileMode ? setMoboTemplates : setDeskTemplates;
    const sunTpl = isMobileMode ? sunMobo : sunDesk;
    const setSunTpl = isMobileMode ? setSunMobo : setSunDesk;

    const countKey = String(selectedCount);
    const savedTpl = Array.isArray(templates[countKey]) && templates[countKey].length === selectedCount
        ? templates[countKey] : null;
    const fallback = defaultTemplate(selectedCount, isMobileMode);
    const currentTpl = savedTpl || fallback;
    const isCustomized = savedTpl !== null;

    const updatePosition = useCallback((nodeIndex, x, y) => {
        setTemplates((prev) => {
            const base = Array.isArray(prev[countKey]) && prev[countKey].length === selectedCount
                ? prev[countKey] : defaultTemplate(selectedCount, isMobileMode);
            const arr = [...base];
            arr[nodeIndex] = { x: Math.round(Math.max(0, Math.min(100, x))), y: Math.round(Math.max(8, Math.min(92, y))) };
            return { ...prev, [countKey]: arr };
        });
        setIsDirty(true);
    }, [countKey, selectedCount, isMobileMode, setTemplates]);

    const resetToDefault = useCallback(() => {
        setTemplates((prev) => { const n = { ...prev }; delete n[countKey]; return n; });
        setIsDirty(true);
    }, [countKey, setTemplates]);

    const svgRef = useRef(null);
    const draggingRef = useRef(null);

    const handlePointerDown = useCallback((e, nodeIndex) => {
        e.preventDefault();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (e) { console.debug("[non-fatal]", e?.message); }
        draggingRef.current = nodeIndex;
    }, []);

    const handleSvgPointerMove = useCallback((e) => {
        if (draggingRef.current === null || draggingRef.current === undefined) return;
        const svg = svgRef.current;
        if (!svg) return;
        if (draggingRef.current === 'sun') {
            const sunR = isMobileMode ? 4.5 : 3;
            const { x, y } = clientToSunTpl(svg, e.clientX, e.clientY, cfg, sunR);
            setSunTpl({ x, y });
            setIsDirty(true);
            return;
        }
        const { x, y } = clientToTpl(svg, e.clientX, e.clientY, cfg);
        updatePosition(draggingRef.current, x, y);
    }, [updatePosition, cfg, isMobileMode, setSunTpl]);

    const handleSvgPointerUp = useCallback(() => { draggingRef.current = null; }, []);

    const clampSunForCfg = useCallback((sun, c, radius) => {
        const minX = c.ZONE_L + radius + 1;
        const maxX = c.ZONE_R - radius - 1;
        const minY = c.FIT_T + radius + 1;
        const maxY = c.FIT_B - radius - 1;
        const x = clampNum((Number(sun?.x ?? 50) / 100) * c.VB_W, minX, maxX);
        const y = clampNum((Number(sun?.y ?? 20) / 100) * c.VB_H, minY, maxY);
        return {
            x: Math.round((x / c.VB_W) * 100),
            y: Math.round((y / c.VB_H) * 100),
        };
    }, []);

    const handleSave = async () => {
        const nextLayout = deepClone(layoutConfig || {});
        if (!nextLayout.global || typeof nextLayout.global !== 'object') nextLayout.global = {};
        // Node Shapes page is global defaults: enforce linked mode for all pages.
        nextLayout.global.linkedSiblingShapes = true;
        nextLayout.global.linkedSiblingShapesByRoot = {};
        nextLayout.global.siblingTemplates = deskTemplates;
        nextLayout.global.siblingTemplatesMobile = moboTemplates;
        nextLayout.global.sunTemplateDesktop = clampSunForCfg(sunDesk, DESKTOP_CFG, 3);
        nextLayout.global.sunTemplateMobile = clampSunForCfg(sunMobo, MOBILE_CFG, 4.5);
        const preset = SPREAD_PRESETS.find((p) => p.key === edgeSpread);
        nextLayout.global.layout = {
            ...(nextLayout.global.layout || {}),
            edgeSpread,
            marginXRatio: preset?.marginXRatio ?? nextLayout.global.layout?.marginXRatio ?? 0.035,
        };
        try {
            setSaving(true);
            const res = await fetch(`${API}/api/tree-layout`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ layout: nextLayout }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Save failed');
            if (data?.layout && typeof data.layout === 'object') onLayoutSaved(data.layout);
            try {
                if (data?.layout && typeof data.layout === 'object') {
                    localStorage.setItem('cr_layout_config_cache', JSON.stringify(data.layout));
                    window.dispatchEvent(new CustomEvent('cr-layout-updated', { detail: data.layout }));
                }
                localStorage.setItem('cr_layout_updated_at', String(Date.now()));
            } catch (e) { console.debug("[non-fatal]", e?.message); }
            setSavedOk(true);
            setIsDirty(false);
            setTimeout(() => setSavedOk(false), 2200);
            showToast('Node shape templates saved');
        } catch (err) {
            showToast(err.message || 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const { VB_W, VB_H, DISPLAY_W, DISPLAY_H } = cfg;
    const sunR = isMobileMode ? 4.5 : 3;
    const minSunX = cfg.ZONE_L + sunR + 1;
    const maxSunX = cfg.ZONE_R - sunR - 1;
    const minSunY = cfg.FIT_T + sunR + 1;
    const maxSunY = cfg.FIT_B - sunR - 1;
    const SUN_CX = clampNum((sunTpl.x / 100) * VB_W, minSunX, maxSunX);
    const SUN_CY = clampNum((sunTpl.y / 100) * VB_H, minSunY, maxSunY);
    const minSunXPct = Math.round((minSunX / VB_W) * 100);
    const maxSunXPct = Math.round((maxSunX / VB_W) * 100);
    const minSunYPct = Math.round((minSunY / VB_H) * 100);
    const maxSunYPct = Math.round((maxSunY / VB_H) * 100);

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-[#080810]">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-white mb-1">Default Node Shapes</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Set default positions for 2–6 child nodes — desktop and mobile separately.
                        Preview shows the actual frontend layout (nav bar, breadcrumb, mobile sidebars, children zone).
                        All pages with <span className="text-emerald-300">Page Link: On</span> will auto-use these.
                    </p>
                </div>

                {/* Desktop / Mobile toggle */}
                <div className="flex items-center gap-2 mb-5">
                    <button onClick={() => setViewMode('desktop')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium fx-pop ${
                            viewMode === 'desktop'
                                ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'}`}>
                        <Monitor size={13} /> Desktop
                    </button>
                    <button onClick={() => setViewMode('mobile')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium fx-pop ${
                            viewMode === 'mobile'
                                ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'}`}>
                        <Smartphone size={13} /> Mobile
                    </button>
                    <span className="text-xs text-gray-600 ml-1">
                        {isMobileMode
                            ? `Phone 390×780 portrait — viewBox ${VB_W}×${VB_H}`
                            : `Desktop 16:9 — viewBox ${VB_W}×${VB_H}`}
                    </span>
                </div>

                {/* Count selector */}
                <div className="flex items-center gap-2 mb-6">
                    {COUNTS.map((n) => {
                        const hasCustom = Array.isArray(templates[String(n)]) && templates[String(n)].length === n;
                        return (
                            <button key={n} onClick={() => setSelectedCount(n)}
                                className={`relative px-4 py-2 rounded-lg border text-xs font-medium fx-pop ${
                                    selectedCount === n
                                        ? isMobileMode
                                            ? 'border-rose-400/50 bg-rose-500/15 text-rose-200'
                                            : 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                                        : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'}`}>
                                {n} nodes
                                {hasCustom && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
                                        title="Custom template saved" />
                                )}
                            </button>
                        );
                    })}
                    <span className="text-xs text-gray-600 ml-2">{isCustomized ? '● Custom' : '○ Default'}</span>
                </div>

                {/* Editor: SVG + X/Y inputs */}
                <div className="flex gap-6 items-start">

                    {/* Interactive SVG preview — faithful frontend dimensions */}
                    <div className="flex-shrink-0">
                        <p className="text-xs text-gray-500 mb-2">
                            Drag nodes inside the zone
                            {isMobileMode && <span className="text-rose-400/70"> · portrait phone</span>}
                        </p>
                        <div className={`rounded-xl overflow-hidden border ${isMobileMode ? 'border-rose-400/20' : 'border-blue-400/20'}`}
                            style={{ width: DISPLAY_W, height: DISPLAY_H }}>
                            <svg
                                ref={svgRef}
                                viewBox={`0 0 ${VB_W} ${VB_H}`}
                                width={DISPLAY_W} height={DISPLAY_H}
                                className="block select-none"
                                onPointerMove={handleSvgPointerMove}
                                onPointerUp={handleSvgPointerUp}
                                onPointerLeave={handleSvgPointerUp}
                                style={{ touchAction: 'none' }}
                            >
                                {isMobileMode ? <MobileChrome cfg={cfg} /> : <DesktopChrome cfg={cfg} />}

                                {/* Sun */}
                                <circle cx={SUN_CX} cy={SUN_CY} r={sunR}
                                    fill="#FFB830" opacity="0.9" />
                                <circle cx={SUN_CX} cy={SUN_CY} r={isMobileMode ? '8' : '5'}
                                    fill="none" stroke="#FFB830" strokeWidth={isMobileMode ? '0.6' : '0.4'} opacity="0.25" />
                                <circle cx={SUN_CX} cy={SUN_CY} r={isMobileMode ? '10' : '7'}
                                    fill="transparent" cursor="grab"
                                    onPointerDown={(e) => handlePointerDown(e, 'sun')}
                                    style={{ touchAction: 'none' }} />

                                {/* Threads + draggable planets */}
                                {currentTpl.map((pt, i) => {
                                    const { cx, cy } = tplToSvg(pt.x, pt.y, cfg);
                                    const color = PLANET_COLORS[i % PLANET_COLORS.length];
                                    const midY = (SUN_CY + cy) / 2;
                                    const d = `M ${SUN_CX} ${SUN_CY} C ${SUN_CX} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
                                    const pR = isMobileMode ? 5.5 : 3.5;
                                    const hitR = isMobileMode ? 10 : 6;
                                    return (
                                        <g key={i}>
                                            <path d={d} stroke="#FFB830" strokeWidth={isMobileMode ? '0.8' : '0.5'} fill="none" opacity="0.4" />
                                            <circle cx={cx} cy={cy} r={hitR} fill="transparent" cursor="grab"
                                                onPointerDown={(e) => handlePointerDown(e, i)}
                                                style={{ touchAction: 'none' }} />
                                            <circle cx={cx} cy={cy} r={pR} fill={color} opacity="0.92"
                                                style={{ pointerEvents: 'none' }} />
                                            <text x={cx} y={cy + 0.4} textAnchor="middle" dominantBaseline="middle"
                                                fontSize={isMobileMode ? '3.8' : '2.4'} fill="white" fontWeight="bold"
                                                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                                {i + 1}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* X/Y inputs column */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-3">Fine-tune positions (0–100)</p>
                        <div className="mb-3 p-2 rounded-lg border border-amber-400/20 bg-amber-500/[0.06] flex items-center gap-2">
                            <span className="text-[10px] text-amber-200 font-semibold uppercase tracking-wide">Sun</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-100/70 w-3">X</span>
                                <input type="number" min={minSunXPct} max={maxSunXPct} step="1"
                                    value={Math.round((SUN_CX / VB_W) * 100)}
                                    onChange={(e) => { setSunTpl((prev) => ({ ...prev, x: clampNum(Number(e.target.value), minSunXPct, maxSunXPct) })); setIsDirty(true); }}
                                    className="w-14 px-2 py-1 rounded bg-black/25 border border-amber-200/20 text-amber-100 text-xs focus:outline-none focus:border-amber-300/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-100/70 w-3">Y</span>
                                <input type="number" min={minSunYPct} max={maxSunYPct} step="1"
                                    value={Math.round((SUN_CY / VB_H) * 100)}
                                    onChange={(e) => { setSunTpl((prev) => ({ ...prev, y: clampNum(Number(e.target.value), minSunYPct, maxSunYPct) })); setIsDirty(true); }}
                                    className="w-14 px-2 py-1 rounded bg-black/25 border border-amber-200/20 text-amber-100 text-xs focus:outline-none focus:border-amber-300/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <span className="text-[10px] text-amber-100/60">Drag sun directly in preview too</span>
                        </div>
                        <div className="space-y-3">
                            {currentTpl.map((pt, i) => {
                                const color = PLANET_COLORS[i % PLANET_COLORS.length];
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-black"
                                            style={{ background: color }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 w-3">X</span>
                                            <input type="number" min="0" max="100" step="1"
                                                value={pt.x} onChange={(e) => updatePosition(i, Number(e.target.value), pt.y)}
                                                className="w-14 px-2 py-1 rounded bg-white/[0.06] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-amber-400/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500 w-3">Y</span>
                                            <input type="number" min="8" max="92" step="1"
                                                value={pt.y} onChange={(e) => updatePosition(i, pt.x, Number(e.target.value))}
                                                className="w-14 px-2 py-1 rounded bg-white/[0.06] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-amber-400/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                                        </div>
                                        <div className="flex-1 h-1 rounded-full bg-white/[0.06] relative overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full rounded-full fx-pop"
                                                style={{ width: `${pt.x}%`, background: color, opacity: 0.55 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                            {/* Edge Spread preset row */}
                            <div className="mt-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                                    Edge Spread
                                </p>
                                <div className="flex gap-2">
                                    {SPREAD_PRESETS.map((p) => (
                                        <button
                                            key={p.key}
                                            onClick={() => { setEdgeSpread(p.key); setIsDirty(true); }}
                                            title={p.desc}
                                            className={`flex-1 py-2 rounded-lg border text-xs font-medium fx-pop ${
                                                edgeSpread === p.key
                                                    ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                                    : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]'
                                            }`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-2">
                                    {SPREAD_PRESETS.find((p) => p.key === edgeSpread)?.desc}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                                <button onClick={resetToDefault}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 text-gray-400 text-xs hover:bg-white/[0.05] transition-colors">
                                    <RefreshCw size={11} /> Reset
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium fx-pop ${
                                        savedOk
                                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                                            : isDirty
                                                ? 'border-rose-400/60 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 animate-pulse'
                                                : 'border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                    } disabled:opacity-50`}>
                                    {savedOk ? <Check size={11} /> : <Save size={11} />}
                                    {saving ? 'Saving…' : savedOk ? 'Saved!' : isDirty ? '● Save All Templates' : 'Save All Templates'}
                                </button>
                            </div>

                            <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    <span className="text-gray-400 font-medium">Tip:</span>{' '}
                                    The dashed rectangle is the exact children zone on the real frontend.
                                    "Save All Templates" saves both desktop and mobile in one click.
                                    Pages with <span className="text-emerald-400">Page Link: On</span> auto-apply these.
                                </p>
                            </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">
                        {isMobileMode ? 'Mobile' : 'Desktop'} — All Templates Overview
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        {COUNTS.map((n) => {
                            const key = String(n);
                            const tpl = Array.isArray(templates[key]) && templates[key].length === n
                                    ? templates[key] : defaultTemplate(n, isMobileMode);
                            const hasCustom = Array.isArray(templates[key]) && templates[key].length === n;
                            const isActive = n === selectedCount;
                            return (
                                    <button key={n} onClick={() => setSelectedCount(n)}
                                        className={`rounded-xl border p-2 fx-pop ${
                                        isActive
                                            ? isMobileMode
                                                ? 'border-rose-400/40 bg-rose-500/[0.08]'
                                                : 'border-blue-400/40 bg-blue-500/[0.08]'
                                            : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]'
                                        }`} title={`${n} nodes — click to edit`}>
                                        <MiniPreview tpl={tpl} isMobileMode={isMobileMode} sunTpl={sunTpl} edgeSpread={edgeSpread} />
                                        <p className="text-[11px] text-center mt-2 text-gray-500">
                                        {n} nodes
                                        {hasCustom && <span className="ml-1 text-amber-400">●</span>}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
