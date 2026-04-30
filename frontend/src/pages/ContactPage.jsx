import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Send, Check } from 'lucide-react';
import Navbar from '../components/UI/Navbar';
import Footer from '../components/UI/Footer';
import Magnetic from '../components/Utils/Magnetic';

export default function ContactPage() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
        if (!form.message.trim()) errs.message = 'Message is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (sending) return;
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setSending(true);
        try {
            const API = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    message: form.message.trim(),
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErrors({ submit: data?.detail || 'Could not send right now. Please try again.' });
                setSending(false);
                return;
            }
            setSent(true);
        } catch {
            setErrors({ submit: 'Network error. Please check your connection and try again.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden text-white pw-page-bg">
            <Navbar />
            <div className="page-scroll-below-nav relative">
                {/* Atmospheric backdrop */}
                <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse 70% 55% at 50% 14%, rgba(205,184,138,0.10), transparent 70%), radial-gradient(ellipse 50% 40% at 50% 95%, rgba(20,22,58,0.30), transparent 75%)',
                    }} />
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`,
                        backgroundSize: '180px 180px', opacity: 0.06, mixBlendMode: 'overlay',
                    }} />
                </div>

                <div className="relative z-[1] flex min-h-full flex-col items-center justify-center" style={{ paddingLeft: 'var(--space-x-page)', paddingRight: 'var(--space-x-page)', paddingTop: 'var(--space-y-section)', paddingBottom: 'var(--space-y-section)' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md"
                    >
                        {/* Header */}
                        <div className="text-center" style={{ marginBottom: 'var(--space-y-section)' }}>
                            <span className="pw-eyebrow text-[#CDB88A]" style={{ fontSize: 'clamp(9.5px, 0.9vw, 10.5px)', letterSpacing: '0.34em' }}>Reach out</span>
                            <h1 className="font-display font-semibold text-balance tracking-tightest text-white"
                                style={{ fontSize: 'clamp(1.45rem, min(4vw, 5.2dvh), 2.6rem)', lineHeight: 1.06, marginTop: 'var(--space-y-tight)' }}>
                                Tell us your <span className="text-gradient">story</span>
                            </h1>
                            <p className="text-white/55" style={{ fontSize: 'clamp(0.78rem, min(1vw, 1.4dvh), 0.95rem)', marginTop: 'var(--space-y-tight)', lineHeight: 1.5 }}>
                                Questions, suggestions, partnerships, or your own career story — we read everything.
                            </p>
                        </div>

                        <div className="pw-panel world-form" style={{ padding: 'var(--pad-card-y) var(--pad-card-x)' }}>
                            {sent ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.94 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-col items-center text-center py-6"
                                >
                                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#A89060]/35 bg-[#A89060]/10 shadow-glow-gold">
                                        <Check size={22} className="text-[#CDB88A]" />
                                    </div>
                                    <p className="font-display font-semibold text-white tracking-tightest" style={{ fontSize: 'clamp(1.05rem, min(1.6vw, 2.2dvh), 1.35rem)' }}>Message sent</p>
                                    <p className="text-white/55" style={{ fontSize: 'clamp(0.78rem, 1vw, 0.92rem)', marginTop: 'var(--space-y-tight)' }}>Thanks for writing in. We’ll respond within 48 hours.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 'var(--gap-form)' }} noValidate>
                                    <div className="sr-only" aria-live="polite" aria-atomic="true">{Object.values(errors).filter(Boolean).join('. ')}</div>
                                    <div>
                                        <label htmlFor="contact-name" className="mb-2 block">Name</label>
                                        <input
                                            id="contact-name"
                                            type="text" required
                                            value={form.name}
                                            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })); }}
                                            placeholder="Your name"
                                            aria-invalid={Boolean(errors.name)}
                                            className={`pw-input ${errors.name ? '!border-[#D07A7A]/60' : ''}`}
                                        />
                                        {errors.name && <p className="mt-1.5 text-[12px] text-[#D07A7A]/85">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="contact-email" className="mb-2 block">Email</label>
                                        <input
                                            id="contact-email"
                                            required type="email"
                                            value={form.email}
                                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: undefined })); }}
                                            placeholder="you@email.com"
                                            aria-invalid={Boolean(errors.email)}
                                            className={`pw-input ${errors.email ? '!border-[#D07A7A]/60' : ''}`}
                                        />
                                        {errors.email && <p className="mt-1.5 text-[12px] text-[#D07A7A]/85">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="contact-message" className="mb-2 block">Message</label>
                                        <textarea
                                            id="contact-message"
                                            required rows={5}
                                            value={form.message}
                                            onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: undefined })); }}
                                            placeholder="Write your message…"
                                            aria-invalid={Boolean(errors.message)}
                                            className={`pw-input resize-none ${errors.message ? '!border-[#D07A7A]/60' : ''}`}
                                        />
                                        {errors.message && <p className="mt-1.5 text-[12px] text-[#D07A7A]/85">{errors.message}</p>}
                                    </div>
                                    <Magnetic className="mt-1">
                                        <button
                                            type="submit"
                                            disabled={sending}
                                            data-testid="contact-submit-button"
                                            className="w-full pw-btn-primary inline-flex items-center justify-center gap-2 uppercase tracking-[0.18em] disabled:opacity-50 disabled:cursor-not-allowed" style={{ padding: 'clamp(0.7rem, 1.6dvh, 1.05rem) 1.5rem', fontSize: 'clamp(11px, 1vw, 12.5px)' }}
                                        >
                                            {sending ? (
                                                <>
                                                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                    Sending…
                                                </>
                                            ) : (
                                                <>Send message <Send size={13} /></>
                                            )}
                                        </button>
                                    </Magnetic>
                                    {errors.submit && (
                                        <p role="alert" className="text-center text-[12px] text-[#D07A7A]/85 mt-1" data-testid="contact-submit-error">
                                            {errors.submit}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>

                        <p className="text-center text-white/35" style={{ fontSize: 'clamp(0.72rem, 0.85vw, 0.8rem)', marginTop: 'var(--space-y-section)' }}>
                            Or email directly:{' '}
                            <a
                                href="mailto:hello@careerrecords.in"
                                className="text-[#CDB88A]/80 hover:text-[#CDB88A] underline underline-offset-2 transition-colors"
                            >
                                hello@careerrecords.in
                            </a>
                        </p>
                    </motion.div>
                </div>

                {/* Footer — mounted below the form, accessible via scroll */}
                <Footer />
            </div>
        </div>
    );
}
