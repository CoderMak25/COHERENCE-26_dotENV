import useWorkflowStore from './workflowStore'

export default function StatusBar() {
    const { selectedNodeId, selectedEdgeId } = useWorkflowStore()

    return (
        <div className="wf-statusbar">
            {selectedNodeId && (
                <span>Selected: <span className="wf-sb-val">{selectedNodeId}</span></span>
            )}
            {selectedEdgeId && (
                <span>Edge: <span className="wf-sb-val">{selectedEdgeId}</span></span>
            )}
            {!selectedNodeId && !selectedEdgeId && (
                <span>Ready</span>
            )}
        </div>
    )
}
