import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useTheme } from '../context/ThemeContext'

export default function Settings() {
    const { theme, toggleTheme } = useTheme()
    const [notifications, setNotifications] = useState(true)
    const [twoFactor, setTwoFactor] = useState(false)
    const [language, setLanguage] = useState('EN')
    const [showPasswordFields, setShowPasswordFields] = useState(false)

    const ToggleSwitch = ({ enabled, onToggle, label }) => (
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">{label}</span>
            <div
                onClick={onToggle}
                className="w-[36px] h-[20px] border-2 relative flex items-center p-[2px] cursor-pointer transition-colors duration-200"
                style={{
                    backgroundColor: enabled ? 'var(--accent)' : 'var(--bg-raised)',
                    borderColor: 'var(--border-bright)',
                    boxShadow: '2px 2px 0 var(--shadow-color)'
                }}
            >
                <div
                    className="w-[12px] h-[12px] absolute transition-all duration-200"
                    style={{
                        backgroundColor: enabled ? 'var(--text-inverted)' : 'var(--text-muted)',
                        right: enabled ? '2px' : 'auto',
                        left: enabled ? 'auto' : '2px'
                    }}
                />
            </div>
        </div>
    )

    const SectionHeader = ({ icon, title }) => (
        <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-[var(--border-bright)]">
            <div className="w-[32px] h-[32px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] flex items-center justify-center">
                <Icon icon={icon} className="text-[var(--accent)] text-base" />
            </div>
            <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">{title}</h3>
        </div>
    )

    const sessions = [
        { device: 'CHROME — WINDOWS 11', location: 'MUMBAI, IN', time: 'ACTIVE NOW', active: true },
        { device: 'FIREFOX — MACOS', location: 'BANGALORE, IN', time: '2 HOURS AGO', active: false },
        { device: 'SAFARI — IPHONE 15', location: 'DELHI, IN', time: '1 DAY AGO', active: false },
    ]

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">
            {/* PAGE HEADER */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">SETTINGS</h2>
                <button className="btn-base btn-accent">
                    SAVE CHANGES
                </button>
            </div>

            <div className="grid grid-cols-2 gap-5">

                {/* ═══════════════════════════════════════════
                    ACCOUNT SECTION
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col">
                    <SectionHeader icon="solar:user-circle-linear" title="ACCOUNT" />

                    {/* Profile Photo */}
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-[72px] h-[72px] bg-[var(--accent)] border-2 border-[var(--border-bright)] shadow-[4px_4px_0_var(--shadow-color)] flex items-center justify-center flex-shrink-0">
                            <span className="font-syne text-2xl font-bold text-[var(--text-inverted)]">OP</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[10px] py-[6px] px-[12px]">
                                UPLOAD PHOTO
                            </button>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">MAX 2MB · JPG, PNG</span>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="mb-4">
                        <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold block mb-2">DISPLAY NAME</label>
                        <input
                            type="text"
                            defaultValue="OPERATOR X"
                            className="w-full h-[40px] px-3.5 text-[11px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]"
                        />
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                        <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold block mb-2">EMAIL ADDRESS</label>
                        <input
                            type="text"
                            defaultValue="operator@outreachx.io"
                            className="w-full h-[40px] px-3.5 text-[11px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]"
                        />
                    </div>

                    {/* Change Password */}
                    <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold block mb-2">PASSWORD</label>
                        {!showPasswordFields ? (
                            <button
                                onClick={() => setShowPasswordFields(true)}
                                className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[10px] py-[6px] px-[12px]"
                            >
                                CHANGE PASSWORD
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3 animate-slide-down">
                                <input
                                    type="text"
                                    placeholder="CURRENT PASSWORD"
                                    className="w-full h-[40px] px-3.5 text-[11px] font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-[var(--bg-surface)]"
                                />
                                <input
                                    type="text"
                                    placeholder="NEW PASSWORD"
                                    className="w-full h-[40px] px-3.5 text-[11px] font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-[var(--bg-surface)]"
                                />
                                <div className="flex gap-3">
                                    <button className="btn-base btn-accent text-[10px] py-[6px] px-[12px]">UPDATE</button>
                                    <button
                                        onClick={() => setShowPasswordFields(false)}
                                        className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[10px] py-[6px] px-[12px]"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    PREFERENCES SECTION
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col">
                    <SectionHeader icon="solar:tuning-2-linear" title="PREFERENCES" />

                    {/* Theme Toggle */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">THEME</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
                                    CURRENT: {theme === 'dark' ? 'DARK MODE' : 'LIGHT MODE'}
                                </span>
                            </div>
                            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                                <div className="theme-toggle-indicator"></div>
                                <div className="theme-icon icon-sun"><Icon icon="solar:sun-bold" /></div>
                                <div className="theme-icon icon-moon"><Icon icon="solar:moon-bold" /></div>
                            </button>
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-[var(--border)] mb-5"></div>

                    {/* Notifications */}
                    <div className="mb-5">
                        <ToggleSwitch
                            enabled={notifications}
                            onToggle={() => setNotifications(!notifications)}
                            label="EMAIL NOTIFICATIONS"
                        />
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-2 block">
                            RECEIVE UPDATES ON CAMPAIGN PERFORMANCE
                        </span>
                    </div>

                    <div className="w-full h-[1px] bg-[var(--border)] mb-5"></div>

                    {/* Language */}
                    <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold block mb-2">LANGUAGE</label>
                        <div className="relative w-full">
                            <select
                                className="appearance-none w-full h-[40px] px-3.5 text-[11px] font-bold cursor-pointer"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="EN">ENGLISH (US)</option>
                                <option value="ES">ESPAÑOL</option>
                                <option value="FR">FRANÇAIS</option>
                                <option value="DE">DEUTSCH</option>
                                <option value="JA">日本語</option>
                                <option value="HI">हिन्दी</option>
                            </select>
                            <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    SECURITY SECTION
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col">
                    <SectionHeader icon="solar:shield-keyhole-linear" title="SECURITY" />

                    {/* Two Factor */}
                    <div className="mb-5">
                        <ToggleSwitch
                            enabled={twoFactor}
                            onToggle={() => setTwoFactor(!twoFactor)}
                            label="TWO-FACTOR AUTH"
                        />
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-2 block">
                            {twoFactor ? 'ENABLED — AUTHENTICATOR APP' : 'ADD AN EXTRA LAYER OF SECURITY'}
                        </span>
                    </div>

                    <div className="w-full h-[1px] bg-[var(--border)] mb-5"></div>

                    {/* Active Sessions */}
                    <div>
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold block mb-3">ACTIVE SESSIONS</span>
                        <div className="flex flex-col gap-0">
                            {sessions.map((s, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-3 border-b border-[var(--border)] ${i === 0 ? 'border-t-2 border-t-[var(--border-bright)]' : ''} hover:bg-[var(--bg-hover)] transition-colors duration-75`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon
                                            icon={i === 2 ? 'solar:smartphone-linear' : 'solar:monitor-linear'}
                                            className="text-[var(--text-muted)] text-base"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest">{s.device}</span>
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">{s.location}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {s.active ? (
                                            <span className="badge badge-success">ACTIVE</span>
                                        ) : (
                                            <>
                                                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">{s.time}</span>
                                                <button className="w-[28px] h-[28px] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:-translate-y-[1px] transition-transform">
                                                    <Icon icon="solar:close-circle-linear" className="text-sm" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    DANGER ZONE
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col border-2 border-[var(--danger)]" style={{ boxShadow: '4px 4px 0px var(--danger)' }}>
                    <SectionHeader icon="solar:danger-triangle-linear" title="DANGER ZONE" />

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">DELETE ACCOUNT</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
                                PERMANENTLY REMOVE YOUR ACCOUNT AND ALL DATA
                            </span>
                        </div>
                        <button
                            className="btn-base text-[10px] py-[6px] px-[14px] flex-shrink-0"
                            style={{
                                backgroundColor: 'var(--danger)',
                                color: '#FFFFFF',
                                borderColor: 'var(--border-bright)',
                                boxShadow: '3px 3px 0px var(--shadow-color)'
                            }}
                        >
                            DELETE ACCOUNT
                        </button>
                    </div>

                    <div className="w-full h-[1px] bg-[var(--border)] mb-4"></div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">EXPORT DATA</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
                                DOWNLOAD ALL YOUR DATA BEFORE DELETION
                            </span>
                        </div>
                        <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[10px] py-[6px] px-[14px] flex-shrink-0">
                            EXPORT ALL
                        </button>
                    </div>
                </div>

            </div>

            {/* BOTTOM STATUS BAR */}
            <div className="h-[36px] mt-5 bg-[var(--bg-topbar)] border-t-2 border-[var(--border-bright)] flex items-center justify-between px-5">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">ALL SYSTEMS NOMINAL</span>
                </div>
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    OUTREACHX SETTINGS v2.1
                </div>
            </div>
        </div>
    )
}
