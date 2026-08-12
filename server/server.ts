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
import debugRoutes from './routes/debug.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle';
console.log('Connecting to MongoDB:', uri.replace(/:([^@]+)@/, ':****@'));
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB successfully'))
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
app.use(debugRoutes);
app.use(profileRoutes);


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

