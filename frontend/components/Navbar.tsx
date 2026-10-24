import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Search, Heart, Bell, ChevronDown, User, LogOut, Sun, Moon, Settings, Film, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import CameraSearchButton from './visualSearch/CameraSearchButton';

interface NavbarProps {
  user: any;
  cartCount: number;
  notificationCount: number;
  onNavigate: (page: string) => void;
  onOpenCart: () => void;
  onLogout: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenVisualSearch?: () => void;
}

export default function Navbar({
  user,
  cartCount,
  notificationCount,
  onNavigate,
  onOpenCart,
  onLogout,
  onToggleMobileSidebar,
  onOpenVisualSearch
}: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();
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
      <div className="flex items-center gap-3.5 md:gap-5 min-w-max">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--bg-secondary)]"
            title="Menu"
          >
            <span className="text-xl">☰</span>
          </button>
        )}
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#FF6B35] rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-2xl font-extrabold text-[var(--text)] tracking-tight transition-colors duration-200">Craffle</span>
        </button>

        <button
          onClick={() => onNavigate('shorts')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-[#FF6B35] font-bold text-xs border border-orange-500/25 transition-all hover:scale-102 shadow-sm cursor-pointer"
          title="Watch Craffle Shorts"
        >
          <Film className="w-4 h-4" />
          <span className="hidden sm:inline">Shorts</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
        </button>

        <button
          onClick={() => onNavigate('gift-detective')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-slate-900 dark:text-white font-bold text-xs border border-orange-500/30 transition-all hover:scale-102 shadow-sm cursor-pointer"
          title="Craffle AI Gift Detective"
        >
          <Gift className="w-4 h-4 text-[#FF6B35]" />
          <span className="hidden md:inline">Gift Detective</span>
          <span className="text-[10px] bg-[#FF6B35] text-white px-1.5 py-0.2 rounded-full font-black">AI</span>
        </button>
      </div>

      {/* Center: Search Bar (Spec: expanded desktop width, 15px input) */}
      <div className="flex-1 flex justify-center max-w-3xl px-4 lg:px-8">
        <div className="w-full flex items-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full overflow-hidden focus-within:border-[#FF6B35] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all h-11 transition-colors duration-200 shadow-sm">
          <div className="pl-4 text-[var(--muted)]">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search homemade cakes, pickles, snacks, handmade crafts near you..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none px-3.5 text-[15px] text-[var(--text)] placeholder-[var(--muted)]"
          />
          {onOpenVisualSearch && (
            <div className="mr-2">
              <CameraSearchButton onClick={onOpenVisualSearch} />
            </div>
          )}
          <button 
            onClick={() => {
              if (searchQuery.trim()) {
                onNavigate('search');
              }
            }}
            className="bg-[#FF6B35] hover:bg-orange-600 text-white px-6 h-full text-[15px] font-bold transition-colors shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-5 lg:gap-6 min-w-max ml-auto">
        <div className="hidden md:flex items-center gap-5 lg:gap-6">
          <button onClick={onOpenCart} className="flex flex-col items-center gap-1 group relative">
            <ShoppingBag className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4.5 h-4.5 bg-[#FF6B35] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--panel)]">
                {cartCount}
              </span>
            )}
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Orders</span>
          </button>

          <button onClick={() => onNavigate('wishlist')} className="flex flex-col items-center gap-1 group">
            <Heart className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Wishlist</span>
          </button>

          <button onClick={() => onNavigate('notifications')} className="flex flex-col items-center gap-1 group relative">
            <Bell className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[#FF6B35] transition-colors" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--panel)]">
                {notificationCount}
              </span>
            )}
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] group-hover:text-[#FF6B35]">Notifications</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center gap-1 group cursor-pointer text-[var(--text-secondary)] hover:text-[#FF6B35] transition-colors"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-500 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
            )}
            <span className="text-[12px] font-semibold text-[var(--text-secondary)] group-hover:text-[#FF6B35]">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-4 border-l border-[var(--border)] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border)]">
              <img 
                src={user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=FF6B35&color=fff`} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=FF6B35&color=fff`;
                }}
              />
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
                className="absolute right-0 mt-3 w-52 bg-[var(--panel)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden py-1 z-50"
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
                <button onClick={() => { setUserMenuOpen(false); onNavigate('settings'); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[var(--muted)]" /> Settings
                </button>
                <button onClick={() => { toggleTheme(); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--bg-secondary)] flex items-center justify-between border-t border-[var(--border)]">
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[var(--muted)]" />}
                    Theme
                  </span>
                  <span className="text-xs font-bold text-[#FF6B35] uppercase">{isDark ? 'Dark' : 'Light'}</span>
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
