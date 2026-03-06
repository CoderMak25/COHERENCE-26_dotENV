import { useState, useRef, useEffect, useMemo } from 'react'
import { NODE_DEFS, NODE_CATEGORIES, getNodesByCategory } from './nodeTypes'
import useWorkflowStore from './workflowStore'

export default function NodeSearchPicker() {
    const { pickerOpen, pickerPosition, closePicker, addNode } = useWorkflowStore()
    const [search, setSearch] = useState('')
    const [focusIdx, setFocusIdx] = useState(0)
    const inputRef = useRef(null)

    useEffect(() => {
        if (pickerOpen) {
            setSearch('')
            setFocusIdx(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [pickerOpen])

    const filteredItems = useMemo(() => {
        const q = search.toLowerCase().trim()
        const result = []
        for (const cat of NODE_CATEGORIES) {
            const nodes = getNodesByCategory(cat.id).filter(
                (n) => !q || n.label.toLowerCase().includes(q) || n.type.includes(q) || n.description.toLowerCase().includes(q)
            )
            if (nodes.length > 0) result.push({ cat, nodes })
        }
        return result
    }, [search])

    const allFlat = useMemo(() => filteredItems.flatMap((g) => g.nodes), [filteredItems])

    const handleSelect = (nodeType) => {
        addNode(nodeType, pickerPosition || { x: 400, y: 300 })
        closePicker()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusIdx((i) => Math.min(i + 1, allFlat.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusIdx((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (allFlat[focusIdx]) handleSelect(allFlat[focusIdx].type)
        } else if (e.key === 'Escape') {
            closePicker()
        }
    }

    if (!pickerOpen) return null

    return (
        <>
            <div className="wf-picker-overlay" onClick={closePicker} />
            <div
                className="wf-picker"
                style={{
                    left: pickerPosition ? pickerPosition.x : '50%',
                    top: pickerPosition ? pickerPosition.y : '50%',
                }}
            >
                <input
                    ref={inputRef}
                    className="wf-picker-input"
                    placeholder="Search nodes..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setFocusIdx(0) }}
                    onKeyDown={handleKeyDown}
                />
                <div className="wf-picker-list">
                    {filteredItems.length === 0 && (
                        <div className="wf-picker-empty">No matching nodes.</div>
                    )}
                    {filteredItems.map((group) => (
                        <div key={group.cat.id}>
                            <div className="wf-picker-cat">
                                <span>{group.cat.label}</span>
                            </div>
                            {group.nodes.map((n) => {
                                const flatIdx = allFlat.indexOf(n)
                                return (
                                    <button
                                        key={n.type}
                                        className={`wf-picker-item ${flatIdx === focusIdx ? 'wf-picker-focused' : ''}`}
                                        onClick={() => handleSelect(n.type)}
                                        onMouseEnter={() => setFocusIdx(flatIdx)}
                                    >
                                        <span className="wf-picker-item-tag">{n.tag}</span>
                                        <div className="wf-picker-item-text">
                                            <span className="wf-picker-item-name">{n.label}</span>
                                            <span className="wf-picker-item-desc">{n.description}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
