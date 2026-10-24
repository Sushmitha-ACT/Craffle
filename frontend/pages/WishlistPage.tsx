/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, ShoppingBag, Trash2, Star, Package } from 'lucide-react';
import { Product } from '@shared/types';

interface WishlistPageProps {
  userId: string;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
}

export default function WishlistPage({ userId, onViewProduct, onAddToCart, onToggleWishlist }: WishlistPageProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWishlist(); }, [userId]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wishlist/${userId}`);
      const data = await res.json();
      setItems(data);
    } catch { }
    setLoading(false);
  };

  const removeFromWishlist = async (productId: string) => {
    if (onToggleWishlist) {
      await onToggleWishlist(productId);
    } else {
      await fetch('/api/wishlist/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
      });
    }
    setItems(prev => prev.filter(p => p.id !== productId));
  };

  return (
    <div className="w-full px-6 lg:px-10 py-8 page-enter transition-colors duration-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
          <Heart className="w-5 h-5 fill-red-500" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>My Wishlist</h1>
            {items.length > 0 && (
              <span className="badge badge-primary text-xs font-bold px-3 py-1">{items.length} items</span>
            )}
          </div>
          <p className="text-[15px] font-medium mt-0.5 text-[var(--text-secondary)]">Your saved products from local home creators</p>
        </div>
      </div>

      {loading ? (
        <div className="product-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-3 p-4 bg-[var(--panel)] rounded-2xl border border-[var(--border)]">
              <div className="skeleton h-52 rounded-xl" />
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-sm">
          <Heart className="w-14 h-14 mx-auto mb-4 text-[var(--muted)]" />
          <h3 className="text-xl font-bold mb-1.5 text-[var(--text)]">Your wishlist is empty</h3>
          <p className="text-[15px] text-[var(--text-secondary)]">
            Browse products and tap the heart to save items you love
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {items.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-surface overflow-hidden group rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-[4/3] min-h-[200px] overflow-hidden cursor-pointer bg-[var(--bg-secondary)]" onClick={() => onViewProduct(product)}>
                <img src={product.images?.[0] || ''} alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button
                  onClick={e => { e.stopPropagation(); removeFromWishlist(product.id); }}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--panel)]/90 backdrop-blur-sm text-red-500 hover:scale-110 transition-transform shadow-md border border-[var(--border)]"
                  title="Remove from wishlist"
                >
                  <Heart className="w-4.5 h-4.5 fill-red-500" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#FF6B35]">{product.sellerName}</p>
                <h3 className="text-[17px] font-bold text-[var(--text)] truncate">{product.name}</h3>
                {product.rating !== undefined && product.rating > 0 && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span style={{ color: 'var(--text)' }}>{product.rating}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-[var(--border)]">
                  <span className="text-xl font-extrabold text-[#FF6B35]">₹{product.price}</span>
                  <button
                    onClick={() => { onAddToCart(product); removeFromWishlist(product.id); }}
                    className="btn-primary text-[14px] font-bold py-2 px-4 rounded-xl shadow-md shadow-orange-500/20"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
