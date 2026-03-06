import { useState, useEffect } from 'react'

const VARIABLE_HINT = '{{first_name}} {{company}} {{role}} {{pain_point}} {{sender_name}}'

function Field({ label, children }) {
    return (
        <div className="wf-form-group">
            <label className="wf-form-label">{label}</label>
            {children}
        </div>
    )
}

function Select({ value, onChange, options }) {
    return (
        <select className="wf-form-input wf-form-select" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => (
                <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                    {typeof o === 'string' ? o : o.label}
                </option>
            ))}
        </select>
    )
}

function VarHint() {
    return <div className="wf-var-hint">{VARIABLE_HINT}</div>
}

export default function ConfigForm({ nodeType, config: initialConfig, onSave, color }) {
    const [config, setConfig] = useState(initialConfig)

    useEffect(() => {
        setConfig(initialConfig)
    }, [initialConfig, nodeType])

    const set = (key, val) => {
        const updated = { ...config, [key]: val }
        setConfig(updated)
        onSave(updated)
    }

    const forms = {
        // ── TRIGGER NODES ──
        trigger_new_lead: () => (
            <>
                <Field label="SOURCE">
                    <Select value={config.source || 'excel'} onChange={(v) => set('source', v)}
                        options={['excel', 'csv', 'api', 'web_form', 'crm_import']} />
                </Field>
                <Field label="FILTER EXPRESSION">
                    <input className="wf-form-input" placeholder="e.g. industry == 'SaaS'" value={config.filter || ''} onChange={(e) => set('filter', e.target.value)} />
                </Field>
            </>
        ),
        trigger_form_submit: () => (
            <>
                <Field label="FORM ID">
                    <input className="wf-form-input" value={config.formId || ''} onChange={(e) => set('formId', e.target.value)} />
                </Field>
                <Field label="WEBHOOK URL">
                    <input className="wf-form-input" value={config.webhookUrl || ''} onChange={(e) => set('webhookUrl', e.target.value)} />
                </Field>
            </>
        ),
        trigger_scheduled: () => (
            <>
                <Field label="CRON EXPRESSION">
                    <input className="wf-form-input" value={config.cron || ''} onChange={(e) => set('cron', e.target.value)} />
                </Field>
                <div className="wf-form-presets">
                    {[
                        { label: 'Weekdays 9am', val: '0 9 * * 1-5' },
                        { label: 'Every 4h', val: '0 */4 * * *' },
                        { label: 'Daily midnight', val: '0 0 * * *' },
                    ].map((p) => (
                        <button key={p.val} className="wf-form-preset-btn" onClick={() => set('cron', p.val)}>{p.label}</button>
                    ))}
                </div>
                <Field label="TIMEZONE">
                    <Select value={config.timezone || 'UTC'} onChange={(v) => set('timezone', v)}
                        options={['UTC', 'EST', 'PST', 'IST', 'CET', 'GMT']} />
                </Field>
            </>
        ),
        trigger_webhook: () => (
            <>
                <Field label="PATH">
                    <input className="wf-form-input" value={config.path || '/webhook'} onChange={(e) => set('path', e.target.value)} />
                </Field>
                <div className="wf-form-url-bar" style={{ borderColor: `${color}40` }}>
                    POST https://yourapp.com{config.path || '/webhook'}
                </div>
                <Field label="METHOD">
                    <Select value={config.method || 'POST'} onChange={(v) => set('method', v)}
                        options={['POST', 'GET', 'PUT']} />
                </Field>
            </>
        ),
        trigger_manual: () => (
            <div className="wf-form-info">This trigger is activated manually by clicking RUN. No configuration needed.</div>
        ),

        // ── OUTREACH NODES ──
        send_email: () => (
            <>
                <VarHint />
                <Field label="FROM ADDRESS">
                    <input className="wf-form-input" placeholder="team@company.com" value={config.from || ''} onChange={(e) => set('from', e.target.value)} />
                </Field>
                <Field label="REPLY-TO">
                    <input className="wf-form-input" placeholder="Optional" value={config.replyTo || ''} onChange={(e) => set('replyTo', e.target.value)} />
                </Field>
                <Field label="SUBJECT LINE">
                    <input className="wf-form-input" placeholder="Hey {{first_name}}..." value={config.subject || ''} onChange={(e) => set('subject', e.target.value)} />
                </Field>
                <Field label="TEMPLATE">
                    <Select value={config.template || 'intro'} onChange={(v) => set('template', v)}
                        options={['intro', 'followup_1', 'followup_2', 'breakup', 'custom']} />
                </Field>
                <div className="wf-form-group wf-form-row">
                    <label className="wf-form-label">AI PERSONALIZE</label>
                    <input type="checkbox" className="wf-form-checkbox" checked={config.aiPersonalize || false}
                        onChange={(e) => set('aiPersonalize', e.target.checked)} />
                </div>
            </>
        ),
        linkedin_dm: () => (
            <>
                <VarHint />
                <Field label="MESSAGE">
                    <textarea className="wf-form-textarea" rows={4} value={config.message || ''} onChange={(e) => set('message', e.target.value)} />
                </Field>
                <div className="wf-form-group wf-form-row">
                    <label className="wf-form-label">SEND AS CONNECTION NOTE</label>
                    <input type="checkbox" className="wf-form-checkbox" checked={config.connectionNote || false}
                        onChange={(e) => set('connectionNote', e.target.checked)} />
                </div>
            </>
        ),
        send_sms: () => {
            const len = (config.message || '').length
            return (
                <>
                    <VarHint />
                    <Field label="MESSAGE">
                        <textarea className="wf-form-textarea" rows={3} value={config.message || ''} onChange={(e) => set('message', e.target.value)} />
                        <span className={`wf-char-count ${len > 160 ? 'wf-char-over' : ''}`}>{len}/160</span>
                    </Field>
                    <Field label="FROM NUMBER">
                        <input className="wf-form-input" placeholder="+1-555-..." value={config.fromNumber || ''} onChange={(e) => set('fromNumber', e.target.value)} />
                    </Field>
                </>
            )
        },
        whatsapp: () => (
            <>
                <VarHint />
                <Field label="MESSAGE">
                    <textarea className="wf-form-textarea" rows={4} value={config.message || ''} onChange={(e) => set('message', e.target.value)} />
                </Field>
            </>
        ),
        phone_call: () => (
            <>
                <Field label="CALL SCRIPT">
                    <textarea className="wf-form-textarea" rows={5} value={config.script || ''} onChange={(e) => set('script', e.target.value)} />
                </Field>
                <div className="wf-form-group wf-form-row">
                    <label className="wf-form-label">AUTO-DIALER</label>
                    <input type="checkbox" className="wf-form-checkbox" checked={config.autoDialer || false}
                        onChange={(e) => set('autoDialer', e.target.checked)} />
                </div>
            </>
        ),
        slack_alert: () => (
            <>
                <Field label="CHANNEL">
                    <input className="wf-form-input" placeholder="#sales-alerts" value={config.channel || ''} onChange={(e) => set('channel', e.target.value)} />
                </Field>
                <Field label="MESSAGE TEMPLATE">
                    <textarea className="wf-form-textarea" rows={3} value={config.message || ''} onChange={(e) => set('message', e.target.value)} />
                </Field>
            </>
        ),

        // ── AI NODES ──
        ai_generate: () => (
            <>
                <VarHint />
                <Field label="MODEL">
                    <Select value={config.model || 'claude-sonnet'} onChange={(v) => set('model', v)}
                        options={[
                            { value: 'claude-sonnet', label: 'Claude Sonnet' },
                            { value: 'claude-opus', label: 'Claude Opus' },
                            { value: 'gpt-4o', label: 'GPT-4o' },
                            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                        ]} />
                </Field>
                <Field label="TONE">
                    <Select value={config.tone || 'professional'} onChange={(v) => set('tone', v)}
                        options={['professional', 'casual', 'friendly', 'direct', 'consultative']} />
                </Field>
                <Field label="PROMPT">
                    <textarea className="wf-form-textarea" rows={4} value={config.prompt || ''} onChange={(e) => set('prompt', e.target.value)}
                        placeholder="Write a cold outreach for {{first_name}}..." />
                </Field>
                <Field label="MAX TOKENS">
                    <input className="wf-form-input" type="number" value={config.maxTokens || 500} onChange={(e) => set('maxTokens', parseInt(e.target.value) || 500)} />
                </Field>
            </>
        ),
        ai_score: () => (
            <>
                <Field label="SCORING CRITERIA">
                    <textarea className="wf-form-textarea" rows={3} value={config.criteria || ''}
                        onChange={(e) => set('criteria', e.target.value)}
                        placeholder="seniority, company size, engagement history" />
                </Field>
                <Field label="OUTPUT FIELD NAME">
                    <input className="wf-form-input" value={config.outputField || 'ai_score'} onChange={(e) => set('outputField', e.target.value)} />
                </Field>
            </>
        ),
        ai_classify: () => (
            <>
                <Field label="TASK">
                    <Select value={config.task || 'intent'} onChange={(v) => set('task', v)}
                        options={['intent', 'sentiment', 'category']} />
                </Field>
                <Field label="LABELS">
                    <input className="wf-form-input" value={config.labels || ''} onChange={(e) => set('labels', e.target.value)}
                        placeholder="interested, neutral, not_interested" />
                </Field>
            </>
        ),
        ai_enrich: () => (
            <>
                <Field label="FIELDS TO ENRICH">
                    <input className="wf-form-input" value={config.fields || ''} onChange={(e) => set('fields', e.target.value)}
                        placeholder="company_size, industry, role" />
                </Field>
                <Field label="SOURCE">
                    <Select value={config.source || 'clearbit'} onChange={(v) => set('source', v)}
                        options={['clearbit', 'hunter', 'pdl', 'apollo', 'ai_guess']} />
                </Field>
            </>
        ),

        // ── LOGIC NODES ──
        delay: () => {
            const preview = config.delayType === 'random'
                ? `⚡ Random delay: ${config.min || 2}–${config.max || 5} ${config.unit || 'days'} (human-like)`
                : config.delayType === 'fixed'
                    ? `⏰ Fixed delay: ${config.min || 2} ${config.unit || 'days'}`
                    : `🧠 Smart best time delivery`
            return (
                <>
                    <Field label="DELAY TYPE">
                        <Select value={config.delayType || 'random'} onChange={(v) => set('delayType', v)}
                            options={[
                                { value: 'random', label: 'Random Range' },
                                { value: 'fixed', label: 'Fixed Duration' },
                                { value: 'smart', label: 'Smart Best Time' },
                            ]} />
                    </Field>
                    {(config.delayType === 'random' || config.delayType === 'fixed') && (
                        <div className="wf-form-row-inputs">
                            <Field label="MIN">
                                <input className="wf-form-input" type="number" value={config.min || 2} onChange={(e) => set('min', parseInt(e.target.value) || 0)} />
                            </Field>
                            {config.delayType === 'random' && (
                                <Field label="MAX">
                                    <input className="wf-form-input" type="number" value={config.max || 5} onChange={(e) => set('max', parseInt(e.target.value) || 0)} />
                                </Field>
                            )}
                            <Field label="UNIT">
                                <Select value={config.unit || 'days'} onChange={(v) => set('unit', v)}
                                    options={['minutes', 'hours', 'days', 'weeks']} />
                            </Field>
                        </div>
                    )}
                    <div className="wf-form-group wf-form-row">
                        <label className="wf-form-label">BUSINESS HOURS ONLY</label>
                        <input type="checkbox" className="wf-form-checkbox" checked={config.businessHours || false}
                            onChange={(e) => set('businessHours', e.target.checked)} />
                    </div>
                    <Field label="TIMEZONE">
                        <Select value={config.timezone || 'lead'} onChange={(v) => set('timezone', v)}
                            options={[
                                { value: 'lead', label: "Lead's Timezone" },
                                { value: 'UTC', label: 'UTC' },
                                { value: 'EST', label: 'EST' },
                                { value: 'IST', label: 'IST' },
                            ]} />
                    </Field>
                    <div className="wf-form-preview" style={{ borderColor: `${color}40`, color }}>{preview}</div>
                </>
            )
        },
        condition: () => (
            <>
                <Field label="FIELD TO CHECK">
                    <Select value={config.field || 'email_opened'} onChange={(v) => set('field', v)}
                        options={['email_opened', 'email_clicked', 'replied', 'linkedin_connected', 'ai_score', 'tag_exists', 'custom']} />
                </Field>
                <Field label="OPERATOR">
                    <Select value={config.operator || 'equals'} onChange={(v) => set('operator', v)}
                        options={['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists']} />
                </Field>
                <Field label="VALUE">
                    <input className="wf-form-input" value={config.value || ''} onChange={(e) => set('value', e.target.value)} />
                </Field>
                <div className="wf-form-row-inputs">
                    <Field label="YES LABEL">
                        <input className="wf-form-input" value={config.yesLabel || 'YES'} onChange={(e) => set('yesLabel', e.target.value)} />
                    </Field>
                    <Field label="NO LABEL">
                        <input className="wf-form-input" value={config.noLabel || 'NO'} onChange={(e) => set('noLabel', e.target.value)} />
                    </Field>
                </div>
            </>
        ),
        ab_split: () => {
            const a = config.ratioA ?? 50
            const b = config.ratioB ?? 50
            return (
                <>
                    <div className="wf-form-row-inputs">
                        <Field label="RATIO A %">
                            <input className="wf-form-input" type="number" min={0} max={100} value={a}
                                onChange={(e) => {
                                    const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                    setConfig((c) => ({ ...c, ratioA: v, ratioB: 100 - v }))
                                    onSave({ ...config, ratioA: v, ratioB: 100 - v })
                                }} />
                        </Field>
                        <Field label="RATIO B %">
                            <input className="wf-form-input" type="number" min={0} max={100} value={b}
                                onChange={(e) => {
                                    const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                    setConfig((c) => ({ ...c, ratioB: v, ratioA: 100 - v }))
                                    onSave({ ...config, ratioB: v, ratioA: 100 - v })
                                }} />
                        </Field>
                    </div>
                    <div className="wf-ab-bar">
                        <div className="wf-ab-a" style={{ width: `${a}%`, backgroundColor: color }}>{a}%</div>
                        <div className="wf-ab-b" style={{ width: `${b}%` }}>{b}%</div>
                    </div>
                    <Field label="TRACKING FIELD">
                        <input className="wf-form-input" value={config.trackingField || 'variant'} onChange={(e) => set('trackingField', e.target.value)} />
                    </Field>
                </>
            )
        },
        loop: () => (
            <>
                <Field label="FIELD TO ITERATE">
                    <input className="wf-form-input" value={config.field || ''} onChange={(e) => set('field', e.target.value)} />
                </Field>
                <Field label="MAX ITERATIONS">
                    <input className="wf-form-input" type="number" value={config.maxIterations || 10} onChange={(e) => set('maxIterations', parseInt(e.target.value) || 10)} />
                </Field>
            </>
        ),
        merge: () => (
            <div className="wf-form-info">Merges two incoming branches into one. No configuration needed.</div>
        ),
        wait_event: () => (
            <>
                <Field label="EVENT">
                    <Select value={config.event || 'email_opened'} onChange={(v) => set('event', v)}
                        options={['email_opened', 'email_clicked', 'replied', 'linkedin_accepted', 'form_submitted']} />
                </Field>
                <div className="wf-form-row-inputs">
                    <Field label="TIMEOUT">
                        <input className="wf-form-input" type="number" value={config.timeoutValue || 3} onChange={(e) => set('timeoutValue', parseInt(e.target.value) || 3)} />
                    </Field>
                    <Field label="UNIT">
                        <Select value={config.timeoutUnit || 'days'} onChange={(v) => set('timeoutUnit', v)}
                            options={['minutes', 'hours', 'days']} />
                    </Field>
                </div>
                <div className="wf-form-row-inputs">
                    <Field label="SUCCESS LABEL">
                        <input className="wf-form-input" value={config.successLabel || 'Opened'} onChange={(e) => set('successLabel', e.target.value)} />
                    </Field>
                    <Field label="TIMEOUT LABEL">
                        <input className="wf-form-input" value={config.timeoutLabel || 'Timeout'} onChange={(e) => set('timeoutLabel', e.target.value)} />
                    </Field>
                </div>
            </>
        ),

        // ── DATA NODES ──
        update_crm: () => (
            <>
                <Field label="CRM">
                    <Select value={config.crm || 'hubspot'} onChange={(v) => set('crm', v)}
                        options={['hubspot', 'salesforce', 'pipedrive', 'airtable', 'custom']} />
                </Field>
                <Field label="ACTION">
                    <Select value={config.action || 'update_stage'} onChange={(v) => set('action', v)}
                        options={['update_stage', 'create_activity', 'add_note', 'create_deal', 'update_field']} />
                </Field>
                <Field label="VALUE">
                    <input className="wf-form-input" value={config.value || ''} onChange={(e) => set('value', e.target.value)} />
                </Field>
            </>
        ),
        add_tag: () => (
            <>
                <Field label="TAG NAME">
                    <input className="wf-form-input" value={config.tag || ''} onChange={(e) => set('tag', e.target.value)}
                        placeholder="e.g. contacted, engaged, cold" />
                </Field>
            </>
        ),
        remove_tag: () => (
            <>
                <Field label="TAG NAME">
                    <input className="wf-form-input" value={config.tag || ''} onChange={(e) => set('tag', e.target.value)} />
                </Field>
            </>
        ),
        set_field: () => (
            <>
                <Field label="FIELD NAME">
                    <input className="wf-form-input" value={config.fieldName || ''} onChange={(e) => set('fieldName', e.target.value)} />
                </Field>
                <Field label="TYPE">
                    <Select value={config.valueType || 'static'} onChange={(v) => set('valueType', v)}
                        options={[
                            { value: 'static', label: 'Static Value' },
                            { value: 'dynamic', label: 'Dynamic Expression' },
                        ]} />
                </Field>
                <Field label="VALUE">
                    <input className="wf-form-input" value={config.value || ''} onChange={(e) => set('value', e.target.value)} />
                </Field>
            </>
        ),
        http_request: () => (
            <>
                <VarHint />
                <Field label="URL">
                    <input className="wf-form-input" value={config.url || ''} onChange={(e) => set('url', e.target.value)}
                        placeholder="https://api.example.com/endpoint" />
                </Field>
                <Field label="METHOD">
                    <Select value={config.method || 'GET'} onChange={(v) => set('method', v)}
                        options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']} />
                </Field>
                <Field label="BODY (JSON)">
                    <textarea className="wf-form-textarea" rows={3} value={config.body || ''} onChange={(e) => set('body', e.target.value)} />
                </Field>
                <Field label="HEADERS">
                    <textarea className="wf-form-textarea" rows={2} value={config.headers || ''} onChange={(e) => set('headers', e.target.value)}
                        placeholder="Authorization: Bearer token123" />
                </Field>
            </>
        ),

        // ── SAFETY NODES ──
        throttle: () => (
            <>
                <Field label="MAX PER HOUR">
                    <input className="wf-form-input" type="number" value={config.maxPerHour || 10} onChange={(e) => set('maxPerHour', parseInt(e.target.value) || 10)} />
                </Field>
                <Field label="MAX PER DAY">
                    <input className="wf-form-input" type="number" value={config.maxPerDay || 50} onChange={(e) => set('maxPerDay', parseInt(e.target.value) || 50)} />
                </Field>
                <Field label="STRATEGY">
                    <Select value={config.strategy || 'queue'} onChange={(v) => set('strategy', v)}
                        options={[
                            { value: 'queue', label: 'Queue – wait and retry' },
                            { value: 'drop', label: 'Drop – skip' },
                            { value: 'pause', label: 'Pause – pause workflow' },
                        ]} />
                </Field>
            </>
        ),
        unsubscribe_check: () => (
            <>
                <Field label="LIST">
                    <Select value={config.list || 'global'} onChange={(v) => set('list', v)}
                        options={[
                            { value: 'global', label: 'Global Unsubscribe' },
                            { value: 'campaign', label: 'Campaign Unsubscribe' },
                        ]} />
                </Field>
                <div className="wf-form-row-inputs">
                    <Field label="CONTINUE LABEL">
                        <input className="wf-form-input" value={config.continueLabel || 'Safe'} onChange={(e) => set('continueLabel', e.target.value)} />
                    </Field>
                    <Field label="STOP LABEL">
                        <input className="wf-form-input" value={config.stopLabel || 'Unsub'} onChange={(e) => set('stopLabel', e.target.value)} />
                    </Field>
                </div>
            </>
        ),
        end: () => (
            <>
                <Field label="FINAL STATUS">
                    <Select value={config.status || 'completed'} onChange={(v) => set('status', v)}
                        options={['completed', 'converted', 'cold', 'unsubscribed', 'bounced', 'paused']} />
                </Field>
                <Field label="NOTE">
                    <input className="wf-form-input" value={config.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="Optional note..." />
                </Field>
            </>
        ),
    }

    const FormContent = forms[nodeType]
    if (!FormContent) return <div className="wf-form-info">No configuration available for this node type.</div>

    return <>{FormContent()}</>
}
