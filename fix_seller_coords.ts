import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { Seller } from './server/models/Seller.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixSellerCoords() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sellers = await Seller.find();
  
  for (const seller of sellers) {
    if (seller.address) {
      console.log(`Fixing coordinates for: ${seller.businessName} (${seller.address})`);
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(seller.address)}`, {
          headers: { 'User-Agent': 'CraffleApp/1.0' }
        });
        const geoData = await geoRes.json() as any[];
        
        if (geoData && geoData.length > 0) {
          const lat = geoData[0].lat;
          const lng = geoData[0].lon;
          
          await Seller.findByIdAndUpdate(seller._id, {
            latitude: lat,
            longitude: lng
          });
          console.log(`✅ Updated to ${lat}, ${lng}`);
        } else {
          console.log(`❌ Could not geocode address.`);
        }
      } catch (e) {
        console.log(`❌ Error: ${e.message}`);
      }
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.log('Done fixing seller coordinates!');
  process.exit();
}

fixSellerCoords();
