import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'

const API_BASE = '/api/voice'
const SILENCE_THRESHOLD_MS = 1500 // 1.5 seconds of silence after speech before auto-sending
const VOLUME_THRESHOLD = 20 // Noise floor — prevents fan/AC from triggering
const MIN_SPEECH_DURATION_MS = 1500 // Must record at least 1.5s before silence-detection can fire

export default function VoiceAgent() {
    const { leadId } = useParams()
    const [lead, setLead] = useState(null)
    const [sessionId, setSessionId] = useState(null)
    const [messages, setMessages] = useState([])
    const [status, setStatus] = useState('loading') // loading | ready | recording | processing | ended | error
    const [error, setError] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [scoreUpdate, setScoreUpdate] = useState(null)
    const [volumeLevel, setVolumeLevel] = useState(0) // Visual mic indicator
    const [language, setLanguage] = useState('hi-IN') // Default to Hindi

    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])
    const chatEndRef = useRef(null)

    // Audio Context & Silence Detection
    const audioContextRef = useRef(null)
    const analyserRef = useRef(null)
    const microphoneRef = useRef(null)
    const silenceTimerRef = useRef(null)
    const currentAudioPlaybackRef = useRef(null) // To track and interrupt AI speech

    // Auto-scroll transcript
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    // Cleanup audio context on unmount
    useEffect(() => {
        return () => {
            stopAudioProcessing()
            interruptAiPlayback()
        }
    }, [])

    // Load lead data on mount
    useEffect(() => {
        async function loadLead() {
            try {
                const res = await fetch(`${API_BASE}/lead/${leadId}`)
                if (!res.ok) throw new Error('Lead not found')
                const data = await res.json()
                setLead(data)
                setStatus('ready')
            } catch (err) {
                setError('Could not load lead data: ' + err.message)
                setStatus('error')
            }
        }
        if (leadId) loadLead()
    }, [leadId])

    // Stop and clean up the visual mic & silence detection
    const stopAudioProcessing = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
        }
        if (microphoneRef.current) {
            microphoneRef.current.disconnect()
            microphoneRef.current = null
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
            audioContextRef.current = null
        }
        setVolumeLevel(0)
    }

    // Interrupt AI if it's currently speaking
    const interruptAiPlayback = () => {
        if (currentAudioPlaybackRef.current) {
            currentAudioPlaybackRef.current.pause()
            currentAudioPlaybackRef.current.currentTime = 0
            currentAudioPlaybackRef.current = null
        }
    }

    // Start session
    const handleStart = async () => {
        try {
            setStatus('processing')
            const res = await fetch(`${API_BASE}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId, language })
            })
            if (!res.ok) throw new Error('Failed to start session')
            const data = await res.json()
            setSessionId(data.sessionId)
            setMessages([{ speaker: 'ai', text: data.greeting }])

            // Play greeting audio
            if (data.audioBase64) {
                playBase64Audio(data.audioBase64)
            }

            setStatus('ready')
        } catch (err) {
            setError('Failed to start: ' + err.message)
            setStatus('error')
        }
    }

    // Record audio with VAD (Voice Activity Detection)
    const startRecording = async () => {
        // Guard: prevent double-invocation (fixes button flicker bug)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return
        if (status === 'processing' || status === 'ended') return

        try {
            interruptAiPlayback() // Cut off the AI if they are talking

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            // Set up audio context for silence detection and visualizer
            const AudioContextCls = window.AudioContext || window.webkitAudioContext
            if (AudioContextCls) {
                audioContextRef.current = new AudioContextCls()
                analyserRef.current = audioContextRef.current.createAnalyser()
                analyserRef.current.fftSize = 256
                microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)
                microphoneRef.current.connect(analyserRef.current)

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

                let hasSpoken = false // Has the user actually said anything?
                const recordingStartTime = Date.now()

                const checkAudioLevel = () => {
                    if (!analyserRef.current || mediaRecorder.state !== 'recording') return

                    analyserRef.current.getByteFrequencyData(dataArray)
                    const averageVolume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length

                    // Visual update
                    setVolumeLevel(averageVolume)

                    const elapsedMs = Date.now() - recordingStartTime

                    // VAD logic
                    if (averageVolume > VOLUME_THRESHOLD) {
                        hasSpoken = true
                        // User is actively speaking — clear any pending silence timer
                        if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current)
                            silenceTimerRef.current = null
                        }
                    } else {
                        // Silence detected — but ONLY trigger send if:
                        // 1) User has actually spoken at some point
                        // 2) Minimum recording duration has passed
                        // 3) No timer is already running
                        if (hasSpoken && elapsedMs > MIN_SPEECH_DURATION_MS && !silenceTimerRef.current) {
                            silenceTimerRef.current = setTimeout(() => {
                                if (mediaRecorderRef.current?.state === 'recording') {
                                    stopRecording()
                                }
                            }, SILENCE_THRESHOLD_MS)
                        }
                    }

                    // Fallback: if they haven't spoken at all for 8 seconds, stop
                    if (!hasSpoken && elapsedMs > 8000) {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            stopRecording()
                        }
                        return
                    }

                    requestAnimationFrame(checkAudioLevel)
                }

                requestAnimationFrame(checkAudioLevel)
            }

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                stopAudioProcessing()
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                await sendAudio(audioBlob)
            }

            mediaRecorder.start(250) // Collect data every 250ms for faster processing
            setStatus('recording')
        } catch (err) {
            console.error(err)
            setError('Microphone access denied')
            setStatus('ready')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            setStatus('processing')
        }
    }

    // Send recorded audio to backend
    const sendAudio = async (audioBlob) => {
        try {
            // Skip very small audio blobs (< 1KB = likely silence/noise)
            if (audioBlob.size < 1000) {
                setStatus('ready')
                // Auto-restart recording for the conversation loop
                if (sessionId) setTimeout(() => startRecording(), 300)
                return
            }

            setStatus('processing')
            const formData = new FormData()
            formData.append('audio', audioBlob, 'audio.webm')
            formData.append('sessionId', sessionId)
            formData.append('language', language)

            const res = await fetch(`${API_BASE}/message`, {
                method: 'POST',
                body: formData
            })

            if (!res.ok) {
                console.warn('[VoiceAgent] Server error:', res.status)
                setStatus('ready')
                // Don't break the loop — just restart recording
                if (sessionId) setTimeout(() => startRecording(), 500)
                return
            }

            const data = await res.json()

            // If STT returned empty text, silently restart recording
            if (!data.userText && !data.aiText) {
                setStatus('ready')
                if (sessionId) setTimeout(() => startRecording(), 300)
                return
            }

            const newMessages = []
            if (data.userText) newMessages.push({ speaker: 'user', text: data.userText })
            if (data.aiText) newMessages.push({ speaker: 'ai', text: data.aiText })
            if (newMessages.length > 0) setMessages(prev => [...prev, ...newMessages])

            // Play AI response audio (auto-record triggers in onended callback)
            if (data.audioBase64) {
                playBase64Audio(data.audioBase64)
            } else {
                // No audio to play — restart recording directly
                if (sessionId) setTimeout(() => startRecording(), 300)
            }

            setStatus('ready')
        } catch (err) {
            console.warn('[VoiceAgent] Send error:', err.message)
            setStatus('ready')
            // Don't break the conversation loop on transient errors
            if (sessionId) setTimeout(() => startRecording(), 500)
        }
    }

    // End session
    const handleEnd = async () => {
        if (!sessionId) return
        stopAudioProcessing()
        interruptAiPlayback()
        try {
            setStatus('processing')
            const res = await fetch(`${API_BASE}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            })
            const data = await res.json()
            setAnalysis(data.analysis)
            setScoreUpdate(data.scoreUpdate)
            setStatus('ended')
        } catch (err) {
            setStatus('ended')
        }
    }

    // Play base64 audio
    const playBase64Audio = (base64) => {
        try {
            interruptAiPlayback() // Stop any previous audio

            const audioBytes = atob(base64)
            const byteArray = new Uint8Array(audioBytes.length)
            for (let i = 0; i < audioBytes.length; i++) {
                byteArray[i] = audioBytes.charCodeAt(i)
            }
            const blob = new Blob([byteArray], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)

            currentAudioPlaybackRef.current = audio
            audio.play().catch(() => { })
            audio.onended = () => {
                URL.revokeObjectURL(url)
                if (currentAudioPlaybackRef.current === audio) {
                    currentAudioPlaybackRef.current = null
                }
                // AUTO-RECORD: Start listening again after AI finishes speaking
                // Small delay to avoid picking up speaker echo
                if (sessionId && status !== 'ended') {
                    setTimeout(() => startRecording(), 400)
                }
            }
        } catch (e) {
            // Silently fail — audio is optional
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-base, #0a0a0a)',
            color: 'var(--text-primary, #e0e0e0)',
            fontFamily: "'Inter', 'Syne', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: '24px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    marginBottom: '8px'
                }}>
                    AI Voice Assistant
                </h1>
                <p style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #666)',
                    textTransform: 'uppercase',
                    letterSpacing: '3px'
                }}>
                    NexReach AI — Powered by Voice
                </p>
            </div>

            {/* Lead Info */}
            {lead && (
                <div style={{
                    border: '2px solid var(--border, #222)',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    width: '100%',
                    maxWidth: '560px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{lead.name}</div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #666)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {lead.position}{lead.company ? ` @ ${lead.company}` : ''}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #666)', textTransform: 'uppercase', letterSpacing: '1px' }}>SCORE</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{lead.score}</div>
                    </div>
                </div>
            )}

            {/* Status & Error */}
            {error && (
                <div style={{
                    border: '2px solid #c0392b',
                    padding: '12px 20px',
                    marginBottom: '16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#c0392b',
                    width: '100%',
                    maxWidth: '560px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {error}
                </div>
            )}

            {/* Action Buttons & Language Selector */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                {status === 'ready' && !sessionId && (
                    <>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                background: '#111',
                                color: '#e0e0e0',
                                border: '2px solid #333',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="hi-IN">Hindi (हिंदी)</option>
                            <option value="en-IN">English (India)</option>
                            <option value="hi-IN-hinglish">Hinglish</option>
                            <option value="mr-IN">Marathi (मराठी)</option>
                            <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                            <option value="bn-IN">Bengali (বাংলা)</option>
                            <option value="ta-IN">Tamil (தமிழ்)</option>
                            <option value="te-IN">Telugu (తెలుగు)</option>
                            <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                            <option value="ml-IN">Malayalam (മലയാളം)</option>
                            <option value="or-IN">Odia (ଓଡ଼ିଆ)</option>
                        </select>
                        <button onClick={handleStart} style={btnStyle('#27ae60')}>
                            <Icon icon="solar:phone-calling-linear" style={{ display: 'inline', marginRight: '6px', fontSize: '14px' }} />
                            START CALL
                        </button>
                    </>
                )}
                {status === 'ready' && sessionId && (
                    <>
                        <button onClick={startRecording} style={btnStyle('#2980b9')}>
                            <Icon icon="solar:microphone-3-linear" style={{ display: 'inline', marginRight: '6px', fontSize: '14px' }} />
                            START TALKING
                        </button>
                        <button onClick={handleEnd} style={btnStyle('#c0392b')}>
                            <Icon icon="solar:phone-cancel-linear" style={{ display: 'inline', marginRight: '6px', fontSize: '14px' }} />
                            END CALL
                        </button>
                    </>
                )}
                {status === 'recording' && (
                    <button onClick={stopRecording} style={{ ...btnStyle('#e74c3c'), position: 'relative', overflow: 'hidden' }}>
                        {/* Audio visualizer background */}
                        <div style={{
                            position: 'absolute',
                            left: 0, bottom: 0,
                            height: '100%',
                            width: `${Math.min(100, (volumeLevel / 128) * 100)}%`,
                            backgroundColor: 'rgba(231, 76, 60, 0.2)',
                            zIndex: 0,
                            transition: 'width 0.1s ease',
                            pointerEvents: 'none'
                        }}></div>

                        <span style={{ position: 'relative', zIndex: 1 }}>
                            <Icon icon="solar:stop-circle-linear" style={{ display: 'inline', marginRight: '6px', fontSize: '14px' }} />
                            STOP / PAUSE
                        </span>
                    </button>
                )}
                {status === 'processing' && (
                    <div style={{
                        padding: '12px 28px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted, #666)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Icon icon="svg-spinners:pulse-rings-multiple" />
                        AI is thinking...
                    </div>
                )}
                {status === 'loading' && (
                    <div style={{
                        padding: '12px 28px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted, #666)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}>
                        Loading...
                    </div>
                )}
            </div>

            {/* Transcript */}
            <div style={{
                border: '2px solid var(--border, #222)',
                width: '100%',
                maxWidth: '560px',
                minHeight: '300px',
                maxHeight: '450px',
                overflowY: 'auto',
                padding: '16px',
                position: 'relative'
            }}>
                <div style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--text-muted, #666)',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--border, #222)',
                    paddingBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>CONVERSATION TRANSCRIPT</span>
                    {status === 'recording' && (
                        <span style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e74c3c', animation: 'pulse 1.5s infinite' }}></span>
                            LISTENING
                        </span>
                    )}
                </div>
                {messages.length === 0 && (
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted, #666)',
                        textAlign: 'center',
                        marginTop: '40px'
                    }}>
                        Click "START CALL" to begin the conversation.
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        marginBottom: '12px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                    }}>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: msg.speaker === 'ai' ? '#27ae60' : '#3498db',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            flexShrink: 0,
                            width: '30px',
                            paddingTop: '2px'
                        }}>
                            {msg.speaker === 'ai' ? 'AI' : 'YOU'}
                        </span>
                        <span style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            color: 'var(--text-secondary, #bbb)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.text}
                        </span>
                    </div>
                ))}

                {/* Visualizer for recording state */}
                {status === 'recording' && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '20px', marginLeft: '40px', marginTop: '10px' }}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{
                                width: '4px',
                                backgroundColor: '#3498db',
                                height: `${Math.max(10, Math.random() * (volumeLevel / 2))}%`,
                                transition: 'height 0.1s ease'
                            }}></div>
                        ))}
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Analysis (shown after session ends) */}
            {status === 'ended' && analysis && (
                <div style={{
                    border: '2px solid var(--border, #222)',
                    width: '100%',
                    maxWidth: '560px',
                    padding: '16px',
                    marginTop: '16px',
                    animation: 'fadeUp 0.3s ease'
                }}>
                    <div style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text-muted, #666)',
                        textTransform: 'uppercase',
                        letterSpacing: '3px',
                        marginBottom: '12px',
                        borderBottom: '1px solid var(--border, #222)',
                        paddingBottom: '8px'
                    }}>
                        CONVERSATION ANALYSIS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <div style={labelStyle}>INTEREST</div>
                            <div style={{ ...valueStyle, color: analysis.interestLevel === 'high' ? '#27ae60' : analysis.interestLevel === 'medium' ? '#f1c40f' : '#e74c3c' }}>
                                {analysis.interestLevel?.toUpperCase() || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <div style={labelStyle}>SENTIMENT</div>
                            <div style={valueStyle}>{analysis.sentiment?.toUpperCase() || 'N/A'}</div>
                        </div>
                        <div>
                            <div style={labelStyle}>NEXT ACTION</div>
                            <div style={valueStyle}>{(analysis.nextAction || 'none').replace(/_/g, ' ').toUpperCase()}</div>
                        </div>
                        <div>
                            <div style={labelStyle}>TOPICS ASKED</div>
                            <div style={valueStyle}>{analysis.questions?.length > 0 ? analysis.questions.join(', ') : 'None'}</div>
                        </div>
                    </div>
                    {scoreUpdate && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border, #222)', paddingTop: '12px' }}>
                            <span style={labelStyle}>UPDATED SCORE: </span>
                            <span style={{ ...valueStyle, fontSize: '16px', fontFamily: "'Syne', sans-serif" }}>
                                {scoreUpdate.score} ({scoreUpdate.scoreLabel})
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div style={{
                marginTop: '32px',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted, #444)',
                textTransform: 'uppercase',
                letterSpacing: '2px'
            }}>
                Powered by NexReach AI
            </div>

            {/* Inline CSS animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    )
}

// ─── Shared styles ───
const btnStyle = (bg) => ({
    padding: '12px 28px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '2px',
    border: `2px solid ${bg}`,
    background: 'transparent',
    color: bg,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
})

const labelStyle = {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted, #666)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '2px'
}

const valueStyle = {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-primary, #e0e0e0)'
}
