import { cashfreeClient } from '../config/cashfreeConfig.js';
import crypto from 'crypto';

export const bankVerificationService = {
  verifyBankAccount: async (accountNumber: string, ifsc: string, expectedName: string) => {
    // Mock response for development
    if (!cashfreeClient.isConfigured()) {
      if (accountNumber === '00000000') {
        return { success: false, message: 'Invalid bank account number' };
      }
      return {
        success: true,
        verified: true,
        accountExists: true,
        ifscValid: true,
        bankName: 'Mock Sandbox Bank',
        accountHolderName: expectedName || 'Sandbox User',
        referenceId: `mock_ref_${crypto.randomBytes(8).toString('hex')}`
      };
    }

    try {
      const response = await fetch(`${cashfreeClient.baseUrl}/bank-account`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ bank_account: accountNumber, ifsc })
      });

      const data = await response.json() as any;

      if (!response.ok || data.status !== 'VALID') {
        return { success: false, message: data.message || 'Bank account verification failed' };
      }

      // We should check the name match if needed, but for now we return the parsed data
      return {
        success: true,
        verified: true,
        accountExists: data.account_status === 'VALID',
        ifscValid: true,
        bankName: data.bank_name || 'Unknown Bank',
        accountHolderName: data.name_at_bank || '',
        referenceId: data.reference_id
      };
    } catch (error: any) {
      console.error('Cashfree Bank Verify Error:', error.message);
      return { success: false, message: 'Provider unavailable' };
    }
  }
};
