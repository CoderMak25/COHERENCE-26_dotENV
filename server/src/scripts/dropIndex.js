import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    try {
        await mongoose.connection.collection('leads').dropIndex('email_1');
        console.log('Dropped email unique index');
    } catch (e) {
        console.log('Index not found (already dropped):', e.message);
    }
    process.exit(0);
};
run();
