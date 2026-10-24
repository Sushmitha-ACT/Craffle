import React from 'react';
import { Star, Heart, MapPin, Truck } from 'lucide-react';
import { Product } from '@shared/types';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
}

export default function ProductCard({ product, onView, onAddToCart, onToggleWishlist, isWishlisted }: ProductCardProps) {
  const hasReviews = product.rating && product.totalReviews && product.totalReviews > 0;
  
  return (
    <div 
      onClick={() => onView && onView(product)}
      className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col group hover:-translate-y-1 text-[var(--text)]"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] min-h-[220px] bg-[var(--bg-secondary)] overflow-hidden border-b border-[var(--border)] flex-shrink-0">
        {(() => {
          const cat = (product.category || '').toLowerCase();
          let defaultImg = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80';
          if (cat.includes('beauty')) defaultImg = 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80';
          else if (cat.includes('jewelry') || cat.includes('accessories')) defaultImg = 'https://images.unsplash.com/photo-1515562141207-7a8ea33b379d?w=600&auto=format&fit=crop&q=80';
          else if (cat.includes('home') || cat.includes('decor')) defaultImg = 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&auto=format&fit=crop&q=80';
          else if (cat.includes('clothing') || cat.includes('textile')) defaultImg = 'https://images.unsplash.com/photo-1520006403909-838d6b92c22e?w=600&auto=format&fit=crop&q=80';
          else if (cat.includes('food') || cat.includes('beverage')) defaultImg = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80';

          const initialSrc = (product.images && product.images.length > 0 && product.images[0] && product.images[0].trim() !== '') 
            ? product.images[0] 
            : defaultImg;

          return (
            <img 
              src={initialSrc} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== defaultImg) {
                  target.src = defaultImg;
                }
              }}
            />
          );
        })()}
        
        {/* Wishlist Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleWishlist && onToggleWishlist(product.id || ''); }}
          className="absolute top-3.5 right-3.5 w-9 h-9 bg-[var(--panel)]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-[var(--panel)] hover:text-red-500 border border-[var(--border)] transition-colors z-10"
        >
          <Heart className={`w-4.5 h-4.5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--muted)]'}`} />
        </button>

        {/* Free Delivery Tag over Image */}
        {product.price > 500 ? (
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-emerald-600 px-3 py-1 rounded-lg shadow-md z-10">
            <Truck className="w-4 h-4" />
            Free Delivery
          </div>
        ) : (
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--text)] bg-[var(--panel)]/90 backdrop-blur-sm border border-[var(--border)] px-3 py-1 rounded-lg shadow-md z-10">
            <Truck className="w-4 h-4 text-[var(--muted)]" />
            Delivery available
          </div>
        )}
      </div>
      
      {/* Content Container */}
      <div className="p-5 flex flex-col flex-1 gap-2">
        {/* Category */}
        <div className="text-xs font-extrabold text-[#FF6B35] uppercase tracking-wider">
          {product.category || 'Uncategorized'}
        </div>
        
        {/* Title (Spec: 17-19px) */}
        <h3 className="font-bold text-[var(--text)] text-[18px] leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Description (Spec: 14-15px supporting text) */}
        {product.description && (
          <p className="text-[14px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        
        {/* Ratings & Seller */}
        <div className="flex items-center gap-2 mt-1 text-[14px] font-medium text-[var(--text-secondary)]">
          {hasReviews ? (
            <>
              <Star className="w-4 h-4 fill-[#FF6B35] text-[#FF6B35]" />
              <span className="font-bold text-[var(--text)]">{product.rating}</span>
              <span>({product.totalReviews})</span>
            </>
          ) : (
            <span className="text-[var(--muted)] italic text-[13px]">No reviews yet</span>
          )}
          <span className="text-[var(--border)]">·</span>
          <span className="truncate max-w-[140px] font-semibold text-[var(--text)]">🏪 {product.sellerName || 'Local Creator'}</span>
        </div>

        {/* Distance */}
        {Boolean(product.distance) && (
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            <MapPin className="w-3.5 h-3.5" /> {product.distance} km away
          </div>
        )}
        
        {/* Price & Action (Spec: 15-16px buttons, prominent price) */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-[var(--border)]">
          <span className="font-extrabold text-[#FF6B35] text-[22px]">₹{product.price}</span>
          <div className="flex gap-2.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
              className="bg-[var(--bg-secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded-xl text-[15px] font-bold transition-all shadow-sm active:scale-95"
            >
              Add
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
              className="bg-[#FF6B35] hover:bg-[#e65a2a] text-white px-4 py-2 rounded-xl text-[15px] font-bold transition-all shadow-md shadow-orange-500/20 active:scale-95 whitespace-nowrap"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
