export default function Badge({ type = 'cold', children }) {
    const classMap = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        cold: 'badge-cold',
        accent: 'badge-accent',
    }
    return (
        <span className={`badge ${classMap[type] || 'badge-cold'}`}>
            {children}
        </span>
    )
}
