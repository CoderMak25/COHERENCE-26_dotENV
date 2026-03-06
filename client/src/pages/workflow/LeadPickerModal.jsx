import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

export default function LeadPickerModal() {
    const {
        showLeadPicker, closeLeadPicker,
        allLeads, fetchLeads,
        assignedLeads, toggleLeadAssignment, setAssignedLeads,
    } = useWorkflowStore()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        if (showLeadPicker) fetchLeads()
    }, [showLeadPicker])

    if (!showLeadPicker) return null

    const filtered = allLeads.filter((lead) => {
        const matchSearch = !search ||
            lead.name?.toLowerCase().includes(search.toLowerCase()) ||
            lead.email?.toLowerCase().includes(search.toLowerCase()) ||
            lead.company?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || lead.status === statusFilter
        return matchSearch && matchStatus
    })

    const allVisibleSelected = filtered.length > 0 && filtered.every((l) => assignedLeads.includes(l._id))

    const toggleAll = () => {
        if (allVisibleSelected) {
            // Deselect all visible
            const visibleIds = filtered.map((l) => l._id)
            setAssignedLeads(assignedLeads.filter((id) => !visibleIds.includes(id)))
        } else {
            // Select all visible
            const newIds = [...new Set([...assignedLeads, ...filtered.map((l) => l._id)])]
            setAssignedLeads(newIds)
        }
    }

    const statuses = ['all', ...new Set(allLeads.map((l) => l.status).filter(Boolean))]

    return (
        <div className="wf-lead-overlay" onClick={closeLeadPicker}>
            <div className="wf-lead-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="wf-lead-header">
                    <div>
                        <h3 className="wf-lead-title">ASSIGN LEADS</h3>
                        <span className="wf-lead-subtitle">{assignedLeads.length} SELECTED</span>
                    </div>
                    <button className="wf-lead-close" onClick={closeLeadPicker}>✕</button>
                </div>

                {/* Filters */}
                <div className="wf-lead-filters">
                    <div className="wf-lead-search-wrap">
                        <Icon icon="solar:magnifer-linear" className="wf-lead-search-icon" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="wf-lead-search"
                        />
                    </div>
                    <div className="wf-lead-status-filter">
                        {statuses.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`wf-lead-status-btn ${statusFilter === s ? 'active' : ''}`}
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Select all */}
                <div className="wf-lead-select-all" onClick={toggleAll}>
                    <div className={`wf-lead-check ${allVisibleSelected ? 'checked' : ''}`}>
                        {allVisibleSelected && '✓'}
                    </div>
                    <span>SELECT ALL ({filtered.length})</span>
                </div>

                {/* Lead list */}
                <div className="wf-lead-list">
                    {filtered.length === 0 && (
                        <div className="wf-lead-empty">No leads found</div>
                    )}
                    {filtered.map((lead) => {
                        const selected = assignedLeads.includes(lead._id)
                        return (
                            <div
                                key={lead._id}
                                className={`wf-lead-item ${selected ? 'selected' : ''}`}
                                onClick={() => toggleLeadAssignment(lead._id)}
                            >
                                <div className={`wf-lead-check ${selected ? 'checked' : ''}`}>
                                    {selected && '✓'}
                                </div>
                                <div className="wf-lead-info">
                                    <span className="wf-lead-name">{lead.name}</span>
                                    <span className="wf-lead-meta">
                                        {lead.email || '—'} · {lead.company || '—'}
                                    </span>
                                </div>
                                <span className={`wf-lead-badge ${lead.status === 'New' ? 'new' : lead.status === 'Contacted' ? 'contacted' : 'other'}`}>
                                    {(lead.status || 'NEW').toUpperCase()}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="wf-lead-footer">
                    <span className="wf-lead-count">{assignedLeads.length} LEADS ASSIGNED</span>
                    <button className="wf-lead-confirm" onClick={closeLeadPicker}>
                        CONFIRM
                    </button>
                </div>
            </div>
        </div>
    )
}
