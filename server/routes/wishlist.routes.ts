import express from 'express';
import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';

const router = express.Router();

router.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === 'undefined' || userId === 'null' || userId.length < 24) {
      return res.json([]);
    }
    const wishlist = await Wishlist.findOne({ customerId: userId })
      .populate({
        path: 'products',
        populate: { path: 'sellerId' }
      });
    if (!wishlist) return res.json([]);
    
    // Map products to include id, name, and sellerName for frontend consistency
    const formattedProducts = wishlist.products.map((p: any) => {
      const seller = p.sellerId as any;
      return {
        ...p.toObject(),
        id: p._id.toString(),
        name: p.productName,
        sellerName: seller?.businessName || 'Local Creator',
        sellerId: seller?._id ? seller._id.toString() : p.sellerId?.toString()
      };
    });
    
    res.json(formattedProducts);
  } catch (err) {
    console.error('Fetch wishlist error:', err);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

router.post('/api/wishlist/add', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: 'Missing userId or productId' });

    await Wishlist.findOneAndUpdate(
      { customerId: userId },
      { $addToSet: { products: productId } },
      { upsert: true }
    );
    
    res.json({ message: 'Added to wishlist' });
  } catch (err) {
    console.error('Add wishlist error:', err);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.delete('/api/wishlist/remove', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: 'Missing userId or productId' });

    await Wishlist.updateOne(
      { customerId: userId },
      { $pull: { products: productId } }
    );
    
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error('Remove wishlist error:', err);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
