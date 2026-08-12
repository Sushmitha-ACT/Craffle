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
      className="w-full bg-white border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col group hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden border-b border-gray-100 flex-shrink-0">
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
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white hover:text-red-500 transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>

        {/* Free Delivery Tag over Image - Optional based on price logic */}
        {product.price > 500 ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px] font-bold text-white bg-[#00B44B] px-2.5 py-1 rounded-md shadow-sm z-10">
            <Truck className="w-3.5 h-3.5" />
            Free Delivery
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm z-10">
            <Truck className="w-3.5 h-3.5 text-gray-500" />
            Delivery available
          </div>
        )}
      </div>
      
      {/* Content Container */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category */}
        <div className="text-[10px] font-extrabold text-[#FF6B35] uppercase tracking-wider mb-1">
          {product.category || 'Uncategorized'}
        </div>
        
        {/* Title */}
        <h3 className="font-bold text-[#1F2937] text-[15px] mb-1.5 leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}
        
        {/* Ratings & Seller */}
        <div className="flex items-center gap-1.5 mt-1 mb-1.5 text-[12px] font-medium text-gray-600">
          {hasReviews ? (
            <>
              <Star className="w-3.5 h-3.5 fill-[#FF6B35] text-[#FF6B35]" />
              <span>{product.rating} ({product.totalReviews})</span>
            </>
          ) : (
            <span className="text-gray-400 italic">No reviews yet</span>
          )}
          <span className="text-gray-300">·</span>
          <span className="truncate max-w-[120px] font-semibold text-gray-700">🏪 {product.sellerName || 'Local Creator'}</span>
        </div>

        {/* Distance */}
        {Boolean(product.distance) && (
          <div className="flex items-center gap-1 text-[12px] font-medium text-[#00B44B] mb-4">
            <MapPin className="w-3 h-3" /> {product.distance} km away
          </div>
        )}
        
        {/* Price & Action */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-gray-50">
          <span className="font-extrabold text-[#FF6B35] text-[18px]">₹{product.price}</span>
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
              className="bg-[#F8F9FA] hover:bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
            >
              Add
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(product); }}
              className="bg-[#FF6B35] hover:bg-[#e65a2a] text-white px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
