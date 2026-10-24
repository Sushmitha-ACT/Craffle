import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Address } from '../models/Address.js';
import { Settings } from '../models/Settings.js';
import { Device } from '../models/Device.js';

const router = express.Router();

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

// Get user profile details
router.get('/api/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile details
router.put('/api/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, phone, profileImage } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user!.id } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { name, email: email.toLowerCase(), phone, profileImage },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update password
router.put('/api/profile/password', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    if (user.password && !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash and update
    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADDRESS ENDPOINTS
// ==========================================

// Get all addresses
router.get('/api/addresses', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const addresses = await Address.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new address
router.post('/api/addresses', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, addressLine, city, state, pinCode, latitude, longitude, isDefault } = req.body;
    if (!name || !addressLine || !city || !state || !pinCode) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    const count = await Address.countDocuments({ userId: req.user!.id });
    const makeDefault = isDefault || count === 0;

    if (makeDefault) {
      await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    const newAddress = await Address.create({
      userId: req.user!.id,
      name,
      addressLine,
      city,
      state,
      pinCode,
      latitude,
      longitude,
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
    const { name, addressLine, city, state, pinCode, latitude, longitude, isDefault } = req.body;
    if (!name || !addressLine || !city || !state || !pinCode) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    const address = await Address.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (isDefault && !address.isDefault) {
      await Address.updateMany({ userId: req.user!.id }, { isDefault: false });
    }

    address.name = name;
    address.addressLine = addressLine;
    address.city = city;
    address.state = state;
    address.pinCode = pinCode;
    address.latitude = latitude;
    address.longitude = longitude;
    if (isDefault !== undefined) {
      address.isDefault = isDefault;
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
      return res.status(404).json({ error: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: req.params.id });

    if (wasDefault) {
      const anotherAddress = await Address.findOne({ userId: req.user!.id });
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
      return res.status(404).json({ error: 'Address not found' });
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
