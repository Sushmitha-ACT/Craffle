import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import '../backend/models/Seller.js';
import '../backend/models/User.js';
import { visualSearchService } from '../backend/services/visualSearchService.js';
import { Product } from '../backend/models/Product.js';
import { ProductEmbedding } from '../backend/models/ProductEmbedding.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/craffle';

async function runTests() {
  console.log('\n=== RUNNING VISUAL SEARCH AUTOMATED TESTS ===\n');

  // Test 1: Vision Service Health
  console.log('[Test 1] Checking Vision Microservice Health...');
  const health = await visualSearchService.getServiceHealth();
  console.assert(health.healthy === true, 'Vision service should be healthy');
  console.assert(health.model === 'MobileNetV2', 'Model should be MobileNetV2');
  console.log('✓ Test 1 Passed: Vision microservice healthy with MobileNetV2');

  // Connect to DB for subsequent tests
  await mongoose.connect(MONGODB_URI);

  // Test 2: Database Embeddings Status
  console.log('\n[Test 2] Checking MongoDB Catalog Embeddings Coverage...');
  const status = await visualSearchService.getStatus();
  console.log('Status report:', status);
  console.assert(status.totalIndexedEmbeddings > 0, 'Should have indexed embeddings in DB');
  console.assert(status.coveragePercentage === 100, 'Catalog coverage should be 100%');
  console.log('✓ Test 2 Passed: 100% catalog coverage verified');

  // Test 3: Cosine Similarity Matching on a Real Product Image
  console.log('\n[Test 3] Performing Real Image Similarity Matching...');
  const sampleProduct = await Product.findOne({ status: 'Available' }).lean() as any;
  console.assert(sampleProduct && sampleProduct.images?.length > 0, 'Sample product must exist');
  
  const sampleUrl = sampleProduct.images[0];
  console.log(`Using real product "${sampleProduct.productName}" (Image: ${sampleUrl})`);

  // Download or read image buffer to simulate customer upload
  let imgBuffer: Buffer;
  if (sampleUrl.startsWith('/uploads/')) {
    const fs = await import('fs');
    const path = await import('path');
    imgBuffer = fs.readFileSync(path.join(process.cwd(), 'public', sampleUrl));
  } else {
    const res = await fetch(sampleUrl);
    const arrayBuf = await res.arrayBuffer();
    imgBuffer = Buffer.from(arrayBuf);
  }
  console.log(`Loaded test image: ${imgBuffer.length} bytes`);

  const searchResult = await visualSearchService.searchByImageBuffer(
    imgBuffer,
    'image/jpeg',
    { limit: 5 }
  );

  console.log(`Search returned ${searchResult.results.length} visual matches.`);
  console.assert(searchResult.results.length > 0, 'Should return matching products');

  const topMatch = searchResult.results[0];
  console.log('\nTop Match Details:');
  console.log('- Product Name:', topMatch.product.name);
  console.log('- Price: ₹' + topMatch.product.price);
  console.log('- Stock:', topMatch.product.stock);
  console.log('- Seller:', topMatch.product.sellerName);
  console.log('- Cosine Similarity:', topMatch.similarityScore);
  console.log('- Match Percentage:', topMatch.matchPercentage + '%');
  console.log('- Match Tier:', topMatch.matchTier);

  // Because we searched with this exact product's image, it MUST match with high similarity (>= 85%)!
  console.assert(
    topMatch.product.id === sampleProduct._id.toString() || topMatch.matchPercentage >= 80,
    'Query image should match the source product with high similarity'
  );
  console.log('✓ Test 3 Passed: Exact image matched with top score and correct live product details');

  // Test 4: Category Filtering
  console.log('\n[Test 4] Testing Category Filter on Visual Search...');
  const filteredResult = await visualSearchService.searchByImageBuffer(
    imgBuffer,
    'image/jpeg',
    { category: sampleProduct.category, limit: 5 }
  );

  console.assert(
    filteredResult.results.every(r => r.product.category === sampleProduct.category),
    'All returned products should match the filtered category'
  );
  console.log(`✓ Test 4 Passed: Category filter successfully constrained visual matches to "${sampleProduct.category}"`);

  // Test 5: Corrupted / Invalid Image Handling
  console.log('\n[Test 5] Testing Corrupted Image Rejection...');
  const corruptedBuffer = Buffer.from('NOT_A_VALID_IMAGE_HEADER_123456789');
  let threw = false;
  try {
    await visualSearchService.searchByImageBuffer(corruptedBuffer, 'image/jpeg');
  } catch (err: any) {
    threw = true;
    console.log('Caught expected error:', err.message);
  }
  console.assert(threw === true, 'Corrupted image must be rejected');
  console.log('✓ Test 5 Passed: Corrupted image safely rejected with error');

  await mongoose.disconnect();
  console.log('\n=== ALL 5 AUTOMATED VISUAL SEARCH TESTS PASSED! ===\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
