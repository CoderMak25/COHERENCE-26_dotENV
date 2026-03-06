import mongoose from 'mongoose'

const gmailTokenSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: { type: String, default: '' },
    connected: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.model('GmailToken', gmailTokenSchema)
