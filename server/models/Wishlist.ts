import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const WishlistModel = mongoose.model('Wishlist', wishlistSchema);
export const Wishlist = (mongoose.models.Wishlist as typeof WishlistModel) || WishlistModel;
