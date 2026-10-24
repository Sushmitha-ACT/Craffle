/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, MapPin, CreditCard, Truck, Store,
  CheckCircle2, Shield, Smartphone, Banknote, Building2,
  Sparkles, Package, Clock, AlertCircle, Lock, ShoppingBag,
  Info, ChevronRight
} from 'lucide-react';
import { CartItem } from '@shared/types';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

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
  }) => Promise<any> | void;
  onBack: () => void;
}

export default function CheckoutPage({ items, user, gps, onPlaceOrder, onBack }: CheckoutPageProps) {
  // Normalize fulfillmentMethod from first item to canonical uppercase 'DELIVERY' | 'SELF_PICKUP'
  const rawMethod = items[0]?.fulfillmentMethod;
  const canonicalMethod: 'DELIVERY' | 'SELF_PICKUP' =
    String(rawMethod).toUpperCase() === 'SELF_PICKUP' || String(rawMethod).toLowerCase() === 'pickup'
      ? 'SELF_PICKUP'
      : 'DELIVERY';

  const needsAddress = canonicalMethod === 'DELIVERY';

  const [step, setStep] = useState<'address' | 'payment' | 'success'>(needsAddress ? 'address' : 'payment');
  const [address, setAddress] = useState(user?.address || 'No 12, Gandhi Nagar, Chennai');
  const [phone, setPhone] = useState(user?.phone || '+91 94444 33333');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Load user saved addresses
  useEffect(() => {
    const token = localStorage.getItem('craffle_token');
    if (token) {
      fetch('/api/addresses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : [])
        .then((addrs: any[]) => {
          if (Array.isArray(addrs) && addrs.length > 0) {
            setSavedAddresses(addrs);
            const defaultAddr = addrs.find(a => a.isDefault) || addrs[0];
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr._id);
              const formatted = `${defaultAddr.addressLine}${defaultAddr.landmark ? ', ' + defaultAddr.landmark : ''}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pinCode}`;
              setAddress(formatted);
              if (defaultAddr.phone) setPhone(defaultAddr.phone);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Subtotal & delivery calculations
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = canonicalMethod === 'SELF_PICKUP' ? 0 : (subtotal >= 500 ? 0 : 29);
  const total = subtotal + deliveryCharge;

  const paymentOptions = [
    {
      id: 'upi' as const,
      icon: <Smartphone className="w-5 h-5 text-orange-600" />,
      label: 'UPI / Google Pay / PhonePe',
      desc: 'Instant checkout using Google Pay, PhonePe, Paytm, or UPI QR',
      badge: 'Most Popular'
    },
    {
      id: 'card' as const,
      icon: <CreditCard className="w-5 h-5 text-blue-600" />,
      label: 'Credit / Debit Card',
      desc: 'Visa, Mastercard, RuPay, Maestro & American Express with EMI',
      badge: 'Fast & Secure'
    },
    {
      id: 'netbanking' as const,
      icon: <Building2 className="w-5 h-5 text-indigo-600" />,
      label: 'Net Banking',
      desc: 'Direct transfer through 50+ major Indian banks (SBI, HDFC, ICICI, etc.)',
      badge: null
    },
    {
      id: 'cod' as const,
      icon: <Banknote className="w-5 h-5 text-emerald-600" />,
      label: 'Cash on Delivery (COD)',
      desc: 'Pay cash or scan QR at your doorstep upon receiving your fresh order',
      badge: 'Pay Later'
    },
  ];

  const handlePlaceOrder = async () => {
    if (processing) return;
    setProcessing(true);
    setPaymentError(null);

    // If Razorpay SDK is loaded and non-COD is chosen, invoke server-side Razorpay flow
    if (paymentMethod !== 'cod' && typeof window !== 'undefined' && window.Razorpay) {
      try {
        const token = localStorage.getItem('craffle_token');
        const orderRes = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            amount: total,
            receipt: `rcpt_${Date.now()}`
          })
        });

        if (!orderRes.ok) {
          throw new Error('Could not initiate server payment order');
        }

        const serverOrder = await orderRes.json();

        const options: any = {
          key: serverOrder.keyId || 'rzp_test_placeholder',
          amount: serverOrder.amount,
          currency: serverOrder.currency || 'INR',
          name: 'Craffle Marketplace',
          description: `Order from ${items[0]?.sellerName || 'Local Homemade Creator'}`,
          order_id: serverOrder.isConfigured ? serverOrder.orderId : undefined,
          image: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
          prefill: {
            name: user?.name || 'Customer',
            email: user?.email || 'customer@craffle.com',
            contact: phone
          },
          theme: {
            color: '#FF6B35'
          },
          config: paymentMethod === 'upi' ? {
            display: {
              blocks: {
                upi: {
                  name: 'Pay using UPI QR or Apps',
                  instruments: [
                    { method: 'upi' }
                  ]
                }
              },
              sequence: ['block.upi'],
              preferences: {
                show_default_blocks: true
              }
            }
          } : undefined,
          handler: async function (response: any) {
            try {
              // 1. Verify payment on backend
              const verifyRes = await fetch('/api/payments/razorpay/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id || serverOrder.orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (!verifyRes.ok) {
                const errData = await verifyRes.json();
                throw new Error(errData.error || 'Payment signature verification failed.');
              }

              // 2. Persist order with canonical enum 'DELIVERY' | 'SELF_PICKUP'
              const orderResult = await onPlaceOrder({
                fulfillmentMethod: canonicalMethod,
                address: needsAddress ? address : '',
                phone,
                paymentMethod: `${paymentMethod}_razorpay`,
                deliveryCharge,
                discount: 0,
                total
              });

              if (orderResult) {
                setConfirmedOrder(typeof orderResult === 'object' ? orderResult : {
                  id: response.razorpay_payment_id?.slice(-8) || 'ORD' + Date.now().toString().slice(-6),
                  total,
                  fulfillmentMethod: canonicalMethod,
                  paymentStatus: 'Paid'
                });
                setStep('success');
              } else {
                setPaymentError('Payment was verified successfully, but order recording encountered an issue. Please contact support with ID: ' + response.razorpay_payment_id);
              }
            } catch (err: any) {
              setPaymentError(err.message || 'Order confirmation failed after payment verification.');
            } finally {
              setProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setPaymentError('Payment window was closed. You can retry with Razorpay or select Cash on Delivery.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setProcessing(false);
          setPaymentError(resp.error?.description || 'Payment was unsuccessful. Please check your bank and try again.');
        });
        rzp.open();
        return;
      } catch (err: any) {
        setProcessing(false);
        setPaymentError(err?.message || 'Could not initiate Razorpay checkout. Please verify connection or select Cash on Delivery.');
        return;
      }
    }

    // Direct simulated fallback / COD
    try {
      const orderResult = await onPlaceOrder({
        fulfillmentMethod: canonicalMethod,
        address: needsAddress ? address : '',
        phone,
        paymentMethod,
        deliveryCharge,
        discount: 0,
        total
      });

      if (orderResult) {
        setConfirmedOrder(typeof orderResult === 'object' ? orderResult : {
          id: 'COD' + Date.now().toString().slice(-6),
          total,
          fulfillmentMethod: canonicalMethod,
          paymentStatus: paymentMethod === 'cod' ? 'Pay on Delivery' : 'Paid'
        });
        setStep('success');
      } else {
        setPaymentError('Could not finalize order. Please check address and details.');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // SUCCESS STATE VIEW
  if (step === 'success') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center page-enter">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-8 sm:p-14 shadow-xl max-w-xl mx-auto space-y-6 transition-colors duration-200">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60"
          >
            <CheckCircle2 className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
          </motion.div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-black tracking-wider uppercase rounded-full">
              {paymentMethod === 'cod' ? 'Order Placed (Cash on Delivery)' : 'Order Confirmed & Paid'}
            </span>
            <h2 className="text-3xl font-black text-[var(--text)] font-serif">Order Placed Successfully! 🎉</h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md mx-auto">
              Your homemade creation is now being communicated with <strong>{items[0]?.sellerName || 'the creator'}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-left text-xs sm:text-sm space-y-2.5">
            <div className="flex justify-between items-center text-[var(--text)]">
              <span className="font-semibold text-[var(--text-secondary)]">Order ID:</span>
              <span className="font-mono font-bold text-[var(--text)]">#{confirmedOrder?.id || 'CONFIRMED'}</span>
            </div>
            <div className="flex justify-between items-center text-[var(--text)]">
              <span className="font-semibold text-[var(--text-secondary)]">Total Amount:</span>
              <span className="font-black text-base text-[var(--text)]">₹{confirmedOrder?.total || total}</span>
            </div>
            <div className="flex justify-between items-center text-[var(--text)]">
              <span className="font-semibold text-[var(--text-secondary)]">Fulfillment Method:</span>
              <span className="font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                {confirmedOrder?.fulfillmentMethod || canonicalMethod}
              </span>
            </div>
            <div className="flex justify-between items-center text-[var(--text)]">
              <span className="font-semibold text-[var(--text-secondary)]">Estimated Delivery:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Within 2 Hours
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onBack}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold text-base transition-all shadow-md shadow-orange-500/20 active:scale-[0.99]"
            >
              Back to Home & Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-160px)] py-8 sm:py-10 px-4 sm:px-6 lg:px-12 page-enter">
      <div className="max-w-[1180px] mx-auto space-y-8">
        
        {/* TOP BAR / NAVIGATION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-orange-300 transition-all shadow-xs"
              title="Return to cart"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight">
                Review & Checkout
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Complete your order securely with Razorpay verified protection
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          {needsAddress && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-[var(--panel)] px-4 py-2 rounded-2xl border border-[var(--border)] shadow-xs">
              <button
                onClick={() => setStep('address')}
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                  step === 'address'
                    ? 'text-[#FF6B35]'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'address' ? 'bg-[#FF6B35] text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                }`}>
                  {step === 'payment' ? '✓' : '1'}
                </span>
                Delivery Details
              </button>

              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />

              <button
                onClick={() => {
                  if (address.trim() && phone.trim()) setStep('payment');
                }}
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                  step === 'payment'
                    ? 'text-[#FF6B35]'
                    : 'text-[var(--muted)]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 'payment' ? 'bg-[#FF6B35] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}>
                  2
                </span>
                Payment Method
              </button>
            </div>
          )}
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        <AnimatePresence>
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm font-semibold"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Payment Notice</p>
                <p className="text-xs sm:text-sm mt-0.5 font-medium">{paymentError}</p>
              </div>
              <button
                onClick={() => setPaymentError(null)}
                className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-700"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN SPACIOUS TWO-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: DETAILS & PAYMENT SELECTION (~65% width) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* STEP 1: DELIVERY & CONTACT INFORMATION */}
            {step === 'address' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors duration-200">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF6B35]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">
                          Delivery Destination
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">Where should we deliver your order?</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                      Step 1 of 2
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Saved Addresses Selector */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold text-[var(--text)] block">
                          Select from Saved Addresses
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {savedAddresses.map((addr) => {
                            const isSelected = selectedAddressId === addr._id;
                            return (
                              <div
                                key={addr._id}
                                onClick={() => {
                                  setSelectedAddressId(addr._id);
                                  const formatted = `${addr.addressLine}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city}, ${addr.state} - ${addr.pinCode}`;
                                  setAddress(formatted);
                                  if (addr.phone) setPhone(addr.phone);
                                }}
                                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#FF6B35] bg-orange-50/40 shadow-xs'
                                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-[var(--text)]">{addr.name}</span>
                                  {addr.isDefault && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-[#FF6B35]">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                                  {addr.addressLine}, {addr.city}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-[var(--text)] block">
                        Street Address & Landmark <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={address}
                        onChange={e => {
                          setAddress(e.target.value);
                          setSelectedAddressId(null);
                        }}
                        rows={3}
                        className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text)] outline-none focus:bg-[var(--panel)] focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all resize-none font-medium"
                        placeholder="House / Flat No., Apartment / Building Name, Street, Landmark..."
                      />
                    </div>

                    {/* GPS Tagged Coordinates Pill */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Live GPS Anchor: <strong>{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}</strong> ({gps.name})</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        Accurate
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold text-[var(--text)] block">
                          Recipient Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text)] outline-none focus:bg-[var(--panel)] focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all font-medium"
                          placeholder="+91 XXXXX XXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-bold text-[var(--text)] block">
                          Delivery Instructions <span className="text-[var(--muted)] font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          defaultValue="Leave with security or ring the bell"
                          className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text)] outline-none focus:bg-[var(--panel)] focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                    <button
                      onClick={() => setStep('payment')}
                      disabled={!address.trim() || !phone.trim()}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Proceed to Payment Method <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PAYMENT METHOD SELECTION */}
            {step === 'payment' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Delivery Address Summary Pill */}
                {needsAddress && (
                  <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-5 shadow-xs flex items-center justify-between transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">Deliver To</span>
                        <p className="text-xs sm:text-sm font-bold text-[var(--text)] truncate max-w-sm sm:max-w-md">
                          {address} ({phone})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('address')}
                      className="text-xs font-bold text-[#FF6B35] hover:underline px-3 py-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Payment Cards Registry */}
                <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors duration-200">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#FF6B35]">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">
                          Select Payment Method
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)]">Protected by Razorpay 256-bit SSL encryption</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> PCI-DSS Safe
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {paymentOptions.map(method => {
                      const isSelected = paymentMethod === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') setPaymentMethod(method.id);
                          }}
                          className={`w-full flex items-start sm:items-center gap-4 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                            isSelected
                              ? 'border-[#FF6B35] bg-orange-50/70 dark:bg-orange-950/20 shadow-sm ring-2 ring-orange-500/10'
                              : 'border-[var(--border)] hover:border-orange-300 bg-[var(--panel)]'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-[var(--bg-secondary)]'
                          }`}>
                            {method.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-bold text-[var(--text)]">
                                {method.label}
                              </span>
                              {method.badge && (
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-[#FF6B35] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                                }`}>
                                  {method.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                              {method.desc}
                            </p>
                          </div>

                          <div className="flex items-center ml-auto pl-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-[var(--border)]'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Razorpay Trust Badge Section */}
                  <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#FF6B35]" />
                      <span>Razorpay TrustShield Guarantee • Real-time payment verification</span>
                    </div>
                    <span className="text-[var(--muted)] font-mono text-[11px]">
                      SSL 256-BIT ENCRYPTED
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {needsAddress && (
                      <button
                        onClick={() => setStep('address')}
                        className="py-3.5 px-6 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-[var(--text)] font-bold text-sm transition-all"
                      >
                        Back to Address
                      </button>
                    )}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={processing}
                      className="flex-1 py-4 px-6 rounded-2xl bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-extrabold text-base transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing Razorpay Verification...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay ₹{total} via {paymentOptions.find(p => p.id === paymentMethod)?.label.split(' ')[0]}</span>
                          <Lock className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* RIGHT COLUMN: STICKY ORDER SUMMARY (~35% width) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-sm sticky top-24 space-y-6 transition-colors duration-200">
              
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="text-lg font-black text-[var(--text)]">
                    Order Summary
                  </h3>
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full border border-[var(--border)]">
                  {items.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[var(--border)] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text)] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Qty: <strong className="text-[var(--text)]">{item.quantity}</strong> × ₹{item.price}
                      </p>
                      {item.sellerName && (
                        <p className="text-[11px] text-[#FF6B35] font-semibold truncate mt-0.5">
                          by {item.sellerName}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-black text-[var(--text)]">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)] text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[var(--text)]">₹{subtotal}</span>
                </div>

                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    Delivery Fee
                    {subtotal >= 500 && (
                      <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        Free &gt; ₹500
                      </span>
                    )}
                  </span>
                  <span className={`font-bold ${deliveryCharge === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text)]'}`}>
                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                  </span>
                </div>

                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Platform Protection & Tax</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0 (Waived)</span>
                </div>

                <div className="pt-3 border-t border-dashed border-[var(--border)] flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-black text-[var(--text)] block">
                      Total Payable
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">Includes all taxes and delivery</span>
                  </div>
                  <span className="text-2xl font-black text-[#FF6B35]">
                    ₹{total}
                  </span>
                </div>
              </div>

              {/* Delivery ETA Pill */}
              <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/40 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#FF6B35] text-white">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#FF6B35] block">Hyperlocal Fresh Dispatch</span>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Estimated arrival within <strong>2 hours</strong>
                  </p>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-bold text-[var(--text)] flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> 100% Buyer Protection
                </p>
                <p className="text-[11px]">Guaranteed fresh or hassle-free refund through support mediation.</p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
