import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, Radar } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/* ── Scouting Mode Overlay ── shown when allVideos is empty (score < 0.50) */
function ScoutingMode({ nodeId, nodeLabel, visitorDna, onDemand }) {
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [thankYou, setThankYou] = useState(false);

    /* social proof: real demand count + randomized base so it never reads zero */
    /* Lock randomized base to sessionStorage so same user never sees the number change mid-session */
    const [demandCount, setDemandCount] = useState(() => {
        const key = `cri_scout_base_${nodeId}`;
        try {
            const cached = sessionStorage.getItem(key);
            if (cached) return parseInt(cached, 10);
            const base = 12 + Math.floor(Math.random() * 28);
            sessionStorage.setItem(key, String(base));
            return base;
        } catch (_) {
            return 12 + Math.floor(Math.random() * 28);
        }
    });

    useEffect(() => {
        fetch(`${API}/api/demands/stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('cr_admin_token') || ''}` },
        })
            .then(r => r.json())
            .then(data => {
                const node = (data.topNodes || []).find(n => n.nodeId === nodeId);
                if (node?.requests) setDemandCount(c => c + node.requests);
            })
            .catch(() => {});
    }, [nodeId]);

    const handleDemand = () => {
        if (sent) return;
        setSent(true);
        fetch(`${API}/api/demand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nodeId,
                nodeLabel: nodeLabel || nodeId,
                visitorDna: visitorDna || '',
                source: 'scouting_overlay',
            }),
        }).catch(() => {});
        onDemand?.();
    };

    const handleEmailNotify = async () => {
        setEmailError('');
        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError('Enter a valid email');
            return;
        }
        /* Session-guard: one notify per (nodeId, email) per session */
        const guardKey = `cri_notify_sent_${nodeId}`;
        if (sessionStorage.getItem(guardKey)) { setEmailSent(true); setThankYou(true); return; }
        try {
            await fetch(`${API}/api/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: trimmed,
                    visitorDna: visitorDna || '',
                    nodeId: nodeId || '',
                    nodeLabel: nodeLabel || nodeId || '',
                }),
            });
            sessionStorage.setItem(guardKey, '1');
            setEmailSent(true);
            setThankYou(true);
            /* Auto-hide Thank You toast after 3s */
            setTimeout(() => setThankYou(false), 3000);
        } catch (_) {
            setEmailError('Could not save — please try again');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '32px 20px', textAlign: 'center', gap: 16,
            }}
        >
            {/* Pulsing icon */}
            <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(205,184,138,0.18), rgba(45,212,191,0.18))',
                    border: '1.5px solid rgba(45,212,191,0.5)',
                    boxShadow: '0 0 28px rgba(45,212,191,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <Radar size={22} style={{ color: '#2DD4BF' }} />
            </motion.div>

            <p style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase',
                color: '#CDB88A', fontWeight: 700, margin: 0 }}>Scouting Mode</p>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55,
                maxWidth: 220, margin: 0 }}>
                Your unique path is being recorded.
                <br />
                <span style={{ color: '#2DD4BF' }}>Interview demand raised</span> for this specific journey.
            </p>

            {/* Social proof */}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                <Users size={10} style={{ display: 'inline', marginRight: 4 }} />
                {demandCount} other visitors are also looking for a mirror on this path
            </p>

            {/* CTA */}
            <motion.button
                onClick={handleDemand}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                    marginTop: 4,
                    padding: '8px 20px', borderRadius: 99,
                    background: sent ? 'rgba(45,212,191,0.1)' : 'linear-gradient(135deg, rgba(205,184,138,0.18), rgba(45,212,191,0.12))',
                    border: `1px solid ${sent ? 'rgba(45,212,191,0.4)' : 'rgba(205,184,138,0.4)'}`,
                    color: sent ? '#2DD4BF' : '#CDB88A',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                    cursor: sent ? 'default' : 'pointer',
                    textTransform: 'uppercase',
                }}
            >
                {sent ? '✓ Demand Recorded' : 'Raise Interview Demand'}
            </motion.button>

            {/* ── Email notify hook ── */}
            <AnimatePresence mode="wait">
                {thankYou ? (
                    <motion.p
                        key="thank-you"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        style={{ fontSize: 11, color: '#2DD4BF', margin: 0, fontWeight: 600 }}
                    >
                        ✓ You'll be notified when a matching professional joins.
                    </motion.p>
                ) : !emailSent ? (
                    <motion.div
                        key="email-form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ width: '100%', maxWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', margin: 0, letterSpacing: '0.04em' }}>
                            Notify me when a professional with this exact DNA joins.
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleEmailNotify()}
                                placeholder="your@email.com"
                                style={{
                                    flex: 1, minWidth: 0, padding: '6px 10px',
                                    borderRadius: 8, border: `1px solid ${emailError ? 'rgba(251,113,133,0.5)' : 'rgba(255,255,255,0.12)'}`,
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#fff', fontSize: 11, outline: 'none',
                                }}
                            />
                            <button
                                onClick={handleEmailNotify}
                                style={{
                                    padding: '6px 10px', borderRadius: 8,
                                    background: 'rgba(205,184,138,0.15)',
                                    border: '1px solid rgba(205,184,138,0.35)',
                                    color: '#CDB88A', fontSize: 10, fontWeight: 700,
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                }}
                            >Notify</button>
                        </div>
                        {emailError && (
                            <p style={{ fontSize: 9.5, color: '#FB7185', margin: 0 }}>{emailError}</p>
                        )}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
}

/* ── Manual demand button — shown at bottom of every segment list ── */
function ManualDemandButton({ nodeId, nodeLabel, visitorDna }) {
    const [sent, setSent] = useState(false);
    const sessionKey = `cri_demand_sent_${nodeId}`;

    const handle = () => {
        if (sent || sessionStorage.getItem(sessionKey)) return;
        setSent(true);
        sessionStorage.setItem(sessionKey, '1');
        fetch(`${API}/api/demand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nodeId,
                nodeLabel: nodeLabel || nodeId,
                visitorDna: visitorDna || '',
                source: 'manual_button',
            }),
        }).catch(() => {});
    };

    return (
        <motion.button
            onClick={handle}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
                width: '100%', padding: '10px 16px',
                background: 'transparent',
                borderTop: '1px solid rgba(205,184,138,0.12)',
                color: sent ? 'rgba(45,212,191,0.7)' : 'rgba(205,184,138,0.55)',
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em',
                cursor: sent ? 'default' : 'pointer',
                textAlign: 'center', flexShrink: 0,
                transition: 'color 0.2s',
            }}
        >
            {sent ? '✓ Request sent — we will prioritize this journey' : "Don't see your exact mirror? Request a specific interview."}
        </motion.button>
    );
}

const GRADE_META = {
    'A+': { color: '#2DD4BF', label: 'Exceptional Match', pct: '90%+' },
    'A':  { color: '#4ade80', label: 'Strong Match',      pct: '70-89%' },
    'B':  { color: '#818CF8', label: 'Good Match',        pct: '55-69%' },
    'C':  { color: '#F97316', label: 'Partial Match',     pct: '35-54%' },
    'D':  { color: '#FB7185', label: 'Low Match',         pct: '<35%' },
};

const fmtSec = (s) => {
    const m = Math.floor((s || 0) / 60);
    const sec = Math.floor((s || 0) % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* API constant moved to top of file */

/**
 * MirrorVideoPlayer — 70/30 split layout per Gemini Master Spec.
 *
 * Props:
 *   selectedVideo     — { id, title, youtubeId, src, start, end, matchScore, matchGrade }
 *   allVideos         — segment list for the sidebar
 *   onClose           — close handler
 *   onNavigate        — (video) => void — segment click
 *   visitorMirrorProfile — { dna, marks, entry, … }
 */
export default function MirrorVideoPlayer({ selectedVideo, allVideos = [], onClose, onNavigate, visitorMirrorProfile }) {
    const [activeVideo, setActiveVideo] = useState(selectedVideo);
    const [demandCounts, setDemandCounts] = useState({});
    const [isMobile, setIsMobile] = useState(false);
    const iframeRef = useRef(null);

    // Detect mobile
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Sync when parent sends new video
    useEffect(() => { setActiveVideo(selectedVideo); }, [selectedVideo]);

    // Fetch demand counts to show "alive" request counts
    useEffect(() => {
        fetch(`${API}/api/demands/stats`, { headers: { Authorization: `Bearer ${localStorage.getItem('croin_token') || ''}` } })
            .then(r => r.json())
            .then(data => {
                const map = {};
                (data.topNodes || []).forEach(n => { map[n.nodeId] = n.count; });
                setDemandCounts(map);
            })
            .catch(() => {});
    }, []);

    const handleSegmentClick = useCallback((seg) => {
        setActiveVideo(seg);
        onNavigate?.(seg);
    }, [onNavigate]);

    if (!activeVideo) return null;

    const youtubeId = activeVideo.youtubeId || '';
    const startSec = activeVideo.start || 0;
    const embedSrc = youtubeId
        ? `https://www.youtube.com/embed/${youtubeId}?start=${startSec}&autoplay=1&rel=0&modestbranding=1`
        : activeVideo.src || '';

    const grade = activeVideo.matchGrade || 'B';
    const gradeMeta = GRADE_META[grade] || GRADE_META['B'];
    const score = activeVideo.matchScore ? `${Math.round(activeVideo.matchScore * 100)}%` : null;

    // Dimension the DNA matched
    const dnaDimension = (() => {
        if (!visitorMirrorProfile) return null;
        const { marks, entry } = visitorMirrorProfile;
        if (entry === 'donation_management') return '12th-Grade Struggle & Donation Entry';
        if (marks === 'below_60') return 'Below-60% Academic Record';
        if (marks === 'above_80') return 'High-Achiever Path';
        return 'Career DNA';
    })();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(3,3,8,0.97)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
            }}
        >
            {/* ── LEFT / TOP: Player (70% desktop, 100% top on mobile) ── */}
            <div style={{
                flex: isMobile ? 'none' : '0 0 70%',
                height: isMobile ? '52vw' : '100%',
                minHeight: isMobile ? 220 : undefined,
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 14, right: 14, zIndex: 10,
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                    }}
                    aria-label="Close player"
                >
                    <X size={16} />
                </button>

                {/* YouTube embed */}
                {embedSrc ? (
                    <iframe
                        ref={iframeRef}
                        key={`${youtubeId}-${startSec}`}
                        src={embedSrc}
                        title={activeVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ width: '100%', height: isMobile ? '100%' : 'calc(100% - 96px)', border: 'none', flex: 1 }}
                    />
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                        No video available
                    </div>
                )}

                {/* Grade Badge + title — below player on desktop */}
                {!isMobile && (
                    <div style={{ padding: '14px 20px', background: 'rgba(5,5,12,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Grade badge */}
                            <span style={{
                                padding: '3px 10px', borderRadius: 20,
                                background: `${gradeMeta.color}18`,
                                border: `1px solid ${gradeMeta.color}55`,
                                color: gradeMeta.color,
                                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em',
                                boxShadow: `0 0 12px ${gradeMeta.color}30`,
                            }}>
                                Grade {grade} · {score || gradeMeta.pct}
                            </span>
                            {dnaDimension && (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                                    Matched with your <span style={{ color: gradeMeta.color }}>{dnaDimension}</span>
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
                            {activeVideo.title}
                        </p>
                        {startSec > 0 && (
                            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                                Starting at {fmtSec(startSec)}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── RIGHT / BOTTOM: Mirror Segments sidebar (30% desktop) ── */}
            <div style={{
                flex: isMobile ? '1 1 auto' : '0 0 30%',
                background: 'rgba(5,5,12,0.98)',
                borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
                borderTop: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Sidebar header */}
                <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 8.5, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Mirror Segments
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                        {allVideos.length} clip{allVideos.length !== 1 ? 's' : ''} · ranked by DNA match
                    </p>
                </div>

                {/* Segment list — horizontal scroll on mobile */}
                <div style={{
                    flex: 1,
                    overflowX: isMobile ? 'auto' : 'hidden',
                    overflowY: isMobile ? 'hidden' : 'auto',
                    display: isMobile ? 'flex' : 'block',
                    flexDirection: isMobile ? 'row' : undefined,
                    gap: isMobile ? 10 : undefined,
                    padding: isMobile ? '10px 14px' : '8px 0',
                    scrollbarWidth: 'none',
                }}>
                    {allVideos.length === 0 ? (
                        <ScoutingMode
                            nodeId={activeVideo?.nodeId || ''}
                            nodeLabel={activeVideo?.title || ''}
                            visitorDna={visitorMirrorProfile?.dna || ''}
                            onDemand={() => {}}
                        />
                    ) : allVideos.map((seg, idx) => {
                        const isActive = seg.id === activeVideo.id;
                        const segGrade = seg.matchGrade || '—';
                        const segMeta = GRADE_META[segGrade];
                        const segColor = segMeta?.color || 'rgba(255,255,255,0.4)';
                        const demands = seg.nodeId ? (demandCounts[seg.nodeId] || 0) : 0;

                        return (
                            <motion.button
                                key={seg.id || idx}
                                onClick={() => handleSegmentClick(seg)}
                                whileHover={{ x: isMobile ? 0 : 3 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    display: isMobile ? 'flex' : 'flex',
                                    flexDirection: 'column',
                                    flexShrink: isMobile ? 0 : undefined,
                                    width: isMobile ? 180 : '100%',
                                    padding: '12px 18px',
                                    background: isActive ? `${segColor}12` : 'transparent',
                                    borderLeft: isActive && !isMobile ? `2px solid ${segColor}` : '2px solid transparent',
                                    borderBottom: isMobile ? 'none' : '1px solid rgba(255,255,255,0.04)',
                                    borderRadius: isMobile ? 10 : 0,
                                    border: isMobile ? `1px solid ${isActive ? segColor + '55' : 'rgba(255,255,255,0.08)'}` : undefined,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    gap: 5,
                                    transition: 'background 0.15s',
                                }}
                                aria-pressed={isActive}
                            >
                                {/* Top row: grade badge + partial badge + timestamp */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {segMeta && (
                                        <span style={{
                                            fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em',
                                            color: segColor, padding: '1px 6px',
                                            background: `${segColor}18`, borderRadius: 10,
                                            border: `1px solid ${segColor}40`,
                                        }}>
                                            {segGrade}
                                        </span>
                                    )}
                                    {/* Partial Mirror badge — amber tint for isPartialMatch clips */}
                                    {seg.isPartialMatch && (
                                        <span
                                            title={`Partial match: this interview shares ${seg.matchedTraits ?? 'some'} of your core traits but not all. Still relevant to your journey.`}
                                            style={{
                                                fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                                                color: '#F59E0B', padding: '1px 6px',
                                                background: 'rgba(245,158,11,0.12)', borderRadius: 10,
                                                border: '1px solid rgba(245,158,11,0.35)',
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                cursor: 'help',
                                            }}
                                        >
                                            Partial Mirror
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: 11, height: 11, borderRadius: '50%',
                                                border: '1px solid rgba(245,158,11,0.6)',
                                                fontSize: 7, lineHeight: 1, color: '#F59E0B',
                                                flexShrink: 0,
                                            }} aria-label="What is a partial match?">
                                                i
                                            </span>
                                        </span>
                                    )}
                                    {seg.start > 0 && (
                                        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Clock size={9} /> {fmtSec(seg.start)}
                                        </span>
                                    )}
                                    {demands > 0 && (
                                        <span style={{ fontSize: 9, color: 'rgba(255,165,0,0.7)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Users size={9} /> {demands} request{demands !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Segment title */}
                                <p style={{ margin: 0, fontSize: 11.5, fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.65)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                                    {seg.title}
                                </p>

                                {/* Match score bar */}
                                {seg.matchScore != null && (
                                    <div style={{ marginTop: 4, height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.round(seg.matchScore * 100)}%`, background: segColor, borderRadius: 99, opacity: 0.7 }} />
                                    </div>
                                )}

                                {isActive && (
                                    <span style={{ fontSize: 9, color: segColor, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                        ▶ Now playing
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Manual demand button — always shown at bottom of list */}
                {allVideos.length > 0 && (
                    <ManualDemandButton
                        nodeId={activeVideo?.nodeId || ''}
                        nodeLabel={activeVideo?.title || ''}
                        visitorDna={visitorMirrorProfile?.dna || ''}
                    />
                )}

                {/* Mobile grade badge + title below list */}
                {isMobile && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 20, background: `${gradeMeta.color}18`, border: `1px solid ${gradeMeta.color}55`, color: gradeMeta.color, fontSize: 9.5, fontWeight: 700 }}>
                                Grade {grade} · {score || gradeMeta.pct}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{activeVideo.title}</p>
                        {dnaDimension && (
                            <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.4)' }}>
                                Matched: <span style={{ color: gradeMeta.color }}>{dnaDimension}</span>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
