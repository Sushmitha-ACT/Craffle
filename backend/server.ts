import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import adminRoutes from './routes/admin.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import supportRoutes from './routes/support.routes.js';
import geminiRoutes from './routes/gemini.routes.js';
import profileRoutes from './routes/profile.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import shortsRoutes from './routes/shorts.routes.js';
import giftDetectiveRoutes from './routes/giftDetective.routes.js';
import visualSearchRoutes from './routes/visualSearch.routes.js';
import { visualSearchService } from './services/visualSearchService.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle';
console.log('Connecting to MongoDB:', uri.replace(/:([^@]+)@/, ':****@'));
mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    try {
      const { Seller } = await import('./models/Seller.js');
      const updateResult = await Seller.updateMany(
        {
          $or: [
            { adminApprovalStatus: 'APPROVED' },
            { verificationStatus: 'Approved' }
          ]
        },
        {
          $set: {
            adminApprovalStatus: 'APPROVED',
            verificationStatus: 'Approved',
            isApproved: true,
            rejectionReason: ''
          }
        }
      );
      if (updateResult.modifiedCount > 0) {
        console.log(`[Startup Sync] Backfilled isApproved=true for ${updateResult.modifiedCount} approved seller(s)`);
      }
      // Initialize visual search embedding cache from MongoDB
      visualSearchService.syncCacheFromDatabase().catch(err => {
        console.warn('[Startup Sync] Visual search cache init warning:', err.message);
      });
    } catch (err) {
      console.warn('[Startup Sync] Seller sync warning:', err);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));


// Rate Limit (Mocked for brevity)
app.use('/api/', (req, res, next) => { next(); });

// Routes
app.use(authRoutes);
app.use(sellerRoutes);
app.use(adminRoutes);
app.use(productsRoutes);
app.use(ordersRoutes);
app.use(reviewsRoutes);
app.use(wishlistRoutes);
app.use(notificationsRoutes);
app.use(supportRoutes);
app.use(geminiRoutes);
app.use(profileRoutes);
app.use(paymentRoutes);
app.use(shortsRoutes);
app.use(giftDetectiveRoutes);
app.use(visualSearchRoutes);


// 12. VITE MIDDLEWARE & STATIC ASSET INGRESS

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Craffle full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

