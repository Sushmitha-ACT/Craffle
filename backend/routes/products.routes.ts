// @ts-nocheck
import express from 'express';
import { locationService } from '../services/locationService.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { User } from '../models/User.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function saveBase64File(base64Data: string, prefix: string): string {
  if (!base64Data || !base64Data.startsWith('data:')) {
    return base64Data;
  }
  
  const matches = base64Data.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return base64Data;
  }
  
  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  // Get extension
  let ext = 'bin';
  if (type.includes('mp4')) ext = 'mp4';
  else if (type.includes('webm')) ext = 'webm';
  else if (type.includes('png')) ext = 'png';
  else if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg';
  else if (type.includes('gif')) ext = 'gif';
  
  const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

// Get all available products (for homepage)
router.get('/api/products', async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat as string);
    const userLng = parseFloat((req.query.lon || req.query.lng) as string);

    const products = await Product.find({ status: 'Available' }).sort({ createdAt: -1, _id: -1 }).populate('sellerId').lean();
    
    const mapped = products.map((p: any) => {
      let distance = undefined;
      const seller = p.sellerId as any;
      if (!isNaN(userLat) && !isNaN(userLng)) {
        let targetLat, targetLng;
        if (p.location && p.location.coordinates && p.location.coordinates.length === 2 && (p.location.coordinates[0] !== 0 || p.location.coordinates[1] !== 0)) {
          targetLng = p.location.coordinates[0];
          targetLat = p.location.coordinates[1];
        } else if (seller && seller.latitude && seller.longitude) {
          targetLat = parseFloat(seller.latitude);
          targetLng = parseFloat(seller.longitude);
        }
        if (targetLat && targetLng) {
          distance = locationService.calculateDistance(userLat, userLng, targetLat, targetLng);
        }
      }

      return {
        ...p,
        id: p._id.toString(),
        name: p.productName,
        sellerName: seller?.businessName || 'Local Creator',
        sellerId: seller?._id ? seller._id.toString() : p.sellerId?.toString(),
        distance
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('Error in GET /api/products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get products near a location
router.get('/api/products/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5; // default 5km

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required' });
    }

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
    
    // We would ideally populate sellerId, but aggregation needs $lookup. For now map directly.
    const mapped = products.map((p: any) => ({ 
      ...p, 
      id: p._id.toString(), 
      name: p.productName,
      distance: (p.calculatedDistance / 1000).toFixed(1) // in km
    }));
    
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch nearby products: ' + err.message });
  }
});

// Get a single product by ID
router.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId').lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const { Review } = await import('../models/Review.js');
    const reviews = await Review.find({ productId: req.params.id }).populate('customerId', 'name').lean();
    
    const mappedReviews = reviews.map((r: any) => ({
       id: r._id.toString(),
       customerName: r.customerId?.name || 'Anonymous',
       rating: r.rating,
       comment: r.comment,
       images: r.images,
       createdAt: r.createdAt
    }));
    
    const seller = product.sellerId as any;
    
    const userLat = parseFloat(req.query.lat as string);
    const userLng = parseFloat((req.query.lng || req.query.lon) as string);
    let distance = undefined;
    let deliveryEstimate = undefined;
    
    if (!isNaN(userLat) && !isNaN(userLng)) {
       let targetLat, targetLng;
       if (product.location && product.location.coordinates && product.location.coordinates.length === 2 && (product.location.coordinates[0] !== 0 || product.location.coordinates[1] !== 0)) {
           targetLng = product.location.coordinates[0];
           targetLat = product.location.coordinates[1];
       } else if (seller && seller.latitude && seller.longitude && !isNaN(parseFloat(seller.latitude)) && !isNaN(parseFloat(seller.longitude))) {
           targetLat = parseFloat(seller.latitude);
           targetLng = parseFloat(seller.longitude);
       } else {
           // Fallback default coordinates for Chennai
           targetLat = 13.0500;
           targetLng = 80.2121;
       }
       
       if (targetLat && targetLng) {
           distance = locationService.calculateDistance(userLat, userLng, targetLat, targetLng);
           console.log('DEBUG: distance calculated =', distance, { targetLat, targetLng, userLat, userLng });
           
           if (distance !== undefined) {
               deliveryEstimate = 'Delivery available';
           }
       }
    }
    
    const mapped = { 
       ...(product as any), 
       id: (product as any)._id.toString(), 
       name: (product as any).productName, 
       sellerName: seller?.businessName,
       seller: seller ? {
           address: seller.address,
           rating: seller.rating,
           totalReviews: seller.totalReviews,
           latitude: seller.latitude,
           longitude: seller.longitude,
           deliveryRadius: seller.deliveryRadius
       } : null,
       reviews: mappedReviews,
       distance,
       deliveryEstimate,
       sellerId: seller ? seller._id.toString() : undefined
    };
    
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get products by specific seller
router.get('/api/seller/products/:sellerId', async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 }).lean();
    const mapped = products.map((p: any) => ({ ...p, id: p._id.toString(), name: p.productName }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
});

// Add a new product (Seller only)
router.post('/api/seller/products/add', async (req, res) => {
  try {
    const { sellerId, name, category, description, price, stock, images, videoUrl, pickupAvailable, deliveryAvailable, status } = req.body;

    if (!sellerId || !name || !category || !description || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Please enter all required product details' });
    }
    
    if (!images || images.length < 3) {
      return res.status(400).json({ error: 'At least 3 images are required' });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller || seller.verificationStatus !== 'Approved') {
      return res.status(403).json({ error: 'Approved seller profile required to add products' });
    }

    const savedImages = images.map((img: string, idx: number) => saveBase64File(img, `img_${idx}`));
    const savedVideo = saveBase64File(videoUrl, 'vid');

    let location = { type: 'Point', coordinates: [80.2265, 12.8456] };
    if (seller.latitude && seller.longitude) {
      const sLat = parseFloat(seller.latitude);
      const sLng = parseFloat(seller.longitude);
      if (!isNaN(sLat) && !isNaN(sLng)) {
        location = { type: 'Point', coordinates: [sLng, sLat] };
      }
    }

    const newProduct = await Product.create({
      sellerId,
      productName: name,
      category,
      description,
      price: Number(price),
      stock: Number(stock),
      images: savedImages,
      videoUrl: savedVideo || '',
      pickupAvailable,
      deliveryAvailable,
      status: status || 'Available',
      location,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product: ' + err.message });
  }
});

// Edit a product (Seller only)
router.put('/api/seller/products/edit/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.name) {
      updateData.productName = updateData.name;
      delete updateData.name;
    }
    if (updateData.images) {
      updateData.images = updateData.images.map((img: string, idx: number) => saveBase64File(img, `img_${idx}`));
    }
    if (updateData.videoUrl) {
      updateData.videoUrl = saveBase64File(updateData.videoUrl, 'vid');
    }
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully!', product: updatedProduct });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product (Seller only)
router.delete('/api/seller/products/delete/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
