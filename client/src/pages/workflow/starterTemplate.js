// ─── Pre-loaded 13-node starter workflow ───
export const starterTemplate = {
    id: 'wf_starter',
    name: 'Cold Outreach Sequence',
    meta: { created: '2026-03-06T10:00:00Z', version: '2.0' },
    nodes: [
        {
            id: 'n1', type: 'trigger_new_lead', label: 'New Lead Added', enabled: true, note: '',
            config: { source: 'excel', filter: '' },
            position: { x: 400, y: 40 },
        },
        {
            id: 'n2', type: 'unsubscribe_check', label: 'Unsub Check', enabled: true, note: '',
            config: { list: 'global', continueLabel: 'Safe', stopLabel: 'Unsub' },
            position: { x: 400, y: 165 },
        },
        {
            id: 'n3', type: 'ai_enrich', label: 'Enrich Lead', enabled: true, note: '',
            config: { fields: 'company_size, industry, role', source: 'clearbit' },
            position: { x: 400, y: 290 },
        },
        {
            id: 'n4', type: 'ai_score', label: 'Score Lead', enabled: true, note: '',
            config: { criteria: 'seniority, company size, engagement', outputField: 'ai_score' },
            position: { x: 400, y: 415 },
        },
        {
            id: 'n5', type: 'ai_generate', label: 'Write AI Email', enabled: true, note: '',
            config: { model: 'claude-sonnet', tone: 'professional', prompt: 'Write a cold outreach email for {{first_name}} at {{company}}', maxTokens: 500 },
            position: { x: 400, y: 540 },
        },
        {
            id: 'n6', type: 'send_email', label: 'Send Intro Email', enabled: true, note: '',
            config: { from: '', replyTo: '', subject: 'Hey {{first_name}}, quick thought...', template: 'intro', aiPersonalize: true },
            position: { x: 400, y: 665 },
        },
        {
            id: 'n7', type: 'delay', label: 'Wait 2–4 Days', enabled: true, note: '',
            config: { delayType: 'random', min: 2, max: 4, unit: 'days', businessHours: true, timezone: 'lead' },
            position: { x: 400, y: 790 },
        },
        {
            id: 'n8', type: 'wait_event', label: 'Opened Email?', enabled: true, note: '',
            config: { event: 'email_opened', timeoutValue: 3, timeoutUnit: 'days', successLabel: 'Opened', timeoutLabel: 'Timeout' },
            position: { x: 400, y: 915 },
        },
        {
            id: 'n9', type: 'send_email', label: 'Follow-up Email', enabled: true, note: '',
            config: { from: '', replyTo: '', subject: 'Just checking in, {{first_name}}', template: 'followup_1', aiPersonalize: false },
            position: { x: 280, y: 1065 },
        },
        {
            id: 'n10', type: 'add_tag', label: 'Tag: Engaged', enabled: true, note: '',
            config: { tag: 'engaged' },
            position: { x: 280, y: 1190 },
        },
        {
            id: 'n11', type: 'update_crm', label: 'Update CRM', enabled: true, note: '',
            config: { crm: 'hubspot', action: 'update_stage', value: 'contacted' },
            position: { x: 280, y: 1315 },
        },
        {
            id: 'n12', type: 'end', label: 'Sequence Done', enabled: true, note: '',
            config: { status: 'completed', note: '' },
            position: { x: 280, y: 1440 },
        },
        {
            id: 'n13', type: 'end', label: 'Mark Cold', enabled: true, note: '',
            config: { status: 'cold', note: 'Email not opened after 3 days' },
            position: { x: 600, y: 1065 },
        },
        {
            id: 'n14', type: 'end', label: 'Unsubscribed', enabled: true, note: '',
            config: { status: 'unsubscribed', note: '' },
            position: { x: 660, y: 290 },
        },
    ],
    edges: [
        { id: 'e1', from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e2', from: 'n2', to: 'n3', fromPort: 'safe', toPort: 'in', label: 'Safe' },
        { id: 'e3', from: 'n2', to: 'n14', fromPort: 'unsub', toPort: 'in', label: 'Unsub' },
        { id: 'e4', from: 'n3', to: 'n4', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e5', from: 'n4', to: 'n5', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e6', from: 'n5', to: 'n6', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e7', from: 'n6', to: 'n7', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e8', from: 'n7', to: 'n8', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e9', from: 'n8', to: 'n9', fromPort: 'success', toPort: 'in', label: 'Opened' },
        { id: 'e10', from: 'n8', to: 'n13', fromPort: 'timeout', toPort: 'in', label: 'Timeout' },
        { id: 'e11', from: 'n9', to: 'n10', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e12', from: 'n10', to: 'n11', fromPort: 'out', toPort: 'in', label: '' },
        { id: 'e13', from: 'n11', to: 'n12', fromPort: 'out', toPort: 'in', label: '' },
    ],
}
