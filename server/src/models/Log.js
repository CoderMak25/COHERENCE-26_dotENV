import mongoose from 'mongoose'

const logSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    leadName: String,
    action: String,
    status: {
        type: String,
        enum: ['SENT', 'FAILED', 'PENDING', 'SKIPPED', 'OK', 'RETRYING']
    },
    detail: String,
    latencyMs: Number,
}, { timestamps: true })

logSchema.index({ status: 1 })
logSchema.index({ createdAt: -1 })

export default mongoose.model('Log', logSchema)
