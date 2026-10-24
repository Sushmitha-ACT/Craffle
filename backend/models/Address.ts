import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // e.g. 'Home', 'Work'
  addressLine: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

// Index for query optimization
addressSchema.index({ userId: 1 });

const AddressModel = mongoose.model('Address', addressSchema);
export const Address = (mongoose.models.Address as typeof AddressModel) || AddressModel;
