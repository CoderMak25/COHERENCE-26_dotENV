import User from '../models/User.js'

// GET /api/users/profile?firebaseUid=xxx
export const getProfile = async (req, res, next) => {
    try {
        const { firebaseUid } = req.query
        if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' })

        let user = await User.findOne({ firebaseUid })

        // Auto-create profile on first visit
        if (!user) {
            user = await User.create({
                firebaseUid,
                name: req.query.name || '',
                email: req.query.email || '',
                photoUrl: req.query.photoUrl || '',
            })
        }

        res.json(user)
    } catch (err) {
        next(err)
    }
}

// PUT /api/users/profile
export const updateProfile = async (req, res, next) => {
    try {
        const { firebaseUid, ...updates } = req.body
        if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' })

        const user = await User.findOneAndUpdate(
            { firebaseUid },
            { $set: updates },
            { new: true, upsert: true, runValidators: true }
        )

        res.json(user)
    } catch (err) {
        next(err)
    }
}

// PUT /api/users/settings
export const updateSettings = async (req, res, next) => {
    try {
        const { firebaseUid, preferences } = req.body
        if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' })

        const user = await User.findOneAndUpdate(
            { firebaseUid },
            { $set: { preferences } },
            { new: true, upsert: true, runValidators: true }
        )

        res.json(user)
    } catch (err) {
        next(err)
    }
}
