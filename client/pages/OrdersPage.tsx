import React from 'react';
import { Package, ChevronRight } from 'lucide-react';

interface Order {
  id: string;
  sellerName: string;
  status: string;
  items: any[];
  createdAt: string;
  total: number;
}

interface OrdersPageProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export default function OrdersPage({ orders, onSelectOrder }: OrdersPageProps) {
  // Ensure orders is always an array
  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter transition-colors duration-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] transition-colors duration-200">My Orders</h1>
          <p className="text-sm text-[var(--text-secondary)] font-medium transition-colors duration-200">Track and manage your recent purchases</p>
        </div>
      </div>

      {safeOrders.length === 0 ? (
        <div className="bg-[var(--panel)] rounded-3xl p-12 text-center border border-[var(--border)] shadow-sm flex flex-col items-center justify-center min-h-[300px] transition-colors duration-200">
          <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-[var(--muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text)] mb-2 transition-colors duration-200">No orders yet</h3>
          <p className="text-[var(--text-secondary)] transition-colors duration-200">Looks like you haven't made your first purchase.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeOrders.map((order, idx) => {
            const statusText = order?.status || 'Pending';
            const statusUpper = statusText.toUpperCase();
            const items = Array.isArray(order?.items) ? order.items : [];
            const orderId = order?.id || `order-${idx}`;
            const createdAt = order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            return (
              <button
                key={orderId}
                onClick={() => onSelectOrder(order)}
                className="w-full bg-[var(--panel)] border border-[var(--border)] hover:border-orange-200 hover:shadow-md transition-all rounded-2xl p-5 text-left group flex flex-col sm:flex-row gap-5 transition-colors duration-200"
              >
                {/* Left: Order details */}
                <div className="flex-1">
                  {/* Row 1: Order ID + Status badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] uppercase tracking-wider transition-colors duration-200">
                      <span>Order #{orderId.slice(-6)}</span>
                      <span>•</span>
                      <span>{createdAt}</span>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                      statusUpper === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      statusUpper === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {statusText.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Row 2: Seller name */}
                  <h3 className="text-lg font-bold text-[var(--text)] mb-1 transition-colors duration-200">
                    {order?.sellerName || 'Unknown Seller'}
                  </h3>

                  {/* Row 3: Items summary */}
                  <p className="text-sm text-[var(--text-secondary)] font-medium line-clamp-1 mb-4 transition-colors duration-200">
                    {items.length > 0
                      ? items.map(i => `${i?.quantity ?? 1}x ${i?.name ?? 'Item'}`).join(', ')
                      : 'No items'}
                  </p>

                  {/* Row 4: Total */}
                  <div className="font-extrabold text-[var(--text)] text-lg transition-colors duration-200">
                    ₹{order?.total ?? 0}
                  </div>
                </div>

                {/* Right: Chevron arrow */}
                <div className="flex items-center justify-end sm:border-l sm:border-[var(--border)] sm:pl-5">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] group-hover:bg-orange-50 group-hover:text-orange-600 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-orange-600" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
