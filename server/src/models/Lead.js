import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    company: { type: String, trim: true },
    position: { type: String, trim: true },
    tags: [{ type: String }],
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Opened', 'Replied', 'Converted', 'Unsubscribed'],
        default: 'New'
    },
    workflow: { type: String, default: null },
    lastAction: { type: String, default: null },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    currentStep: { type: Number, default: 0 },
    lastContact: { type: Date },
    metadata: { type: Map, of: String },
}, { timestamps: true })
leadSchema.index({ status: 1 })
leadSchema.index({ company: 1 })

export default mongoose.model('Lead', leadSchema)
