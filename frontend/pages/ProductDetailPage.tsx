import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Star, Heart, ShoppingBag, ShoppingCart,
  MapPin, Clock, Truck, ShieldCheck, Package, ChevronRight,
  Minus, Plus, Share2, Zap, Flame, Store, Info, AlertCircle, Check
} from 'lucide-react';
import { Product, Review } from '@shared/types';
import ProductCard from '../components/ProductCard';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number, fulfillmentMethod: 'DELIVERY' | 'SELF_PICKUP', bypassCart: boolean) => void;
  user: any;
  gps: { lat: number; lon: number; name: string };
  context?: 'home' | 'nearby';
  onViewProduct?: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
  wishlistIds?: Set<string>;
}

export default function ProductDetailPage({ 
  product, onBack, onAddToCart, user, gps, context = 'home', onViewProduct,
  onToggleWishlist, wishlistIds = new Set()
}: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentChoice, setFulfillmentChoice] = useState<'delivery' | 'pickup' | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [seller, setSeller] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  const [localDistance, setLocalDistance] = useState<number | undefined>(product.distance);
  const [localDeliveryEstimate, setLocalDeliveryEstimate] = useState<string | undefined>(product.deliveryEstimate);
  const [isLocating, setIsLocating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  // Sync state if product prop changes externally
  useEffect(() => {
    setLocalDistance(product.distance);
    setLocalDeliveryEstimate(product.deliveryEstimate);
  }, [product.distance, product.deliveryEstimate]);

  const maxDistanceLimit = context === 'nearby' ? 999999 : 10;

  // Auto-select fulfillment choice when distance becomes available
  useEffect(() => {
    if (localDistance !== undefined && !fulfillmentChoice) {
      if (localDistance > maxDistanceLimit) {
        if (product.deliveryAvailable && localDeliveryEstimate !== 'Not Deliverable') {
          setFulfillmentChoice('delivery');
        }
      } else {
        if (product.deliveryAvailable && localDeliveryEstimate !== 'Not Deliverable') {
          setFulfillmentChoice('delivery');
        } else if (product.pickupAvailable) {
          setFulfillmentChoice('pickup');
        }
      }
    }
  }, [localDistance, localDeliveryEstimate, product.deliveryAvailable, product.pickupAvailable, fulfillmentChoice, maxDistanceLimit]);

  useEffect(() => {
    fetchProductDetails();
    window.scrollTo(0, 0);
  }, [product.id]);

  const fetchProductDetails = async () => {
    const userLon = gps.lon || (gps as any).lng || 80.2265;
    try {
      const res = await fetch(`/api/products/${product.id}?lat=${gps.lat}&lng=${userLon}&lon=${userLon}`);
      const data = await res.json();
      if (data.seller) setSeller(data.seller);
      if (data.reviews) setReviews(data.reviews);
      if (data.distance !== undefined) setLocalDistance(data.distance);
      if (data.deliveryEstimate) setLocalDeliveryEstimate(data.deliveryEstimate);
    } catch {}

    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(product.category)}&lat=${gps.lat}&lon=${userLon}&lng=${userLon}&maxDistance=50`);
      const data = await res.json();
      setRelatedProducts(data.filter((p: Product) => p.id !== product.id).slice(0, 4));
    } catch {}
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    
    const fetchWithCoords = (lat: number, lon: number) => {
      fetch(`/api/products/${product.id}?lat=${lat}&lng=${lon}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
          if (data.seller) setSeller(data.seller);
          setLocalDistance(data.distance);
          setLocalDeliveryEstimate(data.deliveryEstimate);
          setIsLocating(false);
        })
        .catch(() => setIsLocating(false));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWithCoords(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          console.warn("Geolocation failed", err);
          if (err.code === err.PERMISSION_DENIED) {
            alert("Location access was denied. Please enable it in your browser settings to check delivery options.");
          } else {
            alert("Failed to get location. Please try again.");
          }
          setIsLocating(false);
        },
        { timeout: 5000 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to submit a review.");
      return;
    }
    
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerId: user.id || user._id,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      
      const data = await res.json();
      if (res.ok && data.review) {
        setReviews([data.review, ...reviews]);
        setShowReviewForm(false);
        setReviewComment('');
        setReviewRating(5);
        
        // Optimistically update product rating locally
        product.rating = data.newProductRating;
        product.totalReviews = data.newProductTotalReviews;
      } else {
        alert(data.error || 'Failed to submit review');
      }
    } catch (err) {
      alert('An error occurred. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isDeliverable = !localDeliveryEstimate || localDeliveryEstimate !== 'Not Deliverable';

  return (
    <div className="page-enter bg-[var(--bg-secondary)] min-h-screen pb-24 lg:pb-8 animate-fade-in w-full transition-colors duration-200">
      
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors w-fit bg-[var(--panel)] px-4 py-2 rounded-full shadow-sm border border-[var(--border)] cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to shopping
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        
        {/* TOP SECTION: IMAGE & BUY ACTIONS */}
        <div className="bg-[var(--panel)] rounded-[32px] p-6 lg:p-10 shadow-sm border border-[var(--border)] mb-8 transition-colors duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            
            {/* LEFT: Images */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square bg-[var(--bg-secondary)] rounded-3xl overflow-hidden border border-[var(--border)]">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[selectedImage] || product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
                    <span className="font-semibold text-lg">Image unavailable</span>
                  </div>
                )}
                {product.distance !== undefined && (
                  <div className="absolute top-4 left-4 bg-[var(--panel)]/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-[var(--text)] shadow-sm flex items-center gap-1.5 border border-[var(--border)]">
                    <Flame className="w-3.5 h-3.5 text-[#FF6B35]" />
                    {product.distance} KM Away
                  </div>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedImage === i ? 'border-[#FF6B35]' : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {product.videoUrl ? (
                <div className="mt-4">
                  <h4 className="text-sm font-extrabold text-gray-900 mb-2">Product Video</h4>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black">
                    <video controls src={product.videoUrl} className="w-full h-auto max-h-[300px]" />
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <span className="text-sm text-gray-500 font-medium">No product video available</span>
                </div>
              )}
            </div>

            {/* RIGHT: Details & Buy Actions */}
            <div className="flex flex-col">
              <div className="text-xs font-extrabold text-[#FF6B35] uppercase tracking-wider mb-2">
                {product.category}
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-gray-900">{product.rating || 'New'}</span>
                  <span className="text-gray-500 font-medium">({product.totalReviews || reviews.length} reviews)</span>
                </div>
                <span className="hidden sm:inline text-gray-300">|</span>
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#FF6B35]" /> {product.sellerName}
                </div>
                {Boolean(product.distance) && (
                  <>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <div className="flex items-center gap-1.5 text-[#00B44B]">
                      <MapPin className="w-4 h-4" /> {product.distance} km away
                    </div>
                  </>
                )}
              </div>

              <div className="mb-6 flex items-end gap-3">
                <span className="text-4xl sm:text-5xl font-extrabold text-gray-900">₹{product.price}</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through font-semibold mb-1">₹{product.originalPrice}</span>
                )}
              </div>

              <div className="mb-8">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-bold border border-green-100">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> In stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-bold border border-red-100">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Out of stock
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                {/* Quantity */}
                <div className="flex items-center rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)] h-14 sm:w-auto w-full">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="flex-1 sm:w-14 h-full flex items-center justify-center hover:bg-[var(--border)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 h-full flex items-center justify-center text-lg font-bold bg-[var(--panel)] border-x border-[var(--border)] text-[var(--text)]">
                    {quantity}
                  </span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="flex-1 sm:w-14 h-full flex items-center justify-center hover:bg-[var(--border)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-4 flex-1 h-14">
                  <button 
                    onClick={() => { 
                    const method: 'DELIVERY' | 'SELF_PICKUP' = fulfillmentChoice === 'pickup' ? 'SELF_PICKUP' : 'DELIVERY';
                    onAddToCart(product, quantity, method, false); 
                  }}
                  disabled={product.stock === 0 || !fulfillmentChoice}
                  className="flex-1 bg-[var(--panel)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button 
                  onClick={() => { 
                    const method: 'DELIVERY' | 'SELF_PICKUP' = fulfillmentChoice === 'pickup' ? 'SELF_PICKUP' : 'DELIVERY';
                    onAddToCart(product, quantity, method, true); 
                  }}
                  disabled={product.stock === 0 || !fulfillmentChoice}
                  className="flex-1 bg-[#FF6B35] hover:bg-[#e65a2a] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-base transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center cursor-pointer"
                >
                  {fulfillmentChoice === 'pickup' ? 'Request Self Pickup' : 'Buy Now'}
                </button>
              </div>
            </div>
              
              {!isDeliverable && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700 mt-2">
                  ⚠️ This product is not deliverable to your current location.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: About this product */}
        <div className="bg-[var(--panel)] rounded-[32px] p-6 lg:p-10 shadow-sm border border-[var(--border)] mb-8 space-y-10">
          
          <div className="max-w-4xl">
            <h2 className="text-xl font-bold text-[var(--text)] mb-5">About this product</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed text-base whitespace-pre-line font-medium">
              {product.description || 'No description available for this product.'}
            </p>
          </div>

          <hr className="border-[var(--border)]" />

          {/* SECTION: Product Details */}
          <div className="max-w-4xl">
            <h2 className="text-xl font-bold text-[var(--text)] mb-5">Product details</h2>
            <ul className="space-y-4 text-[var(--text-secondary)] font-medium">
              <li className="flex items-start gap-4">
                <span className="font-semibold text-[var(--text)] w-32 shrink-0">• Category</span>
                <span>{product.category}</span>
              </li>
              {product.weight && (
                <li className="flex items-start gap-4">
                  <span className="font-semibold text-[var(--text)] w-32 shrink-0">• Weight</span>
                  <span>{product.weight}</span>
                </li>
              )}
              {product.isVeg !== undefined && (
                <li className="flex items-start gap-4">
                  <span className="font-semibold text-[var(--text)] w-32 shrink-0">• Type</span>
                  <span className="inline-flex items-center gap-1">
                    {product.isVeg ? 'Vegetarian 🟢' : 'Non-Vegetarian 🔴'}
                  </span>
                </li>
              )}
              {product.tags && product.tags.length > 0 && (
                <li className="flex items-start gap-4">
                  <span className="font-semibold text-[var(--text)] w-32 shrink-0">• Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map(t => (
                      <span key={t} className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)]">{t}</span>
                    ))}
                  </div>
                </li>
              )}
              <li className="flex items-start gap-4">
                <span className="font-semibold text-[var(--text)] w-32 shrink-0">• Made by</span>
                <span className="font-bold text-[#FF6B35]">{product.sellerName}</span>
              </li>
            </ul>
          </div>

          <hr className="border-[var(--border)]" />

          {/* SECTION: Seller & Delivery */}
          <div className="max-w-4xl">
            <h2 className="text-xl font-bold text-[var(--text)] mb-5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#FF6B35]" /> Seller & Delivery
            </h2>
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-start gap-4">
                  <img
                    src={seller?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                    alt={seller?.businessName || 'Seller shop'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-100 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-[var(--text)] leading-tight">
                        {seller?.shopName || seller?.businessName || product.sellerName || 'Homemade Kitchen'}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Check className="w-3 h-3 text-emerald-500" /> Verified Seller
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[#FF6B35] mt-1">
                      Crafted & Sold by: <span className="text-[var(--text)] font-bold">{seller?.name || product.sellerName || 'Verified Home Creator'}</span>
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted)]">
                      <div className="flex items-center gap-1 font-bold text-[var(--text)]">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        {seller?.rating || 4.9} <span className="text-[var(--muted)] font-normal">({seller?.totalReviews || 24} reviews)</span>
                      </div>
                      <span>•</span>
                      <span className="font-medium text-[var(--text-secondary)]">{seller?.city || 'Local Neighborhood Creator'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:border-l md:border-[var(--border)] md:pl-8 flex flex-col justify-center gap-6">
                {!localDistance ? (
                  <div>
                    <h4 className="text-sm font-extrabold text-[var(--muted)] uppercase tracking-wider mb-4">DELIVERY OPTIONS</h4>
                    <div className="space-y-3">
                      <p className="text-[var(--text-secondary)] font-medium text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--muted)]" /> Your location is needed to check availability
                      </p>
                      <button 
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="bg-[var(--border)] hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)] px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        {isLocating ? 'Locating...' : 'Get my location'}
                      </button>
                    </div>
                  </div>
                ) : (
                    <div>
                      <h4 className="text-sm font-extrabold text-[var(--muted)] uppercase tracking-wider mb-4">How would you like to receive it?</h4>
                      <p className="text-[var(--text)] font-bold mb-4">{localDistance} km away</p>
                      
                      <div className="space-y-3">
                        {product.deliveryAvailable && (
                          <label className={`flex items-start gap-3 p-4 rounded-xl border ${localDeliveryEstimate === 'Not Deliverable' ? 'opacity-50 cursor-not-allowed border-[var(--border)] bg-[var(--bg)]' : (fulfillmentChoice === 'delivery' ? 'border-[#FF6B35] bg-orange-500/10 cursor-pointer' : 'border-[var(--border)] hover:bg-[var(--panel)] cursor-pointer')} transition-all`}>
                            <input 
                              type="radio" 
                              name="fulfillment" 
                              checked={fulfillmentChoice === 'delivery'}
                              onChange={() => localDeliveryEstimate !== 'Not Deliverable' && setFulfillmentChoice('delivery')}
                              disabled={localDeliveryEstimate === 'Not Deliverable'}
                              className="w-4 h-4 mt-0.5 text-orange-500 border-[var(--border)] focus:ring-orange-500 disabled:opacity-50"
                            />
                            <div>
                              <span className="font-bold text-[var(--text)] flex items-center gap-2 mb-1">
                                <Truck className="w-4 h-4 text-[var(--muted)]" /> Delivery by Partner
                              </span>
                              <span className="text-xs text-[var(--text-secondary)] font-medium">Delivered to your location</span>
                              
                              {(fulfillmentChoice === 'delivery' || localDeliveryEstimate === 'Not Deliverable') && (
                                <div className="mt-3">
                                  {localDeliveryEstimate === 'Not Deliverable' ? (
                                    <div className="text-red-500 font-bold flex items-center gap-2 text-sm mt-2">
                                        <AlertCircle className="w-4 h-4" /> Delivery unavailable for your location
                                    </div>
                                  ) : (
                                    <div className="text-emerald-500 font-bold flex items-center gap-2 text-sm mt-2">
                                        ✓ Available
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        )}
                        
                        {product.pickupAvailable && (
                          <label className={`flex items-start gap-3 p-4 rounded-xl border ${localDistance > maxDistanceLimit ? 'opacity-60 cursor-not-allowed border-[var(--border)] bg-[var(--bg)]' : (fulfillmentChoice === 'pickup' ? 'border-[#FF6B35] bg-orange-500/10 cursor-pointer' : 'border-[var(--border)] hover:bg-[var(--panel)] cursor-pointer')} transition-all`}>
                            <input 
                              type="radio" 
                              name="fulfillment" 
                              checked={fulfillmentChoice === 'pickup'}
                              onChange={() => !(localDistance > maxDistanceLimit) && setFulfillmentChoice('pickup')}
                              disabled={localDistance > maxDistanceLimit}
                              className="w-4 h-4 mt-0.5 text-orange-500 border-[var(--border)] focus:ring-orange-500 disabled:opacity-50"
                            />
                            <div>
                              <span className="font-bold text-[var(--text)] flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-[var(--muted)]" /> Self Pickup
                              </span>
                              <span className="text-xs text-[var(--text-secondary)] font-medium">Pick up from the seller</span>

                              {localDistance > maxDistanceLimit ? (
                                <div className="mt-3">
                                  <div className="text-red-500 font-bold flex items-center gap-2 text-sm mt-2">
                                    <AlertCircle className="w-4 h-4" /> Too far for Self Pickup. Distance is {localDistance}km (limit is {maxDistanceLimit}km).
                                  </div>
                                </div>
                              ) : (
                                fulfillmentChoice === 'pickup' && (
                                  <div className="mt-3">
                                    <div className="space-y-3 mt-2">
                                      <p className="text-emerald-500 font-bold text-sm">✓ Pickup available</p>
                                      <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          onAddToCart(product, quantity, 'SELF_PICKUP', true);
                                        }}
                                        className="w-full bg-[#1967D2] hover:bg-[#1557b0] text-white px-3 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                      >
                                        <MapPin className="w-4 h-4" /> Proceed to Self Pickup Form
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: Customer Reviews */}
        <div className="bg-[var(--panel)] rounded-[32px] p-6 lg:p-10 shadow-sm border border-[var(--border)] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-[var(--border)] pb-6">
            <h2 className="text-2xl font-bold text-[var(--text)]">Customer Reviews</h2>
            <div className="flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-2 rounded-2xl border border-[var(--border)]">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" /> 
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-[var(--text)]">{product.rating || '0.0'}</span>
                <span className="text-[var(--text-secondary)] font-medium">/ 5</span>
              </div>
            </div>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex text-amber-400">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
              </div>
              <span className="text-xl font-bold text-[var(--text)]">{product.rating || '0.0'}</span>
              <span className="text-[var(--muted)] font-medium">{product.totalReviews || reviews.length} reviews</span>
            </div>
            {user && user.role !== 'SELLER' && (
              <button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-[#FF6B35] hover:bg-[#e65a2a] text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm whitespace-nowrap"
              >
                {showReviewForm ? 'Cancel Review' : 'Write a Review'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="mb-8 p-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
              <h3 className="font-bold text-[var(--text)] mb-4">Submit your review</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button 
                        key={star} 
                        type="button" 
                        onClick={() => setReviewRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-8 h-8 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Comment</label>
                  <textarea 
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="What did you think of this product?"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] p-3 text-sm focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="bg-[#FF6B35] hover:bg-[#e65a2a] text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">No reviews yet</h3>
              <p className="text-[var(--muted)] font-medium">Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review.id} className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--panel)] shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8B3D] flex items-center justify-center text-white font-bold text-xl">
                        {review.customerName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[var(--text)]">{review.customerName}</p>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-[var(--muted)]">
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[var(--text-secondary)] text-base leading-relaxed font-medium">"{review.comment}"</p>
                  
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-3 mt-4">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={img} alt="Review" className="w-24 h-24 object-cover rounded-xl border border-[var(--border)]" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {reviews.length > 3 && (
                <div className="text-center mt-6">
                  <button className="text-[#FF6B35] font-bold text-sm hover:underline">
                    View all reviews
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: You may also like */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-6 px-2">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedProducts.map(rp => (
                <ProductCard 
                  key={rp.id} 
                  product={rp} 
                  onView={onViewProduct || (() => { window.scrollTo({ top: 0, behavior: 'smooth' }); })} 
                  onAddToCart={(p) => onAddToCart(p, 1, 'DELIVERY', false)} 
                  onToggleWishlist={onToggleWishlist}
                  isWishlisted={wishlistIds.has(rp.id || '')}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
