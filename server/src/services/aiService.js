import Groq from 'groq-sdk'

let client = null
const getClient = () => {
    if (!client) {
        client = new Groq({ apiKey: process.env.GROQ_API_KEY })
    }
    return client
}

const MODEL = 'llama-3.1-8b-instant'

// ── Helper: call Groq chat completions ──
const chatComplete = async (systemPrompt, userPrompt) => {
    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
    })
    return response.choices[0]?.message?.content?.trim() || ''
}


// ── Existing: generate message for workflow nodes ──
export const generateMessage = async (lead, nodeType = 'email') => {
    const systemPrompt = 'You are an expert B2B sales copywriter. Respond ONLY with valid JSON, no markdown, no code fences.'

    const userPrompt = `
Write a highly personalized cold outreach ${nodeType} for this lead:
  Name: ${lead.name}
  Title: ${lead.position}
  Company: ${lead.company}
  Tags: ${(lead.tags || []).join(', ')}

Rules:
- Subject line: under 8 words, curiosity-driven
- Body: 3-4 sentences max, conversational tone
- Reference their company or role specifically
- Sound like a human, not a template
- End with ONE low-friction CTA question
- No generic phrases like "I hope this finds you well"

Respond ONLY with valid JSON:
{"subject": "...", "body": "...", "personalizationScore": 0-100}
`

    const text = await chatComplete(systemPrompt, userPrompt)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
}


// ── Outreach Engine: step-based message generation ──

const OUTREACH_PROMPTS = {

    initial_outreach: (data) => `
You are writing a short professional cold outreach message.

Lead Information:
Name: ${data.name}
Company: ${data.company || ''}
Role: ${data.position || ''}
Industry: ${data.industry || ''}

Context:
We are introducing our AI-powered outreach automation platform that helps
teams automate communication and manage leads efficiently.

Instructions:
- Personalize the message using the available lead information.
- If any information like company, role, or industry is missing, do NOT mention or guess it.
- Keep the tone friendly, professional, and conversational.
- Keep the message under 80 words.
- End with a simple call-to-action asking for a short conversation or demo.
- Do not sound salesy or pushy.
- Output only the email body. No subject line. No sign-off placeholder.
`,

    follow_up: (data) => `
Write a polite follow-up outreach message.

Lead Information:
Name: ${data.name}
Company: ${data.company || ''}
Role: ${data.position || ''}

Context:
We previously sent an introduction about our AI-powered outreach automation platform.

Instructions:
- Gently remind the lead about the previous message.
- Be polite and respectful of their time.
- Keep the message under 50 words.
- If company or role information is missing, do not reference it.
- End with a simple question asking if they are open to a short discussion.
- Output only the message body. No subject line.
`,

    final_reminder: (data) => `
Write a final short outreach message.

Lead Information:
Name: ${data.name}

Context:
We have previously sent two outreach messages about our automation platform.

Instructions:
- Acknowledge that this will be the final follow-up.
- Keep the message friendly and respectful.
- Keep the message under 40 words.
- Do not sound pushy or desperate.
- Leave the door open for future conversation.
- Output only the message body. No subject line.
`,

    reply_response: (data) => `
You are a sales assistant replying professionally to a lead's message.

Lead Name: ${data.name}
${data.company ? `Company: ${data.company}` : ''}
${data.position ? `Role: ${data.position}` : ''}

${data.conversationHistory ? `--- PAST CONVERSATION ---
${data.conversationHistory}
--- END CONVERSATION ---

` : ''}Lead's latest message: "${data.leadReply}"

Instructions:
- Write a short, friendly, natural response to their latest message.
- Reference the past conversation context if available — don't repeat yourself.
- Goal: keep the conversation going, offer value, and move towards a call or demo.
- Keep under 60 words.
- Tone: natural and human, not robotic or salesy.
- Do not use filler phrases like "Great question!" or "Absolutely!".
- If they asked a specific question, answer it directly.
- Output only the reply body. No subject line. No sign-off placeholder.
`
}


export const generateOutreachMessage = async (step, leadData) => {
    const promptFn = OUTREACH_PROMPTS[step]
    if (!promptFn) {
        throw new Error(`Unknown outreach step: ${step}`)
    }

    const userPrompt = promptFn(leadData)
    const systemPrompt = 'You are a professional sales outreach assistant. Write concise, personalized messages. Output only the message body, nothing else.'

    return await chatComplete(systemPrompt, userPrompt)
}


// ── Custom prompt message generation (used by AI Write node) ──
export const generateCustomPromptMessage = async (customPrompt, leadData, tone = 'professional', maxTokens = 512) => {
    // Replace template variables in the user's prompt
    const filledPrompt = customPrompt
        .replace(/\{\{first_name\}\}/g, (leadData.name || 'there').split(' ')[0])
        .replace(/\{\{name\}\}/g, leadData.name || 'there')
        .replace(/\{\{company\}\}/g, leadData.company || '')
        .replace(/\{\{role\}\}/g, leadData.position || '')
        .replace(/\{\{position\}\}/g, leadData.position || '')
        .replace(/\{\{industry\}\}/g, leadData.industry || '')
        .replace(/\{\{pain_point\}\}/g, leadData.painPoint || 'improving efficiency')
        .replace(/\{\{sender_name\}\}/g, leadData.senderName || 'our team')

    const systemPrompt = `You are a professional sales outreach assistant. Tone: ${tone}. Write concise, personalized messages. Output only the message body, nothing else.`

    const userPrompt = `
${filledPrompt}

Lead Information:
Name: ${leadData.name || 'there'}
${leadData.company ? `Company: ${leadData.company}` : ''}
${leadData.position ? `Role: ${leadData.position}` : ''}
${leadData.industry ? `Industry: ${leadData.industry}` : ''}

Rules:
- Keep the message under 100 words.
- Personalize using the lead info above. If info is missing, skip it naturally.
- Output ONLY the message body. No subject line. No sign-off placeholder.
`

    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
    })
    return response.choices[0]?.message?.content?.trim() || ''
}


// ═══════════════════════════════════════════════════════════════════
//  AI Workflow Graph Generator — text prompt → React Flow JSON
// ═══════════════════════════════════════════════════════════════════

const WORKFLOW_SYSTEM_PROMPT = `You are an expert workflow automation architect. The user will describe a workflow in plain English. You must output a VALID JSON object (no markdown, no code fences, no explanation) representing a React Flow graph with "nodes" and "edges" arrays.

AVAILABLE NODE TYPES (use ONLY these exact type strings):
TRIGGERS (inputs: 0, outputs: ["out"]):
- trigger_new_lead: "New Lead" — fires when a lead is added
- trigger_form_submit: "Form Submit" — fires on form submission
- trigger_scheduled: "Scheduled" — cron trigger
- trigger_webhook: "Webhook" — HTTP POST trigger
- trigger_manual: "Manual Run" — manually triggered

OUTREACH (inputs: 1, outputs: ["out"]):
- send_email: "Send Email" — send personalized email
- send_telegram: "Telegram" — send Telegram message
- linkedin_dm: "LinkedIn DM" — send LinkedIn message
- send_sms: "Send SMS" — send SMS
- whatsapp: "WhatsApp" — send WhatsApp message
- phone_call: "Phone Call" — log or trigger call
- slack_alert: "Slack Alert" — internal Slack notification

AI & SMART (inputs: 1, outputs: ["out"]):
- ai_generate: "AI Write" — generate message with LLM
- ai_score: "AI Lead Score" — score lead 0-100
- ai_classify: "AI Classify" — classify intent/sentiment
- ai_enrich: "AI Enrich" — enrich lead data

LOGIC & FLOW:
- delay: (inputs: 1, outputs: ["out"]) "Delay" — wait a duration
- condition: (inputs: 1, outputs: ["yes","no"]) "If / Else" — branch on condition
- ab_split: (inputs: 1, outputs: ["a","b"]) "A/B Split" — split traffic
- loop: (inputs: 1, outputs: ["next","done"]) "Loop"
- merge: (inputs: 1, outputs: ["out"]) "Merge" — merge branches
- wait_event: (inputs: 1, outputs: ["success","timeout"]) "Wait For Event"

DATA & CRM (inputs: 1, outputs: ["out"]):
- update_crm: "Update CRM"
- add_tag: "Add Tag"
- remove_tag: "Remove Tag"
- set_field: "Set Field"
- http_request: "HTTP Request"

SAFETY:
- throttle: (inputs: 1, outputs: ["out"]) "Throttle" — rate limit
- unsubscribe_check: (inputs: 1, outputs: ["safe","unsub"]) "Unsub Check"
- end: (inputs: 1, outputs: []) "End" — end branch

OUTPUT FORMAT (strict JSON, no other text):
{
  "nodes": [
    { "id": "n1", "nodeType": "<type>", "label": "<display name>", "config": {} }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "sourceHandle": "<output port id>" }
  ]
}

RULES:
1. Every workflow MUST start with exactly one trigger node.
2. Every edge must have a valid "sourceHandle" matching the source node's output port id (e.g. "out", "yes", "no", "success", "timeout", "a", "b", "safe", "unsub").
3. Node IDs must be unique strings like "n1", "n2", etc.
4. Keep config objects minimal but logical (e.g. for delay, set min/max/unit).
5. Output ONLY the JSON object. No markdown, no explanation, no code fences.`

export const generateWorkflowGraph = async (userPrompt) => {
    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
    })

    const raw = response.choices[0]?.message?.content?.trim() || '{}'

    // Strip markdown fences if the LLM wraps it
    let cleaned = raw
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Transform into React Flow format with auto-layout (horizontal, left-to-right)
    const nodes = (parsed.nodes || []).map((n, i) => ({
        id: n.id,
        type: 'workflowNode',
        position: { x: 100 + i * 300, y: 150 + (i % 2 === 0 ? 0 : 60) },
        data: {
            nodeType: n.nodeType,
            label: n.label || n.nodeType,
            enabled: true,
            config: n.config || {},
        },
    }))

    const edges = (parsed.edges || []).map((e, i) => ({
        id: `e_${i}_${Date.now().toString(36)}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || 'out',
        type: 'workflowEdge',
    }))

    return { nodes, edges }
}
