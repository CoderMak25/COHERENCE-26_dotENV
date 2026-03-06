import express from 'express'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USERS_JSON = path.resolve(__dirname, '..', '..', '..', 'telegram_bot', 'users.json')

// Read registered users from the JSON bridge file
function getRegisteredUsers() {
    try {
        if (!existsSync(USERS_JSON)) return []
        const data = readFileSync(USERS_JSON, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}

function findChatId(username) {
    const clean = (username || '').toLowerCase().trim().replace(/^@/, '')
    if (!clean) return null
    const users = getRegisteredUsers()
    const user = users.find(u => u.username === clean)
    return user ? user.chat_id : null
}

// GET /api/telegram/users — list all registered Telegram users
router.get('/users', (req, res) => {
    const users = getRegisteredUsers()
    res.json({
        registeredUsers: users,
        count: users.length,
        note: 'Users must message @OutreachXbot first to appear here',
        botLink: 'https://t.me/OutreachXbot',
    })
})

// POST /api/telegram/test-send — quick test: { username, message }
router.post('/test-send', async (req, res) => {
    if (!BOT_TOKEN) {
        return res.status(400).json({ status: 'failed', error: 'TELEGRAM_BOT_TOKEN not set in .env' })
    }

    const username = (req.body.username || '').toLowerCase().trim().replace(/^@/, '')
    const message = req.body.message || '👋 Test message from OutreachEngine!'

    let chatId = null
    if (username) {
        chatId = findChatId(username)
    } else {
        // No username — send to first registered user
        const users = getRegisteredUsers()
        if (users.length > 0) chatId = users[0].chat_id
    }

    if (!chatId) {
        return res.json({
            status: 'failed',
            error: `@${username || '(none)'} not found. They must message @OutreachXbot first.`,
            username,
        })
    }

    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        })
        const data = await tgRes.json()

        if (data.ok) {
            res.json({ status: 'sent', messageId: data.result.message_id, username })
        } else {
            res.json({ status: 'failed', error: data.description || 'Unknown error', username })
        }
    } catch (err) {
        res.json({ status: 'failed', error: err.message, username })
    }
})

export default router
