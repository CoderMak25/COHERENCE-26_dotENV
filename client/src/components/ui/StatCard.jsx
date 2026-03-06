import { Icon } from '@iconify/react'

export default function StatCard({ label, value, icon, change, valueColor = 'text-accent' }) {
    return (
        <div className="brutalist-card p-5 flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">{label}</span>
                <Icon icon={icon} className="text-[var(--text-muted)] text-lg" />
            </div>
            <span className={`font-syne text-4xl font-bold ${valueColor} mb-2 leading-none`}>{value}</span>
            <span className="text-[11px] text-[var(--success)] font-bold tracking-widest mt-auto">{change}</span>
        </div>
    )
}
