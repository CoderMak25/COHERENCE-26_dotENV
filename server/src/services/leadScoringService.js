/**
 * Lead Scoring Engine
 * 
 * Strict scoring system (0–100).
 * Score = Profile Score (max 50) + Behavior Score (max 40) − Penalties (max −30)
 * Only highly qualified leads reach scores above 80.
 */

// ─── ROLE SCORE (max 20) ────────────────────────────────────────────
const ROLE_TIERS = [
    { keywords: ['ceo', 'founder', 'co-founder', 'owner', 'president', 'chief'], points: 20 },
    { keywords: ['vp', 'vice president', 'director', 'cto', 'cfo', 'cmo', 'coo'], points: 15 },
    { keywords: ['manager', 'head', 'lead', 'team lead'], points: 10 },
    {
        keywords: ['engineer', 'specialist', 'analyst', 'developer', 'designer', 'architect',
            'scientist', 'researcher', 'strategist', 'coordinator', 'associate',
            'consultant', 'executive', 'representative', 'officer'], points: 5
    },
]

function roleScore(position) {
    if (!position) return 0
    const lower = position.toLowerCase()
    for (const tier of ROLE_TIERS) {
        if (tier.keywords.some(k => lower.includes(k))) return tier.points
    }
    return 0 // Unknown role = 0
}

// ─── COMPANY SIZE SCORE (max 10) ────────────────────────────────────
// We estimate company size from the company name since we don't store employee count.
const ENTERPRISE_COMPANIES = [
    'google', 'microsoft', 'apple', 'amazon', 'meta', 'tesla', 'ibm',
    'oracle', 'intel', 'nvidia', 'adobe', 'salesforce', 'linkedin',
    'netflix', 'uber', 'paypal', 'stripe', 'walmart', 'jpmorgan',
    'goldman', 'deloitte', 'accenture', 'infosys', 'tcs', 'wipro',
    'samsung', 'sony', 'cisco', 'dell', 'hp', 'sap'
]
const MIDSIZE_KEYWORDS = ['ltd', 'inc', 'corp', 'limited', 'group', 'global', 'international']
const STARTUP_KEYWORDS = ['startup', 'stealth', 'labs', 'ventures', 'studio', 'ai', 'io']

function companySizeScore(company) {
    if (!company) return 1
    const lower = company.toLowerCase()
    if (ENTERPRISE_COMPANIES.some(c => lower.includes(c))) return 10   // 1000+ employees
    if (MIDSIZE_KEYWORDS.some(k => lower.includes(k))) return 8        // 200–1000
    if (STARTUP_KEYWORDS.some(k => lower.includes(k))) return 3        // 10–50
    return 6 // Default: assume mid-size (50–200)
}

// ─── INDUSTRY MATCH SCORE (max 10) ──────────────────────────────────
const TARGET_INDUSTRIES = ['tech', 'technology', 'saas', 'software', 'it', 'ai', 'cloud']
const RELATED_INDUSTRIES = ['fintech', 'finance', 'banking', 'ecommerce', 'e-commerce',
    'digital', 'data', 'analytics', 'consulting', 'telecom']

function industryScore(industry) {
    if (!industry) return 3 // Neutral — unknown
    const lower = industry.toLowerCase()
    if (TARGET_INDUSTRIES.some(k => lower.includes(k))) return 10
    if (RELATED_INDUSTRIES.some(k => lower.includes(k))) return 6
    return 3 // Neutral
}

// ─── CONTACT QUALITY SCORE (max 10) ─────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function contactQualityScore(email, linkedinUrl, phone) {
    const hasEmail = email && EMAIL_REGEX.test(email)
    const hasLinkedin = linkedinUrl && linkedinUrl.length > 5
    const hasPhone = phone && phone.length > 5

    if (hasEmail && hasLinkedin) return 10   // Verified email + LinkedIn
    if (hasEmail) return 7                   // Verified email only
    if (hasPhone) return 5                   // Phone only
    if (hasLinkedin) return 5                // LinkedIn only (treated like phone)
    return 2                                 // Unverified contact
}

// ─── BEHAVIOR SCORE (max 40) ────────────────────────────────────────
const BEHAVIOR_POINTS = {
    email_open: 2,       // max 10 pts (5 opens)
    link_click: 5,       // max 15 pts (3 clicks)
    reply_received: 15,  // one-time
    demo_request: 20,    // one-time
}

const BEHAVIOR_CAPS = {
    email_open: 10,
    link_click: 15,
    reply_received: 15,
    demo_request: 20,
}

function behaviorScore(engagementHistory) {
    if (!engagementHistory || engagementHistory.length === 0) return 0

    const totals = {}
    for (const event of engagementHistory) {
        const type = event.type
        if (!BEHAVIOR_POINTS[type]) continue
        totals[type] = (totals[type] || 0) + BEHAVIOR_POINTS[type]
    }

    let score = 0
    for (const [type, points] of Object.entries(totals)) {
        const cap = BEHAVIOR_CAPS[type] || 0
        score += Math.min(points, cap)
    }
    return score
}

// ─── PENALTY SCORE (max −30) ────────────────────────────────────────
const PENALTY_VALUES = {
    no_response: -10,
    email_bounced: -20,
    unsubscribe: -30,
    inactive_30d: -10,
    negative_reply: -30,
    ignored: -5,
}

function penaltyScore(engagementHistory, lead) {
    let penalty = 0

    // Event-based penalties
    if (engagementHistory && engagementHistory.length > 0) {
        for (const event of engagementHistory) {
            const p = PENALTY_VALUES[event.type]
            if (p && p < 0) penalty += p
        }
    }

    // Status-based penalties
    if (lead.contactStatus === 'email_bounced') penalty += -20
    if (lead.status === 'Unsubscribed' || lead.status === 'unsubscribed') penalty += -30
    if (lead.status === 'invalid_no_contact') penalty += -10

    // Inactivity penalty: no engagement in 30 days
    if (lead.lastContactedAt) {
        const daysSince = (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince > 30) penalty += -10
    }

    return Math.max(penalty, -30) // Cap at −30
}

// ─── MAIN SCORING FUNCTION ──────────────────────────────────────────

export function calculateLeadScore(lead) {
    const profile = Math.min(
        roleScore(lead.position) +
        companySizeScore(lead.company) +
        industryScore(lead.industry) +
        contactQualityScore(lead.email, lead.linkedinUrl, lead.phone),
        50
    )

    const behavior = Math.min(behaviorScore(lead.engagementHistory), 40)
    const penalty = penaltyScore(lead.engagementHistory, lead)

    const raw = profile + behavior + penalty
    return Math.min(Math.max(raw, 0), 100)
}

export function calculateLeadScoreDetailed(lead) {
    const profile = Math.min(
        roleScore(lead.position) +
        companySizeScore(lead.company) +
        industryScore(lead.industry) +
        contactQualityScore(lead.email, lead.linkedinUrl, lead.phone),
        50
    )
    const behavior = Math.min(behaviorScore(lead.engagementHistory), 40)
    const penalty = penaltyScore(lead.engagementHistory, lead)
    const raw = profile + behavior + penalty
    const lead_score = Math.min(Math.max(raw, 0), 100)

    return {
        lead_score,
        profile_score: profile,
        behavior_score: behavior,
        penalty_score: penalty,
        category: getScoreLabel(lead_score),
    }
}

export function getScoreLabel(score) {
    if (score >= 81) return 'HOT'
    if (score >= 61) return 'QUALIFIED'
    if (score >= 31) return 'WARM'
    return 'COLD'
}

export function getNextAction(score, status) {
    if (score >= 81) return 'Priority Follow-up'
    if (score >= 61) return 'Qualified — Schedule Demo'
    if (score >= 31) return 'Standard Outreach'
    return 'Low Priority — Nurture'
}

/**
 * Process a single engagement event for a lead.
 * Returns the updated fields to $set on the lead document.
 */
export function processEngagementEvent(lead, eventType) {
    const history = [...(lead.engagementHistory || []), { type: eventType, time: new Date() }]
    const score = calculateLeadScore({ ...lead, engagementHistory: history })
    const scoreLabel = getScoreLabel(score)
    return { engagementHistory: history, score, scoreLabel }
}
