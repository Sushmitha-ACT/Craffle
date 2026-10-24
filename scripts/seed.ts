// @ts-nocheck
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../backend/models/User.js';
import { Seller } from '../backend/models/Seller.js';
import { Product } from '../backend/models/Product.js';
import { Order } from '../backend/models/Order.js';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  console.log('Connected to MongoDB');

  const dbPath = path.join(process.cwd(), 'server', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.log('db.json not found');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  if (data.users) {
    for (const u of data.users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
      }
    }
    console.log(`Migrated ${data.users.length} users`);
  }
  
  if (data.sellers) {
    for (const s of data.sellers) {
      const exists = await Seller.findOne({ id: s.id });
      if (!exists) {
        await Seller.create(s);
      }
    }
    console.log(`Migrated ${data.sellers.length} sellers`);
  }

  if (data.products) {
    for (const p of data.products) {
      const exists = await Product.findOne({ id: p.id });
      if (!exists) {
        try {
          await Product.create(p);
        } catch (e) {
          console.error(`Failed to create product ${p.id}:`, e.message);
        }
      }
    }
    console.log(`Migrated ${data.products.length} products`);
  }

  if (data.orders) {
    for (const o of data.orders) {
      const exists = await Order.findOne({ id: o.id });
      if (!exists) {
        await Order.create(o);
      }
    }
    console.log(`Migrated ${data.orders.length} orders`);
  }

  console.log('Migration Complete!');
  process.exit(0);
}

seed().catch(console.error);
