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
const SYSTEM_PROMPT = `You are a friendly, highly conversational AI sales assistant representing NexReach AI. Your name is Ria.

CRITICAL RULES:
1. Sound exactly like a real human on a phone call. Use natural fillers like "Hmm", "Ah", "Well", "Yeah", "Accha", "Haan".
2. Keep every response to 2 to 3 short sentences. Never give long answers.
3. NEVER use hyphens, dashes, em dashes, bullet points, numbered lists, or any markdown formatting. Write in plain spoken language only.
4. NEVER say "I had a hiccup" or "Could you repeat that" or anything that sounds robotic.
5. Always match the language the user speaks. If Hindi, reply in Hindi. If English, reply in English. If Hinglish (mix of Hindi and English), reply in Hinglish.
6. If the user goes off topic (jokes, random questions, personal chat), answer their question briefly and naturally, then gently steer back to the product conversation. Example: "Haha, that's a good one! By the way, have you thought about automating your outreach?"

About NexReach AI:
NexReach AI automates lead outreach, personalized messaging, follow ups, and lead scoring using AI.
It increases reply rates, prioritizes valuable leads, and saves hours of manual work.

Your conversation goals:
First, introduce the product briefly.
Then ask about the lead's current outreach process.
Identify their pain points.
Check if they are interested in automation.
If interest is high, suggest scheduling a demo.

If the user is not interested or busy, politely wrap up and wish them well.`

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
            temperature: 0.5,
            max_tokens: 60,
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

    // Save user message to DB (fire-and-forget, don't block)
    Conversation.findByIdAndUpdate(sessionId, {
        $push: { messages: { speaker: 'user', text: userText, timestamp: new Date() } }
    }).catch(() => { })

    // 3. Generate AI response via Sarvam Chat (this is the main latency bottleneck)
    let aiText = ''
    try {
        const sanitized = buildSarvamMessages(session.chatHistory)
        aiText = await sarvamChat(sanitized)
    } catch (err) {
        console.error('[VoiceAgent] Sarvam chat failed:', err.message)
        aiText = 'Sorry, can you say that again?'
    }

    // 4. Add AI message to chat history
    session.chatHistory.push({ role: 'assistant', content: aiText })

    // Save AI message to DB AND generate TTS in parallel (huge speed win)
    const [, tts] = await Promise.all([
        Conversation.findByIdAndUpdate(sessionId, {
            $push: { messages: { speaker: 'ai', text: aiText, timestamp: new Date() } }
        }).catch(() => { }),
        textToSpeech(aiText, session.language || 'hi-IN')
    ])

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

    // Even if session is gone from memory, try to get/analyze from DB
    if (!session) {
        const conv = await Conversation.findById(sessionId).lean()
        if (!conv) {
            return { sessionId, analysis: null, message: 'Conversation not found' }
        }
        // If already analyzed, return existing analysis
        if (conv.analysis && conv.analysis.summary) {
            return { sessionId, analysis: conv.analysis, message: 'Session already ended (returning cached analysis)' }
        }
        // Analyze from DB messages
        const lead = conv.leadId ? await Lead.findById(conv.leadId).lean() : null
        const analysis = await analyzeConversation(conv.messages || [], lead)
        await Conversation.findByIdAndUpdate(sessionId, {
            $set: { analysis, endTime: conv.endTime || new Date() }
        })
        return { sessionId, analysis, message: 'Session ended (analyzed from DB)' }
    }

    // Remove from active sessions
    sessions.delete(sessionId)

    // Get conversation from DB
    const conversation = await Conversation.findById(sessionId)
    if (!conversation) {
        // No DB record — analyze from in-memory chat history
        const inMemMsgs = (session.chatHistory || [])
            .filter(m => m.role !== 'system')
            .map(m => ({ speaker: m.role === 'user' ? 'user' : 'ai', text: m.content }))
        const analysis = await analyzeConversation(inMemMsgs, session.lead)
        return { sessionId, analysis, message: 'Session ended (analyzed from memory)' }
    }

    // Mark end time
    conversation.endTime = new Date()

    // Build the best possible transcript: merge in-memory chat history (richer) with DB messages
    let messagesForAnalysis = conversation.messages || []

    // If in-memory chat has more substance, build transcript from there
    if (session.chatHistory && session.chatHistory.length > 2) {
        const inMemoryMessages = session.chatHistory
            .filter(m => m.role !== 'system')
            .map(m => ({
                speaker: m.role === 'user' ? 'user' : 'ai',
                text: m.content
            }))

        // Use whichever has more messages
        if (inMemoryMessages.length > messagesForAnalysis.length) {
            messagesForAnalysis = inMemoryMessages
        }
    }

    // Analyze conversation using Groq (only Groq usage in entire file)
    const analysis = await analyzeConversation(messagesForAnalysis, session.lead)
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
async function analyzeConversation(messages, lead = null) {
    if (!messages || messages.length === 0) {
        return { summary: 'No conversation recorded.', interestLevel: 'none', questions: [], sentiment: 'neutral', nextAction: 'no_action' }
    }

    // Build transcript — filter empty messages and format clearly
    const transcript = messages
        .filter(m => m.text && m.text.trim().length > 0)
        .map(m => `${m.speaker === 'ai' ? 'AI Agent' : 'Lead'}: ${m.text.trim()}`)
        .join('\n')

    if (!transcript || transcript.length < 10) {
        return { summary: 'Conversation was too short to analyze.', interestLevel: 'none', questions: [], sentiment: 'neutral', nextAction: 'no_action' }
    }

    // Build lead context for richer analysis
    const leadContext = lead
        ? `\nLead Info: ${lead.name || 'Unknown'}, ${lead.position || ''} at ${lead.company || 'Unknown company'}, Industry: ${lead.industry || 'unknown'}`
        : ''

    const systemPrompt = `You are an expert sales conversation analyst. You will analyze a conversation between an AI sales agent and a potential lead/customer.

The conversation may be in English, Hindi, Hinglish (mix of Hindi and English), or any other language. Regardless of the language used, you MUST provide the analysis in English.${leadContext}

Analyze the conversation and respond with ONLY a JSON object (no text before or after). Use this exact format:

{
  "summary": "Write a clear 2-3 sentence summary describing: what was discussed, how the lead responded, and the overall outcome of the conversation. Be specific — mention the lead's name if available, what product/feature they discussed, and their reaction.",
  "interestLevel": "high",
  "questions": ["specific topic 1 the lead asked about", "specific topic 2"],
  "sentiment": "positive",
  "nextAction": "schedule_demo"
}

Rules for each field:
- summary: MUST be 2-3 complete sentences. Be specific about what happened. Never say "No summary" or "Analysis unavailable".
- interestLevel: Must be exactly one of: "high", "medium", "low", "none"
  - high = lead asked for demo, pricing, or expressed clear buying intent
  - medium = lead engaged with questions but no commitment
  - low = lead was polite but clearly not interested
  - none = no meaningful interaction
- questions: Array of specific topics the lead asked about or discussed. Empty array [] if none.
- sentiment: Must be exactly one of: "positive", "neutral", "negative"
- nextAction: Must be exactly one of: "schedule_demo", "send_info", "follow_up", "nurture", "no_action"
  - schedule_demo = lead wants a demo or meeting
  - send_info = lead asked for more details/docs
  - follow_up = lead is interested but needs time
  - nurture = lead is lukewarm, needs nurturing
  - no_action = lead declined or conversation was too short

IMPORTANT: Respond with ONLY the JSON object. No markdown, no explanation, no code blocks.`

    try {
        const response = await getGroq().chat.completions.create({
            model: ANALYSIS_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Here is the full conversation transcript to analyze:\n\n${transcript}` }
            ],
            temperature: 0.2,
            max_tokens: 600
        })

        const raw = response.choices[0]?.message?.content?.trim() || ''
        console.log('[VoiceAgent] Raw Groq analysis response:', raw.slice(0, 300))

        // Robust JSON extraction — try multiple strategies
        let parsed = null

        // Strategy 1: Direct parse
        try {
            parsed = JSON.parse(raw)
        } catch { }

        // Strategy 2: Strip markdown code blocks
        if (!parsed) {
            try {
                const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                parsed = JSON.parse(cleaned)
            } catch { }
        }

        // Strategy 3: Find JSON object in the text
        if (!parsed) {
            try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/)
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
            } catch { }
        }

        if (parsed && parsed.summary) {
            return {
                summary: parsed.summary,
                interestLevel: ['high', 'medium', 'low', 'none'].includes(parsed.interestLevel) ? parsed.interestLevel : 'none',
                questions: Array.isArray(parsed.questions) ? parsed.questions : [],
                sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
                nextAction: parsed.nextAction || 'no_action'
            }
        }

        // If we got some response but couldn't parse it, use it as summary
        if (raw.length > 20) {
            console.warn('[VoiceAgent] Could not parse JSON, using raw text as summary')
            return {
                summary: raw.slice(0, 500),
                interestLevel: 'none',
                questions: [],
                sentiment: 'neutral',
                nextAction: 'follow_up'
            }
        }

        // Fall through to rule-based fallback
        throw new Error('Empty or unparseable response from Groq')

    } catch (err) {
        console.error('[VoiceAgent] Groq analysis error:', err.message)

        // Rule-based fallback — generate a decent summary from the transcript itself
        const userMessages = messages.filter(m => m.speaker === 'user').map(m => m.text.toLowerCase()).join(' ')
        const aiMessages = messages.filter(m => m.speaker === 'ai').map(m => m.text).join(' ')
        const leadName = lead?.name || 'The lead'
        const msgCount = messages.length

        // Detect interest keywords
        const highInterest = /demo|pricing|price|cost|buy|purchase|subscribe|interested|sign up|schedule|meeting|call me/i.test(userMessages)
        const lowInterest = /not interested|no thanks|busy|later|don't need|unsubscribe|stop/i.test(userMessages)
        const hasQuestions = /\?|how|what|why|when|which|can you|tell me|does it/i.test(userMessages)

        let interest = 'none'
        let sentiment = 'neutral'
        let nextAction = 'no_action'
        let summaryParts = []

        if (msgCount <= 2) {
            summaryParts.push(`${leadName} had a very brief conversation with the AI agent.`)
            summaryParts.push('The interaction was too short to determine any meaningful interest.')
        } else if (highInterest) {
            interest = 'high'
            sentiment = 'positive'
            nextAction = 'schedule_demo'
            summaryParts.push(`${leadName} showed strong interest during the conversation.`)
            summaryParts.push('They expressed intent to learn more or schedule a demo.')
        } else if (lowInterest) {
            interest = 'low'
            sentiment = 'negative'
            nextAction = 'nurture'
            summaryParts.push(`${leadName} did not show interest in the offering.`)
            summaryParts.push('They indicated they are not currently looking for this solution.')
        } else if (hasQuestions) {
            interest = 'medium'
            sentiment = 'positive'
            nextAction = 'follow_up'
            summaryParts.push(`${leadName} engaged with the AI agent and asked questions about the product.`)
            summaryParts.push('They showed moderate interest and may benefit from a follow-up.')
        } else {
            interest = 'low'
            sentiment = 'neutral'
            nextAction = 'nurture'
            summaryParts.push(`${leadName} had a ${msgCount}-message conversation with the AI agent.`)
            summaryParts.push('The conversation did not result in a clear next step.')
        }

        summaryParts.push(`Total messages exchanged: ${msgCount}.`)

        return {
            summary: summaryParts.join(' '),
            interestLevel: interest,
            questions: hasQuestions ? ['product features', 'general inquiry'] : [],
            sentiment,
            nextAction
        }
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
