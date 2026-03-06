import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useLeads } from '../hooks/useLeads'

export default function Leads() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [workflowFilter, setWorkflowFilter] = useState('ALL')
    const [selectAll, setSelectAll] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])

    const { leads, loading, error, pagination } = useLeads()

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Contacted': return { class: 'badge-success', label: 'ACTIVE' }
            case 'Replied': return { class: 'badge-accent', label: 'REPLIED' }
            case 'New': return { class: 'badge-warning', label: 'PENDING' }
            case 'Converted': return { class: 'badge-cold', label: 'COLD' }
            case 'Opened': return { class: 'badge-success', label: 'OPENED' }
            default: return { class: 'badge-cold', label: status?.toUpperCase() || 'NEW' }
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([])
        } else {
            setSelectedIds(leads.map(l => l._id))
        }
        setSelectAll(!selectAll)
    }

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] flex flex-col animate-stagger">
            <div className="flex justify-between items-center flex-shrink-0">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">LEADS DATABASE</h2>
                <div className="flex gap-4">
                    <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        EXPORT
                    </button>
                    <button className="btn-base btn-accent">
                        IMPORT CSV
                    </button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="flex gap-4 my-6 flex-shrink-0">
                <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME, EMAIL, COMPANY..."
                        className="w-full h-[40px] px-3.5 text-[11px] font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Icon icon="solar:magnifer-linear" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
                <div className="relative w-[150px]">
                    <select
                        className="appearance-none w-full h-[40px] px-3.5 text-[11px] font-bold cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">STATUS: ALL</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PENDING">PENDING</option>
                        <option value="COLD">COLD</option>
                    </select>
                    <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                </div>
                <div className="relative w-[180px]">
                    <select
                        className="appearance-none w-full h-[40px] px-3.5 text-[11px] font-bold cursor-pointer"
                        value={workflowFilter}
                        onChange={(e) => setWorkflowFilter(e.target.value)}
                    >
                        <option value="ALL">WORKFLOW: ALL</option>
                        <option value="Q1 Outbound">Q1 Outbound</option>
                        <option value="Enterprise">Enterprise</option>
                    </select>
                    <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="flex-1 overflow-auto brutalist-table-container flex flex-col relative min-h-[400px]">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-[var(--bg-raised)] sticky top-0 z-10">
                        <tr>
                            <th className="p-[12px_16px] w-[40px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">
                                <input type="checkbox" className="w-4 h-4" checked={selectAll} onChange={toggleSelectAll} />
                            </th>
                            <th className="p-[12px_16px] w-[50px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">#</th>
                            <th className="p-[12px_16px] w-[180px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">NAME</th>
                            <th className="p-[12px_16px] w-[160px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">COMPANY</th>
                            <th className="p-[12px_16px] w-[140px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">ROLE</th>
                            <th className="p-[12px_16px] w-[220px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">EMAIL</th>
                            <th className="p-[12px_16px] w-[110px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">STATUS</th>
                            <th className="p-[12px_16px] w-[160px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">WORKFLOW</th>
                            <th className="p-[12px_16px] w-[160px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">LAST ACTION</th>
                            <th className="p-[12px_16px] w-[90px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest text-center">⋯</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold">
                        {loading && (
                            <tr>
                                <td colSpan="10" className="p-[20px] text-center text-[var(--text-muted)]">Loading leads from database...</td>
                            </tr>
                        )}
                        {!loading && leads.length === 0 && (
                            <tr>
                                <td colSpan="10" className="p-[20px] text-center text-[var(--text-muted)]">No leads found. Please import data.</td>
                            </tr>
                        )}
                        {!loading && leads.map((lead, index) => {
                            const badge = getStatusBadge(lead.status)
                            return (
                                <tr key={lead._id} className={`hover:bg-[var(--bg-hover)] transition-colors duration-75 ${index % 2 === 0 ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-base)]'}`}>
                                    <td className="p-[12px_16px]">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4"
                                            checked={selectedIds.includes(lead._id)}
                                            onChange={() => toggleSelect(lead._id)}
                                        />
                                    </td>
                                    <td className="p-[12px_16px] text-[var(--text-muted)]">{String(index + 1).padStart(2, '0')}</td>
                                    <td className="p-[12px_16px] text-[var(--text-primary)]">{lead.name}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.company}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.position}</td>
                                    <td className="p-[12px_16px] text-[var(--text-muted)]">{lead.email}</td>
                                    <td className="p-[12px_16px]"><span className={`badge ${badge.class}`}>{badge.label}</span></td>
                                    <td className={`p-[12px_16px] ${lead.workflow ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{lead.workflow || '—'}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.lastAction || 'No Actions Yet'}</td>
                                    <td className="p-[12px_16px] flex gap-2 justify-center">
                                        <button className="w-[30px] h-[30px] page-btn bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:-translate-y-[1px]">
                                            <Icon icon="solar:play-bold" />
                                        </button>
                                        <button className="w-[30px] h-[30px] page-btn bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:-translate-y-[1px]">
                                            <Icon icon="solar:menu-dots-bold" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            <div className="mt-5 pt-4 flex items-center justify-between flex-shrink-0 border-t-2 border-[var(--border-bright)]">
                <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">
                    SHOWING {(pagination?.page - 1) * pagination?.limit + 1 || 0}–{Math.min((pagination?.page) * pagination?.limit, pagination?.total || 0) || 0} OF {pagination?.total || 0} LEADS
                </span>
                <div className="flex gap-2">
                    <button className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px]">‹</button>
                    <button className="h-[32px] w-[32px] page-btn active flex items-center justify-center transition-transform hover:-translate-y-[1px]">1</button>
                    <button className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px]">2</button>
                    <button className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px]">3</button>
                    <span className="text-[var(--text-muted)] font-bold flex items-center justify-center px-2">...</span>
                    <button className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px]">50</button>
                    <button className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px]">›</button>
                </div>
            </div>
        </div>
    )
}
