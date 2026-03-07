import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

const SMART_FILTERS = [
    { key: 'all', label: 'ALL', match: () => true },
    { key: 'needs_followup', label: 'NEEDS FOLLOW-UP', match: (s) => ['Contacted', 'contacted', 'completed', 'follow_up_sent', 'final_reminder_sent'].includes(s) },
    { key: 'new', label: 'NEW', match: (s) => ['New', 'new'].includes(s) },
    { key: 'replied', label: 'REPLIED', match: (s) => ['Replied', 'replied'].includes(s) },
    { key: 'needs_human', label: 'NEEDS HUMAN', match: (s) => ['needs_human', 'manual_conversation'].includes(s) },
]

export default function LeadPickerModal() {
    const {
        showLeadSelector, toggleLeadSelector,
        allLeads, fetchLeads,
        selectedLeadIds, setSelectedLeadIds,
    } = useWorkflowStore()

    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')

    useEffect(() => {
        if (showLeadSelector) fetchLeads()
    }, [showLeadSelector])

    if (!showLeadSelector) return null

    const currentFilter = SMART_FILTERS.find(f => f.key === activeFilter) || SMART_FILTERS[0]

    const filtered = allLeads.filter((lead) => {
        const matchSearch = !search ||
            lead.name?.toLowerCase().includes(search.toLowerCase()) ||
            lead.email?.toLowerCase().includes(search.toLowerCase()) ||
            lead.company?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = currentFilter.match(lead.status)
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
            const visibleIds = filtered.map((l) => l._id)
            setSelectedLeadIds(selectedLeadIds.filter((id) => !visibleIds.includes(id)))
        } else {
            const newIds = [...new Set([...selectedLeadIds, ...filtered.map((l) => l._id)])]
            setSelectedLeadIds(newIds)
        }
    }

    // Count leads per filter for badges
    const filterCounts = SMART_FILTERS.reduce((acc, f) => {
        acc[f.key] = f.key === 'all' ? allLeads.length : allLeads.filter(l => f.match(l.status)).length
        return acc
    }, {})

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
                        {SMART_FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`wf-lead-status-btn ${activeFilter === f.key ? 'active' : ''}`}
                            >
                                {f.label}
                                {filterCounts[f.key] > 0 && (
                                    <span className="wf-lead-filter-count">{filterCounts[f.key]}</span>
                                )}
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
                                <span className={`wf-lead-badge ${lead.status === 'New' ? 'new' : lead.status === 'Contacted' ? 'contacted' : lead.status === 'Replied' ? 'replied' : 'other'}`}>
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
