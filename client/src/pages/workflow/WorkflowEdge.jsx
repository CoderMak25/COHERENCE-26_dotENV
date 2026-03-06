import { memo } from 'react'
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from 'reactflow'

function WorkflowEdge({
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, style,
}) {
    const isSecondary = data?.isSecondary
    const label = data?.label

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
    })

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: 'var(--line-stroke)',
                    strokeWidth: 2,
                    strokeDasharray: isSecondary ? '6 4' : 'none',
                    ...style,
                }}
            />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className="wf-edge-label"
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}

export default memo(WorkflowEdge)
