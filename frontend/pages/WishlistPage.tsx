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
    <div className="max-w-5xl mx-auto px-4 py-6 page-enter">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5" style={{ color: 'var(--danger)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>My Wishlist</h1>
        {items.length > 0 && (
          <span className="badge badge-primary">{items.length} items</span>
        )}
      </div>

      {loading ? (
        <div className="product-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-3">
              <div className="skeleton h-48 rounded-xl" />
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>Your wishlist is empty</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
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
              className="card-surface overflow-hidden group"
            >
              <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => onViewProduct(product)}>
                <img src={product.images?.[0] || ''} alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button
                  onClick={e => { e.stopPropagation(); removeFromWishlist(product.id); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--danger)] text-white hover:scale-110 transition-transform"
                >
                  <Heart className="w-4 h-4 fill-white" />
                </button>
              </div>
              <div className="p-3.5">
                <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--primary)' }}>{product.sellerName}</p>
                <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{product.name}</h3>
                {product.rating !== undefined && product.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{product.rating}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-base font-extrabold" style={{ color: 'var(--text)' }}>₹{product.price}</span>
                  <button
                    onClick={() => { onAddToCart(product); removeFromWishlist(product.id); }}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Add to Cart
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
