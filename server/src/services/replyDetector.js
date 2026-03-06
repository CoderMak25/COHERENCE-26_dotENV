import Imap from 'imap'

const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

/**
 * Check Gmail inbox for a reply from a specific lead email on a specific thread.
 * Returns { replied: boolean, replyText: string | null }
 */
export const checkForReply = (leadEmail, threadSubject) => {
    return new Promise((resolve) => {
        if (!SMTP_USER || !SMTP_PASS) {
            resolve({ replied: false, replyText: null, error: 'Missing SMTP credentials' })
            return
        }

        const imap = new Imap({
            user: SMTP_USER,
            password: SMTP_PASS,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 10000,
            authTimeout: 10000,
        })

        const cleanSubject = (threadSubject || '')
            .replace(/^(Re:\s*)+/i, '')
            .trim()
            .toLowerCase()

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err) => {
                if (err) {
                    imap.end()
                    resolve({ replied: false, replyText: null, error: err.message })
                    return
                }

                const searchCriteria = [['FROM', leadEmail]]
                imap.search(searchCriteria, (err, results) => {
                    if (err || !results || results.length === 0) {
                        imap.end()
                        resolve({ replied: false, replyText: null })
                        return
                    }

                    // Fetch the most recent messages (last 10)
                    const recent = results.slice(-10)
                    const f = imap.fetch(recent, { bodies: ['HEADER.FIELDS (SUBJECT)', 'TEXT'], struct: true })

                    let found = false
                    let replyText = null

                    f.on('message', (msg) => {
                        let subject = ''
                        let body = ''

                        msg.on('body', (stream, info) => {
                            let buffer = ''
                            stream.on('data', (chunk) => { buffer += chunk.toString('utf8') })
                            stream.on('end', () => {
                                if (info.which.includes('HEADER')) {
                                    const match = buffer.match(/Subject:\s*(.+)/i)
                                    if (match) subject = match[1].trim()
                                } else {
                                    body = buffer.trim()
                                }
                            })
                        })

                        msg.once('end', () => {
                            const subjectLower = subject.toLowerCase()
                            if (
                                subjectLower.includes('re:') ||
                                subjectLower.includes(cleanSubject) ||
                                subjectLower.includes(leadEmail.split('@')[0].toLowerCase())
                            ) {
                                if (!found && body) {
                                    found = true
                                    // Extract plain text, strip quoted content
                                    replyText = body
                                        .split(/\n\s*On .+ wrote:/)[0]  // Remove "On ... wrote:" quoted block
                                        .split(/\n\s*>/).slice(0, 1).join('')  // Remove > quoted lines
                                        .replace(/<[^>]+>/g, '')  // Strip HTML tags
                                        .replace(/&nbsp;/g, ' ')
                                        .trim()
                                        .slice(0, 2000)  // Cap at 2000 chars
                                }
                            }
                        })
                    })

                    f.once('end', () => {
                        imap.end()
                        resolve({ replied: found, replyText: found ? replyText : null })
                    })

                    f.once('error', (err) => {
                        imap.end()
                        resolve({ replied: false, replyText: null, error: err.message })
                    })
                })
            })
        })

        imap.once('error', (err) => {
            resolve({ replied: false, replyText: null, error: err.message })
        })

        imap.connect()
    })
}
