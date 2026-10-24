import dotenv from 'dotenv';
dotenv.config();

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID || '';
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET || '';
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';

const BASE_URL = CASHFREE_ENV === 'production' 
  ? 'https://api.cashfree.com/verification' 
  : 'https://sandbox.cashfree.com/verification';

export const cashfreeClient = {
  getHeaders: () => ({
    'Content-Type': 'application/json',
    'x-client-id': CASHFREE_CLIENT_ID,
    'x-client-secret': CASHFREE_CLIENT_SECRET,
  }),
  baseUrl: BASE_URL,
  isConfigured: () => Boolean(
    CASHFREE_CLIENT_ID && CASHFREE_CLIENT_SECRET && 
    CASHFREE_CLIENT_ID !== 'your_cashfree_client_id_here' && 
    CASHFREE_CLIENT_SECRET !== 'your_cashfree_secret_here'
  )
};
