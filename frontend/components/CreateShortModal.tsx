/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Film, X, UploadCloud, Video, Clock, Trash2, Play, Pause, 
  Volume2, VolumeX, ShoppingBag, Search, Check, AlertCircle, 
  ArrowRight, Sparkles, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { Product } from '@shared/types';

interface CreateShortModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: any;
  token: string;
  initialProduct?: Product | null;
  sellerProducts?: Product[];
  onSuccess: (newShort: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface SellerProductOption {
  id: string;
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  stock: number;
  status: string;
  category?: string;
  isAvailable: boolean;
}

export default function CreateShortModal({
  isOpen,
  onClose,
  seller,
  token,
  initialProduct,
  sellerProducts,
  onSuccess,
  showToast
}: CreateShortModalProps) {
  const [products, setProducts] = useState<SellerProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isPreviewMuted, setIsPreviewMuted] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Caption and tags
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');

  // Upload progress and states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Seed products immediately from sellerProducts if available
  useEffect(() => {
    if (sellerProducts && sellerProducts.length > 0) {
      const mapped = sellerProducts.map(p => ({
        id: p.id || (p as any)._id,
        _id: p.id || (p as any)._id,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        image: p.images?.[0] || '',
        images: p.images || [],
        stock: p.stock ?? 0,
        status: (p as any).status || 'Available',
        category: p.category,
        isAvailable: (p as any).status === 'Available' || (p.stock > 0 || p.stock === undefined)
      }));
      setProducts(mapped);
    }
  }, [sellerProducts]);

  // Initialize or update selected product when modal opens or initialProduct changes
  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setSelectedProductId(initialProduct.id || (initialProduct as any)._id || '');
        setIsDropdownOpen(false);
      } else {
        setIsDropdownOpen(true);
      }
      fetchSellerProducts();
    } else {
      resetForm();
    }
  }, [isOpen, initialProduct]);

  // Fetch seller's products for the picker from backend
  const fetchSellerProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/sellers/me/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingProducts(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setCaption('');
    setHashtags('');
    setProductSearchQuery('');
    setUploadProgress(0);
    setIsUploading(false);
    setIsPublishing(false);
    setErrorMessage(null);
    setIsDropdownOpen(false);
  };

  // Find the currently selected product details (safe type resolution)
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    const found = products.find(p => p.id === selectedProductId || p._id === selectedProductId);
    if (found) return found;
    if (initialProduct && (initialProduct.id === selectedProductId || (initialProduct as any)._id === selectedProductId)) {
      const initAny = initialProduct as any;
      return {
        id: initialProduct.id || initAny._id,
        _id: initialProduct.id || initAny._id,
        name: initialProduct.name,
        price: initialProduct.price,
        originalPrice: initialProduct.originalPrice,
        image: initialProduct.images?.[0] || '',
        images: initialProduct.images || [],
        stock: initialProduct.stock,
        status: initAny.status || 'Available',
        category: initialProduct.category,
        isAvailable: initAny.status === 'Available' || (initialProduct.stock > 0 || initialProduct.stock === undefined)
      } as SellerProductOption;
    }
    return null;
  }, [selectedProductId, products, initialProduct]);

  // Search filtered products with tokenized fuzzy matching
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();

      // Full substring match
      if (name.includes(q) || cat.includes(q)) return true;

      // Token-level match (e.g., 'homebased pickle' matches 'homemade pickle' because 'pickle' matches)
      return tokens.some(t => name.includes(t) || cat.includes(t));
    });
  }, [products, productSearchQuery]);

  // Video file validation (MIME, size <= 50MB, duration <= 60s)
  const handleVideoSelect = (file: File) => {
    setErrorMessage(null);
    const validFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    const isExtensionValid = file.name.match(/\.(mp4|webm|mov)$/i);

    if (!validFormats.includes(file.type) && !isExtensionValid) {
      setErrorMessage('Unsupported video format. Please upload MP4, WebM, or MOV video.');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage(`Video exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller video file.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = previewUrl;

    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration);
      setVideoDuration(duration);

      if (tempVideo.duration > 65) {
        setErrorMessage(`Video duration is ${duration}s. Maximum allowed duration for Craffle Shorts is 60 seconds.`);
        setVideoFile(null);
        setVideoPreviewUrl(null);
      } else {
        setVideoFile(file);
        setVideoPreviewUrl(previewUrl);
        setErrorMessage(null);
      }
    };

    tempVideo.onerror = () => {
      setErrorMessage('Could not load video metadata. Please ensure the video file is valid.');
    };
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoSelect(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleVideoSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Direct atomic video upload & Short publication
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId) {
      setErrorMessage('Please select and attach one of your products.');
      return;
    }

    if (!videoFile) {
      setErrorMessage('Please select a dedicated short video under 60 seconds.');
      return;
    }

    if (!caption.trim()) {
      setErrorMessage('Please enter a caption describing your short video.');
      return;
    }

    setIsPublishing(true);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('productId', selectedProductId);
    formData.append('caption', caption.trim());
    formData.append('hashtags', hashtags.trim());
    formData.append('duration', String(videoDuration));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/shorts');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsPublishing(false);
      setIsUploading(false);
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const data = JSON.parse(xhr.responseText);
          showToast(`🎉 Craffle Short published for "${selectedProduct?.name || 'product'}"!`, 'success');
          onSuccess(data.short);
          onClose();
          resetForm();
        } catch {
          setErrorMessage('Short published, but could not parse server response.');
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setErrorMessage(data.error || `Upload failed with status ${xhr.status}`);
        } catch {
          setErrorMessage(`Upload failed with status ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setIsPublishing(false);
      setIsUploading(false);
      setErrorMessage('Network error while uploading video.');
    };

    xhr.send(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div 
        className="w-full max-w-xl bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-orange-500/10 text-[#FF6B35] rounded-xl border border-orange-500/20 shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--text)]">Create Craffle Short</h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FF6B35] text-[10px] font-extrabold uppercase tracking-wider">
                  Menu Product
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)]">Upload a video showcasing your homemade creation</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-500 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePublishSubmit} className="space-y-5">
          
          {/* STEP 1: DROPDOWN & SEARCH PRODUCT SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#FF6B35]" />
                <span>1. Attach Menu Product *</span>
              </span>
              {selectedProduct ? (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Product Attached
                </span>
              ) : (
                <span className="text-[10px] text-orange-500 font-medium">
                  {products.length} menu items available
                </span>
              )}
            </label>

            {/* DROPDOWN SELECTOR HEADER / BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border transition-all text-left ${
                  isDropdownOpen 
                    ? 'border-[#FF6B35] ring-2 ring-orange-500/20' 
                    : selectedProduct 
                      ? 'border-orange-500/40 hover:border-orange-500' 
                      : 'border-[var(--border)] hover:border-orange-500/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectedProduct ? (
                    <>
                      <img
                        src={selectedProduct.image || selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=150'}
                        alt={selectedProduct.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border)] shrink-0 shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B35]">Selected</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${selectedProduct.isAvailable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                            {selectedProduct.isAvailable ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text)] truncate">{selectedProduct.name}</h4>
                        <span className="text-[11px] font-extrabold text-[#FF6B35]">₹{selectedProduct.price}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2.5 text-[var(--muted)] py-1">
                      <Layers className="w-5 h-5 text-orange-500" />
                      <span className="text-xs font-semibold text-[var(--text)]">
                        Click to select a product from your menu ({products.length} items)...
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="text-[11px] font-bold text-[#FF6B35]">
                    {isDropdownOpen ? 'Close Menu' : 'Choose / Change'}
                  </span>
                  {isDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#FF6B35]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                  )}
                </div>
              </button>

              {/* DROPDOWN / DROPUP MENU CONTENT */}
              {isDropdownOpen && (
                <div className="mt-2 border border-[var(--border)] rounded-2xl p-3 bg-[var(--panel)] shadow-2xl space-y-2.5 animate-slide-up">
                  {/* Search Bar inside Dropdown */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="text"
                      placeholder="Search by name or category (or scroll to choose)..."
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl pl-8 pr-8 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-orange-500"
                    />
                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProductSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>


                  {/* Scrollable Rich List of All Menu Products */}
                  {loadingProducts ? (
                    <p className="text-center py-4 text-xs text-[var(--muted)]">Loading your menu...</p>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-4 text-xs text-[var(--muted)] space-y-1">
                      <p>No products match "{productSearchQuery}"</p>
                      <button
                        type="button"
                        onClick={() => setProductSearchQuery('')}
                        className="text-xs text-orange-500 font-bold hover:underline"
                      >
                        Show all {products.length} products
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {filteredProducts.map(prod => {
                        const isThisSelected = selectedProductId === (prod.id || prod._id);
                        return (
                          <div
                            key={prod.id || prod._id}
                            onClick={() => {
                              setSelectedProductId(prod.id || prod._id);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isThisSelected
                                ? 'bg-orange-500/10 border-orange-500/50 shadow-sm'
                                : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-orange-500/40 hover:bg-orange-500/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=150'}
                                alt={prod.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[var(--border)]"
                              />
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-[var(--text)] truncate">{prod.name}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-[#FF6B35] font-extrabold">₹{prod.price}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${prod.isAvailable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                                    {prod.isAvailable ? 'In Stock' : 'Out of Stock'}
                                  </span>
                                  {prod.category && (
                                    <span className="text-[9px] text-[var(--muted)]">({prod.category})</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProductId(prod.id || prod._id);
                                setIsDropdownOpen(false);
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                                isThisSelected 
                                  ? 'bg-emerald-500 text-white flex items-center gap-1' 
                                  : 'bg-[#FF6B35] hover:bg-orange-600 text-white'
                              }`}
                            >
                              {isThisSelected ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select</span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Product Confirmation Card Preview */}
            {selectedProduct && !isDropdownOpen && (
              <div className="p-3 bg-orange-500/5 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={selectedProduct.image || selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=150'}
                    alt={selectedProduct.name}
                    className="w-12 h-12 rounded-xl object-cover border border-[var(--border)] shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B35] block">Attached for In-Video Shopping</span>
                    <h4 className="text-xs font-bold text-[var(--text)] truncate">{selectedProduct.name}</h4>
                    <span className="text-xs font-extrabold text-[#FF6B35]">₹{selectedProduct.price}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold shrink-0 transition-colors"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: DEDICATED SHORT VIDEO UPLOAD & PREVIEW */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Video className="w-4 h-4 text-[#FF6B35]" />
                <span>2. Upload Short Video (MP4/WebM, ≤ 60s) *</span>
              </label>
              {videoDuration > 0 && (
                <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {videoDuration}s duration
                </span>
              )}
            </div>

            {!videoPreviewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-[var(--border)] hover:border-orange-500/60 rounded-3xl p-7 text-center cursor-pointer bg-[var(--bg-secondary)] hover:bg-orange-500/5 transition-all space-y-2.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--text)]">Click or drag your Short video here</p>
                  <p className="text-[11px] text-[var(--muted)]">MP4, WebM or MOV • 9:16 vertical • Max 50MB • Under 60 seconds</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-[16/9] flex items-center justify-center border border-[var(--border)] shadow-inner">
                <video
                  ref={previewVideoRef}
                  src={videoPreviewUrl}
                  playsInline
                  loop
                  muted={isPreviewMuted}
                  autoPlay={isPreviewPlaying}
                  className="w-full h-full object-contain"
                />

                {/* Video Preview Overlay Controls */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (previewVideoRef.current) {
                          if (isPreviewPlaying) {
                            previewVideoRef.current.pause();
                          } else {
                            previewVideoRef.current.play();
                          }
                          setIsPreviewPlaying(!isPreviewPlaying);
                        }
                      }}
                      className="p-1 hover:text-orange-400 transition-colors"
                    >
                      {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPreviewMuted(!isPreviewMuted)}
                      className="p-1 hover:text-orange-400 transition-colors"
                    >
                      {isPreviewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span className="text-[10px] text-neutral-300 font-bold">{videoDuration}s / 60s max</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null);
                      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                      setVideoPreviewUrl(null);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Replace Video</span>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* STEP 3: CAPTION & TAGS */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text)]">3. Video Caption *</label>
                <span className="text-[10px] text-[var(--muted)]">{caption.length} / 300</span>
              </div>
              <textarea
                placeholder="What makes this handmade item special? (e.g. Watch the resin swirling and curing process. Every piece is completely unique!)"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={300}
                rows={2}
                required
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-3 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text)]">Tags & Hashtags</label>
              <input
                type="text"
                placeholder="handmade, artisan, craft, recipe"
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-orange-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {['handmade', 'homemade', 'artisan', 'recipe', 'craffle'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const existing = hashtags.split(/[,\s#]+/).filter(Boolean);
                      if (!existing.includes(tag)) {
                        setHashtags(prev => prev ? `${prev}, ${tag}` : tag);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-orange-500 text-[10px] font-medium text-[var(--text-secondary)] transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Uploading progress bar */}
          {isUploading && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <div className="flex justify-between text-xs font-bold text-[#FF6B35]">
                <span>Uploading Video to Server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-orange-200 dark:bg-orange-950 overflow-hidden">
                <div 
                  className="h-full bg-[#FF6B35] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              disabled={isUploading || isPublishing}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || isPublishing || !videoFile || !selectedProductId || !caption.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#FF6B35] hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
            >
              {isPublishing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Short...</span>
                </>
              ) : isUploading ? (
                <span>Uploading ({uploadProgress}%)...</span>
              ) : (
                <>
                  <span>Publish Short</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
