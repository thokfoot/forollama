import React from 'react'

// Generic Error State
export const ErrorState = ({
    title = 'Unable to load this section',
    message = 'Please try again. If this keeps happening, refresh the page or check your internet connection.',
    onRetry,
    icon = '⚠️',
    errorCode
}) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-6xl mb-6 animate-pulse" aria-hidden="true">{icon}</div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/70 max-w-md mb-6">{message}</p>
        {errorCode && <p className="text-white/40 text-xs mb-6">Ref: {errorCode}</p>}
        {onRetry && (
            <button
                onClick={onRetry}
                aria-label="Try again"
                className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm fx-pop hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600"
                style={{
                    background: 'linear-gradient(135deg, #A89060, #8A7550)',
                    color: '#0a0a0a',
                    boxShadow: '0 4px 15px rgba(168, 144, 96, 0.25)'
                }}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
            </button>
        )}
    </div>
)

// Network Error
export const NetworkError = ({ onRetry }) => (
    <ErrorState
        icon="📡"
        title="Connection Lost"
        message="Please check your internet connection and try again."
        onRetry={onRetry}
    />
)

// Empty State
export const EmptyState = ({
    title = 'No results found',
    message = 'Try adjusting your filters or search terms.',
    action,
    actionLabel = 'Clear Filters',
    icon = '🔍'
}) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-6"
            style={{
                background: 'linear-gradient(135deg, rgba(168, 144, 96, 0.1), rgba(168, 144, 96, 0.05))',
                border: '1px solid rgba(168, 144, 96, 0.2)'
            }}
        >
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-white/70 max-w-md mb-6">{message}</p>
        {action && (
            <button
                onClick={action}
                aria-label={actionLabel}
                className="px-6 py-3 rounded-full font-medium text-sm fx-pop hover:scale-105 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600"
                style={{
                    background: 'transparent',
                    borderColor: 'rgba(168, 144, 96, 0.3)',
                    color: '#A89060'
                }}
            >
                {actionLabel}
            </button>
        )}
    </div>
)

// 404 Not Found
export const NotFoundError = ({ onGoHome }) => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-8xl font-black mb-4 text-gradient">404</div>
        <h1 className="text-2xl font-semibold text-white mb-2">Page Not Found</h1>
        <p className="text-white/70 max-w-md mb-8">
            The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4">
            <button
                onClick={onGoHome}
                aria-label="Go home"
                className="px-6 py-3 rounded-full font-medium text-sm fx-pop hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-600"
                style={{
                    background: 'linear-gradient(135deg, #A89060, #8A7550)',
                    color: '#0a0a0a'
                }}
            >
                Go Home
            </button>
            <button
                onClick={() => window.history.back()}
                aria-label="Go back to previous page"
                className="px-6 py-3 rounded-full font-medium text-sm fx-pop border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/20"
                style={{
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)'
                }}
            >
                Go Back
            </button>
        </div>
    </div>
)

// Offline State
export const OfflineState = () => (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
        <div
            className="max-w-md mx-auto flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400">You're offline. Some features may be unavailable.</span>
        </div>
    </div>
)

// Rate Limit Error
export const RateLimitError = ({ retryAfter }) => (
    <ErrorState
        icon="🚦"
        title="Too Many Requests"
        message={`Please wait ${retryAfter} seconds before trying again.`}
    />
)

// Maintenance Mode
export const MaintenanceState = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
        <div className="text-6xl mb-6">🔧</div>
        <h1 className="text-3xl font-bold text-white mb-4">Under Maintenance</h1>
        <p className="text-white/50 max-w-md mb-8">
            We're making some improvements. We'll be back shortly.
        </p>
        <div className="flex items-center gap-2 text-sm text-white/40">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Checking status...
        </div>
    </div>
)

// Success Toast
export const SuccessToast = ({ message, onClose }) => (
    <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl animate-slide-up"
        style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(10px)'
        }}
    >
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <span className="text-sm text-white">{message}</span>
        {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
    </div>
)

// Error Toast
export const ErrorToast = ({ message, onClose, onRetry }) => (
    <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl animate-slide-up"
        style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            backdropFilter: 'blur(10px)'
        }}
    >
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
        <span className="text-sm text-white">{message}</span>
        {onRetry && (
            <button
                onClick={onRetry}
                className="text-xs text-red-400 hover:text-red-300 underline ml-2"
            >
                Retry
            </button>
        )}
        {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white ml-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
    </div>
)

export default {
    ErrorState,
    NetworkError,
    EmptyState,
    NotFoundError,
    OfflineState,
    RateLimitError,
    MaintenanceState,
    SuccessToast,
    ErrorToast
}
