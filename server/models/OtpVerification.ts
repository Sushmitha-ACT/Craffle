import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const OtpVerificationModel = mongoose.model('OtpVerification', otpVerificationSchema);
export const OtpVerification = (mongoose.models.OtpVerification as typeof OtpVerificationModel) || OtpVerificationModel;
