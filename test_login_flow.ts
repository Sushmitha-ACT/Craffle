import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './server/models/User.js';

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  
  const email = 'selvi123@gmail.com'; // or whichever one we want to test
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) { console.log('no user'); return; }
    
    console.log('User found:', user.email);
    
    let seller = null;
    if (user.role === 'SELLER') {
      console.log('trying to import Seller.js');
      try {
        const { Seller } = await import('./server/models/Seller.js');
        const sellerDoc = await Seller.findOne({ userId: user._id });
        if (sellerDoc) seller = { ...sellerDoc.toObject(), id: sellerDoc._id.toString() };
        console.log('Seller imported successfully', seller);
      } catch (e) {
        console.error('Failed to import seller:', e);
      }
    }
  } catch (e) {
    console.error('General error:', e);
  }
  
  process.exit(0);
}

test();
