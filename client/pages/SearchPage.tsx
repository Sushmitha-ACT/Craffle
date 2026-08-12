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

interface SearchPageProps {
  user: any;
  initialQuery?: string;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: Set<string>;
  gps: { lat: number; lon: number };
}

export default function SearchPage({
  user, initialQuery = '', onViewProduct, onAddToCart, onToggleWishlist, wishlistIds, gps
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
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 animate-fade-in w-full">
      
      {/* 1. Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1 transition-colors duration-200">Explore Categories</h1>
        <p className="text-[var(--text-secondary)] text-sm transition-colors duration-200">Discover products from local home-based sellers and creators</p>
      </div>

      {/* 2. Compact Search */}
      <form onSubmit={handleSearchSubmit}
        className="flex items-center gap-2 p-1.5 bg-[var(--panel)] rounded-lg mb-8 shadow-sm border border-[var(--border)] focus-within:border-[#FF6B35] transition-all max-w-2xl transition-colors duration-200">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, handmade items, food, jewelry..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-2 bg-transparent outline-none text-sm text-[var(--text)] placeholder-[var(--muted)]"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); fetchProducts(''); }}
              className="p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="bg-[#FF6B35] hover:bg-orange-600 text-white rounded-md px-6 py-2 text-sm font-medium transition-colors shrink-0">
          Search
        </button>
      </form>

      {/* 3. Horizontal Categories */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3 uppercase tracking-wider transition-colors duration-200">Categories</h2>
        <div className="flex overflow-x-auto custom-scrollbar pb-2 gap-3">
          <button
            onClick={() => handleCategoryClick('All')}
            className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
              category === 'All' 
                ? 'bg-[var(--text)] text-[var(--panel)] border-[var(--text)]' 
                : 'bg-[var(--panel)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text)]'
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.name)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-colors flex items-center gap-2 ${
                category === c.name 
                  ? 'bg-orange-50 text-[#FF6B35] border-orange-200' 
                  : 'bg-[var(--panel)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text)]'
              }`}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-[var(--border)] mb-8 transition-colors duration-200" />

      {/* 5. Product Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-[var(--text)] transition-colors duration-200">
          {category === 'All' ? 'All Products' : category}
          <span className="text-[var(--muted)] text-sm ml-2 font-normal">({results.length})</span>
        </h2>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer transition-colors duration-200">
            <input 
              type="checkbox" 
              checked={showNearMe}
              onChange={(e) => setShowNearMe(e.target.checked)}
              className="rounded text-[#FF6B35] focus:ring-[#FF6B35] w-4 h-4 cursor-pointer"
            />
            📍 Show products near me
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)] transition-colors duration-200">Sort by:</span>
            <div className="relative border border-[var(--border)] rounded-md bg-[var(--panel)] px-3 py-1.5 flex items-center transition-colors duration-200">
              <select 
                value={sort} 
                onChange={e => setSort(e.target.value)}
                className="text-sm text-[var(--text)] bg-transparent outline-none appearance-none pr-6 cursor-pointer"
              >
                <option value="">Relevance</option>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--muted)] absolute right-2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] transition-colors duration-200">
          <Search className="w-12 h-12 mx-auto mb-3 text-[var(--muted)]" />
          <h3 className="text-base font-bold mb-1 text-[var(--text)] transition-colors duration-200">No products found</h3>
          <p className="text-sm text-[var(--text-secondary)] transition-colors duration-200">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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

      {/* Popular Searches placed at the bottom */}
      {!loading && results.length > 0 && (
        <div className="mt-16 pt-8 border-t border-[var(--border)] transition-colors duration-200">
          <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 transition-colors duration-200">Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map(term => (
              <button key={term} onClick={() => { setQuery(term); fetchProducts(term); }}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--border)] hover:text-[var(--text)] transition-colors">
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
