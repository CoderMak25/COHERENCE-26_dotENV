import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

export default function LeadSelector() {
    const { selectedLeadIds, setSelectedLeadIds, showLeadSelector } = useWorkflowStore()
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        if (!showLeadSelector) return
        setLoading(true)
        fetch('/api/leads?limit=200')
            .then(r => r.json())
            .then(d => { setLeads(d.data || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [showLeadSelector])

    const filtered = leads.filter(l =>
        (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.company || '').toLowerCase().includes(search.toLowerCase())
    )

    const toggle = useCallback((id) => {
        setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }, [setSelectedLeadIds])

    const selectAll = () => setSelectedLeadIds(filtered.map(l => l._id))
    const deselectAll = () => setSelectedLeadIds([])

    if (!showLeadSelector) return null

    return (
        <div className="wf-lead-selector">
            {/* Header */}
            <div className="wf-ls-header">
                <div className="wf-ls-title">
                    <Icon icon="solar:users-group-two-rounded-linear" className="wf-ls-icon" />
                    <span>SELECT LEADS</span>
                </div>
                <button
                    className="wf-ls-close"
                    onClick={() => useWorkflowStore.setState({ showLeadSelector: false })}
                >
                    ✕
                </button>
            </div>

            {/* Count badge */}
            <div className="wf-ls-count">
                {selectedLeadIds.length === 0
                    ? <span className="wf-ls-all-tag">ALL LEADS ({leads.length})</span>
                    : <span className="wf-ls-sel-tag">{selectedLeadIds.length} OF {leads.length} SELECTED</span>
                }
            </div>

            {/* Search */}
            <div className="wf-ls-search-wrap">
                <Icon icon="solar:magnifer-linear" className="wf-ls-search-icon" />
                <input
                    className="wf-ls-search"
                    placeholder="Search leads..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Select all / none */}
            <div className="wf-ls-actions">
                <button onClick={selectAll} className="wf-ls-action-btn">Select All</button>
                <button onClick={deselectAll} className="wf-ls-action-btn">Clear</button>
            </div>

            {/* Lead list */}
            <div className="wf-ls-list">
                {loading ? (
                    <div className="wf-ls-loading">Loading leads...</div>
                ) : filtered.length === 0 ? (
                    <div className="wf-ls-loading">No leads found</div>
                ) : filtered.map(lead => {
                    const selected = selectedLeadIds.includes(lead._id)
                    return (
                        <button
                            key={lead._id}
                            className={`wf-ls-item ${selected ? 'wf-ls-selected' : ''}`}
                            onClick={() => toggle(lead._id)}
                        >
                            <div className={`wf-ls-check ${selected ? 'wf-ls-checked' : ''}`}>
                                {selected && '✓'}
                            </div>
                            <div className="wf-ls-info">
                                <span className="wf-ls-name">{lead.name || 'Unknown'}</span>
                                <span className="wf-ls-email">{lead.email || 'no email'}</span>
                            </div>
                            {lead.company && <span className="wf-ls-company">{lead.company}</span>}
                        </button>
                    )
                })}
            </div>

            {/* Footer hint */}
            <div className="wf-ls-footer">
                <Icon icon="solar:info-circle-linear" style={{ fontSize: 12 }} />
                {selectedLeadIds.length === 0
                    ? 'No selection = runs on ALL leads'
                    : `Will run on ${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? 's' : ''}`
                }
            </div>
        </div>
    )
}
