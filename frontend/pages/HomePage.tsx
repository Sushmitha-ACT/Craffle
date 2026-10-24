import React, { useState } from 'react';
import { MapPin, Search, Sparkles, Filter } from 'lucide-react';
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
    <div className="p-4 lg:p-8 animate-fade-in w-full relative">
      
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
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
          <div className="text-4xl mb-3">🛍️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No products found matching your search.</h3>
          <p className="text-gray-500 text-xs mb-4">Try selecting another category or resetting filters.</p>
          <button 
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="px-5 py-2 bg-[#FF6B35] text-white rounded-xl text-xs font-bold hover:bg-[#e65a2a] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
