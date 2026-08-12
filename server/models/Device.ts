import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  platform: { type: String, default: 'web' }
}, { timestamps: true });

// Index for query optimization
deviceSchema.index({ userId: 1, token: 1 }, { unique: true });

const DeviceModel = mongoose.model('Device', deviceSchema);
export const Device = (mongoose.models.Device as typeof DeviceModel) || DeviceModel;
