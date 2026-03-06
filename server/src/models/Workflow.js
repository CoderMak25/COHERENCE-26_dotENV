import mongoose from 'mongoose'

const nodeSchema = new mongoose.Schema({
    id: String,
    type: { type: String, enum: ['email', 'wait', 'condition', 'linkedin', 'branch', 'stop'] },
    position: { x: Number, y: Number },
    config: {
        subject: String,
        body: String,
        delayDays: Number,
        randomize: Boolean,
        randomizePct: { type: Number, default: 20 },
        condition: String,
        conditionVal: String
    }
}, { _id: false })

const edgeSchema = new mongoose.Schema({
    source: String,
    target: String,
    label: String
}, { _id: false })

const workflowSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, enum: ['Draft', 'Active'], default: 'Draft' },
    nodes: [nodeSchema],
    edges: [edgeSchema],
}, { timestamps: true })

export default mongoose.model('Workflow', workflowSchema)
