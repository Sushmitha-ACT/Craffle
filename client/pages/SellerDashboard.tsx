/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Plus, Edit3, Trash2, Sparkles, CheckCircle, 
  X, Image as ImageIcon, IndianRupee, TrendingUp, Inbox, 
  BarChart2, Clock, MapPin, Phone, HelpCircle, Save, RefreshCw, Eye, Bell
} from 'lucide-react';
import { Product, Order } from '@shared/types';
import AddressAutocomplete from '../components/AddressAutocomplete';
import LocationPicker from '../components/LocationPicker';
import NotificationCenter from '../components/NotificationCenter';
import { CATEGORIES } from '@shared/constants';

interface SellerDashboardProps {
  user: any;
  seller: any;
  token: string;
  onLogout: () => void;
  onViewProduct?: (product: Product) => void;
}

export default function SellerDashboard({ user, seller, token, onLogout, onViewProduct }: SellerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'revenue' | 'profile' | 'notifications'>('products');

  // Stats States
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    revenue: 0,
    commissionDeducted: 0,
    netEarnings: 0
  });

  // Products States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form States for Add/Edit Product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState(CATEGORIES[0].name);
  const [customCategory, setCustomCategory] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodVideo, setProdVideo] = useState<string>('');
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Gemini Builder States
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState(false);

  // Orders States
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile Edit States
  const [profileName, setProfileName] = useState(seller.businessName || '');
  const [profileAddress, setProfileAddress] = useState(seller.address || '');
  const [profilePhone, setProfilePhone] = useState(seller.phone || '');
  const [profileCategory, setProfileCategory] = useState(seller.category || '');
  const [profileDescription, setProfileDescription] = useState(seller.description || '');
  const [mapLat, setMapLat] = useState<number | null>(seller.latitude ? Number(seller.latitude) : null);
  const [mapLng, setMapLng] = useState<number | null>(seller.longitude ? Number(seller.longitude) : null);
  const [isLocating, setIsLocating] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load seller stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/seller/stats/${seller.id}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load seller products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/seller/products/${seller.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load seller orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/seller/orders/${seller.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.reverse()); // Newest first
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchOrders();
  }, [seller]);

  // Poll for unread notification count
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchUnreadCount = async () => {
    const uid = user?.id || user?._id?.toString?.();
    if (!uid) return;
    try {
      const res = await fetch(`/api/notifications/count/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  };
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle local file selection -> convert to Base64 image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    let loadedImages: string[] = [];
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        loadedImages.push(reader.result as string);
        if (loadedImages.length === files.length) {
          setProdImages(prev => [...prev, ...loadedImages]);
          setUploadingMedia(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      alert("Video must be under 30MB");
      return;
    }
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProdVideo(reader.result as string);
      setUploadingMedia(false);
    };
    reader.readAsDataURL(file);
  };

  // Call Gemini API to build product description
  const handleAIGenerate = async () => {
    if (!prodName) {
      alert('Please fill in the Product Name first so the AI knows what to generate!');
      return;
    }

    setGeneratingAI(true);
    try {
      const res = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prodName, category: prodCategory })
      });

      if (res.ok) {
        const data = await res.json();
        setProdDescription(data.description);
        setAiSuccessMsg(true);
        setTimeout(() => setAiSuccessMsg(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Submit Add/Edit Product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      sellerId: seller.id,
      name: prodName,
      price: Number(prodPrice),
      category: prodCategory === 'Other' ? (customCategory.trim() || 'Other') : prodCategory,
      description: prodDescription,
      stock: Number(prodStock),
      images: prodImages,
      videoUrl: prodVideo,
      pickupAvailable,
      deliveryAvailable
    };

    if (prodImages.length < 3) {
      alert("Please upload at least 3 images of the product.");
      return;
    }

    try {
      let url = '/api/seller/products/add';
      let method = 'POST';

      if (editingProduct) {
        url = `/api/seller/products/edit/${editingProduct.id}`;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        resetProductForm();
        fetchProducts();
        fetchStats();
      } else {
        const err = await res.json();
        alert(err.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetGPS = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapLat(pos.coords.latitude);
          setMapLng(pos.coords.longitude);
          setIsLocating(false);
          alert('Location grabbed successfully!');
        },
        (err) => {
          console.warn("Geolocation failed", err);
          alert('Failed to get your location. Please check browser permissions or pick on map.');
          setIsLocating(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
      setIsLocating(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (profileAddress.length < 5) {
      alert('Please enter a valid address first.');
      return;
    }
    setIsLocating(true);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profileAddress)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        setMapLat(Number(geoData[0].lat));
        setMapLng(Number(geoData[0].lon));
        alert('Address located on map!');
      } else {
        alert('Could not find this exact address on the map. Please try a broader address or place the pin manually.');
      }
    } catch (err) {
      console.warn('Geocoding search failed', err);
      alert('Failed to search address. Please drop the pin manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    let lat = mapLat;
    let lng = mapLng;

    try {
      const res = await fetch(`/api/sellers/profile/${user.id || user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: profileName,
          address: profileAddress,
          phone: profilePhone,
          category: profileCategory,
          description: profileDescription,
          latitude: lat ? String(lat) : undefined,
          longitude: lng ? String(lng) : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Profile updated successfully!');
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error(err);
      alert('An error occurred while updating profile: ' + (err.message || String(err)));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdPrice(product.price.toString());
    
    const isStandardCategory = CATEGORIES.some(c => c.name === product.category);
    if (isStandardCategory) {
      setProdCategory(product.category);
      setCustomCategory('');
    } else {
      setProdCategory('Other');
      setCustomCategory(product.category);
    }
    
    setProdDescription(product.description);
    setProdStock(product.stock.toString());
    setProdImages(product.images || []);
    setProdVideo((product as any).videoUrl || '');
    setPickupAvailable((product as any).pickupAvailable ?? true);
    setDeliveryAvailable((product as any).deliveryAvailable ?? true);
    setIsProductModalOpen(true);
  };

  // Toggle Stock Status (In Stock vs Out of Stock)
  const handleToggleStatus = async (productId: string, newStatus: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const payload: any = { status: newStatus };
    if (newStatus === 'Available') {
      payload.stock = product.stock > 0 ? product.stock : 10;
    } else {
      payload.stock = 0;
    }

    try {
      const res = await fetch(`/api/seller/products/edit/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homemade creation?')) return;

    try {
      const res = await fetch(`/api/seller/products/delete/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchProducts();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update order workflow status
  const handleUpdateOrderStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });

      if (res.ok) {
        fetchOrders();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetProductForm = () => {
    setProdName('');
    setProdPrice('');
    setProdCategory(CATEGORIES[0].name);
    setCustomCategory('');
    setProdDescription('');
    setProdStock('');
    setProdImages([]);
    setProdVideo('');
    setPickupAvailable(true);
    setDeliveryAvailable(true);
    setEditingProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans pb-16">
      {/* Seller Header Navbar */}
      <header className="bg-white border-b border-[#EDE9E3] sticky top-0 z-30 shadow-sm text-[#3D3A35]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF6B35] rounded-xl text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-serif flex items-center gap-1 text-[#3D3A35]">
                Craffle <span className="px-1.5 py-0.5 bg-[#FF6B35] text-[9px] rounded font-mono uppercase font-extrabold tracking-widest text-white">Seller Room</span>
              </span>
              <p className="text-[10px] text-[#7C756B] font-bold">{seller.name}</p>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'products' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              My Menu
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'orders' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              Fulfill Orders
              {orders.filter(o => o.status !== 'DELIVERED').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#FF6B35] text-[9px] text-white rounded-full font-bold">
                  {orders.filter(o => o.status !== 'DELIVERED').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'revenue' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              Earnings Ledger
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'profile' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              My Profile
            </button>
            <button
              onClick={() => { setActiveTab('notifications'); setUnreadCount(0); }}
              className={`relative p-2 rounded-xl transition-colors ${activeTab === 'notifications' ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={onLogout}
              className="px-3 py-1 border border-[#EDE9E3] hover:bg-[#FAF9F7] text-[#7C756B] hover:text-[#3D3A35] font-bold text-xs rounded-lg transition-colors"
            >
              Exit
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* TOP STATUS OVERVIEW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Total Sales Revenue</span>
              <h3 className="text-2xl font-extrabold text-[#3D3A35]">₹{stats.revenue}</h3>
              <p className="text-[10px] text-[#9A948A]">From successful deliveries</p>
            </div>
            <div className="p-3 bg-[#F0F7F0] rounded-xl text-[#4A7C4A]">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Platform Commission (10%)</span>
              <h3 className="text-2xl font-extrabold text-[#3D3A35]">₹{stats.commissionDeducted}</h3>
              <p className="text-[10px] text-[#9A948A]">Reinvested into marketing</p>
            </div>
            <div className="p-3 bg-[#FAF9F7] rounded-xl text-[#7C756B]">
              <BarChart2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Net Home-Cook Earnings</span>
              <h3 className="text-2xl font-extrabold text-[#FF6B35]">₹{stats.netEarnings}</h3>
              <p className="text-[10px] text-[#9A948A]">Transferred to bank directly</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-[#FF6B35]">
              <TrendingUp className="w-6 h-6 animate-bounce" />
            </div>
          </div>
        </div>

        {/* TAB 1: PRODUCTS / MENU MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Your Menu Offerings</h3>
              <button 
                onClick={() => { resetProductForm(); setIsProductModalOpen(true); }}
                className="px-4 py-2 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Homemade Item
              </button>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-12 border border-slate-100 text-center rounded-xl space-y-2">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">You haven't listed any homemade items yet</p>
                <p className="text-xs text-slate-400">Click the button above to add your recipes, sweets, or organic pickles!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-40 bg-slate-100 relative">
                        <img 
                          src={product.images[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'} 
                          alt={product.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded text-[10px] font-bold uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>
                      <div className="p-4 space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{product.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center pt-2 text-xs font-semibold">
                          <span className="text-orange-600 font-extrabold">Price: ₹{product.price}</span>
                          <select
                            value={(product.status === 'Available' && product.stock > 0) ? 'Available' : 'Out of Stock'}
                            onChange={(e) => handleToggleStatus(product.id, e.target.value)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer outline-none ${
                              product.status === 'Available' && product.stock > 0 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                : 'bg-red-50 border-red-100 text-red-600'
                            }`}
                          >
                            <option value="Available">In Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-50 flex items-center justify-end gap-2 text-xs font-bold">
                      <button 
                        onClick={() => onViewProduct && onViewProduct(product)}
                        className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-all"
                        title="Preview Item"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-all"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 hover:bg-red-50 border border-red-100 rounded-lg text-red-500 hover:text-red-600 flex items-center gap-1 transition-all"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE ORDERS FULFILLMENT BOARD */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">Fulfill Active Customer Orders</h3>

            {loadingOrders ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white p-12 border border-slate-100 text-center rounded-xl space-y-2">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No customer orders received yet</p>
                <p className="text-xs text-slate-400">Share your profile with nearby customers! Incoming orders will show up here instantly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-50 text-xs">
                      <div className="space-y-0.5">
                        <strong className="text-slate-800 text-sm">Order #{order.id}</strong>
                        <p className="text-slate-400">Received {new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[9px] ${
                        order.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                        order.status === 'PREPARING' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                        order.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                      {/* Products list */}
                      <div className="space-y-2 border-r border-slate-50 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ordered Items</span>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-600">{item.name} <strong className="text-slate-800">x{item.quantity}</strong></span>
                            <span className="text-slate-800">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-100 pt-2 flex justify-between font-extrabold text-slate-800 text-sm">
                          <span>Grand Total:</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery / Contact Details</span>
                        <div className="space-y-1 text-slate-600 leading-relaxed">
                          <p className="font-bold text-slate-800 flex items-center gap-1"><strong className="text-slate-500">Name:</strong> {order.customerName}</p>
                          <p className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {order.phone}</p>
                          <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {order.address}</p>
                          <p className="px-2 py-0.5 bg-slate-100 border rounded font-bold text-slate-700 inline-block">Type: {order.pickupType}</p>
                        </div>
                      </div>
                    </div>

                    {/* Order Pipeline Action Buttons */}
                    <div className="flex justify-end items-center pt-3 border-t border-slate-50 gap-2">
                      {order.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                            className="px-4 py-1.5 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            {order.fulfillmentMethod === 'SELF_PICKUP' ? 'Approve Pickup Request' : 'Accept Order'}
                          </button>
                          {order.fulfillmentMethod === 'SELF_PICKUP' && (
                            <button 
                              onClick={() => {
                                const reason = prompt("Enter reason for rejection (e.g. Out of stock):");
                                if (reason !== null) {
                                  handleUpdateOrderStatus(order.id, 'REJECTED', reason);
                                }
                              }}
                              className="px-4 py-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-lg text-sm font-bold transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                      {order.status === 'PREPARING' && (
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'OUT_FOR_DELIVERY')}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Mark Ready / Out for Delivery
                        </button>
                      )}
                      {order.status === 'OUT_FOR_DELIVERY' && (
                        <button 
                          onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Mark Delivered Successfully
                        </button>
                      )}
                      {order.status === 'DELIVERED' && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                          <CheckCircle className="w-4 h-4" /> Delivered & Split Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DETAILED REVENUE LEDGER */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">Financial Ledger Splits</h3>

            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 text-sm">Platform Financial Matrix (90/10 Split Rule)</span>
                <span className="text-xs text-slate-400 font-semibold">Every transaction split recorded instantly on delivery</span>
              </div>

              {orders.filter(o => o.status === 'DELIVERED').length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                  No completed delivery records logged to splits database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold leading-relaxed">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="py-2.5">ORDER ID</th>
                        <th>CUSTOMER</th>
                        <th>TOTAL ORDER AMOUNT</th>
                        <th>PLATFORM COMMISSION (10%)</th>
                        <th>YOUR NET PAYOUT (90%)</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {orders.filter(o => o.status === 'DELIVERED').map((o) => {
                        const commCut = Number((o.total * 0.1).toFixed(2));
                        const sellerNet = Number((o.total * 0.9).toFixed(2));

                        return (
                          <tr key={o.id}>
                            <td className="py-3 font-bold text-slate-900">#{o.id}</td>
                            <td>{o.customerName}</td>
                            <td className="font-extrabold text-slate-900">₹{o.total}</td>
                            <td className="text-yellow-600 font-extrabold">₹{commCut}</td>
                            <td className="text-emerald-600 font-extrabold">₹{sellerNet}</td>
                            <td className="text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-[#EDE9E3] p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[#3D3A35] mb-6">Seller Profile Settings</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[13px] font-bold text-[#8C4A1D] pl-1 block mb-1">Business / Shop Name</label>
                  <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#F0E6D8] rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-[#FF6B35]" />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-[#8C4A1D] pl-1 block mb-1">Phone Number</label>
                  <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} required className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#F0E6D8] rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-[#FF6B35]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[13px] font-bold text-[#8C4A1D] pl-1 block mb-1">Business Address</label>
                  <AddressAutocomplete 
                    initialValue={profileAddress} 
                    onSelect={(newAddress, lat, lng) => {
                      setProfileAddress(newAddress);
                      setMapLat(lat);
                      setMapLng(lng);
                    }} 
                  />
                  {mapLat !== null && mapLng !== null && (
                    <LocationPicker 
                      initialLocation={{ lat: mapLat, lng: mapLng }}
                      onLocationSelect={(lat, lng) => {
                        setMapLat(lat);
                        setMapLng(lng);
                      }} 
                    />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[13px] font-bold text-[#8C4A1D] pl-1 block mb-1">Business Category</label>
                  <select 
                    value={profileCategory} 
                    onChange={e => setProfileCategory(e.target.value)} 
                    className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#F0E6D8] rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-[#FF6B35]"
                  >
                    <option value="" disabled>Select a category</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-[13px] font-bold text-[#8C4A1D] pl-1 block mb-1">Store Description</label>
                  <textarea value={profileDescription} onChange={e => setProfileDescription(e.target.value)} placeholder="Tell customers about your products..." className="w-full px-4 py-3 bg-[#FAF9F7] border border-[#F0E6D8] rounded-xl text-[14px] text-gray-800 focus:outline-none focus:border-[#FF6B35] h-24 resize-none" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-gray-700">Verified KYC Information (Locked)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500">
                  <div><span className="font-bold">Aadhaar Status:</span> {seller.aadhaarVerified ? 'Verified' : 'Pending'}</div>
                  <div><span className="font-bold">Bank Name:</span> {seller.bankName || 'N/A'}</div>
                  <div><span className="font-bold">Bank Details:</span> {seller.bankDetails || 'N/A'}</div>
                  <div><span className="font-bold">Account Name:</span> {seller.bankAccountName || 'N/A'}</div>
                </div>
                <p className="text-[10px] italic text-gray-400 mt-2">To update KYC details, please contact Craffle Support.</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#F0E6D8]">
                <button type="submit" disabled={savingProfile} className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#E65A2A] text-white font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                  {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#EDE9E3] rounded-3xl p-6 lg:p-8"
          >
            <NotificationCenter userId={user.id || user._id} onNavigate={() => {}} />
          </motion.div>
        )}
      </main>

      {/* ADD / EDIT PRODUCT MODAL OVERLAY */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[520px] font-sans text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  {editingProduct ? 'Edit Menu Item' : 'Add Homemade Item'}
                </h3>
                <button onClick={() => { setIsProductModalOpen(false); resetProductForm(); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="mt-4 space-y-4 text-xs font-semibold leading-relaxed">
                
                {/* Product Name & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Product Name</label>
                    <input 
                      type="text" required value={prodName} onChange={(e) => setProdName(e.target.value)}
                      placeholder="Eggless Choco Cake, Mysore Pak"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Product Category</label>
                    <select 
                      value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {prodCategory === 'Other' && (
                      <input 
                        type="text" 
                        required 
                        value={customCategory} 
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Type custom category..."
                        className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    )}
                  </div>
                </div>

                {/* Description AI generator builder */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-500">Product Description</label>
                    <button 
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={generatingAI}
                      className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg flex items-center gap-1 transition-all"
                    >
                      {generatingAI ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Building...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-white" />
                          AI Generate Description
                        </>
                      )}
                    </button>
                  </div>
                  
                  {aiSuccessMsg && (
                    <span className="text-[10px] text-emerald-600 block font-bold">✓ Description crafted by Gemini AI Copilot successfully!</span>
                  )}

                  <textarea 
                    required rows={3} value={prodDescription} onChange={(e) => setProdDescription(e.target.value)}
                    placeholder="Describe your ingredients, care, custom baking styles, or organic recipes..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>

                {/* Price & Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Selling Price (₹ INR)</label>
                    <input 
                      type="number" required value={prodPrice} onChange={(e) => setProdPrice(e.target.value)}
                      placeholder="₹350"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-500">Inventory Stock Count</label>
                    <input 
                      type="number" required value={prodStock} onChange={(e) => setProdStock(e.target.value)}
                      placeholder="10 items"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input 
                      type="checkbox" 
                      checked={pickupAvailable} 
                      onChange={(e) => setPickupAvailable(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-slate-600 font-bold">Local Pickup Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <input 
                      type="checkbox" 
                      checked={deliveryAvailable} 
                      onChange={(e) => setDeliveryAvailable(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-slate-600 font-bold">Delivery Partner Supported</span>
                  </label>
                </div>

                {/* Product Photos Uploader */}
                <div className="space-y-2">
                  <label className="text-slate-500 block">Product Photos (Minimum 3 required)</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {prodImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shrink-0 group">
                          <img src={img} alt={`preview ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProdImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <label htmlFor="prod-multi-file-input" className="w-20 h-20 border-2 border-dashed border-slate-300 hover:border-[#FF6B35] rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0">
                        <Plus className="w-6 h-6 text-slate-400" />
                        <input 
                          type="file" multiple accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden" id="prod-multi-file-input"
                        />
                      </label>
                    </div>
                    {uploadingMedia && <p className="text-xs text-[#FF6B35] font-bold">Processing media...</p>}
                  </div>
                </div>

                {/* Product Video Uploader */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="text-slate-500 block">Product Video (Max 5MB)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {prodVideo ? (
                        <video src={prodVideo} className="w-full h-full object-cover" controls />
                      ) : (
                        <div className="text-[9px] text-slate-400 text-center">No Video</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input 
                        type="file" accept="video/mp4,video/webm"
                        onChange={handleVideoUpload}
                        className="hidden" id="prod-video-input"
                      />
                      <label htmlFor="prod-video-input" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer inline-block">
                        {prodVideo ? 'Replace Video' : 'Upload Video'}
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setProdVideo('')} 
                        className={`ml-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold ${!prodVideo && 'hidden'}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 font-bold text-xs">
                  <button 
                    type="button" onClick={() => { setIsProductModalOpen(false); resetProductForm(); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl shadow"
                  >
                    Save Menu Listing
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
