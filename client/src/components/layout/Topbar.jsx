import { Icon } from '@iconify/react'
import { useLocation, Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useState, useEffect } from 'react'

const titleMap = {
    '/': 'DASHBOARD',
    '/leads': 'LEADS',
    '/campaigns': 'WORKFLOWS',
    '/analytics': 'ANALYTICS',
    '/logs': 'LOGS',
    '/settings': 'SETTINGS',
    '/profile': 'PROFILE',
}

export default function Topbar() {
    const location = useLocation()
    const { theme, toggleTheme } = useTheme()
    const [time, setTime] = useState('')

    useEffect(() => {
        const update = () => {
            const now = new Date()
            setTime(now.toTimeString().split(' ')[0])
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    const pageTitle = titleMap[location.pathname] || 'DASHBOARD'

    return (
        <header className="h-[52px] flex-shrink-0 bg-[var(--bg-topbar)] flex items-center justify-between px-6 z-20">
            <div className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">
                OUTREACHX <span className="mx-2">/</span> <span className="text-[var(--text-primary)]">{pageTitle}</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-[11px] text-[var(--text-secondary)] font-bold tracking-widest">
                    {time}
                </div>

                <span className="text-[var(--border-bright)]">|</span>

                <div className="brutalist-panel px-3 py-1 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                    <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                    <span className="text-[var(--text-primary)]">12 RUNNING</span>
                </div>

                <span className="text-[var(--border-bright)]">|</span>

                {/* Theme Switcher */}
                <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                    <div className="theme-toggle-indicator"></div>
                    <div className="theme-icon icon-sun"><Icon icon="solar:sun-bold" /></div>
                    <div className="theme-icon icon-moon"><Icon icon="solar:moon-bold" /></div>
                </button>

                <Link to="/profile" className="w-[30px] h-[30px] bg-[var(--bg-raised)] brutalist-panel flex items-center justify-center text-accent text-[11px] font-bold hover:-translate-y-[1px] transition-transform cursor-pointer">
                    OP
                </Link>
            </div>
        </header>
    )
}
