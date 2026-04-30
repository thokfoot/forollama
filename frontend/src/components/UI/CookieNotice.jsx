import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X } from 'lucide-react'

const KEY = 'cr_privacy_ok'

/**
 * Editorial privacy notice — surfaces once on first visit, after 4s, on the
 * homepage. localStorage-only data story is a positive signal worth showing.
 */
export default function CookieNotice() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        let alreadyOk = false
        try { alreadyOk = !!localStorage.getItem(KEY) } catch (e) { console.debug("[non-fatal]", e?.message); }
        if (alreadyOk) return undefined
        const timer = setTimeout(() => setVisible(true), 4000)
        return () => clearTimeout(timer)
    }, [])

    const accept = () => {
        try { localStorage.setItem(KEY, '1') } catch (e) { console.debug("[non-fatal]", e?.message); }
        setVisible(false)
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 96, opacity: 0 }}
                    animate={{ y: 0,  opacity: 1 }}
                    exit={{    y: 96, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    data-collapse-on-short="true"
                    className="fixed z-[120] bottom-3 left-3 right-3 sm:left-auto sm:right-8 sm:w-[22rem]"
                    role="dialog"
                    aria-label="Privacy notice"
                    data-testid="cookie-notice"
                >
                    <div
                        className="rounded-2xl p-4 shadow-2xl shadow-black/80 border border-white/10 backdrop-blur-lg"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(10,10,18,0.94) 100%)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <Cookie size={14} className="text-[#CDB88A]/85" strokeWidth={1.6} />
                                <span className="pw-eyebrow text-[#CDB88A]/85" style={{ fontSize: 10, letterSpacing: '0.28em' }}>
                                    Privacy
                                </span>
                            </div>
                            <button
                                onClick={accept}
                                aria-label="Dismiss privacy notice"
                                className="text-white/35 hover:text-white/70 fx-soft text-xs leading-none mt-1 p-1 rounded-md"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        <p className="text-white/72 text-[12.5px] leading-relaxed mb-4">
                            Your bookmarks and last position are saved <span className="text-white/88">locally on your device</span>.
                            <span className="text-white/45"> No personal data leaves your browser.</span>
                        </p>

                        <button
                            onClick={accept}
                            className="w-full py-2 rounded-xl text-[11.5px] font-bold uppercase tracking-[0.16em] fx-pop hover:-translate-y-0.5"
                            style={{
                                background: 'linear-gradient(135deg, rgba(168,144,96,0.18) 0%, rgba(168,144,96,0.10) 100%)',
                                border: '1px solid rgba(168,144,96,0.40)',
                                color: '#CDB88A',
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
