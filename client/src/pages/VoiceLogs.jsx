import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import axios from 'axios'

export default function VoiceLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedLog, setSelectedLog] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Fetching from the public route
                const res = await axios.get('/api/voice/conversations/all')
                setLogs(res.data)
            } catch (err) {
                console.error('Failed to fetch voice logs:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchLogs()
    }, [])

    const openModal = (log) => {
        setSelectedLog(log)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedLog(null)
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(date)
    }

    const getDuration = (start, end) => {
        if (!start || !end) return 'Unknown'
        const diff = new Date(end) - new Date(start)
        const seconds = Math.floor(diff / 1000)
        return `${seconds}s`
    }

    const getInterestColor = (interestLevel) => {
        switch (interestLevel?.toLowerCase()) {
            case 'high': return 'bg-emerald-500/10 text-emerald-500'
            case 'medium': return 'bg-amber-500/10 text-amber-500'
            case 'low': return 'bg-rose-500/10 text-rose-500'
            default: return 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)] h-full">
                <Icon icon="svg-spinners:ring-resize" className="text-3xl" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-base)]">
            <header className="flex-shrink-0 px-8 py-6 border-b border-[var(--border)]">
                <div className="flex items-center gap-3 mb-2">
                    <Icon icon="solar:microphone-3-linear" className="text-2xl text-[var(--accent)]" />
                    <h1 className="text-2xl font-syne font-bold text-[var(--text-primary)]">VOICE LOGS</h1>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                    Review AI conversation transcripts and lead sentiment analysis.
                </p>
            </header>

            <div className="flex-1 overflow-auto p-8">
                <div className="brutalist-panel p-0 overflow-hidden">
                    {/* Header Row */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_3fr_1.5fr_1fr] px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-raised)]">
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">LEAD</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">DATE</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">DURATION</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">SUMMARY</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">INTEREST / NEXT</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider text-right">ACTION</div>
                    </div>

                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                            No voice conversations recorded yet. When a lead talks to the AI, it will appear here.
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log._id} className="grid grid-cols-[2fr_1fr_1fr_3fr_1.5fr_1fr] px-6 py-4 border-b border-[var(--border)] items-center hover:bg-[var(--bg-hover)] transition-colors">
                                {/* Lead Info */}
                                <div>
                                    <div className="font-bold text-[var(--text-primary)] text-sm">
                                        {log.leadId?.name || 'Unknown Lead'}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                                        {log.leadId?.company || 'No Company'}
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="text-xs text-[var(--text-secondary)] font-medium">
                                    {formatDate(log.createdAt)}
                                </div>

                                {/* Duration */}
                                <div className="text-xs text-[var(--text-secondary)] font-mono">
                                    {getDuration(log.startTime, log.endTime)}
                                </div>

                                {/* AI Summary */}
                                <div className="pr-4">
                                    {log.analysis?.summary ? (
                                        <div className="text-[11px] leading-snug text-[var(--text-secondary)] line-clamp-2 italic">
                                            "{log.analysis.summary}"
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[var(--text-muted)] italic">No summary</span>
                                    )}
                                </div>

                                {/* Interest & Next Action */}
                                <div>
                                    {log.analysis?.interestLevel ? (
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${getInterestColor(log.analysis.interestLevel)}`}>
                                                {log.analysis.interestLevel} Interest
                                            </span>
                                            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">
                                                Next: {(log.analysis.nextAction || 'None').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[var(--text-muted)] italic">Ongoing / No analysis</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="text-right">
                                    <button
                                        onClick={() => openModal(log)}
                                        className="px-4 py-1.5 border border-[var(--border-bright)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider transition-colors"
                                    >
                                        VIEW LOGS
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal for Transcript & Summary */}
            {isModalOpen && selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-[var(--bg-raised)] border-2 border-[var(--border-bright)] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--border)] flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-syne font-bold text-[var(--text-primary)] uppercase">
                                    {selectedLog.leadId?.name} — Conversation Log
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    {formatDate(selectedLog.createdAt)} • {getDuration(selectedLog.startTime, selectedLog.endTime)}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                <Icon icon="solar:close-square-linear" className="text-3xl" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">

                            {/* Left Side: Transcript */}
                            <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
                                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-sidebar)]">
                                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Full Transcript</h3>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                    {(!selectedLog.messages || selectedLog.messages.length === 0) ? (
                                        <p className="text-sm text-[var(--text-muted)] italic text-center mt-10">No messages recorded.</p>
                                    ) : (
                                        selectedLog.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] p-4 ${msg.speaker === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)]'}`}>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${msg.speaker === 'user' ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                                                        {msg.speaker === 'user' ? selectedLog.leadId?.name || 'Lead' : 'AI Assistant'}
                                                    </div>
                                                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right Side: AI Summary */}
                            <div className="w-full md:w-[350px] flex-shrink-0 flex flex-col min-h-0 overflow-y-auto bg-[var(--bg-sidebar)]">
                                <div className="p-4 border-b border-[var(--border)]">
                                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">AI Analysis</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    {selectedLog.analysis ? (
                                        <>
                                            {selectedLog.analysis.summary && (
                                                <div>
                                                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Conversation Summary</div>
                                                    <div className="text-sm leading-relaxed text-[var(--text-primary)] italic bg-[var(--bg-base)] p-3 border-l-2 border-[var(--accent)]">
                                                        "{selectedLog.analysis.summary}"
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Interest Level</div>
                                                <div className={`inline-block px-3 py-1 font-bold text-xs uppercase tracking-wider border ${selectedLog.analysis.interestLevel === 'high' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' :
                                                    selectedLog.analysis.interestLevel === 'medium' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' :
                                                        'border-rose-500/30 text-rose-500 bg-rose-500/10'
                                                    }`}>
                                                    {selectedLog.analysis.interestLevel}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Sentiment</div>
                                                <div className="text-sm text-[var(--text-primary)] font-medium capitalize">
                                                    {selectedLog.analysis.sentiment}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Discussed Topics / Questions</div>
                                                {selectedLog.analysis.questions && selectedLog.analysis.questions.length > 0 ? (
                                                    <ul className="list-disc pl-4 text-sm text-[var(--text-secondary)] space-y-1">
                                                        {selectedLog.analysis.questions.map((q, i) => (
                                                            <li key={i}>{q}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-sm text-[var(--text-muted)] italic">None recorded</span>
                                                )}
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recommended Next Action</div>
                                                <div className="p-3 bg-[var(--bg-base)] border border-[var(--border)] text-sm font-bold text-[var(--accent)] uppercase tracking-wide">
                                                    {(selectedLog.analysis.nextAction || 'none').replace(/_/g, ' ')}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] italic text-center mt-10">
                                            Analysis is not available for this conversation. The session might not have been completed properly.
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
