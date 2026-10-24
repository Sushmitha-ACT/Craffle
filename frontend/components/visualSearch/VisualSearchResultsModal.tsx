import React, { useState, useMemo } from 'react';
import {
  X, Sparkles, ArrowUpDown, RefreshCw, AlertCircle, ShoppingBag
} from 'lucide-react';
import VisualProductCard, { VisualSearchResultItem } from './VisualProductCard';

interface VisualSearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  queryImagePreview: string | null;
  results: VisualSearchResultItem[];
  modelInfo?: {
    model: string;
    version: string;
  };
  onSearchAnother: () => void;
  onViewProduct: (product: any) => void;
  onAddToCart: (product: any) => void;
  onToggleWishlist?: (productId: string) => void;
  wishlistIds?: Set<string>;
  onExploreCategory?: (category: string) => void;
}

export default function VisualSearchResultsModal({
  isOpen,
  onClose,
  queryImagePreview,
  results = [],
  modelInfo,
  onSearchAnother,
  onViewProduct,
  onAddToCart,
  onToggleWishlist,
  wishlistIds
}: VisualSearchResultsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'similarity' | 'price-asc' | 'price-desc'>('similarity');

  const safeResults = useMemo(() => {
    return Array.isArray(results) ? results.filter(r => r && r.product) : [];
  }, [results]);

  // Extract distinct categories from results
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    safeResults.forEach(r => {
      if (r.product?.category) cats.add(r.product.category);
    });
    return ['All', ...Array.from(cats)];
  }, [safeResults]);

  // Filter & sort
  const filteredResults = useMemo(() => {
    return safeResults
      .filter(item => {
        if (!item || !item.product) return false;
        if (selectedCategory !== 'All' && item.product.category !== selectedCategory) {
          return false;
        }
        const stock = typeof item.product.stock === 'number' ? item.product.stock : 1;
        if (inStockOnly && stock <= 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const simA = typeof a?.similarityScore === 'number' ? a.similarityScore : 0;
        const simB = typeof b?.similarityScore === 'number' ? b.similarityScore : 0;
        const priceA = typeof a?.product?.price === 'number' ? a.product.price : 0;
        const priceB = typeof b?.product?.price === 'number' ? b.product.price : 0;

        if (sortBy === 'similarity') {
          return simB - simA;
        }
        if (sortBy === 'price-asc') {
          return priceA - priceB;
        }
        if (sortBy === 'price-desc') {
          return priceB - priceA;
        }
        return 0;
      });
  }, [safeResults, selectedCategory, inStockOnly, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text)]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4 bg-[var(--bg-secondary)]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6B35] to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">Craffle AI Camera Search</h2>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Visual Discovery
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {safeResults.length} visually similar {safeResults.length === 1 ? 'product' : 'products'} discovered in catalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearchAnother}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>New Photo</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Close visual search modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Query Context Strip */}
        <div className="px-6 py-3 bg-[var(--bg-secondary)]/30 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-3">
            {queryImagePreview && (
              <div className="relative group shrink-0">
                <img
                  src={queryImagePreview}
                  alt="Your uploaded search reference"
                  className="w-11 h-11 rounded-xl object-cover border-2 border-[#FF6B35] shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#FF6B35] text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                  AI
                </span>
              </div>
            )}
            <div>
              <div className="font-semibold text-[var(--text)]">Search Reference Photo</div>
              <div className="text-[11px] text-[var(--muted)]">
                Feature embeddings extracted via MobileNetV2 (1280-d cosine similarity)
              </div>
            </div>
          </div>

          <button
            onClick={onSearchAnother}
            className="sm:hidden flex items-center gap-1.5 text-xs text-[#FF6B35] font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Search Another</span>
          </button>
        </div>

        {/* Filter & Sorting Controls */}
        <div className="px-6 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[var(--panel)]">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mr-1 shrink-0">
              Category:
            </span>
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-500/20'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort & In-Stock */}
          <div className="flex items-center gap-3 ml-auto shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-[var(--border)] text-[#FF6B35] focus:ring-orange-500 w-3.5 h-3.5"
              />
              <span>In Stock Only</span>
            </label>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--muted)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-2.5 py-1 text-xs font-semibold text-[var(--text)] outline-none focus:border-[#FF6B35]"
              >
                <option value="similarity">Highest Match</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Results Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredResults.map(item => {
                const prodId = item.product?.id || item.product?._id || '';
                const isItemWishlisted = Boolean(
                  wishlistIds &&
                  typeof (wishlistIds as any).has === 'function' &&
                  prodId &&
                  (wishlistIds as any).has(prodId)
                );

                return (
                  <VisualProductCard
                    key={prodId || String(Math.random())}
                    item={item}
                    onView={onViewProduct}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    isWishlisted={isItemWishlisted}
                  />
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-16 text-center max-w-md mx-auto flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[var(--text)] mb-2">
                No Visual Matches Found
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                {safeResults.length > 0 && selectedCategory !== 'All'
                  ? `No visually similar items found in "${selectedCategory}". Try selecting "All" or resetting filters.`
                  : "We couldn't find a close visual match in our catalog right now. Try uploading a photo with clearer lighting and a centered product angle."}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={onSearchAnother}
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Image</span>
                </button>

                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setInStockOnly(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] font-bold text-xs transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="px-6 py-2.5 bg-[var(--bg-secondary)]/50 border-t border-[var(--border)] text-[11px] text-[var(--muted)] flex items-center justify-between shrink-0">
          <span>
            Verified live prices and stock from Craffle MongoDB catalog • Real AI visual embeddings
          </span>
          <span className="hidden md:inline font-mono">
            Model: {modelInfo?.model || 'MobileNetV2'}
          </span>
        </div>

      </div>
    </div>
  );
}
