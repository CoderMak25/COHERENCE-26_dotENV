import { create } from 'zustand'
import { NODE_DEFS } from './nodeTypes'
import { workflowsAPI, leadsAPI } from '../../services/api'

let _idCounter = 100

const generateId = () => `n_${++_idCounter}_${Date.now().toString(36)}`

// ─── Realistic log messages per node type ───
const LOG_MESSAGES = {
    trigger_new_lead: (c) => ({ tag: 'TRG', message: `Trigger fired: \`${c.source || 'excel'}\` source` }),
    trigger_form_submit: (c) => ({ tag: 'TRG', message: `Form submitted: \`${c.formId || 'form-1'}\`` }),
    trigger_scheduled: (c) => ({ tag: 'TRG', message: `Scheduled trigger: \`${c.cron || '0 9 * * 1-5'}\`` }),
    trigger_webhook: (c) => ({ tag: 'TRG', message: `Webhook received: \`${c.method || 'POST'} ${c.path || '/webhook'}\`` }),
    trigger_manual: () => ({ tag: 'TRG', message: `Manual trigger fired` }),
    send_email: (c) => ({ tag: 'OUT', message: `Email sent: \`${c.subject || 'Hey {{first_name}}'}\` [${c.template || 'intro'}]` }),
    send_telegram: (c) => ({ tag: 'TG', message: `Telegram sent to \`@${c.username || 'all leads'}\`` }),
    linkedin_dm: () => ({ tag: 'OUT', message: `LinkedIn DM sent to \`Sarah Chen\`` }),
    send_sms: () => ({ tag: 'OUT', message: `SMS sent: \`Hey Sarah, quick update on...\` (142/160 chars)` }),
    whatsapp: () => ({ tag: 'OUT', message: `WhatsApp message delivered to \`+1-555-0142\`` }),
    phone_call: (c) => ({ tag: 'OUT', message: `Call ${c.autoDialer ? 'auto-dialed' : 'logged'}: \`Sarah Chen\`` }),
    slack_alert: (c) => ({ tag: 'OUT', message: `Slack alert sent to \`${c.channel || '#sales-alerts'}\`` }),
    ai_generate: (c) => ({ tag: 'AI', message: `\`${c.model || 'claude-sonnet'}\` generated personalized message (${c.tone || 'professional'} tone)` }),
    ai_score: (c) => ({ tag: 'AI', message: `AI scored lead: \`87/100\` (high-intent) → \`${c.outputField || 'ai_score'}\`` }),
    ai_classify: (c) => ({ tag: 'AI', message: `AI classified: \`${c.task || 'intent'}\` → \`interested\`` }),
    ai_enrich: (c) => ({ tag: 'AI', message: `Enriching lead via \`${c.source || 'clearbit'}\`... company_size: 250, industry: SaaS` }),
    delay: (c) => ({ tag: 'FLW', message: `Delay: \`${c.min || 2}-${c.max || 5} ${c.unit || 'days'}\` (${c.businessHours ? 'business hours' : 'any time'})` }),
    condition: (c) => {
        const branch = Math.random() > 0.5
        return { tag: 'IF', message: `Condition \`${c.field || 'email_opened'} ${c.operator || 'equals'} ${c.value || 'true'}\`: ${branch ? 'YES' : 'NO'}`, branch: branch ? 'yes' : 'no' }
    },
    ab_split: (c) => {
        const branch = Math.random() * 100 < (c.ratioA || 50)
        return { tag: 'A/B', message: `A/B Split (${c.ratioA || 50}/${c.ratioB || 50}): Branch \`${branch ? 'A' : 'B'}\``, branch: branch ? 'a' : 'b' }
    },
    loop: (c) => ({ tag: 'FLW', message: `Iterating over \`${c.field || 'contacts'}\` (${c.maxIterations || 10} max)` }),
    merge: () => ({ tag: 'FLW', message: `Branches merged` }),
    wait_event: (c) => {
        const success = Math.random() > 0.4
        return { tag: 'FLW', message: `Waiting for \`${c.event || 'email_opened'}\` (timeout: ${c.timeoutValue || 3} ${c.timeoutUnit || 'days'}) → ${success ? 'Event received' : 'Timed out'}`, branch: success ? 'success' : 'timeout' }
    },
    update_crm: (c) => ({ tag: 'CRM', message: `${c.crm || 'hubspot'} updated: ${c.action || 'update_stage'} → \`${c.value || 'contacted'}\`` }),
    add_tag: (c) => ({ tag: 'TAG', message: `Tag added: \`${c.tag || 'engaged'}\`` }),
    remove_tag: (c) => ({ tag: 'TAG', message: `Tag removed: \`${c.tag || ''}\`` }),
    set_field: (c) => ({ tag: 'SET', message: `Field \`${c.fieldName || 'status'}\` set to \`${c.value || ''}\`` }),
    http_request: (c) => ({ tag: 'API', message: `${c.method || 'GET'} \`${c.url || 'https://api.example.com'}\` → 200 OK` }),
    throttle: (c) => ({ tag: 'SAF', message: `Throttle check: ${c.maxPerHour || 10}/hr, ${c.maxPerDay || 50}/day → OK` }),
    unsubscribe_check: (c) => {
        const safe = Math.random() > 0.2
        return { tag: 'SAF', message: `Checking ${c.list || 'global'} unsubscribe list... ${safe ? 'Safe to contact' : 'Unsubscribed'}`, branch: safe ? 'safe' : 'unsub' }
    },
    end: (c) => ({ tag: 'END', message: `Workflow ended → Lead status: \`${c.status || 'completed'}\`` }),
}

// ─── Multi-output node types ───
const MULTI_OUTPUT_TYPES = ['condition', 'ab_split', 'wait_event', 'unsubscribe_check']

// ── Default 4-node workflow ──
const DEFAULT_NODES = [
    { id: 'n_102_mmf0zd70', type: 'workflowNode', position: { x: 91.75, y: 50.84 }, data: { nodeType: 'trigger_manual', label: 'Manual Run', enabled: true, config: {} } },
    { id: 'n_104_mmf0zyz7', type: 'workflowNode', position: { x: 91.75, y: 176.46 }, data: { nodeType: 'ai_generate', label: 'AI Write', enabled: true, config: { model: 'claude-sonnet', tone: 'professional', prompt: '', maxTokens: 500 } } },
    { id: 'n_105_mmf1077r', type: 'workflowNode', position: { x: 91.75, y: 299.23 }, data: { nodeType: 'send_email', label: 'Send Email', enabled: true, config: { from: '', replyTo: '', subject: '', template: 'intro', aiPersonalize: false } } },
    { id: 'n_106_mmf10i3m', type: 'workflowNode', position: { x: 90.80, y: 433.72 }, data: { nodeType: 'end', label: 'End', enabled: true, config: { status: 'completed', note: '' } } },
]
const DEFAULT_EDGES = [
    { id: 'e_mmf10plj', source: 'n_102_mmf0zd70', target: 'n_104_mmf0zyz7', type: 'smoothstep', animated: true },
    { id: 'e_mmf10rhv', source: 'n_104_mmf0zyz7', target: 'n_105_mmf1077r', type: 'smoothstep', animated: true },
    { id: 'e_mmf10tkn', source: 'n_105_mmf1077r', target: 'n_106_mmf10i3m', type: 'smoothstep', animated: true },
]

// ── Serialize nodes for API ──
function serializeNodes(nodes) {
    return nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        config: n.data.config || {},
        label: n.data.label,
        enabled: n.data.enabled !== false,
        note: n.data.note || '',
    }))
}

function serializeEdges(edges) {
    return edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || 'out',
        targetHandle: e.targetHandle || 'in',
        label: e.label || e.data?.label || '',
        data: e.data || {},
    }))
}

function deserializeNodes(dbNodes) {
    return (dbNodes || []).map((n) => ({
        id: n.id,
        type: 'workflowNode',
        position: n.position || { x: 100, y: 100 },
        data: {
            nodeType: n.type,
            label: n.label || NODE_DEFS[n.type]?.label || n.type,
            config: n.config || {},
            enabled: n.enabled !== false,
            note: n.note || '',
        },
    }))
}

function deserializeEdges(dbEdges) {
    return (dbEdges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || 'out',
        targetHandle: e.targetHandle || 'in',
        label: e.label || '',
        type: 'workflowEdge',
        data: e.data || {},
    }))
}


const useWorkflowStore = create((set, get) => ({
    // ── Canvas state ──
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
    workflowName: 'Cold Outreach Sequence',

    // ── DB state ──
    workflowId: null,        // current workflow _id in MongoDB
    savedWorkflows: [],      // list from DB
    saving: false,
    loadingList: false,
    dirty: false,            // unsaved changes flag

    // ── Lead assignment ──
    assignedLeads: [],       // lead IDs assigned to this workflow
    allLeads: [],            // all leads from DB
    showLeadPicker: false,

    // ── UI state ──
    selectedNodeId: null,
    selectedEdgeId: null,
    configPanelOpen: false,
    pickerOpen: false,
    pickerPosition: { x: 300, y: 200 },

    // ── Execution ──
    runCount: 0,
    running: false,
    activeNodeId: null,
    logs: [],
    showLog: true,
    _abortController: null,

    // ── Lead Selection ──
    selectedLeadIds: [],
    showLeadSelector: false,

    // ── History ──
    history: [],
    historyIndex: -1,

    // ══════════════════════════════════════
    //  DB OPERATIONS
    // ══════════════════════════════════════

    loadSavedWorkflows: async () => {
        set({ loadingList: true })
        try {
            const res = await workflowsAPI.getAll()
            set({ savedWorkflows: res.data || res || [], loadingList: false })
        } catch (err) {
            console.error('Failed to load workflows:', err)
            set({ loadingList: false })
        }
    },

    loadWorkflowFromDB: async (id) => {
        try {
            const wf = await workflowsAPI.getOne(id)
            const nodes = deserializeNodes(wf.nodes)
            const edges = deserializeEdges(wf.edges)
            set({
                workflowId: wf._id,
                workflowName: wf.name,
                nodes,
                edges,
                assignedLeads: (wf.assignedLeads || []).map(l => typeof l === 'object' ? l._id : l),
                history: [],
                dirty: false,
                configPanelOpen: false,
                selectedNodeId: null,
            })
        } catch (err) {
            console.error('Failed to load workflow:', err)
        }
    },

    saveWorkflowToDB: async () => {
        const { workflowId, nodes, edges, workflowName, assignedLeads } = get()
        set({ saving: true })
        try {
            const payload = {
                name: workflowName,
                nodes: serializeNodes(nodes),
                edges: serializeEdges(edges),
                assignedLeads,
            }
            let saved
            if (workflowId) {
                saved = await workflowsAPI.update(workflowId, payload)
            } else {
                saved = await workflowsAPI.save(payload)
            }
            set({
                workflowId: saved._id,
                saving: false,
                dirty: false,
            })
            // Refresh list
            get().loadSavedWorkflows()
            return saved
        } catch (err) {
            console.error('Failed to save workflow:', err)
            set({ saving: false })
            throw err
        }
    },

    createNewWorkflow: async (name) => {
        set({ saving: true })
        try {
            const payload = {
                name: name || 'New Workflow',
                nodes: [],
                edges: [],
                assignedLeads: [],
            }
            const saved = await workflowsAPI.save(payload)
            set({
                workflowId: saved._id,
                workflowName: saved.name,
                nodes: [],
                edges: [],
                assignedLeads: [],
                history: [],
                dirty: false,
                saving: false,
                configPanelOpen: false,
                selectedNodeId: null,
            })
            get().loadSavedWorkflows()
            return saved
        } catch (err) {
            console.error('Failed to create workflow:', err)
            set({ saving: false })
        }
    },

    deleteWorkflowFromDB: async (id) => {
        try {
            await workflowsAPI.remove(id)
            const { workflowId } = get()
            if (workflowId === id) {
                // Reset canvas
                set({
                    workflowId: null,
                    workflowName: 'Untitled Workflow',
                    nodes: [],
                    edges: [],
                    assignedLeads: [],
                    history: [],
                    dirty: false,
                })
            }
            get().loadSavedWorkflows()
        } catch (err) {
            console.error('Failed to delete workflow:', err)
        }
    },

    // ══════════════════════════════════════
    //  LEAD OPERATIONS
    // ══════════════════════════════════════

    fetchLeads: async () => {
        try {
            const res = await leadsAPI.getAll({ limit: 9999 })
            set({ allLeads: res.data || res || [] })
        } catch (err) {
            console.error('Failed to fetch leads:', err)
        }
    },

    toggleLeadAssignment: (leadId) => {
        set((s) => {
            const exists = s.assignedLeads.includes(leadId)
            return {
                assignedLeads: exists
                    ? s.assignedLeads.filter((id) => id !== leadId)
                    : [...s.assignedLeads, leadId],
                dirty: true,
            }
        })
    },

    setAssignedLeads: (ids) => set({ assignedLeads: ids, dirty: true }),

    toggleLeadPicker: () => set((s) => ({ showLeadPicker: !s.showLeadPicker })),
    closeLeadPicker: () => set({ showLeadPicker: false }),

    executeOnLeads: async () => {
        const { workflowId, assignedLeads, allLeads, dirty } = get()
        if (!workflowId) {
            alert('Save the workflow first before executing.')
            return
        }
        if (assignedLeads.length === 0) {
            alert('Assign at least one lead to this workflow.')
            return
        }

        const time = () => new Date().toLocaleTimeString('en-US', { hour12: false })
        set({ running: true, logs: [], showLog: true, runCount: get().runCount + 1 })

        // Auto-save if there are unsaved changes
        if (dirty) {
            get().appendLog({ time: time(), tag: 'SYS', message: 'Auto-saving workflow before execution...' })
            try {
                await get().saveWorkflowToDB()
            } catch (err) {
                get().appendLog({ time: time(), tag: 'ERR', message: `Auto-save failed: ${err.message || err}` })
                set({ running: false })
                return
            }
        }

        get().appendLog({ time: time(), tag: 'SYS', message: `Executing workflow on ${assignedLeads.length} leads...` })

        // Log each lead's details
        for (const leadId of assignedLeads) {
            const lead = allLeads.find(l => l._id === leadId)
            if (lead) {
                get().appendLog({
                    time: time(),
                    tag: 'USR',
                    message: `→ ${lead.name} (${lead.email || 'no email'})${lead.company ? ` @ ${lead.company}` : ''}`
                })
            }
        }

        get().appendLog({ time: time(), tag: 'SYS', message: `Sending FROM: env configured email address` })

        try {
            const res = await workflowsAPI.execute(get().workflowId, assignedLeads)
            get().appendLog({ time: time(), tag: 'SYS', message: `✓ Queued ${res.queued || assignedLeads.length} leads for execution` })

            // Show individual lead confirmations from API
            if (res.leads && Array.isArray(res.leads)) {
                for (const lead of res.leads) {
                    get().appendLog({
                        time: time(),
                        tag: 'OUT',
                        message: `Queued: ${lead.name} → ${lead.email} (unique AI message will be generated)`
                    })
                }
            }

            get().appendLog({ time: time(), tag: 'SYS', message: `Workflow status: ACTIVE — each lead gets a unique personalized message` })
            set({ running: false })
            get().loadSavedWorkflows()
        } catch (err) {
            const msg = err?.error || err?.message || JSON.stringify(err)
            get().appendLog({ time: time(), tag: 'ERR', message: `Execution failed: ${msg}` })
            set({ running: false })
        }
    },

    // ══════════════════════════════════════
    //  CANVAS ACTIONS (unchanged)
    // ══════════════════════════════════════

    setNodes: (nodesOrFn) => set((state) => ({
        nodes: typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn,
        dirty: true,
    })),
    setEdges: (edgesOrFn) => set((state) => ({
        edges: typeof edgesOrFn === 'function' ? edgesOrFn(state.edges) : edgesOrFn,
        dirty: true,
    })),
    setSelectedLeadIds: (idsOrFn) => set((state) => ({
        selectedLeadIds: typeof idsOrFn === 'function' ? idsOrFn(state.selectedLeadIds) : idsOrFn,
    })),
    toggleLeadSelector: () => set((s) => ({ showLeadSelector: !s.showLeadSelector })),
    onNodesChange: (changes) => {
        const { nodes } = get()
        const updated = applyNodeChanges(changes, nodes)
        set({ nodes: updated, dirty: true })
    },

    setWorkflowName: (name) => set({ workflowName: name, dirty: true }),

    setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

    openConfigPanel: (nodeId) => set({ configPanelOpen: true, selectedNodeId: nodeId }),
    closeConfigPanel: () => set({ configPanelOpen: false }),

    openPicker: (pos) => set({ pickerOpen: true, pickerPosition: pos }),
    closePicker: () => set({ pickerOpen: false }),

    toggleLog: () => set((s) => ({ showLog: !s.showLog })),

    // ── Node CRUD ──
    addNode: (typeKey, position) => {
        const def = NODE_DEFS[typeKey]
        if (!def) return
        const id = generateId()
        const newNode = {
            id,
            type: 'workflowNode',
            position,
            data: {
                nodeType: typeKey,
                label: def.label,
                config: { ...def.defaultConfig },
                enabled: true,
                note: '',
            },
        }
        get().pushHistory()
        set((s) => ({ nodes: [...s.nodes, newNode], dirty: true }))
        return id
    },

    deleteNode: (id) => {
        get().pushHistory()
        set((s) => ({
            nodes: s.nodes.filter((n) => n.id !== id),
            edges: s.edges.filter((e) => e.source !== id && e.target !== id),
            selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
            configPanelOpen: s.selectedNodeId === id ? false : s.configPanelOpen,
            dirty: true,
        }))
    },

    updateNodeConfig: (id, config) => {
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
            ),
            dirty: true,
        }))
    },

    updateNodeData: (id, data) => {
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...data } } : n
            ),
            dirty: true,
        }))
    },

    duplicateNode: (id) => {
        const { nodes } = get()
        const node = nodes.find((n) => n.id === id)
        if (!node) return
        const newId = generateId()
        get().pushHistory()
        set((s) => ({
            nodes: [
                ...s.nodes,
                {
                    ...node,
                    id: newId,
                    position: { x: node.position.x + 40, y: node.position.y + 40 },
                    data: { ...node.data, config: { ...node.data.config } },
                },
            ],
            dirty: true,
        }))
    },

    toggleNodeEnabled: (id) => {
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, enabled: !n.data.enabled } } : n
            ),
            dirty: true,
        }))
    },

    // ── Edge CRUD ──
    addEdge: (edge) => {
        get().pushHistory()
        set((s) => ({ edges: [...s.edges, edge], dirty: true }))
    },

    deleteEdge: (id) => {
        get().pushHistory()
        set((s) => ({
            edges: s.edges.filter((e) => e.id !== id),
            selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
            dirty: true,
        }))
    },

    // ── History ──
    pushHistory: () => {
        const { nodes, edges, history } = get()
        const snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
        const newHistory = [...history, snapshot].slice(-30)
        set({ history: newHistory })
    },

    undo: () => {
        const { history } = get()
        if (history.length === 0) return
        const last = history[history.length - 1]
        set({
            nodes: last.nodes,
            edges: last.edges,
            history: history.slice(0, -1),
            dirty: true,
        })
    },

    // ── Execution Log ──
    appendLog: (entry) => set((s) => ({ logs: [...s.logs, entry] })),
    clearLogs: () => set({ logs: [] }),

    // ── Legacy saveWorkflow (JSON download) ──
    saveWorkflowJSON: () => {
        const { nodes, edges, workflowName } = get()
        const wf = {
            id: `wf_${Date.now().toString(36)}`,
            name: workflowName,
            meta: { created: new Date().toISOString(), version: '2.0' },
            nodes: nodes.map((n) => ({
                id: n.id,
                type: n.data.nodeType,
                label: n.data.label,
                enabled: n.data.enabled,
                note: n.data.note || '',
                config: n.data.config,
                position: n.position,
            })),
            edges: edges.map((e) => ({
                id: e.id,
                from: e.source,
                to: e.target,
                fromPort: e.sourceHandle || 'out',
                toPort: e.targetHandle || 'in',
                label: e.label || '',
            })),
        }
        const blob = new Blob([JSON.stringify(wf, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`
        a.click()
        URL.revokeObjectURL(url)
    },

    loadWorkflow: (json) => {
        try {
            const wf = typeof json === 'string' ? JSON.parse(json) : json
            const nodes = wf.nodes.map((n) => ({
                id: n.id,
                type: 'workflowNode',
                position: n.position,
                data: {
                    nodeType: n.type,
                    label: n.label,
                    config: n.config || {},
                    enabled: n.enabled !== false,
                    note: n.note || '',
                },
            }))
            const edges = wf.edges.map((e) => ({
                id: e.id,
                source: e.from,
                target: e.to,
                sourceHandle: e.fromPort || 'out',
                targetHandle: e.toPort || 'in',
                label: e.label || '',
                type: 'workflowEdge',
            }))
            set({
                nodes,
                edges,
                workflowName: wf.name || 'Imported Workflow',
                history: [],
                dirty: false,
            })
        } catch (err) {
            console.error('Failed to load workflow:', err)
        }
    },

    // ── Run Simulation (offline preview) ──
    runSimulation: async () => {
        const { nodes, edges } = get()
        if (nodes.length === 0) return

        set({ running: true, logs: [], activeNodeId: null, showLog: true, runCount: get().runCount + 1 })

        const triggerNode = nodes.find((n) => {
            const def = NODE_DEFS[n.data.nodeType]
            return def && def.inputs === 0
        }) || nodes[0]

        const visited = new Set()
        const queue = [triggerNode.id]

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

        while (queue.length > 0) {
            const currentId = queue.shift()
            if (visited.has(currentId)) continue
            visited.add(currentId)

            const node = nodes.find((n) => n.id === currentId)
            if (!node) continue

            const def = NODE_DEFS[node.data.nodeType]
            if (!def) continue

            if (!node.data.enabled) {
                get().appendLog({
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    tag: '--',
                    message: `Skipped \`${node.data.label}\` (disabled)`,
                })
                const outEdges = edges.filter((e) => e.source === currentId)
                outEdges.forEach((e) => queue.push(e.target))
                continue
            }

            set({ activeNodeId: currentId })
            await sleep(800)

            const logFn = LOG_MESSAGES[node.data.nodeType]
            let logResult = logFn ? logFn(node.data.config) : { tag: '--', message: `Executed ${node.data.label}` }
            let chosenBranch = null

            if (logResult.branch) {
                chosenBranch = logResult.branch
            }

            get().appendLog({
                time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                tag: logResult.tag || '--',
                message: logResult.message || '',
            })

            const outEdges = edges.filter((e) => e.source === currentId)

            if (MULTI_OUTPUT_TYPES.includes(node.data.nodeType) && chosenBranch) {
                const chosenEdge = outEdges.find((e) => e.sourceHandle === chosenBranch)
                if (chosenEdge) queue.push(chosenEdge.target)
            } else {
                outEdges.forEach((e) => queue.push(e.target))
            }

            await sleep(400)
        }

        set({ running: false, activeNodeId: null })
    },

    // ── Run Backend Workflow (POST + SSE streaming) ──
    runBackendWorkflow: async () => {
        if (get().running) return // guard: execute only once

        set({ running: true, logs: [], showLog: true, runCount: get().runCount + 1 })

        const time = () => new Date().toLocaleTimeString('en-US', { hour12: false })
        get().appendLog({ time: time(), tag: 'SYS', message: 'Sending workflow graph to backend...' })

        // Build workflow payload from canvas nodes/edges
        const { nodes, edges, selectedLeadIds } = get()
        const payload = {
            workflow: {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.data?.nodeType || n.type,
                    config: n.data?.config || {},
                    enabled: n.data?.enabled !== false,
                })),
                edges: edges.map(e => ({
                    id: e.id,
                    from: e.source,
                    to: e.target,
                    fromPort: e.sourceHandle || '0',
                })),
            },
            // If specific leads selected, send their IDs
            ...(selectedLeadIds.length > 0 ? { leadIds: selectedLeadIds } : {}),
        }

        const controller = new AbortController()
        set({ _abortController: controller })

        try {
            const res = await fetch('http://localhost:5000/api/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Parse SSE events from buffer
                const lines = buffer.split('\n')
                buffer = lines.pop() // keep incomplete line in buffer

                let eventType = null
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim()
                    } else if (line.startsWith('data: ') && eventType) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (eventType === 'log') {
                                get().appendLog({ time: time(), tag: data.tag || '--', message: data.message })
                            } else if (eventType === 'done') {
                                // Workflow complete
                            } else if (eventType === 'error') {
                                get().appendLog({ time: time(), tag: 'ERR', message: data.message })
                            }
                        } catch { }
                        eventType = null
                    } else if (line === '') {
                        eventType = null
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                get().appendLog({ time: time(), tag: 'ERR', message: `Backend error: ${err.message}` })
            }
        }

        set({ running: false, _abortController: null })
    },

    // ── Stop execution ──
    stopWorkflow: () => {
        const controller = get()._abortController
        if (controller) {
            controller.abort()
            const time = () => new Date().toLocaleTimeString('en-US', { hour12: false })
            get().appendLog({ time: time(), tag: 'SYS', message: 'Execution stopped by user' })
        }
        set({ running: false, _abortController: null })
    },
}))

// Simple applyNodeChanges helper
function applyNodeChanges(changes, nodes) {
    let result = [...nodes]
    for (const change of changes) {
        if (change.type === 'position' && change.position) {
            result = result.map((n) =>
                n.id === change.id ? { ...n, position: change.position } : n
            )
        } else if (change.type === 'remove') {
            result = result.filter((n) => n.id !== change.id)
        } else if (change.type === 'select') {
            // handled by our own selection logic
        }
    }
    return result
}

export default useWorkflowStore
