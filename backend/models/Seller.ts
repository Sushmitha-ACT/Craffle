import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  businessName: { type: String, required: true },
  governmentId: { type: String, required: true },
  governmentIdImage: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  category: { type: String },
  description: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  verificationStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  bankDetails: { type: String, required: true },
  aadhaarVerified: { type: Boolean, default: false },
  aadhaarVerificationReference: { type: String },
  bankVerified: { type: Boolean, default: false },
  bankVerificationReference: { type: String },
  bankName: { type: String },
  bankAccountName: { type: String },
  adminApprovalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  subscriptionPlan: { type: String },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const SellerModel = mongoose.model('Seller', sellerSchema);
export const Seller = (mongoose.models.Seller as typeof SellerModel) || SellerModel;
