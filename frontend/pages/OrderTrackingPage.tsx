/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, Clock, Package, Truck, MapPin,
  Phone, ArrowLeft, XCircle, ChefHat, CreditCard,
  Store, Copy, Check, HelpCircle, FileText, ChevronRight
} from 'lucide-react';
import { Order } from '@shared/types';

interface OrderTrackingPageProps {
  order: Order;
  onBack: () => void;
  onCancelOrder: (orderId: string) => void;
  onNavigate?: (page: string) => void;
}

const DELIVERY_STEPS = [
  { status: 'Confirmed', label: 'Order Confirmed', icon: <Package className="w-4 h-4" />, desc: 'Order received and confirmed' },
  { status: 'Preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" />, desc: 'Seller is preparing your order' },
  { status: 'Ready for Pickup', label: 'Ready for Pickup', icon: <Package className="w-4 h-4" />, desc: 'Order is ready for delivery partner' },
  { status: 'Delivery Partner Assigned', label: 'Partner Assigned', icon: <Truck className="w-4 h-4" />, desc: 'Delivery partner is on the way' },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: <Truck className="w-4 h-4" />, desc: 'Partner is delivering to your location' },
  { status: 'Delivered', label: 'Delivered', icon: <CheckCircle className="w-4 h-4" />, desc: 'Order delivered successfully!' },
];

const PICKUP_STEPS = [
  { status: 'Confirmed', label: 'Order Confirmed', icon: <Package className="w-4 h-4" />, desc: 'Order received and confirmed' },
  { status: 'Preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" />, desc: 'Seller is preparing your order' },
  { status: 'Ready for Pickup', label: 'Ready for Pickup', icon: <MapPin className="w-4 h-4" />, desc: 'Order is ready for you to pick up' },
  { status: 'Picked Up', label: 'Picked Up', icon: <CheckCircle className="w-4 h-4" />, desc: 'Order picked up successfully!' },
];

export default function OrderTrackingPage({ order: initialOrder, onBack, onCancelOrder, onNavigate }: OrderTrackingPageProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [copied, setCopied] = useState(false);
  const [loadingFresh, setLoadingFresh] = useState(false);

  // If order details (e.g. address, phone, fulfillmentMethod) might be missing from cached state, fetch fresh from backend
  useEffect(() => {
    setOrder(initialOrder);
    const orderId = initialOrder.id || (initialOrder as any)._id;
    if (!orderId) return;

    // Check if key details are missing
    if (!initialOrder.address || !initialOrder.fulfillmentMethod || !initialOrder.phone) {
      setLoadingFresh(true);
      fetch(`/api/orders/${orderId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.id) {
            setOrder(prev => ({ ...prev, ...data }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingFresh(false));
    }
  }, [initialOrder]);

  const statusRaw = order.status || 'Pending';
  const statusUpper = statusRaw.toUpperCase();
  const isCancelled = statusUpper === 'CANCELLED';

  const isPickup = String(order.fulfillmentMethod || '').toUpperCase() === 'SELF_PICKUP';
  const activeSteps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const statusOrder = activeSteps.map(s => s.status.toLowerCase());

  // Match step index
  const currentStepIndex = statusOrder.findIndex(
    s => s === statusRaw.toLowerCase()
  );

  const formatDate = (d?: string) => {
    if (!d) return 'Just now';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return d;
    }
  };

  const handleCopyId = () => {
    if (order.id) {
      navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deliveryAddress = order.address || (order as any).deliveryAddress;
  const contactPhone = order.phone || (order as any).customerPhone;
  const paymentId = order.paymentId || (order as any).paymentReference;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 page-enter transition-colors duration-200">
      {/* Top Navigation & Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors shadow-xs"
            aria-label="Back to orders"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[var(--text)]">
                Order #{order.id ? order.id.slice(-6).toUpperCase() : 'DETAILS'}
              </h1>
              <button
                onClick={handleCopyId}
                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--muted)] hover:text-orange-500 transition-colors"
                title="Copy Full Order ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('helpdesk')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-orange-300 text-xs font-semibold text-[var(--text-secondary)] hover:text-orange-600 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-orange-500" /> Need Help?
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-2xl mb-6 border transition-colors ${
        isCancelled
          ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
          : statusUpper === 'DELIVERED' || statusUpper === 'PICKED UP'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-orange-500/10 border-orange-500/20 text-orange-900 dark:text-orange-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isCancelled
              ? 'bg-red-500/20 text-red-600 dark:text-red-400'
              : statusUpper === 'DELIVERED' || statusUpper === 'PICKED UP'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
          }`}>
            {isCancelled ? <XCircle className="w-6 h-6" /> : statusUpper === 'DELIVERED' || statusUpper === 'PICKED UP' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold">
              {isCancelled
                ? 'Order Cancelled'
                : statusUpper === 'DELIVERED' || statusUpper === 'PICKED UP'
                  ? 'Order Completed Successfully! 🎉'
                  : `Order Status: ${statusRaw.replace(/_/g, ' ')}`}
            </h3>
            {order.estimatedDelivery && !isCancelled && statusUpper !== 'DELIVERED' && (
              <p className="text-xs mt-0.5 opacity-90">
                Estimated Delivery: <strong className="font-bold">{order.estimatedDelivery}</strong>
              </p>
            )}
            {isCancelled && order.cancelReason && (
              <p className="text-xs mt-0.5 text-red-600 dark:text-red-400 font-medium">
                Reason: {order.cancelReason}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Stepper */}
      {!isCancelled && (
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 mb-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--text)]">Order Progress</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]">
              {isPickup ? 'Self Pickup Flow' : 'Standard Delivery'}
            </span>
          </div>

          <div className="space-y-4">
            {activeSteps.map((step, i) => {
              const isCompleted = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              const isPending = i > currentStepIndex;

              return (
                <div key={step.status} className="flex items-start gap-4 relative">
                  {/* Connecting Line */}
                  {i < activeSteps.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-8 -ml-[1px] transition-colors ${
                        isCompleted ? 'bg-orange-500' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}

                  {/* Icon Circle */}
                  <motion.div
                    initial={isActive ? { scale: 0.8 } : {}}
                    animate={isActive ? { scale: [0.8, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all ${
                      isCompleted
                        ? 'bg-orange-500 text-white shadow-xs'
                        : isActive
                          ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-2 border-orange-500 shadow-sm'
                          : 'bg-[var(--bg-secondary)] text-[var(--muted)] border border-[var(--border)]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.icon}
                  </motion.div>

                  {/* Text details */}
                  <div className="flex-1 pt-0.5 pb-3">
                    <h4 className={`text-sm font-bold transition-colors ${
                      isActive ? 'text-orange-600 dark:text-orange-400' : isPending ? 'text-[var(--muted)]' : 'text-[var(--text)]'
                    }`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items Summary Card */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 mb-6 shadow-xs transition-colors duration-200">
        <h3 className="text-sm font-bold text-[var(--text)] mb-4">Items Ordered</h3>
        <div className="space-y-3">
          {(order.items || []).map((item, idx) => (
            <div
              key={item.productId || idx}
              className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-orange-500 shrink-0 font-bold text-xs">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="w-5 h-5 text-[var(--muted)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{item.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Quantity: {item.quantity} × ₹{item.price}</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-[var(--text)]">
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] mt-4 pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Subtotal</span>
            <span className="font-semibold text-[var(--text)]">₹{order.total}</span>
          </div>
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Delivery Fee</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {isPickup ? 'Free (Self Pickup)' : 'Free Delivery'}
            </span>
          </div>
          <div className="border-t border-[var(--border)] pt-2.5 flex justify-between items-center text-base">
            <span className="font-bold text-[var(--text)]">Total Paid</span>
            <span className="text-lg font-black text-orange-600 dark:text-orange-400">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Order Details Card */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 mb-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">Order Details</h3>
              <p className="text-xs text-[var(--text-secondary)]">Fulfillment, address and transaction records</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
            isPickup
              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
          }`}>
            {isPickup ? '📍 Self Pickup' : '🚚 Doorstep Delivery'}
          </span>
        </div>

        <div className="space-y-4">
          {/* Fulfillment & Destination Section */}
          {isPickup ? (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Pickup Location & Creator
                  </h4>
                  <p className="text-sm font-bold text-[var(--text)]">
                    {order.sellerName || 'Craffle Creator'}
                  </p>
                  {order.sellerAddress && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                      {order.sellerAddress}
                    </p>
                  )}
                  {order.sellerPhone && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-orange-500" /> {order.sellerPhone}
                    </p>
                  )}

                  {statusUpper === 'PENDING' ? (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2.5 items-center">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        The exact pickup location and directions will be enabled here once the creator approves your request.
                      </p>
                    </div>
                  ) : (
                    order.sellerLocation && order.sellerLocation.latitude && (
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.sellerLocation?.latitude},${order.sellerLocation?.longitude}`, '_blank')}
                        className="mt-3 py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Get Directions on Maps
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Delivery Address
                  </h4>
                  <p className="text-sm font-semibold text-[var(--text)] leading-relaxed">
                    {deliveryAddress || 'Address specified during checkout'}
                  </p>
                  {contactPhone && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-orange-500" /> Contact Phone: {contactPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seller and Payment Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Seller Info */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Seller / Kitchen
              </span>
              <p className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-orange-500" />
                {order.sellerName || 'Craffle Artisan'}
              </p>
              {order.sellerAddress && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate" title={order.sellerAddress}>
                  {order.sellerAddress}
                </p>
              )}
            </div>

            {/* Payment Summary */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                Payment Status
              </span>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Paid Online
                </span>
                <span className="text-xs font-bold text-[var(--text)]">
                  ₹{order.total}
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)] font-mono mt-1.5 truncate" title={paymentId || 'Online Payment'}>
                Payment Ref: {paymentId || 'Razorpay / UPI'}
              </p>
            </div>
          </div>

          {/* Order Reference Footnote */}
          <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span>Order Reference:</span>
              <span className="font-mono font-bold text-[var(--text)]">
                #{order.id ? order.id.slice(-8).toUpperCase() : 'PENDING'}
              </span>
              <button
                onClick={handleCopyId}
                className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--muted)] hover:text-orange-500 transition-colors"
                title="Copy Full ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div>
              Placed: <span className="font-medium text-[var(--text)]">{formatDate(order.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onNavigate && (
          <button
            onClick={() => onNavigate('helpdesk')}
            className="flex-1 py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--bg-secondary)] text-[var(--text)] text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-orange-500" /> Report an Issue or Get Help
          </button>
        )}

        {statusUpper === 'PENDING' && !isCancelled && (
          <button
            onClick={() => onCancelOrder(order.id)}
            className="py-3 px-5 rounded-xl text-sm font-bold transition-all bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
