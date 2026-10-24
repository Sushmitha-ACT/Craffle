import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { visualSearchService } from '../backend/services/visualSearchService.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle';

async function run() {
  console.log('[Backfill] Connecting to MongoDB:', MONGODB_URI.replace(/:([^@]+)@/, ':****@'));
  await mongoose.connect(MONGODB_URI);

  console.log('[Backfill] Verifying Python Vision Microservice health...');
  const health = await visualSearchService.getServiceHealth();
  if (!health.healthy) {
    console.error('[Backfill] Vision microservice is not reachable:', health.error);
    process.exit(1);
  }
  console.log(`[Backfill] Vision microservice OK: ${health.model} (${health.version})`);

  console.log('[Backfill] Starting catalog image visual embedding backfill...');
  const result = await visualSearchService.backfillCatalogEmbeddings();
  console.log('[Backfill] Complete! Result:', result);

  const status = await visualSearchService.getStatus();
  console.log('[Backfill] Index status:', status);

  await mongoose.disconnect();
  console.log('[Backfill] Finished successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
