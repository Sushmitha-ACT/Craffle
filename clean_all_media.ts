import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from './server/models/Product.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  await Product.updateMany({}, { $set: { images: [], videoUrl: '' } });
  console.log('CLEARED ALL IMAGES AND VIDEOS');
  process.exit(0);
}
test().catch(console.error);
