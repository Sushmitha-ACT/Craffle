/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, Clock, Package, Truck, MapPin,
  Phone, ArrowLeft, XCircle, ChefHat
} from 'lucide-react';
import { Order, OrderStatus } from '@shared/types';

interface OrderTrackingPageProps {
  order: Order;
  onBack: () => void;
  onCancelOrder: (orderId: string) => void;
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

export default function OrderTrackingPage({ order, onBack, onCancelOrder }: OrderTrackingPageProps) {
  const statusUpper = order.status.toUpperCase();
  const isCancelled = statusUpper === 'CANCELLED';
  
  const activeSteps = order.fulfillmentMethod === 'SELF_PICKUP' ? PICKUP_STEPS : DELIVERY_STEPS;
  const statusOrder = activeSteps.map(s => s.status);
  
  const currentStepIndex = statusOrder.indexOf(order.status as any);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Order #{order.id.slice(-6)}</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`card-surface p-4 mb-6 ${isCancelled ? '' : ''}`}
        style={{ borderLeft: `4px solid ${isCancelled ? 'var(--danger)' : 'var(--primary)'}` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: isCancelled ? 'var(--danger-light)' : statusUpper === 'DELIVERED' ? 'var(--success-light)' : 'var(--primary-light)',
              color: isCancelled ? 'var(--danger)' : statusUpper === 'DELIVERED' ? 'var(--success)' : 'var(--primary)',
            }}>
            {isCancelled ? <XCircle className="w-6 h-6" /> : statusUpper === 'DELIVERED' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {isCancelled ? 'Order Cancelled' : statusUpper === 'DELIVERED' || statusUpper === 'PICKED UP' ? 'Order Completed! 🎉' : `Status: ${order.status.replace(/_/g, ' ')}`}
            </h3>
            {order.estimatedDelivery && !isCancelled && statusUpper !== 'DELIVERED' && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Estimated delivery: <strong>{order.estimatedDelivery}</strong>
              </p>
            )}
            {isCancelled && order.cancelReason && (
              <p className="text-xs" style={{ color: 'var(--danger)' }}>Reason: {order.cancelReason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="card-surface p-5 mb-6">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Order Timeline</h3>
          <div className="space-y-1">
            {activeSteps.map((step, i) => {
              const isCompleted = i < currentStepIndex;
              const isActive = i === currentStepIndex;
              const isPending = i > currentStepIndex;

              return (
                <div key={step.status} className="timeline-step pb-4">
                  <motion.div
                    initial={isActive ? { scale: 0.8 } : {}}
                    animate={isActive ? { scale: [0.8, 1.1, 1] } : {}}
                    transition={{ duration: 0.5 }}
                    className={`timeline-dot ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.icon}
                  </motion.div>
                  <div className="pt-1">
                    <h4 className="text-sm font-bold" style={{ color: isPending ? 'var(--muted)' : 'var(--text)' }}>{step.label}</h4>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="card-surface p-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Items</h3>
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.productId} className="flex items-center justify-between py-2 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>x{item.quantity}</p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="divider mt-3 mb-3" />
        <div className="flex justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Total</span>
          <span className="text-base font-extrabold" style={{ color: 'var(--primary)' }}>₹{order.total}</span>
        </div>
      </div>

      {/* Details */}
      <div className="card-surface p-5 mb-6">
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Order Details</h3>
        
        {order.fulfillmentMethod === 'SELF_PICKUP' && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Pickup From</h4>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{order.sellerName}</p>
            
            {(order.status as any) === 'Pending' ? (
              <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-100 flex gap-3 items-start">
                <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 font-medium leading-relaxed">
                  The exact pickup location and directions will be revealed here once the seller approves your request.
                </p>
              </div>
            ) : (
              order.sellerLocation && order.sellerLocation.latitude && (
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.sellerLocation?.latitude},${order.sellerLocation?.longitude}`, '_blank')}
                  className="mt-4 btn-secondary py-2 text-xs flex items-center justify-center gap-1.5 w-full"
                >
                  <MapPin className="w-3 h-3" /> Get Directions
                </button>
              )
            )}
          </div>
        )}
        
        {order.fulfillmentMethod === 'DELIVERY' && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Delivery Address</h4>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{order.address}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>Phone: {order.phone}</p>
          </div>
        )}
      </div>

      {/* Cancel button */}
      {statusUpper === 'PENDING' && !isCancelled && (
        <button
          onClick={() => onCancelOrder(order.id)}
          className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)30' }}
        >
          Cancel Order
        </button>
      )}
    </div>
  );
}
