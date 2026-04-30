/**
 * VideoPlayerPage — Deep-link Mirror handler
 *
 * URL: /mirror/:interviewId?seg=<segmentId>&dna=<base64VisitorDna>
 *
 * Handshake:
 *  1. Decode `dna` param from Base64 (URL-safe)
 *  2. Inject decoded dna into localStorage (cr_saved_profile) + app state
 *  3. Fetch interview record from GET /api/interview/:interviewId
 *  4. Find the segment matching `seg` param → auto-seek to its startSec
 *  5. Show "Mirror Identity Recovered. Playing your segment." context toast
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

/* ── Utility: safe Base64-url decode ── */
function safeDecodeDna(b64) {
    if (!b64) return '';
    try {
        // Base64-url safe → standard Base64
        const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
        return atob(standard).trim().toUpperCase().slice(0, 7);  // Rev 6: up to 7 chars
    } catch {
        // Maybe it was passed raw (ADACDB / ADACDBC style) — accept as-is
        const raw = b64.trim().toUpperCase();
        if (/^[ABCD]{6,7}$/.test(raw)) return raw;
        return '';
    }
}

/* ── Inject profile into localStorage so the tree lights up ── */
function injectProfile(dna) {
    if (!dna || dna.length < 6) return;  // accept 6-char (legacy) or 7-char (Rev 6)
    try {
        const existing = JSON.parse(localStorage.getItem('cr_saved_profile') || '{}');
        const merged = { ...existing, bridge: dna, deepLink: true, recoveredAt: Date.now() };
        localStorage.setItem('cr_saved_profile', JSON.stringify(merged));
    } catch { /* storage blocked */ }
}

/* ── Tiny toast component ── */
function ContextToast({ message, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 4000);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
                zIndex: 9999,
                background: 'rgba(5,5,10,0.96)',
                border: '1px solid rgba(45,212,191,0.45)',
                boxShadow: '0 0 24px rgba(45,212,191,0.25)',
                borderRadius: 99,
                padding: '9px 20px',
                display: 'flex', alignItems: 'center', gap: 8,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ fontSize: 13, color: '#2DD4BF' }}>✦</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
                {message}
            </span>
        </motion.div>
    );
}

/* ── YouTube embed with autoplay + seek ── */
function YoutubePlayer({ youtubeId, startSec }) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const src = `https://www.youtube.com/embed/${youtubeId}`
        + `?autoplay=1&start=${Math.max(0, Math.floor(startSec || 0))}`
        + `&enablejsapi=1&origin=${encodeURIComponent(origin)}&rel=0&modestbranding=1`;

    return (
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
            <iframe
                src={src}
                title="Mirror Interview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
        </div>
    );
}

export default function VideoPlayerPage() {
    const { interviewId } = useParams();
    const [searchParams] = useSearchParams();
    const segParam = searchParams.get('seg') || '';
    const dnaParam = searchParams.get('dna') || '';

    const [interview, setInterview] = useState(null);
    const [activeClip, setActiveClip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [dna, setDna] = useState('');

    const dismissToast = useCallback(() => setToast(''), []);

    useEffect(() => {
        /* ── 1. Decode DNA + inject into localStorage ── */
        const decoded = safeDecodeDna(dnaParam);
        if (decoded) {
            setDna(decoded);
            injectProfile(decoded);
        }

        /* ── 2. Fetch interview ── */
        const url = `${API}/api/interview/${encodeURIComponent(interviewId || '')}`;
        fetch(url)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                setInterview(data);

                /* ── 3. Find target segment ── */
                const clips = data.clips || [];
                let target = null;
                if (segParam) {
                    target = clips.find(c => c.id === segParam || c.phase === segParam) || null;
                }
                // Fallback: first clip
                setActiveClip(target || clips[0] || null);

                /* ── 4. Show context toast ── */
                if (decoded || segParam) {
                    setToast('Mirror Identity Recovered. Playing your segment.');
                }
            })
            .catch(err => {
                console.error('[VideoPlayerPage]', err);
                setError('This mirror link could not be loaded. The interview may have moved.');
            })
            .finally(() => setLoading(false));
    }, [interviewId, segParam, dnaParam]);

    /* ─── RENDER: Loading ─── */
    if (loading) {
        return (
            <div style={{
                minHeight: '100dvh', background: '#07060c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '2px solid rgba(45,212,191,0.2)',
                        borderTopColor: '#2DD4BF',
                    }}
                />
            </div>
        );
    }

    /* ─── RENDER: Error ─── */
    if (error || !interview) {
        return (
            <div style={{
                minHeight: '100dvh', background: '#07060c',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
            }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                    {error || 'Interview not found.'}
                </p>
                <Link
                    to="/"
                    style={{
                        padding: '8px 20px', borderRadius: 99,
                        border: '1px solid rgba(205,184,138,0.35)',
                        color: '#CDB88A', fontSize: 12, textDecoration: 'none',
                    }}
                >
                    ← Back to Career Records
                </Link>
            </div>
        );
    }

    const clips = interview.clips || [];

    /* ─── RENDER: Player ─── */
    return (
        <div style={{ minHeight: '100dvh', background: '#07060c', color: '#fff' }}>
            {/* Context Toast */}
            <AnimatePresence>
                {toast && <ContextToast key="ctx-toast" message={toast} onDone={dismissToast} />}
            </AnimatePresence>

            {/* Navbar strip */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                height: 52, background: 'rgba(7,6,12,0.9)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        border: '1px solid rgba(205,184,138,0.4)',
                        background: 'rgba(205,184,138,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: '#CDB88A', letterSpacing: '-0.02em',
                    }}>CR</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>
                        Career Records Of India
                    </span>
                </Link>

                {dna && (
                    <span style={{
                        marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        color: 'rgba(45,212,191,0.6)',
                        padding: '3px 8px', borderRadius: 99,
                        border: '1px solid rgba(45,212,191,0.2)',
                        background: 'rgba(45,212,191,0.06)',
                    }}>
                        DNA: {dna}
                    </span>
                )}
            </div>

            {/* Main layout */}
            <div style={{
                paddingTop: 68, maxWidth: 960, margin: '0 auto', padding: '68px 20px 40px',
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 24,
            }}
                className="mirror-player-grid"
            >
                {/* Left: Player + meta */}
                <div>
                    {/* Interview title */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: '#CDB88A', margin: '0 0 4px', fontWeight: 700 }}>
                            Mirror Interview
                        </p>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                            {interview.title || interview.professionalName || 'Career Mirror'}
                        </h1>
                        {interview.persona && (
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                                {interview.persona}
                            </p>
                        )}
                    </div>

                    {/* Player */}
                    {activeClip?.youtubeId ? (
                        <YoutubePlayer
                            youtubeId={activeClip.youtubeId}
                            startSec={activeClip.startSec || activeClip.start || 0}
                        />
                    ) : (
                        <div style={{
                            paddingTop: '56.25%', background: 'rgba(255,255,255,0.04)',
                            borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)',
                            display: 'grid', placeItems: 'center', position: 'relative',
                        }}>
                            <p style={{ position: 'absolute', inset: 0, display: 'grid',
                                placeItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                                No video available for this segment.
                            </p>
                        </div>
                    )}

                    {/* Active segment info */}
                    {activeClip && (
                        <motion.div
                            key={activeClip.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: 16, padding: '12px 16px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 10,
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#2DD4BF',
                                letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                                {activeClip.phase || 'Segment'}
                            </p>
                            {activeClip.verdict && (
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)',
                                    lineHeight: 1.5, fontStyle: 'italic' }}>
                                    "{activeClip.verdict}"
                                </p>
                            )}
                            <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                {Math.floor((activeClip.startSec || 0) / 60)}:{String((activeClip.startSec || 0) % 60).padStart(2, '0')}
                                {' → '}
                                {Math.floor((activeClip.endSec || 0) / 60)}:{String((activeClip.endSec || 0) % 60).padStart(2, '0')}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Right: Segment list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.20em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                        All Segments ({clips.length})
                    </p>
                    {clips.map(clip => {
                        const isActive = clip.id === activeClip?.id;
                        return (
                            <motion.button
                                key={clip.id}
                                onClick={() => setActiveClip(clip)}
                                whileHover={{ x: 3 }}
                                style={{
                                    textAlign: 'left', cursor: 'pointer',
                                    padding: '10px 12px', borderRadius: 8,
                                    background: isActive ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isActive ? 'rgba(45,212,191,0.35)' : 'rgba(255,255,255,0.07)'}`,
                                    display: 'flex', flexDirection: 'column', gap: 2,
                                    transition: 'background 0.15s, border-color 0.15s',
                                }}
                            >
                                <span style={{ fontSize: 10, fontWeight: 700,
                                    color: isActive ? '#2DD4BF' : 'rgba(255,255,255,0.7)',
                                    letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    {clip.phase || clip.id}
                                </span>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                                    {Math.floor((clip.startSec || 0) / 60)}:{String((clip.startSec || 0) % 60).padStart(2, '0')}
                                </span>
                                {clip.verdict && (
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)',
                                        fontStyle: 'italic', marginTop: 2,
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                        "{clip.verdict}"
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}

                    {/* Back to tree */}
                    <Link
                        to="/"
                        style={{
                            marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 12px', borderRadius: 8,
                            border: '1px solid rgba(205,184,138,0.2)',
                            color: 'rgba(205,184,138,0.6)', fontSize: 10, textDecoration: 'none',
                            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
                        }}
                    >
                        ← Back to Career Tree
                    </Link>
                </div>
            </div>

            {/* Responsive: collapse sidebar on mobile */}
            <style>{`
                @media (max-width: 680px) {
                    .mirror-player-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
