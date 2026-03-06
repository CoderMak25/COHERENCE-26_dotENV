import { google } from 'googleapis'
import GmailToken from '../models/GmailToken.js'

// ─── OAuth2 client singleton ─────────────────────────────────────
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    )
}

// ─── Scopes we need ──────────────────────────────────────────────
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
]

// ═══════════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate the Google OAuth consent URL
 */
export function getAuthUrl() {
    const client = getOAuth2Client()
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // Force consent to always get refresh_token
        scope: SCOPES,
    })
}

/**
 * Exchange authorization code for tokens, save to DB
 */
export async function handleCallback(code) {
    const client = getOAuth2Client()
    const { tokens } = await client.getToken(code)

    client.setCredentials(tokens)

    // Get the user's email address
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()
    const email = data.email

    // Calculate expiry
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000)

    // Upsert token in DB
    await GmailToken.findOneAndUpdate(
        { email },
        {
            email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
            scope: tokens.scope || SCOPES.join(' '),
            connected: true,
        },
        { upsert: true, new: true }
    )

    return { email, expiresAt }
}

/**
 * Get a fresh OAuth2 client with valid tokens from DB.
 * Auto-refreshes if expired.
 */
export async function getAuthedClient() {
    // Get the first connected token (single-user app)
    const tokenDoc = await GmailToken.findOne({ connected: true })
    if (!tokenDoc) return null

    const client = getOAuth2Client()
    client.setCredentials({
        access_token: tokenDoc.accessToken,
        refresh_token: tokenDoc.refreshToken,
        expiry_date: tokenDoc.expiresAt.getTime(),
    })

    // Auto-refresh if expired
    if (tokenDoc.expiresAt <= new Date()) {
        try {
            const { credentials } = await client.refreshAccessToken()
            tokenDoc.accessToken = credentials.access_token
            tokenDoc.expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
            if (credentials.refresh_token) {
                tokenDoc.refreshToken = credentials.refresh_token
            }
            await tokenDoc.save()
            client.setCredentials(credentials)
        } catch (err) {
            console.error('[Gmail] Token refresh failed:', err.message)
            tokenDoc.connected = false
            await tokenDoc.save()
            return null
        }
    }

    return { client, email: tokenDoc.email }
}

/**
 * Get connection status
 */
export async function getConnectionStatus() {
    const tokenDoc = await GmailToken.findOne({ connected: true })
    if (!tokenDoc) return { connected: false }
    return {
        connected: true,
        email: tokenDoc.email,
        expiresAt: tokenDoc.expiresAt,
        needsRefresh: tokenDoc.expiresAt <= new Date(),
    }
}

/**
 * Disconnect Gmail (remove tokens)
 */
export async function disconnectGmail() {
    await GmailToken.updateMany({}, { connected: false })
    return { success: true }
}


// ═══════════════════════════════════════════════════════════════════
//  GMAIL API — SEND EMAIL
// ═══════════════════════════════════════════════════════════════════

/**
 * Send an email via Gmail API. Returns { threadId, messageId, labelIds }.
 */
export async function sendViaGmailAPI({ to, subject, body, from }) {
    const authed = await getAuthedClient()
    if (!authed) throw new Error('Gmail not connected. Please connect Gmail in settings.')

    const { client, email: senderEmail } = authed
    const gmail = google.gmail({ version: 'v1', auth: client })

    const fromAddr = from || senderEmail

    // Build raw MIME message
    const messageParts = [
        `From: ${fromAddr}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        '',
        `<div style="font-family: sans-serif">${body.replace(/\n/g, '<br>')}</div>`,
    ]
    const rawMessage = messageParts.join('\r\n')

    // Base64url encode
    const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
    })

    return {
        messageId: res.data.id,
        threadId: res.data.threadId,
        labelIds: res.data.labelIds,
    }
}


// ═══════════════════════════════════════════════════════════════════
//  GMAIL API — READ REPLIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all messages in a thread (for checking replies).
 */
export async function getThreadMessages(threadId) {
    const authed = await getAuthedClient()
    if (!authed) return []

    const { client } = authed
    const gmail = google.gmail({ version: 'v1', auth: client })

    try {
        const res = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        })

        return (res.data.messages || []).map(msg => {
            const headers = msg.payload?.headers || []
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
            return {
                id: msg.id,
                threadId: msg.threadId,
                from: getHeader('From'),
                to: getHeader('To'),
                subject: getHeader('Subject'),
                date: getHeader('Date'),
                labelIds: msg.labelIds || [],
                snippet: msg.snippet || '',
            }
        })
    } catch (err) {
        console.error(`[Gmail] Error fetching thread ${threadId}:`, err.message)
        return []
    }
}

/**
 * Poll Gmail for new INBOX messages since a given timestamp.
 * Returns an array of { messageId, threadId, from, to, subject, snippet, date }.
 */
export async function pollNewReplies(sinceMs) {
    const authed = await getAuthedClient()
    if (!authed) return []

    const { client, email: myEmail } = authed
    const gmail = google.gmail({ version: 'v1', auth: client })

    // Gmail search query: messages received after timestamp, in inbox, not sent by us
    const afterSec = Math.floor(sinceMs / 1000)
    const query = `in:inbox after:${afterSec} -from:${myEmail}`

    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 50,
        })

        const messages = res.data.messages || []
        const results = []

        for (const msg of messages) {
            const full = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['From', 'To', 'Subject', 'Date'],
            })

            const headers = full.data.payload?.headers || []
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

            results.push({
                messageId: full.data.id,
                threadId: full.data.threadId,
                from: getHeader('From'),
                to: getHeader('To'),
                subject: getHeader('Subject'),
                date: getHeader('Date'),
                snippet: full.data.snippet || '',
            })
        }

        return results
    } catch (err) {
        console.error('[Gmail] Error polling replies:', err.message)
        return []
    }
}
