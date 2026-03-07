import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { NODE_DEFS, NODE_CATEGORIES } from './nodeTypes'
import useWorkflowStore from './workflowStore'

function WorkflowNode({ id, data, selected }) {
    const activeNodeId = useWorkflowStore((s) => s.activeNodeId)
    const def = NODE_DEFS[data.nodeType]
    if (!def) return null

    const isActive = activeNodeId === id
    const isDisabled = !data.enabled
    const preview = def.getPreview(data.config || {})
    const hasNote = data.note && data.note.trim().length > 0

    return (
        <div
            className={`wf-node-card ${selected ? 'wf-node-selected' : ''} ${isDisabled ? 'wf-node-disabled' : ''}`}
        >
            {isActive && <div className="wf-pulse-ring" />}

            {/* Input handle (Left side) */}
            {def.inputs > 0 && (
                <Handle type="target" position={Position.Left} id="in" className="wf-handle-in" />
            )}

            {/* Content */}
            <div className="wf-node-body">
                <div className="wf-node-top-row">
                    <span className="wf-node-tag">{def.tag}</span>
                    {hasNote && <span className="wf-node-note-badge">NOTE</span>}
                </div>
                <div className="wf-node-label">{data.label || def.label}</div>
                <div className="wf-node-preview">{preview}</div>
            </div>

            {/* Output handles (Right side) */}
            {def.outputs.length === 1 && (
                <Handle type="source" position={Position.Right} id={def.outputs[0].id} className="wf-handle-out" />
            )}
            {def.outputs.length === 2 && (
                <div className="wf-handle-multi" style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="wf-handle-multi-item" style={{ position: 'relative' }}>
                        <span className="wf-handle-label" style={{ right: '16px', top: '-4px', position: 'absolute' }}>
                            {def.outputs[0].id === 'yes' ? (data.config?.yesLabel || def.outputs[0].label) :
                                def.outputs[0].id === 'success' ? (data.config?.successLabel || def.outputs[0].label) :
                                    def.outputs[0].label}
                        </span>
                        <Handle type="source" position={Position.Right} id={def.outputs[0].id}
                            className="wf-handle-out" style={{ position: 'relative', right: 0, top: 0, transform: 'none' }} />
                    </div>
                    <div className="wf-handle-multi-item" style={{ position: 'relative' }}>
                        <span className="wf-handle-label" style={{ right: '16px', top: '-4px', position: 'absolute' }}>
                            {def.outputs[1].id === 'no' ? (data.config?.noLabel || def.outputs[1].label) :
                                def.outputs[1].id === 'timeout' ? (data.config?.timeoutLabel || def.outputs[1].label) :
                                    def.outputs[1].label}
                        </span>
                        <Handle type="source" position={Position.Right} id={def.outputs[1].id}
                            className="wf-handle-out wf-handle-secondary" style={{ position: 'relative', right: 0, top: 0, transform: 'none' }} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(WorkflowNode)
