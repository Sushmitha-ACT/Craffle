import mongoose from 'mongoose';

export type VerificationType = 'AADHAAR' | 'BANK';
export type VerificationStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface IVerificationAudit {
  sellerId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  provider: string; // 'cashfree', 'truid', etc.
  type: VerificationType;
  status: VerificationStatus;
  referenceId?: string;
  idHash?: string; // SHA-256 hash of Aadhaar or Bank Account for duplicate/fraud prevention without storing raw values
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  failureReason?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const verificationAuditSchema = new mongoose.Schema<IVerificationAudit>(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    provider: { type: String, required: true, default: 'cashfree', index: true },
    type: { type: String, enum: ['AADHAAR', 'BANK'], required: true, index: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], required: true, index: true },
    referenceId: { type: String, index: true },
    idHash: { type: String, index: true },
    requestData: { type: mongoose.Schema.Types.Mixed },
    responseData: { type: mongoose.Schema.Types.Mixed },
    failureReason: { type: String },
    ipAddress: { type: String }
  },
  {
    timestamps: true
  }
);

const VerificationAuditModel = mongoose.model<IVerificationAudit>('VerificationAudit', verificationAuditSchema);
export const VerificationAudit = (mongoose.models.VerificationAudit as typeof VerificationAuditModel) || VerificationAuditModel;
