import mongoose from 'mongoose'

const campaignSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: {
        type: String,
        enum: ['Draft', 'Active', 'Paused', 'Completed'],
        default: 'Draft'
    },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    leadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    stats: {
        sent: { type: Number, default: 0 },
        opened: { type: Number, default: 0 },
        replied: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }
    },
    throttle: { type: Number, default: 10 },
    dailySendCap: { type: Number, default: 500 },
}, { timestamps: true })

export default mongoose.model('Campaign', campaignSchema)
