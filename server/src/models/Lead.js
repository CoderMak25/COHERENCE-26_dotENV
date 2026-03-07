import mongoose from 'mongoose'

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    linkedinUrl: { type: String, trim: true },
    company: { type: String, trim: true },
    position: { type: String, trim: true },
    industry: { type: String, trim: true },
    tags: [{ type: String }],

    // Channel routing — set automatically on workflow run
    // Values: email | linkedin | both | none
    channel: { type: String, enum: ['email', 'linkedin', 'both', 'none'], default: null },

    // Contact validation
    contactStatus: {
        type: String,
        enum: ['valid', 'invalid_no_contact', 'email_bounced', 'linkedin_failed'],
        default: 'valid'
    },

    // Workflow status
    status: {
        type: String,
        enum: [
            'New', 'Contacted', 'Opened', 'Replied', 'Converted', 'Unsubscribed',
            // Outreach engine statuses
            'new', 'contacted', 'follow_up_sent', 'final_reminder_sent',
            'replied', 'needs_human', 'manual_conversation',
            'completed', 'paused', 'invalid_no_contact',
            'email_bounced', 'linkedin_failed'
        ],
        default: 'New'
    },
    workflow: { type: String, default: null },
    lastAction: { type: String, default: null },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' },
    currentStep: { type: Number, default: 0 },

    // AI reply tracking — max 3 AI replies then → needs_human
    aiReplyCount: { type: Number, default: 0 },

    // Gmail thread tracking for reply detection
    gmailThreadSubject: { type: String, default: null },
    gmailThreadId: { type: String, default: null },

    // Human takeover flag
    humanTakeover: { type: Boolean, default: false },
    takenOverAt: { type: Date, default: null },

    // Outreach timestamps
    lastContactedAt: { type: Date, default: null },
    lastRepliedAt: { type: Date, default: null },
    lastContact: { type: Date },

    // Lead Scoring
    score: { type: Number, default: 0, min: 0, max: 100 },
    scoreLabel: { type: String, enum: ['HOT', 'QUALIFIED', 'WARM', 'COLD'], default: 'COLD' },
    engagementHistory: [{ type: { type: String }, time: { type: Date, default: Date.now } }],

    metadata: { type: Map, of: String },
}, { timestamps: true })

leadSchema.index({ status: 1 })
leadSchema.index({ company: 1 })
leadSchema.index({ contactStatus: 1 })
leadSchema.index({ score: -1 })

export default mongoose.model('Lead', leadSchema)
