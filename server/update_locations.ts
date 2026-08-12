import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Product } from './models/Product';
import { Seller } from './models/Seller';

const MONGODB_URI = process.env.MONGODB_URI;

async function updateLocations() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  // We'll scatter the products near Navalur
  const baseLat = 12.845;
  const baseLng = 80.226;

  const products = await Product.find();
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    // Offset by roughly -0.02 to +0.02 degrees (approx -2km to +2km)
    const latOffset = (Math.random() - 0.5) * 0.04;
    const lngOffset = (Math.random() - 0.5) * 0.04;
    
    p.location = {
      type: 'Point',
      coordinates: [baseLng + lngOffset, baseLat + latOffset]
    };
    await p.save();
  }

  console.log(`Updated locations for ${products.length} products to be near Saligramam.`);
  
  const sellers = await Seller.find();
  for (let s of sellers) {
    s.latitude = (baseLat + 0.01).toString();
    s.longitude = (baseLng + 0.01).toString();
    await s.save();
  }
  
  console.log('Updated sellers locations as well.');

  mongoose.disconnect();
}

updateLocations().catch(console.error);
