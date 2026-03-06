/**
 * Lead validation and channel routing
 */

export const validateAndRoute = (lead) => {
    const hasEmail = !!(
        lead.email &&
        lead.email.includes('@') &&
        lead.email.split('@').pop().includes('.')
    )
    const hasLinkedin = !!(
        lead.linkedinUrl &&
        lead.linkedinUrl.toLowerCase().includes('linkedin.com/in/')
    )

    if (hasEmail && hasLinkedin) return 'both'
    if (hasEmail) return 'email'
    if (hasLinkedin) return 'linkedin'
    return 'none'
}

export const validateImportRow = (row) => {
    const errors = []

    if (!row.name || String(row.name).trim() === '') {
        errors.push('Missing name — required field')
    }

    const hasEmail = !!row.email
    const hasLinkedin = !!row.linkedinUrl

    if (!hasEmail && !hasLinkedin) {
        errors.push('No contact method — provide email or linkedinUrl')
    }

    if (hasEmail && !String(row.email).includes('@')) {
        errors.push(`Invalid email format: ${row.email}`)
    }

    return { valid: errors.length === 0, errors }
}
