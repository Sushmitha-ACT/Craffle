import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['CUSTOMER', 'SELLER', 'ADMIN'], default: 'CUSTOMER' },
  phone: { type: String },
  profileImage: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const UserModel = mongoose.model('User', userSchema);
export const User = (mongoose.models.User as typeof UserModel) || UserModel;
