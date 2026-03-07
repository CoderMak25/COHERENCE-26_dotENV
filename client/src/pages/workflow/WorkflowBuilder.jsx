import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import ReactFlow, {
    Background,
    MiniMap,
    Controls,
    ReactFlowProvider,
    useReactFlow,
    addEdge as rfAddEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'

import useWorkflowStore from './workflowStore'
import { NODE_DEFS } from './nodeTypes'
import WorkflowNodeComp from './WorkflowNode'
import WorkflowEdgeComp from './WorkflowEdge'
import NodePalette from './NodePalette'
import FloatingToolbar from './FloatingToolbar'
import NodeSearchPicker from './NodeSearchPicker'
import ConfigPanel from './ConfigPanel'
import ExecutionLog from './ExecutionLog'
import StatusBar from './StatusBar'
import WorkflowListBar from './WorkflowListBar'
import LeadPickerModal from './LeadPickerModal'

const nodeTypes = { workflowNode: WorkflowNodeComp }
const edgeTypes = { workflowEdge: WorkflowEdgeComp }

// ── AI Prompt Bar Component ──
function AiPromptBar() {
    const [open, setOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [error, setError] = useState('')
    const aiGenerating = useWorkflowStore(s => s.aiGenerating)
    const aiGenerateWorkflow = useWorkflowStore(s => s.aiGenerateWorkflow)
    const inputRef = useRef(null)

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus()
    }, [open])

    const handleGenerate = async () => {
        if (!prompt.trim() || aiGenerating) return
        setError('')
        try {
            await aiGenerateWorkflow(prompt.trim())
            setPrompt('')
            setOpen(false)
        } catch (err) {
            setError(err.message || 'Failed to generate workflow')
        }
    }

    return (
        <div className="wf-ai-prompt-container">
            {!open ? (
                <button
                    className="wf-ai-trigger-btn"
                    onClick={() => setOpen(true)}
                    title="Generate workflow with AI"
                >
                    <Icon icon="solar:magic-stick-3-bold" className="text-lg" />
                    <span>AI Generate</span>
                </button>
            ) : (
                <div className="wf-ai-prompt-bar">
                    <Icon icon="solar:magic-stick-3-bold" className="text-lg text-[var(--accent)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="wf-ai-input"
                        placeholder="Describe your workflow... e.g. 'Send email, if opened send LinkedIn DM, else wait 3 days and follow up'"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                        disabled={aiGenerating}
                    />
                    {aiGenerating ? (
                        <Icon icon="svg-spinners:ring-resize" className="text-lg text-[var(--accent)]" />
                    ) : (
                        <>
                            <button className="wf-ai-gen-btn" onClick={handleGenerate} disabled={!prompt.trim()}>
                                GENERATE
                            </button>
                            <button className="wf-ai-close-btn" onClick={() => { setOpen(false); setError('') }}>
                                <Icon icon="solar:close-square-linear" className="text-lg" />
                            </button>
                        </>
                    )}
                    {error && <div className="wf-ai-error">{error}</div>}
                </div>
            )}
        </div>
    )
}
function WorkflowCanvas() {
    const reactFlowWrapper = useRef(null)
    const reactFlowInstance = useReactFlow()
    const [searchParams] = useSearchParams()
    const {
        nodes, edges, setNodes, setEdges,
        addNode, addEdge, deleteNode, deleteEdge,
        setSelectedNode, setSelectedEdge, clearSelection,
        openConfigPanel, openPicker, closePicker,
        selectedNodeId, selectedEdgeId,
        undo, saveWorkflowToDB, saveWorkflowJSON, duplicateNode,
        showLog, running,
        loadSavedWorkflows, savedWorkflows, loadWorkflowFromDB,
    } = useWorkflowStore()

    // Load saved workflows list on mount; if URL has ?id=xxx, load that workflow
    useEffect(() => {
        const init = async () => {
            await loadSavedWorkflows()
            const targetId = searchParams.get('id')
            if (targetId) {
                await loadWorkflowFromDB(targetId)
            } else {
                const wfs = useWorkflowStore.getState().savedWorkflows
                if (wfs.length > 0) {
                    await loadWorkflowFromDB(wfs[0]._id)
                }
            }
        }
        init()
    }, [])

    const onNodesChange = useCallback((changes) => {
        setNodes((nds) => {
            let result = [...nds]
            for (const change of changes) {
                if (change.type === 'position' && change.position) {
                    result = result.map((n) =>
                        n.id === change.id ? { ...n, position: change.position } : n
                    )
                } else if (change.type === 'dimensions' && change.dimensions) {
                    result = result.map((n) =>
                        n.id === change.id ? { ...n, ...change.dimensions } : n
                    )
                }
            }
            return result
        })
    }, [setNodes])

    const onEdgesChange = useCallback((changes) => {
        setEdges((eds) => {
            let result = [...eds]
            for (const change of changes) {
                if (change.type === 'remove') {
                    result = result.filter((e) => e.id !== change.id)
                }
            }
            return result
        })
    }, [setEdges])

    const onConnect = useCallback((params) => {
        const sourceNode = nodes.find((n) => n.id === params.source)
        const def = sourceNode ? NODE_DEFS[sourceNode.data.nodeType] : null
        const color = def?.color || '#6b7280'
        const outputDef = def?.outputs?.find((o) => o.id === params.sourceHandle)
        const isSecondary = outputDef && (
            outputDef.label === 'NO' || outputDef.label === 'Timeout' ||
            outputDef.label === 'Unsub' || outputDef.label === 'B'
        )

        const newEdge = {
            ...params,
            id: `e_${Date.now().toString(36)}`,
            type: 'workflowEdge',
            data: {
                color,
                label: outputDef?.label || '',
                isSecondary,
            },
        }
        addEdge(newEdge)
    }, [nodes, addEdge])

    const onNodeClick = useCallback((_, node) => {
        setSelectedNode(node.id)
    }, [setSelectedNode])

    const onNodeDoubleClick = useCallback((_, node) => {
        openConfigPanel(node.id)
    }, [openConfigPanel])

    const onEdgeClick = useCallback((_, edge) => {
        setSelectedEdge(edge.id)
    }, [setSelectedEdge])

    const onPaneClick = useCallback(() => {
        clearSelection()
        closePicker()
    }, [clearSelection, closePicker])

    const onPaneDoubleClick = useCallback((e) => {
        if (reactFlowInstance) {
            const bounds = reactFlowWrapper.current?.getBoundingClientRect()
            if (bounds) {
                const position = reactFlowInstance.screenToFlowPosition({
                    x: e.clientX - bounds.left,
                    y: e.clientY - bounds.top,
                })
                openPicker(position)
            }
        }
    }, [reactFlowInstance, openPicker])

    // Drop from palette
    const onDragOver = useCallback((e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback((e) => {
        e.preventDefault()
        const type = e.dataTransfer.getData('application/workflow-node')
        if (!type || !reactFlowInstance) return

        // screenToFlowPosition already handles viewport transform — pass raw screen coords
        const position = reactFlowInstance.screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
        })
        addNode(type, position)
    }, [reactFlowInstance, addNode])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault()
                openPicker({ x: 400, y: 300 })
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (e.target !== document.body) return
                if (selectedNodeId) deleteNode(selectedNodeId)
                if (selectedEdgeId) deleteEdge(selectedEdgeId)
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault()
                undo()
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault()
                saveWorkflowToDB()
            }
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault()
                if (selectedNodeId) duplicateNode(selectedNodeId)
            }
            if (e.key === 'Escape') {
                useWorkflowStore.getState().closeConfigPanel()
                closePicker()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, undo, saveWorkflowToDB, duplicateNode, openPicker, closePicker])

    const styledEdges = useMemo(() =>
        edges.map((e) => ({
            ...e,
            type: 'workflowEdge',
            data: e.data || { color: '#6b7280', label: '', isSecondary: false },
        })),
        [edges])

    return (
        <div className="wf-canvas-wrap" ref={reactFlowWrapper}>
            <WorkflowListBar />

            <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.2}
                maxZoom={2.5}
                defaultEdgeOptions={{ type: 'workflowEdge' }}
                proOptions={{ hideAttribution: true }}
                className="wf-react-flow"
            >
                <Background
                    variant="dots"
                    gap={20}
                    size={1}
                    color="var(--canvas-dot)"
                    style={{ backgroundColor: 'var(--bg-canvas)' }}
                />
                <MiniMap
                    nodeColor={(n) => {
                        const def = NODE_DEFS[n.data?.nodeType]
                        return def?.color || '#6b7280'
                    }}
                    maskColor="rgba(0,0,0,0.3)"
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '2px solid var(--border-bright)',
                        boxShadow: '3px 3px 0 var(--shadow-color)',
                    }}
                    pannable
                    zoomable
                />
            </ReactFlow>

            <FloatingToolbar />

            {/* AI Workflow Generator */}
            <AiPromptBar />

            {/* Empty state */}
            {nodes.length === 0 && !running && (
                <div className="wf-empty-state">
                    <h3 className="wf-empty-title">EMPTY CANVAS</h3>
                    <p className="wf-empty-sub">Drag nodes from the left panel, press SPACE to search, or use ✨ AI to generate</p>
                </div>
            )}

            <StatusBar />
            <ExecutionLog />
            <NodeSearchPicker />
            <LeadPickerModal />
        </div>
    )
}

export default function WorkflowBuilder() {
    return (
        <div className="wf-builder">
            <ReactFlowProvider>
                <NodePalette />
                <WorkflowCanvas />
                <ConfigPanel />
            </ReactFlowProvider>
        </div>
    )
}
