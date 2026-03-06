import nodemailer from 'nodemailer'

const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465

const transporter = nodemailer.createTransport({
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

export const sendEmail = async ({ to, subject, body, from }) => {
    const start = Date.now()
    try {
        await transporter.sendMail({
            from: from || process.env.EMAIL_FROM,
            to,
            subject,
            text: body,
            html: `<div style="font-family: sans-serif">${body.replace(/\n/g, '<br>')}</div>`
        })
        return { success: true, latencyMs: Date.now() - start }
    } catch (err) {
        return { success: false, error: err.message, latencyMs: Date.now() - start }
    }
}
