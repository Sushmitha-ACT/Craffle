import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import CustomerSidebar from '../components/CustomerSidebar';
import CustomerRightPanel from '../components/CustomerRightPanel';
import CartDrawer from '../components/CartDrawer';
import Footer from '../components/Footer';

interface CustomerDashboardLayoutProps {
  children: React.ReactNode;
  user: any;
  cart: any[];
  wishlistIds: Set<string>;
  notificationCount: number;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  updateCartQuantity: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  onFilterChange: (filters: any) => void;
  topCreators: any[];
}

export default function CustomerDashboardLayout({
  children, user, cart, wishlistIds, notificationCount, currentPage,
  onNavigate, onLogout, isCartOpen, setIsCartOpen, updateCartQuantity, removeFromCart,
  onFilterChange, topCreators
}: CustomerDashboardLayoutProps) {
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[var(--bg)] flex flex-col font-sans transition-colors duration-200">
      <Navbar
        user={user}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        notificationCount={notificationCount}
        onNavigate={onNavigate}
        onOpenCart={() => setIsCartOpen(true)}
        onLogout={onLogout}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex flex-1">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div className={`fixed top-[72px] left-0 bottom-0 z-40 transform transition-transform duration-300 md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <CustomerSidebar 
            currentPage={currentPage}
            onNavigate={(page) => {
              onNavigate(page);
              setIsMobileSidebarOpen(false);
            }}
            onLogout={onLogout}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Main Content Area */}
        <main className={`flex-1 min-h-screen bg-[var(--bg-secondary)] overflow-x-hidden transition-all duration-300 flex flex-col pt-[72px] min-w-0 ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[250px]'} transition-colors duration-200`}>
          <div className="flex-1">
            {children}
          </div>
          <Footer onNavigate={onNavigate} />
        </main>

      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          onNavigate('checkout');
        }}
      />
    </div>
  );
}
