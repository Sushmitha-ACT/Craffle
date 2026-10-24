/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, 
  ShoppingBag, CheckCircle2, ChevronDown, ChevronUp, X, Send, 
  Trash2, Flag, AlertTriangle, ArrowLeft, RefreshCw, Sparkles, 
  ArrowUp, Sparkle, ExternalLink
} from 'lucide-react';
import { Product } from '@shared/types';

interface ShortItem {
  id: string;
  _id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  duration?: number;
  createdAt: string;
  isLiked: boolean;
  productUnavailable?: boolean;
  product: {
    id: string;
    _id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    images?: string[];
    stock: number;
    status: string;
    category?: string;
    description?: string;
    pickupAvailable?: boolean;
    deliveryAvailable?: boolean;
    rating?: number;
  } | null;
  seller: {
    id: string;
    _id: string;
    businessName: string;
    name: string;
    avatar: string;
    isVerified: boolean;
    rating?: number;
  } | null;
}

interface CommentItem {
  id: string;
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

interface ShortsFeedPageProps {
  user: any;
  token: string | null;
  onNavigate: (page: string) => void;
  onViewProduct: (product: Product) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialShortId?: string | null;
}

export default function ShortsFeedPage({
  user,
  token,
  onNavigate,
  onViewProduct,
  showToast,
  initialShortId
}: ShortsFeedPageProps) {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Comments Sheet State
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentsShort, setActiveCommentsShort] = useState<ShortItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeReportShort, setActiveReportShort] = useState<ShortItem | null>(null);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Video playback progress (for active video)
  const [videoProgress, setVideoProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Initial fetch or filter tag change
  const fetchShorts = useCallback(async (tag?: string | null) => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      let url = '/api/shorts?page=1&limit=10';
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to load Craffle Shorts feed');
      const data = await res.json();
      const loaded: ShortItem[] = data.shorts || [];
      setShorts(loaded);
      setHasMore(data.hasMore ?? false);

      // Deep linking
      if (initialShortId && loaded.length > 0) {
        const foundIdx = loaded.findIndex(s => s.id === initialShortId || s._id === initialShortId);
        if (foundIdx !== -1) {
          setCurrentIndex(foundIdx);
          setTimeout(() => {
            slideRefs.current[foundIdx]?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Could not load Shorts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, initialShortId]);

  useEffect(() => {
    fetchShorts(activeFilterTag);
  }, [fetchShorts, activeFilterTag]);

  // Infinite scroll: fetch next page
  const fetchNextPage = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      let url = `/api/shorts?page=${nextPage}&limit=10`;
      if (activeFilterTag) url += `&tag=${encodeURIComponent(activeFilterTag)}`;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const incoming: ShortItem[] = data.shorts || [];
        if (incoming.length > 0) {
          setShorts(prev => {
            const existingIds = new Set(prev.map(s => s.id || s._id));
            const unique = incoming.filter(s => !existingIds.has(s.id || s._id));
            return [...prev, ...unique];
          });
          setPage(nextPage);
        }
        setHasMore(data.hasMore ?? false);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup IntersectionObserver for continuous vertical snap scrolling
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const indexAttr = entry.target.getAttribute('data-index');
            if (indexAttr !== null) {
              const newIdx = parseInt(indexAttr, 10);
              setCurrentIndex(newIdx);
              setIsPlaying(true);
              setVideoProgress(0);

              // View counter API
              const activeShort = shorts[newIdx];
              if (activeShort) {
                fetch(`/api/shorts/${activeShort.id || activeShort._id}/view`, { method: 'POST' }).catch(() => {});
              }

              // Infinite scroll trigger near the end
              if (newIdx >= shorts.length - 2 && hasMore && !loadingMore) {
                fetchNextPage();
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.6
      }
    );

    observerRef.current = observer;

    (Object.values(slideRefs.current) as (HTMLDivElement | null)[]).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [shorts, hasMore, loadingMore]);

  // Video play/pause management based on currentIndex & isPlaying
  useEffect(() => {
    (Object.entries(videoRefs.current) as [string, HTMLVideoElement | null][]).forEach(([idxStr, videoEl]) => {
      const idx = parseInt(idxStr, 10);
      if (!videoEl) return;

      if (idx === currentIndex) {
        videoEl.muted = isMuted;
        if (isPlaying) {
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Autoplay policy fallback: mute and play
              videoEl.muted = true;
              setIsMuted(true);
              videoEl.play().catch(() => {});
            });
          }
        } else {
          videoEl.pause();
        }
      } else {
        videoEl.pause();
        videoEl.currentTime = 0;
      }
    });
  }, [currentIndex, isPlaying, isMuted, shorts]);

  // Keyboard navigation: ArrowUp, ArrowDown, Space, M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommentsOpen || isReportOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, shorts.length, isCommentsOpen, isReportOpen, isPlaying, isMuted]);

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < shorts.length) {
      slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    (Object.values(videoRefs.current) as (HTMLVideoElement | null)[]).forEach(v => {
      if (v) v.muted = newMuted;
    });
  };

  // Like / Unlike with optimistic UI
  const handleToggleLike = async (short: ShortItem) => {
    if (!user || !token) {
      showToast('Please sign in to like this Short', 'info');
      return;
    }

    const previousLiked = short.isLiked;
    const previousLikesCount = short.likesCount;
    const newLiked = !previousLiked;
    const newLikesCount = Math.max(0, previousLikesCount + (newLiked ? 1 : -1));

    // Optimistic UI update
    setShorts(prev => prev.map(s => (s.id === short.id || s._id === short.id) ? { ...s, isLiked: newLiked, likesCount: newLikesCount } : s));

    try {
      const res = await fetch(`/api/shorts/${short.id || short._id}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Like request failed');
      const data = await res.json();
      setShorts(prev => prev.map(s => (s.id === short.id || s._id === short.id) ? { ...s, isLiked: data.liked, likesCount: data.likesCount } : s));
    } catch {
      // Rollback
      setShorts(prev => prev.map(s => (s.id === short.id || s._id === short.id) ? { ...s, isLiked: previousLiked, likesCount: previousLikesCount } : s));
      showToast('Could not update like. Please try again.', 'error');
    }
  };

  // Open comments drawer
  const handleOpenComments = async (short: ShortItem) => {
    setActiveCommentsShort(short);
    setIsCommentsOpen(true);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/shorts/${short.id || short._id}/comments?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      showToast('Failed to load comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  // Submit a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      showToast('Please sign in to comment', 'info');
      return;
    }
    if (!activeCommentsShort || !newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/shorts/${activeCommentsShort.id || activeCommentsShort._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newCommentText.trim() })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to post comment');
      }
      const data = await res.json();
      setComments(prev => [data.comment, ...prev]);
      setNewCommentText('');
      setShorts(prev => prev.map(s => (s.id === activeCommentsShort.id || s._id === activeCommentsShort.id) ? { ...s, commentsCount: s.commentsCount + 1 } : s));
      showToast('Comment posted! 💬', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activeCommentsShort || !token) return;

    try {
      const res = await fetch(`/api/shorts/${activeCommentsShort.id || activeCommentsShort._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId && c._id !== commentId));
        setShorts(prev => prev.map(s => (s.id === activeCommentsShort.id || s._id === activeCommentsShort.id) ? { ...s, commentsCount: Math.max(0, s.commentsCount - 1) } : s));
        showToast('Comment deleted', 'info');
      }
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  };

  // Share Short with Web Share API or Copy Link
  const handleShare = async (short: ShortItem) => {
    const shareUrl = `${window.location.origin}/?short=${short.id || short._id}`;
    const shareTitle = `${short.product?.name || 'Craffle Short'} on Craffle`;
    const shareText = short.caption || 'Watch this awesome homemade creation on Craffle Shorts!';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        showToast('Short shared successfully! 🎉', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copied to clipboard! 📋', 'success');
    }).catch(() => {
      showToast('Could not copy link', 'error');
    });
  };

  // Report Short
  const handleOpenReport = (short: ShortItem) => {
    setActiveReportShort(short);
    setIsReportOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportShort) return;

    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/shorts/${activeReportShort.id || activeReportShort._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: reportReason, details: reportDetails })
      });
      if (res.ok) {
        showToast('Report submitted for moderation. Thank you!', 'info');
        setIsReportOpen(false);
        setReportDetails('');
        setActiveReportShort(null);
      }
    } catch {
      showToast('Could not submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Navigate to existing Product Detail Page
  const handleShopProduct = (short: ShortItem) => {
    if (!short.product) {
      showToast('Product details are currently unavailable', 'error');
      return;
    }

    if (short.productUnavailable) {
      showToast('This product is currently out of stock or unavailable', 'info');
      return;
    }

    const fullProduct: Product = {
      id: short.product.id || short.product._id,
      name: short.product.name,
      price: short.product.price,
      originalPrice: short.product.originalPrice,
      images: short.product.images?.length ? short.product.images : [short.product.image],
      stock: short.product.stock,
      category: short.product.category || 'Handcrafted',
      description: short.product.description || 'Crafted with premium quality and care.',
      sellerId: short.seller?.id || short.seller?._id || '',
      sellerName: short.seller?.businessName || short.seller?.name || 'Local Artisan',
      pickupAvailable: short.product.pickupAvailable ?? true,
      deliveryAvailable: short.product.deliveryAvailable ?? true,
      rating: short.product.rating || 4.8,
      createdAt: short.createdAt
    };

    onViewProduct(fullProduct);
  };

  return (
    <div className="relative w-full h-[calc(100vh-72px)] bg-neutral-950 text-white overflow-hidden select-none">
      
      {/* Top Floating Header for Filter & Exit */}
      <div className="absolute top-3 left-4 right-4 z-40 flex items-center justify-between max-w-[440px] mx-auto pointer-events-auto">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/10 text-xs font-semibold transition-all hover:bg-black/80 shadow-lg"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Shorts</span>
        </button>

        <div className="flex items-center gap-2">
          {activeFilterTag && (
            <button
              onClick={() => setActiveFilterTag(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF6B35] text-white text-[11px] font-bold shadow-lg"
            >
              <span>#{activeFilterTag}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-orange-400 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
            <span>Craffle Shorts</span>
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-400">
          <div className="w-12 h-12 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading Craffle Shorts Feed...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && (error || shorts.length === 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-orange-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Shorts Available</h3>
            <p className="text-xs text-neutral-400">
              {error || 'No published shorts found. Check back soon for fresh artisan videos!'}
            </p>
          </div>
          <button
            onClick={() => { setActiveFilterTag(null); fetchShorts(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-orange-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Feed</span>
          </button>
        </div>
      )}

      {/* CONTINUOUS VERTICAL SNAPPING FEED CONTAINER */}
      {!loading && shorts.length > 0 && (
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex flex-col items-center"
        >
          {shorts.map((short, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={short.id || short._id}
                ref={el => { slideRefs.current[idx] = el; }}
                data-index={idx}
                className="w-full max-w-[420px] h-full snap-start snap-always shrink-0 flex items-center justify-center p-0 md:py-2 relative"
              >
                {/* 9:16 Video Player Container */}
                <div 
                  className="relative w-full h-full max-h-[820px] bg-black rounded-none md:rounded-3xl overflow-hidden shadow-2xl border-0 md:border md:border-neutral-800 flex items-center justify-center"
                >
                  {/* Video Viewport */}
                  <div 
                    className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer" 
                    onClick={togglePlayPause}
                  >
                    <video
                      ref={el => { videoRefs.current[idx] = el; }}
                      src={short.videoUrl}
                      poster={short.thumbnailUrl}
                      loop
                      playsInline
                      muted={isMuted}
                      className="w-full h-full object-cover"
                      onTimeUpdate={(e) => {
                        if (isActive) {
                          const target = e.currentTarget;
                          if (target.duration) {
                            setVideoProgress((target.currentTime / target.duration) * 100);
                          }
                        }
                      }}
                    />

                    {/* Tap Play / Pause Indicator */}
                    {isActive && !isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] pointer-events-none transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl animate-scale-in">
                          <Play className="w-8 h-8 fill-white ml-1" />
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

                    {/* Audio Mute/Unmute Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/10 transition-transform active:scale-90"
                      title={isMuted ? 'Unmute video' : 'Mute video'}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  </div>

                  {/* Right Action Rail */}
                  <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
                    {/* Seller Profile Avatar */}
                    {short.seller && (
                      <div className="relative group mb-1">
                        <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#FF6B35] to-amber-400 shadow-lg">
                          <img
                            src={short.seller.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                            alt={short.seller.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        {short.seller.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-[#FF6B35] text-white rounded-full p-0.5 border border-black shadow">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Like Action */}
                    <button
                      onClick={() => handleToggleLike(short)}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                      title="Like this Short"
                      aria-label="Like"
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${short.isLiked ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-black/50 text-white border border-white/15 hover:bg-black/70'}`}>
                        <Heart className={`w-6 h-6 transition-transform ${short.isLiked ? 'fill-white scale-110' : 'group-hover:scale-110'}`} />
                      </div>
                      <span className="text-[11px] font-bold text-white drop-shadow">
                        {short.likesCount}
                      </span>
                    </button>

                    {/* Comment Action */}
                    <button
                      onClick={() => handleOpenComments(short)}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                      title="View Comments"
                      aria-label="Comments"
                    >
                      <div className="w-11 h-11 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white backdrop-blur-md hover:bg-black/70 transition-colors">
                        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[11px] font-bold text-white drop-shadow">
                        {short.commentsCount}
                      </span>
                    </button>

                    {/* Share Action */}
                    <button
                      onClick={() => handleShare(short)}
                      className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                      title="Share Short"
                      aria-label="Share"
                    >
                      <div className="w-11 h-11 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white backdrop-blur-md hover:bg-black/70 transition-colors">
                        <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[11px] font-bold text-white drop-shadow">
                        Share
                      </span>
                    </button>

                    {/* Report Action */}
                    <button
                      onClick={() => handleOpenReport(short)}
                      className="p-2 rounded-full bg-black/40 text-neutral-400 hover:text-white border border-white/10 text-xs backdrop-blur-md transition-colors"
                      title="Report content"
                      aria-label="Report"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Left Info & Product Call-To-Action */}
                  <div className="absolute left-3 right-16 bottom-4 z-20 space-y-3 pointer-events-auto">
                    {/* Seller Handle */}
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white drop-shadow flex items-center gap-1.5">
                        @{short.seller?.businessName || short.seller?.name || 'LocalArtisan'}
                        {short.seller?.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-[#FF6B35] fill-white inline-block" />
                        )}
                      </span>
                    </div>

                    {/* Caption & Hashtags */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-white/95 line-clamp-2 leading-relaxed drop-shadow font-medium">
                        {short.caption}
                      </p>
                      {short.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {short.hashtags.map((tag, tagIdx) => (
                            <button
                              key={tagIdx}
                              onClick={() => setActiveFilterTag(tag)}
                              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 drop-shadow hover:underline"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PROMINENT "SHOP THIS PRODUCT" CARD */}
                    {short.product && (
                      <div 
                        onClick={() => handleShopProduct(short)}
                        className="w-full bg-black/80 hover:bg-black/95 backdrop-blur-xl border border-white/20 hover:border-orange-500/50 rounded-2xl p-2.5 transition-all cursor-pointer shadow-2xl flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-neutral-800">
                            <img
                              src={short.product.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400'}
                              alt={short.product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                              {short.product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-extrabold text-[#FF6B35]">
                                ₹{short.product.price}
                              </span>
                              {short.product.originalPrice && short.product.originalPrice > short.product.price && (
                                <span className="text-[10px] text-neutral-400 line-through">
                                  ₹{short.product.originalPrice}
                                </span>
                              )}
                              {short.productUnavailable && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                                  Out of stock
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all ${short.productUnavailable ? 'bg-neutral-800 text-neutral-400' : 'bg-[#FF6B35] hover:bg-orange-600 text-white shadow-orange-500/30 group-hover:scale-105'}`}>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{short.productUnavailable ? 'Sold Out' : 'Shop Now'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar (active slide) */}
                  {isActive && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-30">
                      <div 
                        className="h-full bg-[#FF6B35] transition-all duration-100 ease-linear"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* End of Feed Banner */}
          {!hasMore && (
            <div className="w-full max-w-[420px] h-[320px] snap-start snap-always shrink-0 flex flex-col items-center justify-center p-6 text-center space-y-3 text-neutral-400">
              <div className="w-14 h-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-orange-500">
                <Sparkle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">You're All Caught Up! ✨</h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  You've watched all available artisan Craffle Shorts. Check back soon for new creator uploads!
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => scrollToIndex(0)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Back to Top</span>
                </button>
                <button
                  onClick={() => onNavigate('home')}
                  className="px-4 py-2 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                >
                  Explore Catalog
                </button>
              </div>
            </div>
          )}

          {/* Desktop Floating Next/Prev Navigator */}
          <div className="hidden xl:flex flex-col gap-2 fixed right-8 top-1/2 -translate-y-1/2 z-30">
            <button
              onClick={() => scrollToIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={`p-3 rounded-full bg-neutral-900 border border-neutral-700 text-white shadow-2xl transition-all ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#FF6B35] hover:border-[#FF6B35]'}`}
              title="Previous Short (Up Arrow)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="text-center text-[10px] font-bold text-neutral-400 bg-neutral-900/80 backdrop-blur-md px-2 py-1 rounded-full border border-neutral-800">
              {currentIndex + 1} / {shorts.length}
            </div>
            <button
              onClick={() => scrollToIndex(currentIndex + 1)}
              disabled={currentIndex === shorts.length - 1 && !hasMore}
              className={`p-3 rounded-full bg-neutral-900 border border-neutral-700 text-white shadow-2xl transition-all ${currentIndex === shorts.length - 1 && !hasMore ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#FF6B35] hover:border-[#FF6B35]'}`}
              title="Next Short (Down Arrow)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* COMMENTS BOTTOM SHEET / DRAWER */}
      {isCommentsOpen && activeCommentsShort && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCommentsOpen(false)}
        >
          <div 
            className="w-full max-w-[440px] bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-4 flex flex-col max-h-[75vh] h-[550px] shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-sm text-white">
                  Comments ({comments.length})
                </h3>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 custom-scrollbar">
              {loadingComments && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loadingComments && comments.length === 0 && (
                <div className="text-center py-12 text-neutral-500 space-y-1">
                  <p className="text-sm font-medium">No comments yet</p>
                  <p className="text-xs">Be the first to share your thoughts!</p>
                </div>
              )}

              {!loadingComments && comments.map((c) => {
                const isAuthor = user && (user.id === c.userId || user._id === c.userId);
                return (
                  <div key={c.id || c._id} className="flex items-start gap-2.5 group">
                    <img
                      src={c.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                      alt={c.userName}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-200 truncate">
                          {c.userName}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-0.5 break-words">
                        {c.text}
                      </p>
                    </div>
                    {isAuthor && (
                      <button
                        onClick={() => handleDeleteComment(c.id || c._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                placeholder={user ? "Add a kind comment..." : "Sign in to add a comment"}
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                disabled={!user || submittingComment}
                maxLength={500}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!user || !newCommentText.trim() || submittingComment}
                className="p-2 rounded-xl bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-40 text-white transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORT CONTENT MODAL */}
      {isReportOpen && activeReportShort && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setIsReportOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Flag className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Report Video</h3>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Help us keep Craffle safe and authentic. Please select the primary reason for your report:
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div className="space-y-1.5">
                {[
                  { id: 'inappropriate', label: 'Inappropriate or offensive content' },
                  { id: 'misleading', label: 'Misleading product demonstration' },
                  { id: 'spam', label: 'Spam, scams, or commercial abuse' },
                  { id: 'copyright', label: 'Intellectual property / Copyright issue' },
                  { id: 'other', label: 'Other concern' }
                ].map(r => (
                  <label key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 cursor-pointer text-xs text-neutral-200">
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={reportReason === r.id}
                      onChange={e => setReportReason(e.target.value)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                placeholder="Optional: Additional details for moderators..."
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-lg shadow-red-600/30"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
