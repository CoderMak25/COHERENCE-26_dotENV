import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { NavLink, useLocation } from 'react-router-dom'

const mainNavItems = [
    { path: '/', label: 'DASHBOARD', icon: 'solar:widget-5-linear' },
    { path: '/leads', label: 'LEADS', icon: 'solar:users-group-two-rounded-linear' },
    { path: '/workflows', label: 'WORKFLOWS', icon: 'solar:branching-paths-down-linear' },
]

const systemNavItems = [
    { path: '/logs', label: 'LOGS', icon: 'solar:database-linear' },
    { path: '/settings', label: 'SETTINGS', icon: 'solar:settings-linear' },
]

export default function Sidebar() {
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        localStorage.setItem('outreachx-sidebar', collapsed ? 'collapsed' : 'expanded')
    }, [collapsed])

    const NavItem = ({ item }) => {
        const isActive = location.pathname === item.path
        return (
            <NavLink
                to={item.path}
                className={`sidebar-nav-btn group relative w-full flex items-center ${collapsed ? 'justify-center px-0 h-[44px]' : 'px-4 h-[44px]'} text-xs uppercase font-normal transition-all duration-200 ${isActive
                    ? 'sidebar-nav-active bg-[var(--accent)] text-[var(--text-inverted)] font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
            >
                {/* Active accent bar */}
                {isActive && (
                    <div className="absolute left-0 top-[8px] bottom-[8px] w-[4px] bg-[var(--text-inverted)]" />
                )}

                <Icon
                    icon={item.icon}
                    className={`text-[18px] flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-[var(--text-inverted)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'} ${collapsed ? '' : 'mr-3'}`}
                />

                {!collapsed && (
                    <span className="tracking-widest whitespace-nowrap overflow-hidden">{item.label}</span>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                    <div className="sidebar-tooltip">
                        {item.label}
                    </div>
                )}
            </NavLink>
        )
    }

    const SectionLabel = ({ label }) => {
        if (collapsed) return <div className="mx-3 my-2 h-[2px] bg-[var(--border)]" />
        return (
            <div className="px-4 pt-4 pb-2">
                <span className="text-[9px] uppercase text-[var(--text-muted)] tracking-[0.2em] font-bold">{label}</span>
            </div>
        )
    }

    return (
        <aside
            className="flex-shrink-0 bg-[var(--bg-sidebar)] flex flex-col h-full z-20 relative sidebar-container"
            style={{ width: collapsed ? 64 : 220 }}
        >
            {/* ─── LOGO ─── */}
            <div className={`flex items-center ${collapsed ? 'justify-center p-[16px]' : 'p-[20px]'} transition-all duration-300`}>
                {collapsed ? (
                    <div className="w-[28px] h-[28px] bg-[var(--accent)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] flex items-center justify-center">
                        <span className="font-syne font-bold text-[10px] text-[var(--text-inverted)]">OX</span>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-[var(--accent)] flex-shrink-0" />
                            <h1 className="font-syne font-bold text-base tracking-tight text-[var(--text-primary)] uppercase">OUTREACHX</h1>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] pl-4">OUTREACH OS v2.1</p>
                    </div>
                )}
            </div>

            {/* ─── MAIN NAV ─── */}
            <nav className="flex-1 flex flex-col overflow-hidden">
                <SectionLabel label="MAIN" />
                <div className="flex flex-col gap-[2px] animate-stagger">
                    {mainNavItems.map((item) => (
                        <NavItem key={item.path} item={item} />
                    ))}
                </div>

                <SectionLabel label="SYSTEM" />
                <div className="flex flex-col gap-[2px]">
                    {systemNavItems.map((item) => (
                        <NavItem key={item.path} item={item} />
                    ))}
                </div>
            </nav>

            {/* ─── SYSTEM STATUS PANEL ─── */}
            {collapsed ? (
                <div className="mx-auto mb-3 w-[36px] h-[36px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] flex items-center justify-center group relative">
                    <span className="text-[var(--success)] text-[10px] status-dot">●</span>
                    <div className="sidebar-tooltip">
                        SYSTEM OPERATIONAL
                    </div>
                </div>
            ) : (
                <div className="m-3 p-3 bg-[var(--bg-raised)] brutalist-panel flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold">SYSTEM</span>
                    <div className="flex items-center gap-1.5 text-[var(--success)] text-xs font-bold">
                        <span className="text-[8px] status-dot">●</span> OPERATIONAL
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] font-bold">QUEUE: 48 JOBS</span>
                    <span className="text-[11px] text-[var(--warning)] font-bold">THROTTLE: 10/HR</span>
                </div>
            )}

            {/* ─── COLLAPSE TOGGLE ─── */}
            <button
                onClick={() => setCollapsed(c => !c)}
                className="sidebar-collapse-btn h-[38px] flex items-center justify-center border-t-2 border-[var(--border-bright)] bg-[var(--bg-sidebar)] hover:bg-[var(--bg-hover)] transition-colors duration-150 group relative"
            >
                <Icon
                    icon={collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-left-linear'}
                    className="text-[var(--text-muted)] text-base group-hover:text-[var(--accent)] transition-colors duration-150"
                />
                {!collapsed && (
                    <span className="text-[9px] uppercase text-[var(--text-muted)] tracking-[0.2em] font-bold ml-2 group-hover:text-[var(--accent)] transition-colors duration-150">COLLAPSE</span>
                )}
            </button>
        </aside>
    )
}
