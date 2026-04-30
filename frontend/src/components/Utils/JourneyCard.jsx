import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const JourneyCard = ({ journey }) => {
    const [isHovered, setIsHovered] = useState(false)

    // Default journey data for demo
    const data = journey || {
        id: 1,
        title: 'Software Engineer',
        name: 'Rahul Sharma',
        company: 'Google',
        startRole: '11th PCM',
        currentRole: 'Tech Lead at Google',
        firstSalary: '?3-5 LPA',
        currentSalary: '?45 LPA',
        experience: '8 years',
        verified: true,
        color: '#A89060'
    }

    return (
        <Link
            to={`/journey/${data.id}`}
            className="group relative pw-panel overflow-hidden cursor-pointer fx-pop focus-within:translate-y-[-4px] focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
            style={{
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? `0 20px 36px -12px rgba(0,0,0,0.52), 0 0 44px -18px ${data.color}3a`
                    : '0 10px 20px -10px rgba(0,0,0,0.4)'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top Accent */}
            <div
                className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: data.color }}
            />

            <div className="relative p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{
                                background: `${data.color}20`,
                                border: `1px solid ${data.color}30`,
                                color: data.color
                            }}
                        >
                            {data.name?.charAt(0) || 'R'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-white text-lg font-semibold">{data.title}</h3>
                                {data.verified && (
                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <p className="text-white/50 text-sm">{data.company}</p>
                        </div>
                    </div>
                </div>

                {/* Journey Info - Simplified */}
                <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-white/40">Started as</span>
                        <span className="text-white/70 text-right">{data.startRole || data.stream?.split('')[0]?.trim() || '11th PCM'}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-white/40">First salary</span>
                        <span className="text-white/70 text-right">{data.firstSalary || '?3-5 LPA'}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-white/40">Current role</span>
                        <span className="text-white/90 font-medium text-right">{data.currentRole || data.title}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-white/40">Total time</span>
                        <span className="text-white/70 text-right">{data.experience}</span>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[#A89060] text-2xl font-extrabold">{data.currentSalary || data.salary}</span>
                    <span className="text-white/40 text-sm group-hover:text-white/70 transition-colors">
                        View journey
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default JourneyCard