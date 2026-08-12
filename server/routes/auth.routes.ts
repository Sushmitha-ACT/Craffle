// @ts-nocheck
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserRole } from '@shared/types';
import { User } from '../models/User.js';
import { OtpVerification } from '../models/OtpVerification.js';
import { Notification } from '../models/Notification.js';
import nodemailer from 'nodemailer';

const router = express.Router();

const JWT_SECRET = 'craffle_ultra_secure_jwt_token_secret_12345';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendSimulatedEmail(to, subject, body) {
  try {
    await transporter.sendMail({
      from: `"Craffle Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

// Register Customer
router.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (!name || !email || !password || !confirmPassword) return res.status(400).json({ error: 'Please fill in all fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const targetRole = role === UserRole.SELLER ? UserRole.SELLER : UserRole.CUSTOMER;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      isVerified: true, // Auto-verified
      provider: 'manual'
    });

    await Notification.create({
      userId: newUser._id,
      title: 'Welcome to Craffle! 🎉',
      message: 'Your account has been created successfully.',
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const mappedUser = { ...newUser.toObject(), id: newUser._id.toString() };

    res.json({ message: 'Registration successful!', token, user: mappedUser });
  } catch(e) {
    console.error("Registration error:", e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify OTP
router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, bypassForSeller } = req.body;
    
    if (!bypassForSeller) {
      const record = await OtpVerification.findOne({ email: email.toLowerCase(), otp });
      if (!record) return res.status(400).json({ error: 'Invalid OTP code. Please check again.' });
      if (new Date() > record.expiresAt) {
        await OtpVerification.deleteOne({ _id: record._id });
        return res.status(400).json({ error: 'OTP code expired. Please request a new one.' });
      }
      await OtpVerification.deleteOne({ _id: record._id });
    }

    await User.updateOne({ email: email.toLowerCase() }, { isVerified: true });
    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend OTP
router.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpVerification.deleteMany({ email: email.toLowerCase() });
    await OtpVerification.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    sendSimulatedEmail(email, 'New OTP Code for Craffle Account', `Hello ${user.name},\n\nHere is your new 6-digit Verification OTP code: **${otp}**\n\nThis OTP is valid for 5 minutes.`);
    res.json({ message: 'New OTP code sent to your email.' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// Login Flow
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Hardcoded Admin Bypass
    if (email.toLowerCase() === 'admin@craffle.com' && password === 'Admin@123') {
      const token = jwt.sign({ id: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ 
        message: 'Admin login successful', 
        token, 
        user: { id: 'admin', _id: 'admin', name: 'Craffle Admin', email: 'admin@craffle.com', role: 'ADMIN' },
        seller: null 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    if (user.provider === 'google') return res.status(400).json({ error: 'Please login using Google Auth.' });
    if (!user.password || !bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const mappedUser = { ...user.toObject(), id: user._id.toString() };
    
    let seller = null;
    if (user.role === 'SELLER') {
      const { Seller } = await import('../models/Seller.js');
      const sellerDoc = await Seller.findOne({ userId: user._id });
      if (sellerDoc) seller = { ...sellerDoc.toObject(), id: sellerDoc._id.toString() };
    }

    res.json({ message: 'Login successful', token, user: mappedUser, seller });
  } catch(e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google Auth
router.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, role } = req.body;
    if (!googleOAuthClient) return res.status(500).json({ error: 'Google Auth is not configured' });

    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: 'Invalid Google token payload' });

    const { email, name, picture, sub: googleId } = payload;
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (user.provider === 'manual') return res.status(400).json({ error: 'This email is registered manually. Please login with password.' });
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const mappedUser = { ...user.toObject(), id: user._id.toString() };
      return res.json({ message: 'Login successful', token, user: mappedUser });
    }

    const targetRole = role === UserRole.SELLER ? UserRole.SELLER : UserRole.CUSTOMER;
    user = await User.create({
      name,
      email: email.toLowerCase(),
      role: targetRole,
      isVerified: true,
      provider: 'google',
      profileImage: picture
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const mappedUser = { ...user.toObject(), id: user._id.toString() };

    let seller = null;
    if (user.role === 'SELLER') {
      const { Seller } = await import('../models/Seller.js');
      const sellerDoc = await Seller.findOne({ userId: user._id });
      if (sellerDoc) seller = { ...sellerDoc.toObject(), id: sellerDoc._id.toString() };
    }

    res.json({ message: 'Google Auth successful', token, user: mappedUser, seller });
  } catch(e) {
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Forgot Password Flow
router.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found with that email' });
    if (user.provider === 'google') return res.status(400).json({ error: 'This account uses Google Login. You cannot reset its password.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpVerification.deleteMany({ email: email.toLowerCase() });
    await OtpVerification.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    sendSimulatedEmail(email, 'Reset Password Verification OTP', `Hello ${user.name},\n\nYour 6-digit OTP code to reset your password is: **${otp}**\n\nThis OTP is valid for 5 minutes.`);
    res.json({ message: 'Password reset OTP sent to your email.' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/api/auth/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OtpVerification.findOne({ email: email.toLowerCase(), otp });
    if (!record) return res.status(400).json({ error: 'Invalid OTP code' });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: 'OTP code expired' });

    res.json({ message: 'OTP verified successfully. You can now reset your password.' });
  } catch(e) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

    const record = await OtpVerification.findOne({ email: email.toLowerCase(), otp });
    if (!record || new Date() > record.expiresAt) return res.status(400).json({ error: 'Invalid or expired OTP session' });

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await User.updateOne({ email: email.toLowerCase() }, { password: hashedPassword });
    await OtpVerification.deleteOne({ _id: record._id });

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch(e) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
