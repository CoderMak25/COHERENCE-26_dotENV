import { useState, useCallback } from 'react'
import { NODE_CATEGORIES, getNodesByCategory } from './nodeTypes'
import useWorkflowStore from './workflowStore'

export default function NodePalette() {
    const { addNode } = useWorkflowStore()
    const [collapsed, setCollapsed] = useState({})

    const toggleCategory = (id) => {
        setCollapsed((s) => ({ ...s, [id]: !s[id] }))
    }

    const onDragStart = useCallback((e, nodeType) => {
        e.dataTransfer.setData('application/workflow-node', nodeType)
        e.dataTransfer.effectAllowed = 'move'
    }, [])

    const onClickAdd = useCallback((nodeType) => {
        const x = 300 + Math.random() * 200
        const y = 100 + Math.random() * 300
        addNode(nodeType, { x, y })
    }, [addNode])

    return (
        <aside className="wf-palette">
            <div className="wf-palette-title">
                <span className="wf-palette-dot" />
                <span>NODES</span>
            </div>

            <div className="wf-palette-scroll">
                {NODE_CATEGORIES.map((cat) => {
                    const catNodes = getNodesByCategory(cat.id)
                    const isClosed = collapsed[cat.id]
                    return (
                        <div key={cat.id} className="wf-palette-category">
                            <button
                                className="wf-palette-cat-btn"
                                onClick={() => toggleCategory(cat.id)}
                            >
                                <span>{cat.label}</span>
                                <span className="wf-cat-count">{catNodes.length}</span>
                                <span className={`wf-cat-arrow ${isClosed ? '' : 'open'}`}>&#9654;</span>
                            </button>
                            {!isClosed && (
                                <div className="wf-palette-nodes">
                                    {catNodes.map((n) => (
                                        <div
                                            key={n.type}
                                            className="wf-palette-item"
                                            draggable
                                            onDragStart={(e) => onDragStart(e, n.type)}
                                            onClick={() => onClickAdd(n.type)}
                                        >
                                            <span className="wf-palette-tag">{n.tag}</span>
                                            <span className="wf-palette-item-label">{n.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="wf-palette-footer">
                <span>SPACE — Search</span>
                <span>DEL — Delete</span>
                <span>CTRL+Z — Undo</span>
            </div>
        </aside>
    )
}
