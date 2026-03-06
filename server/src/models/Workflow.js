import mongoose from 'mongoose'

const nodeSchema = new mongoose.Schema({
    id: String,
    type: { type: String },
    position: { x: Number, y: Number },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    label: String,
    enabled: { type: Boolean, default: true },
    note: String,
}, { _id: false })

const edgeSchema = new mongoose.Schema({
    id: String,
    source: String,
    target: String,
    sourceHandle: String,
    targetHandle: String,
    label: String,
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const workflowSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { type: String, enum: ['Draft', 'Active'], default: 'Draft' },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    assignedLeads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
}, { timestamps: true })

export default mongoose.model('Workflow', workflowSchema)
