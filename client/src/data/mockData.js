export const MOCK_LEADS = [
    {
        _id: '1',
        name: 'Rahul Sharma',
        email: 'rahul@techcorp.com',
        company: 'TechCorp Inc.',
        position: 'CTO',
        status: 'Contacted',
        tags: ['enterprise', 'tech'],
        workflow: 'Q1 Outbound',
        lastAction: 'Email Sent (2h)'
    },
    {
        _id: '2',
        name: 'Priya Mehta',
        email: 'priya@innovatex.io',
        company: 'InnovateX',
        position: 'VP Sales',
        status: 'Replied',
        tags: ['startup', 'saas'],
        workflow: 'Enterprise Warm',
        lastAction: 'Replied (1d)'
    },
    {
        _id: '3',
        name: 'James Walker',
        email: 'j.walker@globex.com',
        company: 'Globex Ltd',
        position: 'Director',
        status: 'New',
        tags: ['mid-market'],
        workflow: null,
        lastAction: 'Imported (3d)'
    },
    {
        _id: '4',
        name: 'Sara Kim',
        email: 'sara@nexus.io',
        company: 'Nexus Health',
        position: 'Founder',
        status: 'Converted',
        tags: ['healthcare'],
        workflow: 'Medical Q3',
        lastAction: 'Completed (2w)'
    }
]

export const MOCK_CAMPAIGNS = [
    {
        _id: '1',
        name: 'Q1 Outbound Rush',
        status: 'Active',
        stats: { sent: 312, opened: 124, replied: 41, failed: 8, progress: 65 },
        leadIds: [],
        throttle: 10
    },
    {
        _id: '2',
        name: 'Enterprise Warm-Up',
        status: 'Active',
        stats: { sent: 185, opened: 89, replied: 28, failed: 3, progress: 45 },
        leadIds: [],
        throttle: 10
    },
    {
        _id: '3',
        name: 'Medical Q3 Pipeline',
        status: 'Paused',
        stats: { sent: 200, opened: 60, replied: 15, failed: 2, progress: 80 },
        leadIds: [],
        throttle: 10
    },
    {
        _id: '4',
        name: 'SaaS Cold Outreach',
        status: 'Draft',
        stats: { sent: 0, opened: 0, replied: 0, failed: 0, progress: 0 },
        leadIds: [],
        throttle: 10
    }
]

export const CHART_DATA_WEEK = [
    { name: 'MON', value: 82 },
    { name: 'TUE', value: 130 },
    { name: 'WED', value: 170 },
    { name: 'THU', value: 100 },
    { name: 'FRI', value: 190 },
    { name: 'SAT', value: 40 },
    { name: 'SUN', value: 30 }
]

export const MOCK_LOGS = [
    {
        _id: '1',
        timestamp: '09:42:11.402',
        leadName: 'Rahul Sharma (LD-0421)',
        action: 'EMAIL_SENT',
        status: 'SENT',
        detail: 'subject: Intro from ACME',
        latencyMs: 142
    },
    {
        _id: '2',
        timestamp: '09:41:55.120',
        leadName: 'Priya Mehta (LD-0419)',
        action: 'WORKFLOW_START',
        status: 'OK',
        detail: 'workflow: cold_v2',
        latencyMs: 12
    },
    {
        _id: '3',
        timestamp: '09:41:03.004',
        leadName: 'James Walker (LD-0418)',
        action: 'EMAIL_FAILED',
        status: 'FAILED',
        detail: 'SMTP timeout, retry #2',
        latencyMs: 5000
    },
    {
        _id: '4',
        timestamp: '09:40:47.882',
        leadName: 'Sara Kim (LD-0417)',
        action: 'DELAY_ACTIVE',
        status: 'PENDING',
        detail: 'wait: 1.8 days remaining',
        latencyMs: null
    },
    {
        _id: '5',
        timestamp: '09:40:12.115',
        leadName: 'Tom Nguyen (LD-0415)',
        action: 'CONDITION_CHECK',
        status: 'OK',
        detail: 'email opened = true',
        latencyMs: 88
    }
]

export const MOCK_LIVE_FEED = [
    { time: '09:42:11', text: 'Email sent → Rahul Sharma', status: 'SENT', type: 'sent' },
    { time: '09:40:55', text: 'Workflow triggered for 12 leads', status: 'OK', type: 'ok' },
    { time: '09:39:02', text: 'Email failed → retry queued', status: 'FAILED', type: 'failed' },
    { time: '09:37:44', text: 'Delay active → Priya Mehta', status: 'WAIT', type: 'warning' },
    { time: '09:35:10', text: 'LinkedIn DM sent → James Walker', status: 'SENT', type: 'sent' }
]

export const FAKE_LOGS = [
    { text: 'Webhook received → Zapier', status: 'OK', type: 'ok' },
    { text: 'Lead data enriched → Clearbit', status: 'OK', type: 'ok' },
    { text: 'Condition check failed → skipping', status: 'PENDING', type: 'warning' },
    { text: 'Email bounced → mark cold', status: 'FAILED', type: 'failed' },
    { text: 'Follow-up delivered → CEO', status: 'SENT', type: 'sent' }
]
