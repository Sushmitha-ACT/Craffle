import 'dotenv/config';
import mongoose from 'mongoose';
import { Product } from './server/models/Product.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  
  // Empty the images and videoUrl array for any product that has massive size
  // Since we don't have a reliable way to query size without downloading if $bsonSize is not supported by this MongoDB version,
  // let's just clear ALL images and videoUrl for ALL products EXCEPT the predefined dummy products.
  
  // Or we can just use $set to empty them if the string length is > 100000 characters
  await Product.updateMany(
    { $expr: { $gt: [{ $strLenCP: { $ifNull: ["$videoUrl", ""] } }, 100000] } },
    { $set: { videoUrl: "" } }
  );
  
  console.log('Cleaned up huge videos');

  const products = await Product.find().select('productName images');
  for (const p of products) {
    if (p.images && p.images.length > 0) {
      let changed = false;
      for (let i = 0; i < p.images.length; i++) {
        if (p.images[i] && p.images[i].length > 100000) {
          p.images[i] = "";
          changed = true;
        }
      }
      if (changed) {
        await Product.updateOne({ _id: p._id }, { $set: { images: p.images } });
        console.log('Cleaned huge image for:', p.productName);
      }
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

test().catch(console.error);
