import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Address } from '../models/Address.js';
import { Settings } from '../models/Settings.js';
import { Device } from '../models/Device.js';

const router = express.Router();

// Helper to save avatar base64 data to disk
function saveAvatarFile(base64Data: string, userId: string): { url: string; error?: string } {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return { url: '', error: 'Only valid image files (JPEG, PNG, WebP) are allowed.' };
  }

  const matches = base64Data.match(/^data:image\/([A-Za-z0-9-+.]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return { url: '', error: 'Invalid image format.' };
  }

  const rawExt = matches[1].toLowerCase();
  let ext = 'jpg';
  if (rawExt.includes('png')) ext = 'png';
  else if (rawExt.includes('webp')) ext = 'webp';
  else if (rawExt.includes('jpeg') || rawExt.includes('jpg')) ext = 'jpg';
  else {
    return { url: '', error: 'Unsupported image type. Please upload a JPEG, PNG, or WebP image.' };
  }

  const buffer = Buffer.from(matches[2], 'base64');
  const maxBytes = 5 * 1024 * 1024; // 5 MB limit
  if (buffer.length > maxBytes) {
    return { url: '', error: 'Image file size must be less than 5 MB.' };
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `avatar_${userId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  return { url: `/uploads/avatars/${filename}` };
}

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

// Get user profile details
const getProfileHandler = async (req: AuthenticatedRequest, res: any) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/api/profile', authMiddleware, getProfileHandler);
router.get('/api/profile/me', authMiddleware, getProfileHandler);

// Update user profile details (only permitted fields)
const updateProfileHandler = async (req: AuthenticatedRequest, res: any) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updateFields: any = {
      name: name.trim(),
      phone: phone !== undefined ? String(phone).trim() : undefined
    };

    // If email is provided and differs from current, verify uniqueness
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user!.id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use by another account' });
      }
      updateFields.email = normalizedEmail;
    }

    // Do NOT permit role, password, or permissions to be changed via profile endpoint
    delete updateFields.role;
    delete updateFields.password;
    delete updateFields._id;

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.put('/api/profile', authMiddleware, updateProfileHandler);
router.patch('/api/profile', authMiddleware, updateProfileHandler);

// Upload profile photo
router.post('/api/profile/photo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const saveResult = saveAvatarFile(image, req.user!.id);
    if (saveResult.error) {
      return res.status(400).json({ error: saveResult.error });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { profileImage: saveResult.url },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      profileImage: saveResult.url,
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove profile photo
router.delete('/api/profile/photo', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { profileImage: '' },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo removed successfully',
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update password
router.put('/api/profile/password', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password if password exists on user record
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isMatch = bcrypt.compareSync(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
    }

    // Hash and update
    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADDRESS ENDPOINTS
// ==========================================

// Indian PIN code regex (6 digits, not starting with 0)
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Get all addresses for user
router.get('/api/addresses', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const addresses = await Address.find({ userId: req.user!.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new address
router.post('/api/addresses', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      recipientName,
      phone,
      addressLine,
      landmark,
      city,
      state,
      pinCode,
      addressType,
      latitude,
      longitude,
      isDefault
    } = req.body;

    if (!name || !addressLine || !city || !state || !pinCode) {
      return res.status(400).json({ error: 'Address label, street address, city, state, and PIN code are required' });
    }

    const cleanPin = String(pinCode).trim();
    if (!PINCODE_REGEX.test(cleanPin)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code' });
    }

    const count = await Address.countDocuments({ userId: req.user!.id });
    const makeDefault = Boolean(isDefault) || count === 0;

    if (makeDefault) {
      await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    const newAddress = await Address.create({
      userId: req.user!.id,
      name: name.trim(),
      recipientName: recipientName ? String(recipientName).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      addressLine: addressLine.trim(),
      landmark: landmark ? String(landmark).trim() : undefined,
      city: city.trim(),
      state: state.trim(),
      pinCode: cleanPin,
      addressType: ['Home', 'Work', 'Other'].includes(addressType) ? addressType : 'Home',
      latitude: typeof latitude === 'number' ? latitude : undefined,
      longitude: typeof longitude === 'number' ? longitude : undefined,
      isDefault: makeDefault
    });

    res.status(201).json(newAddress);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update address
router.put('/api/addresses/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      recipientName,
      phone,
      addressLine,
      landmark,
      city,
      state,
      pinCode,
      addressType,
      latitude,
      longitude,
      isDefault
    } = req.body;

    if (!name || !addressLine || !city || !state || !pinCode) {
      return res.status(400).json({ error: 'Address label, street address, city, state, and PIN code are required' });
    }

    const cleanPin = String(pinCode).trim();
    if (!PINCODE_REGEX.test(cleanPin)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code' });
    }

    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    if (isDefault && !address.isDefault) {
      await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    address.name = name.trim();
    if (recipientName !== undefined) address.recipientName = String(recipientName).trim();
    if (phone !== undefined) address.phone = String(phone).trim();
    address.addressLine = addressLine.trim();
    if (landmark !== undefined) address.landmark = String(landmark).trim();
    address.city = city.trim();
    address.state = state.trim();
    address.pinCode = cleanPin;
    if (addressType && ['Home', 'Work', 'Other'].includes(addressType)) {
      address.addressType = addressType;
    }
    if (typeof latitude === 'number') address.latitude = latitude;
    if (typeof longitude === 'number') address.longitude = longitude;
    if (isDefault !== undefined) {
      address.isDefault = Boolean(isDefault);
    }

    await address.save();
    res.json(address);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete address
router.delete('/api/addresses/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: req.params.id });

    if (wasDefault) {
      const anotherAddress = await Address.findOne({ userId: req.user!.id }).sort({ createdAt: -1 });
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set default address
router.patch('/api/addresses/:id/default', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    await Address.updateMany({ userId: req.user!.id }, { isDefault: false });

    address.isDefault = true;
    await address.save();

    res.json(address);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SETTINGS ENDPOINTS
// ==========================================

// Get user settings
router.get('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings) {
      settings = await Settings.create({
        userId: req.user!.id,
        pushNotifications: true,
        emailAlerts: false,
        darkMode: false
      });
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.patch('/api/settings', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { pushNotifications, emailAlerts, darkMode } = req.body;
    let settings = await Settings.findOne({ userId: req.user!.id });
    if (!settings) {
      settings = new Settings({ userId: req.user!.id });
    }

    if (pushNotifications !== undefined) settings.pushNotifications = pushNotifications;
    if (emailAlerts !== undefined) settings.emailAlerts = emailAlerts;
    if (darkMode !== undefined) settings.darkMode = darkMode;

    await settings.save();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DEVICE NOTIFICATION ENDPOINTS
// ==========================================

// Register device
router.post('/api/devices', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const device = await Device.findOneAndUpdate(
      { userId: req.user!.id, token },
      { userId: req.user!.id, token, platform: platform || 'web' },
      { upsert: true, new: true }
    );

    res.status(201).json(device);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete device registration
router.delete('/api/devices/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const query = mongoose.isValidObjectId(req.params.id) 
      ? { _id: req.params.id, userId: req.user!.id }
      : { token: req.params.id, userId: req.user!.id };

    const result = await Device.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Device registration not found' });
    }
    res.json({ message: 'Device token deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
