import { useState } from 'react'
import { Icon } from '@iconify/react'

export default function Campaigns() {
    const [workflowName, setWorkflowName] = useState('INTRO CAMPAIGN V2')
    const [subjectLine, setSubjectLine] = useState('Quick question about {{company}}')
    const [messageBody, setMessageBody] = useState(`Hi {{first_name}},

I noticed that {{company}} is growing its engineering team. We help teams like yours automate outreach.

Open to a quick chat?`)
    const [fromAddress, setFromAddress] = useState('hello@outreachx.io')
    const [aiGenerating, setAiGenerating] = useState(false)
    const [selectedNodeIndex, setSelectedNodeIndex] = useState(0)

    const handleAiGenerate = () => {
        setAiGenerating(true)
        setMessageBody('')

        setTimeout(() => {
            setAiGenerating(false)
            setMessageBody(`Hey {{first_name}},

Saw your recent post about scaling outreach. Our tool OUTREACHX automates precisely this workflow with AI-driven personalization.

Would love to show you how we saved Acme Corp 20 hours/week. Worth a 5-min chat?`)
        }, 1500)
    }

    return (
        <div className="absolute inset-0 flex flex-col animate-stagger">
            {/* TOOLBAR */}
            <div className="h-[56px] w-full bg-[var(--bg-topbar)] border-b-2 border-[var(--border-bright)] flex items-center px-4 gap-4 flex-shrink-0 relative z-20">
                <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="w-[220px] bg-transparent border-0 border-b-2 border-[var(--border-bright)] font-syne text-[16px] font-bold text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] py-1 focus:outline-none focus:border-accent"
                    style={{ boxShadow: 'none' }}
                />

                <span className="text-[var(--border-bright)] font-bold">|</span>
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">STATUS: DRAFT</span>

                <div className="flex-grow"></div>

                <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-widest uppercase">48 LEADS ASSIGNED</span>
                <button className="btn-base bg-[var(--bg-raised)] text-[var(--text-primary)] ml-2">
                    SAVE DRAFT
                </button>
                <button className="btn-base btn-accent flex items-center gap-2">
                    <Icon icon="solar:play-bold" /> EXECUTE
                </button>
            </div>

            {/* 3-COL LAYOUT */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: PALETTE */}
                <div className="w-[220px] bg-[var(--bg-sidebar)] border-r-2 border-[var(--border-bright)] flex flex-col z-20 flex-shrink-0">
                    <div className="p-[16px] border-b-2 border-[var(--border-bright)]">
                        <h3 className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">NODES</h3>
                    </div>
                    <div className="p-3 space-y-3 overflow-y-auto">
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[var(--accent)]">
                            <Icon icon="solar:letter-bold" className="text-accent text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">SEND EMAIL</span>
                        </div>
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[var(--text-muted)]">
                            <Icon icon="solar:clock-circle-bold" className="text-[var(--text-muted)] text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">WAIT</span>
                        </div>
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[var(--warning)]">
                            <Icon icon="solar:question-square-bold" className="text-[var(--warning)] text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">CONDITION</span>
                        </div>
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[#5865F2]">
                            <Icon icon="solar:users-group-rounded-bold" className="text-[#5865F2] text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">LINKEDIN DM</span>
                        </div>
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[#B44DFF]">
                            <Icon icon="solar:branching-paths-down-bold" className="text-[#B44DFF] text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">BRANCH</span>
                        </div>
                        <div className="brutalist-palette-block p-3 cursor-grab flex items-center border-l-4 border-l-[var(--danger)]">
                            <Icon icon="solar:stop-circle-bold" className="text-[var(--danger)] text-lg" />
                            <span className="ml-3 text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">STOP</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: CANVAS */}
                <div className="flex-1 bg-[var(--bg-canvas)] relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(var(--canvas-dot) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                    {/* LINES (SVG Overlay) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-bright)" />
                            </marker>
                        </defs>
                        <line x1="50%" y1="110" x2="50%" y2="150" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                        <line x1="50%" y1="220" x2="50%" y2="260" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                        <path d="M 50% 330 L 50% 360 L 30% 360 L 30% 385" fill="none" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                        <path d="M 50% 330 L 50% 360 L 70% 360 L 70% 385" fill="none" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                        <line x1="30%" y1="455" x2="30%" y2="495" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                        <line x1="70%" y1="455" x2="70%" y2="495" stroke="var(--border-bright)" strokeWidth="2" markerEnd="url(#arrow)" />
                    </svg>

                    {/* Branch Labels */}
                    <div className="absolute left-[40%] top-[360px] -translate-x-1/2 -translate-y-1/2 bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--text-primary)] tracking-widest z-10">YES</div>
                    <div className="absolute left-[60%] top-[360px] -translate-x-1/2 -translate-y-1/2 bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--text-primary)] tracking-widest z-10">NO</div>

                    {/* Node 1 (Selected) */}
                    <div className={`absolute left-1/2 top-[40px] -translate-x-1/2 w-[180px] brutalist-node ${selectedNodeIndex === 0 ? 'selected' : ''} z-10 cursor-pointer`} onClick={() => setSelectedNodeIndex(0)}>
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--accent)]">
                            <span className="text-[10px] uppercase text-accent font-bold tracking-widest leading-none">EMAIL</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">SEND EMAIL</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">INTRO EMAIL // AI GEN</div>
                        </div>
                    </div>

                    {/* Node 2 */}
                    <div className={`absolute left-1/2 top-[150px] -translate-x-1/2 w-[180px] brutalist-node ${selectedNodeIndex === 1 ? 'selected' : ''} z-10 cursor-pointer`} onClick={() => setSelectedNodeIndex(1)}>
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--text-muted)]">
                            <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold tracking-widest leading-none">WAIT</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">WAIT 2 DAYS</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">±20% RANDOM</div>
                        </div>
                    </div>

                    {/* Node 3 */}
                    <div className={`absolute left-1/2 top-[260px] -translate-x-1/2 w-[180px] brutalist-node ${selectedNodeIndex === 2 ? 'selected' : ''} z-10 cursor-pointer`} onClick={() => setSelectedNodeIndex(2)}>
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--warning)]">
                            <span className="text-[10px] uppercase text-[var(--warning)] font-bold tracking-widest leading-none">CONDITION</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">CHECK CONDITION</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">IF: EMAIL OPENED</div>
                        </div>
                    </div>

                    {/* Node 4a */}
                    <div className={`absolute left-[30%] top-[385px] -translate-x-1/2 w-[180px] brutalist-node ${selectedNodeIndex === 3 ? 'selected' : ''} z-10 cursor-pointer`} onClick={() => setSelectedNodeIndex(3)}>
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[#5865F2]">
                            <span className="text-[10px] uppercase text-[#5865F2] font-bold tracking-widest leading-none">LINKEDIN</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">LINKEDIN DM</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">MSG: QUICK QUESTION</div>
                        </div>
                    </div>

                    {/* Node 4b */}
                    <div className={`absolute left-[70%] top-[385px] -translate-x-1/2 w-[180px] brutalist-node ${selectedNodeIndex === 4 ? 'selected' : ''} z-10 cursor-pointer`} onClick={() => setSelectedNodeIndex(4)}>
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--accent)]">
                            <span className="text-[10px] uppercase text-accent font-bold tracking-widest leading-none">EMAIL</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide mb-1">FOLLOW-UP EMAIL</div>
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide truncate">TEMPLATE: BUMP</div>
                        </div>
                    </div>

                    {/* Node 5a (Stop) */}
                    <div className="absolute left-[30%] top-[495px] -translate-x-1/2 w-[180px] brutalist-node z-10 cursor-pointer">
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--danger)]">
                            <span className="text-[10px] uppercase text-[var(--danger)] font-bold tracking-widest leading-none">STOP</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--danger)] uppercase tracking-wide mb-1">STOP WORKFLOW</div>
                        </div>
                    </div>

                    {/* Node 5b (Stop) */}
                    <div className="absolute left-[70%] top-[495px] -translate-x-1/2 w-[180px] brutalist-node z-10 cursor-pointer">
                        <div className="h-[30px] w-full bg-[var(--bg-raised)] brutalist-node-header flex items-center px-3 border-l-4 border-l-[var(--danger)]">
                            <span className="text-[10px] uppercase text-[var(--danger)] font-bold tracking-widest leading-none">STOP</span>
                        </div>
                        <div className="p-[12px_14px]">
                            <div className="text-[11px] font-bold text-[var(--danger)] uppercase tracking-wide mb-1">STOP WORKFLOW</div>
                        </div>
                    </div>

                    {/* Mini Toolbar */}
                    <div className="absolute bottom-6 right-6 flex flex-col bg-[var(--bg-surface)] border-2 border-[var(--border-bright)] shadow-[4px_4px_0_var(--shadow-color)] z-20">
                        <button className="w-[36px] h-[36px] border-b-2 border-[var(--border-bright)] flex items-center justify-center font-bold text-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">+</button>
                        <button className="w-[36px] h-[36px] border-b-2 border-[var(--border-bright)] flex items-center justify-center font-bold text-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">-</button>
                        <button className="w-[36px] h-[36px] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"><Icon icon="solar:maximize-square-minimalistic-bold" /></button>
                    </div>
                </div>

                {/* RIGHT: CONFIG */}
                <div className="w-[260px] bg-[var(--bg-sidebar)] border-l-2 border-[var(--border-bright)] flex flex-col z-20 flex-shrink-0">
                    <div className="p-[16px] border-b-2 border-[var(--border-bright)]">
                        <h3 className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-widest">NODE CONFIG</h3>
                    </div>
                    <div className="p-5 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">SUBJECT LINE</label>
                            <input
                                type="text"
                                value={subjectLine}
                                onChange={(e) => setSubjectLine(e.target.value)}
                                className="w-full h-[36px] px-3 text-[11px] font-bold text-[var(--text-primary)]"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">MESSAGE BODY</label>
                                <span className="text-[10px] font-bold text-[var(--text-muted)]">{messageBody.length}/500</span>
                            </div>
                            <textarea
                                className="w-full h-[120px] p-3 text-[11px] font-bold text-[var(--text-primary)] resize-none mb-4"
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                            />

                            <button
                                onClick={handleAiGenerate}
                                className={`w-full btn-base ${aiGenerating ? '' : 'btn-accent'}`}
                                style={aiGenerating ? {
                                    backgroundColor: 'var(--bg-raised)',
                                    color: 'var(--text-muted)',
                                    borderColor: 'var(--border-bright)',
                                    boxShadow: '3px 3px 0 var(--shadow-color)',
                                    pointerEvents: 'none'
                                } : {}}
                            >
                                <Icon icon="solar:bolt-bold" className="text-sm mr-2" />
                                <span>{aiGenerating ? <>GENERATING<span className="animate-blink">▮</span></> : 'AI GENERATE MESSAGE'}</span>
                            </button>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] italic mt-3 leading-tight">Uses lead name, company &amp; role for personalization</p>
                        </div>

                        <div className="h-[2px] bg-[var(--border-bright)] w-full"></div>

                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">FROM ADDRESS</label>
                            <div className="relative">
                                <select
                                    className="appearance-none w-full h-[36px] px-3 text-[11px] font-bold cursor-pointer"
                                    value={fromAddress}
                                    onChange={(e) => setFromAddress(e.target.value)}
                                >
                                    <option value="hello@outreachx.io">hello@outreachx.io</option>
                                    <option value="sales@outreachx.io">sales@outreachx.io</option>
                                </select>
                                <Icon icon="solar:alt-arrow-down-linear" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-primary)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM STATS */}
            <div className="h-[40px] w-full bg-[var(--bg-topbar)] border-t-2 border-[var(--border-bright)] flex items-center px-5 gap-6 flex-shrink-0 z-20">
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">LEADS:</span><span className="text-[11px] font-bold text-[var(--text-primary)]">48</span></div>
                <span className="text-[var(--text-muted)] text-[10px] font-bold">·</span>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">RUNNING:</span><span className="text-[11px] font-bold text-[var(--text-primary)]">12</span></div>
                <span className="text-[var(--text-muted)] text-[10px] font-bold">·</span>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">COMPLETED:</span><span className="text-[11px] font-bold text-[var(--text-primary)]">31</span></div>
                <span className="text-[var(--text-muted)] text-[10px] font-bold">·</span>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">FAILED:</span><span className="text-[11px] font-bold text-[var(--text-primary)]">5</span></div>
                <span className="text-[var(--text-muted)] text-[10px] font-bold">·</span>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">THROTTLE:</span><span className="text-[11px] font-bold text-[var(--text-primary)]">10/HR</span></div>
            </div>
        </div>
    )
}
