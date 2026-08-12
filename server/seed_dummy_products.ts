import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config({ path: '../.env' });

import { Product } from './models/Product.js';
import { Seller } from './models/Seller.js';
import { User } from './models/User.js';
import { Review } from './models/Review.js';

const MONGODB_URI = process.env.MONGODB_URI;

export async function seedDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');
  }

  // Wipe products, reviews, and dummy sellers
  await Product.deleteMany({});
  await Review.deleteMany({});
  await Seller.deleteMany({ businessName: /Dummy Seller/ });
  console.log('Cleared existing dummy data');

  // Create a customer user for reviews
  let customerUser = await User.findOne({ email: 'dummy.customer@example.com' } as any);
  if (!customerUser) {
    customerUser = await User.create({
      name: 'Happy Customer',
      email: 'dummy.customer@example.com',
      role: 'CUSTOMER',
      password: 'hash'
    } as any);
  }

  // Create Dummy Seller
  let user = await User.findOne({ email: 'dummy2.seller@example.com' } as any);
  if (!user) {
    user = await User.create({
      name: 'Dummy Seller',
      email: 'dummy2.seller@example.com',
      role: 'SELLER',
      password: 'hash'
    } as any);
  }

  let seller = await Seller.create({
    userId: user._id,
    businessName: 'Dummy Seller Shop',
    governmentId: '000000000000',
    governmentIdImage: '/placeholder.jpg',
    address: 'Vadapalani, Chennai',
    verificationStatus: 'Approved',
    bankDetails: '000000 HDFC0000',
    latitude: '13.0500', // Real Vadapalani Coordinates
    longitude: '80.2121'
  } as any);
  console.log('Created dummy seller');

  // Dummy Images
  const img1 = 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&w=600&q=80';
  const img2 = 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=600&q=80';
  const img3 = 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80';
  const video = 'https://www.w3schools.com/html/mov_bbb.mp4';

  const dummyProducts = [
    {
      productName: 'Handmade Lavender Soap (Pickup & Delivery)',
      category: 'Beauty & Personal Care',
      description: 'Organic lavender soap made with essential oils.\n\nGreat for skin and completely natural.',
      price: 150,
      stock: 20,
      images: [img1, img2, img3],
      videoUrl: video,
      pickupAvailable: true,
      deliveryAvailable: true,
      rating: 4.8,
      totalReviews: 2,
      location: { type: 'Point' as const, coordinates: [80.2121, 13.0500] } // Vadapalani
    },
    {
      productName: 'Silver Beaded Necklace (Delivery Only)',
      category: 'Jewelry & Accessories',
      description: 'Elegant handmade silver beaded necklace perfect for any occasion.',
      price: 850,
      stock: 5,
      images: [img2, img3, img1],
      videoUrl: video,
      pickupAvailable: false,
      deliveryAvailable: true,
      rating: 5.0,
      totalReviews: 0,
      location: { type: 'Point' as const, coordinates: [80.2121, 13.0500] }
    },
    {
      productName: 'Macrame Wall Hanging (Pickup Only)',
      category: 'Home Decor',
      description: 'Boho style macrame wall hanging, 100% cotton cord.',
      price: 1200,
      stock: 2,
      images: [img3, img1, img2],
      videoUrl: video,
      pickupAvailable: true,
      deliveryAvailable: false,
      rating: 0,
      totalReviews: 0,
      location: { type: 'Point' as const, coordinates: [80.2121, 13.0500] }
    }
  ];

  for (const p of dummyProducts) {
    const prod = await Product.create({
      ...p,
      sellerId: seller._id,
    } as any);
    
    // Add reviews if totalReviews > 0
    if (p.totalReviews > 0 && customerUser && prod) {
      await Review.create({
        productId: prod._id,
        customerId: customerUser._id,
        rating: 5,
        comment: 'Very good quality! Highly recommend.',
        images: [img1]
      });
      await Review.create({
        productId: prod._id,
        customerId: customerUser._id,
        rating: 4,
        comment: 'Exactly as shown.',
        images: []
      });
    }
  }

  console.log(`Inserted ${dummyProducts.length} dummy products`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => mongoose.disconnect()).catch(console.error);
}
