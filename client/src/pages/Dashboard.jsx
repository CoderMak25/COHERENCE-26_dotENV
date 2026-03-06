import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import StatCard from '../components/ui/StatCard'
import { CHART_DATA_WEEK, MOCK_LIVE_FEED, FAKE_LOGS } from '../data/mockData'

export default function Dashboard() {
    const [liveFeed, setLiveFeed] = useState(MOCK_LIVE_FEED)
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

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">COMMAND CENTER</h2>
                <div className="flex gap-4">
                    <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        IMPORT LEADS
                    </button>
                    <button className="btn-base btn-accent">
                        RUN ALL WORKFLOWS
                    </button>
                </div>
            </div>

            {/* ROW 1: STAT CARDS */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="TOTAL LEADS" value="1,248" icon="solar:chart-line-up-linear" change="+23 since yesterday" valueColor="text-accent" />
                <StatCard label="EMAILS SENT" value="847" icon="solar:letter-linear" change="+61 today" valueColor="text-[var(--text-primary)]" />
                <StatCard label="OPEN RATE" value="34.2%" icon="solar:eye-linear" change="▲ 2.1% vs last week" valueColor="text-[var(--text-primary)]" />
                <StatCard label="REPLIES" value="93" icon="solar:reply-linear" change="+8 today" valueColor="text-[var(--text-primary)]" />
            </div>

            {/* ROW 2: PIPELINE TRACKER */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">LEAD PIPELINE</h3>
                <div className="flex items-center w-full gap-3">
                    <div className="pipeline-block">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">IMPORTED</span>
                        <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-3">1,248</span>
                        <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]"><div className="h-full bg-[var(--text-muted)] progress-fill" style={{ width: '100%' }}></div></div>
                    </div>
                    <span className="pipeline-arrow">──▶</span>

                    <div className="pipeline-block active">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">CONTACTED</span>
                        <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-3">847</span>
                        <div className="w-full h-[4px] bg-[var(--border)] border-y border-[#0D0D0D]"><div className="h-full bg-accent progress-fill" style={{ width: '68%' }}></div></div>
                    </div>
                    <span className="pipeline-arrow">──▶</span>

                    <div className="pipeline-block">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">OPENED</span>
                        <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-3">291</span>
                        <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]"><div className="h-full bg-[var(--success)] progress-fill" style={{ width: '34%' }}></div></div>
                    </div>
                    <span className="pipeline-arrow">──▶</span>

                    <div className="pipeline-block">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">REPLIED</span>
                        <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-3">93</span>
                        <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]"><div className="h-full bg-accent progress-fill" style={{ width: '11%' }}></div></div>
                    </div>
                    <span className="pipeline-arrow">──▶</span>

                    <div className="pipeline-block">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">CONVERTED</span>
                        <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-3">41</span>
                        <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]"><div className="h-full bg-[var(--success)] progress-fill" style={{ width: '4%' }}></div></div>
                    </div>
                </div>
            </div>

            {/* ROW 3: PANELS */}
            <div className="flex gap-4 h-[300px]">
                {/* LEFT: ACTIVITY CHART */}
                <div className="flex-[0.62] brutalist-card p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">OUTREACH ACTIVITY</h3>
                        <button className="border-2 border-[var(--border-bright)] bg-[var(--bg-surface)] shadow-[2px_2px_0_var(--shadow-color)] text-[var(--text-primary)] text-[10px] font-bold px-2 py-0.5 hover:translate-y-[-1px] transition-transform">7D ▾</button>
                    </div>
                    {/* Chart Mockup */}
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
                <div className="flex-[0.38] brutalist-card flex flex-col overflow-hidden p-0">
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
        </div>
    )
}
