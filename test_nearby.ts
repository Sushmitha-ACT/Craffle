import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './server/models/Product.js';

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle');
  
  const lat = 13.05;
  const lng = 80.19;
  const radius = 5;

  const products = await Product.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "calculatedDistance",
        maxDistance: radius * 1000,
        spherical: true
      }
    },
    { $match: { status: 'Available' } }
  ]);
  
  console.log('Nearby products found:', products.length);
  if (products.length > 0) {
     console.log('First product location:', products[0].location);
  } else {
     const allProducts = await Product.find({});
     console.log('Total products in DB:', allProducts.length);
     if (allProducts.length > 0) {
       console.log('First product location in DB:', allProducts[0].location);
     }
  }
  process.exit(0);
}

test();
