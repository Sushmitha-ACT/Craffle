import express from 'express';
import { User } from '../models/User.js';
import { Seller } from '../models/Seller.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication and admin-role authorization to all /api/admin routes
router.use('/api/admin', authMiddleware, requireAdmin);

router.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Securely provision a new Admin (restricted to authenticated Admins only)
router.post('/api/admin/users/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const { default: bcrypt } = await import('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newAdmin = (await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'ADMIN'
    })) as any;

    res.status(201).json({ 
      message: 'Admin account created successfully',
      user: { id: newAdmin._id.toString(), name: newAdmin.name, email: newAdmin.email, role: 'ADMIN' }
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

router.get('/api/admin/sellers', async (req, res) => {
  try {
    const { status } = req.query;
    const query: any = status && typeof status === 'string' ? { adminApprovalStatus: status } : {};
    const sellers = await Seller.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).lean();
    res.json(sellers.map(s => ({ 
      ...s, 
      id: s._id.toString(),
      email: (s.userId as any)?.email || ''
    })));
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

router.post('/api/admin/sellers/approve/:id', async (req, res) => {
  try {
    const adminId = (req as any).user?.id;
    const seller = await Seller.findByIdAndUpdate(
      req.params.id, 
      { 
        verificationStatus: 'Approved',
        adminApprovalStatus: 'APPROVED',
        isApproved: true,
        rejectionReason: '',
        reviewedBy: adminId === 'admin' ? undefined : adminId,
        reviewedAt: new Date()
      },
      { new: true }
    );
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    
    // Also ensure user role is confirmed as SELLER
    if (seller.userId) {
      await User.findByIdAndUpdate(seller.userId, { role: 'SELLER' });
    }

    res.json({ message: 'Seller approved successfully', seller: { ...seller.toObject(), id: seller._id.toString() } });
  } catch(e) {
    res.status(500).json({ error: 'Failed to approve seller' });
  }
});

router.post('/api/admin/sellers/reject/:id', async (req, res) => {
  try {
    const adminId = (req as any).user?.id;
    const { reason, comment } = req.body;
    const finalReason = reason || comment || 'Application rejected by administrator.';

    const seller = await Seller.findByIdAndUpdate(
      req.params.id, 
      { 
        verificationStatus: 'Rejected',
        adminApprovalStatus: 'REJECTED',
        isApproved: false,
        rejectionReason: finalReason,
        reviewedBy: adminId === 'admin' ? undefined : adminId,
        reviewedAt: new Date()
      },
      { new: true }
    );
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ message: 'Seller rejected', seller: { ...seller.toObject(), id: seller._id.toString() } });
  } catch(e) {
    res.status(500).json({ error: 'Failed to reject seller' });
  }
});

router.get('/api/admin/stats', async (req, res) => {
  try {
    const { Product } = await import('../models/Product.js');
    const { Order } = await import('../models/Order.js');

    const [customersCount, sellersCount, pendingSellersCount, productsCount, orders] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      Seller.countDocuments({ adminApprovalStatus: 'APPROVED' }),
      Seller.countDocuments({ adminApprovalStatus: 'PENDING' }),
      Product.countDocuments(),
      Order.find({}).lean()
    ]);

    const platformRevenue = Math.round(orders.reduce((acc, o: any) => acc + ((o.totalAmount || 0) * 0.1), 0));

    res.json({
      customersCount,
      sellersCount,
      pendingSellersCount,
      productsCount,
      ordersCount: orders.length,
      platformRevenue
    });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET all orders for the Split Ledger auditing tab
router.get('/api/admin/orders', async (req, res) => {
  try {
    const { Order } = await import('../models/Order.js');
    const orders = await Order.find({})
      .populate('customerId', 'name email phone')
      .populate('sellerId', 'name storeName phone')
      .populate('products.productId', 'productName name')
      .sort({ createdAt: -1 })
      .lean();

    const mapped = orders.map((o: any) => {
      let status = 'CONFIRMED';
      if (o.orderStatus === 'Pending') status = 'PENDING';
      else if (o.orderStatus === 'Preparing') status = 'PREPARING';
      else if (o.orderStatus === 'Ready for Pickup') status = 'READY';
      else if (o.orderStatus === 'Out for Delivery') status = 'OUT_FOR_DELIVERY';
      else if (o.orderStatus === 'Delivered') status = 'DELIVERED';
      else if (o.orderStatus === 'Cancelled') status = 'CANCELLED';

      const customerName = o.customerId?.name || o.customerId?.email || 'Walk-in Customer';
      const sellerName = o.sellerId?.storeName || o.sellerId?.name || 'Local Kitchen';

      return {
        id: o._id.toString(),
        customerId: o.customerId?._id?.toString() || '',
        customerName,
        sellerId: o.sellerId?._id?.toString() || '',
        sellerName,
        items: (o.products || []).map((p: any) => ({
          productId: p.productId?._id?.toString() || '',
          name: p.productId?.productName || p.productId?.name || 'Item',
          price: p.price || 0,
          quantity: p.quantity || 1
        })),
        total: o.totalAmount || 0,
        status,
        fulfillmentMethod: o.fulfillmentMethod || 'DELIVERY',
        address: o.address || '',
        phone: o.phone || '',
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
      };
    });

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// GET all support tickets for Helpdesk routing
router.get('/api/admin/tickets', async (req, res) => {
  try {
    const { SupportTicket } = await import('../models/SupportTicket.js');
    let tickets = await SupportTicket.find({}).sort({ createdAt: -1 }).lean();

    // If no tickets exist, seed initial sample tickets so Helpdesk is populated
    if (tickets.length === 0) {
      await SupportTicket.create([
        {
          senderId: 'demo-cust-1',
          senderName: 'Ananya Sharma',
          senderRole: 'CUSTOMER',
          subject: 'Late delivery query for order #1042',
          message: 'Hello Craffle team, my homemade ghee roast package has not arrived yet. Could you check the delivery status?',
          status: 'OPEN',
          replies: []
        },
        {
          senderId: 'demo-seller-1',
          senderName: "Priya's Organic Kitchen",
          senderRole: 'SELLER',
          subject: 'Question regarding weekly payout settlement',
          message: 'Hi Support, could you please verify when the net 90% payout for batch #89 is disbursed to our bank?',
          status: 'RESOLVED',
          replies: [
            {
              senderId: 'admin',
              senderName: 'Craffle Head Admin',
              senderRole: 'ADMIN',
              message: 'Hello Priya, settlements are processed every Tuesday morning directly to your verified IFSC account.',
              createdAt: new Date()
            }
          ]
        }
      ]);
      tickets = await SupportTicket.find({}).sort({ createdAt: -1 }).lean();
    }

    res.json(tickets.map((t: any) => ({
      id: t._id.toString(),
      senderId: t.senderId,
      senderName: t.senderName,
      senderRole: t.senderRole,
      subject: t.subject,
      message: t.message,
      status: t.status,
      replies: (t.replies || []).map((r: any) => ({
        id: r._id ? r._id.toString() : (r.id || ''),
        senderId: r.senderId,
        senderName: r.senderName,
        senderRole: r.senderRole,
        message: r.message,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
      })),
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    })));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch admin tickets' });
  }
});

// Toggle status of a support ticket (OPEN / RESOLVED)
router.post('/api/admin/tickets/:id/status', async (req, res) => {
  try {
    const { SupportTicket } = await import('../models/SupportTicket.js');
    const { status } = req.body;
    const nextStatus = status === 'RESOLVED' ? 'RESOLVED' : 'OPEN';

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    res.json({
      message: 'Status updated',
      ticket: {
        ...ticket.toObject(),
        id: ticket._id.toString(),
        replies: (ticket.replies || []).map((r: any) => ({
          id: r._id.toString(),
          senderId: r.senderId,
          senderName: r.senderName,
          senderRole: r.senderRole,
          message: r.message,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
        }))
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

export default router;
