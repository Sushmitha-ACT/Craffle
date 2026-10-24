import mongoose from 'mongoose';

const shortLikeSchema = new mongoose.Schema({
  shortId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Short', index: true },
  userId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Enforce unique like per user per Short
shortLikeSchema.index({ shortId: 1, userId: 1 }, { unique: true });

const ShortLikeModel = mongoose.model('ShortLike', shortLikeSchema);
export const ShortLike = (mongoose.models.ShortLike as typeof ShortLikeModel) || ShortLikeModel;
