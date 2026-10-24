import express from 'express';
import { seedDatabase } from '../seed_dummy_products.js';

const router = express.Router();

router.get('/api/debug/db/reset', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Database reset and seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

export default router;
