import { getAuthUrl, handleCallback, getConnectionStatus, disconnectGmail } from '../services/gmailService.js'

// GET /api/auth/google — redirect to Google OAuth consent screen
export const startGoogleAuth = (req, res) => {
    const url = getAuthUrl()
    res.redirect(url)
}

// GET /api/auth/google/callback — handle OAuth callback
export const googleCallback = async (req, res) => {
    const { code } = req.query
    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' })
    }

    try {
        const result = await handleCallback(code)
        // Redirect back to the frontend settings page with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        res.redirect(`${frontendUrl}/app/settings?gmail=connected&email=${encodeURIComponent(result.email)}`)
    } catch (err) {
        console.error('[Auth] Google callback error:', err)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        res.redirect(`${frontendUrl}/app/settings?gmail=error&message=${encodeURIComponent(err.message)}`)
    }
}

// GET /api/auth/gmail/status — check connection status
export const gmailStatus = async (req, res) => {
    try {
        const status = await getConnectionStatus()
        res.json(status)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// POST /api/auth/gmail/disconnect — remove Gmail connection
export const gmailDisconnect = async (req, res) => {
    try {
        await disconnectGmail()
        res.json({ success: true, message: 'Gmail disconnected' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
