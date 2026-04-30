import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * Editorial offline indicator — muted danger / success tokens, hairline border,
 * no saturated red/green gradients. Matches the night-documentary palette.
 */
export default function OfflineBar() {
    const [status, setStatus] = useState(navigator.onLine ? null : 'offline')

    useEffect(() => {
        let hideTimer = null
        const goOffline = () => {
            clearTimeout(hideTimer)
            setStatus('offline')
        }
        const goOnline = () => {
            setStatus('back-online')
            hideTimer = setTimeout(() => setStatus(null), 2500)
        }
        window.addEventListener('offline', goOffline)
        window.addEventListener('online',  goOnline)
        return () => {
            window.removeEventListener('offline', goOffline)
            window.removeEventListener('online',  goOnline)
            clearTimeout(hideTimer)
        }
    }, [])

    const isOffline = status === 'offline'

    return (
        <AnimatePresence>
            {status && (
                <motion.div
                    key={status}
                    initial={{ y: -32, opacity: 0 }}
                    animate={{ y: 0,   opacity: 1 }}
                    exit={{    y: -32, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    role="status"
                    aria-live="polite"
                    data-testid="offline-bar"
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0,
                        zIndex: 9999,
                        padding: '0.45rem 1.25rem',
                        background: isOffline ? 'rgba(208,122,122,0.14)' : 'rgba(111,175,138,0.12)',
                        borderBottom: isOffline
                            ? '1px solid var(--danger)'
                            : '1px solid var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.55rem',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        fontFamily: 'var(--font-sans)',
                    }}
                >
                    {isOffline ? (
                        <>
                            <span className="relative inline-flex items-center">
                                <WifiOff size={14} className="text-[var(--danger)]" strokeWidth={1.8} />
                                <span className="absolute -inset-1 rounded-full" style={{ background: 'var(--danger)', opacity: 0.18, animation: 'pw-offline-pulse 1.6s infinite' }} />
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '12.5px', fontWeight: 500, letterSpacing: '0.005em' }}>
                                You're offline — some features are unavailable.
                            </span>
                        </>
                    ) : (
                        <>
                            <Wifi size={14} className="text-[var(--success)]" strokeWidth={1.8} />
                            <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '12.5px', fontWeight: 500, letterSpacing: '0.005em' }}>
                                Back online.
                            </span>
                        </>
                    )}
                    <style>{`
                        @keyframes pw-offline-pulse {
                            0%, 100% { opacity: 0.18; transform: scale(1); }
                            50%       { opacity: 0.05; transform: scale(0.7); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
