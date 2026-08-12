/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, MapPin, CreditCard, Truck, Store,
  CheckCircle, Shield, Smartphone, Banknote, Building,
  Sparkles, Package, Clock
} from 'lucide-react';
import { CartItem } from '@shared/types';

interface CheckoutPageProps {
  items: CartItem[];
  user: any;
  gps: { lat: number; lon: number; name: string };
  onPlaceOrder: (details: {
    fulfillmentMethod: 'DELIVERY' | 'SELF_PICKUP';
    address: string;
    phone: string;
    paymentMethod: string;
    deliveryCharge: number;
    discount: number;
    total: number;
  }) => void;
  onBack: () => void;
}

export default function CheckoutPage({ items, user, gps, onPlaceOrder, onBack }: CheckoutPageProps) {
  const fulfillmentMethod = items[0]?.fulfillmentMethod || 'DELIVERY';
  const needsAddress = fulfillmentMethod === 'DELIVERY';
  
  const [step, setStep] = useState<'address' | 'payment' | 'success'>(needsAddress ? 'address' : 'payment');
  const [address, setAddress] = useState('No 12, Gandhi Nagar, Chennai');
  const [phone, setPhone] = useState('+91 94444 33333');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = fulfillmentMethod === 'SELF_PICKUP' ? 0 : (subtotal >= 500 ? 0 : 29);
  const total = subtotal + deliveryCharge;

  const handlePlaceOrder = () => {
    setProcessing(true);
    setTimeout(() => {
      onPlaceOrder({
        fulfillmentMethod,
        address: needsAddress ? address : '',
        phone,
        paymentMethod,
        deliveryCharge,
        discount: 0,
        total
      });
      setStep('success');
      setProcessing(false);
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 page-enter">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'var(--success-light)' }}
        >
          <CheckCircle className="w-12 h-12" style={{ color: 'var(--success)' }} />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Order Placed! 🎉</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Your order has been successfully placed.
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Estimated delivery: <strong>Within 2 Hours</strong>
        </p>
        <button onClick={onBack} className="btn-primary">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Checkout</h1>
      </div>

      {/* Progress */}
      {needsAddress && (
        <div className="flex items-center gap-2 mb-8">
          {['Address', 'Payment'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                (i === 0 && step === 'address') || (i === 1 && step === 'payment')
                  ? 'bg-[var(--primary)] text-white'
                  : i === 0 && step === 'payment'
                  ? 'bg-[var(--success-light)] text-[var(--success)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--muted)]'
              }`}>
                {i === 0 && step === 'payment' ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                {s}
              </div>
              {i < 1 && <div className="flex-1 h-0.5 rounded" style={{ background: step === 'payment' ? 'var(--success)' : 'var(--border)' }} />}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main form */}
        <div className="lg:col-span-3 space-y-4">
          {step === 'address' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">


              {/* Address */}
              <div className="card-surface p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    Delivery Address
                  </h3>
                </div>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  className="input-field text-sm mb-3"
                  placeholder="Enter full address..."
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--success)' }}>
                    GPS: {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)} — {gps.name}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="card-surface p-4">
                <label className="text-sm font-bold mb-2 block" style={{ color: 'var(--text)' }}>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-field text-sm"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <button
                onClick={() => setStep('payment')}
                disabled={!address.trim() || !phone.trim()}
                className="btn-primary w-full py-3 text-sm font-bold"
              >
                Continue to Payment
              </button>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="card-surface p-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Payment Method</h3>
                <div className="space-y-2">
                  {[
                    { id: 'upi', icon: <Smartphone className="w-4.5 h-4.5" />, label: 'UPI / Google Pay', desc: 'Pay via any UPI app' },
                    { id: 'card', icon: <CreditCard className="w-4.5 h-4.5" />, label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                    { id: 'netbanking', icon: <Building className="w-4.5 h-4.5" />, label: 'Net Banking', desc: 'All major banks' },
                    { id: 'cod', icon: <Banknote className="w-4.5 h-4.5" />, label: 'Cash on Delivery', desc: 'Pay when you receive' },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2"
                      style={{
                        borderColor: paymentMethod === method.id ? 'var(--primary)' : 'var(--border)',
                        background: paymentMethod === method.id ? 'var(--primary-light)' : 'var(--panel)',
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: paymentMethod === method.id ? 'var(--primary)' : 'var(--bg-secondary)', color: paymentMethod === method.id ? 'white' : 'var(--muted)' }}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{method.label}</p>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{method.desc}</p>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle className="w-5 h-5 ml-auto" style={{ color: 'var(--primary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('address')} className="btn-secondary flex-1 py-3 text-sm">
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={processing}
                  className="btn-primary flex-1 py-3 text-sm font-bold"
                >
                  {processing ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>Pay ₹{total} <Shield className="w-4 h-4" /></>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                <Shield className="w-3 h-3" />
                Secured by Razorpay • 256-bit SSL Encryption
              </div>
            </motion.div>
          )}
        </div>

        {/* Order Summary sidebar */}
        <div className="lg:col-span-2">
          <div className="card-surface p-4 sticky top-20">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Order Summary</h3>
            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-2">
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>x{item.quantity}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="divider mb-3" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Delivery</span>
                <span className="font-semibold" style={{ color: deliveryCharge === 0 ? 'var(--success)' : 'var(--text)' }}>
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="divider" />
              <div className="flex justify-between text-base pt-1">
                <span className="font-bold" style={{ color: 'var(--text)' }}>Total</span>
                <span className="font-extrabold" style={{ color: 'var(--text)' }}>₹{total}</span>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-lg flex items-center gap-2" style={{ background: 'var(--success-light)' }}>
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--success)' }}>
                Estimated delivery within 2 hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
