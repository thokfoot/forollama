/**
 * Accessibility utilities for keyboard interactions and ARIA support
 */

/**
 * Handle keyboard events on interactive elements
 * Allows elements to respond to Enter/Space keys
 */
export const handleKeyDown = (callback) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        callback(e)
    }
}

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get motion variants based on user preferences
 */
export const getMotionVariants = (normalVariants, reducedVariants = {}) => {
    return prefersReducedMotion() ? reducedVariants : normalVariants
}

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    
    setTimeout(() => {
        document.body.removeChild(announcement)
    }, 1000)
}

/**
 * Focus management utilities
 */
export const focusElement = (element) => {
    element?.focus()
}

export const focusFirstInteractive = (container) => {
    const interactive = container?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusElement(interactive)
}

/**
 * Trap focus within a modal or dialog
 */
export const createFocusTrap = (container) => {
    const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    return {
        handleKeyDown: (e) => {
            if (e.key !== 'Tab') return

            if (e.shiftKey && document.activeElement === firstElement) {
                lastElement.focus()
                e.preventDefault()
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                firstElement.focus()
                e.preventDefault()
            }
        },
        initialFocus: () => focusElement(firstElement)
    }
}
