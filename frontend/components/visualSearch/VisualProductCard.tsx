import React from 'react';
import { Star, Heart, ShoppingBag, ShieldCheck, Eye } from 'lucide-react';
import VisualSimilarityBadge from './VisualSimilarityBadge';

export interface VisualSearchResultItem {
  product: {
    id: string;
    _id: string;
    name: string;
    productName?: string;
    category?: string;
    description?: string;
    price?: number;
    stock?: number;
    images?: string[];
    pickupAvailable?: boolean;
    deliveryAvailable?: boolean;
    rating?: number;
    totalReviews?: number;
    status?: string;
    sellerId?: string;
    sellerName?: string;
    sellerAddress?: string;
    isSellerVerified?: boolean;
  };
  similarityScore: number;
  matchPercentage: number;
  matchTier: 'Strong Visual Match' | 'High Similarity' | 'Good Match' | 'Moderate Match' | string;
  matchedImageUrl: string;
}

interface VisualProductCardProps {
  key?: React.Key;
  item: VisualSearchResultItem;
  onView?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

export default function VisualProductCard({
  item,
  onView,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false
}: VisualProductCardProps) {
  if (!item || !item.product) return null;

  const product = item.product;
  const similarityScore = typeof item.similarityScore === 'number' ? item.similarityScore : 0;
  const matchPercentage = typeof item.matchPercentage === 'number' ? item.matchPercentage : 0;
  const matchTier = item.matchTier || 'Moderate Match';

  const stock = typeof product.stock === 'number' ? product.stock : 1;
  const isOutOfStock = stock <= 0;
  const defaultImg = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80';

  const displayImage = item.matchedImageUrl || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : defaultImg);
  const productName = product.name || product.productName || 'Handmade Item';
  const price = typeof product.price === 'number' ? product.price : 0;
  const productId = product.id || product._id || '';

  return (
    <div
      onClick={() => onView && onView(product)}
      className="group relative bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 text-[var(--text)]"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] bg-[var(--bg-secondary)] overflow-hidden border-b border-[var(--border)] shrink-0">
        <img
          src={displayImage}
          alt={productName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (target.src !== defaultImg) {
              target.src = defaultImg;
            }
          }}
        />

        {/* Visual Similarity Badge overlay */}
        <div className="absolute top-3 left-3 z-10">
          <VisualSimilarityBadge
            score={similarityScore}
            percentage={matchPercentage}
            tier={matchTier}
            size="sm"
          />
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (productId && onToggleWishlist) {
              onToggleWishlist(productId);
            }
          }}
          className="absolute top-3 right-3 w-8 h-8 bg-[var(--panel)]/90 hover:bg-[var(--panel)] backdrop-blur-md rounded-full flex items-center justify-center shadow-md transition-colors z-10"
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--muted)] hover:text-red-500'
            }`}
          />
        </button>

        {/* Stock Status Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[var(--muted)]">
              {product.category || 'Handcrafted'}
            </span>
            {typeof product.rating === 'number' && product.rating > 0 ? (
              <div className="flex items-center gap-1 font-bold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
                {product.totalReviews ? (
                  <span className="text-[var(--muted)] font-normal text-[11px]">
                    ({product.totalReviews})
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-[#FF6B35] transition-colors">
            {productName}
          </h3>

          {/* Seller / Creator Information */}
          {product.sellerName && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--text-secondary)]">
              <span className="truncate max-w-[150px]">By <strong className="text-[var(--text)]">{product.sellerName}</strong></span>
              {product.isSellerVerified && (
                <ShieldCheck
                  className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                  title="Verified Craffle Creator"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer: Price & Actions */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="text-[11px] text-[var(--muted)] font-medium">Verified Price</div>
            <div className="text-lg font-extrabold text-[var(--text)] tracking-tight">
              ₹{price.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onView && onView(product);
              }}
              className="p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
              title="View Product Details"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOutOfStock && onAddToCart) {
                  onAddToCart(product);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-sm ${
                isOutOfStock
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-[#FF6B35] hover:bg-orange-600 text-white shadow-orange-500/20 active:scale-95'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
