import nodemailer from 'nodemailer'
import { sendViaGmailAPI, getConnectionStatus } from './gmailService.js'

// ─── Nodemailer SMTP fallback transport ──────────────────────────
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465

let transporter = null
try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpSecure,
            pool: true,
            maxConnections: 10,
            maxMessages: 100,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        })
    }
} catch (err) {
    console.warn('[EmailService] SMTP not configured:', err.message)
}


// ═══════════════════════════════════════════════════════════════════
//  SEND EMAIL — Gmail API first, SMTP fallback
// ═══════════════════════════════════════════════════════════════════

export const sendEmail = async ({ to, subject, body, from, threadId }) => {
    const start = Date.now()

    // Append Telegram Bot link
    const telegramUsername = 'OutreachXbot' // Discovered from Telegram API query
    const telegramFooterText = `\n\n---\n💬 Ask me anything instantly! Chat with our AI assistant on Telegram: https://t.me/${telegramUsername}`
    const telegramFooterHtml = `<br><br><hr><p style="color: #666; font-size: 14px;">💬 Ask me anything instantly! <a href="https://t.me/${telegramUsername}" target="_blank">Chat with our AI assistant on Telegram</a></p>`

    const finalBody = body + telegramFooterText
    const finalHtml = `<div style="font-family: sans-serif">${body.replace(/\n/g, '<br>')}</div>` + telegramFooterHtml


    // ── Try Gmail API first ──
    try {
        const status = await getConnectionStatus()
        if (status.connected) {
            const result = await sendViaGmailAPI({ to, subject, body: finalBody, from, threadId })
            console.log(`[EmailService] Sent via Gmail API to ${to} (thread: ${result.threadId})`)
            return {
                success: true,
                latencyMs: Date.now() - start,
                method: 'gmail_api',
                threadId: result.threadId,
                messageId: result.messageId,
            }
        }
    } catch (err) {
        console.error(`[EmailService] Gmail API failed for ${to}:`, err.message)
        // Fall through to SMTP
    }

    // ── Fall back to SMTP ──
    if (!transporter) {
        return {
            success: false,
            error: 'No email transport available. Connect Gmail or configure SMTP.',
            latencyMs: Date.now() - start,
            method: 'none',
        }
    }

    try {
        await transporter.sendMail({
            from: from || process.env.EMAIL_FROM,
            to,
            subject,
            text: finalBody,
            html: finalHtml
        })
        console.log(`[EmailService] Sent via SMTP to ${to}`)
        return { success: true, latencyMs: Date.now() - start, method: 'smtp' }
    } catch (err) {
        return { success: false, error: err.message, latencyMs: Date.now() - start, method: 'smtp' }
    }
}
