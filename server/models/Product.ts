import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Seller' },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  images: [{ type: String }],
  videoUrl: { type: String },
  pickupAvailable: { type: Boolean, default: true },
  deliveryAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Out of Stock', 'Hidden'], default: 'Available' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  createdAt: { type: Date, default: Date.now }
});

productSchema.index({ location: '2dsphere' });

const ProductModel = mongoose.model('Product', productSchema);
export const Product = (mongoose.models.Product as typeof ProductModel) || ProductModel;
