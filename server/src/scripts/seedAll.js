import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Lead from '../models/Lead.js';
import Log from '../models/Log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

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
            if (!row.Name || !row.Email) continue; // skip rows without name or email
            leadRows.push(row);
        }

        await Lead.deleteMany({});
        console.log('Cleared existing leads');

        const statuses = ['New', 'Contacted', 'Opened', 'Replied', 'Converted'];
        const workflows = ['Q1 Outbound', 'Enterprise', null, null];

        const leadsToInsert = leadRows.map((row, i) => ({
            name: row.Name,
            email: row.Email.toLowerCase(),
            company: row.Company || '',
            position: row.Role || '',
            tags: [row.Industry, row.Location].filter(Boolean),
            status: statuses[i % statuses.length],
            workflow: workflows[i % workflows.length],
            lastAction: i % 3 === 0 ? 'Sent Initial Email' : i % 3 === 1 ? 'Follow-up Sent' : null,
            metadata: new Map([
                ['linkedin', row.LinkedIn || ''],
                ['industry', row.Industry || ''],
                ['location', row.Location || '']
            ])
        }));

        await Lead.insertMany(leadsToInsert);
        console.log(`Seeded ${leadsToInsert.length} leads`);

        // --- SEED LOGS ---
        await Log.deleteMany({});
        console.log('Cleared existing logs');

        const allLeads = await Lead.find({});
        const logStatuses = ['SENT', 'FAILED', 'PENDING', 'SKIPPED', 'OK'];
        const actions = [
            'Sent Initial Email',
            'Follow-up Email',
            'LinkedIn Connection Request',
            'Started Workflow Q1 Outbound',
            'Email Opened',
            'Profile Viewed'
        ];

        const logsToInsert = [];

        for (const lead of allLeads) {
            const numLogs = Math.floor(Math.random() * 5) + 2;
            for (let i = 0; i < numLogs; i++) {
                const status = logStatuses[Math.floor(Math.random() * logStatuses.length)];
                let detail = 'Processed successfully';
                if (status === 'FAILED') detail = 'SMTP timeout — recipient server rejected connection';
                if (status === 'SKIPPED') detail = 'Rate limit reached, will retry later';
                if (status === 'PENDING') detail = 'Queued for delivery';

                logsToInsert.push({
                    leadId: lead._id,
                    leadName: lead.name,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    status,
                    detail,
                    latencyMs: Math.floor(Math.random() * 500) + 10,
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
                });
            }
        }

        // System-level logs
        for (let i = 0; i < 15; i++) {
            logsToInsert.push({
                leadName: 'SYSTEM',
                action: 'Batch Sync',
                status: 'OK',
                detail: `Synced ${Math.floor(Math.random() * 100)} records`,
                latencyMs: Math.floor(Math.random() * 200) + 50,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000))
            });
        }

        await Log.insertMany(logsToInsert);
        console.log(`Seeded ${logsToInsert.length} logs`);

        // --- Export seed.json for MongoDB Compass ---
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
