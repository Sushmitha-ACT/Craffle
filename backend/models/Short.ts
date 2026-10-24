import mongoose from 'mongoose';

const shortSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Seller', index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product', index: true },
  videoUrl: { type: String, required: true },
  videoStorageKey: { type: String },
  thumbnailUrl: { type: String },
  caption: { type: String, default: '', trim: true, maxlength: 400 },
  hashtags: [{ type: String, trim: true, lowercase: true }],
  status: { type: String, enum: ['published', 'hidden', 'deleted'], default: 'published', index: true },
  likesCount: { type: Number, default: 0, min: 0 },
  commentsCount: { type: Number, default: 0, min: 0 },
  viewsCount: { type: Number, default: 0, min: 0 },
  sharesCount: { type: Number, default: 0, min: 0 },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

shortSchema.index({ status: 1, createdAt: -1 });

const ShortModel = mongoose.model('Short', shortSchema);
export const Short = (mongoose.models.Short as typeof ShortModel) || ShortModel;
