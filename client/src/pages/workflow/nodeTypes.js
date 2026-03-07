// ─── Node Category Definitions ───
export const NODE_CATEGORIES = [
  { id: 'triggers', label: 'TRIGGERS', color: 'var(--accent)' },
  { id: 'outreach', label: 'OUTREACH', color: 'var(--accent)' },
  { id: 'ai', label: 'AI & SMART', color: 'var(--accent)' },
  { id: 'logic', label: 'LOGIC & FLOW', color: 'var(--accent)' },
  { id: 'data', label: 'DATA & CRM', color: 'var(--accent)' },
  { id: 'safety', label: 'SAFETY', color: 'var(--danger)' },
]

// ─── All 30 Node Type Definitions ───
export const NODE_DEFS = {
  // ── TRIGGERS ──
  trigger_new_lead: {
    type: 'trigger_new_lead', label: 'New Lead', category: 'triggers',
    tag: 'TRG', description: 'Fires when new lead is added',
    defaultConfig: { source: 'excel', filter: '' },
    inputs: 0, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.source ? `Source: ${c.source}` : 'No source set',
  },
  trigger_form_submit: {
    type: 'trigger_form_submit', label: 'Form Submit', category: 'triggers',
    tag: 'TRG', description: 'Fires on form submission',
    defaultConfig: { formId: '', webhookUrl: '' },
    inputs: 0, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.formId ? `Form: ${c.formId}` : 'No form configured',
  },
  trigger_scheduled: {
    type: 'trigger_scheduled', label: 'Scheduled', category: 'triggers',
    tag: 'TRG', description: 'Cron schedule trigger',
    defaultConfig: { cron: '0 9 * * 1-5', timezone: 'UTC' },
    inputs: 0, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.cron || 'No schedule set',
  },
  trigger_webhook: {
    type: 'trigger_webhook', label: 'Webhook', category: 'triggers',
    tag: 'TRG', description: 'HTTP POST trigger',
    defaultConfig: { path: '/webhook', method: 'POST' },
    inputs: 0, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => `${c.method || 'POST'} ${c.path || '/webhook'}`,
  },
  trigger_manual: {
    type: 'trigger_manual', label: 'Manual Run', category: 'triggers',
    tag: 'TRG', description: 'Triggered manually',
    defaultConfig: {},
    inputs: 0, outputs: [{ id: 'out', label: '' }],
    getPreview: () => 'Click RUN to trigger',
  },

  // ── OUTREACH ──
  send_email: {
    type: 'send_email', label: 'Send Email', category: 'outreach',
    tag: 'OUT', description: 'Send personalized email',
    defaultConfig: { from: '', replyTo: '', subject: '', template: 'intro', aiPersonalize: false },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.subject ? `"${c.subject.substring(0, 30)}${c.subject.length > 30 ? '…' : ''}"` : 'No subject set',
  },
  send_telegram: {
    type: 'send_telegram', label: 'Telegram', category: 'outreach',
    tag: 'TG', description: 'Send Telegram message via bot',
    defaultConfig: { username: '', sendToAll: false },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.username ? `@${c.username}` : 'All leads (bot users)',
  },
  linkedin_dm: {
    type: 'linkedin_dm', label: 'LinkedIn DM', category: 'outreach',
    tag: 'OUT', description: 'Send LinkedIn message',
    defaultConfig: { message: '', connectionNote: false },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.connectionNote ? 'Connection note' : 'Direct message',
  },
  send_sms: {
    type: 'send_sms', label: 'Send SMS', category: 'outreach',
    tag: 'OUT', description: 'Send SMS via Twilio',
    defaultConfig: { message: '', fromNumber: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.message ? `${c.message.substring(0, 25)}…` : 'No message set',
  },
  whatsapp: {
    type: 'whatsapp', label: 'WhatsApp', category: 'outreach',
    tag: 'OUT', description: 'Send WhatsApp message',
    defaultConfig: { message: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.message ? `${c.message.substring(0, 25)}…` : 'No message set',
  },
  phone_call: {
    type: 'phone_call', label: 'Phone Call', category: 'outreach',
    tag: 'OUT', description: 'Log or trigger a call',
    defaultConfig: { script: '', autoDialer: false },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.autoDialer ? 'Auto-dialer ON' : 'Manual call',
  },
  slack_alert: {
    type: 'slack_alert', label: 'Slack Alert', category: 'outreach',
    tag: 'OUT', description: 'Internal Slack notification',
    defaultConfig: { channel: '#sales-alerts', message: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.channel || '#sales-alerts',
  },

  // ── AI & SMART ──
  ai_generate: {
    type: 'ai_generate', label: 'AI Write', category: 'ai',
    tag: 'AI', description: 'Generate message with LLM',
    defaultConfig: { model: 'groq-ai', tone: 'professional', prompt: '', maxTokens: 500 },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => `groq-ai · ${c.tone || 'professional'}`,
  },
  ai_score: {
    type: 'ai_score', label: 'AI Lead Score', category: 'ai',
    tag: 'AI', description: 'Score lead 0-100 with AI',
    defaultConfig: { criteria: '', outputField: 'ai_score' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.outputField ? `→ ${c.outputField}` : 'Score lead',
  },
  ai_classify: {
    type: 'ai_classify', label: 'AI Classify', category: 'ai',
    tag: 'AI', description: 'Classify intent/sentiment',
    defaultConfig: { task: 'intent', labels: 'interested, neutral, not_interested' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.task || 'intent',
  },
  ai_enrich: {
    type: 'ai_enrich', label: 'AI Enrich', category: 'ai',
    tag: 'AI', description: 'Enrich lead data with AI',
    defaultConfig: { fields: '', source: 'clearbit' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => `via ${c.source || 'clearbit'}`,
  },

  // ── LOGIC & FLOW ──
  delay: {
    type: 'delay', label: 'Delay', category: 'logic',
    tag: 'FLW', description: 'Wait a random/fixed duration',
    defaultConfig: { delayType: 'random', min: 2, max: 5, unit: 'days', businessHours: true, timezone: 'lead' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => {
      if (c.delayType === 'random') return `Random: ${c.min}–${c.max} ${c.unit}`
      if (c.delayType === 'fixed') return `Fixed: ${c.min} ${c.unit}`
      return `Smart best time`
    },
  },
  condition: {
    type: 'condition', label: 'If / Else', category: 'logic',
    tag: 'IF', description: 'Branch on a condition',
    defaultConfig: { field: 'email_opened', operator: 'equals', value: 'true', yesLabel: 'YES', noLabel: 'NO' },
    inputs: 1,
    outputs: [{ id: 'yes', label: 'YES' }, { id: 'no', label: 'NO' }],
    getPreview: (c) => `if ${c.field} ${c.operator} ${c.value}`,
  },
  ab_split: {
    type: 'ab_split', label: 'A/B Split', category: 'logic',
    tag: 'A/B', description: 'Split traffic A vs B',
    defaultConfig: { ratioA: 50, ratioB: 50, trackingField: 'variant' },
    inputs: 1,
    outputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    getPreview: (c) => `${c.ratioA}% / ${c.ratioB}%`,
  },
  loop: {
    type: 'loop', label: 'Loop', category: 'logic',
    tag: 'FLW', description: 'Iterate over a list',
    defaultConfig: { field: '', maxIterations: 10 },
    inputs: 1,
    outputs: [{ id: 'next', label: 'Next' }, { id: 'done', label: 'Done' }],
    getPreview: (c) => c.field ? `over ${c.field}` : 'No field set',
  },
  merge: {
    type: 'merge', label: 'Merge', category: 'logic',
    tag: 'FLW', description: 'Merge two branches',
    defaultConfig: {},
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: () => 'Merges branches',
  },
  wait_event: {
    type: 'wait_event', label: 'Wait For Event', category: 'logic',
    tag: 'FLW', description: 'Pause until event or timeout',
    defaultConfig: { event: 'email_opened', timeoutValue: 3, timeoutUnit: 'days', successLabel: 'Opened', timeoutLabel: 'Timeout' },
    inputs: 1,
    outputs: [{ id: 'success', label: 'Opened' }, { id: 'timeout', label: 'Timeout' }],
    getPreview: (c) => `Wait: ${c.event} (${c.timeoutValue}${c.timeoutUnit?.[0] || 'd'})`,
  },

  // ── DATA & CRM ──
  update_crm: {
    type: 'update_crm', label: 'Update CRM', category: 'data',
    tag: 'CRM', description: 'Update lead in CRM',
    defaultConfig: { crm: 'hubspot', action: 'update_stage', value: 'contacted' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => `${c.crm}: ${c.action} → ${c.value}`,
  },
  add_tag: {
    type: 'add_tag', label: 'Add Tag', category: 'data',
    tag: 'TAG', description: 'Tag the lead',
    defaultConfig: { tag: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.tag ? `"${c.tag}"` : 'No tag set',
  },
  remove_tag: {
    type: 'remove_tag', label: 'Remove Tag', category: 'data',
    tag: 'TAG', description: 'Remove tag from lead',
    defaultConfig: { tag: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.tag ? `"${c.tag}"` : 'No tag set',
  },
  set_field: {
    type: 'set_field', label: 'Set Field', category: 'data',
    tag: 'SET', description: 'Set a lead field value',
    defaultConfig: { fieldName: '', valueType: 'static', value: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.fieldName ? `${c.fieldName} = ${c.value}` : 'No field set',
  },
  http_request: {
    type: 'http_request', label: 'HTTP Request', category: 'data',
    tag: 'API', description: 'Call any external API',
    defaultConfig: { url: '', method: 'GET', body: '', headers: '' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => c.url ? `${c.method} ${c.url.substring(0, 25)}` : 'No URL set',
  },

  // ── SAFETY ──
  throttle: {
    type: 'throttle', label: 'Throttle', category: 'safety',
    tag: 'SAF', description: 'Rate limit outreach',
    defaultConfig: { maxPerHour: 10, maxPerDay: 50, strategy: 'queue' },
    inputs: 1, outputs: [{ id: 'out', label: '' }],
    getPreview: (c) => `${c.maxPerHour}/hr · ${c.maxPerDay}/day`,
  },
  unsubscribe_check: {
    type: 'unsubscribe_check', label: 'Unsub Check', category: 'safety',
    tag: 'SAF', description: 'Check unsubscribe list',
    defaultConfig: { list: 'global', continueLabel: 'Safe', stopLabel: 'Unsub' },
    inputs: 1,
    outputs: [{ id: 'safe', label: 'Safe' }, { id: 'unsub', label: 'Unsub' }],
    getPreview: (c) => `${c.list || 'global'} list`,
  },
  end: {
    type: 'end', label: 'End', category: 'safety',
    tag: 'END', description: 'End this branch',
    defaultConfig: { status: 'completed', note: '' },
    inputs: 1, outputs: [],
    getPreview: (c) => c.status || 'completed',
  },
}

// Helper: get all nodes as array
export const getNodeDefsList = () => Object.values(NODE_DEFS)

// Helper: get nodes by category
export const getNodesByCategory = (categoryId) =>
  getNodeDefsList().filter((n) => n.category === categoryId)

// Helper: get category color
export const getCategoryColor = (categoryId) =>
  NODE_CATEGORIES.find((c) => c.id === categoryId)?.color || '#6b7280'
