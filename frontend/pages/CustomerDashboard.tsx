/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, SlidersHorizontal, Star, 
  ShoppingBag, X, Clock, ChevronRight,
  Sparkles, Heart, Flame, Zap, ShieldCheck,
  ChevronDown, MessageSquare, Send, Package
} from 'lucide-react';
import { CATEGORIES } from '@shared/constants';
import { Product } from '@shared/types';
import ProductCard from '../components/ProductCard';

interface CustomerDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
  initialCategory?: string;
  gps: { lat: number; lon: number; name: string };
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: Set<string>;
}

export default function CustomerDashboard({
  user, token, onLogout, initialCategory, gps,
  onViewProduct, onAddToCart, onToggleWishlist, wishlistIds
}: CustomerDashboardProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
  const [maxDistance, setMaxDistance] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('');
  const [maxPrice, setMaxPrice] = useState(5000);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, gps, maxDistance, sort, maxPrice]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: gps.lat.toString(),
        lon: gps.lon.toString(),
        maxDistance: maxDistance.toString(),
      });
      if (search.trim()) params.set('search', search);
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (maxPrice < 5000) params.set('maxPrice', maxPrice.toString());
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data);
    } catch { }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })),
          userId: user.id,
          userRole: user.role,
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Sorry, please try again.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const allCategories = ['All', ...CATEGORIES.map(c => c.name)];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 page-enter">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{gps.name}</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Discover Products</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fresh homemade creations near you</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--panel)', border: '1.5px solid var(--border)' }}>
          <Search className="w-4.5 h-4.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); fetchProducts(); }}
              className="p-1" style={{ color: 'var(--muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary py-2.5 px-4 text-sm">Search</button>
        <button type="button" onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary py-2.5 px-3">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </form>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card-surface p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>
                  Distance: {maxDistance} KM
                </label>
                <input type="range" min={1} max={50} value={maxDistance}
                  onChange={e => setMaxDistance(Number(e.target.value))}
                  className="w-full accent-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>
                  Max Price: ₹{maxPrice}
                </label>
                <input type="range" min={50} max={5000} step={50} value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>Sort By</label>
                <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-xs py-2">
                  <option value="">Distance (Nearest)</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category pills */}
      <div className="category-scroll mb-6">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'bg-[var(--panel)] text-[var(--text-secondary)] border hover:border-[var(--primary)] hover:text-[var(--primary)]'
            }`}
            style={selectedCategory !== cat ? { borderColor: 'var(--border)' } : {}}
          >
            {cat === 'All' ? '🔥 All' : CATEGORIES.find(c => c.name === cat)?.icon + ' ' + cat.split(' & ')[0]}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="product-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-4 w-1/4 rounded" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>No products found</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Try adjusting your filters or search terms</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
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

      {/* AI Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-30">
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-2xl overflow-hidden"
              style={{ background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}
            >
              {/* Chat header */}
              <div className="p-3 flex items-center justify-between brand-gradient text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-bold">Craffy AI Assistant</span>
                </div>
                <button onClick={() => setShowChat(false)} className="p-1 rounded hover:bg-white/20">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="h-72 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--primary)' }} />
                    <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      Ask me anything about products, orders, or nearby sellers!
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                      {['Track my order', 'Recommend cakes', 'Nearby sellers'].map(q => (
                        <button key={q} onClick={() => { setChatInput(q); }}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--primary)] text-white rounded-br-sm'
                        : 'rounded-bl-sm'
                    }`}
                      style={msg.role !== 'user' ? { background: 'var(--bg-secondary)', color: 'var(--text)' } : {}}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <form onSubmit={e => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask Craffy..."
                    className="input-field text-xs py-2"
                  />
                  <button type="submit" disabled={chatLoading} className="btn-primary px-3 py-2">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowChat(!showChat)}
          className="w-14 h-14 rounded-full brand-gradient text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          {showChat ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
