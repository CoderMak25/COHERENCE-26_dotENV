import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    bio: { type: String, default: '' },
    role: { type: String, default: 'OUTREACH OPERATOR' },
    photoUrl: { type: String, default: '' },
    preferences: {
        theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
        language: { type: String, default: 'EN' },
        notifications: { type: Boolean, default: true },
        twoFactor: { type: Boolean, default: false },
    },
    plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'starter' },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
