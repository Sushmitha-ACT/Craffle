/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import Splash from './components/Splash';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CustomerDashboard from './pages/CustomerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import CartDrawer from './components/CartDrawer';
import CheckoutPage from './pages/CheckoutPage';
import SelfPickupPage from './pages/SelfPickupPage';
import WishlistPage from './pages/WishlistPage';
import NearbyPage from './pages/NearbyPage';
import CustomerDashboardLayout from './layouts/CustomerDashboardLayout';
import NotificationCenter from './components/NotificationCenter';
import SearchPage from './pages/SearchPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { Product, CartItem, Order } from '@shared/types';
import { AlertTriangle, Clock, X, Info } from 'lucide-react';
import ChatbotSidebar from './components/ChatbotSidebar';

// GPS helper
const CHENNAI_DEFAULT = { name: 'OMR Road, Chennai', lat: 12.8456, lon: 80.2265 };

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const hasShown = sessionStorage.getItem('splashShown');
      if (hasShown) return false;
      sessionStorage.setItem('splashShown', 'true');
      return true;
    }
    return true;
  });

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [seller, setSeller] = useState<any | null>(null);

  // Navigation
  const [currentPage, setCurrentPage] = useState('home');
  const [pageData, setPageData] = useState<any>(null);

  // Theme
  const [isDark, setIsDark] = useState(false);

  // GPS
  const [gps, setGps] = useState(CHENNAI_DEFAULT);
  const [locationPromptShown, setLocationPromptShown] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[] | null>(null);

  // Wishlist
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Notifications
  const [notificationCount, setNotificationCount] = useState(0);

  // Selected items for detail pages
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<'home' | 'nearby'>('home');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);

  // Pending seller blocker
  const [pendingSellerBlocker, setPendingSellerBlocker] = useState<{ name: string; email: string; status: 'PENDING' | 'REJECTED'; reason?: string } | null>(null);

  // Toast
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ==========================================
  // INITIALIZATION
  // ==========================================
  useEffect(() => {
    const savedToken = localStorage.getItem('craffle_token');
    const savedUser = localStorage.getItem('craffle_user');
    const savedSeller = localStorage.getItem('craffle_seller');
    const savedDark = localStorage.getItem('craffle_dark');
    const savedCart = localStorage.getItem('craffle_cart');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedSeller) setSeller(JSON.parse(savedSeller));
    }
    if (savedDark === 'true') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch {}
    }
  }, []);

  // Fetch settings from DB on login / token initialization
  useEffect(() => {
    if (token) {
      fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(settings => {
        if (settings && settings.darkMode !== undefined) {
          setIsDark(settings.darkMode);
          document.documentElement.classList.toggle('dark', settings.darkMode);
          localStorage.setItem('craffle_dark', String(settings.darkMode));
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
    }
  }, [token]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('craffle_cart', JSON.stringify(cart));
  }, [cart]);

  // Fetch products when GPS or auth changes
  useEffect(() => {
    fetchProducts();
    if (token) {
      fetchNotificationCount(true);
    }
  }, [token, gps.lat, gps.lon]);

  // Fetch wishlist only when user is fully loaded
  useEffect(() => {
    if (user && user.id && user.role === 'CUSTOMER') {
      fetchWishlist();
      fetchOrders();
    }
  }, [user?.id]);

  // Poll notifications
  useEffect(() => {
    if (!token || !user) return;
    const interval = setInterval(() => {
      fetchNotificationCount(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [token, user?.id]);

  // Request location after splash
  useEffect(() => {
    if (!showSplash && !locationPromptShown && token) {
      requestLocation();
      setLocationPromptShown(true);
    }
  }, [showSplash, token]);

  // ==========================================
  // LOCATION
  // ==========================================
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGps({
            name: 'Live GPS Location',
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4))
          });
        },
        () => setGps(CHENNAI_DEFAULT)
      );
    }
  };

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        lat: gps.lat.toString(),
        lon: gps.lon.toString(),
        maxDistance: '50'
      });
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {}
  };

  const fetchNotificationCount = async (isInitial: boolean = false) => {
    if (!user) return;
    const uid = user.id || user._id?.toString?.();
    if (!uid) return;
    try {
      const res = await fetch(`/api/notifications/unread-count/${uid}`);
      const data = await res.json();
      const newCount = data.count || 0;
      setNotificationCount(newCount);

      if (newCount > 0) {
        const listRes = await fetch(`/api/notifications/${uid}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const unreadList = listData.filter((n: any) => !n.isRead);
          if (unreadList.length > 0) {
            const latestNotif = unreadList[0];
            const latestId = latestNotif.id || latestNotif._id;
            const lastId = localStorage.getItem(`craffle_last_notif_${uid}`);

            if (isInitial) {
              localStorage.setItem(`craffle_last_notif_${uid}`, latestId);
            } else if (latestId !== lastId) {
              localStorage.setItem(`craffle_last_notif_${uid}`, latestId);
              showToast(`🔔 ${latestNotif.title}: ${latestNotif.message}`, 'info');
            }
          }
        }
      }
    } catch {}
  };

  const fetchWishlist = async () => {
    if (!user) return;
    const uid = user.id || user._id?.toString?.();
    if (!uid || uid === 'undefined') return;
    try {
      const res = await fetch(`/api/wishlist/${uid}`);
      const data = await res.json();
      if (Array.isArray(data)) setWishlistIds(new Set(data.map((p: any) => p.id)));
    } catch {}
  };

  const fetchOrders = async () => {
    if (!user) return;
    const uid = user.id || user._id?.toString?.();
    if (!uid || uid === 'undefined') return;
    try {
      const res = await fetch(`/api/orders/customer/${uid}`);
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {}
  };

  // ==========================================
  // AUTH
  // ==========================================
  const handleLoginSuccess = (newToken: string, newUser: any, newSeller: any) => {
    setToken(newToken);
    setUser(newUser);
    setSeller(newSeller);
    setPendingSellerBlocker(null);
    setCurrentPage('home');

    localStorage.setItem('craffle_token', newToken);
    localStorage.setItem('craffle_user', JSON.stringify(newUser));
    if (newSeller) {
      localStorage.setItem('craffle_seller', JSON.stringify(newSeller));
    } else {
      localStorage.removeItem('craffle_seller');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSeller(null);
    setCart([]);
    setWishlistIds(new Set());
    setPendingSellerBlocker(null);
    setCurrentPage('home');
    setSelectedProduct(null);
    setSelectedOrder(null);

    localStorage.removeItem('craffle_token');
    localStorage.removeItem('craffle_user');
    localStorage.removeItem('craffle_seller');
    localStorage.removeItem('craffle_cart');
  };

  // ==========================================
  // DARK MODE
  // ==========================================
  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('craffle_dark', String(next));

      if (token) {
        fetch('/api/settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ darkMode: next })
        }).catch(err => console.error('Failed to save dark mode setting:', err));
      }

      return next;
    });
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data || null);
    setSelectedProduct(null);
    setSelectedOrder(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') fetchProducts();
    if (page === 'orders') fetchOrders();
  };

  // ==========================================
  // CART
  // ==========================================
  const addToCart = (product: Product, quantity: number = 1, fulfillmentMethod: 'DELIVERY' | 'SELF_PICKUP' = 'DELIVERY', bypassCart: boolean = false) => {
    const itemToAdd: CartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images[0],
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      stock: product.stock,
      fulfillmentMethod
    };

    if (bypassCart) {
      setCheckoutItems([itemToAdd]);
      if (fulfillmentMethod === 'SELF_PICKUP') {
        handleNavigate('self-pickup', { from: productContext });
      } else {
        handleNavigate('checkout');
      }
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.fulfillmentMethod === fulfillmentMethod);
      if (existing) {
        if (existing.quantity + quantity > product.stock) {
          showToast('Maximum stock reached', 'error');
          return prev;
        }
        return prev.map(item =>
          (item.productId === product.id && item.fulfillmentMethod === fulfillmentMethod)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, itemToAdd];
    });
    showToast(`${product.name} added to cart`, 'success');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item; // will be removed by filter
        if (newQty > item.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity + (item.productId === productId ? delta : 0) > 0 || item.productId !== productId));

    // Actually remove if quantity becomes 0
    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (item && item.quantity + delta <= 0) {
        return prev.filter(i => i.productId !== productId);
      }
      return prev;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    showToast('Removed from cart', 'info');
  };

  // ==========================================
  // WISHLIST
  // ==========================================
  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    const uid = user.id || user._id?.toString?.();
    if (!uid) return;
    const isWishlisted = wishlistIds.has(productId);

    if (isWishlisted) {
      await fetch('/api/wishlist/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, productId })
      });
      setWishlistIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
      showToast('Removed from wishlist', 'info');
    } else {
      await fetch('/api/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, productId })
      });
      setWishlistIds(prev => new Set(prev).add(productId));
      showToast('Added to wishlist ❤️', 'success');
    }
  };

  // ==========================================
  // ORDERS
  // ==========================================
  const handlePlaceOrder = async (details: any) => {
    if (!user) return null;
    try {
      const itemsToCheckout = checkoutItems || cart;
      if (!itemsToCheckout.length) return null;

      // Safely extract customerId — handles both user.id and user._id formats
      const customerId = user.id || (typeof user._id === 'string' ? user._id : user._id?.toString?.());

      // Safely extract sellerId from the first item
      const rawSellerId = itemsToCheckout[0].sellerId;
      const sellerId = typeof rawSellerId === 'object' && rawSellerId !== null
        ? (rawSellerId._id || rawSellerId.id || rawSellerId)
        : rawSellerId;

      if (!customerId || !sellerId) {
        showToast('Session expired. Please log in again.', 'error');
        return null;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          sellerId,
          products: itemsToCheckout.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          fulfillmentMethod: details.fulfillmentMethod,
          address: details.address,
          phone: details.phone,
          customerLocation: { latitude: gps.lat, longitude: gps.lon },
          sellerLocation: { latitude: 0, longitude: 0 },
          distanceKm: 0,
          totalAmount: details.total,
          paymentId: 'payment_' + Math.random().toString(36).substr(2, 9),
          sourcePage: details.sourcePage,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCart([]);
        setCheckoutItems(null);
        showToast('Order placed successfully! 🎉', 'success');
        fetchProducts();
        fetchNotificationCount();
        // Build a minimal order object for tracking
        const newOrder = data.order;
        if (newOrder) {
          const trackingOrder = {
            id: newOrder._id?.toString() || newOrder.id,
            sellerName: itemsToCheckout[0].sellerName || 'Seller',
            status: newOrder.orderStatus || 'Pending',
            fulfillmentMethod: details.fulfillmentMethod,
            items: itemsToCheckout.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price })),
            total: details.total,
            address: details.address,
            phone: details.phone,
            createdAt: new Date().toISOString(),
          };
          return trackingOrder;
        }
        fetchOrders();
        return true;
      } else {
        showToast(data.error || 'Failed to place order', 'error');
      }
    } catch {
      showToast('Failed to place order', 'error');
    }
    return null;
  };


  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer' })
      });
      if (res.ok) {
        showToast('Order cancelled', 'info');
        fetchOrders();
        setSelectedOrder(null);
        fetchNotificationCount();
      }
    } catch {}
  };

  // ==========================================
  // PRODUCT DETAIL
  // ==========================================
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductContext(currentPage === 'nearby' ? 'nearby' : 'home');
    setCurrentPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // DEVELOPER BYPASS
  // ==========================================
  const handleBypassLogin = async (role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'PENDING_SELLER') => {
    handleLogout();
    let email = '', password = '';

    if (role === 'ADMIN') { email = 'admin@craffle.com'; password = 'Admin@123'; }
    else if (role === 'CUSTOMER') { email = 'sushmitha@gmail.com'; password = 'Customer@123'; }
    else if (role === 'SELLER') { email = 'amma@gmail.com'; password = 'Seller@123'; }
    else if (role === 'PENDING_SELLER') { email = 'ganesh@gmail.com'; password = 'Seller@123'; }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.sellerStatus === 'PENDING') {
          setPendingSellerBlocker({ name: 'Ganesh Homemade Pickles', email, status: 'PENDING' });
        } else if (data.sellerStatus === 'REJECTED') {
          setPendingSellerBlocker({ name: 'Seller', email, status: 'REJECTED', reason: data.reason });
        } else {
          showToast(data.error || 'Login failed', 'error');
        }
        return;
      }
      handleLoginSuccess(data.token, data.user, data.seller);
    } catch {
      showToast('Login failed', 'error');
    }
  };

  const handleResetDB = async () => {
    try {
      const res = await fetch('/api/debug/db/reset');
      if (res.ok) {
        handleLogout();
        showToast('Database reset to initial state!', 'success');
      }
    } catch {}
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  // Not logged in
  if (!token) {
    return (
      <div className="relative min-h-screen" style={{ background: 'var(--bg)' }}>
        <Auth onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto" style={{
              background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#1F2937',
              color: 'white'
            }}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // LOGGED IN - RENDER PAGES
  // ==========================================
  const renderPage = () => {
    // Seller dashboard
    if (user.role === 'SELLER' && seller) {
      if (currentPage === 'product-detail' && selectedProduct) {
        return (
          <ProductDetailPage
            product={selectedProduct}
            onBack={() => handleNavigate('home')}
            onAddToCart={addToCart}
            user={user}
            gps={gps}
            context={productContext}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
          />
        );
      }
      return <SellerDashboard user={user} seller={seller} token={token!} onLogout={handleLogout} onViewProduct={handleViewProduct} />;
    }

    // Admin dashboard
    if (user.role === 'ADMIN') {
      return <AdminDashboard user={user} token={token!} onLogout={handleLogout} />;
    }

    // Customer pages
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            user={user}
            products={products}
            onNavigate={handleNavigate}
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
          />
        );

      case 'nearby':
        return (
          <NearbyPage
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            showToast={showToast}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
          />
        );

      case 'discover':
        return (
          <CustomerDashboard
            user={user}
            token={token!}
            onLogout={handleLogout}
            initialCategory={pageData?.category}
            gps={gps}
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
          />
        );

      case 'search':
        return (
          <SearchPage
            user={user}
            initialQuery={pageData?.query}
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
            gps={gps}
          />
        );

      case 'categories':
        return (
          <SearchPage
            user={user}
            initialQuery=""
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            wishlistIds={wishlistIds}
            gps={gps}
          />
        );

      case 'wishlist':
        return (
          <WishlistPage
            userId={user.id || user._id?.toString?.()}
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
          />
        );

      case 'notifications':
        return (
          <NotificationCenter userId={user.id || user._id?.toString?.()} onNavigate={handleNavigate} />
        );

      case 'orders':
        return (
          <OrdersPage 
            orders={orders} 
            onSelectOrder={(order) => { setSelectedOrder(order); setCurrentPage('order-tracking'); }} 
          />
        );

      case 'profile':
        return (
          <ProfilePage 
            user={user} 
            token={token} 
            showToast={showToast}
            onUserUpdate={(updatedUser: any) => {
              setUser(updatedUser);
              localStorage.setItem('craffle_user', JSON.stringify(updatedUser));
            }} 
          />
        );

      case 'settings':
        return (
          <SettingsPage 
            user={user} 
            token={token} 
            showToast={showToast}
            onLogout={handleLogout} 
            isDark={isDark}
            toggleDark={toggleDark}
          />
        );

      case 'order-tracking':
        if (selectedOrder) {
          return (
            <OrderTrackingPage
              order={selectedOrder}
              onBack={() => handleNavigate('orders')}
              onCancelOrder={handleCancelOrder}
            />
          );
        }
        return null;

      case 'product-detail':
        if (selectedProduct) {
          return (
            <ProductDetailPage
              product={selectedProduct}
              onBack={() => handleNavigate(productContext)}
              onAddToCart={addToCart}
              user={user}
              gps={gps}
              context={productContext}
              onToggleWishlist={toggleWishlist}
              wishlistIds={wishlistIds}
            />
          );
        }
        return null;

      case 'checkout':
        return (
          <CheckoutPage
            items={checkoutItems || cart}
            user={user}
            gps={gps}
            onPlaceOrder={(details) => {
              handlePlaceOrder(details);
              if (checkoutItems) setCheckoutItems(null);
            }}
            onBack={() => {
              if (checkoutItems) setCheckoutItems(null);
              handleNavigate('home');
            }}
          />
        );

      case 'self-pickup':
        return (
          <SelfPickupPage
            items={checkoutItems || cart}
            user={user}
            gps={gps}
            onPlaceOrder={async (details) => {
              const result = await handlePlaceOrder({
                ...details,
                sourcePage: pageData?.from || 'home'
              });
              if (result) {
                if (typeof result === 'object' && result.id) {
                  // Navigate directly to order tracking with the new order
                  setSelectedOrder(result as any);
                  handleNavigate('order-tracking');
                } else {
                  await fetchOrders();
                  handleNavigate('orders');
                }
              }
            }}
            onBack={() => {
              if (checkoutItems) setCheckoutItems(null);
              handleNavigate('home');
            }}
          />
        );

      default:
        return (
          <HomePage
            user={user}
            products={products}
            onNavigate={handleNavigate}
            onViewProduct={handleViewProduct}
            onAddToCart={addToCart}
          />
        );
    }
  };

  // Show dashboard-only views for SELLER and ADMIN (no navbar/footer since they have their own)
  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    return (
      <div className="relative min-h-screen" style={{ background: 'var(--bg)' }}>
        {renderPage()}


        {/* Pending seller blocker */}
        {pendingSellerBlocker && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center space-y-4" style={{ background: 'var(--panel)' }}>
              <div className="w-16 h-16 bg-orange-100 text-[#FF6B35] rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest block">
                Status: {pendingSellerBlocker.status}
              </span>
              <h3 className="font-extrabold text-xl" style={{ color: 'var(--text)' }}>{pendingSellerBlocker.name}</h3>
              {pendingSellerBlocker.status === 'PENDING' ? (
                <div className="p-3 rounded-xl text-xs text-left" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <Info className="w-4 h-4 inline mr-1" /> Your seller application is being reviewed by our admin team.
                </div>
              ) : (
                <div className="p-3 rounded-xl text-xs text-left" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                  <AlertTriangle className="w-4 h-4 inline mr-1" /> Rejected: <strong>{pendingSellerBlocker.reason}</strong>
                </div>
              )}
              <button onClick={() => setPendingSellerBlocker(null)} className="btn-secondary w-full text-xs">Close</button>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast" style={{
              background: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : 'var(--text)',
              color: 'white'
            }}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CUSTOMER layout with new 3-column Dashboard
  return (
    <CustomerDashboardLayout
      user={user}
      cart={cart}
      wishlistIds={wishlistIds}
      notificationCount={notificationCount}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      isCartOpen={isCartOpen}
      setIsCartOpen={setIsCartOpen}
      updateCartQuantity={updateCartQuantity}
      removeFromCart={removeFromCart}
      onFilterChange={(filters) => {
        // Just merge filters into pageData for the HomePage to pick up
        setPageData((prev: any) => ({ ...prev, filters }));
      }}
      topCreators={[
        { businessName: 'Sweet Home', profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', rating: 4.8, reviews: 120, distance: '1.2 km' },
        { businessName: 'Mom\'s Kitchen', profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', rating: 4.7, reviews: 98, distance: '1.5 km' },
        { businessName: 'Craft House', profileImage: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150', rating: 4.9, reviews: 60, distance: '2.1 km' },
        { businessName: 'Natural Touch', profileImage: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150', rating: 4.6, reviews: 87, distance: '1.8 km' }
      ]}
    >
      {renderPage()}
      
      {/* Chatbot Sidebar */}
      {user && user.role === 'CUSTOMER' && <ChatbotSidebar />}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#1F2937',
            color: 'white'
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </CustomerDashboardLayout>
  );
}
