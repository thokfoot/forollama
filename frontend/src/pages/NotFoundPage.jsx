import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/UI/Navbar';
import Magnetic from '../components/Utils/Magnetic';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden text-white pw-page-bg">
            <Navbar />
            <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden text-center" style={{ paddingLeft: 'var(--space-x-page)', paddingRight: 'var(--space-x-page)' }}>
                {/* Atmospheric backdrop */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(205,184,138,0.12), transparent 70%)',
                    }} />
                </div>

                {/* Orbital rings */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{ width: 'clamp(180px, 36vw, 320px)', height: 'clamp(180px, 36vw, 320px)', borderRadius: '50%', border: '1px solid rgba(205,184,138,0.14)' }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{ width: 'clamp(280px, 56vw, 480px)', height: 'clamp(280px, 56vw, 480px)', borderRadius: '50%', border: '1px solid rgba(205,184,138,0.08)' }}
                />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{ width: 'clamp(380px, 80vw, 700px)', height: 'clamp(380px, 80vw, 700px)', borderRadius: '50%', border: '1px solid rgba(205,184,138,0.04)' }}
                />

                {/* Eyebrow */}
                <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.45 }}
                    className="pw-eyebrow text-[#CDB88A] relative z-[1]"
                    style={{ fontSize: 'clamp(9.5px, 0.9vw, 10.5px)', letterSpacing: '0.34em', marginBottom: 'var(--space-y-tight)' }}
                >
                    Lost in the cosmos
                </motion.span>

                {/* 404 number */}
                <motion.h1
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="font-display font-bold leading-tightest tracking-tightest relative z-[1]"
                    style={{
                        fontSize: 'clamp(4rem, min(15vw, 22dvh), 10rem)', lineHeight: 0.95,
                        background: 'linear-gradient(140deg, #f7eed7 0%, #d6bf8a 38%, #a78a52 70%, #6e5a36 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 8px 36px rgba(205,184,138,0.20))',
                    }}
                >
                    404
                </motion.h1>

                {/* Title */}
                <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-[1] font-display text-white font-semibold tracking-tightest" style={{ fontSize: 'clamp(1.15rem, min(2.4vw, 3.2dvh), 1.85rem)', marginTop: 'var(--space-y-tight)' }}
                >
                    Path not found
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.28, ease: 'easeOut' }}
                    className="relative z-[1] max-w-md text-white/55" style={{ fontSize: 'clamp(0.78rem, min(1vw, 1.4dvh), 0.9rem)', marginTop: 'var(--space-y-tight)', lineHeight: 1.5 }}
                >
                    The page you were looking for has drifted off the map.<br />
                    <span className="text-white/35">Maybe it never existed. Or maybe it pivoted.</span>
                </motion.p>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-[1]" style={{ marginTop: 'var(--space-y-section)' }}
                >
                    <Magnetic className="inline-block">
                        <button
                            onClick={() => navigate('/')}
                            className="pw-btn-primary inline-flex items-center gap-2 uppercase tracking-[0.18em]" style={{ padding: 'clamp(0.7rem, 1.6dvh, 1rem) clamp(1.4rem, 3vw, 2rem)', fontSize: 'clamp(11px, 1vw, 12.5px)' }}
                        >
                            <ArrowLeft size={13} /> Back to home
                        </button>
                    </Magnetic>
                </motion.div>
            </div>
        </div>
    );
}
