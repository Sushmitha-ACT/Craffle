import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Order } from './server/models/Order.js';
import { Notification } from './server/models/Notification.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  
  // Delete all orders
  const orderResult = await Order.deleteMany({});
  console.log('Deleted orders count:', orderResult.deletedCount);
  
  // Delete all notifications to keep it clean
  const notifResult = await Notification.deleteMany({});
  console.log('Deleted notifications count:', notifResult.deletedCount);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
