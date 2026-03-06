export default function GlassCard({ children, className = '', ...props }) {
    return (
        <div className={`brutalist-card ${className}`} {...props}>
            {children}
        </div>
    )
}
