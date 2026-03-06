import { useState } from 'react'
import { MOCK_LOGS } from '../data/mockData'

export default function Logs() {
    const [activeFilter, setActiveFilter] = useState('ALL')
    const [startDate, setStartDate] = useState('2023-10-24')
    const [endDate, setEndDate] = useState('2023-10-25')
    const [searchText, setSearchText] = useState('')
    const [autoRefresh, setAutoRefresh] = useState(true)

    const filters = ['ALL', 'SENT', 'FAILED', 'PENDING', 'SKIPPED']
    const logs = MOCK_LOGS

    const getRowBg = (status, index) => {
        if (status === 'FAILED') return 'bg-[rgba(212,43,43,0.04)]'
        return index % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-base)]'
    }

    const getTextColor = (status) => {
        if (status === 'FAILED') return 'text-[var(--danger)]'
        return ''
    }

    const getBadgeClass = (status) => {
        switch (status) {
            case 'SENT': case 'OK': return 'badge-success'
            case 'FAILED': return 'badge-danger'
            case 'PENDING': return 'badge-warning'
            case 'SKIPPED': return 'badge-cold'
            default: return 'badge-cold'
        }
    }

    return (
        <div className="absolute inset-0 bg-[var(--bg-base)] p-[28px] flex flex-col animate-stagger">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">SYSTEM LOGS</h2>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">AUTO-REFRESH {autoRefresh ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className="w-[36px] h-[20px] border-2 shadow-[2px_2px_0] relative flex items-center p-[2px] cursor-pointer"
                            style={{
                                backgroundColor: autoRefresh ? 'var(--accent)' : 'var(--bg-raised)',
                                borderColor: '#0D0D0D',
                                boxShadow: '2px 2px 0 #0D0D0D'
                            }}
                        >
                            <div
                                className="w-[12px] h-[12px] bg-[#0D0D0D] absolute transition-all duration-200"
                                style={{ right: autoRefresh ? '2px' : 'auto', left: autoRefresh ? 'auto' : '2px' }}
                            ></div>
                        </div>
                    </div>
                    <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        EXPORT
                    </button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
                <div className="flex gap-3">
                    {filters.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`btn-base px-[14px] py-[6px] text-[10px] ${activeFilter === f ? 'btn-accent' : 'bg-[var(--bg-surface)]'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 items-center">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-[36px] px-3 text-[11px] font-bold uppercase tracking-widest"
                    />
                    <span className="text-[var(--text-primary)] font-bold text-lg">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-[36px] px-3 text-[11px] font-bold uppercase tracking-widest"
                    />
                    <div className="relative ml-3">
                        <input
                            type="text"
                            placeholder="SEARCH ID/MSG"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="h-[36px] w-[160px] px-3 text-[11px] font-bold uppercase tracking-widest"
                        />
                    </div>
                </div>
            </div>

            {/* METRICS BAR */}
            <div className="flex gap-4 mb-5 flex-shrink-0">
                <div className="brutalist-card p-[16px_20px] flex-1 flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest mb-2">TOTAL LOGS</span>
                    <span className="font-syne text-2xl font-bold text-[var(--text-primary)] leading-none">8,492</span>
                </div>
                <div className="brutalist-card p-[16px_20px] flex-1 flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest mb-2">SENT TODAY</span>
                    <span className="font-syne text-2xl font-bold text-[var(--success)] leading-none">612</span>
                </div>
                <div className="brutalist-card p-[16px_20px] flex-1 flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest mb-2">FAILED</span>
                    <span className="font-syne text-2xl font-bold text-[var(--danger)] leading-none">14</span>
                </div>
                <div className="brutalist-card p-[16px_20px] flex-1 flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest mb-2">PENDING</span>
                    <span className="font-syne text-2xl font-bold text-[var(--warning)] leading-none">23</span>
                </div>
            </div>

            {/* LOG TABLE */}
            <div className="flex-1 overflow-auto brutalist-table-container flex flex-col relative">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-[var(--bg-raised)] sticky top-0 z-10">
                        <tr>
                            <th className="p-[12px_16px] w-[110px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">TIMESTAMP</th>
                            <th className="p-[12px_16px] w-[200px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">LEAD</th>
                            <th className="p-[12px_16px] w-[180px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">ACTION</th>
                            <th className="p-[12px_16px] w-[120px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">STATUS</th>
                            <th className="p-[12px_16px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">DETAIL</th>
                            <th className="p-[12px_16px] w-[100px] text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold text-right">LATENCY</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold">
                        {logs.map((log, index) => {
                            const failed = log.status === 'FAILED'
                            const textClass = failed ? 'text-[var(--danger)]' : ''
                            return (
                                <tr key={log._id} className={`h-[44px] hover:bg-[var(--bg-hover)] ${getRowBg(log.status, index)}`}>
                                    <td className={`p-[0_16px] ${failed ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{log.timestamp}</td>
                                    <td className={`p-[0_16px] ${failed ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{log.leadName}</td>
                                    <td className={`p-[0_16px] ${failed ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>{log.action}</td>
                                    <td className="p-[0_16px]"><span className={`badge ${getBadgeClass(log.status)}`}>{log.status}</span></td>
                                    <td className={`p-[0_16px] ${failed ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>{log.detail}</td>
                                    <td className={`p-[0_16px] text-right ${failed ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{log.latencyMs ? `${log.latencyMs}ms` : '—'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* BOTTOM STATUS BAR */}
            <div className="h-[36px] mt-4 bg-[var(--bg-topbar)] border-t-2 border-[var(--border-bright)] flex items-center justify-between px-5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">RUNNING — 12 ACTIVE JOBS</span>
                </div>
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    8,492 TOTAL LOGS // 234 TODAY
                </div>
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1">
                    LAST SYNC: 09:42:33 <span className="animate-blink text-[var(--text-primary)]">▮</span>
                </div>
            </div>
        </div>
    )
}
