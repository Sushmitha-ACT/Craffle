import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

const isRazorpayConfigured = () => {
  return Boolean(
    RAZORPAY_KEY_ID &&
    RAZORPAY_KEY_SECRET &&
    !RAZORPAY_KEY_ID.includes('placeholder') &&
    !RAZORPAY_KEY_SECRET.includes('placeholder')
  );
};

let razorpayClient: Razorpay | null = null;
if (isRazorpayConfigured()) {
  try {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    console.log('[Razorpay] Initialized official client with Key ID:', RAZORPAY_KEY_ID.substring(0, 8) + '...');
  } catch (err) {
    console.warn('[Razorpay] Initialization warning:', err);
  }
}

// 1. Get Public Razorpay Configuration (Public Key only, NEVER Secret)
router.get('/api/payments/razorpay/config', (req, res) => {
  res.json({
    keyId: isRazorpayConfigured() ? RAZORPAY_KEY_ID : null,
    isLiveConfigured: isRazorpayConfigured()
  });
});

// 2. Create Razorpay Server-side Order
router.post('/api/payments/razorpay/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    // If real keys are provided, create official order via Razorpay SDK
    if (isRazorpayConfigured() && razorpayClient) {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        payment_capture: true
      });

      return res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        isConfigured: true
      });
    }

    // Razorpay credentials are not yet set in .env
    return res.status(503).json({
      error: 'Razorpay keys not configured on server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env or choose Cash on Delivery.',
      isConfigured: false
    });
  } catch (error: any) {
    console.error('[Razorpay Create Order Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to create Razorpay payment order' });
  }
});

// 3. Verify Razorpay Payment Signature
router.post('/api/payments/razorpay/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment signature verification parameters' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(500).json({ error: 'Razorpay keys missing from server configuration' });
    }

    // Verify official HMAC SHA-256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn('[Razorpay Verify] Signature mismatch for payment:', razorpay_payment_id);
      return res.status(400).json({ error: 'Payment signature verification failed. Invalid transaction.' });
    }

    // Idempotency: verify or link payment
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentId: razorpay_payment_id,
        orderStatus: 'Confirmed'
      });
    }

    res.json({
      success: true,
      message: 'Razorpay payment signature verified successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    });
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

export default router;
