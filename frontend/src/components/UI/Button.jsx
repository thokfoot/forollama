import React from 'react'
import { motion } from 'framer-motion'

/**
 * Unified Button — single source of truth.
 * Variants: primary | secondary | ghost | danger
 * Shapes:   rounded (default 14px) | pill
 * Sizes:    sm | md | lg
 *
 * Inherits the `pw-btn-*` class so any global skin update flows here.
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    shape = 'rounded',
    disabled = false,
    isLoading = false,
    className = '',
    ...props
}) {
    const variantClass = {
        primary:   'pw-btn-primary',
        secondary: 'pw-btn-secondary',
        ghost:     'pw-btn-ghost',
        danger:    'pw-btn-secondary',
    }[variant] || 'pw-btn-primary'

    const sizeClass = {
        sm: 'px-4 py-2 text-[12px]',
        md: 'px-5 py-3 text-[12.5px]',
        lg: 'px-7 py-3.5 text-[13px]',
    }[size] || 'px-5 py-3 text-[12.5px]'

    const shapeClass = shape === 'pill' ? 'rounded-full' : 'rounded-[14px]'

    const dangerOverride = variant === 'danger'
        ? 'border-[var(--danger)]/45 text-[var(--danger)] hover:bg-[var(--danger)]/10'
        : ''

    return (
        <motion.button
            whileHover={disabled || isLoading ? undefined : { y: -2 }}
            whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
            disabled={disabled || isLoading}
            className={`${variantClass} ${sizeClass} ${shapeClass} ${dangerOverride} uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {isLoading && (
                <span className="inline-flex w-4 h-4 mr-1 border-2 border-current/25 border-t-current rounded-full animate-spin" aria-hidden="true" />
            )}
            {children}
        </motion.button>
    )
}
