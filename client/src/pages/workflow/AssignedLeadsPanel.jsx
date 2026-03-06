import { useEffect } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

export default function AssignedLeadsPanel() {
    const {
        assignedLeads, allLeads, fetchLeads,
        toggleLeadAssignment, toggleLeadPicker,
    } = useWorkflowStore()

    // Fetch leads if not loaded
    useEffect(() => {
        if (allLeads.length === 0) fetchLeads()
    }, [])

    // Get full lead objects for assigned IDs
    const assignedLeadData = assignedLeads
        .map(id => allLeads.find(l => l._id === id))
        .filter(Boolean)

    if (assignedLeadData.length === 0) return null

    return (
        <div className="wf-assigned-panel">
            <div className="wf-assigned-header">
                <span className="wf-assigned-title">
                    <Icon icon="solar:users-group-two-rounded-bold" style={{ fontSize: 14 }} />
                    ASSIGNED LEADS ({assignedLeadData.length})
                </span>
                <button className="wf-assigned-add" onClick={toggleLeadPicker}>
                    + ADD
                </button>
            </div>
            <div className="wf-assigned-list">
                {assignedLeadData.map((lead) => (
                    <div key={lead._id} className="wf-assigned-card">
                        <div className="wf-assigned-avatar">
                            {(lead.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="wf-assigned-info">
                            <span className="wf-assigned-name">{lead.name}</span>
                            <span className="wf-assigned-email">{lead.email || 'No email'}</span>
                            {lead.company && (
                                <span className="wf-assigned-company">{lead.company}{lead.position ? ` · ${lead.position}` : ''}</span>
                            )}
                        </div>
                        <button
                            className="wf-assigned-remove"
                            onClick={() => toggleLeadAssignment(lead._id)}
                            title="Remove from workflow"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
