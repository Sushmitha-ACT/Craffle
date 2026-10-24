// @ts-nocheck
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

import { Short } from '../models/Short.js';
import { ShortLike } from '../models/ShortLike.js';
import { ShortComment } from '../models/ShortComment.js';
import { ShortReport } from '../models/ShortReport.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { User } from '../models/User.js';
import { authMiddleware, requireApprovedSeller, JWT_SECRET, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Ensure uploads/shorts directory exists
const shortsUploadDir = path.join(process.cwd(), 'public', 'uploads', 'shorts');
if (!fs.existsSync(shortsUploadDir)) {
  fs.mkdirSync(shortsUploadDir, { recursive: true });
}

// Configure Multer storage for vertical short videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, shortsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    cb(null, `short_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/ogg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(mp4|webm|mov|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Supported formats: MP4, WebM, QuickTime MOV.'));
    }
  }
});

const multerVideoMiddleware = (req: any, res: any, next: any) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error('Multer video upload error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Video file size exceeds the 50MB limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'Error processing video file upload' });
    }
    next();
  });
};

// Helper: Safely extract authenticated user ID if token is provided
function extractOptionalUserId(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded?.id || null;
  } catch {
    return null;
  }
}

// =========================================================================
// 0. POST /api/shorts/upload — Upload Dedicated Short Video File
// =========================================================================
router.post('/api/shorts/upload', authMiddleware, requireApprovedSeller, multerVideoMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided. Please select an MP4 or WebM video file.' });
    }

    const videoUrl = `/uploads/shorts/${req.file.filename}`;
    res.status(201).json({
      success: true,
      videoUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err: any) {
    console.error('Error in video upload:', err);
    res.status(500).json({ error: err.message || 'Failed to upload video' });
  }
});

// =========================================================================
// 0.1 GET /api/sellers/me/products — List Authenticated Seller's Products
// =========================================================================
router.get('/api/sellers/me/products', authMiddleware, requireApprovedSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    let seller = (req as any).seller;
    if (!seller) {
      seller = await Seller.findOne({
        $or: [
          { userId: userId },
          { userId: String(userId) },
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : []),
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: new mongoose.Types.ObjectId(userId) }] : [])
        ]
      });
    }

    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    const products = await Product.find({ sellerId: seller._id }).sort({ createdAt: -1 }).lean();
    const mapped = products.map((p: any) => ({
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.productName,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.images?.[0] || '',
      images: p.images || [],
      stock: p.stock ?? 0,
      status: p.status || 'Available',
      category: p.category,
      pickupAvailable: p.pickupAvailable,
      deliveryAvailable: p.deliveryAvailable,
      isAvailable: p.status === 'Available' && (p.stock > 0 || p.stock === undefined)
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
});

// =========================================================================
// 1. POST /api/shorts — Create and Publish a Short (Seller only)
// =========================================================================
router.post('/api/shorts', authMiddleware, requireApprovedSeller, multerVideoMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Find the seller profile
    let seller = (req as any).seller;
    if (!seller) {
      seller = await Seller.findOne({
        $or: [
          { userId: userId },
          { userId: String(userId) },
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : []),
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: new mongoose.Types.ObjectId(userId) }] : [])
        ]
      });
    }

    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    const { productId, caption, hashtags, duration } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'A valid linked Product ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid Product ID format' });
    }

    // Verify linked product exists and seller owns it
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Linked product does not exist in the catalog' });
    }

    const sellerObjIdStr = seller._id.toString();
    const productSellerIdStr = product.sellerId.toString();

    if (productSellerIdStr !== sellerObjIdStr) {
      // Check if maybe seller.userId matches
      const isOwner = seller.userId && (seller.userId.toString() === productSellerIdStr || seller.userId === productSellerIdStr);
      if (!isOwner) {
        return res.status(403).json({ error: 'Permission denied: You can only create Shorts for your own products' });
      }
    }

    // Determine video URL
    let videoUrl = '';
    let videoStorageKey = '';

    if (req.file) {
      videoUrl = `/uploads/shorts/${req.file.filename}`;
      videoStorageKey = req.file.filename;
    } else if (req.body.videoUrl) {
      videoUrl = req.body.videoUrl;
      videoStorageKey = req.body.videoUrl;
    } else {
      return res.status(400).json({ error: 'Please upload a dedicated video file for this Short' });
    }

    // Verify video file exists if on local storage
    if (videoUrl.startsWith('/uploads/shorts/')) {
      const filename = path.basename(videoUrl);
      const filePath = path.join(shortsUploadDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Uploaded video file was not found on the server. Please re-upload the video.' });
      }
    }

    const cleanCaption = (caption || '').trim();
    if (!cleanCaption) {
      return res.status(400).json({ error: 'Caption is required for your Short' });
    }

    // Duration check (limit 60s)
    const numDuration = parseFloat(duration) || 0;
    if (numDuration > 65) { // 5s grace margin for container padding
      return res.status(400).json({ error: 'Video duration must not exceed 60 seconds' });
    }

    // Parse hashtags
    let parsedHashtags: string[] = [];
    if (Array.isArray(hashtags)) {
      parsedHashtags = hashtags;
    } else if (typeof hashtags === 'string') {
      parsedHashtags = hashtags
        .split(/[,\s#]+/)
        .map(tag => tag.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean);
    }

    // Default thumbnail from product images if available
    const thumbnailUrl = (product.images && product.images[0]) || '';

    const newShort = await Short.create({
      sellerId: seller._id,
      productId: product._id,
      videoUrl,
      videoStorageKey,
      thumbnailUrl,
      caption: (caption || '').trim(),
      hashtags: parsedHashtags,
      duration: numDuration,
      status: 'published'
    });

    res.status(201).json({
      message: 'Craffle Short published successfully! 🎉',
      short: newShort
    });
  } catch (err: any) {
    console.error('Error creating short:', err);
    res.status(500).json({ error: err.message || 'Failed to create Short' });
  }
});

// =========================================================================
// 2. GET /api/shorts — Paginated Vertical Shorts Feed
// =========================================================================
router.get('/api/shorts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    const tag = req.query.tag ? String(req.query.tag).toLowerCase().replace(/^#/, '') : null;
    const filterProductId = req.query.productId as string;
    const filterSellerId = req.query.sellerId as string;

    const currentUserId = extractOptionalUserId(req);

    const query: any = { status: 'published' };
    if (tag) query.hashtags = tag;
    if (filterProductId && mongoose.Types.ObjectId.isValid(filterProductId)) {
      query.productId = new mongoose.Types.ObjectId(filterProductId);
    }
    if (filterSellerId && mongoose.Types.ObjectId.isValid(filterSellerId)) {
      query.sellerId = new mongoose.Types.ObjectId(filterSellerId);
    }

    const [shorts, total] = await Promise.all([
      Short.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'productId',
          select: 'productName price originalPrice images stock status category description pickupAvailable deliveryAvailable rating'
        })
        .populate({
          path: 'sellerId',
          select: 'businessName name avatar profileImage isApproved adminApprovalStatus verificationStatus aadhaarVerified bankVerified rating'
        })
        .lean(),
      Short.countDocuments(query)
    ]);

    // Check likes for the authenticated user
    let userLikedShortIds = new Set<string>();
    if (currentUserId && shorts.length > 0) {
      const shortIds = shorts.map(s => s._id);
      const likes = await ShortLike.find({
        shortId: { $in: shortIds },
        userId: currentUserId
      }).select('shortId').lean();
      userLikedShortIds = new Set(likes.map(l => l.shortId.toString()));
    }

    const mapped = shorts.map((s: any) => {
      const product = s.productId as any;
      const seller = s.sellerId as any;

      const isProductAvailable = product && product.status === 'Available' && (product.stock > 0 || product.stock === undefined);

      const isSellerVerified = seller && (
        seller.isApproved === true ||
        seller.adminApprovalStatus === 'APPROVED' ||
        seller.verificationStatus === 'Approved' ||
        seller.verificationStatus === 'VERIFIED'
      );

      return {
        id: s._id.toString(),
        _id: s._id.toString(),
        videoUrl: s.videoUrl,
        thumbnailUrl: s.thumbnailUrl || (product?.images?.[0] || ''),
        caption: s.caption || '',
        hashtags: s.hashtags || [],
        likesCount: s.likesCount || 0,
        commentsCount: s.commentsCount || 0,
        viewsCount: s.viewsCount || 0,
        sharesCount: s.sharesCount || 0,
        duration: s.duration || 0,
        createdAt: s.createdAt,
        isLiked: userLikedShortIds.has(s._id.toString()),
        productUnavailable: !isProductAvailable,
        product: product ? {
          id: product._id.toString(),
          _id: product._id.toString(),
          name: product.productName,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.images?.[0] || '',
          images: product.images || [],
          stock: product.stock ?? 0,
          status: product.status || 'Available',
          category: product.category,
          description: product.description,
          pickupAvailable: product.pickupAvailable,
          deliveryAvailable: product.deliveryAvailable,
          rating: product.rating || 4.8
        } : null,
        seller: seller ? {
          id: seller._id.toString(),
          _id: seller._id.toString(),
          businessName: seller.businessName || seller.name || 'Artisan Seller',
          name: seller.businessName || seller.name || 'Artisan Seller',
          avatar: seller.avatar || seller.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
          isVerified: isSellerVerified,
          rating: seller.rating || 4.9
        } : null
      };
    });

    res.json({
      shorts: mapped,
      page,
      limit,
      total,
      hasMore: skip + shorts.length < total
    });
  } catch (err: any) {
    console.error('Error fetching shorts feed:', err);
    res.status(500).json({ error: 'Failed to load Shorts feed' });
  }
});

// =========================================================================
// 3. GET /api/shorts/:id — Get Individual Short by ID (Canonical Deep Link)
// =========================================================================
router.get('/api/shorts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const short = await Short.findOne({ _id: id, status: 'published' })
      .populate({
        path: 'productId',
        select: 'productName price originalPrice images stock status category description pickupAvailable deliveryAvailable rating'
      })
      .populate({
        path: 'sellerId',
        select: 'businessName name avatar profileImage isApproved adminApprovalStatus verificationStatus rating'
      })
      .lean();

    if (!short) {
      return res.status(404).json({ error: 'This Short is no longer available or has been removed' });
    }

    const currentUserId = extractOptionalUserId(req);
    let isLiked = false;
    if (currentUserId) {
      const like = await ShortLike.findOne({ shortId: short._id, userId: currentUserId });
      isLiked = !!like;
    }

    const product = short.productId as any;
    const seller = short.sellerId as any;

    const isProductAvailable = product && product.status === 'Available' && (product.stock > 0 || product.stock === undefined);
    const isSellerVerified = seller && (
      seller.isApproved === true ||
      seller.adminApprovalStatus === 'APPROVED' ||
      seller.verificationStatus === 'Approved' ||
      seller.verificationStatus === 'VERIFIED'
    );

    res.json({
      id: short._id.toString(),
      _id: short._id.toString(),
      videoUrl: short.videoUrl,
      thumbnailUrl: short.thumbnailUrl || (product?.images?.[0] || ''),
      caption: short.caption || '',
      hashtags: short.hashtags || [],
      likesCount: short.likesCount || 0,
      commentsCount: short.commentsCount || 0,
      viewsCount: short.viewsCount || 0,
      sharesCount: short.sharesCount || 0,
      duration: short.duration || 0,
      createdAt: short.createdAt,
      isLiked,
      productUnavailable: !isProductAvailable,
      product: product ? {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.productName,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.images?.[0] || '',
        images: product.images || [],
        stock: product.stock ?? 0,
        status: product.status || 'Available',
        category: product.category,
        description: product.description,
        rating: product.rating || 4.8
      } : null,
      seller: seller ? {
        id: seller._id.toString(),
        _id: seller._id.toString(),
        businessName: seller.businessName || seller.name || 'Artisan Seller',
        name: seller.businessName || seller.name || 'Artisan Seller',
        avatar: seller.avatar || seller.profileImage || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
        isVerified: isSellerVerified,
        rating: seller.rating || 4.9
      } : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Short' });
  }
});

// =========================================================================
// 4. DELETE /api/shorts/:id — Delete a Short
// =========================================================================
router.delete('/api/shorts/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const short = await Short.findById(id);
    if (!short) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Check authorization: must be admin or owning seller
    if (userRole !== 'ADMIN') {
      const seller = await Seller.findOne({
        $or: [
          { userId: userId },
          { userId: String(userId) },
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : [])
        ]
      });

      if (!seller || seller._id.toString() !== short.sellerId.toString()) {
        return res.status(403).json({ error: 'You are not authorized to delete this Short' });
      }
    }

    // Remove video file from disk if local
    if (short.videoStorageKey) {
      const filePath = path.join(shortsUploadDir, short.videoStorageKey);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    // Clean up related likes, comments, reports
    await Promise.all([
      Short.deleteOne({ _id: short._id }),
      ShortLike.deleteMany({ shortId: short._id }),
      ShortComment.deleteMany({ shortId: short._id }),
      ShortReport.deleteMany({ shortId: short._id })
    ]);

    res.json({ message: 'Short deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting short:', err);
    res.status(500).json({ error: 'Failed to delete Short' });
  }
});

// =========================================================================
// 5. POST /api/shorts/:id/like — Add a Like (Unique, Idempotent)
// =========================================================================
router.post('/api/shorts/:id/like', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required to like' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const short = await Short.findById(id);
    if (!short) return res.status(404).json({ error: 'Short not found' });

    // Enforce uniqueness at DB level via upsert / try-catch
    try {
      await ShortLike.create({ shortId: short._id, userId: String(userId) });
      // Only increment if insert succeeded
      await Short.updateOne({ _id: short._id }, { $inc: { likesCount: 1 } });
    } catch (uniqueErr: any) {
      // Already liked (code 11000)
    }

    const updated = await Short.findById(id).select('likesCount');
    res.json({ liked: true, likesCount: updated?.likesCount || 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to like Short' });
  }
});

// =========================================================================
// 6. DELETE /api/shorts/:id/like — Remove a Like
// =========================================================================
router.delete('/api/shorts/:id/like', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const deleteResult = await ShortLike.deleteOne({ shortId: id, userId: String(userId) });
    if (deleteResult.deletedCount > 0) {
      await Short.updateOne(
        { _id: id, likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } }
      );
    }

    const updated = await Short.findById(id).select('likesCount');
    res.json({ liked: false, likesCount: Math.max(0, updated?.likesCount || 0) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove like' });
  }
});

// =========================================================================
// 7. GET /api/shorts/:id/comments — Paginated Comments
// =========================================================================
router.get('/api/shorts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      ShortComment.find({ shortId: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ShortComment.countDocuments({ shortId: id })
    ]);

    const mapped = comments.map(c => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      userId: c.userId,
      userName: c.userName || 'Craffle Customer',
      userAvatar: c.userAvatar || '',
      text: c.text,
      createdAt: c.createdAt
    }));

    res.json({
      comments: mapped,
      page,
      limit,
      total,
      hasMore: skip + comments.length < total
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// =========================================================================
// 8. POST /api/shorts/:id/comments — Add a Comment
// =========================================================================
router.post('/api/shorts/:id/comments', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Please log in to comment' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const short = await Short.findById(id);
    if (!short) return res.status(404).json({ error: 'Short not found' });

    const rawText = (req.body.text || '').trim();
    if (!rawText) return res.status(400).json({ error: 'Comment text cannot be empty' });
    if (rawText.length > 500) return res.status(400).json({ error: 'Comment exceeds 500 character limit' });

    // Basic sanitization
    const sanitizedText = rawText.replace(/<[^>]*>?/gm, '');

    // Get commenter's profile
    let userName = 'Craffle Customer';
    let userAvatar = '';
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const userDoc = await User.findById(userId);
      if (userDoc) {
        userName = userDoc.name || userName;
        userAvatar = userDoc.profileImage || '';
      }
    }

    const newComment = await ShortComment.create({
      shortId: short._id,
      userId: String(userId),
      userName,
      userAvatar,
      text: sanitizedText
    });

    await Short.updateOne({ _id: short._id }, { $inc: { commentsCount: 1 } });

    res.status(201).json({
      message: 'Comment added',
      comment: {
        id: newComment._id.toString(),
        _id: newComment._id.toString(),
        userId: newComment.userId,
        userName: newComment.userName,
        userAvatar: newComment.userAvatar,
        text: newComment.text,
        createdAt: newComment.createdAt
      }
    });
  } catch (err: any) {
    console.error('Post comment error:', err);
    res.status(500).json({ error: err.message || 'Failed to post comment' });
  }
});

// =========================================================================
// 9. DELETE /api/shorts/:id/comments/:commentId — Delete a Comment
// =========================================================================
router.delete('/api/shorts/:id/comments/:commentId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = await ShortComment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Only comment author or admin can delete
    if (role !== 'ADMIN' && comment.userId !== String(userId)) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await ShortComment.deleteOne({ _id: comment._id });
    await Short.updateOne(
      { _id: id, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } }
    );

    res.json({ message: 'Comment deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// =========================================================================
// 10. POST /api/shorts/:id/report — Report Inappropriate Content
// =========================================================================
router.post('/api/shorts/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Short not found' });
    }

    const reporterId = extractOptionalUserId(req) || 'anonymous';
    const { reason, details } = req.body;

    const validReasons = ['spam', 'inappropriate', 'misleading', 'copyright', 'offensive', 'other'];
    const chosenReason = validReasons.includes(reason) ? reason : 'inappropriate';

    await ShortReport.create({
      shortId: new mongoose.Types.ObjectId(id),
      reporterId,
      reason: chosenReason,
      details: (details || '').slice(0, 500)
    });

    res.json({
      message: 'Report submitted. Our safety team will review this Short shortly. Thank you for keeping Craffle safe!'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// =========================================================================
// 11. POST /api/shorts/:id/view — Record a Video View
// =========================================================================
router.post('/api/shorts/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Short.updateOne({ _id: id }, { $inc: { viewsCount: 1 } });
    }
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// =========================================================================
// 12. GET /api/shorts/seller/my — Seller's Own Shorts & Metrics
// =========================================================================
router.get('/api/shorts/seller/my', authMiddleware, requireApprovedSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    let seller = (req as any).seller;
    if (!seller) {
      seller = await Seller.findOne({
        $or: [
          { userId: userId },
          { userId: String(userId) },
          ...(mongoose.Types.ObjectId.isValid(userId) ? [{ userId: new mongoose.Types.ObjectId(userId) }] : [])
        ]
      });
    }

    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    const shorts = await Short.find({ sellerId: seller._id, status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .populate('productId', 'productName price images stock status')
      .lean();

    const mapped = shorts.map((s: any) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      videoUrl: s.videoUrl,
      thumbnailUrl: s.thumbnailUrl,
      caption: s.caption,
      hashtags: s.hashtags,
      likesCount: s.likesCount || 0,
      commentsCount: s.commentsCount || 0,
      viewsCount: s.viewsCount || 0,
      status: s.status,
      createdAt: s.createdAt,
      product: s.productId ? {
        id: s.productId._id.toString(),
        name: s.productId.productName,
        price: s.productId.price,
        image: s.productId.images?.[0] || '',
        stock: s.productId.stock,
        status: s.productId.status
      } : null
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load seller shorts' });
  }
});

export default router;
