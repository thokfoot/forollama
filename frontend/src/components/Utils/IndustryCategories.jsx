import React, { useState } from 'react'

// Muted industry accent colors for luxury feel
const industries = [
    { id: 'tech', name: 'Technology', icon: 'T', count: 3240, avgSalary: '25-60L', color: '#7B9BB8', growth: '+18%' },
    { id: 'finance', name: 'Finance', icon: 'F', count: 1850, avgSalary: '15-45L', color: '#7BA89B', growth: '+12%' },
    { id: 'healthcare', name: 'Healthcare', icon: 'H', count: 1420, avgSalary: '12-40L', color: '#B89B9B', growth: '+15%' },
    { id: 'design', name: 'Design', icon: 'D', count: 980, avgSalary: '10-35L', color: '#9B8BB8', growth: '+22%' },
    { id: 'marketing', name: 'Marketing', icon: 'M', count: 1120, avgSalary: '8-30L', color: '#B8A87B', growth: '+14%' },
    { id: 'consulting', name: 'Consulting', icon: 'C', count: 760, avgSalary: '20-50L', color: '#7BA8B8', growth: '+10%' },
    { id: 'education', name: 'Education', icon: 'E', count: 540, avgSalary: '6-20L', color: '#B87B9B', growth: '+8%' },
    { id: 'startup', name: 'Startups', icon: 'S', count: 890, avgSalary: '12-80L', color: '#A89060', growth: '+28%' },
]

const IndustryCategories = () => {
    const [hoveredId, setHoveredId] = useState(null)

    return (
        <section className="py-20 px-4 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0e] to-[#0a0a0a]" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-[#A89060]/10 text-[#A89060] border border-[#A89060]/20 mb-4">
                        Explore by Industry
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                        Find Your <span className="text-gradient">Industry Journey</span>
                    </h2>
                    <p className="text-white/50 max-w-xl mx-auto">
                        Discover career journeys across 50+ industries. See real salary data and growth trends.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {industries.map((industry) => (
                        <button
                            key={industry.id}
                            className="group relative p-5 rounded-2xl cursor-pointer fx-pop text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A89060]/70"
                            style={{
                                background: hoveredId === industry.id
                                    ? `linear-gradient(135deg, ${industry.color}15, ${industry.color}05)`
                                    : 'rgba(15, 15, 18, 0.6)',
                                border: `1px solid ${hoveredId === industry.id ? `${industry.color}40` : 'rgba(255,255,255,0.05)'}`,
                                transform: hoveredId === industry.id ? 'translateY(-4px)' : 'none',
                                boxShadow: hoveredId === industry.id ? `0 20px 40px -10px ${industry.color}20` : 'none',
                            }}
                            onMouseEnter={() => setHoveredId(industry.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold mb-3"
                                style={{ background: `${industry.color}20`, color: industry.color }}
                            >
                                {industry.icon}
                            </div>
                            <h3 className="text-white font-semibold mb-1">{industry.name}</h3>
                            <p className="text-white/40 text-sm mb-3">{industry.count.toLocaleString()} journeys</p>

                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <span className="text-xs text-white/50">{industry.avgSalary}</span>
                                <div className="text-right">
                                    <span className="text-xs font-medium" style={{ color: industry.color }}>
                                        {industry.growth}
                                    </span>
                                    <p className="text-[11px] text-white/30">Avg 5-yr</p>
                                </div>
                            </div>

                            <div
                                className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: industry.color }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <button className="btn-secondary">
                        View All Industries
                    </button>
                </div>
            </div>
        </section>
    )
}

export default IndustryCategories