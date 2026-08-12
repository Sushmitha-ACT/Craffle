import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Seller' },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  paymentId: { type: String },
  fulfillmentMethod: { type: String, enum: ['DELIVERY', 'SELF_PICKUP'], required: true },
  address: { type: String },
  phone: { type: String },
  customerLocation: {
    latitude: Number,
    longitude: Number
  },
  sellerLocation: {
    latitude: Number,
    longitude: Number
  },
  distanceKm: { type: Number },
  orderStatus: { 
    type: String, 
    enum: [
      'Pending', 
      'Confirmed', 
      'Preparing', 
      'Ready for Pickup', 
      'Picked Up', 
      'Delivery Partner Assigned', 
      'Out for Delivery', 
      'Delivered',
      'Cancelled'
    ], 
    default: 'Pending' 
  },
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const OrderModel = mongoose.model('Order', orderSchema);
export const Order = (mongoose.models.Order as typeof OrderModel) || OrderModel;
