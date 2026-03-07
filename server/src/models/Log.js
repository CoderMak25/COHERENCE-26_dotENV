import mongoose from 'mongoose'

const logSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    leadName: String,
    action: String,
    status: {
        type: String,
        enum: ['SENT', 'FAILED', 'PENDING', 'SKIPPED', 'OK', 'RETRYING', 'BOUNCED', 'RECEIVED', 'COMPLETED', 'LOGGED', 'BLOCKED', 'SUCCESS']
    },
    detail: String,
    latencyMs: Number,

    // Outreach-specific fields
    step: {
        type: String,
        enum: [
            'initial_outreach', 'follow_up', 'final_reminder',
            'ai_reply_1', 'ai_reply_2', 'ai_reply_3',
            'reply_received', 'manual_reply',
            'voice_greeting', 'voice_analysis',
            null
        ],
        default: null
    },
    channel: { type: String, enum: ['email', 'linkedin', 'voice', 'sms', 'whatsapp', 'phone', 'slack', 'crm', 'api', 'ai', 'system', 'form', 'telegram', null], default: null },
    direction: { type: String, enum: ['sent', 'received', null], default: null },
    subject: { type: String, default: null },
    body: { type: String, default: null },
    errorMsg: { type: String, default: null },
}, { timestamps: true })

logSchema.index({ status: 1 })
logSchema.index({ createdAt: -1 })
logSchema.index({ leadId: 1, direction: 1 })
logSchema.index({ leadId: 1, step: 1 })

export default mongoose.model('Log', logSchema)
