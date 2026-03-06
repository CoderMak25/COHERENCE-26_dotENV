/**
 * Voice Agent Service
 *
 * Orchestrates voice conversation sessions:
 *   start → processMessage → ... → end
 *
 * ── API ROUTING ──
 * • CONVERSATION (STT / Chat / TTS) → Sarvam AI exclusively
 * • LOG ANALYSIS & SUMMARY          → Groq  (only usage)
 */

import Groq from 'groq-sdk'
import Lead from '../models/Lead.js'
import Conversation from '../models/Conversation.js'
import Log from '../models/Log.js'
import { speechToText, textToSpeech } from './servamClient.js'
import { processEngagementEvent } from './leadScoringService.js'

// ─── Groq LLM client — ONLY for post-call analysis ───
let groqClient = null
const getGroq = () => {
    if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
    return groqClient
}
// Use a model that is actually available on Groq
const ANALYSIS_MODEL = 'llama-3.3-70b-versatile'

// ─── Sarvam config ───
const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions'
const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate'
const SARVAM_CHAT_MODEL = 'sarvam-m'

// ─── Active session store ───
const sessions = new Map()

// ─── System prompt (used for Sarvam chat) ───
const SYSTEM_PROMPT = `You are a friendly, highly conversational AI sales assistant representing NexReach AI.

CRITICAL INSTRUCTION: You must sound exactly like a real human on a phone call. 
- Use natural filler words like "Umm", "Hmm", "Ah", "Well", "Yeah", "Got it".
- Keep your sentences very short and conversational (2-3 sentences max).
- Do NOT sound like an AI. Do NOT use lists, bullet points, or formal markdown.
- End your responses with short, engaging questions.

Product: NexReach AI is an AI platform that automates lead outreach, personalized messaging, and follow-ups.
Capabilities: automated outreach, AI messaging, lead scoring, voice conversation agents, sales workflow automation.
Benefits: increases reply rates, prioritizes valuable leads, automates follow-ups.

Conversation goals:
1. Introduce the product briefly
2. Ask about the lead's current outreach process
3. Identify pain points
4. Determine if they are interested in automation
5. If interest is high, suggest scheduling a demo

If the user says they are not interested, busy, or want to call later, politely wrap up.

IMPORTANT: Always respond in the SAME LANGUAGE the user speaks in. If they speak Hindi, respond in Hindi. If English, respond in English. If they mix Hindi and English, respond in that same mix.`

/**
 * Build lead-specific context string.
 */
function buildLeadContext(lead) {
    return `Lead context:
- Name: ${lead.name || 'there'}
- Role: ${lead.position || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || (lead.tags && lead.tags[0]) || 'unknown'}
- Lead Score: ${lead.score || 0}/100`
}

/**
 * Build greeting message for a lead.
 */
function buildGreeting(lead) {
    const name = lead.name ? lead.name.split(' ')[0] : 'there'
    const parts = [`Hi ${name}, thanks for taking a moment to chat with me.`]
    if (lead.company && lead.position) {
        parts.push(`I see you're the ${lead.position} at ${lead.company} — that's exciting!`)
    } else if (lead.company) {
        parts.push(`I noticed you're at ${lead.company} — great to connect!`)
    }
    parts.push(`I'm an AI assistant from NexReach AI. I'd love to tell you how we can help streamline your outreach. What questions do you have?`)
    return parts.join(' ')
}

/**
 * Sanitize the chat history so it strictly alternates:
 *   system → user → assistant → user → assistant → ...
 * Sarvam's API crashes if this pattern is violated.
 */
function buildSarvamMessages(chatHistory) {
    const result = []
    let lastRole = null

    for (const msg of chatHistory) {
        if (msg.role === 'system') {
            result.push(msg)
            lastRole = 'system'
            continue
        }

        // After system or after assistant, we expect 'user'
        if (msg.role === 'user') {
            if (lastRole === 'user') {
                // Merge consecutive user messages
                result[result.length - 1] = {
                    role: 'user',
                    content: result[result.length - 1].content + ' ' + msg.content
                }
            } else {
                result.push(msg)
                lastRole = 'user'
            }
        } else if (msg.role === 'assistant') {
            if (lastRole === 'assistant') {
                // Merge consecutive assistant messages
                result[result.length - 1] = {
                    role: 'assistant',
                    content: result[result.length - 1].content + ' ' + msg.content
                }
            } else if (lastRole === 'system') {
                // Can't have assistant right after system — inject a dummy user turn
                result.push({ role: 'user', content: 'Hello.' })
                result.push(msg)
                lastRole = 'assistant'
            } else {
                result.push(msg)
                lastRole = 'assistant'
            }
        }
    }

    // The last message MUST be 'user' (we want the AI to reply)
    if (result.length > 0 && result[result.length - 1].role !== 'user') {
        // If it ends with assistant, pop it — we just need the user turn at the end
        while (result.length > 1 && result[result.length - 1].role === 'assistant') {
            result.pop()
        }
    }

    return result
}

/**
 * Call Sarvam's Chat Completion API.
 */
async function sarvamChat(messages) {
    const response = await fetch(SARVAM_CHAT_URL, {
        method: 'POST',
        headers: {
            'api-subscription-key': process.env.SARVAM_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: SARVAM_CHAT_MODEL,
            temperature: 0.7,
            max_tokens: 100,
            messages
        })
    })

    if (!response.ok) {
        const errBody = await response.text()
        console.error('[VoiceAgent] Sarvam chat error:', response.status, errBody)
        throw new Error(`Sarvam chat ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || ''
}

/**
 * Translate text using Sarvam Translate API.
 */
async function sarvamTranslate(text, targetLang) {
    try {
        const response = await fetch(SARVAM_TRANSLATE_URL, {
            method: 'POST',
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                source_language_code: 'en-IN',
                target_language_code: targetLang,
                speaker_gender: 'Female',
                mode: 'formal',
                model: 'sarvam-translate:v1'
            })
        })
        if (response.ok) {
            const data = await response.json()
            return data.translated_text || text
        }
    } catch (e) {
        console.error('[VoiceAgent] Translation error:', e.message)
    }
    return text // fallback to original
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Start a voice session for a lead.
 */
export async function startSession(leadId, language = 'hi-IN') {
    const lead = await Lead.findById(leadId).lean()
    if (!lead) throw new Error('Lead not found')

    // Create conversation record
    const conversation = await Conversation.create({
        leadId: lead._id,
        startTime: new Date(),
        messages: []
    })

    const sessionId = conversation._id.toString()
    const greeting = buildGreeting(lead)

    // Handle "Hinglish" logic
    let promptAddition = ''
    let ttsLanguage = language
    if (language === 'hi-IN-hinglish') {
        ttsLanguage = 'hi-IN'
        promptAddition = '\n\nIMPORTANT: The user has selected "Hinglish". You MUST respond using a mix of Hindi and English written in the Latin alphabet (e.g., "Haan, bilkul samajh gaya. Let me tell you about that feature."). DO NOT USE DEVANAGARI SCRIPT.'
    } else if (language !== 'en-IN') {
        promptAddition = `\n\nIMPORTANT: You MUST respond in the language code: ${language}.`
    }

    // Store session in memory
    // Chat history starts with system + user("Hello") + assistant(greeting)
    // This ensures the alternating pattern Sarvam requires.
    sessions.set(sessionId, {
        leadId: lead._id.toString(),
        lead,
        conversationId: sessionId,
        language: ttsLanguage,
        chatHistory: [
            { role: 'system', content: SYSTEM_PROMPT + promptAddition + '\n\n' + buildLeadContext(lead) },
            { role: 'user', content: 'Hello.' },
            { role: 'assistant', content: greeting }
        ],
        startTime: Date.now()
    })

    // Translate greeting for non-English languages
    let spokenGreeting = greeting
    if (ttsLanguage !== 'en-IN') {
        spokenGreeting = await sarvamTranslate(greeting, ttsLanguage)
    }

    // Save greeting to DB
    await Conversation.findByIdAndUpdate(sessionId, {
        $push: { messages: { speaker: 'ai', text: spokenGreeting, timestamp: new Date() } }
    })

    // Generate TTS for greeting
    const tts = await textToSpeech(spokenGreeting, ttsLanguage)

    // Log the voice session start
    await Log.create({
        leadId: lead._id,
        leadName: lead.name,
        action: 'VOICE_SESSION_START',
        status: 'SENT',
        step: 'voice_greeting',
        channel: 'voice',
        direction: 'sent',
        subject: 'Voice Agent Session Started',
        body: greeting
    })

    return {
        sessionId,
        greeting: spokenGreeting,
        audioBase64: tts.audioBase64,
        lead: {
            name: lead.name,
            company: lead.company,
            position: lead.position,
            score: lead.score,
            scoreLabel: lead.scoreLabel
        }
    }
}

/**
 * Process a user's audio message and return AI response.
 */
export async function processMessage(sessionId, audioBuffer, language = 'hi-IN') {
    const session = sessions.get(sessionId)
    if (!session) throw new Error('Session not found or expired')

    // Handle hinglish parsing for STT
    let sttLanguage = language
    if (language === 'hi-IN-hinglish') sttLanguage = 'hi-IN'

    // Check 5-minute timeout
    const elapsed = (Date.now() - session.startTime) / 1000
    if (elapsed > 300) {
        return await endSession(sessionId)
    }

    // 1. Speech-to-Text (Sarvam)
    const stt = await speechToText(audioBuffer, sttLanguage)
    const userText = stt.text || ''

    if (!userText.trim()) {
        return { userText: '', aiText: '', audioBase64: '', sessionId }
    }

    // 2. Add user message to chat history
    session.chatHistory.push({ role: 'user', content: userText })

    // Save user message to DB
    await Conversation.findByIdAndUpdate(sessionId, {
        $push: { messages: { speaker: 'user', text: userText, timestamp: new Date() } }
    })

    // 3. Generate AI response via Sarvam Chat
    let aiText = ''
    try {
        const sanitized = buildSarvamMessages(session.chatHistory)
        aiText = await sarvamChat(sanitized)
    } catch (err) {
        console.error('[VoiceAgent] Sarvam chat failed:', err.message)
        // Natural fallback — no "hiccup" language
        aiText = 'Sorry, can you say that again?'
    }

    // 4. Add AI message to chat history
    session.chatHistory.push({ role: 'assistant', content: aiText })

    // Save AI message to DB
    await Conversation.findByIdAndUpdate(sessionId, {
        $push: { messages: { speaker: 'ai', text: aiText, timestamp: new Date() } }
    })

    // 5. Text-to-Speech (Sarvam)
    const tts = await textToSpeech(aiText, session.language || 'hi-IN')

    return {
        sessionId,
        userText,
        aiText,
        audioBase64: tts.audioBase64
    }
}

/**
 * End a voice session, analyze the conversation, and update lead score.
 */
export async function endSession(sessionId) {
    const session = sessions.get(sessionId)
    if (!session) {
        return { sessionId, analysis: null, message: 'Session already ended or not found' }
    }

    // Remove from active sessions
    sessions.delete(sessionId)

    // Get conversation from DB
    const conversation = await Conversation.findById(sessionId)
    if (!conversation) {
        return { sessionId, analysis: null, message: 'Conversation record not found' }
    }

    // Mark end time
    conversation.endTime = new Date()

    // Analyze conversation using Groq (only Groq usage in entire file)
    const analysis = await analyzeConversation(conversation.messages)
    conversation.analysis = analysis
    await conversation.save()

    // Update lead score based on analysis
    const lead = await Lead.findById(session.leadId)
    if (lead) {
        const voiceEvents = getVoiceEngagementEvents(analysis)
        for (const eventType of voiceEvents) {
            const updates = processEngagementEvent(lead.toObject(), eventType)
            lead.engagementHistory = updates.engagementHistory
            lead.score = updates.score
            lead.scoreLabel = updates.scoreLabel
        }
        await lead.save()

        await Log.create({
            leadId: lead._id,
            leadName: lead.name,
            action: 'VOICE_SESSION_END',
            status: 'COMPLETED',
            step: 'voice_analysis',
            channel: 'voice',
            direction: 'received',
            subject: 'Voice Agent Session Ended',
            body: `Interest: ${analysis.interestLevel}, Sentiment: ${analysis.sentiment}, Next: ${analysis.nextAction}`,
            detail: JSON.stringify(analysis)
        })
    }

    return {
        sessionId,
        analysis,
        scoreUpdate: lead ? { score: lead.score, scoreLabel: lead.scoreLabel } : null,
        message: 'Session ended and analyzed'
    }
}

/**
 * Analyze conversation transcript using Groq LLM (the ONLY Groq usage).
 */
async function analyzeConversation(messages) {
    if (!messages || messages.length === 0) {
        return { summary: 'No conversation recorded.', interestLevel: 'none', questions: [], sentiment: 'neutral', nextAction: 'no_action' }
    }

    const transcript = messages.map(m => `${m.speaker === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n')

    const systemPrompt = `You are an expert sales conversation analyst. Analyze this conversation transcript and respond ONLY with valid JSON matching this schema:
{
  "summary": "A concise 2-3 sentence summary of what was discussed, the lead's mood, and any key points",
  "interestLevel": "high" | "medium" | "low" | "none",
  "questions": ["list of topics the user asked about"],
  "sentiment": "positive" | "neutral" | "negative",
  "nextAction": "schedule_demo" | "send_info" | "follow_up" | "nurture" | "no_action"
}
Only respond with the JSON object, nothing else.`

    try {
        const response = await getGroq().chat.completions.create({
            model: ANALYSIS_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze this transcript:\n\n${transcript}` }
            ],
            temperature: 0.3,
            max_tokens: 400
        })

        const raw = response.choices[0]?.message?.content?.trim() || '{}'
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)

        return {
            summary: parsed.summary || 'No summary generated.',
            interestLevel: parsed.interestLevel || 'none',
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            sentiment: parsed.sentiment || 'neutral',
            nextAction: parsed.nextAction || 'no_action'
        }
    } catch (err) {
        console.error('[VoiceAgent] Analysis error:', err.message)
        return { summary: 'Analysis unavailable.', interestLevel: 'none', questions: [], sentiment: 'neutral', nextAction: 'no_action' }
    }
}

/**
 * Map conversation analysis to engagement event types.
 */
function getVoiceEngagementEvents(analysis) {
    const events = []
    events.push('link_click') // +20

    if (analysis.interestLevel === 'high') {
        events.push('reply_received') // +40
    } else if (analysis.interestLevel === 'medium') {
        events.push('email_open') // +10
    } else if (analysis.sentiment === 'negative') {
        events.push('ignored') // -5
    }

    return events
}

/**
 * Get session status (for health checks).
 */
export function getActiveSessionCount() {
    return sessions.size
}
