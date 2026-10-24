import crypto from 'crypto';
import { verificationFactory } from './verification/verificationFactory.js';
import { VerificationAudit } from '../models/VerificationAudit.js';

function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value.trim()).digest('hex');
}

export const bankVerificationService = {
  verifyBankAccount: async (
    accountNumber: string, 
    ifsc: string, 
    expectedName: string, 
    metadata?: { ipAddress?: string; userId?: string }
  ) => {
    const provider = verificationFactory.getActiveProvider();
    const cleanAccount = accountNumber.trim();
    const cleanIfsc = ifsc.trim().toUpperCase();

    const accountHash = hashIdentifier(`${cleanAccount}_${cleanIfsc}`);

    const result = await provider.verifyBankAccount({
      accountNumber: cleanAccount,
      ifsc: cleanIfsc,
      expectedName: expectedName?.trim(),
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId
    });

    // Record audit trail
    await VerificationAudit.create({
      provider: provider.name,
      type: 'BANK',
      status: result.verified ? 'SUCCESS' : 'FAILED',
      idHash: accountHash,
      referenceId: result.referenceId,
      ipAddress: metadata?.ipAddress,
      userId: metadata?.userId as any,
      requestData: { 
        accountSuffix: cleanAccount.slice(-4),
        ifsc: cleanIfsc,
        expectedName: expectedName?.trim()
      },
      responseData: { 
        verified: result.verified, 
        bankName: result.bankName,
        accountHolderName: result.accountHolderName,
        accountExists: result.accountExists
      },
      failureReason: result.verified ? undefined : (result.message || 'Verification failed')
    }).catch(err => console.error('Failed to log bank verification audit:', err));

    return result;
  }
};
