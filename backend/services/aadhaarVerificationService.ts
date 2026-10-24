import crypto from 'crypto';
import { verificationFactory } from './verification/verificationFactory.js';
import { VerificationAudit } from '../models/VerificationAudit.js';

function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

export const aadhaarVerificationService = {
  sendAadhaarOTP: async (aadhaarNumber: string, metadata?: { ipAddress?: string; userId?: string }) => {
    const provider = verificationFactory.getActiveProvider();
    const cleanNumber = aadhaarNumber.replace(/\s+/g, '');

    // Record audit pending
    const auditRecord = await VerificationAudit.create({
      provider: provider.name,
      type: 'AADHAAR',
      status: 'PENDING',
      idHash: hashIdentifier(cleanNumber),
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId as any,
      requestData: { aadhaarSuffix: cleanNumber.slice(-4) }
    }).catch(err => {
      console.error('Failed to log verification audit init:', err);
      return null;
    });

    const result = await provider.sendAadhaarOTP({
      aadhaarNumber: cleanNumber,
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId
    });

    if (auditRecord) {
      await VerificationAudit.findByIdAndUpdate(auditRecord._id, {
        status: result.success ? 'PENDING' : 'FAILED',
        referenceId: result.referenceId,
        failureReason: result.success ? undefined : result.message,
        responseData: { message: result.message, success: result.success }
      }).catch(err => console.error('Failed to update verification audit:', err));
    }

    return result;
  },

  verifyAadhaarOTP: async (otp: string, referenceId: string, metadata?: { ipAddress?: string; userId?: string }) => {
    const provider = verificationFactory.getActiveProvider();

    const result = await provider.verifyAadhaarOTP({
      otp: otp.trim(),
      referenceId: referenceId.trim(),
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId
    });

    // Record or update audit record
    await VerificationAudit.create({
      provider: provider.name,
      type: 'AADHAAR',
      status: result.verified ? 'SUCCESS' : 'FAILED',
      referenceId: referenceId.trim(),
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId as any,
      responseData: { 
        verified: result.verified, 
        message: result.message,
        hasName: Boolean(result.name)
      },
      failureReason: result.verified ? undefined : result.message
    }).catch(err => console.error('Failed to log aadhaar verify audit:', err));

    return result;
  }
};
