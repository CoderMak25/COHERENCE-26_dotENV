import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
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
