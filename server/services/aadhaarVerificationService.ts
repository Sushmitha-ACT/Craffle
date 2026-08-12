import { cashfreeClient } from '../config/cashfreeConfig.js';
import crypto from 'crypto';

export const aadhaarVerificationService = {
  sendAadhaarOTP: async (aadhaarNumber: string) => {
    // If not configured, mock a successful response for development
    if (!cashfreeClient.isConfigured()) {
      return {
        success: true,
        referenceId: `mock_ref_${crypto.randomBytes(8).toString('hex')}`,
        message: 'Mock OTP sent successfully'
      };
    }

    try {
      const response = await fetch(`${cashfreeClient.baseUrl}/aadhaar/otp`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ aadhaar_number: aadhaarNumber })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        return { success: false, message: data.message || 'Failed to send Aadhaar OTP' };
      }

      return {
        success: true,
        referenceId: data.reference_id,
        message: 'OTP sent successfully'
      };
    } catch (error: any) {
      console.error('Cashfree Aadhaar OTP Error:', error.message);
      return { success: false, message: 'Provider unavailable' };
    }
  },

  verifyAadhaarOTP: async (otp: string, referenceId: string) => {
    // Mock response for development
    if (!cashfreeClient.isConfigured()) {
      if (otp === '000000') {
        return { success: false, message: 'Invalid OTP' };
      }
      return {
        success: true,
        verified: true,
        message: 'Aadhaar verified successfully (Mock)',
        referenceId
      };
    }

    try {
      const response = await fetch(`${cashfreeClient.baseUrl}/aadhaar/verify`, {
        method: 'POST',
        headers: cashfreeClient.getHeaders(),
        body: JSON.stringify({ otp, reference_id: referenceId })
      });

      const data = await response.json() as any;

      if (!response.ok || data.status !== 'VALID') {
        return { success: false, message: data.message || 'Invalid OTP or verification failed' };
      }

      return {
        success: true,
        verified: true,
        message: 'Aadhaar verified successfully',
        referenceId: data.reference_id
      };
    } catch (error: any) {
      console.error('Cashfree Aadhaar Verify Error:', error.message);
      return { success: false, message: 'Provider unavailable' };
    }
  }
};
