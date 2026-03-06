import { useReactFlow } from 'reactflow'
import useWorkflowStore from './workflowStore'

export default function FloatingToolbar() {
    const rf = useReactFlow()
    const {
        undo, history,
        saveWorkflowToDB, saveWorkflowJSON, loadWorkflow,
        toggleLog, showLog,
        running, runSimulation, executeOnLeads, stopWorkflow,
        nodes, saving, dirty, assignedLeads, workflowId,
    } = useWorkflowStore()

    const handleClear = () => {
        if (confirm('Clear all nodes? This cannot be undone.')) {
            useWorkflowStore.setState({ nodes: [], edges: [], selectedNodeId: null, dirty: true })
        }
    }

    const handleLoad = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                try { loadWorkflow(JSON.parse(ev.target.result)) } catch { alert('Invalid file') }
            }
            reader.readAsText(file)
        }
        input.click()
    }

    const handleSave = async () => {
        try {
            await saveWorkflowToDB()
        } catch {
            // If DB save fails, fall back to JSON download
            saveWorkflowJSON()
        }
    }

    const handleRun = () => {
        if (workflowId && assignedLeads.length > 0) {
            // Execute on backend with assigned leads
            executeOnLeads()
        } else {
            // Simulate locally
            runSimulation()
        }
    }

    return (
        <div className="wf-toolbar">
            <button className="wf-tb-btn" title="Undo (Ctrl+Z)" disabled={history.length === 0} onClick={undo}>↩</button>
            <div className="wf-tb-sep" />
            <button className="wf-tb-btn" title="Zoom In" onClick={() => rf.zoomIn()}>+</button>
            <button className="wf-tb-btn wf-tb-zoom" title="Zoom Level">
                {Math.round((rf.getZoom?.() || 1) * 100)}%
            </button>
            <button className="wf-tb-btn" title="Zoom Out" onClick={() => rf.zoomOut()}>−</button>
            <button className="wf-tb-btn" title="Fit View" onClick={() => rf.fitView({ padding: 0.2 })}>⊞</button>
            <div className="wf-tb-sep" />
            <button className="wf-tb-btn" title="Save to DB (Ctrl+S)" onClick={handleSave} disabled={saving}>
                {saving ? '...' : dirty ? '↓●' : '↓'}
            </button>
            <button className="wf-tb-btn" title="Export JSON" onClick={saveWorkflowJSON}>⤓</button>
            <button className="wf-tb-btn" title="Import JSON" onClick={handleLoad}>↑</button>
            <button className={`wf-tb-btn ${showLog ? 'wf-tb-active' : ''}`} title="Toggle Log" onClick={toggleLog}>◫</button>
            <button className="wf-tb-btn wf-tb-danger" title="Clear Canvas" onClick={handleClear}>✕</button>
            <div className="wf-tb-sep" />
            {running ? (
                <button
                    className="wf-tb-run wf-running"
                    onClick={stopWorkflow}
                    title="Stop Execution"
                >
                    <span className="wf-spinner">↻</span> STOP
                </button>
            ) : (
                <button
                    className="wf-tb-run"
                    onClick={handleRun}
                    disabled={nodes.length === 0}
                    title={assignedLeads.length > 0 ? `Execute on ${assignedLeads.length} leads` : 'Simulate flow'}
                >
                    ▶ {assignedLeads.length > 0 ? `RUN (${assignedLeads.length})` : 'RUN'}
                </button>
            )}
        </div>
    )
}
