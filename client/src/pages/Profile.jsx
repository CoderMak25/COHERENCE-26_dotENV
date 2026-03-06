import { useState } from 'react'
import { Icon } from '@iconify/react'

export default function Profile() {
    const [isEditing, setIsEditing] = useState(false)
    const [profile, setProfile] = useState({
        name: 'OPERATOR X',
        role: 'OUTREACH COMMANDER',
        bio: 'Full-stack growth operator running multi-channel outreach campaigns. Specialized in B2B lead generation and automated email sequences.',
        email: 'operator@outreachx.io',
        phone: '+91 98765 43210',
        location: 'MUMBAI, INDIA',
    })
    const [editForm, setEditForm] = useState({ ...profile })

    const handleSave = () => {
        setProfile({ ...editForm })
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditForm({ ...profile })
        setIsEditing(false)
    }

    const handleChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }))
    }

    const stats = [
        { label: 'EMAILS SENT', value: '12,847', icon: 'solar:letter-linear', change: '+234 THIS WEEK' },
        { label: 'LEADS CONTACTED', value: '3,412', icon: 'solar:users-group-two-rounded-linear', change: '+89 THIS WEEK' },
        { label: 'CAMPAIGNS RUN', value: '47', icon: 'solar:branching-paths-down-linear', change: '12 ACTIVE' },
        { label: 'REPLY RATE', value: '34.2%', icon: 'solar:reply-linear', change: '▲ 2.1% VS LAST MONTH' },
    ]

    const connectedAccounts = [
        { name: 'GOOGLE WORKSPACE', icon: 'solar:inbox-linear', status: 'connected', detail: 'operator@outreachx.io' },
        { name: 'LINKEDIN', icon: 'solar:link-minimalistic-2-linear', status: 'connected', detail: '@operatorx' },
        { name: 'SLACK', icon: 'solar:chat-round-dots-linear', status: 'disconnected', detail: 'NOT CONNECTED' },
        { name: 'HUBSPOT CRM', icon: 'solar:database-linear', status: 'connected', detail: 'SYNCED — 1,248 CONTACTS' },
    ]

    const SectionHeader = ({ icon, title, action }) => (
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-[var(--border-bright)]">
            <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] flex items-center justify-center">
                    <Icon icon={icon} className="text-[var(--accent)] text-base" />
                </div>
                <h3 className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">{title}</h3>
            </div>
            {action}
        </div>
    )

    const InfoRow = ({ label, value, field }) => (
        <div className="flex items-center justify-between py-3 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors duration-75 px-1">
            <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px] flex-shrink-0">{label}</span>
            {isEditing && field ? (
                <input
                    type="text"
                    value={editForm[field]}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="flex-1 h-[32px] px-3 text-[11px] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] animate-slide-down"
                />
            ) : (
                <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest">{value}</span>
            )}
        </div>
    )

    return (
        <div className="absolute inset-0 overflow-y-auto p-[28px] bg-[var(--bg-base)] animate-stagger">
            {/* PAGE HEADER */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-[var(--text-primary)]">PROFILE</h2>
                <div className="flex gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={handleCancel} className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)]">
                                CANCEL
                            </button>
                            <button onClick={handleSave} className="btn-base btn-accent">
                                SAVE PROFILE
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="btn-base btn-accent">
                            EDIT PROFILE
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                PROFILE HEADER CARD
               ═══════════════════════════════════════════ */}
            <div className="brutalist-card p-6 mb-5 flex items-start gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <div className="w-[96px] h-[96px] bg-[var(--accent)] border-2 border-[#0D0D0D] shadow-[5px_5px_0_#0D0D0D] flex items-center justify-center">
                        <span className="font-syne text-4xl font-bold text-[#0D0D0D]">OP</span>
                    </div>
                    {isEditing && (
                        <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] text-[9px] py-[5px] px-[10px] animate-slide-down">
                            CHANGE PHOTO
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="font-syne text-2xl font-bold text-[var(--text-primary)] uppercase bg-[var(--bg-surface)] px-3 h-[40px] animate-slide-down"
                            />
                        ) : (
                            <h3 className="font-syne text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight">{profile.name}</h3>
                        )}
                        <span className="badge badge-success">ACTIVE</span>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest mb-3">{profile.role}</span>

                    {isEditing ? (
                        <textarea
                            value={editForm.bio}
                            onChange={(e) => handleChange('bio', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--bg-surface)] animate-slide-down"
                        />
                    ) : (
                        <p className="text-[11px] font-bold text-[var(--text-secondary)] leading-relaxed max-w-[600px]">{profile.bio}</p>
                    )}

                    <div className="flex items-center gap-5 mt-4">
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:letter-linear" className="text-[var(--text-muted)] text-sm" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">{profile.email}</span>
                        </div>
                        <span className="text-[var(--border-bright)]">|</span>
                        <div className="flex items-center gap-2">
                            <Icon icon="solar:map-point-linear" className="text-[var(--text-muted)] text-sm" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest">{profile.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                ACTIVITY STATS ROW
               ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-4 gap-4 mb-5">
                {stats.map((stat) => (
                    <div key={stat.label} className="brutalist-card p-5 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest font-bold">{stat.label}</span>
                            <Icon icon={stat.icon} className="text-[var(--text-muted)] text-lg" />
                        </div>
                        <span className="font-syne text-4xl font-bold text-accent mb-2 leading-none">{stat.value}</span>
                        <span className="text-[11px] text-[var(--success)] font-bold tracking-widest mt-auto">{stat.change}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-5">

                {/* ═══════════════════════════════════════════
                    PERSONAL INFORMATION
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col">
                    <SectionHeader icon="solar:user-id-linear" title="PERSONAL INFORMATION" />
                    <InfoRow label="FULL NAME" value={profile.name} field="name" />
                    <InfoRow label="EMAIL" value={profile.email} field="email" />
                    <InfoRow label="PHONE" value={profile.phone} field="phone" />
                    <InfoRow label="LOCATION" value={profile.location} field="location" />
                </div>

                {/* ═══════════════════════════════════════════
                    ACCOUNT DETAILS
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col">
                    <SectionHeader icon="solar:shield-check-linear" title="ACCOUNT DETAILS" />

                    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] px-1">
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px]">STATUS</span>
                        <span className="badge badge-success">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] px-1">
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px]">PLAN</span>
                        <span className="badge badge-accent">PRO</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] px-1">
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px]">MEMBER SINCE</span>
                        <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest">JAN 15, 2024</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] px-1">
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px]">TEAM</span>
                        <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest">GROWTH OPS — 4 MEMBERS</span>
                    </div>
                    <div className="flex items-center justify-between py-3 px-1">
                        <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold w-[140px]">API KEY</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest">OX-****-****-7F3A</span>
                            <button className="w-[28px] h-[28px] border-2 border-[var(--border-bright)] shadow-[2px_2px_0_var(--shadow-color)] bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:-translate-y-[1px] transition-transform">
                                <Icon icon="solar:copy-linear" className="text-sm" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════
                    CONNECTED ACCOUNTS
                   ═══════════════════════════════════════════ */}
                <div className="brutalist-card p-6 flex flex-col col-span-2">
                    <SectionHeader icon="solar:link-round-linear" title="CONNECTED ACCOUNTS" />

                    <div className="grid grid-cols-2 gap-4">
                        {connectedAccounts.map((acc) => {
                            const isConnected = acc.status === 'connected'
                            return (
                                <div
                                    key={acc.name}
                                    className="flex items-center justify-between p-4 border-2 border-[var(--border-bright)] shadow-[3px_3px_0_var(--shadow-color)] bg-[var(--bg-surface)] hover:-translate-y-[1px] hover:shadow-[3px_4px_0_var(--shadow-color)] transition-all duration-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-[36px] h-[36px] bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] flex items-center justify-center">
                                            <Icon icon={acc.icon} className={`text-base ${isConnected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[var(--text-primary)] tracking-widest">{acc.name}</span>
                                            <span className={`text-[10px] font-bold tracking-widest ${isConnected ? 'text-[var(--text-muted)]' : 'text-[var(--danger)]'}`}>{acc.detail}</span>
                                        </div>
                                    </div>
                                    <button className={`btn-base text-[9px] py-[5px] px-[12px] ${isConnected ? 'bg-[var(--bg-raised)] text-[var(--text-primary)]' : 'btn-accent'}`}>
                                        {isConnected ? 'DISCONNECT' : 'CONNECT'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* BOTTOM STATUS BAR */}
            <div className="h-[36px] mt-5 bg-[var(--bg-topbar)] border-t-2 border-[var(--border-bright)] flex items-center justify-between px-5">
                <div className="flex items-center gap-2">
                    <span className="text-[var(--success)] text-[8px] status-dot">●</span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">ACCOUNT HEALTHY</span>
                </div>
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    LAST LOGIN: TODAY 09:42 IST
                </div>
            </div>
        </div>
    )
}
