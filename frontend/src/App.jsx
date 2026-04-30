import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ErrorBoundary from './components/Layout/ErrorBoundary'
import SkipLink from './components/Accessibility/SkipLink'
import OfflineBar from './components/UI/OfflineBar'
import { ToastProvider } from './components/UI/Toast'
import CookieNotice from './components/UI/CookieNotice'
import GlowCursor from './components/UI/GlowCursor'
import './styles/App.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const SubmitJourneyPage = lazy(() => import('./pages/SubmitJourneyPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteScene({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden"
        >
            {children}
        </motion.div>
    )
}

function AppRoutes() {
    const location = useLocation()

    // Dynamic page title per route + focus management
    useEffect(() => {
        const titles = {
            '/':        'Career Records Of India — Real Careers. No Filters.',
            '/submit':  'Map your future path — Career Records Of India',
            '/contact': 'Contact Us — Career Records Of India',
            '/admin':   'Admin — Career Records Of India',
            '/mirror':  'Mirror Interview — Career Records Of India',
        }
        const match = Object.keys(titles).find(k =>
            k === '/' ? location.pathname === '/' : location.pathname.startsWith(k)
        )
        const title = match ? titles[match] : 'Career Records Of India — The Preview of Reality'
        document.title = title

        // Move focus to main content on route change for screen readers
        const main = document.getElementById('main-content')
        if (main) { main.focus({ preventScroll: true }) }
    }, [location.pathname])

    useEffect(() => {
        // Prefetch likely next routes during idle time only on capable connections/devices.
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        const effectiveType = connection?.effectiveType || ''
        const isSlowNetwork = typeof effectiveType === 'string' && !effectiveType.includes('4g')
        const isLowBandwidth = typeof connection?.downlink === 'number' && connection.downlink < 3
        const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4
        const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4

        if (connection?.saveData) return
        if (isSlowNetwork || isLowBandwidth || lowCpu || lowMemory) return

        const prefetch = () => {
            import('./pages/SubmitJourneyPage')
            import('./pages/ContactPage')
        }

        if ('requestIdleCallback' in window) {
            const id = window.requestIdleCallback(prefetch, { timeout: 2500 })
            return () => window.cancelIdleCallback?.(id)
        }

        const timeout = window.setTimeout(prefetch, 1200)
        return () => window.clearTimeout(timeout)
    }, [])

    return (
        <div
            key={location.pathname}
            id="main-content"
            tabIndex={-1}
            className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden outline-none"
            aria-live="polite"
        >
            <Suspense
                fallback={
                    <div className="flex h-full min-h-0 flex-1 items-center justify-center text-[#A89060] text-xs tracking-[0.12em] uppercase" role="status" aria-live="polite" aria-atomic="true">
                        <span className="inline-block w-4 h-4 mr-2 border-2 border-[#A89060]/30 border-t-[#A89060] rounded-full animate-spin" />
                        Loading career experience...
                    </div>
                }
            >
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<RouteScene><HomePage /></RouteScene>} />
                        <Route path="/submit" element={<RouteScene><SubmitJourneyPage /></RouteScene>} />
                        <Route path="/contact" element={<RouteScene><ContactPage /></RouteScene>} />
                        <Route path="/admin" element={<RouteScene><AdminPanel /></RouteScene>} />
                        <Route path="/admin/reset" element={<RouteScene><AdminPanel /></RouteScene>} />
                        {/* Deep-link Mirror Player: /mirror/:interviewId?seg=...&dna=... */}
                        <Route path="/mirror/:interviewId" element={<RouteScene><VideoPlayerPage /></RouteScene>} />
                        <Route path="*" element={<RouteScene><NotFoundPage /></RouteScene>} />
                    </Routes>
                </AnimatePresence>
            </Suspense>
        </div>
    )
}

function App() {
    return (
        <ErrorBoundary>
            <ToastProvider>
                <GlowCursor />
                <div className="box-border flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden [max-height:100dvh]">
                    <OfflineBar />
                    <SkipLink />
                    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col">
                        <Router>
                            <AppRoutes />
                        </Router>
                    </div>
                    <CookieNotice />
                </div>
            </ToastProvider>
        </ErrorBoundary>
    )
}

export default App
