import React, { useState, useEffect } from 'react';
import { MapPin, Search, Sparkles, Filter, Film, Play } from 'lucide-react';
import { Product } from '@shared/types';
import ProductCard from '../components/ProductCard';

interface HomePageProps {
  user: any;
  products: Product[];
  onNavigate: (page: string, data?: any) => void;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
  wishlistIds?: Set<string>;
}

export default function HomePage({ user, products, onNavigate, onViewProduct, onAddToCart, onToggleWishlist, wishlistIds = new Set() }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [trendingShorts, setTrendingShorts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/shorts?limit=6')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.shorts) {
          setTrendingShorts(data.shorts);
        }
      })
      .catch(() => {});
  }, []);

  const categories = [
    'All',
    'Beauty & Personal Care',
    'Jewelry & Accessories',
    'Home Decor',
    'Clothing & Textiles',
    'Food & Beverages'
  ];

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.sellerName && product.sellerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-10 animate-fade-in w-full relative">
      
      {/* Horizontal E-commerce Hero Banner */}
      <div className="w-full relative min-h-[380px] lg:min-h-[420px] rounded-[32px] overflow-hidden mb-10 shadow-sm group flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF6B35] via-[#FF8C42] to-[#FFA07A]"></div>
        <img 
          src="https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=1200&q=80" 
          alt="Handmade crafts and home products" 
          className="absolute inset-y-0 right-0 w-1/2 h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-overlay opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col justify-center p-8 lg:p-12 z-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-extrabold w-fit mb-4 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Craffle Exclusive
          </span>
          <h1 className="text-3xl lg:text-5xl font-extrabold text-white mb-4 max-w-xl leading-tight">
            Discover Fresh Homemade Products Near You
          </h1>
          <p className="text-gray-100 text-[14px] lg:text-[15px] font-medium mb-8 max-w-md leading-relaxed">
            Support local home creators • Freshly prepared food • Handcrafted jewelry, soaps & decor
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('shorts')} 
              className="bg-black/85 hover:bg-black text-white px-7 py-3 rounded-xl font-bold text-sm transition-all shadow-lg hover:-translate-y-0.5 transform flex items-center gap-2 border border-white/20"
            >
              <Film className="w-4 h-4 text-[#FF6B35]" /> Watch Craffle Shorts
            </button>
            <button 
              onClick={() => onNavigate('nearby')} 
              className="bg-white text-[#FF6B35] hover:bg-gray-50 px-7 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:-translate-y-0.5 transform flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" /> Explore Nearby Map
            </button>
            <button 
              onClick={() => onNavigate('categories')} 
              className="bg-[#FF6B35] border border-white/20 hover:bg-[#e65a2a] text-white px-7 py-3 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 transform flex items-center gap-2"
            >
              Browse Categories
            </button>
          </div>
        </div>
      </div>

      {/* TRENDING CRAFFLE SHORTS HORIZONTAL DISCOVERY REEL */}
      {trendingShorts.length > 0 && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-[#FF6B35]">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
                  <span>Trending Craffle Shorts</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] text-[10px] font-extrabold uppercase">
                    Videos
                  </span>
                </h3>
                <p className="text-xs text-[var(--muted)]">Watch home makers and artisans in action</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('shorts')}
              className="text-xs font-bold text-[#FF6B35] hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              <span>Watch All</span>
              <span>→</span>
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar snap-x snap-mandatory">
            {trendingShorts.map(short => (
              <div
                key={short.id || short._id}
                onClick={() => onNavigate('shorts', { shortId: short.id || short._id })}
                className="relative min-w-[170px] max-w-[170px] sm:min-w-[200px] sm:max-w-[200px] aspect-[9/15] rounded-2xl overflow-hidden cursor-pointer shadow-md group shrink-0 border border-[var(--border)] snap-start bg-neutral-900"
              >
                <img
                  src={short.thumbnailUrl || (short.product?.image) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400'}
                  alt={short.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-[#FF6B35] group-hover:border-[#FF6B35] transition-colors">
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1">
                  {short.product && (
                    <div className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-bold text-white w-fit border border-white/20">
                      ₹{short.product.price}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                    {short.caption || short.product?.name}
                  </p>
                  <p className="text-[10px] text-orange-400 font-semibold truncate">
                    @{short.seller?.name || 'Local Artisan'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--text)] tracking-tight flex items-center gap-2 transition-colors duration-200">
            <Sparkles className="w-6 h-6 text-[#FF6B35]" />
            Explore Products
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium transition-colors duration-200">Discover what local home creators are making today.</p>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--panel)] rounded-3xl shadow-sm border border-[var(--border)] mt-4 transition-colors duration-200">
          <div className="text-4xl mb-3">🛍️</div>
          <h3 className="text-xl font-bold text-[var(--text)] mb-1.5 transition-colors duration-200">No products found matching your search.</h3>
          <p className="text-[var(--text-secondary)] text-[15px] mb-5">Try selecting another category or resetting filters.</p>
          <button 
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="px-6 py-2.5 bg-[#FF6B35] text-white rounded-xl text-[15px] font-bold hover:bg-[#e65a2a] transition-all shadow-md shadow-orange-500/20"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id}
              product={product} 
              onView={() => onViewProduct(product)} 
              onAddToCart={() => onAddToCart(product)} 
              onToggleWishlist={onToggleWishlist}
              isWishlisted={wishlistIds.has(product.id || '')}
            />
          ))}
        </div>
      )}
      
    </div>
  );
}
