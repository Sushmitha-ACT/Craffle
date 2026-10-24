// @ts-nocheck
import express from 'express';
import { Seller } from '../models/Seller.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { UserRole } from '@shared/types';
import { aadhaarVerificationService } from '../services/aadhaarVerificationService.js';
import { bankVerificationService } from '../services/bankVerificationService.js';
import { Product } from '../models/Product.js';

import { 
  aadhaarOtpRateLimiter, 
  aadhaarVerifyRateLimiter, 
  bankVerifyRateLimiter 
} from '../middleware/rateLimiter.js';
import { VerificationAudit } from '../models/VerificationAudit.js';

const router = express.Router();

router.post('/api/sellers/verify-aadhaar-send', aadhaarOtpRateLimiter, async (req, res) => {
  try {
    const { aadhaarNumber, userId } = req.body;
    if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
      return res.status(400).json({ error: 'Valid 12-digit Aadhaar number is required' });
    }

    const cleanNumber = aadhaarNumber.replace(/\s+/g, '');
    if (!/^\d{12}$/.test(cleanNumber)) {
      return res.status(400).json({ error: 'Aadhaar number must be exactly 12 numeric digits' });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const result = await aadhaarVerificationService.sendAadhaarOTP(cleanNumber, {
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message, referenceId: result.referenceId });
  } catch (e) {
    console.error('Aadhaar send error:', e);
    res.status(500).json({ error: 'Aadhaar verification service encountered an error' });
  }
});

router.post('/api/sellers/verify-aadhaar-submit', aadhaarVerifyRateLimiter, async (req, res) => {
  try {
    const { otp, referenceId, userId } = req.body;
    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({ error: 'A valid 6-digit numeric OTP is required' });
    }
    if (!referenceId || typeof referenceId !== 'string') {
      return res.status(400).json({ error: 'Aadhaar reference ID is required' });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const result = await aadhaarVerificationService.verifyAadhaarOTP(otp.trim(), referenceId.trim(), {
      ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
      userId
    });

    if (!result.success || !result.verified) {
      return res.status(400).json({ error: result.message || 'Verification failed' });
    }

    res.json({ 
      message: result.message, 
      referenceId: result.referenceId, 
      verified: true 
    });
  } catch (e) {
    console.error('Aadhaar submit error:', e);
    res.status(500).json({ error: 'Aadhaar OTP verification service encountered an error' });
  }
});

router.post('/api/sellers/verify-bank', bankVerifyRateLimiter, async (req, res) => {
  try {
    const { accountNumber, ifsc, expectedName, userId } = req.body;
    if (!accountNumber || typeof accountNumber !== 'string' || !/^\d{9,18}$/.test(accountNumber.trim())) {
      return res.status(400).json({ error: 'Valid bank account number (9-18 digits) is required' });
    }
    if (!ifsc || typeof ifsc !== 'string' || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
      return res.status(400).json({ error: 'Valid 11-character alphanumeric IFSC code is required (e.g. HDFC0001234)' });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const result = await bankVerificationService.verifyBankAccount(
      accountNumber.trim(), 
      ifsc.trim().toUpperCase(), 
      expectedName,
      {
        ipAddress: Array.isArray(clientIp) ? clientIp[0] : clientIp,
        userId
      }
    );

    if (!result.success || !result.verified) {
      return res.status(400).json({ error: result.message || 'Bank account verification failed' });
    }

    res.json({ 
      message: 'Bank verified successfully', 
      verified: true, 
      bankName: result.bankName, 
      accountHolderName: result.accountHolderName,
      referenceId: result.referenceId
    });
  } catch (e) {
    console.error('Bank verify error:', e);
    res.status(500).json({ error: 'Bank verification service encountered an error' });
  }
});

router.post('/api/sellers/register', async (req, res) => {
  try {
    const { 
      userId, businessName, address, latitude, longitude, category, phone, email,
      aadhaarNumber, aadhaarReferenceId, bankReferenceId, bankName, bankAccountName, bankAccount, ifsc
    } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    // In manual review mode, collect seller application details
    const existingSeller = await Seller.findOne({ userId });
    if (existingSeller) {
      const isAlreadyApproved = (existingSeller as any).isApproved === true || 
        (existingSeller as any).adminApprovalStatus === 'APPROVED' || 
        (existingSeller as any).verificationStatus === 'Approved';
      if (isAlreadyApproved) {
        return res.status(400).json({ error: 'Your seller account has already been approved.' });
      }
      if (existingSeller.adminApprovalStatus === 'PENDING') {
        return res.status(400).json({ 
          error: 'Your application is already pending admin review.',
          seller: { ...existingSeller.toObject(), id: existingSeller._id.toString() }
        });
      }
      // If previously rejected, allow resubmission
      await Seller.deleteOne({ _id: existingSeller._id });
    }

    const cleanAadhaar = typeof aadhaarNumber === 'string' ? aadhaarNumber.replace(/\s+/g, '') : '';
    const maskedAadhaar = cleanAadhaar.length >= 4 
      ? `XXXX-XXXX-${cleanAadhaar.slice(-4)}` 
      : (cleanAadhaar || 'MANUAL_REVIEW_AADHAAR');

    const cleanBank = typeof bankAccount === 'string' ? bankAccount.trim() : '';
    const maskedBank = cleanBank 
      ? `${cleanBank.slice(-4)} | ${ifsc || 'IFSC'}` 
      : 'PENDING_MANUAL_REVIEW';

    const newSeller = await Seller.create({
      userId,
      businessName: businessName || user.name || 'Seller Kitchen',
      governmentId: maskedAadhaar,
      governmentIdImage: 'MANUAL_ADMIN_REVIEW',
      address: address || 'Address submitted for review',
      phone: phone || '',
      category: category || 'Home Maker',
      latitude: latitude ? String(latitude) : '13.0827',
      longitude: longitude ? String(longitude) : '80.2707',
      verificationStatus: 'Pending',
      adminApprovalStatus: 'PENDING',
      isApproved: false,
      rejectionReason: '',
      submittedAt: new Date(),
      bankDetails: maskedBank,
      aadhaarVerified: false, // Honest manual review - NOT externally verified
      aadhaarVerificationReference: aadhaarReferenceId || `MANUAL_REF_${Date.now()}`,
      bankVerified: false,    // Honest manual review - NOT externally verified
      bankVerificationReference: bankReferenceId || `MANUAL_REF_${Date.now()}`,
      bankName: bankName || 'Bank details submitted for review',
      bankAccountName: bankAccountName || businessName || user.name
    });

    // Note: We keep the user's role until approval, or mark as SELLER with unapproved status
    await User.updateOne({ _id: userId }, { role: UserRole.SELLER });
    
    // Notify admins
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: 'New Seller Requires Approval',
          message: `Seller "${businessName}" has submitted their application and is awaiting manual admin review.`
        });
      }
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }

    res.json({ 
      message: 'Your seller application has been submitted successfully. Your account is awaiting admin review. You will be able to access seller features after approval.', 
      seller: { ...newSeller.toObject(), id: newSeller._id.toString() }
    });
  } catch(e: any) {
    console.error(e);
    res.status(500).json({ error: 'Seller registration failed: ' + (e.message || 'Server error') });
  }
});

// Get seller application status
router.get('/api/sellers/status/:userId', async (req, res) => {
  try {
    const seller = await Seller.findOne({ userId: req.params.userId }).lean();
    if (!seller) {
      return res.status(404).json({ error: 'No seller application found for this account' });
    }

    const isApproved = (seller as any).isApproved === true || 
      (seller as any).adminApprovalStatus === 'APPROVED' || 
      (seller as any).verificationStatus === 'Approved';

    const approvalStatus = isApproved 
      ? 'APPROVED' 
      : ((seller as any).adminApprovalStatus || 
         ((seller as any).verificationStatus === 'Rejected' ? 'REJECTED' : 'PENDING'));

    // Auto-heal DB record if missing isApproved flag
    if (isApproved && !(seller as any).isApproved) {
      await Seller.updateOne({ _id: (seller as any)._id }, { isApproved: true, adminApprovalStatus: 'APPROVED' }).catch(() => {});
    }

    res.json({
      id: (seller as any)._id.toString(),
      businessName: (seller as any).businessName,
      adminApprovalStatus: approvalStatus,
      isApproved,
      rejectionReason: (seller as any).rejectionReason || '',
      submittedAt: (seller as any).submittedAt || (seller as any).createdAt,
      reviewedAt: (seller as any).reviewedAt
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve application status' });
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
