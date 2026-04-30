import React from 'react'

const successStories = [
    {
        id: 1,
        name: 'Aditya Verma',
        avatar: null,
        beforeRole: 'Customer Support',
        afterRole: 'Senior Software Engineer',
        company: 'Google',
        beforeSalary: '₹4 LPA',
        afterSalary: '₹52 LPA',
        increase: '+1200%',
        timeToTransition: '4 years',
        journey: 'Arts → Self-taught → FAANG',
        quote: 'Failed 12th grade, worked at a call center, learned coding on YouTube. Now leading a team at Google.',
        color: '#A89060',
        verified: true
    },
    {
        id: 2,
        name: 'Priya Sharma',
        avatar: null,
        beforeRole: 'School Teacher',
        afterRole: 'Product Manager',
        company: 'Microsoft',
        beforeSalary: '₹6 LPA',
        afterSalary: '₹38 LPA',
        increase: '+533%',
        timeToTransition: '3 years',
        journey: 'Education → MBA → PM',
        quote: 'Left teaching after 5 years, got an MBA, and transitioned to product management.',
        color: '#A8D5BA',
        verified: true
    },
    {
        id: 3,
        name: 'Rahul Patel',
        avatar: null,
        beforeRole: 'Mechanical Engineer',
        afterRole: 'Data Scientist',
        company: 'Amazon',
        beforeSalary: '₹8 LPA',
        afterSalary: '₹45 LPA',
        increase: '+462%',
        timeToTransition: '2 years',
        journey: 'Mechanical → Online Courses → DS',
        quote: 'Stuck in a manufacturing job, learned Python during lockdown, now working on ML at Amazon.',
        color: '#7EB8DA',
        verified: true
    }
]

const SuccessStories = () => {
    return (
        <section className="py-24 px-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[#08080a]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #A89060 0%, transparent 70%)' }}
            />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-[#A89060]/10 text-[#A89060] border border-[#A89060]/20 mb-4">
                        🎉 Success Stories
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="text-white">Real </span>
                        <span className="text-gradient">Transformations</span>
                    </h2>
                    <p className="text-white/50 max-w-2xl mx-auto text-lg">
                        These aren't motivational posts. These are real career pivots with real numbers.
                    </p>
                </div>

                {/* Stories Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {successStories.map((story) => (
                        <div
                            key={story.id}
                            className="group relative bg-[#0f0f12] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 fx-pop"
                            style={{
                                boxShadow: 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 20px 60px -20px ${story.color}30`
                                e.currentTarget.style.transform = 'translateY(-8px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none'
                                e.currentTarget.style.transform = 'translateY(0)'
                            }}
                        >
                            {/* Top Accent */}
                            <div
                                className="h-1 w-full"
                                style={{ background: `linear-gradient(90deg, transparent, ${story.color}, transparent)` }}
                            />

                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                                        style={{
                                            background: `linear-gradient(135deg, ${story.color}20, ${story.color}40)`,
                                            border: `1px solid ${story.color}30`
                                        }}
                                    >
                                        <span style={{ color: story.color }}>{story.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-white font-semibold">{story.name}</h4>
                                            {story.verified && (
                                                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        <p className="text-white/40 text-sm">{story.afterRole} at {story.company}</p>
                                    </div>
                                </div>

                                {/* Before/After Comparison */}
                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl bg-white/[0.02]">
                                    <div>
                                        <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Before</p>
                                        <p className="text-white/60 text-sm font-medium">{story.beforeRole}</p>
                                        <p className="text-white/40 text-xs">{story.beforeSalary}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/30 text-xs uppercase tracking-wider mb-1">After</p>
                                        <p className="text-white text-sm font-medium">{story.afterRole}</p>
                                        <p className="text-green-400 text-xs font-semibold">{story.afterSalary}</p>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div
                                        className="px-3 py-2 rounded-lg text-sm font-bold"
                                        style={{
                                            background: '#10b98120',
                                            color: '#10b981'
                                        }}
                                    >
                                        {story.increase}
                                    </div>
                                    <span className="text-white/40 text-sm">{story.timeToTransition}</span>
                                    <span
                                        className="px-2 py-1 rounded text-xs"
                                        style={{
                                            background: `${story.color}15`,
                                            color: story.color,
                                            border: `1px solid ${story.color}30`
                                        }}
                                    >
                                        {story.journey}
                                    </span>
                                </div>

                                {/* Quote */}
                                <p className="text-white/50 text-sm leading-relaxed italic mb-4">
                                    "{story.quote}"
                                </p>

                                {/* CTA */}
                                <button
                                    className="w-full py-3 rounded-xl text-sm font-medium fx-pop opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                    style={{
                                        background: `${story.color}15`,
                                        color: story.color,
                                        border: `1px solid ${story.color}30`
                                    }}
                                >
                                    Read Full Journey →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-12">
                    <p className="text-white/40 text-sm mb-4">Join 10,000+ people who shared their livelihood journey</p>
                    <button className="btn-primary">
                        Share Your Success Story
                    </button>
                </div>
            </div>
        </section>
    )
}

export default SuccessStories
