/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Film, Plus, Trash2, Eye, Heart, MessageCircle, 
  Video, RefreshCw, ExternalLink 
} from 'lucide-react';
import { Product } from '@shared/types';
import CreateShortModal from './CreateShortModal';

interface SellerShort {
  id: string;
  _id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  status: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    status: string;
  } | null;
}

interface SellerShortsManagerProps {
  seller: any;
  token: string;
  products?: Product[];
  onViewProduct?: (product: Product) => void;
  onPreviewShorts?: (shortId?: string) => void;
  onNavigateToAddProduct?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SellerShortsManager({
  seller,
  token,
  products,
  onViewProduct,
  onPreviewShorts,
  onNavigateToAddProduct,
  showToast
}: SellerShortsManagerProps) {
  const [shorts, setShorts] = useState<SellerShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch seller's own shorts
  const fetchSellerData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shorts/seller/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShorts(data);
      }
    } catch (err) {
      console.error('Failed to load seller shorts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, [seller?.id, seller?._id, token]);

  // Delete Short
  const handleDeleteShort = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this Short?')) return;

    try {
      const res = await fetch(`/api/shorts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShorts(prev => prev.filter(s => s.id !== id && s._id !== id));
        showToast('Short deleted', 'info');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete Short', 'error');
      }
    } catch {
      showToast('Error deleting short', 'error');
    }
  };

  const totalViews = shorts.reduce((sum, s) => sum + (s.viewsCount || 0), 0);
  const totalLikes = shorts.reduce((sum, s) => sum + (s.likesCount || 0), 0);
  const totalComments = shorts.reduce((sum, s) => sum + (s.commentsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-orange-500/10 text-[#FF6B35] rounded-xl border border-orange-500/20">
              <Film className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[var(--text)]">Craffle Shorts Studio</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FF6B35] text-[10px] font-extrabold uppercase tracking-wider">
              Creator Hub
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] max-w-2xl leading-relaxed">
            Upload dedicated vertical videos (up to 60 seconds) demonstrating how your homemade recipes and handcrafted creations are made. Attach your product so customers can shop directly from your video!
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FF6B35] hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:scale-102 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Short</span>
        </button>
      </div>

      {/* Creator Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Published Shorts</span>
            <span className="text-2xl font-black text-[var(--text)]">{shorts.length}</span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Total Views</span>
            <span className="text-2xl font-black text-[var(--text)]">{totalViews}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Customer Likes</span>
            <span className="text-2xl font-black text-[var(--text)]">{totalLikes}</span>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
            <Heart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Comments</span>
            <span className="text-2xl font-black text-[var(--text)]">{totalComments}</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Published Shorts Collection */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
              <span>Your Uploaded Shorts</span>
              <span className="text-xs text-[var(--muted)] font-normal">({shorts.length})</span>
            </h3>
            <p className="text-[11px] text-[var(--muted)]">Manage your published short videos and linked products</p>
          </div>

          <button
            onClick={fetchSellerData}
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loading && (
          <div className="py-20 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading your studio videos...</span>
          </div>
        )}

        {!loading && shorts.length === 0 && (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mx-auto border border-orange-500/20">
              <Film className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="font-bold text-base text-[var(--text)]">No Shorts Uploaded Yet</h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Upload a 9:16 vertical video showcasing your kitchen or craft, link it with one of your products, and reach thousands of local shoppers!
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Upload First Short
            </button>
          </div>
        )}

        {!loading && shorts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shorts.map(short => (
              <div 
                key={short.id || short._id}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-orange-500/40 transition-all"
              >
                {/* Media Preview Box */}
                <div className="relative aspect-[16/10] bg-black overflow-hidden flex items-center justify-center">
                  <video
                    src={short.videoUrl}
                    poster={short.thumbnailUrl}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

                  {/* Views Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/15">
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>{short.viewsCount} views</span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteShort(short.id || short._id)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 hover:bg-red-500 text-white transition-colors border border-white/15"
                    title="Delete Short"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Linked Product Attachment Bar */}
                  {short.product && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 p-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/15">
                      <img
                        src={short.product.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'}
                        alt={short.product.name}
                        className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white truncate">{short.product.name}</p>
                        <p className="text-[10px] text-orange-400 font-extrabold">₹{short.product.price}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Caption & Stats */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-[var(--text)] line-clamp-2 leading-relaxed font-medium">
                    {short.caption || 'No caption provided.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2.5 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-red-500 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-red-500" />
                        <span>{short.likesCount}</span>
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[var(--text-secondary)]">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{short.commentsCount}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => onPreviewShorts?.(short.id || short._id)}
                      className="text-[#FF6B35] hover:text-orange-600 font-bold flex items-center gap-1 text-xs hover:underline"
                    >
                      <span>View in Feed</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE SHORT MODAL */}
      <CreateShortModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        seller={seller}
        token={token}
        sellerProducts={products}
        onSuccess={() => {
          fetchSellerData();
        }}
        showToast={showToast}
      />
    </div>
  );
}
