import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, Copy } from 'lucide-react'

const ToastContext = createContext(null)

/* Editorial — sentence case, lucide icons, palette tokens, no all-caps. */
const ICONS = {
    success: <CheckCircle2 size={16} className="text-[var(--success)]" strokeWidth={1.6} />,
    error:   <XCircle      size={16} className="text-[var(--danger)]"  strokeWidth={1.6} />,
    info:    <Info         size={16} className="text-[var(--gold-300)]" strokeWidth={1.6} />,
    copy:    <Copy         size={16} className="text-[var(--gold-300)]" strokeWidth={1.6} />,
}

const BORDERS = {
    success: 'rgba(111,175,138,0.45)',
    error:   'rgba(208,122,122,0.45)',
    info:    'rgba(205,184,138,0.40)',
    copy:    'rgba(205,184,138,0.40)',
}

let nextId = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef({})

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id])
        delete timers.current[id]
        setToasts(t => t.filter(x => x.id !== id))
    }, [])

    /** toast(message, type?, duration?) */
    const toast = useCallback((message, type = 'info', duration = 2800) => {
        const id = ++nextId
        setToasts(t => [...t.slice(-3), { id, message, type }])
        timers.current[id] = setTimeout(() => dismiss(id), duration)
        return id
    }, [dismiss])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && toasts.length > 0) {
                toasts.forEach(t => dismiss(t.id))
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [toasts, dismiss])

    return (
        <ToastContext.Provider value={toast}>
            {children}

            <div
                className="fixed bottom-6 inset-x-0 flex flex-col-reverse items-center gap-2 z-[99999] pointer-events-none"
                aria-live="polite"
                aria-atomic="true"
                data-testid="toast-root"
            >
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 18, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0,  scale: 1    }}
                            exit={{    opacity: 0, y: -8,  scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                            className="flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 rounded-full backdrop-blur-2xl shadow-2xl shadow-black/70 pointer-events-auto"
                            style={{
                                background: 'rgba(11,13,22,0.92)',
                                border: `1px solid ${BORDERS[t.type] || BORDERS.info}`,
                                maxWidth: 'calc(100vw - 48px)',
                                fontFamily: 'var(--font-sans)',
                            }}
                            onClick={() => dismiss(t.id)}
                            role="status"
                        >
                            {ICONS[t.type] || ICONS.info}
                            <span className="text-white/88 text-[13px] tracking-[0.005em] font-medium leading-tight">
                                {t.message}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
    return ctx
}
