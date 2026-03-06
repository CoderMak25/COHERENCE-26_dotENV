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

            {/* Input handle */}
            {def.inputs > 0 && (
                <Handle type="target" position={Position.Top} id="in" className="wf-handle-in" />
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

            {/* Output handles */}
            {def.outputs.length === 1 && (
                <Handle type="source" position={Position.Bottom} id={def.outputs[0].id} className="wf-handle-out" />
            )}
            {def.outputs.length === 2 && (
                <div className="wf-handle-multi">
                    <div className="wf-handle-multi-item" style={{ left: 'calc(50% - 40px)' }}>
                        <Handle type="source" position={Position.Bottom} id={def.outputs[0].id}
                            className="wf-handle-out" style={{ position: 'relative', transform: 'none' }} />
                        <span className="wf-handle-label">{def.outputs[0].label}</span>
                    </div>
                    <div className="wf-handle-multi-item" style={{ left: 'calc(50% + 25px)' }}>
                        <Handle type="source" position={Position.Bottom} id={def.outputs[1].id}
                            className="wf-handle-out wf-handle-secondary" style={{ position: 'relative', transform: 'none' }} />
                        <span className="wf-handle-label">{def.outputs[1].label}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(WorkflowNode)
