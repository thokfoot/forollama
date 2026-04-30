import React from 'react'

export default function PageContainer({ children, className = '' }) {
    return (
        <div 
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
            style={{
                paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {children}
        </div>
    )
}
