import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useLeads } from '../hooks/useLeads'
import { leadsAPI } from '../services/api'

export default function Leads() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [workflowFilter, setWorkflowFilter] = useState('ALL')
    const [selectAll, setSelectAll] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])
    const [page, setPage] = useState(1)
    const [showCreate, setShowCreate] = useState(false)
    const [createForm, setCreateForm] = useState({ name: '', email: '', company: '', position: '', status: 'New' })
    const [creating, setCreating] = useState(false)

    const { leads = [], loading, error, pagination, refetch } = useLeads({
        search, status: statusFilter, workflow: workflowFilter, page
    })

    // Reset pagination to 1 when filters change
    useEffect(() => { setPage(1) }, [search, statusFilter, workflowFilter])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!createForm.name || !createForm.email) return alert('Name and Email are required')
        try {
            setCreating(true)
            await leadsAPI.create(createForm)
            setShowCreate(false)
            setCreateForm({ name: '', email: '', company: '', position: '', status: 'New' })
            refetch()
        } catch (err) {
            alert('Create failed: ' + (err.error || err.message || JSON.stringify(err)))
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (lead) => {
        if (!confirm('Delete lead ' + lead.name + '?')) return
        try {
            await leadsAPI.remove(lead._id)
            refetch()
        } catch (err) {
            alert('Delete failed: ' + (err.error || err.message || err))
        }
    }

    const handleImport = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        try {
            const result = await leadsAPI.import(file)
            refetch()
            const msg = `Import successful!\n\n✅ Imported: ${result.imported}\n⏭️ Skipped: ${result.skipped}${result.errors?.length ? `\n⚠️ Errors: ${result.errors.length}` : ''}`
            alert(msg)
        } catch (err) {
            const errorMsg = err?.error || err?.message || 'Unknown error'
            alert('⚠️ Import Failed\n\n' + errorMsg)
        }
        e.target.value = null
    }

    const handleExport = () => {
        if (!leads.length) return alert('No leads to export')
        const headers = ['NAME', 'COMPANY', 'ROLE', 'EMAIL', 'STATUS']
        const rows = leads.map(l => [
            `"${l.name || ''}"`,
            `"${l.company || ''}"`,
            `"${l.position || ''}"`,
            `"${l.email || ''}"`,
            `"${l.status || ''}"`
        ])
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'leads_export.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Contacted': return { class: 'badge-success', label: 'ACTIVE' }
            case 'Replied': return { class: 'badge-accent', label: 'REPLIED' }
            case 'New': return { class: 'badge-warning', label: 'PENDING' }
            case 'Converted': return { class: 'badge-cold', label: 'CONVERTED' }
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

    const getScoreColor = (score) => {
        if (score >= 81) return 'var(--danger)'
        if (score >= 61) return 'var(--accent, #e07a2f)'
        if (score >= 31) return 'var(--warning, #d4a72c)'
        return 'var(--text-muted)'
    }

    // Build page numbers for pagination
    const buildPageNumbers = () => {
        const totalPages = pagination?.pages || 1
        const current = page
        const pages = []

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            pages.push(1)
            if (current > 3) pages.push('...')
            const start = Math.max(2, current - 1)
            const end = Math.min(totalPages - 1, current + 1)
            for (let i = start; i <= end; i++) pages.push(i)
            if (current < totalPages - 2) pages.push('...')
            pages.push(totalPages)
        }
        return pages
    }

    // Row offset for global numbering
    const rowOffset = ((pagination?.page || 1) - 1) * (pagination?.limit || 25)

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] flex flex-col animate-stagger">
            <div className="flex justify-between items-center flex-shrink-0">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">LEADS DATABASE</h2>
                <div className="flex gap-4">
                    <button onClick={() => setShowCreate(true)} className="btn-base btn-accent">
                        <Icon icon="solar:add-circle-bold" className="mr-1 text-xs" /> CREATE
                    </button>
                    <button onClick={handleExport} className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                        EXPORT
                    </button>
                    <a href="/sample_leads_format.csv" download="sample_leads_format.csv" className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] flex items-center justify-center m-0 no-underline cursor-pointer">
                        SAMPLE CSV
                    </a>
                    <label className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] cursor-pointer flex items-center justify-center m-0">
                        IMPORT CSV
                        <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
                    </label>
                </div>
            </div>

            {/* CREATE LEAD MODAL */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
                    <div className="brutalist-card p-6 w-[420px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">CREATE NEW LEAD</h3>
                        <form onSubmit={handleCreate} className="flex flex-col gap-3">
                            <input type="text" placeholder="FULL NAME *" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className="h-[40px] px-3 text-[11px] font-bold" required />
                            <input type="email" placeholder="EMAIL *" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="h-[40px] px-3 text-[11px] font-bold" required />
                            <input type="text" placeholder="COMPANY" value={createForm.company} onChange={e => setCreateForm(f => ({ ...f, company: e.target.value }))} className="h-[40px] px-3 text-[11px] font-bold" />
                            <input type="text" placeholder="ROLE / POSITION" value={createForm.position} onChange={e => setCreateForm(f => ({ ...f, position: e.target.value }))} className="h-[40px] px-3 text-[11px] font-bold" />
                            <select value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))} className="h-[40px] px-3 text-[11px] font-bold">
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Opened">Opened</option>
                                <option value="Replied">Replied</option>
                                <option value="Converted">Converted</option>
                            </select>
                            <div className="flex gap-3 mt-2">
                                <button type="submit" disabled={creating} className="btn-base btn-accent flex-1">{creating ? 'CREATING...' : 'CREATE LEAD'}</button>
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] flex-1">CANCEL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                        <option value="New">NEW</option>
                        <option value="Contacted">CONTACTED</option>
                        <option value="Opened">OPENED</option>
                        <option value="Replied">REPLIED</option>
                        <option value="Converted">CONVERTED</option>
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
                            <th className="p-[12px_16px] w-[90px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">SCORE</th>
                            <th className="p-[12px_16px] w-[160px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">WORKFLOW</th>
                            <th className="p-[12px_16px] w-[160px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest">LAST ACTION</th>
                            <th className="p-[12px_16px] w-[90px] text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest text-center">⋯</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold">
                        {loading && (
                            <tr>
                                <td colSpan="11" className="p-[20px] text-center text-[var(--text-muted)]">Loading leads from database...</td>
                            </tr>
                        )}
                        {!loading && leads.length === 0 && (
                            <tr>
                                <td colSpan="11" className="p-[20px] text-center text-[var(--text-muted)]">No leads found. Click CREATE to add one.</td>
                            </tr>
                        )}
                        {!loading && leads.map((lead, index) => {
                            const badge = getStatusBadge(lead.status)
                            const globalIndex = rowOffset + index + 1
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
                                    <td className="p-[12px_16px] text-[var(--text-muted)]">{String(globalIndex).padStart(2, '0')}</td>
                                    <td className="p-[12px_16px] text-[var(--text-primary)]">{lead.name}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.company}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.position}</td>
                                    <td className="p-[12px_16px] text-[var(--text-muted)]">{lead.email}</td>
                                    <td className="p-[12px_16px]"><span className={`badge ${badge.class}`}>{badge.label}</span></td>
                                    <td className="p-[12px_16px]">
                                        <span className="text-[11px] font-bold" style={{ color: getScoreColor(lead.score || 0) }}>{lead.score || 0}</span>
                                        <span className="text-[9px] font-bold ml-1" style={{ color: getScoreColor(lead.score || 0) }}>{lead.scoreLabel || '—'}</span>
                                    </td>
                                    <td className={`p-[12px_16px] ${lead.workflow ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{lead.workflow || '—'}</td>
                                    <td className="p-[12px_16px] text-[var(--text-secondary)]">{lead.lastAction || 'No Actions Yet'}</td>
                                    <td className="p-[12px_16px] flex gap-2 justify-center">
                                        <button onClick={() => handleDelete(lead)} className="w-[30px] h-[30px] page-btn bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:-translate-y-[1px]">
                                            <Icon icon="solar:trash-bin-trash-bold" />
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
                    SHOWING {pagination?.total > 0 ? rowOffset + 1 : 0}–{Math.min(rowOffset + (pagination?.limit || 25), pagination?.total || 0)} OF {pagination?.total || 0} LEADS
                </span>
                <div className="flex gap-1">
                    {/* Previous button */}
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >‹</button>

                    {/* Page number buttons */}
                    {buildPageNumbers().map((p, i) =>
                        p === '...' ? (
                            <span key={`ellipsis-${i}`} className="h-[32px] w-[24px] flex items-center justify-center text-[var(--text-muted)] text-[11px] font-bold select-none">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`h-[32px] min-w-[32px] px-1 text-[11px] font-bold flex items-center justify-center transition-transform hover:-translate-y-[1px] ${p === page
                                    ? 'page-btn active'
                                    : 'page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >{p}</button>
                        )
                    )}

                    {/* Next button */}
                    <button
                        onClick={() => setPage(p => Math.min(pagination?.pages || 1, p + 1))}
                        disabled={!pagination?.pages || page >= pagination.pages}
                        className="h-[32px] w-[32px] page-btn bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] font-bold flex items-center justify-center hover:bg-[var(--bg-hover)] hover:-translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >›</button>
                </div>
            </div>
        </div>
    )
}
