import { useState, useEffect } from 'react'
import { NODE_DEFS, NODE_CATEGORIES } from './nodeTypes'
import useWorkflowStore from './workflowStore'
import ConfigForm from './ConfigForm'

export default function ConfigPanel() {
    const {
        configPanelOpen, selectedNodeId, nodes,
        closeConfigPanel, updateNodeConfig, updateNodeData,
        duplicateNode, deleteNode, toggleNodeEnabled,
    } = useWorkflowStore()

    const [activeTab, setActiveTab] = useState('config')

    const node = nodes.find((n) => n.id === selectedNodeId)
    const def = node ? NODE_DEFS[node.data.nodeType] : null
    const cat = def ? NODE_CATEGORIES.find((c) => c.id === def.category) : null

    useEffect(() => {
        setActiveTab('config')
    }, [selectedNodeId])

    if (!configPanelOpen || !node || !def) return null

    const handleConfigChange = (config) => {
        updateNodeConfig(node.id, config)
    }

    const handleSaveAndClose = () => {
        closeConfigPanel()
    }

    const handleNoteChange = (note) => {
        updateNodeData(node.id, { note })
    }

    const handleLabelChange = (label) => {
        updateNodeData(node.id, { label })
    }

    const nodeJson = JSON.stringify(
        {
            id: node.id,
            type: node.data.nodeType,
            label: node.data.label,
            enabled: node.data.enabled,
            note: node.data.note || '',
            config: node.data.config,
            position: node.position,
        },
        null,
        2
    )

    return (
        <div className="wf-config-panel">
            {/* Header */}
            <div className="wf-config-header">
                <div className="wf-config-header-top">
                    <span className="wf-config-cat">{cat?.label}</span>
                    <button className="wf-config-close" onClick={closeConfigPanel}>✕</button>
                </div>
                <div className="wf-config-title-row">
                    <span className="wf-config-tag">{def.tag}</span>
                    <div>
                        <div className="wf-config-type">{def.label}</div>
                        <div className="wf-config-desc">{def.description}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="wf-config-tabs">
                {['config', 'notes', 'json'].map((tab) => (
                    <button
                        key={tab}
                        className={`wf-config-tab ${activeTab === tab ? 'wf-config-tab-active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="wf-config-body">
                {activeTab === 'config' && (
                    <div className="wf-config-form-wrap">
                        <div className="wf-form-group">
                            <label className="wf-form-label">NODE LABEL</label>
                            <input
                                className="wf-form-input"
                                value={node.data.label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                            />
                        </div>
                        <div className="wf-form-divider" />
                        <ConfigForm
                            nodeType={node.data.nodeType}
                            config={node.data.config}
                            onSave={handleConfigChange}
                            color="var(--accent)"
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="wf-config-notes">
                        <div className="wf-form-group">
                            <label className="wf-form-label">NOTES</label>
                            <textarea
                                className="wf-form-textarea"
                                rows={6}
                                placeholder="Add notes about this node..."
                                value={node.data.note || ''}
                                onChange={(e) => handleNoteChange(e.target.value)}
                            />
                        </div>
                        <div className="wf-form-group wf-form-row">
                            <label className="wf-form-label">ENABLED</label>
                            <button
                                className={`wf-toggle ${node.data.enabled ? 'wf-toggle-on' : ''}`}
                                onClick={() => toggleNodeEnabled(node.id)}
                            >
                                <span className="wf-toggle-knob" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'json' && (
                    <div className="wf-config-json">
                        <pre className="wf-json-pre">{nodeJson}</pre>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="wf-config-footer">
                <button className="wf-config-save-btn" onClick={handleSaveAndClose}>
                    SAVE
                </button>
                <button className="wf-config-ghost-btn"
                    onClick={() => { duplicateNode(node.id); closeConfigPanel() }}>
                    DUPLICATE
                </button>
                <button className="wf-config-ghost-btn wf-config-danger"
                    onClick={() => { deleteNode(node.id); closeConfigPanel() }}>
                    DELETE
                </button>
            </div>
        </div>
    )
}
