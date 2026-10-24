import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

router.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().lean();
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

import { Seller } from '../models/Seller.js';

router.get('/api/admin/sellers', async (req, res) => {
  try {
    const sellers = await Seller.find().lean();
    res.json(sellers.map(s => ({ ...s, id: s._id.toString() })));
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch sellers' });
  }
});

router.post('/api/admin/sellers/approve/:id', async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(req.params.id, { 
      verificationStatus: 'Approved',
      adminApprovalStatus: 'APPROVED'
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ message: 'Seller approved' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to approve seller' });
  }
});

router.post('/api/admin/sellers/reject/:id', async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(req.params.id, { 
      verificationStatus: 'Rejected',
      adminApprovalStatus: 'REJECTED'
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ message: 'Seller rejected' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to reject seller' });
  }
});

export default router;
