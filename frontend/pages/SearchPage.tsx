/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, X, MapPin, ChevronDown
} from 'lucide-react';
import { CATEGORIES } from '@shared/constants';
import { Product } from '@shared/types';
import ProductCard from '../components/ProductCard';
import CameraSearchButton from '../components/visualSearch/CameraSearchButton';

interface SearchPageProps {
  user: any;
  initialQuery?: string;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: Set<string>;
  gps: { lat: number; lon: number };
  onOpenVisualSearch?: () => void;
}

export default function SearchPage({
  user,
  initialQuery = '',
  onViewProduct,
  onAddToCart,
  onToggleWishlist,
  wishlistIds,
  gps,
  onOpenVisualSearch
}: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [category, setCategory] = useState<string>('All');
  const [sort, setSort] = useState<string>('');
  const [showNearMe, setShowNearMe] = useState(false);
  const maxDistance = 25; // Default distance if near me is enabled

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch products whenever dependencies change
  useEffect(() => {
    fetchProducts();
  }, [category, sort, showNearMe]);

  // On mount, if there's an initial query, trigger search
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchProducts(initialQuery);
    }
  }, [initialQuery]);

  const fetchProducts = async (searchStr?: string) => {
    setLoading(true);
    const currentQuery = searchStr !== undefined ? searchStr : query;
    
    try {
      const params = new URLSearchParams();
      if (currentQuery.trim()) params.set('search', currentQuery);
      if (category !== 'All') params.set('category', category);
      if (sort) params.set('sort', sort);
      
      if (showNearMe) {
        params.set('lat', gps.lat.toString());
        params.set('lon', gps.lon.toString());
        params.set('maxDistance', maxDistance.toString());
      }

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleCategoryClick = (catName: string) => {
    if (category === catName) {
      setCategory('All');
    } else {
      setCategory(catName);
    }
  };

  const popularSearches = [
    'Handmade Soaps', 'Resin Art', 'Scented Candles', 'Macramé',
    'Tote Bags', 'Handmade Pottery', 'Essential Oils', 'Custom T-Shirts'
  ];

  return (
    <div className="w-full px-6 lg:px-10 py-8 animate-fade-in transition-colors duration-200">
      
      {/* 1. Header (Spec: Page titles 28-32px, subtext 15px) */}
      <div className="mb-6">
        <h1 className="text-3xl lg:text-[32px] font-extrabold text-[var(--text)] mb-1.5 tracking-tight transition-colors duration-200">
          Explore Categories
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] font-normal transition-colors duration-200">
          Discover products from local home-based sellers and creators
        </p>
      </div>

      {/* 2. Search Bar (Spec: 15-16px inputs, expanded desktop width) */}
      <form onSubmit={handleSearchSubmit}
        className="flex items-center gap-2 p-2 bg-[var(--panel)] rounded-2xl mb-8 shadow-sm border border-[var(--border)] focus-within:border-[#FF6B35] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all max-w-3xl transition-colors duration-200">
        <div className="flex-1 flex items-center gap-3 px-3">
          <Search className="w-5 h-5 text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, handmade items, food, jewelry..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-2 bg-transparent outline-none text-[15px] text-[var(--text)] placeholder-[var(--muted)]"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); fetchProducts(''); }}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--bg-secondary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          {onOpenVisualSearch && (
            <div className="mr-1">
              <CameraSearchButton onClick={onOpenVisualSearch} />
            </div>
          )}
        </div>
        <button type="submit" className="bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl px-7 py-2.5 text-[15px] font-bold transition-all shadow-md shadow-orange-500/20 shrink-0">
          Search
        </button>
      </form>

      {/* 3. Horizontal Categories (Spec: readable chips, comfortable padding) */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-[var(--muted)] mb-3 uppercase tracking-wider transition-colors duration-200">
          Categories
        </h2>
        <div className="flex overflow-x-auto custom-scrollbar pb-3 gap-3">
          <button
            onClick={() => handleCategoryClick('All')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full border text-[15px] font-semibold transition-all shadow-sm ${
              category === 'All' 
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-orange-500/25' 
                : 'bg-[var(--panel)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[#FF6B35] hover:text-[#FF6B35]'
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.name)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full border text-[15px] font-semibold transition-all flex items-center gap-2.5 shadow-sm ${
                category === c.name 
                  ? 'bg-orange-50 dark:bg-orange-950 text-[#FF6B35] border-orange-300 dark:border-orange-800' 
                  : 'bg-[var(--panel)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[#FF6B35] hover:text-[#FF6B35]'
              }`}
            >
              <span className="text-base">{c.icon}</span> 
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="border-[var(--border)] mb-8 transition-colors duration-200" />

      {/* 4. Product Results Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl font-bold text-[var(--text)] transition-colors duration-200 flex items-center gap-2">
          <span>{category === 'All' ? 'All Products' : category}</span>
          <span className="text-[var(--muted)] text-base font-normal">({results.length})</span>
        </h2>
        
        <div className="flex items-center gap-5 flex-wrap">
          <label className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--text-secondary)] cursor-pointer transition-colors duration-200">
            <input 
              type="checkbox" 
              checked={showNearMe}
              onChange={(e) => setShowNearMe(e.target.checked)}
              className="rounded text-[#FF6B35] focus:ring-[#FF6B35] w-4.5 h-4.5 cursor-pointer accent-[#FF6B35]"
            />
            📍 Show products near me
          </label>

          <div className="flex items-center gap-2.5">
            <span className="text-[15px] text-[var(--muted)] transition-colors duration-200 font-medium">Sort by:</span>
            <div className="relative border border-[var(--border)] rounded-xl bg-[var(--panel)] px-3.5 py-2 flex items-center transition-colors duration-200 shadow-sm">
              <select 
                value={sort} 
                onChange={e => setSort(e.target.value)}
                className="text-[15px] text-[var(--text)] bg-transparent outline-none appearance-none pr-7 cursor-pointer font-medium"
              >
                <option value="">Relevance</option>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--muted)] absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Product Grid (Spec: 3-4 columns on desktop, 5 on extra-wide screens) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="space-y-3 p-4 bg-[var(--panel)] rounded-2xl border border-[var(--border)]">
              <div className="skeleton h-52 rounded-xl" />
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20 bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-sm transition-colors duration-200">
          <Search className="w-14 h-14 mx-auto mb-4 text-[var(--muted)]" />
          <h3 className="text-xl font-bold mb-1.5 text-[var(--text)] transition-colors duration-200">No products found</h3>
          <p className="text-[15px] text-[var(--text-secondary)] transition-colors duration-200">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={() => onViewProduct(product)}
              onAddToCart={() => onAddToCart(product)}
              onToggleWishlist={() => onToggleWishlist(product.id)}
              isWishlisted={wishlistIds.has(product.id)}
            />
          ))}
        </div>
      )}

      {/* 6. Popular Searches (Spec: aligned with page content, readable typography) */}
      {!loading && results.length > 0 && (
        <div className="mt-16 pt-8 border-t border-[var(--border)] transition-colors duration-200">
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3.5 transition-colors duration-200">
            Popular Searches
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {popularSearches.map(term => (
              <button key={term} onClick={() => { setQuery(term); fetchProducts(term); }}
                className="px-4 py-2 rounded-full text-[14px] font-medium text-[var(--text-secondary)] bg-[var(--panel)] border border-[var(--border)] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all shadow-sm">
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
