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

const WORKFLOW_SYSTEM_PROMPT = `You are an expert workflow automation architect for a sales outreach platform. The user will describe a workflow in plain English. You must output a VALID JSON object (no markdown, no code fences, no explanation) with "nodes" and "edges" arrays.

AVAILABLE NODE TYPES (use ONLY these exact type strings):

TRIGGERS (inputs: 0, outputs: ["out"]) — Every workflow starts with exactly ONE trigger:
- trigger_new_lead: fires when a new lead is added
- trigger_manual: manually triggered by clicking RUN

OUTREACH (inputs: 1, outputs: ["out"]):
- send_email: send personalized email (uses the AI-generated message from ai_generate)
- send_telegram: send Telegram message
- linkedin_dm: send LinkedIn message

AI & SMART (inputs: 1, outputs: ["out"]):
- ai_generate: generate personalized email message using AI. Config: { "tone": "professional"|"casual"|"friendly", "prompt": "optional custom prompt" }

LOGIC & FLOW:
- delay: (inputs: 1, outputs: ["out"]) wait a duration. Config: { "delayType": "random", "min": 2, "max": 5, "unit": "days" }
- condition: (inputs: 1, outputs: ["yes","no"]) branch on a condition. Config: { "field": "email_opened", "operator": "equals", "value": "true" }
- wait_event: (inputs: 1, outputs: ["success","timeout"]) pause until event or timeout. Config: { "event": "email_opened", "timeoutValue": 3, "timeoutUnit": "days" }

DATA & CRM (inputs: 1, outputs: ["out"]):
- add_tag: tag the lead. Config: { "tag": "contacted" }
- update_crm: update CRM. Config: { "crm": "hubspot", "action": "update_stage", "value": "contacted" }

SAFETY:
- throttle: (inputs: 1, outputs: ["out"]) rate limit outreach. Config: { "maxPerHour": 10, "maxPerDay": 25 }
- end: (inputs: 1, outputs: []) terminate a branch. Config: { "status": "completed" }

CRITICAL RULES:
1. Every workflow MUST start with exactly ONE trigger node (trigger_new_lead or trigger_manual).
2. EVERY branch MUST end with an "end" node. If there is a condition with yes/no, BOTH paths must eventually reach an "end" node.
3. ALWAYS place "ai_generate" (AI Write) BEFORE "send_email". The ai_generate node generates the email body that send_email uses. Never use send_email without ai_generate before it.
4. ALWAYS place "throttle" before send_email to enforce rate limiting.
5. Every edge must have a "sourceHandle" matching the source node's output port ("out", "yes", "no", "success", "timeout").
6. Node IDs must be unique: "n1", "n2", "n3", etc.
7. Output ONLY valid JSON. No markdown, no explanation, no code fences.

CORRECT WORKFLOW PATTERN EXAMPLE:
For "Send an email, if they open it tag them, else follow up after 3 days":
{
  "nodes": [
    { "id": "n1", "nodeType": "trigger_new_lead", "label": "New Lead", "config": {} },
    { "id": "n2", "nodeType": "ai_generate", "label": "AI Write", "config": { "tone": "professional" } },
    { "id": "n3", "nodeType": "throttle", "label": "Throttle", "config": { "maxPerHour": 10, "maxPerDay": 25 } },
    { "id": "n4", "nodeType": "send_email", "label": "Send Email", "config": {} },
    { "id": "n5", "nodeType": "wait_event", "label": "Wait: Opened?", "config": { "event": "email_opened", "timeoutValue": 3, "timeoutUnit": "days" } },
    { "id": "n6", "nodeType": "add_tag", "label": "Tag: Engaged", "config": { "tag": "engaged" } },
    { "id": "n7", "nodeType": "ai_generate", "label": "AI Follow-up", "config": { "tone": "friendly", "prompt": "Write a friendly follow-up email" } },
    { "id": "n8", "nodeType": "send_email", "label": "Follow-up Email", "config": {} },
    { "id": "n9", "nodeType": "end", "label": "End", "config": { "status": "completed" } },
    { "id": "n10", "nodeType": "end", "label": "End", "config": { "status": "completed" } }
  ],
  "edges": [
    { "source": "n1", "target": "n2", "sourceHandle": "out" },
    { "source": "n2", "target": "n3", "sourceHandle": "out" },
    { "source": "n3", "target": "n4", "sourceHandle": "out" },
    { "source": "n4", "target": "n5", "sourceHandle": "out" },
    { "source": "n5", "target": "n6", "sourceHandle": "success" },
    { "source": "n5", "target": "n7", "sourceHandle": "timeout" },
    { "source": "n6", "target": "n9", "sourceHandle": "out" },
    { "source": "n7", "target": "n8", "sourceHandle": "out" },
    { "source": "n8", "target": "n10", "sourceHandle": "out" }
  ]
}`

export const generateWorkflowGraph = async (userPrompt) => {
    const response = await getClient().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: WORKFLOW_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
    })

    const raw = response.choices[0]?.message?.content?.trim() || '{}'

    // Strip markdown fences if the LLM wraps it
    let cleaned = raw
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Build adjacency map for smarter layout
    const nodeList = parsed.nodes || []
    const edgeList = parsed.edges || []

    // Calculate depth (distance from trigger) for each node for better layout
    const depthMap = {}
    const childrenMap = {}
    for (const e of edgeList) {
        if (!childrenMap[e.source]) childrenMap[e.source] = []
        childrenMap[e.source].push({ target: e.target, handle: e.sourceHandle })
    }
    // BFS from trigger
    const trigger = nodeList[0]
    if (trigger) {
        depthMap[trigger.id] = 0
        const queue = [trigger.id]
        while (queue.length > 0) {
            const current = queue.shift()
            const children = childrenMap[current] || []
            children.forEach((child, idx) => {
                if (!(child.target in depthMap)) {
                    depthMap[child.target] = depthMap[current] + 1
                    queue.push(child.target)
                }
            })
        }
    }

    // Count nodes at each depth for vertical spacing
    const depthCount = {}
    const depthIndex = {}
    for (const n of nodeList) {
        const d = depthMap[n.id] ?? 0
        if (!depthCount[d]) depthCount[d] = 0
        depthIndex[n.id] = depthCount[d]
        depthCount[d]++
    }

    // Transform into React Flow format with tree-like layout
    const nodes = nodeList.map((n) => {
        const depth = depthMap[n.id] ?? 0
        const idxAtDepth = depthIndex[n.id] ?? 0
        const totalAtDepth = depthCount[depth] ?? 1
        const yCenter = 250
        const ySpacing = 180
        const yOffset = (idxAtDepth - (totalAtDepth - 1) / 2) * ySpacing

        return {
            id: n.id,
            type: 'workflowNode',
            position: { x: 80 + depth * 320, y: yCenter + yOffset },
            data: {
                nodeType: n.nodeType,
                label: n.label || n.nodeType,
                enabled: true,
                config: n.config || {},
            },
        }
    })

    const edges = edgeList.map((e, i) => ({
        id: `e_${i}_${Date.now().toString(36)}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || 'out',
        type: 'workflowEdge',
    }))

    return { nodes, edges }
}

