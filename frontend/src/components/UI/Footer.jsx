import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowUp, Check, Send } from 'lucide-react';

const Footer = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newsletterError, setNewsletterError] = useState('');
    const [comingSoon, setComingSoon] = useState(null);

    const exploreLinks = [
        { name: 'Career Tree', to: '/' },
        { name: 'Map your path', to: '/submit' },
        { name: 'Contact us', to: '/contact' },
    ];
    const companyLinks = ['About', 'Ethics', 'Privacy', 'Terms'];
    const socialLabels = ['Twitter', 'LinkedIn', 'Instagram'];

    const handleNewsletterSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!email.trim()) { setNewsletterError('Please enter your email'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setNewsletterError('Enter a valid email'); return; }
        setNewsletterError('');
        setSubmitting(true);
        try {
            const API = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API}/api/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setNewsletterError(data?.detail || 'Could not subscribe right now.');
                setSubmitting(false);
                return;
            }
            setSubmitted(true);
            setEmail('');
            setTimeout(() => setSubmitted(false), 3500);
        } catch {
            setNewsletterError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const triggerComingSoon = (name) => {
        setComingSoon(name);
        setTimeout(() => setComingSoon(null), 1800);
    };

    return (
        <footer className="relative overflow-hidden" style={{ background: '#05060A' }}>
            {/* Top atmospheric divider */}
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(205,184,138,0.40), transparent)' }} />

            {/* Ambient gold bloom from below */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full"
                    style={{ background: 'radial-gradient(ellipse, rgba(205,184,138,0.12) 0%, rgba(205,184,138,0.04) 45%, transparent 75%)', filter: 'blur(40px)' }} />
                {/* Editorial grid */}
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(205,184,138,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(205,184,138,0.04) 1px, transparent 1px)`,
                    backgroundSize: '64px 64px',
                    maskImage: 'radial-gradient(ellipse 78% 60% at 50% 100%, black 18%, transparent 72%)',
                    WebkitMaskImage: 'radial-gradient(ellipse 78% 60% at 50% 100%, black 18%, transparent 72%)',
                }} />
            </div>

            <div className="relative z-[1] max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-12">
                {/* Lead block — editorial */}
                <div className="mb-14 sm:mb-20 max-w-3xl">
                    <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 10.5, letterSpacing: '0.34em' }}>An interactive documentary</span>
                    <h2 className="mt-4 font-display font-semibold tracking-tightest text-balance text-white"
                        style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.4rem)', lineHeight: 1.1 }}>
                        Real journeys, real numbers, <span className="text-gradient">no fluff.</span>
                    </h2>
                    <p className="mt-3 text-white/55 text-[14.5px] max-w-xl leading-relaxed">
                        Career Records Of India documents what actually happened. Use this as context, not guidance — your path will be different.
                    </p>
                </div>

                {/* Top grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-14">
                    {/* Brand */}
                    <div className="lg:col-span-4">
                        <Link to="/" className="inline-flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-gold"
                                style={{ background: 'linear-gradient(135deg, #d8c192 0%, #8a7550 100%)', color: '#1a1410' }}>
                                <span className="font-display font-bold text-[12px] tracking-tightest">CR</span>
                            </div>
                            <span className="font-display text-white/85 text-[15.5px] font-semibold tracking-tightest">Career Records Of India</span>
                        </Link>
                        <p className="mt-5 text-white/52 text-[13.5px] max-w-xs leading-relaxed">
                            Anonymous interviews. Timestamped career segments. Indian context, unfiltered.
                        </p>

                        <div className="mt-6 flex gap-2">
                            {socialLabels.map((name) => (
                                <button
                                    key={name}
                                    onClick={() => triggerComingSoon(name)}
                                    className="relative w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-[#A89060]/12 border border-white/[0.08] hover:border-[#A89060]/30 flex items-center justify-center fx-pop hover:-translate-y-0.5"
                                    aria-label={name}
                                    title={name}
                                >
                                    <span className="text-white/55 hover:text-[#CDB88A] text-[13px] font-bold">{name[0]}</span>
                                    {comingSoon === name && (
                                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 text-[11px] bg-black/85 border border-[#A89060]/22 text-[#CDB88A] px-2.5 py-1 rounded-md whitespace-nowrap z-10">
                                            Coming soon
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Explore */}
                    <div className="lg:col-span-2">
                        <span className="pw-eyebrow text-[#CDB88A]/65 mb-5 block" style={{ fontSize: 10, letterSpacing: '0.28em' }}>Explore</span>
                        <ul className="space-y-3.5">
                            {exploreLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.to}
                                        className="inline-flex items-center gap-1 text-white/68 hover:text-[#CDB88A] text-[13.5px] transition-colors fx-underline"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div className="lg:col-span-2">
                        <span className="pw-eyebrow text-[#CDB88A]/65 mb-5 block" style={{ fontSize: 10, letterSpacing: '0.28em' }}>Company</span>
                        <ul className="space-y-3.5">
                            {companyLinks.map((name) => (
                                <li key={name} className="relative">
                                    <button
                                        onClick={() => triggerComingSoon(name)}
                                        className="text-white/68 hover:text-[#CDB88A] text-[13.5px] text-left transition-colors fx-underline"
                                    >
                                        {name}
                                    </button>
                                    {comingSoon === name && (
                                        <span className="absolute -top-9 left-0 text-[11px] bg-black/85 border border-[#A89060]/22 text-[#CDB88A] px-2.5 py-1 rounded-md whitespace-nowrap z-10">
                                            Coming soon
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="lg:col-span-4">
                        <span className="pw-eyebrow text-[#CDB88A]/65 mb-5 block" style={{ fontSize: 10, letterSpacing: '0.28em' }}>Get the dispatch</span>
                        <p className="text-white/55 text-[13.5px] mb-5 leading-relaxed max-w-xs">
                            Weekly career truths from the Records — unfiltered, no spam.
                        </p>
                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#A89060]/10 border border-[#A89060]/30"
                            >
                                <Check size={14} className="text-[#CDB88A]" />
                                <span className="text-[#CDB88A] text-[12.5px] font-semibold">You’re on the list</span>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3">
                                <div className="relative flex flex-col sm:flex-row gap-2 items-stretch">
                                    <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                                    <input
                                        id="newsletter-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setNewsletterError(''); }}
                                        placeholder="your@email.com"
                                        className={`pw-input flex-1 ${newsletterError ? '!border-[#D07A7A]/55' : ''}`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        data-testid="newsletter-submit-button"
                                        className="pw-btn-primary inline-flex items-center gap-1.5 px-5 py-3 text-[11.5px] uppercase tracking-[0.16em] disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                Joining…
                                            </>
                                        ) : (
                                            <><Send size={12} /> Join</>
                                        )}
                                    </button>
                                </div>
                                {newsletterError && <p className="text-[#D07A7A]/85 text-[12px]">{newsletterError}</p>}
                            </form>
                        )}
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="pw-panel-archival p-5 sm:p-6 mb-10">
                    <p className="text-white/65 text-[13px] text-center leading-relaxed">
                        <span className="text-[#CDB88A] font-semibold">Disclaimer:</span> Career Records does not provide career advice. This platform documents experiences, not recommendations.
                        <span className="text-white/40"> Your path will be different.</span>
                    </p>
                </div>

                {/* Divider hairline */}
                <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />

                {/* Bottom bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                    <p className="text-white/45 text-[12.5px] font-medium">
                        © 2026 Career Records Of India. All rights reserved.
                    </p>
                    <div className="flex gap-5 items-center">
                        <button onClick={() => triggerComingSoon('Privacy Policy')} className="text-white/45 hover:text-[#CDB88A] text-[12.5px] transition-colors">
                            Privacy Policy
                        </button>
                        <button onClick={() => triggerComingSoon('Terms of Service')} className="text-white/45 hover:text-[#CDB88A] text-[12.5px] transition-colors">
                            Terms of Service
                        </button>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="ml-2 w-10 h-10 rounded-full bg-white/[0.04] hover:bg-[#A89060]/12 border border-white/[0.08] hover:border-[#A89060]/30 flex items-center justify-center fx-pop hover:-translate-y-0.5"
                            aria-label="Back to top"
                            title="Back to top"
                        >
                            <ArrowUp size={14} className="text-white/55" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
