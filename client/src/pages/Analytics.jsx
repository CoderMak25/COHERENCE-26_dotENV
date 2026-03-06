import { CHART_DATA_WEEK } from '../data/mockData'

export default function Analytics() {
    const barData = CHART_DATA_WEEK

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">ANALYTICS</h2>
                <div className="flex gap-4">
                    <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        EXPORT REPORT
                    </button>
                </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="brutalist-card p-5 flex flex-col">
                    <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-2">TOTAL SENT</span>
                    <span className="font-syne text-3xl font-bold text-[var(--text-primary)] leading-none">847</span>
                </div>
                <div className="brutalist-card p-5 flex flex-col">
                    <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-2">AVG OPEN RATE</span>
                    <span className="font-syne text-3xl font-bold text-[var(--success)] leading-none">34.2%</span>
                </div>
                <div className="brutalist-card p-5 flex flex-col">
                    <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-2">AVG REPLY RATE</span>
                    <span className="font-syne text-3xl font-bold text-accent leading-none">11.0%</span>
                </div>
                <div className="brutalist-card p-5 flex flex-col">
                    <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-2">BOUNCE RATE</span>
                    <span className="font-syne text-3xl font-bold text-[var(--danger)] leading-none">1.2%</span>
                </div>
            </div>

            {/* CHARTS ROW */}
            <div className="flex gap-4">
                {/* BAR CHART */}
                <div className="flex-[0.6] brutalist-card p-5 flex flex-col" style={{ minHeight: '300px' }}>
                    <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-4">WEEKLY SEND VOLUME</h3>
                    <div className="flex-1 relative border-l-2 border-[var(--border-bright)] border-b-2 pb-6 pl-2 flex items-end gap-1.5" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 19%, var(--border) 20%)' }}>
                        {barData.map((d, i) => (
                            <div
                                key={d.name}
                                className={`flex-1 ${d.value > 80 ? 'bg-accent' : 'bg-[var(--border)]'} border-2 border-[var(--border-bright)] hover:-translate-y-1 transition-transform relative group`}
                                style={{ height: `${(d.value / 200) * 100}%` }}
                            >
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--text-muted)]">{d.name}</span>
                                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] px-3 py-1 text-[10px] font-bold text-[var(--text-primary)] z-10">{d.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DONUT / PIE BREAKDOWN */}
                <div className="flex-[0.4] brutalist-card p-5 flex flex-col" style={{ minHeight: '300px' }}>
                    <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold mb-4">CAMPAIGN STATUS</h3>
                    <div className="flex-1 flex flex-col justify-center gap-4">
                        {[
                            { label: 'ACTIVE', value: 2, color: 'var(--success)', pct: 40 },
                            { label: 'PAUSED', value: 1, color: 'var(--warning)', pct: 20 },
                            { label: 'DRAFT', value: 1, color: 'var(--text-muted)', pct: 20 },
                            { label: 'COMPLETED', value: 1, color: 'var(--accent)', pct: 20 },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{item.label}</span>
                                    <span className="text-[11px] font-bold text-[var(--text-primary)]">{item.value}</span>
                                </div>
                                <div className="w-full h-[6px] bg-[var(--border)] border border-[var(--border-bright)]">
                                    <div className="h-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
