import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Search, Heart, Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: any;
  cartCount: number;
  notificationCount: number;
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
  onLogout: () => void;
  onToggleMobileSidebar?: () => void;
}

export default function Navbar({ user, cartCount, notificationCount, onNavigate, onOpenCart, onLogout, onToggleMobileSidebar }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-[72px] bg-[var(--panel)] border-b border-[var(--border)] z-50 flex items-center px-4 md:px-6 lg:px-8 transition-colors duration-200">
      {/* Left: Logo & Location */}
      <div className="flex items-center gap-8 w-1/4 min-w-max">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF6B35] rounded-xl flex items-center justify-center text-white shadow-sm">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold text-[var(--text)] tracking-tight transition-colors duration-200">Craffle</span>
        </button>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 flex justify-center max-w-2xl px-4">
        <div className="w-full flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full overflow-hidden focus-within:border-[#FF6B35] focus-within:ring-2 focus-within:ring-orange-100 transition-all h-10 transition-colors duration-200">
          <div className="pl-4 text-[var(--muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search homemade cakes, pickles, snacks, handmade crafts near you..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-[var(--text)] placeholder-[var(--muted)]"
          />
          <button className="bg-[#FF6B35] hover:bg-orange-600 text-white px-6 h-full text-sm font-medium transition-colors shrink-0">
            Search
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-6 w-1/4 min-w-max">
        <div className="hidden md:flex items-center gap-6">
          <button onClick={onOpenCart} className="flex flex-col items-center gap-1 group relative">
            <ShoppingBag className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B35] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
            <span className="text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Orders</span>
          </button>

          <button onClick={() => onNavigate('wishlist')} className="flex flex-col items-center gap-1 group">
            <Heart className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            <span className="text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Wishlist</span>
          </button>

          <button onClick={() => onNavigate('notifications')} className="flex flex-col items-center gap-1 group relative">
            <Bell className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                {notificationCount}
              </span>
            )}
            <span className="text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Notifications</span>
          </button>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-4 border-l border-[var(--border)]"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border)]">
              <img src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=FF6B35&color=fff`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-semibold text-[var(--text)] hidden lg:block">{user?.name?.split(' ')[0] || 'User'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] hidden lg:block" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-48 bg-[var(--panel)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden py-1"
              >
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">{user?.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setUserMenuOpen(false); onNavigate('profile'); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--muted)]" /> My Profile
                </button>
                <button onClick={() => { setUserMenuOpen(false); onNavigate('orders'); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--muted)]" /> Orders
                </button>
                <button onClick={() => { setUserMenuOpen(false); onLogout(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2 border-t border-[var(--border)]">
                  <LogOut className="w-4 h-4 text-red-500" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
