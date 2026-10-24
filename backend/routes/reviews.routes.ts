import express from 'express';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';

const router = express.Router();

router.post('/api/reviews', async (req, res) => {
  try {
    const { productId, customerId, rating, comment, images } = req.body;
    
    if (!productId || !customerId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create the review
    const newReview = await Review.create({
      productId,
      customerId,
      rating: Number(rating),
      comment: comment || '',
      images: images || []
    });

    // Update Product aggregates
    const productReviews = await Review.find({ productId });
    const productAvgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    
    const product = await Product.findByIdAndUpdate(productId, {
      rating: Number(productAvgRating.toFixed(1)),
      totalReviews: productReviews.length
    }, { new: true });
    
    if (product) {
      // Update Seller aggregates
      const sellerProducts = await Product.find({ sellerId: product.sellerId });
      let totalSellerReviews = 0;
      let totalSellerRatingSum = 0;
      
      sellerProducts.forEach(p => {
        if (p.totalReviews > 0) {
          totalSellerReviews += p.totalReviews;
          totalSellerRatingSum += p.rating * p.totalReviews;
        }
      });
      
      if (totalSellerReviews > 0) {
        const sellerAvgRating = totalSellerRatingSum / totalSellerReviews;
        await Seller.findByIdAndUpdate(product.sellerId, {
          rating: Number(sellerAvgRating.toFixed(1)),
          totalReviews: totalSellerReviews
        });
      }
    }
    
    // Populate the newly created review to return
    const populatedReview = await Review.findById(newReview._id).populate('customerId', 'name').lean();
    
    const formattedReview = {
       id: (populatedReview as any)._id.toString(),
       customerName: (populatedReview as any).customerId?.name || 'Anonymous',
       rating: (populatedReview as any).rating,
       comment: (populatedReview as any).comment,
       images: (populatedReview as any).images,
       createdAt: (populatedReview as any).createdAt
    };

    res.json({ message: 'Review added successfully', review: formattedReview, newProductRating: Number(productAvgRating.toFixed(1)), newProductTotalReviews: productReviews.length });
  } catch (err) {
    console.error('Add review error:', err);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

export default router;
