import mongoose from 'mongoose';
import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Lead from '../models/Lead.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const seedLeads = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully.');

        console.log('Clearing existing leads...');
        await Lead.deleteMany({});
        console.log('Existing leads cleared.');

        const leads = [];
        const csvPath = path.join(__dirname, '../../../leads.csv');

        console.log(`Reading CSV file from: ${csvPath}`);
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row) => {
                // Determine email (fallback to dummy if empty)
                let email = row.Email ? row.Email.trim() : '';
                if (!email) {
                    const namePart = row.Name ? row.Name.replace(/\s+/g, '.').toLowerCase() : `user${Math.floor(Math.random() * 10000)}`;
                    email = `${namePart}@dummy.com`;
                }

                // Map row data to the database schema
                leads.push({
                    name: row.Name || 'Unknown Lead',
                    email: email,
                    company: row.Company || '',
                    position: row.Role || '',
                    metadata: {
                        LinkedIn: row.LinkedIn || '',
                        Industry: row.Industry || '',
                        Location: row.Location || ''
                    },
                    status: 'New'
                });
            })
            .on('end', async () => {
                console.log(`Parsed ${leads.length} leads from CSV.`);
                try {
                    await Lead.insertMany(leads);
                    console.log('Leads successfully seeded to the database!');
                } catch (insertError) {
                    console.error('Error inserting leads:', insertError);
                } finally {
                    mongoose.connection.close();
                    process.exit(0);
                }
            });
    } catch (error) {
        console.error('Seeding failed:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedLeads();
