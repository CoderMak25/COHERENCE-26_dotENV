import { memo } from 'react'
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from 'reactflow'

function WorkflowEdge({
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, style, selected,
}) {
    const isSecondary = data?.isSecondary
    const label = data?.label

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
    })

    const gradientId = `edge-gradient-${id}`

    return (
        <>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--accent, #c8ff00)" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="var(--accent, #c8ff00)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--accent, #c8ff00)" stopOpacity="0.3" />
                </linearGradient>
            </defs>

            {/* Background glow edge */}
            <path
                d={edgePath}
                fill="none"
                stroke="var(--accent, #c8ff00)"
                strokeWidth={selected ? 6 : 4}
                strokeOpacity={selected ? 0.25 : 0.08}
                filter="blur(3px)"
                className="wf-edge-glow"
            />

            {/* Main static edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={{
                    stroke: selected ? 'var(--accent, #c8ff00)' : 'var(--line-stroke)',
                    strokeWidth: 2,
                    strokeDasharray: isSecondary ? '6 4' : 'none',
                    transition: 'stroke 0.2s',
                    ...style,
                }}
            />

            {/* Animated flowing dash overlay */}
            <path
                d={edgePath}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={2}
                strokeDasharray="8 12"
                className="wf-edge-flow"
            />

            {/* Edge label */}
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
