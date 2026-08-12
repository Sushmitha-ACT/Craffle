import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './server/models/Notification.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  
  // Find one unread notification
  const notif = await Notification.findOne({ isRead: false });
  if (!notif) {
    console.log('No unread notifications found!');
    process.exit(0);
  }
  
  console.log('Found unread notif:', notif._id.toString());
  
  // Test updating
  const updated = await Notification.findByIdAndUpdate(notif._id, { isRead: true }, { new: true });
  console.log('Updated doc:', updated);
  
  const verified = await Notification.findById(notif._id);
  console.log('Verified from DB:', verified);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
