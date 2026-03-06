import { useRef, useEffect } from 'react'
import useWorkflowStore from './workflowStore'

export default function ExecutionLog() {
    const { showLog, running, logs } = useWorkflowStore()
    const scrollRef = useRef(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    if (!showLog) return null

    return (
        <div className="wf-log-panel">
            <div className="wf-log-header">
                <div className="wf-log-header-left">
                    <span className={`wf-log-dot ${running ? 'wf-log-dot-active' : ''}`}>●</span>
                    <span className="wf-log-title">EXECUTION LOG</span>
                    <span className="wf-log-count">{logs.length} events</span>
                </div>
            </div>
            <div className="wf-log-body" ref={scrollRef}>
                {logs.length === 0 && (
                    <div className="wf-log-empty">No executions yet. Hit RUN to start the workflow.</div>
                )}
                {logs.map((entry, i) => (
                    <div key={i} className="wf-log-entry">
                        <span className="wf-log-time">[{entry.time}]</span>
                        <span className="wf-log-tag">{entry.tag || '--'}</span>
                        <span
                            className="wf-log-msg"
                            dangerouslySetInnerHTML={{
                                __html: entry.message.replace(
                                    /`([^`]+)`/g,
                                    '<span class="wf-log-highlight">$1</span>'
                                ),
                            }}
                        />
                    </div>
                ))}
                {logs.length > 0 && !running && (
                    <div className="wf-log-separator">— Simulation complete —</div>
                )}
            </div>
        </div>
    )
}
