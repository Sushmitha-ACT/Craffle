/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package, Search, ArrowUpDown, ChevronRight, CheckCircle2,
  Clock, Truck, MapPin, Phone, ChefHat, Copy, Check,
  ExternalLink, XCircle, Store, ShoppingBag, CreditCard,
  AlertCircle, X, ArrowRight
} from 'lucide-react';
import { Order, OrderItem } from '@shared/types';

interface OrdersPageProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
type SortOption = 'NEWEST' | 'OLDEST' | 'AMOUNT_HIGH' | 'AMOUNT_LOW';

const DELIVERY_STEPS = [
  { status: 'Confirmed', label: 'Confirmed', icon: Package, desc: 'Order received and confirmed' },
  { status: 'Preparing', label: 'Preparing', icon: ChefHat, desc: 'Creator is preparing items' },
  { status: 'Ready for Pickup', label: 'Ready', icon: Package, desc: 'Packed and ready for pickup' },
  { status: 'Delivery Partner Assigned', label: 'Partner Assigned', icon: Truck, desc: 'Partner assigned' },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: Truck, desc: 'Out for delivery' },
  { status: 'Delivered', label: 'Delivered', icon: CheckCircle2, desc: 'Delivered to you' },
];

const PICKUP_STEPS = [
  { status: 'Confirmed', label: 'Confirmed', icon: Package, desc: 'Order received and confirmed' },
  { status: 'Preparing', label: 'Preparing', icon: ChefHat, desc: 'Creator is preparing items' },
  { status: 'Ready for Pickup', label: 'Ready for Pickup', icon: MapPin, desc: 'Ready for you to collect' },
  { status: 'Picked Up', label: 'Picked Up', icon: CheckCircle2, desc: 'Picked up successfully' },
];

export default function OrdersPage({ orders, onSelectOrder }: OrdersPageProps) {
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to determine status category
  const isDelivered = (status?: string) => String(status || '').toUpperCase() === 'DELIVERED';
  const isCancelled = (status?: string) => String(status || '').toUpperCase() === 'CANCELLED';
  const isInProgress = (status?: string) => !isDelivered(status) && !isCancelled(status);

  // Real Database-Derived Metrics
  const metrics = useMemo(() => {
    let totalSpent = 0;
    let deliveredCount = 0;
    let inProgressCount = 0;
    let cancelledCount = 0;

    safeOrders.forEach(o => {
      const s = o?.status || '';
      if (isCancelled(s)) {
        cancelledCount++;
      } else {
        totalSpent += Number(o?.total || 0);
        if (isDelivered(s)) {
          deliveredCount++;
        } else {
          inProgressCount++;
        }
      }
    });

    return {
      totalOrders: safeOrders.length,
      totalSpent,
      deliveredCount,
      inProgressCount,
      cancelledCount,
    };
  }, [safeOrders]);

  // Filter & Sort Logic
  const filteredOrders = useMemo(() => {
    let list = [...safeOrders];

    // Status filter
    if (statusFilter === 'IN_PROGRESS') {
      list = list.filter(o => isInProgress(o.status));
    } else if (statusFilter === 'DELIVERED') {
      list = list.filter(o => isDelivered(o.status));
    } else if (statusFilter === 'CANCELLED') {
      list = list.filter(o => isCancelled(o.status));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => {
        const idMatch = (o.id || (o as any)._id || '').toLowerCase().includes(q);
        const sellerMatch = (o.sellerName || '').toLowerCase().includes(q);
        const itemsMatch = Array.isArray(o.items) && o.items.some(
          item => (item.name || '').toLowerCase().includes(q)
        );
        return idMatch || sellerMatch || itemsMatch;
      });
    }

    // Sort
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const totalA = Number(a.total || 0);
      const totalB = Number(b.total || 0);

      switch (sortBy) {
        case 'OLDEST':
          return dateA - dateB;
        case 'AMOUNT_HIGH':
          return totalB - totalA;
        case 'AMOUNT_LOW':
          return totalA - totalB;
        case 'NEWEST':
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [safeOrders, statusFilter, searchQuery, sortBy]);

  // Automatically keep a valid selected order
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some(o => o.id === selectedOrderId);
      if (!exists) {
        setSelectedOrderId(filteredOrders[0].id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [filteredOrders, selectedOrderId]);

  // Currently selected order
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return filteredOrders[0] || null;
    return safeOrders.find(o => o.id === selectedOrderId) || filteredOrders[0] || null;
  }, [selectedOrderId, filteredOrders, safeOrders]);

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = String(status || 'Pending').toUpperCase();
    if (s === 'DELIVERED') {
      return {
        label: 'Delivered',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    }
    if (s === 'CANCELLED') {
      return {
        label: 'Cancelled',
        className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
        dot: 'bg-rose-500',
      };
    }
    if (s.includes('OUT') || s.includes('READY')) {
      return {
        label: status || 'Ready / Out for delivery',
        className: 'bg-orange-50 text-[#FF6B35] border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
        dot: 'bg-[#FF6B35] animate-pulse',
      };
    }
    return {
      label: status || 'In Progress',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      dot: 'bg-amber-500',
    };
  };

  return (
    <div className="w-full px-6 lg:px-10 py-8 page-enter transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center shrink-0 shadow-xs border border-orange-500/20">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] tracking-tight">
              My Orders
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] font-normal mt-1">
              Track real-time fulfillment, view seller details, and manage your kitchen purchases
            </p>
          </div>
        </div>

        {/* Global Orders Quick Counter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold px-4 py-2 rounded-xl bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)] shadow-xs">
            Total Orders: <strong className="text-[var(--text)]">{safeOrders.length}</strong>
          </span>
        </div>
      </div>

      {safeOrders.length === 0 ? (
        /* Empty State */
        <div className="bg-[var(--panel)] rounded-3xl p-16 text-center border border-[var(--border)] shadow-sm flex flex-col items-center justify-center min-h-[420px] transition-colors duration-200">
          <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-3xl flex items-center justify-center mb-5 border border-[var(--border)]">
            <Package className="w-10 h-10 text-[var(--muted)]" />
          </div>
          <h3 className="text-2xl font-bold text-[var(--text)] mb-2">No orders placed yet</h3>
          <p className="text-[15px] text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
            Discover passionate home chefs and handmade creators in your neighborhood to enjoy authentic home-cooked food.
          </p>
          <a
            href="#discover"
            onClick={(e) => { e.preventDefault(); window.location.hash = 'discover'; }}
            className="px-7 py-3.5 bg-[#FF6B35] hover:bg-[#e05621] text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" /> Explore Nearby Products
          </a>
        </div>
      ) : (
        /* Responsive Two-Column Layout */
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: Controls & Expanded Order Cards (58% width)   */}
          {/* ========================================================= */}
          <div className="w-full lg:col-span-7 space-y-6">

            {/* Filter, Search & Sort Bar */}
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              {/* Search Bar + Sort Dropdown */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4.5 h-4.5 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, seller, or product..."
                    className="w-full pl-10 pr-9 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)] placeholder-[var(--muted)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <ArrowUpDown className="w-4 h-4 text-[var(--muted)] shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm font-semibold text-[var(--text)] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35] cursor-pointer"
                  >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                    <option value="AMOUNT_HIGH">Highest Amount</option>
                    <option value="AMOUNT_LOW">Lowest Amount</option>
                  </select>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--border)]/60">
                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mr-1">Status:</span>
                {[
                  { key: 'ALL', label: 'All Orders', count: metrics.totalOrders },
                  { key: 'IN_PROGRESS', label: 'In Progress', count: metrics.inProgressCount },
                  { key: 'DELIVERED', label: 'Delivered', count: metrics.deliveredCount },
                  { key: 'CANCELLED', label: 'Cancelled', count: metrics.cancelledCount },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key as StatusFilter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === tab.key
                        ? 'bg-[#FF6B35] text-white shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--panel)] border border-[var(--border)]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      statusFilter === tab.key
                        ? 'bg-white/25 text-white'
                        : 'bg-[var(--panel)] text-[var(--muted)]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results feedback */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">
                Showing <strong className="text-[var(--text)]">{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'order' : 'orders'}
                {statusFilter !== 'ALL' && ` in ${statusFilter.replace('_', ' ').toLowerCase()}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
              {(statusFilter !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
                  className="text-xs font-bold text-[#FF6B35] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Order Cards List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-[var(--panel)] rounded-2xl p-12 text-center border border-[var(--border)] flex flex-col items-center justify-center">
                <AlertCircle className="w-10 h-10 text-[var(--muted)] mb-3" />
                <h4 className="text-lg font-bold text-[var(--text)] mb-1">No matching orders found</h4>
                <p className="text-sm text-[var(--text-secondary)] mb-4">Try clearing your search query or switching status filters.</p>
                <button
                  onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
                  className="px-5 py-2 text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text)] hover:bg-[var(--panel)]"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, idx) => {
                  const orderId = order.id || (order as any)._id || `order-${idx}`;
                  const isSelected = orderId === selectedOrder?.id;
                  const statusInfo = getStatusBadge(order.status);
                  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
                  const fulfillmentMethod = String(order.fulfillmentMethod || '').toUpperCase() === 'SELF_PICKUP'
                    ? 'Self Pickup'
                    : 'Home Delivery';

                  return (
                    <div
                      key={orderId}
                      onClick={() => setSelectedOrderId(orderId)}
                      className={`w-full text-left rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer border shadow-xs relative ${
                        isSelected
                          ? 'border-[#FF6B35] bg-orange-50/15 dark:bg-orange-950/20 ring-2 ring-orange-500/20'
                          : 'bg-[var(--panel)] border-[var(--border)] hover:border-orange-300 dark:hover:border-orange-800/60 hover:shadow-md'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-[#FF6B35] rounded-r-full" />
                      )}

                      {/* Header Row: ID, Date, Fulfillment & Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(orderId, e)}
                            className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--text)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg border border-[var(--border)] hover:border-orange-300 transition-colors"
                            title="Click to copy Order ID"
                          >
                            <span>#{orderId.slice(-6)}</span>
                            {copiedId === orderId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-[var(--muted)]" />
                            )}
                          </button>
                          <span className="text-xs text-[var(--muted)] font-medium">
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="text-[11px] font-semibold text-[var(--muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md border border-[var(--border)] flex items-center gap-1">
                            {fulfillmentMethod === 'Self Pickup' ? <Store className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                            {fulfillmentMethod}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 text-xs font-extrabold uppercase tracking-wider rounded-full border inline-flex items-center gap-1.5 ${statusInfo.className}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Middle: Seller & Products Row */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          {/* Seller Name */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <Store className="w-4 h-4 text-[#FF6B35] shrink-0" />
                            <h3 className="text-lg font-bold text-[var(--text)] truncate">
                              {order.sellerName || 'Craffle Creator'}
                            </h3>
                          </div>

                          {/* Items Summary line */}
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {items.length > 0
                              ? items.map(i => `${i.quantity || 1}x ${i.name || 'Item'}`).join(', ')
                              : 'Standard Order Items'}
                          </p>
                        </div>

                        {/* Product Thumbnails Gallery */}
                        {items.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {items.slice(0, 3).map((item, iIdx) => (
                              <div
                                key={iIdx}
                                className="w-12 h-12 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)] shrink-0 flex items-center justify-center shadow-2xs"
                                title={`${item.quantity || 1}x ${item.name || 'Item'}`}
                              >
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-[var(--muted)]" />
                                )}
                              </div>
                            ))}
                            {items.length > 3 && (
                              <div className="w-12 h-12 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                                +{items.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Total Amount + Action Buttons */}
                      <div className="pt-3.5 border-t border-[var(--border)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block">Order Total</span>
                          <span className="text-2xl font-black text-[#FF6B35]">
                            ₹{order.total ?? 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(orderId);
                            }}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--panel)]'
                            }`}
                          >
                            Inspect Panel
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order);
                            }}
                            className="px-4 py-2 bg-[#FF6B35] hover:bg-[#e05621] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-md"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Real Stats Overview + Tracking Panel (42%) */}
          {/* ========================================================= */}
          <div className="w-full lg:col-span-5 space-y-6 lg:sticky lg:top-[96px]">

            {/* REAL DATABASE-DERIVED METRICS (No dummy widgets) */}
            <div className="bg-[var(--panel)] rounded-3xl p-5 sm:p-6 border border-[var(--border)] shadow-sm">
              <h3 className="font-extrabold text-sm sm:text-base text-[var(--text)] tracking-wider uppercase mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4.5 h-4.5 text-[#FF6B35]" /> Purchase Overview
              </h3>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Total Purchases Value */}
                <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border)]/50">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    Total Purchases
                  </span>
                  <p className="text-2xl font-black text-[#FF6B35] mt-1">
                    ₹{metrics.totalSpent.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                    Across {metrics.totalOrders} total orders
                  </span>
                </div>

                {/* In Progress */}
                <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border)]/50">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    In Progress
                  </span>
                  <p className="text-2xl font-black text-amber-600 mt-1">
                    {metrics.inProgressCount}
                  </p>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                    Active kitchen orders
                  </span>
                </div>

                {/* Delivered Orders */}
                <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border)]/50">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    Delivered
                  </span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {metrics.deliveredCount}
                  </p>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                    Completed deliveries
                  </span>
                </div>

                {/* Cancelled */}
                <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border)]/50">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    Cancelled
                  </span>
                  <p className="text-2xl font-black text-rose-600 mt-1">
                    {metrics.cancelledCount}
                  </p>
                  <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                    Refunded / Closed
                  </span>
                </div>
              </div>
            </div>

            {/* CONTEXTUAL TRACKING & INSPECTION PANEL */}
            {selectedOrder ? (
              <div className="bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
                {/* Header: Selected Order Banner */}
                <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-[#FF6B35]">
                          Selected Order
                        </span>
                        <button
                          onClick={() => handleCopyId(selectedOrder.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--panel)] px-2 py-0.5 rounded-md border border-[var(--border)]"
                          title="Copy ID"
                        >
                          <span>#{selectedOrder.id.slice(-8)}</span>
                          {copiedId === selectedOrder.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <h4 className="text-xl font-extrabold text-[var(--text)] mt-1">
                        {selectedOrder.sellerName || 'Craffle Creator'}
                      </h4>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        Placed on {formatDateTime(selectedOrder.createdAt)}
                      </p>
                    </div>

                    {/* Status Pill */}
                    {(() => {
                      const sInfo = getStatusBadge(selectedOrder.status);
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shrink-0 flex items-center gap-1.5 ${sInfo.className}`}>
                          <span className={`w-2 h-2 rounded-full ${sInfo.dot}`} />
                          {sInfo.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Delivery Estimate: ONLY WHEN SUPPORTED BY ACTUAL BACKEND DATA */}
                  {selectedOrder.estimatedDelivery && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-100/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FF6B35] shrink-0" />
                      <span>Estimated Arrival: {formatDateTime(selectedOrder.estimatedDelivery)}</span>
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* REAL STATUS TRACKING TIMELINE */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3.5 flex items-center justify-between">
                      <span>Order Fulfillment Status</span>
                      <span className="font-semibold normal-case text-[11px] text-[var(--text-secondary)]">
                        Method: {String(selectedOrder.fulfillmentMethod || '').toUpperCase() === 'SELF_PICKUP' ? 'Self Pickup' : 'Home Delivery'}
                      </span>
                    </h5>

                    {/* Check if Cancelled */}
                    {isCancelled(selectedOrder.status) ? (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                            This order was cancelled
                          </p>
                          {selectedOrder.cancelReason && (
                            <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                              Reason: {selectedOrder.cancelReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Real Step progression derived from actual status */
                      (() => {
                        const isPickup = String(selectedOrder.fulfillmentMethod || '').toUpperCase() === 'SELF_PICKUP';
                        const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
                        const statusRaw = selectedOrder.status || 'Pending';
                        const currentIdx = steps.findIndex(
                          s => s.status.toLowerCase() === statusRaw.toLowerCase()
                        );
                        // If status is pending or not found, current is step 0 or -1
                        const activeIndex = currentIdx >= 0 ? currentIdx : 0;

                        return (
                          <div className="space-y-3.5 relative pl-2">
                            {steps.map((st, sIdx) => {
                              const isCompleted = sIdx < activeIndex || isDelivered(selectedOrder.status);
                              const isCurrent = sIdx === activeIndex && !isDelivered(selectedOrder.status);

                              return (
                                <div key={st.status} className="flex items-start gap-3 relative">
                                  {/* Connector Line */}
                                  {sIdx < steps.length - 1 && (
                                    <div
                                      className={`absolute left-[13px] top-[24px] bottom-[-14px] w-0.5 ${
                                        sIdx < activeIndex
                                          ? 'bg-emerald-500'
                                          : 'bg-[var(--border)]'
                                      }`}
                                    />
                                  )}

                                  {/* Step Circle */}
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 transition-colors ${
                                    isCompleted
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : isCurrent
                                      ? 'bg-[#FF6B35] text-white ring-4 ring-orange-500/20'
                                      : 'bg-[var(--bg-secondary)] text-[var(--muted)] border border-[var(--border)]'
                                  }`}>
                                    {isCompleted ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      <st.icon className="w-3.5 h-3.5" />
                                    )}
                                  </div>

                                  {/* Label & Description */}
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between">
                                      <p className={`text-xs font-extrabold ${
                                        isCurrent ? 'text-[#FF6B35]' : isCompleted ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                                      }`}>
                                        {st.label}
                                      </p>
                                      {isCurrent && (
                                        <span className="text-[10px] font-extrabold uppercase text-[#FF6B35] bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-md border border-orange-200">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                      {st.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* DESTINATION & CONTACT (SUPPORTED BY REAL DATABASE RECORD) */}
                  {(selectedOrder.address || selectedOrder.phone || selectedOrder.distanceKm) && (
                    <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-2.5">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        Delivery Information
                      </h5>

                      {selectedOrder.address && (
                        <div className="flex items-start gap-2.5 text-xs text-[var(--text)] leading-relaxed">
                          <MapPin className="w-4 h-4 text-[#FF6B35] shrink-0 mt-0.5" />
                          <span>{selectedOrder.address}</span>
                        </div>
                      )}

                      {selectedOrder.phone && (
                        <div className="flex items-center gap-2.5 text-xs text-[var(--text)]">
                          <Phone className="w-4 h-4 text-[#FF6B35] shrink-0" />
                          <span>Contact: {selectedOrder.phone}</span>
                        </div>
                      )}

                      {selectedOrder.distanceKm !== undefined && (
                        <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                          <Truck className="w-4 h-4 text-[var(--muted)] shrink-0" />
                          <span>Distance: {selectedOrder.distanceKm} km from creator kitchen</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ITEMS BREAKDOWN & TOTAL */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                      Order Items ({selectedOrder.items?.length || 0})
                    </h5>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {selectedOrder.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]/60 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[var(--panel)] overflow-hidden shrink-0 flex items-center justify-center border border-[var(--border)]">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-[var(--muted)]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--text)] truncate">{item.name}</p>
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                Qty: {item.quantity} × ₹{item.price}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-[var(--text)] shrink-0 ml-2">
                            ₹{(item.quantity || 1) * (item.price || 0)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--text)]">Total Paid</span>
                      <span className="text-xl font-black text-[#FF6B35]">
                        ₹{selectedOrder.total ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* ACTION: OPEN FULL DEDICATED TRACKING PAGE */}
                  <button
                    onClick={() => onSelectOrder(selectedOrder)}
                    className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#e05621] text-white font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <span>Open Live Tracking Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--panel)] rounded-3xl p-8 text-center border border-[var(--border)] text-[var(--muted)]">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Select an order on the left to inspect details</p>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
