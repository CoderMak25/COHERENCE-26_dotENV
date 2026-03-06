/**
 * Lead Scoring Service
 * 
 * Pure functions — no side effects, no DB imports.
 * Calculates a lead score between 0–100 from static profile data + engagement events.
 */

// ─── ROLE SCORING ────────────────────────────────────────────────────
const ROLE_KEYWORDS = [
    { keywords: ['ceo', 'founder', 'co-founder', 'owner', 'president'], points: 30 },
    { keywords: ['vp', 'vice president', 'director', 'cto', 'cfo', 'cmo', 'coo', 'chief'], points: 25 },
    { keywords: ['manager', 'head', 'lead', 'senior'], points: 20 },
    { keywords: ['engineer', 'specialist', 'analyst', 'developer', 'designer', 'architect', 'scientist', 'researcher', 'strategist'], points: 10 },
    { keywords: ['intern', 'trainee', 'assistant', 'junior'], points: 3 },
]

function roleScore(position) {
    if (!position) return 3
    const lower = position.toLowerCase()
    for (const tier of ROLE_KEYWORDS) {
        if (tier.keywords.some(k => lower.includes(k))) return tier.points
    }
    return 3
}

// ─── COMPANY SIZE SCORING ────────────────────────────────────────────
const ENTERPRISE_COMPANIES = [
    'google', 'microsoft', 'apple', 'amazon', 'meta', 'tesla', 'ibm',
    'oracle', 'intel', 'nvidia', 'adobe', 'salesforce', 'linkedin',
    'netflix', 'uber', 'paypal', 'stripe'
]
const MIDSIZE_KEYWORDS = ['mid-market', 'mid-size', 'midsize', 'ltd', 'inc', 'corp']
const STARTUP_KEYWORDS = ['startup', 'stealth', 'innovate', 'labs', 'ventures']

function companyScore(company) {
    if (!company) return 5
    const lower = company.toLowerCase()
    if (ENTERPRISE_COMPANIES.some(c => lower.includes(c))) return 25
    if (STARTUP_KEYWORDS.some(k => lower.includes(k))) return 10
    if (MIDSIZE_KEYWORDS.some(k => lower.includes(k))) return 15
    return 10 // default to startup-level if unknown
}

// ─── INDUSTRY MATCH SCORING ─────────────────────────────────────────
function industryScore(industry) {
    if (!industry) return 5
    const lower = industry.toLowerCase()
    if (lower.includes('tech') || lower === 'saas' || lower === 'software') return 20
    if (lower.includes('finance') || lower.includes('fintech') || lower.includes('banking')) return 15
    return 8
}

// ─── CONTACT QUALITY SCORING ────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function contactScore(email, linkedinUrl) {
    const hasValidEmail = email && EMAIL_REGEX.test(email)
    const hasLinkedin = linkedinUrl && linkedinUrl.length > 5

    if (hasValidEmail && hasLinkedin) return 15
    if (hasValidEmail) return 10
    if (hasLinkedin) return 6
    return 0
}

// ─── LOCATION RELEVANCE SCORING ─────────────────────────────────────
const TARGET_REGIONS = ['usa', 'us', 'united states', 'canada', 'uk', 'united kingdom', 'india']

function locationScore(location) {
    if (!location) return 5
    const lower = location.toLowerCase()
    if (TARGET_REGIONS.some(r => lower.includes(r))) return 10
    return 5
}

// ─── ENGAGEMENT SCORE ───────────────────────────────────────────────
const ENGAGEMENT_DELTAS = {
    email_sent: 0,
    email_open: 10,
    link_click: 20,
    reply_received: 40,
    ignored: -5,
    negative_reply: -999, // sentinel: score becomes 0
}

function engagementScore(engagementHistory) {
    if (!engagementHistory || engagementHistory.length === 0) return 0
    let total = 0
    for (const event of engagementHistory) {
        const delta = ENGAGEMENT_DELTAS[event.type]
        if (delta === -999) return -999 // negative reply → score becomes 0
        if (typeof delta === 'number') total += delta
    }
    return total
}

// ─── MAIN SCORING FUNCTION ──────────────────────────────────────────

export function calculateLeadScore(lead) {
    const staticTotal =
        roleScore(lead.position) +
        companyScore(lead.company) +
        industryScore(lead.industry) +
        contactScore(lead.email, lead.linkedinUrl) +
        locationScore(lead.location || (lead.tags && lead.tags.find(t => TARGET_REGIONS.some(r => t.toLowerCase().includes(r)))))

    const engTotal = engagementScore(lead.engagementHistory)

    // Negative reply → instant 0
    if (engTotal === -999) return 0

    return Math.min(Math.max(staticTotal + engTotal, 0), 100)
}

export function getScoreLabel(score) {
    if (score >= 80) return 'HOT'
    if (score >= 50) return 'WARM'
    return 'COLD'
}

export function getNextAction(score, status) {
    if (score >= 80) return 'Priority Follow-up'
    if (score >= 50) return 'Standard Outreach'
    if (score >= 30) return 'Nurture Sequence'
    return 'Low Priority'
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
