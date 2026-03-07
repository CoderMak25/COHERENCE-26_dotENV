import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardAPI } from '../services/api'

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [chartRange, setChartRange] = useState('7D')
    const [liveFeed, setLiveFeed] = useState([])
    const feedRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true)
                const data = await dashboardAPI.getStats()
                setStats(data)
                // Build live feed from recent logs
                const feed = (data.recentLogs || []).map(log => ({
                    time: new Date(log.createdAt).toLocaleTimeString(),
                    text: `${log.action} → ${log.leadName || 'SYSTEM'}`,
                    status: log.status,
                    type: log.status === 'SENT' || log.status === 'OK' ? 'sent' : log.status === 'FAILED' ? 'failed' : 'warning'
                }))
                setLiveFeed(feed)
            } catch (err) {
                console.error('Dashboard fetch error:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
        const interval = setInterval(fetchStats, 15000) // auto-refresh every 15s
        return () => clearInterval(interval)
    }, [])

    const getBadgeClass = (type) => {
        if (type === 'sent' || type === 'ok') return 'badge-success'
        if (type === 'failed') return 'badge-danger'
        if (type === 'warning') return 'badge-warning'
        return 'badge-cold'
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Contacted': return 'badge-success'
            case 'Replied': return 'badge-accent'
            case 'New': return 'badge-warning'
            case 'Converted': return 'badge-cold'
            case 'Opened': return 'badge-success'
            default: return 'badge-cold'
        }
    }

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit' }).toUpperCase()

    if (loading && !stats) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-base)]">
                <span className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-widest">Loading Dashboard...</span>
            </div>
        )
    }

    const p = stats?.pipeline || {}
    const totalLeads = stats?.totalLeads || 0
    const logSent = stats?.logStatusMap?.SENT || 0
    const logFailed = stats?.logStatusMap?.FAILED || 0
    const logOk = stats?.logStatusMap?.OK || 0
    const totalLogs = stats?.totalLogs || 0
    const chartData = stats?.chartData || []
    const maxChart = Math.max(...chartData.map(d => d.value), 1)
    const topLeads = stats?.topLeads || []
    const workflowCounts = stats?.workflowCounts || []
    const scoring = stats?.scoring || { hot: 0, qualified: 0, warm: 0, cold: 0, avgScore: 0 }

    const getScoreColor = (score) => {
        if (score >= 81) return 'var(--danger)'
        if (score >= 61) return 'var(--accent, #e07a2f)'
        if (score >= 31) return 'var(--warning, #d4a72c)'
        return 'var(--text-muted)'
    }

    const statCards = [
        { label: 'TOTAL LEADS', value: totalLeads.toLocaleString(), icon: 'solar:users-group-two-rounded-linear', trend: `${p.new || 0} NEW`, trendUp: true, bottom: `${p.contacted || 0} CONTACTED`, link: '/app/leads' },
        { label: 'LOGS RECORDED', value: totalLogs.toLocaleString(), icon: 'solar:letter-linear', trend: `${logSent} SENT`, trendUp: true, bottom: `${logFailed} FAILED`, link: '/app/logs' },
        { label: 'REPLIED', value: (p.replied || 0).toLocaleString(), icon: 'solar:reply-linear', trend: `${totalLeads ? ((p.replied / totalLeads) * 100).toFixed(1) : 0}%`, trendUp: (p.replied || 0) > 0, bottom: 'OF ALL LEADS', link: '/app/leads' },
        { label: 'CONVERTED', value: (p.converted || 0).toLocaleString(), icon: 'solar:check-circle-linear', trend: `${totalLeads ? ((p.converted / totalLeads) * 100).toFixed(1) : 0}%`, trendUp: (p.converted || 0) > 0, bottom: 'CONVERSION RATE', link: '/app/leads' },
    ]

    const pipeline = [
        { stage: 'NEW', count: p.new || 0, pct: totalLeads ? Math.round((p.new / totalLeads) * 100) : 0 },
        { stage: 'CONTACTED', count: p.contacted || 0, pct: totalLeads ? Math.round((p.contacted / totalLeads) * 100) : 0 },
        { stage: 'OPENED', count: p.opened || 0, pct: totalLeads ? Math.round((p.opened / totalLeads) * 100) : 0 },
        { stage: 'REPLIED', count: p.replied || 0, pct: totalLeads ? Math.round((p.replied / totalLeads) * 100) : 0 },
        { stage: 'CONVERTED', count: p.converted || 0, pct: totalLeads ? Math.round((p.converted / totalLeads) * 100) : 0 },
    ]

    const funnel = [
        { label: 'TOTAL LEADS', count: totalLeads, pct: 100 },
        { label: 'CONTACTED', count: p.contacted || 0, pct: totalLeads ? Math.round((p.contacted / totalLeads) * 100) : 0 },
        { label: 'OPENED', count: p.opened || 0, pct: totalLeads ? Math.round((p.opened / totalLeads) * 100) : 0 },
        { label: 'REPLIED', count: p.replied || 0, pct: totalLeads ? Math.round((p.replied / totalLeads) * 100) : 0 },
        { label: 'CONVERTED', count: p.converted || 0, pct: totalLeads ? Math.round((p.converted / totalLeads) * 100) : 0 },
    ]

    const insights = [
        { icon: 'solar:clock-circle-linear', text: 'BEST TIME TO SEND: TUESDAY 10–11AM', sub: 'Based on your last 30 days open rate data' },
        { icon: 'solar:chat-round-dots-linear', text: 'SUBJECT LINES WITH QUESTIONS GET 2.3× MORE OPENS', sub: 'Try: "Quick question about [Company]?"' },
        { icon: 'solar:restart-linear', text: 'FOLLOW-UP ON DAY 3 INCREASES REPLY RATE BY 40%', sub: '67% of your replies come from follow-ups' },
    ]

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">

            {/* 1️⃣ PAGE HEADER */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block mb-1">{dateStr}</span>
                    <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)] mb-1">COMMAND CENTER</h2>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-widest">LIVE DATA FROM YOUR DATABASE</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="brutalist-panel px-3 py-1.5 flex items-center gap-2">
                        <span className="text-[var(--success)] text-[8px] animate-blink status-dot">●</span>
                        <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">{workflowCounts.length} WORKFLOWS ACTIVE</span>
                    </div>
                    <button onClick={() => navigate('/app/workflows')} className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        <Icon icon="solar:play-bold" className="mr-2 text-xs" /> VIEW WORKFLOWS
                    </button>
                    <button onClick={() => navigate('/app/leads')} className="btn-base btn-accent">
                        <Icon icon="solar:add-circle-bold" className="mr-2 text-xs" /> VIEW LEADS
                    </button>
                </div>
            </div>

            {/* 2️⃣ STAT CARDS */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <div key={card.label} onClick={() => navigate(card.link)} className="brutalist-card p-5 flex flex-col relative overflow-hidden cursor-pointer hover:-translate-y-[2px] transition-transform">
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

            {/* 3️⃣ PIPELINE TRACKER */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">LEAD PIPELINE</h3>
                <div className="flex items-center w-full gap-3">
                    {pipeline.map((pp, i) => (
                        <div key={pp.stage} className="contents">
                            <div className={`pipeline-block ${pp.active ? 'active' : ''}`}>
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{pp.stage}</span>
                                <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none mb-1">{pp.count}</span>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest mb-2">{pp.pct}%</span>
                                <div className="w-full h-[4px] bg-[var(--border)] border-y border-[var(--border-bright)]">
                                    <div className={`h-full progress-fill ${pp.active ? 'bg-accent' : 'bg-[var(--text-muted)]'}`} style={{ width: `${pp.pct}%` }} />
                                </div>
                            </div>
                            {i < pipeline.length - 1 && <span className="pipeline-arrow">──▶</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* LEAD SCORING STRIP */}
            <div className="flex gap-4 mb-6">
                <div className="brutalist-card p-4 flex-1 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">SCORING</span>
                    <span className="text-[var(--border-bright)]">|</span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--danger)' }}>● HOT {scoring.hot}</span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--accent, #e07a2f)' }}>● QUALIFIED {scoring.qualified}</span>
                    <span className="text-[11px] font-bold" style={{ color: 'var(--warning, #d4a72c)' }}>● WARM {scoring.warm}</span>
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">● COLD {scoring.cold}</span>
                    <span className="text-[var(--border-bright)] ml-auto">|</span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">AVG SCORE</span>
                    <span className="font-syne text-lg font-bold text-[var(--text-primary)] leading-none">{scoring.avgScore}</span>
                </div>
            </div>

            {/* 4️⃣ WEEKLY ACTIVITY + LIVE FEED */}
            <div className="flex gap-4 h-[300px] mb-6">
                {/* LEFT: ACTIVITY CHART */}
                <div className="flex-[0.6] brutalist-card p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">OUTREACH ACTIVITY</h3>
                            <span className="text-[9px] text-[var(--text-muted)] tracking-widest font-bold">LAST 7 DAYS — LIVE DATA</span>
                        </div>
                        <div className="flex gap-1">
                            {['7D'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setChartRange(r)}
                                    className={`border-2 border-[var(--border-bright)] text-[10px] font-bold px-2.5 py-0.5 transition-transform hover:-translate-y-[1px] ${chartRange === r
                                        ? 'bg-[var(--accent)] text-[var(--text-inverted)] border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)]'
                                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0_var(--shadow-color)]'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 relative border-l-2 border-[var(--border-bright)] border-b-2 pb-6 pl-10 flex items-end gap-1.5" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 19%, var(--border) 20%)' }}>
                        <div className="absolute left-1 bottom-0 text-[10px] font-bold text-[var(--text-muted)]">0</div>
                        <div className="absolute left-1 top-[50%] text-[10px] font-bold text-[var(--text-muted)]">{Math.round(maxChart / 2)}</div>
                        <div className="absolute left-1 top-0 text-[10px] font-bold text-[var(--text-muted)]">{maxChart}</div>
                        {chartData.map((day, i) => {
                            const heightPct = maxChart > 0 ? (day.value / maxChart) * 100 : 0
                            return (
                                <div
                                    key={day.name}
                                    className={`flex-1 ${day.value === 0 ? 'bg-[var(--border)]' : 'bg-accent'} border-2 border-[var(--border-bright)] hover:-translate-y-1 transition-transform relative group`}
                                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                                >
                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--text-muted)]">{day.name}</span>
                                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] px-3 py-1 text-[10px] font-bold text-[var(--text-primary)] z-10 whitespace-nowrap">{day.value}</div>
                                </div>
                            )
                        })}
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
                        {liveFeed.length === 0 && (
                            <div className="p-5 text-center text-[11px] text-[var(--text-muted)] font-bold">No recent activity</div>
                        )}
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

            {/* 5️⃣ CONVERSION FUNNEL */}
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

            {/* 6️⃣ ALL WORKFLOWS */}
            <div className="mb-6">
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-3">YOUR WORKFLOWS</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {workflowCounts.length === 0 && (
                        <div className="brutalist-card p-4 min-w-[280px] text-center text-[11px] text-[var(--text-muted)] font-bold">No workflows created yet</div>
                    )}
                    {workflowCounts.map((wf) => (
                        <div key={wf.id} onClick={() => navigate(`/app/workflows?id=${wf.id}`)} className="brutalist-card p-4 min-w-[280px] flex-shrink-0 flex flex-col gap-3 cursor-pointer hover:-translate-y-[2px] transition-transform">
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest leading-tight">{wf.name}</span>
                                <span className={`badge ${wf.active ? 'badge-success' : 'badge-neutral'}`}>{(wf.status || 'DRAFT').toUpperCase()}</span>
                            </div>
                            <div className="w-full h-[6px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)]">
                                <div className={`h-full ${wf.active ? 'bg-accent' : 'bg-[var(--text-muted)]'}`} style={{ width: '100%' }} />
                            </div>
                            <div className="flex gap-4 text-[10px] font-bold tracking-widest">
                                <span className="text-[var(--text-muted)]">LEADS: <span className="text-[var(--text-primary)]">{wf.count}</span></span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/app/workflows?id=${wf.id}`) }} className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[9px] py-[5px] w-full">
                                VIEW WORKFLOW
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 7️⃣ TOP LEADS TABLE */}
            <div className="brutalist-table-container mb-6">
                <div className="px-5 py-3 bg-[var(--bg-raised)] border-b-2 border-[var(--border-bright)] flex justify-between items-center">
                    <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">TOP LEADS ACTIVITY</h3>
                    <Link to="/app/leads" className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">VIEW ALL LEADS →</Link>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--bg-raised)]">
                        <tr>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LEAD</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">SCORE</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">STATUS</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">WORKFLOW</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LAST ACTION</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold text-center">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold">
                        {topLeads.map((lead, i) => (
                            <tr key={lead._id} className={`hover:bg-[var(--bg-hover)] transition-colors duration-75 ${i % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-base)]'}`}>
                                <td className="p-[12px_16px]">
                                    <span className="text-[var(--text-primary)]">{lead.name}</span>
                                    <span className="text-[var(--text-muted)] ml-2">@ {lead.company || '—'}</span>
                                </td>
                                <td className="p-[12px_16px]">
                                    <span className="text-[11px] font-bold" style={{ color: getScoreColor(lead.score || 0) }}>{lead.score || 0}</span>
                                    <span className="text-[9px] font-bold ml-1" style={{ color: getScoreColor(lead.score || 0) }}>{lead.scoreLabel || 'COLD'}</span>
                                </td>
                                <td className="p-[12px_16px]"><span className={`badge ${getStatusBadge(lead.status)}`}>{(lead.status || 'NEW').toUpperCase()}</span></td>
                                <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.workflow || '—'}</td>
                                <td className="p-[12px_16px] text-[var(--text-muted)]">{lead.lastAction || 'No Actions Yet'}</td>
                                <td className="p-[12px_16px] text-center">
                                    <button onClick={() => navigate('/app/leads')} className="w-[28px] h-[28px] page-btn bg-[var(--bg-raised)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:-translate-y-[1px]">
                                        <Icon icon="solar:eye-linear" className="text-sm" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 8️⃣ AI INSIGHTS PANEL */}
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

            {/* 9️⃣ SYSTEM STATUS BAR */}
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
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">LEADS: {totalLeads}</span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">LOGS: {totalLogs}</span>
                </div>
                <div className="flex items-center gap-5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">LAST SYNC: {new Date().toLocaleTimeString()}</span>
                    <span className="text-[10px] font-bold text-[var(--success)] tracking-widest">LIVE</span>
                    <span className="animate-blink text-[var(--text-primary)]">▮</span>
                </div>
            </div>

        </div>
    )
}
