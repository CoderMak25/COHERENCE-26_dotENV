/**
 * Sarvam AI API Client
 *
 * Wraps the Sarvam REST endpoints for Speech-to-Text and Text-to-Speech.
 * All API communication is server-side only — keys are never exposed to the frontend.
 */

const SARVAM_BASE = 'https://api.sarvam.ai'

function getApiKey() {
    const key = process.env.SARVAM_API_KEY
    if (!key) {
        console.warn('[ServamClient] SARVAM_API_KEY not set — voice features will use fallback text mode')
    }
    return key || ''
}

/**
 * Convert audio buffer to text using Sarvam STT API.
 * @param {Buffer} audioBuffer - Raw audio data (wav/webm/mp3)
 * @param {string} languageCode - BCP-47 language code, e.g. 'en-IN', 'hi-IN'
 * @returns {Promise<{text: string, language: string}>}
 */
export async function speechToText(audioBuffer, languageCode = 'en-IN') {
    const apiKey = getApiKey()

    // Fallback if no API key
    if (!apiKey) {
        return { text: '[STT unavailable — no API key]', language: languageCode }
    }

    try {
        // Build multipart form data manually for Node.js fetch
        const blob = new Blob([audioBuffer], { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'audio.webm')
        formData.append('language_code', languageCode)
        formData.append('model', 'saarika:v2.5') // Updated from v2

        const response = await fetch(`${SARVAM_BASE}/speech-to-text`, {
            method: 'POST',
            headers: {
                'api-subscription-key': apiKey
            },
            body: formData
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('[ServamClient] STT error:', response.status, errText)
            return { text: '', language: languageCode }
        }

        const data = await response.json()
        return {
            text: data.transcript || '',
            language: data.language_code || languageCode
        }
    } catch (err) {
        console.error('[ServamClient] STT fetch error:', err.message)
        return { text: '', language: languageCode }
    }
}

/**
 * Convert text to speech using Sarvam TTS API.
 * @param {string} text - Text to convert to speech
 * @param {string} languageCode - BCP-47 language code
 * @returns {Promise<{audioBase64: string}>}
 */
export async function textToSpeech(text, languageCode = 'en-IN') {
    const apiKey = getApiKey()

    // Fallback if no API key
    if (!apiKey) {
        return { audioBase64: '' }
    }

    try {
        const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
            method: 'POST',
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: [text],
                target_language_code: languageCode,
                model: 'bulbul:v3'
            })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('[ServamClient] TTS error:', response.status, errText)
            return { audioBase64: '' }
        }

        const data = await response.json()
        return {
            audioBase64: (data.audios && data.audios[0]) || ''
        }
    } catch (err) {
        console.error('[ServamClient] TTS fetch error:', err.message)
        return { audioBase64: '' }
    }
}
