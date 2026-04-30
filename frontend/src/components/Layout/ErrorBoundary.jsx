import React from 'react'

/**
 * Error Boundary component
 * Catches errors anywhere in the child component tree
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-0 h-full w-full min-w-0 flex-1 flex-col items-center justify-center px-4 pw-page-bg">
                    <div className="text-center pw-panel p-6 sm:p-8 max-w-xl w-full">
                        <div className="text-4xl mb-6">⚠️</div>
                        <h1 className="text-xl font-bold text-white mb-2">Oops! Something went wrong</h1>
                        <p className="text-white/70 mb-8 max-w-md">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        {import.meta.env.DEV && (
                            <details className="mb-8 text-left bg-black/30 border border-white/10 p-4 rounded-lg max-w-md mx-auto">
                                <summary className="cursor-pointer font-mono text-sm text-red-400 mb-2">
                                    Error Details (Dev Only)
                                </summary>
                                <pre className="text-xs text-white/50 overflow-auto max-h-48">
                                    {this.state.error?.toString()}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleReset}
                            aria-label="Try again after error"
                            className="px-6 py-3 rounded-lg bg-[#A89060] hover:bg-[#baa87c] text-[#0a0b14] font-semibold transition-colors duration-200"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
