// @ts-nocheck
import express from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Seller } from '../models/Seller.js';
import { Notification } from '../models/Notification.js';
import { locationService } from '../services/locationService.js';
import { sendEmail } from '../services/emailService.js';
import { Settings } from '../models/Settings.js';
import { Device } from '../models/Device.js';

const router = express.Router();

// Create new order
router.post('/api/orders', async (req, res) => {
  try {
    console.log('Order request body:', JSON.stringify(req.body, null, 2));
    const { 
      customerId, sellerId, products, paymentId, totalAmount,
      fulfillmentMethod, address, phone, customerLocation, sellerLocation, distanceKm 
    } = req.body;
    let finalSellerId = sellerId;
    if (typeof sellerId === 'object' && sellerId !== null && sellerId._id) {
      finalSellerId = sellerId._id;
    }
    
    if (!customerId || !finalSellerId || !products || !products.length || !fulfillmentMethod) {
      return res.status(400).json({ error: 'Missing required order details' });
    }

    const { sourcePage } = req.body;
    if (fulfillmentMethod === 'SELF_PICKUP' && sourcePage !== 'nearby' && customerLocation?.latitude && customerLocation?.longitude) {
      const seller = await Seller.findById(finalSellerId);
      if (seller && seller.latitude && seller.longitude) {
        const sLat = parseFloat(seller.latitude);
        const sLng = parseFloat(seller.longitude);
        const distance = locationService.calculateDistance(customerLocation.latitude, customerLocation.longitude, sLat, sLng);
        if (distance !== undefined && distance > 10) {
          return res.status(400).json({ error: 'Self pickup is only available within 10 km distance' });
        }
      }
    }

    const newOrder = await Order.create({
      customerId,
      sellerId: finalSellerId,
      products,
      paymentId,
      fulfillmentMethod,
      address,
      phone,
      customerLocation,
      sellerLocation,
      distanceKm,
      totalAmount,
      orderStatus: fulfillmentMethod === 'SELF_PICKUP' ? 'Pending' : 'Confirmed'
    });

    const sellerObj = await Seller.findById(finalSellerId);
    if (sellerObj && sellerObj.userId) {
      const isPickup = fulfillmentMethod === 'SELF_PICKUP';
      // Notify seller about the new order/request
      await Notification.create({
        userId: sellerObj.userId,
        title: isPickup ? '📦 New Self Pickup Request' : '🛍️ New Delivery Order',
        message: `You have received a new ${isPickup ? 'pickup request' : 'order'} #${newOrder._id.toString().slice(-6)}.`
      });
    }

    // Notify the customer that their request/order was received
    await Notification.create({
      userId: customerId,
      title: fulfillmentMethod === 'SELF_PICKUP' ? '📍 Pickup Request Sent!' : '✅ Order Placed Successfully!',
      message: fulfillmentMethod === 'SELF_PICKUP'
        ? `Your self-pickup request #${newOrder._id.toString().slice(-6)} has been sent to the seller. You'll be notified once they respond.`
        : `Your order #${newOrder._id.toString().slice(-6)} has been confirmed and is being prepared.`
    });

    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order: ' + err.message });
  }
});

// Get orders by customer
router.get('/api/orders/customer/:customerId', async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.customerId as any })
      .populate('sellerId', 'businessName')
      .populate('products.productId', 'productName')
      .sort({ createdAt: -1 })
      .lean();

    const mappedOrders = orders.map((o: any) => ({
      id: o._id.toString(),
      sellerName: o.sellerId?.businessName || 'Unknown Seller',
      status: o.orderStatus,
      items: o.products.map((p: any) => ({
        name: p.productId?.productName || 'Unknown Product',
        quantity: p.quantity,
        price: p.price
      })),
      createdAt: o.createdAt,
      total: o.totalAmount
    }));

    res.json(mappedOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Cancel order
router.post('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.orderId as any, { orderStatus: 'Cancelled' }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get stats for a specific seller
router.get('/api/seller/stats/:sellerId', async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.params.sellerId as any, orderStatus: 'Delivered' }).lean();
    const revenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const commissionDeducted = Math.round(revenue * 0.1);
    const netEarnings = revenue - commissionDeducted;
    
    res.json({
      revenue,
      commissionDeducted,
      netEarnings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get orders for a specific seller
router.get('/api/seller/orders/:sellerId', async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.params.sellerId as any })
      .populate('customerId', 'name phone')
      .populate('products.productId', 'productName')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = orders.map((o: any) => {
      let status = 'PENDING';
      if (o.orderStatus === 'Preparing') status = 'PREPARING';
      else if (o.orderStatus === 'Out for Delivery') status = 'OUT_FOR_DELIVERY';
      else if (o.orderStatus === 'Delivered') status = 'DELIVERED';
      else if (o.orderStatus === 'Cancelled') status = 'CANCELLED';
      
      return {
        id: o._id.toString(),
        customerName: o.customerId?.name || 'Customer',
        phone: o.phone || o.customerId?.phone || '',
        address: o.address || '',
        items: o.products.map((p: any) => ({
          name: p.productId?.productName || 'Homemade Creation',
          quantity: p.quantity,
          price: p.price
        })),
        total: o.totalAmount,
        status,
        fulfillmentMethod: o.fulfillmentMethod,
        createdAt: o.createdAt
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seller orders' });
  }
});

// Update order status (Seller workflow)
router.post('/api/seller/orders/:orderId/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    let orderStatus = 'Pending';
    if (status === 'PREPARING') orderStatus = 'Preparing';
    else if (status === 'OUT_FOR_DELIVERY') orderStatus = 'Out for Delivery';
    else if (status === 'DELIVERED') orderStatus = 'Delivered';
    else if (status === 'REJECTED') orderStatus = 'Cancelled';
    
    const order = await Order.findByIdAndUpdate(
      req.params.orderId as any,
      { orderStatus },
      { new: true }
    );
    
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.customerId) {
      const customer = await User.findById(order.customerId);
      const isReject = status === 'REJECTED';
      const isApprove = order.fulfillmentMethod === 'SELF_PICKUP' && status === 'PREPARING';
      
      const title = isReject
        ? '❌ Pickup Request Rejected'
        : isApprove
          ? '✅ Pickup Request Approved!'
          : order.fulfillmentMethod === 'SELF_PICKUP' && orderStatus === 'Ready for Pickup'
            ? '📦 Ready for Pickup!'
            : `🔄 Order Status Updated`;
        
      const message = isReject 
        ? `Your pickup request for order #${order._id.toString().slice(-6)} was rejected. Reason: ${reason || 'Not specified'}.`
        : isApprove
          ? `Great news! Your pickup request #${order._id.toString().slice(-6)} has been approved by the seller. You can now head over to pick it up!`
          : `Your order #${order._id.toString().slice(-6)} is now: ${orderStatus}.`;
      
      const settings = await Settings.findOne({ userId: order.customerId });
      const pushEnabled = settings ? settings.pushNotifications : true;
      const emailEnabled = settings ? settings.emailAlerts : false;

      // Always create an in-app notification for the customer
      await Notification.create({
        userId: order.customerId,
        title,
        message
      });

      if (pushEnabled) {
        const devices = await Device.find({ userId: order.customerId });
        if (devices.length > 0) {
          console.log(`[PUSH NOTIFICATION] Dispatched to ${devices.length} devices for customer ${order.customerId}: "${title} - ${message}"`);
        } else {
          console.log(`[PUSH NOTIFICATION] Customer ${order.customerId} has push enabled, but no registered devices.`);
        }
      } else {
        console.log(`[PUSH NOTIFICATION BLOCKED] Push notification to customer ${order.customerId} blocked (disabled in settings).`);
      }

      // Send email on rejection
      if (isReject && customer && customer.email) {
        if (emailEnabled) {
          await sendEmail(
            customer.email,
            'Pickup Request Rejected',
            `<p>Hi ${customer.name},</p>
             <p>Unfortunately, the seller has rejected your pickup request for order <b>#${order._id.toString().slice(-6)}</b>.</p>
             <p><b>Reason provided by seller:</b> ${reason || 'No reason provided.'}</p>
             <p>We apologize for the inconvenience. Please browse other sellers on Craffle.</p>`
          );
          console.log(`[EMAIL DISPATCH] Sent order rejection email to ${customer.email}.`);
        } else {
          console.log(`[EMAIL BLOCKED] Order rejection email to ${customer.email} was blocked (disabled in settings).`);
        }
      }

      // Send email on approval of pickup request
      if (isApprove && customer && customer.email) {
        if (emailEnabled) {
          await sendEmail(
            customer.email,
            'Pickup Request Approved! ✅',
            `<p>Hi ${customer.name},</p>
             <p>Great news! The seller has <b>approved</b> your self-pickup request for order <b>#${order._id.toString().slice(-6)}</b>.</p>
             <p>You can now head over to the seller's location to pick up your order.</p>
             <p>Thank you for using Craffle!</p>`
          );
          console.log(`[EMAIL DISPATCH] Sent order approval email to ${customer.email}.`);
        } else {
          console.log(`[EMAIL BLOCKED] Order approval email to ${customer.email} was blocked (disabled in settings).`);
        }
      }
    }

    res.json({ message: 'Order status updated successfully', orderStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
