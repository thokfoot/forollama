import React from 'react'

export default function Section({ children, className = '' }) {
    return (
        <section className={`my-8 ${className}`}>{children}</section>
    )
}
