import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

export default function LeadPickerModal() {
    const {
        showLeadSelector, toggleLeadSelector,
        allLeads, fetchLeads,
        selectedLeadIds, setSelectedLeadIds,
    } = useWorkflowStore()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        if (showLeadSelector) fetchLeads()
    }, [showLeadSelector])

    if (!showLeadSelector) return null

    const filtered = allLeads.filter((lead) => {
        const matchSearch = !search ||
            lead.name?.toLowerCase().includes(search.toLowerCase()) ||
            lead.email?.toLowerCase().includes(search.toLowerCase()) ||
            lead.company?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || lead.status === statusFilter
        return matchSearch && matchStatus
    })

    const allVisibleSelected = filtered.length > 0 && filtered.every((l) => selectedLeadIds.includes(l._id))

    const toggleLead = (leadId) => {
        setSelectedLeadIds(prev =>
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        )
    }

    const toggleAll = () => {
        if (allVisibleSelected) {
            // Deselect all visible
            const visibleIds = filtered.map((l) => l._id)
            setSelectedLeadIds(selectedLeadIds.filter((id) => !visibleIds.includes(id)))
        } else {
            // Select all visible
            const newIds = [...new Set([...selectedLeadIds, ...filtered.map((l) => l._id)])]
            setSelectedLeadIds(newIds)
        }
    }

    const statuses = ['all', ...new Set(allLeads.map((l) => l.status).filter(Boolean))]

    return (
        <div className="wf-lead-overlay" onClick={toggleLeadSelector}>
            <div className="wf-lead-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="wf-lead-header">
                    <div>
                        <h3 className="wf-lead-title">SELECT LEADS</h3>
                        <span className="wf-lead-subtitle">{selectedLeadIds.length} SELECTED</span>
                    </div>
                    <button className="wf-lead-close" onClick={toggleLeadSelector}>✕</button>
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
                        const selected = selectedLeadIds.includes(lead._id)
                        return (
                            <div
                                key={lead._id}
                                className={`wf-lead-item ${selected ? 'selected' : ''}`}
                                onClick={() => toggleLead(lead._id)}
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
                    <span className="wf-lead-count">{selectedLeadIds.length} LEADS SELECTED</span>
                    <button className="wf-lead-confirm" onClick={toggleLeadSelector}>
                        CONFIRM
                    </button>
                </div>
            </div>
        </div>
    )
}
