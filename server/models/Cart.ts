import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, default: 0 }
});

const CartModel = mongoose.model('Cart', cartSchema);
export const Cart = (mongoose.models.Cart as typeof CartModel) || CartModel;
