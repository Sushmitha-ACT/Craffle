import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from './server/models/User.js';

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  const users = await User.find({});
  console.log('Users:', users.map(u => ({ email: u.email, hasPassword: !!u.password, pwd: u.password })));
  
  if (users.length > 0 && users[0].password) {
    const isMatch = bcrypt.compareSync('test1234', users[0].password); // just guess
    console.log('Match test1234:', isMatch);
  }
  
  process.exit(0);
}

test();
