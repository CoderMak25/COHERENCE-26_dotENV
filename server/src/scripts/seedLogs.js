import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Lead from '../models/Lead.js';
import Log from '../models/Log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedLogs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Log.deleteMany({});
        console.log('Cleared existing logs');

        const leads = await Lead.find({});
        if (leads.length === 0) {
            console.log('No leads found to attach logs to. Exiting.');
            process.exit(0);
        }

        const statuses = ['SENT', 'FAILED', 'PENDING', 'SKIPPED', 'OK'];
        const actions = ['Sent Initial Email', 'Follow-up Email', 'LinkedIn Connection Request', 'Started Workflow Q1 Outbound'];

        const logs = [];

        // Generate a few random logs for each lead
        for (const lead of leads) {
            const numLogs = Math.floor(Math.random() * 5) + 1;
            for (let i = 0; i < numLogs; i++) {
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                let detail = 'Processed successfully';
                if (status === 'FAILED') detail = 'SMTP timeout or bounce';
                if (status === 'SKIPPED') detail = 'Missing required contact info';

                logs.push({
                    leadId: lead._id,
                    leadName: lead.name,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    status: status,
                    detail: detail,
                    latencyMs: Math.floor(Math.random() * 500) + 10,
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // within last 7 days
                });
            }
        }

        // Add some random generic system logs
        for (let i = 0; i < 10; i++) {
            logs.push({
                leadName: 'SYSTEM',
                action: 'Batch Sync',
                status: 'OK',
                detail: 'Synced 50 records',
                latencyMs: 120,
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000))
            });
        }

        await Log.insertMany(logs);
        console.log(`Successfully seeded ${logs.length} logs.`);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding logs:', error);
        process.exit(1);
    }
};

seedLogs();
