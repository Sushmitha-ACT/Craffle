import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  images: [{ type: String }],
  sellerReply: { type: String },
  helpful: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const ReviewModel = mongoose.model('Review', reviewSchema);
export const Review = (mongoose.models.Review as typeof ReviewModel) || ReviewModel;
