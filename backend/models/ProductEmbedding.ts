import mongoose from 'mongoose';

const productEmbeddingSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  modelVersion: {
    type: String,
    required: true,
    default: 'mobilenet-v2-imagenet-v1'
  },
  status: {
    type: String,
    enum: ['INDEXED', 'FAILED', 'PENDING'],
    default: 'INDEXED'
  },
  error: {
    type: String
  },
  indexedAt: {
    type: Date,
    default: Date.now
  }
});

productEmbeddingSchema.index({ productId: 1, imageUrl: 1 }, { unique: true });
productEmbeddingSchema.index({ status: 1 });

const ProductEmbeddingModel = mongoose.model('ProductEmbedding', productEmbeddingSchema);
export const ProductEmbedding = (mongoose.models.ProductEmbedding as typeof ProductEmbeddingModel) || ProductEmbeddingModel;
