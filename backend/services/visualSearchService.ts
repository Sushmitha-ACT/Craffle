import path from 'path';
import fs from 'fs';
import '../models/Seller.js';
import '../models/User.js';
import { Product } from '../models/Product.js';
import { ProductEmbedding } from '../models/ProductEmbedding.js';

const VISION_SERVICE_URL = process.env.VISUAL_SEARCH_SERVICE_URL || 'http://127.0.0.1:5001';
const MODEL_NAME = 'MobileNetV2';
const MODEL_VERSION = 'mobilenet-v2-imagenet-v1';

export interface VisualMatchResult {
  product: any;
  similarityScore: number;
  matchPercentage: number;
  matchTier: 'Strong Visual Match' | 'High Similarity' | 'Good Match' | 'Moderate Match';
  matchedImageUrl: string;
}

export interface VisualSearchOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  limit?: number;
  page?: number;
  minSimilarity?: number; // default 0.45
}

interface CachedEmbedding {
  productId: string;
  imageUrl: string;
  embedding: number[];
}

class VisualSearchService {
  private cachedEmbeddings: CachedEmbedding[] = [];
  private isBackfillRunning: boolean = false;
  private lastSyncTime: number = 0;

  constructor() {
    // Initial sync will be triggered by server startup
  }

  /**
   * Health check of python vision microservice
   */
  async getServiceHealth(): Promise<{ healthy: boolean; model: string; version: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${VISION_SERVICE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json() as any;
        return { healthy: true, model: data.model, version: data.version };
      }
      return { healthy: false, model: MODEL_NAME, version: MODEL_VERSION, error: `Status ${res.status}` };
    } catch (err: any) {
      return { healthy: false, model: MODEL_NAME, version: MODEL_VERSION, error: err.message };
    }
  }

  /**
   * Send an uploaded image buffer to vision microservice for 1280-d embedding extraction
   */
  async embedImageBuffer(buffer: Buffer, mimeType: string): Promise<number[]> {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, 'query_image.jpg');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${VISION_SERVICE_URL}/embed`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Vision service error (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;
      if (!Array.isArray(data.embedding)) {
        throw new Error('Vision service did not return an embedding vector');
      }

      return data.embedding;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Failed to extract visual embedding: ${err.message}`);
    }
  }

  /**
   * Extract embedding from image URL
   */
  async embedImageUrl(imageUrl: string): Promise<number[]> {
    // If it's a local /uploads/ URL, read local buffer
    if (imageUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', imageUrl);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return this.embedImageBuffer(buffer, mime);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${VISION_SERVICE_URL}/embed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vision service failed to embed image URL: ${errText}`);
      }

      const data = await res.json() as any;
      return data.embedding;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Cosine similarity between two L2-normalized vectors (dot product)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  }

  /**
   * Calibrate raw cosine similarity (0.45 - 0.95) to an intuitive match score and tier
   */
  calibrateScore(cosSim: number): { percentage: number; tier: VisualMatchResult['matchTier'] } {
    // MobileNetV2 ImageNet features typically sit between ~0.45 (baseline semantic distance) to 0.95 (identical visual features)
    const normalized = Math.min(1.0, Math.max(0.0, (cosSim - 0.45) / 0.48));
    const percentage = Math.round(normalized * 100);

    let tier: VisualMatchResult['matchTier'] = 'Moderate Match';
    if (percentage >= 85) {
      tier = 'Strong Visual Match';
    } else if (percentage >= 70) {
      tier = 'High Similarity';
    } else if (percentage >= 55) {
      tier = 'Good Match';
    }

    return { percentage, tier };
  }

  /**
   * Refresh in-memory cache of catalog embeddings from MongoDB
   */
  async syncCacheFromDatabase(): Promise<number> {
    try {
      const records = await ProductEmbedding.find({ status: 'INDEXED' }).lean();
      this.cachedEmbeddings = records.map((r: any) => ({
        productId: r.productId.toString(),
        imageUrl: r.imageUrl,
        embedding: r.embedding
      }));
      this.lastSyncTime = Date.now();
      console.log(`[VisualSearchService] Cached ${this.cachedEmbeddings.length} product embeddings in memory`);
      return this.cachedEmbeddings.length;
    } catch (err) {
      console.error('[VisualSearchService] Failed to sync embeddings from DB:', err);
      return 0;
    }
  }

  /**
   * Index all active catalog products in MongoDB
   */
  async backfillCatalogEmbeddings(): Promise<{ total: number; newlyIndexed: number; skipped: number; errors: number }> {
    if (this.isBackfillRunning) {
      console.log('[VisualSearchService] Backfill already in progress, skipping duplicate run');
      return { total: this.cachedEmbeddings.length, newlyIndexed: 0, skipped: 0, errors: 0 };
    }

    this.isBackfillRunning = true;
    let newlyIndexed = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const products = await Product.find({ status: 'Available' }).lean();
      console.log(`[VisualSearchService] Starting catalog embedding backfill for ${products.length} products...`);

      for (const product of products) {
        if (!product.images || product.images.length === 0) {
          skipped++;
          continue;
        }

        const primaryImage = product.images[0];
        if (!primaryImage) {
          skipped++;
          continue;
        }

        // Check if already indexed
        const existing = await ProductEmbedding.findOne({
          productId: product._id,
          imageUrl: primaryImage,
          status: 'INDEXED'
        });

        if (existing) {
          skipped++;
          continue;
        }

        try {
          const embedding = await this.embedImageUrl(primaryImage);

          await ProductEmbedding.findOneAndUpdate(
            { productId: product._id, imageUrl: primaryImage },
            {
              productId: product._id,
              imageUrl: primaryImage,
              embedding,
              modelVersion: MODEL_VERSION,
              status: 'INDEXED',
              indexedAt: new Date()
            },
            { upsert: true, returnDocument: 'after' }
          );

          newlyIndexed++;
        } catch (embedErr: any) {
          console.warn(`[VisualSearchService] Error embedding product ${product._id} (${product.productName}):`, embedErr.message);
          errors++;
          // Mark as failed in DB
          await ProductEmbedding.findOneAndUpdate(
            { productId: product._id, imageUrl: primaryImage },
            {
              productId: product._id,
              imageUrl: primaryImage,
              embedding: [],
              modelVersion: MODEL_VERSION,
              status: 'FAILED',
              error: embedErr.message,
              indexedAt: new Date()
            },
            { upsert: true }
          ).catch(() => {});
        }
      }

      await this.syncCacheFromDatabase();
      console.log(`[VisualSearchService] Backfill finished. Newly indexed: ${newlyIndexed}, Skipped: ${skipped}, Errors: ${errors}`);
      return { total: products.length, newlyIndexed, skipped, errors };
    } finally {
      this.isBackfillRunning = false;
    }
  }

  /**
   * Search visually similar products for a query image buffer
   */
  async searchByImageBuffer(
    imageBuffer: Buffer,
    mimeType: string,
    options: VisualSearchOptions = {}
  ): Promise<{
    results: VisualMatchResult[];
    total: number;
    queryDimensions: number;
    modelVersion: string;
  }> {
    // 1. Generate query embedding
    const queryEmbedding = await this.embedImageBuffer(imageBuffer, mimeType);

    // 2. Ensure cache is populated
    if (this.cachedEmbeddings.length === 0) {
      await this.syncCacheFromDatabase();
      if (this.cachedEmbeddings.length === 0) {
        // Trigger backfill in background if never indexed
        this.backfillCatalogEmbeddings().catch(console.error);
      }
    }

    // 3. Score all cached embeddings
    const scoredCandidates: Array<{ productId: string; imageUrl: string; cosSim: number }> = [];

    for (const item of this.cachedEmbeddings) {
      const cosSim = this.cosineSimilarity(queryEmbedding, item.embedding);
      scoredCandidates.push({
        productId: item.productId,
        imageUrl: item.imageUrl,
        cosSim
      });
    }

    // Sort descending by raw similarity
    scoredCandidates.sort((a, b) => b.cosSim - a.cosSim);

    // Group by productId to keep the best matching image per product
    const bestPerProduct = new Map<string, { imageUrl: string; cosSim: number }>();
    for (const c of scoredCandidates) {
      const existing = bestPerProduct.get(c.productId);
      if (!existing || c.cosSim > existing.cosSim) {
        bestPerProduct.set(c.productId, { imageUrl: c.imageUrl, cosSim: c.cosSim });
      }
    }

    const matchedProductIds = Array.from(bestPerProduct.keys());
    if (matchedProductIds.length === 0) {
      return { results: [], total: 0, queryDimensions: queryEmbedding.length, modelVersion: MODEL_VERSION };
    }

    // 4. Authoritative live MongoDB lookup
    const mongoQuery: any = {
      _id: { $in: matchedProductIds },
      status: 'Available'
    };

    if (options.category && options.category !== 'All') {
      mongoQuery.category = options.category;
    }

    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      mongoQuery.price = {};
      if (options.minPrice !== undefined) mongoQuery.price.$gte = Number(options.minPrice);
      if (options.maxPrice !== undefined) mongoQuery.price.$lte = Number(options.maxPrice);
    }

    if (options.inStockOnly) {
      mongoQuery.stock = { $gt: 0 };
    }

    const liveProducts = await Product.find(mongoQuery).populate('sellerId').lean();

    // 5. Construct calibrated results mapped to real products
    const finalResults: VisualMatchResult[] = [];

    for (const p of liveProducts) {
      const pId = p._id.toString();
      const match = bestPerProduct.get(pId);
      if (!match) continue;

      const { percentage, tier } = this.calibrateScore(match.cosSim);
      const seller = p.sellerId as any;

      finalResults.push({
        product: {
          id: pId,
          _id: pId,
          name: p.productName,
          productName: p.productName,
          category: p.category,
          description: p.description,
          price: p.price,
          stock: p.stock,
          images: p.images,
          pickupAvailable: p.pickupAvailable,
          deliveryAvailable: p.deliveryAvailable,
          rating: p.rating || 0,
          totalReviews: p.totalReviews || 0,
          status: p.status,
          sellerId: seller?._id ? seller._id.toString() : p.sellerId?.toString(),
          sellerName: seller?.businessName || 'Local Artisan',
          isSellerApproved: seller?.adminApprovalStatus === 'APPROVED' || seller?.isApproved === true || seller?.verificationStatus === 'Approved',
          createdAt: p.createdAt
        },
        similarityScore: Number(match.cosSim.toFixed(4)),
        matchPercentage: percentage,
        matchTier: tier,
        matchedImageUrl: match.imageUrl
      });
    }

    // 6. Sort results by match percentage descending
    finalResults.sort((a, b) => b.similarityScore - a.similarityScore);

    // Apply pagination if requested
    const page = options.page || 1;
    const limit = options.limit || 24;
    const paginated = finalResults.slice((page - 1) * limit, page * limit);

    return {
      results: paginated,
      total: finalResults.length,
      queryDimensions: queryEmbedding.length,
      modelVersion: MODEL_VERSION
    };
  }

  /**
   * Metrics and index status
   */
  async getStatus(): Promise<{
    visionServiceHealth: boolean;
    model: string;
    version: string;
    dimensions: number;
    totalCatalogProducts: number;
    totalIndexedEmbeddings: number;
    coveragePercentage: number;
  }> {
    const health = await this.getServiceHealth();
    const totalProducts = await Product.countDocuments({ status: 'Available' });
    const indexedCount = await ProductEmbedding.countDocuments({ status: 'INDEXED' });

    const coverage = totalProducts > 0 ? Math.min(100, Math.round((indexedCount / totalProducts) * 100)) : 100;

    return {
      visionServiceHealth: health.healthy,
      model: MODEL_NAME,
      version: MODEL_VERSION,
      dimensions: 1280,
      totalCatalogProducts: totalProducts,
      totalIndexedEmbeddings: indexedCount,
      coveragePercentage: coverage
    };
  }
}

export const visualSearchService = new VisualSearchService();
