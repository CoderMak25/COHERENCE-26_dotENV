import { Icon } from '@iconify/react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
    { path: '/', label: 'DASHBOARD', icon: 'solar:widget-5-linear', target: 'dashboard' },
    { path: '/leads', label: 'LEADS', icon: 'solar:users-group-two-rounded-linear', target: 'leads' },
    { path: '/campaigns', label: 'WORKFLOWS', icon: 'solar:branching-paths-down-linear', target: 'workflow' },
    { path: '/logs', label: 'LOGS', icon: 'solar:database-linear', target: 'logs' },
]

export default function Sidebar() {
    const location = useLocation()

    return (
        <aside className="w-[220px] flex-shrink-0 bg-[var(--bg-sidebar)] flex flex-col h-full z-20 relative">
            <div className="p-[20px]">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-[var(--accent)] flex-shrink-0"></div>
                    <h1 className="font-syne font-bold text-base tracking-tight text-[var(--text-primary)] uppercase">OUTREACHX</h1>
                </div>
                <p className="text-xs text-[var(--text-muted)] pl-4">OUTREACH OS v2.1</p>
            </div>

            <nav className="flex-1 flex flex-col pt-2 animate-stagger">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`nav-btn w-full h-[44px] flex items-center px-4 text-xs uppercase font-normal text-[var(--text-secondary)] border-l-[3px] border-transparent transition-colors duration-150 ${isActive ? 'active' : ''}`}
                        >
                            <Icon
                                icon={item.icon}
                                className={`nav-icon text-base mr-3 ${isActive ? 'text-[#0D0D0D]' : 'text-[var(--text-muted)]'}`}
                            />
                            <span className="tracking-widest">{item.label}</span>
                        </NavLink>
                    )
                })}
                <button className="nav-btn w-full h-[44px] flex items-center px-4 text-xs uppercase font-normal text-[var(--text-secondary)] border-l-[3px] border-transparent transition-colors duration-150 mt-auto mb-2">
                    <Icon icon="solar:settings-linear" className="nav-icon text-base mr-3 text-[var(--text-muted)]" />
                    <span className="tracking-widest">SETTINGS</span>
                </button>
            </nav>

            <div className="m-4 p-3 bg-[var(--bg-raised)] brutalist-panel flex flex-col gap-1.5">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">SYSTEM</span>
                <div className="flex items-center gap-1.5 text-[var(--success)] text-xs font-bold">
                    <span className="text-[8px] status-dot">●</span> OPERATIONAL
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-bold">QUEUE: 48 JOBS</span>
                <span className="text-[11px] text-[var(--warning)] font-bold">THROTTLE: 10/HR</span>
            </div>
        </aside>
    )
}
