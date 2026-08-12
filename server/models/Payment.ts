import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order' },
  customerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Seller' },
  paymentMethod: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  transactionId: { type: String }
});

const PaymentModel = mongoose.model('Payment', paymentSchema);
export const Payment = (mongoose.models.Payment as typeof PaymentModel) || PaymentModel;
