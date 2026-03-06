import { GoogleGenAI } from '@google/genai'

let ai = null
const getClient = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    }
    return ai
}

export const generateMessage = async (lead, nodeType = 'email') => {
    const prompt = `
You are an expert B2B sales copywriter.
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

Respond ONLY with valid JSON, no markdown, no code fences:
{"subject": "...", "body": "...", "personalizationScore": 0-100}
`

    const response = await getClient().models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
    })

    const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(text)
}
