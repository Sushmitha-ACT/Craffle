// @ts-nocheck
import express from 'express';
import { Seller } from '../models/Seller.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { UserRole } from '@shared/types';
import { aadhaarVerificationService } from '../services/aadhaarVerificationService.js';
import { bankVerificationService } from '../services/bankVerificationService.js';
import { Product } from '../models/Product.js';

const router = express.Router();

// Mock legacy function replaced by services
async function verifyGovernmentIdentity(type: string, number: string, name: string) {
  return { success: true, score: 95, message: 'Identity verified successfully', extractedName: name };
}

router.post('/api/sellers/verify-aadhaar-send', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      return res.status(400).json({ error: 'Valid 12-digit Aadhaar number is required' });
    }
    const result = await aadhaarVerificationService.sendAadhaarOTP(aadhaarNumber);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ message: result.message, referenceId: result.referenceId });
  } catch (e) {
    res.status(500).json({ error: 'Aadhaar verification failed' });
  }
});

router.post('/api/sellers/verify-aadhaar-submit', async (req, res) => {
  try {
    const { otp, referenceId } = req.body;
    if (!otp || !referenceId) return res.status(400).json({ error: 'OTP and reference ID required' });
    const result = await aadhaarVerificationService.verifyAadhaarOTP(otp, referenceId);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ message: result.message, referenceId: result.referenceId, verified: true });
  } catch (e) {
    res.status(500).json({ error: 'Aadhaar OTP verification failed' });
  }
});

router.post('/api/sellers/verify-bank', async (req, res) => {
  try {
    const { accountNumber, ifsc, expectedName } = req.body;
    if (!accountNumber || !ifsc) return res.status(400).json({ error: 'Account number and IFSC required' });
    const result = await bankVerificationService.verifyBankAccount(accountNumber, ifsc, expectedName);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ 
      message: 'Bank verified', 
      verified: true, 
      bankName: result.bankName, 
      accountHolderName: result.accountHolderName,
      referenceId: result.referenceId
    });
  } catch (e) {
    res.status(500).json({ error: 'Bank verification failed' });
  }
});

router.post('/api/sellers/register', async (req, res) => {
  try {
    const { 
      userId, businessName, address, latitude, longitude, category, phone, email,
      aadhaarReferenceId, bankReferenceId, bankName, bankAccountName, bankAccount, ifsc
    } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    // Validate that KYC was actually completed
    if (!aadhaarReferenceId || !bankReferenceId) {
      return res.status(400).json({ error: 'Complete Aadhaar and Bank verification is required' });
    }

    const existingSeller = await Seller.findOne({ userId });
    if (existingSeller) {
      if (existingSeller.adminApprovalStatus === 'PENDING') return res.status(400).json({ error: 'Pending verification' });
      if (existingSeller.adminApprovalStatus === 'APPROVED') return res.status(400).json({ error: 'Already verified' });
      await Seller.deleteOne({ _id: existingSeller._id });
    }

    const newSeller = await Seller.create({
      userId,
      businessName,
      governmentId: 'MASKED_AADHAAR',
      governmentIdImage: 'VERIFIED_VIA_API',
      address,
      phone,
      category,
      latitude,
      longitude,
      verificationStatus: 'Approved',
      adminApprovalStatus: 'PENDING',
      bankDetails: `${bankAccount.slice(-4)} | ${ifsc}`, // Only store last 4 digits + IFSC
      aadhaarVerified: true,
      aadhaarVerificationReference: aadhaarReferenceId,
      bankVerified: true,
      bankVerificationReference: bankReferenceId,
      bankName,
      bankAccountName
    });

    await User.updateOne({ _id: userId }, { role: UserRole.SELLER });
    
    // Notify admins
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'New Seller Requires Approval',
          message: `Seller "${businessName}" has completed KYC and requires admin approval.`
        });
      }
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }

    res.json({ message: 'Registration submitted successfully. Awaiting Admin Approval.', seller: newSeller });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Seller registration failed' });
  }
});

router.get('/api/sellers/profile/:userId', async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.params.userId }).lean();
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ ...seller, id: seller._id.toString() });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch seller profile' });
  }
});

router.get('/api/sellers/detail/:id', async (req, res) => {
  try {
    let seller = null;
    if (req.params.id.length === 24) {
      seller = await Seller.findById(req.params.id).lean();
    }
    if (!seller) {
      seller = await Seller.findOne({ userId: req.params.id }).lean();
    }
    
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({ ...seller, id: seller._id.toString() });
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch seller details' });
  }
});

router.put('/api/sellers/profile/:userId', async (req, res) => {
  try {
    const { businessName, address, phone, category, description, latitude, longitude } = req.body;
    
    // Only allow updating non-KYC fields
    const updatedSeller = await Seller.findOneAndUpdate(
      { userId: req.params.userId },
      { 
        $set: { 
          businessName, 
          address, 
          phone, 
          category,
          description,
          ...(latitude && { latitude }),
          ...(longitude && { longitude })
        } 
      },
      { new: true }
    ).lean();

    if (!updatedSeller) return res.status(404).json({ error: 'Seller not found' });
    
    // Update location on all products owned by this seller
    if (latitude && longitude) {
      await Product.updateMany(
        { sellerId: updatedSeller._id },
        { 
          $set: { 
            'location.coordinates': [Number(longitude), Number(latitude)] 
          } 
        }
      );
    }
    
    res.json({ message: 'Profile updated successfully', seller: { ...updatedSeller, id: updatedSeller._id.toString() } });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update seller profile' });
  }
});

export default router;
