import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Lead from '../models/Lead.js';
import Log from '../models/Log.js';
import { calculateLeadScore, getScoreLabel } from '../services/leadScoringService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Drop unique index on email if exists
        try {
            await mongoose.connection.collection('leads').dropIndex('email_1');
            console.log('Dropped email unique index');
        } catch (e) { /* index may not exist */ }

        // --- SEED LEADS from leads.csv ---
        const csvPath = path.join(__dirname, '../../../leads.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const leadRows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length < 2) continue;
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            if (!row.Name || !row.Email) continue;
            leadRows.push(row);
        }

        await Lead.deleteMany({});
        console.log('Cleared existing leads');

        const statuses = ['New', 'Contacted', 'Contacted', 'Opened', 'Replied', 'Converted', 'Contacted', 'New', 'Replied'];
        const workflows = ['Q1 Outbound', 'Enterprise', null, 'Q1 Outbound', 'Enterprise', null];
        const lastActions = [
            'Initial Email Sent', 'Follow-up Delivered', 'Email Opened',
            'Reply Received', 'Meeting Scheduled', 'Deal Closed',
            'LinkedIn Message Sent', 'Email Bounced', null
        ];

        // Sample engagement events for demo
        const sampleEngagements = [
            [],
            [{ type: 'email_open', time: new Date(Date.now() - 2 * 86400000) }],
            [{ type: 'email_open', time: new Date(Date.now() - 3 * 86400000) }, { type: 'link_click', time: new Date(Date.now() - 2 * 86400000) }],
            [{ type: 'reply_received', time: new Date(Date.now() - 1 * 86400000) }],
            [{ type: 'email_open', time: new Date(Date.now() - 4 * 86400000) }, { type: 'reply_received', time: new Date(Date.now() - 2 * 86400000) }],
            [],
            [{ type: 'email_open', time: new Date(Date.now() - 1 * 86400000) }],
            [{ type: 'ignored', time: new Date(Date.now() - 5 * 86400000) }],
        ];

        const leadsToInsert = leadRows.map((row, i) => {
            const leadData = {
                name: row.Name,
                email: row.Email.toLowerCase(),
                linkedinUrl: row.LinkedIn || '',
                company: row.Company || '',
                position: row.Role || '',
                industry: row.Industry || '',
                tags: [row.Industry, row.Location].filter(Boolean),
                status: statuses[i % statuses.length],
                workflow: workflows[i % workflows.length],
                lastAction: lastActions[i % lastActions.length],
                engagementHistory: sampleEngagements[i % sampleEngagements.length],
                metadata: new Map([
                    ['linkedin', row.LinkedIn || ''],
                    ['industry', row.Industry || ''],
                    ['location', row.Location || '']
                ])
            };
            // Calculate score
            const score = calculateLeadScore(leadData);
            leadData.score = score;
            leadData.scoreLabel = getScoreLabel(score);
            return leadData;
        });

        await Lead.insertMany(leadsToInsert);
        console.log(`Seeded ${leadsToInsert.length} leads with scores`);

        // --- SEED LOGS with distributed timestamps ---
        await Log.deleteMany({});
        console.log('Cleared existing logs');

        const allLeads = await Lead.find({});
        const logStatuses = ['SENT', 'SENT', 'SENT', 'FAILED', 'PENDING', 'SKIPPED', 'OK', 'OK'];
        const actions = [
            'EMAIL_SENT', 'EMAIL_SENT', 'FOLLOW_UP_SENT',
            'WORKFLOW_START', 'EMAIL_OPENED', 'LINKEDIN_DM',
            'EMAIL_FAILED', 'CONDITION_CHECK', 'REPLY_RECEIVED'
        ];

        const logsToInsert = [];
        const now = Date.now();

        // Create logs spread evenly across last 7 days for good chart data
        for (const lead of allLeads) {
            const numLogs = Math.floor(Math.random() * 6) + 3;
            for (let i = 0; i < numLogs; i++) {
                const status = logStatuses[Math.floor(Math.random() * logStatuses.length)];
                let detail = 'Processed successfully';
                if (status === 'FAILED') detail = 'SMTP timeout — connection rejected';
                if (status === 'SKIPPED') detail = 'Rate limit reached, queued for retry';
                if (status === 'PENDING') detail = 'Waiting in send queue';

                // Spread logs across 7 days — each day gets roughly equal logs
                const dayOffset = Math.floor(Math.random() * 7);
                const hourOffset = Math.floor(Math.random() * 24);
                const minOffset = Math.floor(Math.random() * 60);
                const timestamp = new Date(now - dayOffset * 24 * 60 * 60 * 1000 - hourOffset * 60 * 60 * 1000 - minOffset * 60 * 1000);

                logsToInsert.push({
                    leadId: lead._id,
                    leadName: lead.name,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    status,
                    detail,
                    latencyMs: Math.floor(Math.random() * 500) + 10,
                    createdAt: timestamp
                });
            }
        }

        // System-level logs
        for (let i = 0; i < 20; i++) {
            const dayOffset = Math.floor(Math.random() * 7);
            logsToInsert.push({
                leadName: 'SYSTEM',
                action: 'BATCH_SYNC',
                status: 'OK',
                detail: `Synced ${Math.floor(Math.random() * 100)} records`,
                latencyMs: Math.floor(Math.random() * 200) + 50,
                createdAt: new Date(now - dayOffset * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 12) * 60 * 60 * 1000)
            });
        }

        await Log.insertMany(logsToInsert);
        console.log(`Seeded ${logsToInsert.length} logs`);

        // --- Export seed.json ---
        const seedJsonPath = path.join(__dirname, '../../../seed.json');
        const allLeadsExport = await Lead.find({}).lean();
        const allLogsExport = await Log.find({}).lean();
        fs.writeFileSync(seedJsonPath, JSON.stringify({ leads: allLeadsExport, logs: allLogsExport }, null, 2));
        console.log(`Exported seed.json with ${allLeadsExport.length} leads and ${allLogsExport.length} logs`);

        console.log('\n✅ All seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedAll();
