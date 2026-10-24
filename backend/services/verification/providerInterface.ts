export interface SendAadhaarOtpParams {
  aadhaarNumber: string;
  ipAddress?: string;
  userId?: string;
}

export interface SendAadhaarOtpResult {
  success: boolean;
  referenceId?: string;
  message: string;
  isMock?: boolean;
}

export interface VerifyAadhaarOtpParams {
  otp: string;
  referenceId: string;
  ipAddress?: string;
  userId?: string;
}

export interface VerifyAadhaarOtpResult {
  success: boolean;
  verified: boolean;
  referenceId?: string;
  message: string;
  careOf?: string;
  address?: string;
  dob?: string;
  name?: string;
  isMock?: boolean;
}

export interface VerifyBankAccountParams {
  accountNumber: string;
  ifsc: string;
  expectedName?: string;
  ipAddress?: string;
  userId?: string;
}

export interface VerifyBankAccountResult {
  success: boolean;
  verified: boolean;
  accountExists: boolean;
  ifscValid: boolean;
  bankName: string;
  accountHolderName: string;
  referenceId?: string;
  message?: string;
  isMock?: boolean;
}

export interface VerificationProvider {
  name: string;
  isConfigured(): boolean;
  sendAadhaarOTP(params: SendAadhaarOtpParams): Promise<SendAadhaarOtpResult>;
  verifyAadhaarOTP(params: VerifyAadhaarOtpParams): Promise<VerifyAadhaarOtpResult>;
  verifyBankAccount(params: VerifyBankAccountParams): Promise<VerifyBankAccountResult>;
}
