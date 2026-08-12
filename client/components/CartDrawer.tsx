/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Minus, Plus, Trash2, ShoppingBag, ArrowRight,
  Tag, MapPin, CreditCard, Truck, Store, ChevronRight,
  CheckCircle, Sparkles, Shield
} from 'lucide-react';
import { CartItem } from '@shared/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartDrawerProps) {
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = subtotal >= 500 ? 0 : 29;
  const discount = couponApplied ? couponDiscount : 0;
  const total = subtotal + deliveryCharge - discount;

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === 'CRAFFLE10') {
      setCouponDiscount(Math.round(subtotal * 0.1));
      setCouponApplied(true);
    } else if (coupon.toUpperCase() === 'FIRST50') {
      setCouponDiscount(50);
      setCouponApplied(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col"
            style={{ background: 'var(--bg)', boxShadow: 'var(--shadow-xl)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Your Cart</h2>
                <span className="badge badge-primary">{items.length} items</span>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                style={{ color: 'var(--muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <ShoppingBag className="w-10 h-10" style={{ color: 'var(--muted)' }} />
                  </div>
                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>Your cart is empty</h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                    Discover amazing homemade creations nearby
                  </p>
                  <button onClick={onClose} className="btn-primary text-sm">
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <div key={item.productId} className="card-surface p-3 flex gap-3 animate-fade-in">
                      <img src={item.image} alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--primary)' }}>{item.sellerName}</p>
                        <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{item.name}</h4>
                        <p className="text-base font-extrabold mt-1" style={{ color: 'var(--text)' }}>₹{item.price * item.quantity}</p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-0 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                            <button
                              onClick={() => onUpdateQuantity(item.productId, -1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 h-8 flex items-center justify-center text-sm font-bold"
                              style={{ color: 'var(--text)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.productId, 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => onRemove(item.productId)}
                            className="p-1.5 rounded-lg hover:bg-[var(--danger-light)] transition-colors"
                            style={{ color: 'var(--danger)' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Coupon */}
                  <div className="card-surface p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Apply Coupon</span>
                    </div>
                    {couponApplied ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--success-light)' }}>
                        <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                          {coupon.toUpperCase()} applied! You save ₹{discount}
                        </span>
                        <button onClick={() => { setCouponApplied(false); setCoupon(''); }}
                          className="ml-auto text-xs font-medium" style={{ color: 'var(--danger)' }}>Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={coupon}
                          onChange={e => setCoupon(e.target.value)}
                          placeholder="Enter code (try CRAFFLE10)"
                          className="input-field text-xs py-2"
                        />
                        <button onClick={handleApplyCoupon} className="btn-secondary text-xs px-4 py-2 whitespace-nowrap">Apply</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer / Summary */}
            {items.length > 0 && (
              <div className="border-t p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Delivery</span>
                    <span className="font-semibold" style={{ color: deliveryCharge === 0 ? 'var(--success)' : 'var(--text)' }}>
                      {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--success)' }}>Coupon Discount</span>
                      <span className="font-semibold" style={{ color: 'var(--success)' }}>-₹{discount}</span>
                    </div>
                  )}
                  <div className="divider" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold" style={{ color: 'var(--text)' }}>Total</span>
                    <span className="font-extrabold" style={{ color: 'var(--text)' }}>₹{total}</span>
                  </div>
                </div>

                {subtotal < 500 && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--primary)' }}>
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Add ₹{500 - subtotal} more for free delivery!
                  </p>
                )}

                <button onClick={onCheckout} className="btn-primary w-full py-3 text-base font-bold rounded-xl">
                  Proceed to Checkout <ArrowRight className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-center gap-4 text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Fast Delivery</span>
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Easy Pay</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
