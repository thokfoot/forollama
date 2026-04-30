import React from 'react'

/**
 * SkipLink component for keyboard navigation accessibility
 * Allows keyboard users to skip directly to main content
 */
export default function SkipLink() {
    return (
        <a
            href="#main-content"
            className="fixed top-0 left-0 z-[999] bg-accent text-white px-4 py-2 rounded-br-lg font-medium text-sm transform -translate-y-full focus:translate-y-0 transition-transform duration-200"
            aria-label="Skip to main content"
        >
            Skip to main content
        </a>
    )
}
