import { useReactFlow } from 'reactflow'
import useWorkflowStore from './workflowStore'

export default function FloatingToolbar() {
    const rf = useReactFlow()
    const {
        undo, history, historyIndex,
        saveWorkflow, loadWorkflow,
        toggleLog, showLog,
        running, runBackendWorkflow,
        nodes,
    } = useWorkflowStore()

    const handleClear = () => {
        if (confirm('Clear all nodes? This cannot be undone.')) {
            useWorkflowStore.setState({ nodes: [], edges: [], selectedNodeId: null })
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

    return (
        <div className="wf-toolbar">
            <button className="wf-tb-btn" title="Undo (Ctrl+Z)" disabled={historyIndex < 0} onClick={undo}>↩</button>
            <div className="wf-tb-sep" />
            <button className="wf-tb-btn" title="Zoom In" onClick={() => rf.zoomIn()}>+</button>
            <button className="wf-tb-btn wf-tb-zoom" title="Zoom Level">
                {Math.round((rf.getZoom?.() || 1) * 100)}%
            </button>
            <button className="wf-tb-btn" title="Zoom Out" onClick={() => rf.zoomOut()}>−</button>
            <button className="wf-tb-btn" title="Fit View" onClick={() => rf.fitView({ padding: 0.2 })}>⊞</button>
            <div className="wf-tb-sep" />
            <button className="wf-tb-btn" title="Save (Ctrl+S)" onClick={saveWorkflow}>↓</button>
            <button className="wf-tb-btn" title="Load" onClick={handleLoad}>↑</button>
            <button className={`wf-tb-btn ${showLog ? 'wf-tb-active' : ''}`} title="Toggle Log" onClick={toggleLog}>◫</button>
            <button className="wf-tb-btn wf-tb-danger" title="Clear Canvas" onClick={handleClear}>✕</button>
            <div className="wf-tb-sep" />
            <button
                className={`wf-tb-run ${running ? 'wf-running' : ''}`}
                onClick={() => { if (!running) runBackendWorkflow() }}
                disabled={running || nodes.length === 0}
            >
                {running ? (
                    <><span className="wf-spinner">↻</span> RUNNING</>
                ) : (
                    <>▶ RUN</>
                )}
            </button>
        </div>
    )
}
