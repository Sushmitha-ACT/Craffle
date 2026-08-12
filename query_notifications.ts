import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './server/models/Notification.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  const notifications = await Notification.find({});
  console.log('--- Current Notifications in Database ---');
  console.log(JSON.stringify(notifications, null, 2));
  console.log('Total Count:', notifications.length);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
