import express from 'express';
import multer from 'multer';
import { visualSearchService } from '../services/visualSearchService.js';

const router = express.Router();

// Configure Multer with in-memory storage and strict 8MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024 // 8 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, PNG, and WebP images are allowed.'));
    }
  }
});

/**
 * Validate image magic bytes to prevent MIME type spoofing
 */
function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

/**
 * POST /api/v1/visual-search
 * Searches catalog for visually similar products using real image embeddings
 */
router.post('/api/v1/visual-search', upload.single('image'), async (req: any, res) => {
  const searchId = `vsearch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'No image file uploaded. Please take a photo or select an image from your gallery.',
        code: 'MISSING_IMAGE'
      });
    }

    const { buffer, mimetype, size } = req.file;

    // Verify magic bytes
    if (!validateMagicBytes(buffer)) {
      return res.status(400).json({
        error: 'The uploaded file appears to be corrupted or is not a valid image format (JPG, PNG, WebP).',
        code: 'INVALID_IMAGE_HEADER'
      });
    }

    // Parse optional filters
    const category = typeof req.body.category === 'string' ? req.body.category : undefined;
    const minPrice = req.body.minPrice ? parseFloat(req.body.minPrice) : undefined;
    const maxPrice = req.body.maxPrice ? parseFloat(req.body.maxPrice) : undefined;
    const inStockOnly = req.body.inStockOnly === 'true' || req.body.inStockOnly === true;
    const limit = req.body.limit ? parseInt(req.body.limit, 10) : 24;
    const page = req.body.page ? parseInt(req.body.page, 10) : 1;

    // Execute real visual similarity search
    const { results, total, queryDimensions, modelVersion } = await visualSearchService.searchByImageBuffer(
      buffer,
      mimetype,
      { category, minPrice, maxPrice, inStockOnly, limit, page }
    );

    // Create thumbnail data URL for query image display in UI
    const previewDataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;

    return res.json({
      success: true,
      searchId,
      queryImagePreview: previewDataUrl,
      meta: {
        model: 'MobileNetV2',
        modelVersion,
        dimensions: queryDimensions
      },
      queryMeta: {
        fileSize: size,
        mimeType: mimetype,
        embeddingDimensions: queryDimensions,
        model: 'MobileNetV2',
        modelVersion
      },
      results,
      total,
      page,
      limit,
      filtersApplied: {
        category: category || 'All',
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        inStockOnly
      }
    });
  } catch (err: any) {
    console.error(`[VisualSearch] Error processing ${searchId}:`, err);
    return res.status(500).json({
      error: err.message || 'Visual similarity search failed. Please try another photo.',
      code: 'SEARCH_FAILED',
      searchId
    });
  }
});

/**
 * POST /api/v1/visual-search/backfill
 * Triggers catalog image embedding generation and caching
 */
router.post('/api/v1/visual-search/backfill', async (req, res) => {
  try {
    const result = await visualSearchService.backfillCatalogEmbeddings();
    res.json({
      success: true,
      message: 'Catalog embeddings backfill completed successfully',
      result
    });
  } catch (err: any) {
    console.error('[VisualSearch] Backfill error:', err);
    res.status(500).json({ error: err.message || 'Failed to backfill embeddings' });
  }
});

/**
 * GET /api/v1/visual-search/status
 * Returns vision service health and catalog indexing coverage metrics
 */
router.get('/api/v1/visual-search/status', async (req, res) => {
  try {
    const status = await visualSearchService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
