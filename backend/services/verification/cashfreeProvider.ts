import { cashfreeClient } from '../../config/cashfreeConfig.js';
import { 
  VerificationProvider, 
  SendAadhaarOtpParams, 
  SendAadhaarOtpResult, 
  VerifyAadhaarOtpParams, 
  VerifyAadhaarOtpResult, 
  VerifyBankAccountParams, 
  VerifyBankAccountResult 
} from './providerInterface.js';

export class CashfreeVerificationProvider implements VerificationProvider {
  name = 'cashfree';

  isConfigured(): boolean {
    return cashfreeClient.isConfigured();
  }

  async sendAadhaarOTP(params: SendAadhaarOtpParams): Promise<SendAadhaarOtpResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Cashfree verification credentials are not configured in environment variables (CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET).'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Cashfree verification endpoint for offline Aadhaar OTP
      const response = await fetch(`${cashfreeClient.baseUrl}/offline-aadhaar/otp`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ aadhaar_number: params.aadhaarNumber }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as any;

      if (!response.ok || (data.status && data.status !== 'SUCCESS')) {
        return { 
          success: false, 
          message: data.message || 'Failed to send Aadhaar OTP from provider' 
        };
      }

      const referenceId = data.ref_id || data.reference_id;
      return {
        success: true,
        referenceId: String(referenceId),
        message: data.message || 'OTP sent successfully'
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, message: 'Provider request timed out. Please try again.' };
      }
      console.error('Cashfree Aadhaar OTP Error:', error.message);
      return { success: false, message: 'Identity verification provider unavailable. Please retry shortly.' };
    }
  }

  async verifyAadhaarOTP(params: VerifyAadhaarOtpParams): Promise<VerifyAadhaarOtpResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        verified: false,
        message: 'Cashfree verification credentials are not configured in environment variables.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${cashfreeClient.baseUrl}/offline-aadhaar/verify`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ 
          otp: params.otp, 
          ref_id: params.referenceId 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as any;

      // Only status 'VALID' or 'SUCCESS' is verified
      const isSuccess = response.ok && (data.status === 'VALID' || data.status === 'SUCCESS');
      if (!isSuccess) {
        return { 
          success: false, 
          verified: false, 
          message: data.message || 'Aadhaar OTP verification failed or OTP was invalid' 
        };
      }

      return {
        success: true,
        verified: true,
        message: 'Aadhaar verified successfully',
        referenceId: String(data.ref_id || data.reference_id || params.referenceId),
        name: data.name || '',
        dob: data.dob || '',
        careOf: data.care_of || '',
        address: typeof data.address === 'string' ? data.address : JSON.stringify(data.address || {})
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, verified: false, message: 'Provider request timed out. Please try again.' };
      }
      console.error('Cashfree Aadhaar Verify Error:', error.message);
      return { success: false, verified: false, message: 'Identity verification provider unavailable. Please retry shortly.' };
    }
  }

  async verifyBankAccount(params: VerifyBankAccountParams): Promise<VerifyBankAccountResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        verified: false,
        accountExists: false,
        ifscValid: false,
        bankName: '',
        accountHolderName: '',
        message: 'Cashfree verification credentials are not configured in environment variables.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Cashfree synchronous bank verification
      const response = await fetch(`${cashfreeClient.baseUrl}/bank-account/sync`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ 
          bank_account: params.accountNumber, 
          ifsc: params.ifsc,
          name: params.expectedName || undefined
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as any;

      const isValid = response.ok && (data.account_status === 'VALID' || data.status === 'SUCCESS' || data.status === 'VALID');
      if (!isValid) {
        return { 
          success: false, 
          verified: false, 
          accountExists: false,
          ifscValid: Boolean(data.ifsc_details),
          bankName: data.bank_name || '',
          accountHolderName: '',
          message: data.message || 'Bank account verification failed. Please check the account number and IFSC.' 
        };
      }

      return {
        success: true,
        verified: true,
        accountExists: true,
        ifscValid: true,
        bankName: data.bank_name || data.ifsc_details?.bank_name || 'Verified Bank',
        accountHolderName: data.name_at_bank || params.expectedName || '',
        referenceId: String(data.reference_id || data.ref_id || '')
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { 
          success: false, 
          verified: false, 
          accountExists: false,
          ifscValid: false,
          bankName: '',
          accountHolderName: '',
          message: 'Provider request timed out. Please try again.' 
        };
      }
      console.error('Cashfree Bank Verify Error:', error.message);
      return { 
        success: false, 
        verified: false, 
        accountExists: false,
        ifscValid: false,
        bankName: '',
        accountHolderName: '',
        message: 'Bank verification provider unavailable. Please retry shortly.' 
      };
    }
  }
}
