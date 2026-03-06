import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

Respond ONLY with valid JSON, no markdown:
{"subject": "...", "body": "...", "personalizationScore": 0-100}
`
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7
    })

    return JSON.parse(response.choices[0].message.content)
}
