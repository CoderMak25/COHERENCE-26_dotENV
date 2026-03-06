import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Link } from 'react-router-dom'
import { MOCK_LIVE_FEED, FAKE_LOGS, MOCK_CAMPAIGNS } from '../data/mockData'

export default function Dashboard() {
    const [liveFeed, setLiveFeed] = useState(MOCK_LIVE_FEED)
    const [chartRange, setChartRange] = useState('7D')
    const feedRef = useRef(null)

    // Simulate live feed
    useEffect(() => {
        const interval = setInterval(() => {
            const randomLog = FAKE_LOGS[Math.floor(Math.random() * FAKE_LOGS.length)]
            const now = new Date()
            const timeStr = now.toTimeString().split(' ')[0]
            setLiveFeed(prev => {
                const newFeed = [{ time: timeStr, text: randomLog.text, status: randomLog.status, type: randomLog.type }, ...prev]
                return newFeed.slice(0, 8)
            })
        }, 3500)
        return () => clearInterval(interval)
    }, [])



    const getBadgeClass = (type) => {
        if (type === 'sent' || type === 'ok') return 'badge-success'
        if (type === 'failed') return 'badge-danger'
        if (type === 'warning') return 'badge-warning'
        return 'badge-cold'
    }

    const barHeights = ['40%', '65%', '85%', '50%', '95%', '20%', '15%']
    const barValues = [82, 130, 170, 100, 190, 40, 30]
    const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

    const statCards = [
        { label: 'TOTAL LEADS', value: '2,847', icon: 'solar:users-group-two-rounded-linear', trend: '▲ 12%', trendUp: true, bottom: '148 NEW THIS WEEK' },
        { label: 'EMAILS SENT', value: '14,203', icon: 'solar:letter-linear', trend: '▲ 8%', trendUp: true, bottom: 'TODAY: 342 SENT' },
        { label: 'OPEN RATE', value: '34.2%', icon: 'solar:eye-linear', trend: '▲ 4.1%', trendUp: true, bottom: 'INDUSTRY AVG: 21%' },
        { label: 'REPLY RATE', value: '8.7%', icon: 'solar:reply-linear', trend: '▼ 1.2%', trendUp: false, bottom: '93 REPLIES THIS WEEK' },
    ]

    const pipeline = [
        { stage: 'IMPORTED', count: '2,847', pct: 100, active: false },
        { stage: 'CONTACTED', count: '1,420', pct: 50, active: true },
        { stage: 'OPENED', count: '485', pct: 17, active: false },
        { stage: 'REPLIED', count: '93', pct: 3.3, active: false },
        { stage: 'CONVERTED', count: '32', pct: 1.1, active: false },
    ]

    const funnel = [
        { label: 'TOTAL LEADS', count: '2,847', pct: 100 },
        { label: 'CONTACTED', count: '1,420', pct: 50 },
        { label: 'OPENED', count: '485', pct: 17 },
        { label: 'REPLIED', count: '93', pct: 3.3 },
        { label: 'CONVERTED', count: '32', pct: 1.1 },
    ]

    const topLeads = [
        { name: 'Rahul Sharma', company: 'TechCorp', status: 'Replied', action: 'Email reply received', time: '2h ago', badge: 'badge-accent' },
        { name: 'Priya Mehta', company: 'InnovateX', status: 'Opened', action: 'Opened follow-up email', time: '4h ago', badge: 'badge-success' },
        { name: 'James Walker', company: 'Globex', status: 'Contacted', action: 'Initial email sent', time: '6h ago', badge: 'badge-success' },
        { name: 'Sara Kim', company: 'Nexus', status: 'Converted', action: 'Deal closed', time: '1d ago', badge: 'badge-cold' },
        { name: 'Tom Nguyen', company: 'ClearFlow', status: 'Replied', action: 'Meeting scheduled', time: '1d ago', badge: 'badge-accent' },
    ]

    const insights = [
        { icon: 'solar:clock-circle-linear', text: 'BEST TIME TO SEND: TUESDAY 10–11AM', sub: 'Based on your last 30 days open rate data' },
        { icon: 'solar:chat-round-dots-linear', text: 'SUBJECT LINES WITH QUESTIONS GET 2.3× MORE OPENS', sub: 'Try: "Quick question about [Company]?"' },
        { icon: 'solar:restart-linear', text: 'FOLLOW-UP ON DAY 3 INCREASES REPLY RATE BY 40%', sub: '67% of your replies come from follow-ups' },
    ]

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit' }).toUpperCase()

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">

            {/* ═══════════════════════════════════════════
                1️⃣ PAGE HEADER
               ═══════════════════════════════════════════ */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-1">{dateStr}</span>
                    <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)] mb-1">WELCOME BACK, ALEX</h2>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-widest">HERE'S WHAT'S HAPPENING WITH YOUR OUTREACH TODAY</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="brutalist-panel px-3 py-1.5 flex items-center gap-2">
                        <span className="text-[var(--success)] text-[8px] animate-blink status-dot">●</span>
                        <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">3 WORKFLOWS RUNNING</span>
                    </div>
                    <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        <Icon icon="solar:play-bold" className="mr-2 text-xs" /> RUN ALL ACTIVE
                    </button>
                    <button className="btn-base btn-accent">
                        <Icon icon="solar:add-circle-bold" className="mr-2 text-xs" /> NEW CAMPAIGN
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                2️⃣ STAT CARDS
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <div key={card.label} className="brutalist-card p-5 flex flex-col relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[var(--accent)]" />
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">{card.label}</span>
                            <Icon icon={card.icon} className="text-[var(--text-muted)] text-lg" />
                        </div>
                        <span className="font-syne text-4xl font-bold text-accent mb-2 leading-none">{card.value}</span>
                        <span className={`badge ${card.trendUp ? 'badge-success' : 'badge-danger'} self-start mb-2`}>{card.trend}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest mt-auto">{card.bottom}</span>
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════════
                3️⃣ PIPELINE TRACKER
               ═══════════════════════════════════════════ */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">LEAD PIPELINE</h3>
                <div className="flex items-center w-full gap-3">
                    {pipeline.map((p, i) => (
                        <div key={p.stage} className="contents">
                            <div className={`pipeline-block ${p.active ? 'active' : ''}`}>
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{p.stage}</span>
                                <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-1">{p.count}</span>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest mb-2">{p.pct}%</span>
                                <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]">
                                    <div className={`h-full progress-fill ${p.active ? 'bg-accent' : 'bg-[var(--text-muted)]'}`} style={{ width: `${p.pct}%` }} />
                                </div>
                            </div>
                            {i < pipeline.length - 1 && <span className="pipeline-arrow">──▶</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                4️⃣ WEEKLY ACTIVITY + LIVE FEED
               ═══════════════════════════════════════════ */}
            <div className="flex gap-4 h-[300px] mb-6">
                {/* LEFT: ACTIVITY CHART */}
                <div className="flex-[0.6] brutalist-card p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">OUTREACH ACTIVITY</h3>
                            <span className="text-[9px] text-[var(--text-muted)] tracking-widest font-bold">LAST 7 DAYS</span>
                        </div>
                        <div className="flex gap-1">
                            {['7D', '30D', '90D'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setChartRange(r)}
                                    className={`border-2 border-[var(--border-bright)] text-[10px] font-bold px-2.5 py-0.5 transition-transform hover:-translate-y-[1px] ${chartRange === r
                                        ? 'bg-[var(--accent)] text-[#0D0D0D] border-[#0D0D0D] shadow-[2px_2px_0_#0D0D0D]'
                                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0_var(--shadow-color)]'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 relative border-l-2 border-[var(--border-bright)] border-b-2 pb-6 pl-2 flex items-end gap-1.5" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 19%, var(--border) 20%)' }}>
                        <div className="absolute -left-8 bottom-0 text-[10px] font-bold text-[var(--text-muted)]">0</div>
                        <div className="absolute -left-9 top-[80%] text-[10px] font-bold text-[var(--text-muted)]">50</div>
                        <div className="absolute -left-9 top-[40%] text-[10px] font-bold text-[var(--text-muted)]">150</div>
                        <div className="absolute -left-9 top-0 text-[10px] font-bold text-[var(--text-muted)]">200</div>
                        {dayLabels.map((day, i) => (
                            <div
                                key={day}
                                className={`flex-1 ${i === 3 || i === 5 || i === 6 ? 'bg-[var(--border)]' : 'bg-accent'} border-2 border-[var(--border-bright)] hover:-translate-y-1 transition-transform relative group`}
                                style={{ height: barHeights[i] }}
                            >
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--text-muted)]">{day}</span>
                                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] px-3 py-1 text-[10px] font-bold text-[var(--text-primary)] z-10">{barValues[i]}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: LIVE FEED */}
                <div className="flex-[0.4] brutalist-card flex flex-col overflow-hidden p-0">
                    <div className="px-5 py-3.5 border-b-2 border-[var(--border-bright)] flex justify-between items-center bg-[var(--bg-surface)] z-10">
                        <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LIVE FEED</h3>
                        <div className="flex items-center gap-2 text-[var(--success)] text-[11px] font-bold">
                            <span className="text-[8px] animate-blink status-dot">●</span> LIVE
                        </div>
                    </div>
                    <div ref={feedRef} className="flex-1 overflow-y-auto bg-[var(--bg-surface)]">
                        {liveFeed.map((entry, i) => (
                            <div key={i} className="h-[48px] px-5 border-b border-[var(--border)] flex items-center hover:bg-[var(--bg-hover)] animate-slide-down">
                                <span className="text-[11px] text-[var(--text-muted)] w-[65px] flex-shrink-0 font-bold">{entry.time}</span>
                                <span className="text-[11px] text-[var(--text-secondary)] flex-1 truncate px-2 font-bold">{entry.text}</span>
                                <span className={`badge ${getBadgeClass(entry.type)}`}>{entry.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                5️⃣ CONVERSION FUNNEL
               ═══════════════════════════════════════════ */}
            <div className="brutalist-card p-5 mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-4">CONVERSION FUNNEL</h3>
                <div className="flex flex-col gap-3">
                    {funnel.map((f) => (
                        <div key={f.label} className="flex items-center gap-4">
                            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest w-[130px] flex-shrink-0">{f.label}</span>
                            <div className="flex-1 h-[20px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] relative overflow-hidden">
                                <div
                                    className={`h-full ${f.pct === 100 ? 'bg-[var(--text-muted)]' : 'bg-accent'} transition-all duration-500`}
                                    style={{ width: `${f.pct}%` }}
                                />
                            </div>
                            <span className="text-[11px] font-bold text-[var(--text-primary)] w-[60px] text-right">{f.count}</span>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] w-[45px] text-right">{f.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                6️⃣ ACTIVE CAMPAIGNS STRIP
               ═══════════════════════════════════════════ */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">ACTIVE CAMPAIGNS</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {MOCK_CAMPAIGNS.map((c) => {
                        const isActive = c.status === 'Active'
                        const isPaused = c.status === 'Paused'
                        return (
                            <div key={c._id} className="brutalist-card p-4 min-w-[280px] flex-shrink-0 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">{c.name}</span>
                                    <span className={`badge ${isActive ? 'badge-success' : isPaused ? 'badge-warning' : 'badge-cold'}`}>{c.status.toUpperCase()}</span>
                                </div>
                                <div className="w-full h-[6px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)]">
                                    <div className="h-full bg-accent" style={{ width: `${c.stats.progress}%` }} />
                                </div>
                                <div className="flex gap-4 text-[10px] font-bold tracking-widest">
                                    <span className="text-[var(--text-muted)]">SENT: <span className="text-[var(--text-primary)]">{c.stats.sent}</span></span>
                                    <span className="text-[var(--text-muted)]">OPENS: <span className="text-[var(--text-primary)]">{c.stats.opened}</span></span>
                                    <span className="text-[var(--text-muted)]">REPLIES: <span className="text-[var(--text-primary)]">{c.stats.replied}</span></span>
                                </div>
                                <button className={`btn-base text-[9px] py-[5px] w-full ${isActive ? 'bg-[var(--bg-raised)] text-[var(--text-primary)]' : 'btn-accent'}`}>
                                    {isActive ? 'PAUSE' : isPaused ? 'RESUME' : 'LAUNCH'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                7️⃣ TOP LEADS TABLE
               ═══════════════════════════════════════════ */}
            <div className="brutalist-table-container mb-6">
                <div className="px-5 py-3 bg-[var(--bg-raised)] border-b-2 border-[var(--border-bright)] flex justify-between items-center">
                    <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">TOP LEADS ACTIVITY</h3>
                    <Link to="/leads" className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">VIEW ALL LEADS →</Link>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--bg-raised)]">
                        <tr>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LEAD</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">STATUS</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LAST ACTION</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">TIME</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold text-center">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold">
                        {topLeads.map((lead, i) => (
                            <tr key={i} className={`hover:bg-[var(--bg-hover)] transition-colors duration-75 ${i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-base)]'}`}>
                                <td className="p-[12px_16px]">
                                    <span className="text-[var(--text-primary)]">{lead.name}</span>
                                    <span className="text-[var(--text-muted)] ml-2">@ {lead.company}</span>
                                </td>
                                <td className="p-[12px_16px]"><span className={`badge ${lead.badge}`}>{lead.status.toUpperCase()}</span></td>
                                <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.action}</td>
                                <td className="p-[12px_16px] text-[var(--text-muted)]">{lead.time}</td>
                                <td className="p-[12px_16px] text-center">
                                    <button className="w-[28px] h-[28px] page-btn bg-[var(--bg-raised)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:-translate-y-[1px]">
                                        <Icon icon="solar:eye-linear" className="text-sm" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══════════════════════════════════════════
                8️⃣ AI INSIGHTS PANEL
               ═══════════════════════════════════════════ */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">
                    <Icon icon="solar:magic-stick-3-linear" className="inline mr-2 text-accent text-sm" />
                    AI INSIGHTS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {insights.map((ins, i) => (
                        <div key={i} className="brutalist-card p-5 flex flex-col gap-3">
                            <div className="w-[32px] h-[32px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] flex items-center justify-center">
                                <Icon icon={ins.icon} className="text-accent text-base" />
                            </div>
                            <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest leading-relaxed">{ins.text}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest">{ins.sub}</span>
                            <button className="btn-base btn-accent text-[9px] py-[5px] px-[12px] self-start mt-auto">APPLY</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                9️⃣ SYSTEM STATUS BAR
               ═══════════════════════════════════════════ */}
            <div className="h-[36px] bg-[var(--bg-topbar)] border-t-2 border-[var(--border-bright)] flex items-center justify-between px-5 mb-2">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest">MONGODB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest">REDIS</span>
                    </div>
                    <span className="text-[var(--border-bright)]">|</span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">QUEUE: 48 JOBS</span>
                    <span className="text-[10px] font-bold text-[var(--warning)] tracking-widest">THROTTLE: 10/HR</span>
                </div>
                <div className="flex items-center gap-5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">LAST SYNC: 09:42:33</span>
                    <span className="text-[10px] font-bold text-[var(--success)] tracking-widest">UPTIME: 99.98%</span>
                    <span className="animate-blink text-[var(--text-primary)]">▮</span>
                </div>
            </div>



        </div>
    )
}
