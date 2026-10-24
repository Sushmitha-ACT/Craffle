import React from 'react';
import { Home, MapPin, Grid, Package, Heart, Settings, User, Menu, Headphones, Film, Gift } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function CustomerSidebar({ currentPage, onNavigate, onLogout, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'nearby', label: 'Nearby', icon: MapPin },
    { id: 'shorts', label: 'Shorts', icon: Film, badge: 'NEW' },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'gift-detective', label: 'Gift Detective', icon: Gift, badge: 'AI 🎁' },
    { id: 'helpdesk', label: 'Help Desk', icon: Headphones },
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderNavButton = (item: { id: string; label: string; icon: any; badge?: string }) => {
    const isActive = currentPage === item.id;
    return (
      <div key={item.id} className="relative group">
        <button
          onClick={() => onNavigate(item.id)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'} py-2.5 rounded-2xl text-[15px] font-medium transition-all ${
            isActive 
              ? 'bg-orange-50 dark:bg-[var(--primary-light)] text-[#FF6B35] font-bold shadow-sm' 
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#FF6B35]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text)]'}`} />
            {!isCollapsed && (
              <span className={`transition-colors ${isActive ? 'text-[#FF6B35] font-bold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text)]'}`}>
                {item.label}
              </span>
            )}
          </div>
          {!isCollapsed && item.badge && (
            <span className="text-[11px] bg-orange-100 text-[#FF6B35] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {item.badge}
            </span>
          )}
        </button>
        
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
            {item.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-[72px]' : 'w-[230px]'} h-full bg-[var(--panel)] border-r border-[var(--border)] flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pb-6 transition-all duration-300 transition-colors duration-200`}>
      {/* Toggle Button */}
      <div className={`flex items-center h-14 ${isCollapsed ? 'justify-center' : 'justify-end pr-3'} border-b border-[var(--border)] mb-3`}>
        <button 
          onClick={onToggleCollapse} 
          className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors focus:outline-none"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 flex flex-col space-y-1.5">
        {mainNavItems.map(renderNavButton)}
        
        <div className="mt-auto pt-4 flex flex-col space-y-1.5 border-t border-[var(--border)]">
          {bottomNavItems.map(renderNavButton)}
        </div>
      </nav>
    </div>
  );
}
