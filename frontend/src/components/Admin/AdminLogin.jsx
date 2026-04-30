import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Lock, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createFocusTrap } from '../../lib/accessibility';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function AdminLogin({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [view, setView] = useState('login'); // login | firstLogin | forgot | forgotSent
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');
    const modalRef = useRef(null);

    const reset = () => {
        setView('login'); setUsername(''); setPassword(''); setNewPassword('');
        setConfirmPassword(''); setEmail(''); setForgotEmail('');
        setError(''); setLoading(false); setShowPass(false);
    };

    const handleClose = () => { reset(); onClose(); };

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const trap = createFocusTrap(modalRef.current);
        trap.initialFocus();

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
                return;
            }
            trap.handleKeyDown(e);
        };

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    /* ── Login ── */
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            if (data.firstLogin) {
                setToken(data.token);
                setView('firstLogin');
            } else {
                localStorage.setItem('cr_admin_token', data.token);
                handleClose();
                navigate('/admin');
            }
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    /* ── First-time password change ── */
    const handleFirstLogin = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ newPassword, email: email || undefined })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update password');

            localStorage.setItem('cr_admin_token', data.token);
            handleClose();
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    /* ── Forgot password ── */
    const handleForgot = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
            setView('forgotSent');
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[200] flex items-center justify-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/72 backdrop-blur-md" onClick={handleClose} />

                {/* Modal */}
                <motion.div
                    ref={modalRef}
                    className="relative w-full max-w-md mx-3 sm:mx-4 pw-panel overflow-hidden"
                    initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-login-title"
                >
                    {/* Header glow */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

                    {/* Close */}
                    <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors" aria-label="Close admin login modal">
                        <X size={20} />
                    </button>

                    <div className="p-6 sm:p-8">
                        <AnimatePresence mode="wait">
                            {/* ════ LOGIN VIEW ════ */}
                            {view === 'login' && (
                                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                                            <Lock size={20} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h2 id="admin-login-title" className="text-lg font-semibold text-white">Admin Access</h2>
                                            <p className="text-xs text-gray-500">Career tree management</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-4 world-form">
                                        <div>
                                            <label htmlFor="admin-login-username" className="pw-label mb-2 block">Username</label>
                                            <input id="admin-login-username" value={username} onChange={e => setUsername(e.target.value)}
                                                className="pw-input text-sm"
                                                placeholder="Enter username" autoFocus />
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="admin-login-password" className="pw-label mb-2 block">Password</label>
                                            <input id="admin-login-password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                                className="pw-input text-sm pr-12"
                                                placeholder="Enter password" />
                                            <button type="button" onClick={() => setShowPass(!showPass)}
                                                className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-300">
                                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>

                                        {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                                        <button type="submit" disabled={loading || !username || !password}
                                            className="w-full py-4 pw-btn-primary text-sm disabled:opacity-45 disabled:cursor-not-allowed">
                                            {loading ? 'Signing in…' : 'Sign In'}
                                        </button>
                                    </form>

                                    <button onClick={() => { setError(''); setView('forgot'); }}
                                        className="mt-4 text-xs text-gray-500 hover:text-amber-400 transition-colors w-full text-center">
                                        Forgot password?
                                    </button>
                                </motion.div>
                            )}

                            {/* ════ FIRST LOGIN — Change Password ════ */}
                            {view === 'firstLogin' && (
                                <motion.div key="firstLogin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                            <KeyRound size={20} className="text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-white">Welcome!</h2>
                                            <p className="text-xs text-gray-500">Set your new password</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-5">This is your first login. Please change the default password and optionally add a recovery email.</p>

                                    <form onSubmit={handleFirstLogin} className="space-y-4 world-form">
                                        <div>
                                            <label htmlFor="admin-first-new-password" className="pw-label mb-2 block">New Password</label>
                                            <input id="admin-first-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                                className="pw-input text-sm"
                                                placeholder="Min 6 characters" autoFocus />
                                        </div>
                                        <div>
                                            <label htmlFor="admin-first-confirm-password" className="pw-label mb-2 block">Confirm Password</label>
                                            <input id="admin-first-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                                className="pw-input text-sm"
                                                placeholder="Re-enter password" />
                                        </div>
                                        <div>
                                            <label htmlFor="admin-first-recovery-email" className="pw-label mb-2 block">
                                                Recovery Email <span className="text-gray-600">(optional)</span>
                                            </label>
                                            <input id="admin-first-recovery-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                                className="pw-input text-sm"
                                                placeholder="For password recovery" />
                                        </div>

                                        {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                                        <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                                            className="w-full py-4 pw-btn-primary text-sm disabled:opacity-45 disabled:cursor-not-allowed">
                                            {loading ? 'Saving…' : 'Set Password & Continue'}
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* ════ FORGOT PASSWORD ════ */}
                            {view === 'forgot' && (
                                <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <button onClick={() => { setError(''); setView('login'); }}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-4 transition-colors">
                                        <ArrowLeft size={14} /> Back to login
                                    </button>

                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                            <Mail size={20} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-white">Reset Password</h2>
                                            <p className="text-xs text-gray-500">Enter your recovery email</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleForgot} className="space-y-4 world-form">
                                        <div>
                                            <label htmlFor="admin-forgot-email" className="pw-label mb-2 block">Recovery Email</label>
                                            <input id="admin-forgot-email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                                className="pw-input text-sm"
                                                placeholder="Enter registered email" autoFocus />
                                        </div>

                                        {error && <p className="text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                                        <button type="submit" disabled={loading || !forgotEmail}
                                            className="w-full py-4 pw-btn-primary text-sm disabled:opacity-45 disabled:cursor-not-allowed">
                                            {loading ? 'Sending…' : 'Send Reset Link'}
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* ════ FORGOT — EMAIL SENT ════ */}
                            {view === 'forgotSent' && (
                                <motion.div key="forgotSent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-4">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                                        <Mail size={28} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-white font-semibold mb-2">Check Your Email</h3>
                                    <p className="text-gray-400 text-sm mb-6">A password reset link has been sent. It expires in 15 minutes.</p>
                                    <button onClick={() => { reset(); setView('login'); }}
                                        className="px-6 py-2 border border-white/15 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm transition-colors">
                                        Back to Login
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
