import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    speaker: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false })

const conversationSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: null },
    messages: [messageSchema],
    analysis: {
        summary: { type: String },
        interestLevel: { type: String, enum: ['high', 'medium', 'low', 'none'], default: 'none' },
        questions: [String],
        sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
        nextAction: { type: String, default: null }
    }
}, { timestamps: true })

export default mongoose.model('Conversation', conversationSchema)
