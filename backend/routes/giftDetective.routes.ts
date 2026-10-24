/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';

const router = express.Router();

// Types for Gift Detective
export interface GiftDetectivePreferences {
  recipient?: string;
  occasion?: string;
  budget?: number;
  budgetMode?: 'TOTAL' | 'PRODUCT'; // TOTAL includes delivery & packaging
  interests?: string[];
  additionalPreferences?: {
    colorOrStyle?: string;
    personalizationRequired?: boolean;
    dietaryRestrictions?: string;
    deliveryLocation?: string;
    preferredDeliveryDate?: string;
  };
  step?: 'RECIPIENT' | 'OCCASION' | 'BUDGET' | 'INTERESTS' | 'PREFERENCES' | 'RECOMMEND' | 'COMPLETE';
}

const RECIPIENT_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Best friend', regex: /\b(best friend|bestie|bff|close friend)\b/i },
  { label: 'Partner', regex: /\b(partner|wife|husband|spouse|boyfriend|girlfriend|fiance|fiancee|lover|soulmate)\b/i },
  { label: 'Mother', regex: /\b(mother|mom|amma|mummy|mommy)\b/i },
  { label: 'Father', regex: /\b(father|dad|appa|daddy|papa)\b/i },
  { label: 'Sibling', regex: /\b(sibling|brother|sister|bro|sis)\b/i },
  { label: 'Child', regex: /\b(child|kid|daughter|son|baby|toddler|niece|nephew)\b/i },
  { label: 'Colleague', regex: /\b(colleague|coworker|co-worker|boss|manager|client|team member|office)\b/i },
  { label: 'Friend', regex: /\b(friend|pal|buddy)\b/i },
];

const OCCASION_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Birthday', regex: /\b(birthday|bday)\b/i },
  { label: 'Anniversary', regex: /\b(anniversary|annual celebration)\b/i },
  { label: 'Wedding', regex: /\b(wedding|marriage|bridal|groom|reception)\b/i },
  { label: 'Festival', regex: /\b(festival|diwali|deepavali|pongal|eid|christmas|new year|holi|rakhi|raksha bandhan)\b/i },
  { label: 'Graduation', regex: /\b(graduation|convocation|degree|graduating)\b/i },
  { label: 'Thank-you gift', regex: /\b(thank you|thanks|gratitude|appreciation)\b/i },
  { label: 'Housewarming', regex: /\b(housewarming|griha pravesh|new home)\b/i },
  { label: 'Just because', regex: /\b(just because|surprise|random|spontaneous|no occasion)\b/i },
];

const INTEREST_PATTERNS: { label: string; keywords: string[] }[] = [
  { label: 'Art and stationery', keywords: ['art', 'stationery', 'painting', 'drawing', 'notebook', 'bookmark', 'sketch', 'journal', 'pen'] },
  { label: 'Handmade crafts', keywords: ['craft', 'handmade', 'handcrafted', 'resin', 'pottery', 'crochet', 'clay', 'ceramic', 'wood'] },
  { label: 'Home decor', keywords: ['home decor', 'decor', 'frame', 'photo frame', 'resin art', 'candle', 'cushion', 'wall hanging', 'lamp'] },
  { label: 'Fashion and accessories', keywords: ['fashion', 'accessory', 'tote', 'bag', 'wallet', 'scarf', 'hair', 'cloth', 'apparel'] },
  { label: 'Beauty and personal care', keywords: ['beauty', 'skincare', 'soap', 'bath', 'scrub', 'lotion', 'lip balm', 'organic'] },
  { label: 'Food and homemade treats', keywords: ['food', 'treat', 'pickle', 'sweet', 'snack', 'cake', 'cookie', 'chocolate', 'jam', 'bites'] },
  { label: 'Jewellery', keywords: ['jewellery', 'jewelry', 'earring', 'necklace', 'bracelet', 'ring', 'pendant', 'anklet'] },
  { label: 'Plants and nature', keywords: ['plant', 'nature', 'succulent', 'planter', 'flower', 'green'] },
  { label: 'Personalised gifts', keywords: ['personalise', 'personalize', 'custom', 'customised', 'customized', 'photo', 'engrave', 'name'] },
];

/**
 * Robust Deterministic NLP Extractor
 * Extracts recipient, occasion, budget, budget mode, and interests from natural customer messages.
 */
function extractPreferencesFromText(text: string, current: GiftDetectivePreferences = {}): GiftDetectivePreferences {
  const updated: GiftDetectivePreferences = { ...current };
  const lower = text.toLowerCase();

  // 1. Recipient extraction
  for (const p of RECIPIENT_PATTERNS) {
    if (p.regex.test(text)) {
      updated.recipient = p.label;
      break;
    }
  }

  // 2. Occasion extraction
  for (const o of OCCASION_PATTERNS) {
    if (o.regex.test(text)) {
      updated.occasion = o.label;
      break;
    }
  }

  // 3. Budget extraction
  // Matches patterns like: "under ₹500", "budget is 800", "₹1000", "1500 inr", "rs 500", "max 600", "upto 750", "budget 500"
  const budgetRegex = /(?:under|budget(?:\s*is)?|₹|rs\.?|inr|upto|max|around|within|less than)\s*(\d{2,6})/i;
  const standaloneCurrency = /(?:₹|rs\.?)\s*(\d{2,6})/i;
  const numOnlyInBudget = /\b(\d{2,6})\s*(?:rupees|inr|rs)\b/i;

  const matchBudget = text.match(budgetRegex) || text.match(standaloneCurrency) || text.match(numOnlyInBudget);
  if (matchBudget && matchBudget[1]) {
    const val = parseInt(matchBudget[1], 10);
    if (!isNaN(val) && val > 0) {
      updated.budget = val;
    }
  } else if (!updated.budget) {
    // If user just typed a plain number like "500" or "1000"
    const plainNum = text.trim().match(/^(\d{2,6})$/);
    if (plainNum && plainNum[1]) {
      updated.budget = parseInt(plainNum[1], 10);
    }
  }

  // Budget mode: check if total (including delivery/packaging) or product subtotal only
  if (
    lower.includes('including delivery') ||
    lower.includes('with delivery') ||
    lower.includes('total budget') ||
    lower.includes('all inclusive') ||
    lower.includes('final budget') ||
    lower.includes('with shipping')
  ) {
    updated.budgetMode = 'TOTAL';
  } else if (lower.includes('product only') || lower.includes('excluding delivery')) {
    updated.budgetMode = 'PRODUCT';
  } else if (!updated.budgetMode) {
    // Default to TOTAL budget to protect user from surprise delivery fees
    updated.budgetMode = 'TOTAL';
  }

  // 4. Interests extraction
  const foundInterests: string[] = updated.interests ? [...updated.interests] : [];
  for (const item of INTEREST_PATTERNS) {
    const matches = item.keywords.some(k => lower.includes(k));
    if (matches && !foundInterests.includes(item.label)) {
      foundInterests.push(item.label);
    }
  }
  if (foundInterests.length > 0) {
    updated.interests = foundInterests;
  }

  // 5. Additional preferences (customization, style, dietary)
  const addl = updated.additionalPreferences || {};
  if (lower.includes('custom') || lower.includes('personal') || lower.includes('name') || lower.includes('photo')) {
    addl.personalizationRequired = true;
  }
  if (lower.includes('veg') || lower.includes('vegan') || lower.includes('sugar-free') || lower.includes('eggless')) {
    addl.dietaryRestrictions = lower.includes('vegan') ? 'Vegan' : lower.includes('eggless') ? 'Eggless' : 'Vegetarian';
  }
  updated.additionalPreferences = addl;

  return updated;
}

/**
 * Search the live MongoDB catalog and rank products against user preferences
 */
async function searchAndRankProducts(prefs: GiftDetectivePreferences) {
  // Query all Available products with stock > 0
  const products = await Product.find({
    status: 'Available',
    stock: { $gt: 0 }
  })
    .populate('sellerId', 'businessName address phone latitude longitude isApproved')
    .lean();

  if (!products || products.length === 0) {
    return { matches: [], totalAvailable: 0, alternatives: [] };
  }

  const budget = prefs.budget;
  const budgetMode = prefs.budgetMode || 'TOTAL';
  const interests = prefs.interests || [];
  const occasion = prefs.occasion || '';
  const recipient = prefs.recipient || '';
  const requirePersonalization = prefs.additionalPreferences?.personalizationRequired;

  // Compute match score and budget eligibility for each product
  const scoredProducts = products.map((p: any) => {
    let score = 0;
    const reasons: string[] = [];
    const name = (p.productName || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();

    // 1. Interest Matching (highest weight: 40 pts)
    if (interests.length > 0) {
      interests.forEach(interest => {
        const pattern = INTEREST_PATTERNS.find(i => i.label.toLowerCase() === interest.toLowerCase());
        const keywords = pattern ? pattern.keywords : [interest.toLowerCase()];
        const match = keywords.some(k => name.includes(k) || cat.includes(k) || desc.includes(k));
        if (match) {
          score += 35;
          reasons.push(`Matches interest in ${interest}`);
        }
      });
    } else {
      // General match
      score += 15;
    }

    // 2. Occasion Matching (20 pts)
    if (occasion) {
      const occLower = occasion.toLowerCase();
      if (occLower.includes('birthday') || occLower.includes('anniversary')) {
        if (cat.includes('customized') || name.includes('art') || name.includes('frame') || desc.includes('gift')) {
          score += 20;
          reasons.push(`Celebratory gift for ${occasion}`);
        }
      } else if (occLower.includes('wedding')) {
        if (name.includes('frame') || cat.includes('decor') || name.includes('art')) {
          score += 20;
          reasons.push(`Keepsake craft for ${occasion}`);
        }
      } else if (occLower.includes('festival') || occLower.includes('thank')) {
        if (cat.includes('homemade') || name.includes('pickle') || name.includes('sweet') || name.includes('treat')) {
          score += 20;
          reasons.push(`Traditional handmade creation for ${occasion}`);
        }
      }
    }

    // 3. Personalization Suitability (15 pts)
    const isCustomizable = name.includes('custom') || desc.includes('customiz') || cat.includes('customized');
    if (requirePersonalization && isCustomizable) {
      score += 25;
      reasons.push('Supports custom name/photo personalisation');
    } else if (isCustomizable) {
      score += 10;
    }

    // 4. Rating & Reviews (10 pts)
    if (p.rating && p.rating > 0) {
      score += Math.min(10, Math.round(p.rating * 2));
      reasons.push(`Top rated (${p.rating}★ by verified buyers)`);
    }

    // Budget Compatibility Check
    // If budgetMode === 'TOTAL', reserve estimated delivery (₹29) and standard packaging (₹40) = ₹69
    const reserveMargin = budgetMode === 'TOTAL' ? 69 : 0;
    const maxItemPrice = budget ? (budget - reserveMargin) : Infinity;
    const fitsDirectBudget = budget ? (p.price <= budget) : true;
    const fitsWithFulfillment = budget ? (p.price <= maxItemPrice) : true;

    if (fitsWithFulfillment) {
      score += 20;
      reasons.push(`Well within budget (₹${p.price})`);
    } else if (fitsDirectBudget) {
      score += 10;
    } else {
      // Exceeds stated budget
      score -= 50;
    }

    return {
      id: p._id.toString(),
      productName: p.productName,
      category: p.category,
      description: p.description,
      price: p.price,
      stock: p.stock ?? 1,
      images: p.images || [],
      sellerId: (p.sellerId as any)?._id?.toString() || p.sellerId?.toString(),
      sellerName: (p.sellerId as any)?.businessName || 'Local Creator',
      pickupAvailable: p.pickupAvailable ?? true,
      deliveryAvailable: p.deliveryAvailable ?? true,
      rating: p.rating || 0,
      totalReviews: p.totalReviews || 0,
      customizable: isCustomizable,
      score,
      reasons,
      fitsDirectBudget,
      fitsWithFulfillment,
    };
  });

  // Sort by score descending
  scoredProducts.sort((a, b) => b.score - a.score);

  // Filter products that genuinely fit within budget
  const eligibleProducts = budget
    ? scoredProducts.filter(p => p.fitsDirectBudget)
    : scoredProducts;

  // Build a Curated Gift Bundle if multiple products can combine under budget
  let bundle: any = null;
  if (budget && eligibleProducts.length >= 2) {
    const packagingCost = 40; // Eco gift box
    const deliveryCost = 29;   // Standard creator delivery
    const availableForProducts = budgetMode === 'TOTAL' ? (budget - packagingCost - deliveryCost) : budget;

    // Try finding two distinct products whose combined price <= availableForProducts
    for (let i = 0; i < eligibleProducts.length; i++) {
      for (let j = i + 1; j < eligibleProducts.length; j++) {
        const p1 = eligibleProducts[i];
        const p2 = eligibleProducts[j];
        const subtotal = p1.price + p2.price;
        if (subtotal <= availableForProducts) {
          const finalTotal = subtotal + (budgetMode === 'TOTAL' ? (packagingCost + deliveryCost) : 0);
          bundle = {
            title: `${prefs.occasion || 'Special'} Gift Set for ${prefs.recipient || 'Someone Special'}`,
            items: [p1, p2],
            subtotal,
            packaging: packagingCost,
            delivery: deliveryCost,
            finalTotal,
            remaining: budget - finalTotal,
            multiSeller: p1.sellerId !== p2.sellerId,
          };
          break;
        }
      }
      if (bundle) break;
    }
  }

  return {
    matches: eligibleProducts,
    allScored: scoredProducts,
    totalAvailable: products.length,
    bundle,
  };
}

/**
 * POST /api/gift-detective/chat
 * Natural Language Conversational Gift Discovery
 */
router.post('/api/gift-detective/chat', async (req, res) => {
  try {
    const { message, history, preferences: incomingPrefs } = req.body;
    const userText = (message || '').trim();

    // 1. Extract updated preferences from incoming message
    let prefs: GiftDetectivePreferences = extractPreferencesFromText(userText, incomingPrefs || {});

    // Check for "start over" or "reset"
    if (/^(start over|reset|restart|clear|new search)$/i.test(userText)) {
      prefs = { step: 'RECIPIENT' };
      return res.json({
        reply: "Starting fresh! 🎁 Who is this thoughtful gift for? (e.g. Best friend, Partner, Mother, Sibling, Child...)",
        preferences: prefs,
        recommendations: [],
        bundle: null,
        quickReplies: ['Best friend', 'Partner', 'Mother', 'Father', 'Sibling', 'Colleague', 'Child'],
      });
    }

    // 2. Search live catalog with current preferences
    const catalogResults = await searchAndRankProducts(prefs);
    const { matches, allScored, bundle } = catalogResults;

    // 3. Determine conversational response & next questions
    let reply = '';
    let quickReplies: string[] = [];

    // Check missing core criteria: Recipient, Occasion, Budget, Interests
    const missing: string[] = [];
    if (!prefs.recipient) missing.push('recipient');
    if (!prefs.occasion) missing.push('occasion');
    if (!prefs.budget) missing.push('budget');
    if (!prefs.interests || prefs.interests.length === 0) missing.push('interests');

    // Case 1: Initial greeting or just starting
    if (missing.length >= 3 && !prefs.recipient && !prefs.budget) {
      reply = "Not sure what to gift? Tell me a little about the person and your budget. I'll find thoughtful gifts from local Craffle creators.\n\nTo get started, **who is the gift for?**";
      quickReplies = ['Best friend', 'Partner', 'Mother', 'Father', 'Sibling', 'Colleague', 'Child'];
      prefs.step = 'RECIPIENT';
    }
    // Case 2: Has recipient, missing occasion
    else if (!prefs.occasion) {
      reply = `Wonderful! A gift for your **${prefs.recipient}**. What is the occasion you're celebrating?`;
      quickReplies = ['Birthday', 'Anniversary', 'Wedding', 'Festival', 'Thank-you gift', 'Just because'];
      prefs.step = 'OCCASION';
    }
    // Case 3: Has recipient & occasion, missing budget
    else if (!prefs.budget) {
      reply = `Got it, a **${prefs.occasion}** gift for your **${prefs.recipient}**! What is your total budget in INR? (We will make sure never to exceed it).`;
      quickReplies = ['Under ₹300', 'Under ₹500', 'Under ₹1,000', 'Under ₹1,500', 'Under ₹2,000'];
      prefs.step = 'BUDGET';
    }
    // Case 4: Has budget, missing interests
    else if (!prefs.interests || prefs.interests.length === 0) {
      reply = `Perfect, keeping it within **₹${prefs.budget}** (${prefs.budgetMode === 'TOTAL' ? 'including delivery' : 'product subtotal'}). What do they enjoy or what style do they like?`;
      quickReplies = [
        'Art and stationery',
        'Handmade crafts',
        'Home decor',
        'Food and homemade treats',
        'Personalised gifts',
        'Jewellery'
      ];
      prefs.step = 'INTERESTS';
    }
    // Case 5: We have sufficient information! Present recommendations!
    else {
      prefs.step = 'COMPLETE';

      if (matches.length > 0) {
        const topCount = Math.min(matches.length, 3);
        const occasionText = prefs.occasion ? ` for their ${prefs.occasion}` : '';
        const budText = prefs.budget ? ` within your ₹${prefs.budget} budget` : '';

        reply = `I searched our live creators' catalogue and found **${matches.length} thoughtful ${matches.length === 1 ? 'gift' : 'gifts'}** for your **${prefs.recipient}**${occasionText}${budText}!`;

        if (bundle) {
          reply += `\n\n🎁 **Recommended Gift Box**: I also assembled a ready-to-gift bundle with handcrafted packaging that fits completely under your ₹${prefs.budget} total budget!`;
        }

        quickReplies = ['Build Gift Box', 'Add Bundle to Box', 'Change Budget', 'Try Another Occasion'];
      } else {
        // Honest limitation explanation — NEVER invent fake products!
        const lowestInDb = allScored.length > 0 ? Math.min(...allScored.map(p => p.price)) : 200;
        reply = `We searched our active creators' inventory, but we currently don't have available items under **₹${prefs.budget}** matching **${prefs.interests?.join(', ')}**. \n\nOur local artisan creations in Home Decor and Homemade treats currently start at **₹${lowestInDb}**. Would you like to adjust your budget or explore single handcrafted items?`;
        quickReplies = [`Budget: ₹${lowestInDb + 100}`, `Budget: ₹${lowestInDb + 300}`, 'Show All Categories', 'Reset Preferences'];
      }
    }

    // Optional LLM touch: If GEMINI_API_KEY is available and user asked a nuanced question, augment conversational tone
    if (process.env.GEMINI_API_KEY && userText.length > 15) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are "Craffle Gift Detective", a warm and helpful personal gift assistant.
The customer says: "${userText}".
Extracted preferences: ${JSON.stringify(prefs)}.
Available real matching products in database: ${matches.map(m => `${m.productName} (₹${m.price})`).join(', ')}.
Reply in 2-3 warm, helpful sentences acknowledging their request. Keep it concise. Do NOT invent products not in the database.`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        if (aiResponse && aiResponse.text) {
          reply = aiResponse.text.trim();
        }
      } catch (llmErr) {
        // Graceful fallback to deterministic response
        console.warn('[Gift Detective] Gemini call skipped or failed, using deterministic response');
      }
    }

    // Only return recommendation cards and bundles when the user is at COMPLETE stage,
    // or explicitly asks to show gifts/recommendations, or provided both budget + interests!
    const wantsRecommendations = /recommend|show|gift|find|suggest|search|explore|products/i.test(userText);
    const hasSufficientCriteria = (
      prefs.step === 'COMPLETE' ||
      (prefs.budget !== undefined && prefs.budget !== null && prefs.interests && prefs.interests.length > 0) ||
      (wantsRecommendations && (prefs.budget || (prefs.interests && prefs.interests.length > 0)))
    );

    res.json({
      reply,
      preferences: prefs,
      recommendations: hasSufficientCriteria ? matches.slice(0, 4) : [],
      bundle: hasSufficientCriteria ? bundle : null,
      quickReplies,
    });
  } catch (err: any) {
    console.error('Gift Detective Chat error:', err);
    res.status(500).json({
      error: 'Failed to process gift discovery',
      reply: 'Sorry, I ran into an issue while searching the catalog. Please try again or adjust your criteria!',
      quickReplies: ['Start Over', 'Show Home Decor', 'Show Treats']
    });
  }
});

/**
 * POST /api/gift-detective/recommendations
 * Direct query for catalog recommendations based on criteria
 */
router.post('/api/gift-detective/recommendations', async (req, res) => {
  try {
    const prefs: GiftDetectivePreferences = req.body.preferences || {};
    const results = await searchAndRankProducts(prefs);
    res.json(results);
  } catch (err: any) {
    console.error('Gift Detective Recommendations error:', err);
    res.status(500).json({ error: 'Failed to retrieve recommendations' });
  }
});

/**
 * POST /api/gift-box/validate
 * Validates gift box items, stock, real DB pricing, packaging, and multi-seller fulfillment
 */
router.post('/api/gift-box/validate', async (req, res) => {
  try {
    const { items, packagingType, budget, budgetMode = 'TOTAL' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        valid: false,
        errors: ['Gift box is empty. Please add at least one product.']
      });
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedItems: any[] = [];
    const sellersMap = new Map<string, any>();

    let subtotal = 0;

    // Fetch live from MongoDB to prevent client price tampering or stale stock
    for (const item of items) {
      const productId = item.productId || item.id;
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10));
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        errors.push(`A product in your gift box is no longer available.`);
        continue;
      }

      const product = await Product.findById(productId).populate('sellerId').lean();
      if (!product) {
        errors.push(`A product in your gift box is no longer available.`);
        continue;
      }

      if (product.status !== 'Available') {
        errors.push(`"${product.productName}" is currently out of stock.`);
        continue;
      }

      if ((product.stock ?? 1) < quantity) {
        errors.push(`Only ${product.stock} units of "${product.productName}" are available.`);
        continue;
      }

      const realPrice = product.price;
      const lineTotal = realPrice * quantity;
      subtotal += lineTotal;

      const seller = product.sellerId as any;
      const sellerIdStr = seller?._id?.toString() || product.sellerId?.toString();
      if (sellerIdStr && !sellersMap.has(sellerIdStr)) {
        sellersMap.set(sellerIdStr, {
          sellerId: sellerIdStr,
          sellerName: seller?.businessName || 'Craffle Artisan',
          address: seller?.address || '',
          phone: seller?.phone || '',
          itemsCount: 0,
        });
      }
      if (sellerIdStr && sellersMap.has(sellerIdStr)) {
        sellersMap.get(sellerIdStr).itemsCount += quantity;
      }

      validatedItems.push({
        productId: product._id.toString(),
        name: product.productName,
        price: realPrice,
        quantity,
        image: (product.images && product.images[0]) || '',
        sellerId: sellerIdStr,
        sellerName: seller?.businessName || 'Craffle Artisan',
        stock: product.stock ?? 1,
        fulfillmentMethod: 'DELIVERY',
      });
    }

    if (errors.length > 0) {
      return res.status(200).json({
        valid: false,
        errors,
        validatedItems,
      });
    }

    // Packaging calculation
    let packagingCost = 0;
    if (packagingType === 'DELUXE') {
      packagingCost = 70; // Deluxe ribbon box + handcrafted greeting card
    } else if (packagingType === 'ECO') {
      packagingCost = 40; // Eco Kraft Gift Box with twine ribbon
    }

    // Delivery calculation: ₹29 per creator shipment (free over ₹500 from same seller)
    const distinctSellers = Array.from(sellersMap.values());
    const isMultiSeller = distinctSellers.length > 1;

    let deliveryCost = 0;
    distinctSellers.forEach(s => {
      // Free delivery if order >= 500
      if (subtotal < 500) {
        deliveryCost += 29;
      }
    });

    const total = subtotal + packagingCost + deliveryCost;

    // Check budget constraint
    const numBudget = Number(budget);
    let budgetExceeded = false;
    let remainingBudget: number | undefined = undefined;

    if (numBudget > 0) {
      const budgetCheckTarget = budgetMode === 'TOTAL' ? total : subtotal;
      remainingBudget = numBudget - budgetCheckTarget;
      if (budgetCheckTarget > numBudget) {
        budgetExceeded = true;
        warnings.push(`Current gift box total (₹${budgetCheckTarget}) exceeds your ₹${numBudget} budget by ₹${budgetCheckTarget - numBudget}.`);
      }
    }

    if (isMultiSeller) {
      warnings.push(`Items come from ${distinctSellers.length} different local creators and will be dispatched in separate packages.`);
    }

    res.json({
      valid: true,
      items: validatedItems,
      pricing: {
        subtotal,
        packagingCost,
        deliveryCost,
        total,
        budget: numBudget || undefined,
        budgetMode,
        remainingBudget,
        budgetExceeded,
      },
      multiSellerInfo: {
        isMultiSeller,
        sellerCount: distinctSellers.length,
        sellers: distinctSellers,
      },
      warnings,
      errors: [],
    });
  } catch (err: any) {
    console.error('Gift box validation error:', err);
    res.status(500).json({ valid: false, errors: ['Failed to validate gift box.'] });
  }
});

/**
 * POST /api/gift-box/checkout
 * Prepares validated gift box for Craffle checkout
 */
router.post('/api/gift-box/checkout', async (req, res) => {
  try {
    const { items, packagingType, giftMessage } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Gift box is empty' });
    }

    // Verify stock and compute final items
    const cartReadyItems: any[] = [];
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({ error: 'One or more products in your gift box is invalid.' });
      }

      const product = await Product.findById(item.productId).populate('sellerId').lean();
      if (!product || product.status !== 'Available' || (product.stock ?? 1) < item.quantity) {
        return res.status(400).json({
          error: `Product "${product?.productName || 'item'}" is no longer available in the requested quantity.`
        });
      }

      cartReadyItems.push({
        productId: product._id.toString(),
        name: product.productName,
        price: product.price,
        quantity: item.quantity,
        image: (product.images && product.images[0]) || '',
        sellerId: (product.sellerId as any)?._id?.toString() || product.sellerId?.toString(),
        sellerName: (product.sellerId as any)?.businessName || 'Craffle Artisan',
        stock: product.stock ?? 1,
        fulfillmentMethod: 'DELIVERY',
        giftPackaging: packagingType || 'NONE',
        giftMessage: giftMessage || '',
      });
    }

    const subtotal = cartReadyItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const packagingCost = packagingType === 'DELUXE' ? 70 : packagingType === 'ECO' ? 40 : 0;
    const deliveryCost = subtotal >= 500 ? 0 : 29;
    const total = subtotal + packagingCost + deliveryCost;

    if (packagingCost > 0) {
      cartReadyItems.push({
        productId: `packaging-${(packagingType || 'eco').toLowerCase()}`,
        name: packagingType === 'DELUXE' ? 'Deluxe Ribbon Gift Box & Card' : 'Eco Kraft Gift Packaging & Ribbon',
        price: packagingCost,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80',
        sellerId: cartReadyItems[0]?.sellerId,
        sellerName: cartReadyItems[0]?.sellerName || 'Craffle Packaging',
        stock: 999,
        fulfillmentMethod: 'DELIVERY'
      });
    }

    res.json({
      success: true,
      items: cartReadyItems,
      checkoutItems: cartReadyItems,
      pricing: { subtotal, packagingCost, deliveryCost, total },
      message: 'Gift box validated and prepared for checkout.',
    });
  } catch (err: any) {
    console.error('Gift box checkout error:', err);
    res.status(500).json({ error: 'Failed to process gift box checkout' });
  }
});

export default router;
