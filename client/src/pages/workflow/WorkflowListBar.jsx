import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import useWorkflowStore from './workflowStore'

export default function WorkflowListBar() {
    const {
        workflowName, setWorkflowName,
        workflowId, savedWorkflows, loadingList,
        saving, dirty,
        loadSavedWorkflows, loadWorkflowFromDB,
        saveWorkflowToDB, createNewWorkflow, deleteWorkflowFromDB,
        toggleLeadSelector, selectedLeadIds,
    } = useWorkflowStore()

    const [showDropdown, setShowDropdown] = useState(false)
    const [newName, setNewName] = useState('')
    const [showCreate, setShowCreate] = useState(false)

    useEffect(() => {
        loadSavedWorkflows()
    }, [])

    const handleCreate = async () => {
        if (!newName.trim()) return
        await createNewWorkflow(newName.trim())
        setNewName('')
        setShowCreate(false)
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation()
        if (confirm('Delete this workflow permanently?')) {
            await deleteWorkflowFromDB(id)
        }
    }

    return (
        <div className="wf-list-bar">
            {/* Workflow name (editable) */}
            <div className="wf-lb-name-section">
                <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="wf-lb-name-input"
                    spellCheck={false}
                />
                {dirty && <span className="wf-lb-dirty">●</span>}
                {workflowId && <span className="wf-lb-id">ID: {workflowId.slice(-6)}</span>}
            </div>

            {/* Actions */}
            <div className="wf-lb-actions">
                {/* Workflow list dropdown */}
                <div className="wf-lb-dropdown-wrap">
                    <button
                        className="wf-lb-btn"
                        onClick={() => { setShowDropdown(!showDropdown); setShowCreate(false) }}
                    >
                        <Icon icon="solar:list-bold" className="text-sm mr-1" />
                        WORKFLOWS ({savedWorkflows.length})
                    </button>
                    {showDropdown && (
                        <div className="wf-lb-dropdown">
                            <div className="wf-lb-dd-header">
                                <span>SAVED WORKFLOWS</span>
                                <button
                                    className="wf-lb-dd-new"
                                    onClick={() => setShowCreate(true)}
                                >
                                    + NEW
                                </button>
                            </div>
                            {showCreate && (
                                <div className="wf-lb-dd-create">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Workflow name..."
                                        className="wf-lb-dd-input"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    />
                                    <button className="wf-lb-dd-create-btn" onClick={handleCreate}>CREATE</button>
                                </div>
                            )}
                            {loadingList && (
                                <div className="wf-lb-dd-empty">Loading...</div>
                            )}
                            {!loadingList && savedWorkflows.length === 0 && (
                                <div className="wf-lb-dd-empty">No saved workflows</div>
                            )}
                            {savedWorkflows.map((wf) => (
                                <div
                                    key={wf._id}
                                    className={`wf-lb-dd-item ${wf._id === workflowId ? 'wf-lb-dd-active' : ''}`}
                                    onClick={() => { loadWorkflowFromDB(wf._id); setShowDropdown(false) }}
                                >
                                    <div className="wf-lb-dd-item-info">
                                        <span className="wf-lb-dd-item-name">{wf.name}</span>
                                        <span className="wf-lb-dd-item-meta">
                                            {wf.nodes?.length || 0} nodes · {(wf.assignedLeads || []).length} leads · {wf.status}
                                        </span>
                                    </div>
                                    <button
                                        className="wf-lb-dd-del"
                                        onClick={(e) => handleDelete(e, wf._id)}
                                        title="Delete"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Select leads — opens the LeadSelector panel */}
                <button className="wf-lb-btn" onClick={toggleLeadSelector}>
                    <Icon icon="solar:users-group-two-rounded-linear" className="text-sm mr-1" />
                    LEADS ({selectedLeadIds.length})
                </button>

                {/* Save */}
                <button
                    className="wf-lb-btn wf-lb-save"
                    onClick={saveWorkflowToDB}
                    disabled={saving}
                >
                    {saving ? '...' : dirty ? '● SAVE' : '✓ SAVED'}
                </button>
            </div>
        </div>
    )
}
