import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-base)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-3 h-3 bg-[var(--accent)] animate-blink"></div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">LOADING...</span>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return children
}
