/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, ShieldCheck, Users, Clipboard, Star, 
  Settings, Check, X, RefreshCw, Eye, AlertCircle, 
  MessageSquare, DollarSign, ArrowRight, CornerDownRight, CheckCircle2
} from 'lucide-react';
import { User, Seller, Product, SupportTicket, Order } from '@shared/types';

interface AdminDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export default function AdminDashboard({ user, token, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'sellers' | 'users' | 'tickets' | 'ledger'>('sellers');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Stats Card
  const [stats, setStats] = useState({
    customersCount: 0,
    sellersCount: 0,
    pendingSellersCount: 0,
    productsCount: 0,
    ordersCount: 0,
    platformRevenue: 0
  });

  // Database lists
  const [users, setUsers] = useState<User[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(false);

  // Selected Detail States
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Add Admin State
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Fetch full system statistics
  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Sellers
  const fetchSellers = async () => {
    try {
      const res = await fetch('/api/admin/sellers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSellers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetchAdminStats(),
      fetchUsers(),
      fetchSellers(),
      fetchTickets(),
      fetchOrders()
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  // Handle Seller Verification Approval
  const handleApproveSeller = async (id: string) => {
    if (!confirm('Are you sure you want to approve and onboard this seller?')) return;

    try {
      const res = await fetch(`/api/admin/sellers/approve/${id}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setSelectedSeller(null);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Seller Verification Rejection
  const handleRejectSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !rejectionComment) return;

    try {
      const res = await fetch(`/api/admin/sellers/reject/${selectedSeller.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ comment: rejectionComment })
      });

      if (res.ok) {
        setSelectedSeller(null);
        setRejectionComment('');
        setShowRejectionForm(false);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle toggle user status (Verification / Ban)
  const handleToggleUserVerify = async (userId: string, isVerified: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/toggle-verify/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !isVerified })
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Add New Admin
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword
        })
      });
      if (res.ok) {
        setShowAddAdmin(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add admin');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding admin');
    }
  };

  // Handle Support Ticket Response
  const handleTicketReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReplyText) return;

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          senderId: user.id || 'admin',
          senderName: user.name || 'Craffle Head Admin',
          senderRole: 'ADMIN',
          message: adminReplyText
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setAdminReplyText('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle ticket resolution toggle
  const handleResolveTicket = async (ticketId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(data.ticket);
        }
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans pb-24 text-[var(--text)]">
      {/* Admin Navbar */}
      <header className="bg-[var(--panel)] text-[var(--text)] border-b border-[var(--border)] sticky top-0 z-30 shadow-xs">
        <div className="w-full max-w-[1680px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#FF6B35] rounded-2xl text-white shadow-sm shadow-orange-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black font-serif flex items-center gap-2 text-[var(--text)] tracking-tight">
                Craffle <span className="px-2 py-0.5 bg-[#FF6B35] text-[10px] sm:text-[11px] rounded-md font-mono font-black tracking-widest text-white uppercase">Control Panel</span>
              </span>
              <p className="text-xs text-[var(--muted)] font-semibold mt-0.5">{user.email} (Super Admin)</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setActiveTab('sellers')}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'sellers' ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
            >
              Verify Cooks ({stats.pendingSellersCount})
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'users' ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
            >
              User Registry
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'tickets' ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
            >
              Helpdesk Routing
              {tickets.filter(t => t.status === 'OPEN').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-[10px] text-white rounded-full font-black">
                  {tickets.filter(t => t.status === 'OPEN').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === 'ledger' ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
            >
              Split Ledger
            </button>
            <button 
              onClick={onLogout}
              className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] font-bold text-xs sm:text-sm rounded-xl transition-colors ml-1"
            >
              Exit
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[1680px] mx-auto px-6 lg:px-12 mt-8 space-y-8">
        
        {/* TOP METRICS GRIDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div className="bg-[var(--panel)] p-7 lg:p-8 border border-[var(--border)] rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-[var(--muted)] uppercase tracking-wider block">Verified Sellers</span>
              <h3 className="text-3xl sm:text-4xl font-black text-[var(--text)]">{stats.sellersCount}</h3>
            </div>
            <div className="p-3.5 sm:p-4 bg-[var(--bg-secondary)] rounded-2xl text-[var(--text-secondary)] border border-[var(--border)]">
              <Users className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>

          <div className="bg-[var(--panel)] p-7 lg:p-8 border border-[var(--border)] rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-[var(--muted)] uppercase tracking-wider block">Verification Pending</span>
              <h3 className="text-3xl sm:text-4xl font-black text-[#FF6B35]">{stats.pendingSellersCount}</h3>
            </div>
            <div className="p-3.5 sm:p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 animate-pulse">
              <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>

          <div className="bg-[var(--panel)] p-7 lg:p-8 border border-[var(--border)] rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-[var(--muted)] uppercase tracking-wider block">Total Items Listed</span>
              <h3 className="text-3xl sm:text-4xl font-black text-[var(--text)]">{stats.productsCount}</h3>
            </div>
            <div className="p-3.5 sm:p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20">
              <Clipboard className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>

          <div className="bg-[var(--panel)] p-7 lg:p-8 border border-[var(--border)] rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-[var(--muted)] uppercase tracking-wider block">Platform Commission Cut</span>
              <h3 className="text-3xl sm:text-4xl font-black text-[var(--text)]">₹{stats.platformRevenue}</h3>
            </div>
            <div className="p-3.5 sm:p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
        </div>

        {/* TAB 1: PENDING SELLER ONBOARDING VERIFICATION */}
        {activeTab === 'sellers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[var(--text)]">Seller Onboarding & Review</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manual administrative approval and verification pipeline</p>
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] p-1.5 rounded-2xl text-xs sm:text-sm font-semibold">
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSellerStatusFilter(tab)}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      sellerStatusFilter === tab 
                        ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm font-black' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab === 'PENDING' ? 'Pending' : tab === 'APPROVED' ? 'Approved' : tab === 'REJECTED' ? 'Rejected' : 'All'}
                    <span className="ml-1.5 text-xs opacity-75">
                      ({tab === 'ALL' ? sellers.length : sellers.filter(s => s.adminApprovalStatus === tab).length})
                    </span>
                  </button>
                ))}
                <button onClick={loadAllData} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--panel)] transition-all ml-1" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-28">
                <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[#FF6B35] rounded-full animate-spin" />
              </div>
            ) : sellers.filter(s => sellerStatusFilter === 'ALL' || s.adminApprovalStatus === sellerStatusFilter).length === 0 ? (
              <div className="bg-[var(--panel)] p-16 sm:p-24 border border-[var(--border)] text-center rounded-3xl space-y-4 shadow-xs">
                <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 text-[#FF6B35] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h4 className="font-black text-xl sm:text-2xl text-[var(--text)]">No seller applications in {sellerStatusFilter.toLowerCase()} status</h4>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                  All registered seller applications under this filter have been processed and synchronized.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {sellers.filter(s => sellerStatusFilter === 'ALL' || s.adminApprovalStatus === sellerStatusFilter).map((s) => (
                  <div key={s.id} className="bg-[var(--panel)] rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all p-7 space-y-5">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-1">APPLICATION ID: #{s.id}</span>
                        <h4 className="font-black text-[var(--text)] text-lg sm:text-xl">{s.name || s.businessName}</h4>
                        <p className="text-sm text-[#FF6B35] font-extrabold mt-0.5">{s.category}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black border uppercase tracking-wider ${
                        s.adminApprovalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        s.adminApprovalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {s.adminApprovalStatus || 'PENDING'}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-semibold space-y-2 bg-[var(--bg-secondary)] p-4 sm:p-5 rounded-2xl text-[var(--text-secondary)] leading-relaxed border border-[var(--border)]">
                      <p><strong className="text-[var(--muted)]">Registered Email:</strong> {s.email || (s.userId as any)?.email || 'N/A'}</p>
                      <p><strong className="text-[var(--muted)]">Contact Phone:</strong> {s.phone || 'N/A'}</p>
                      <p><strong className="text-[var(--muted)]">Kitchen Address:</strong> {s.address}</p>
                      <p><strong className="text-[var(--muted)]">Aadhaar (ID):</strong> {s.governmentId || 'Provided for review'}</p>
                      <p className="flex flex-col">
                        <span><strong className="text-[var(--muted)]">Bank Settlement Details:</strong></span>
                        <span className="pl-3 font-normal mt-0.5 text-[var(--text)]">
                          Bank: {s.bankName || 'Provided'} | A/C: {s.bankDetails || 'Submitted for review'}
                        </span>
                      </p>
                      {s.rejectionReason && (
                        <p className="mt-2 pt-2 border-t border-[var(--border)] text-red-500">
                          <strong>Rejection Reason:</strong> {s.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-xs sm:text-sm text-[var(--muted)] font-medium">
                        Submitted: {s.submittedAt || s.createdAt ? new Date(s.submittedAt || s.createdAt).toLocaleDateString() : 'Recent'}
                      </span>

                      <div className="flex items-center gap-2.5">
                        {s.adminApprovalStatus !== 'APPROVED' && (
                          <button 
                            onClick={() => handleApproveSeller(s.id)}
                            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all"
                            title="Approve Application"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                        )}
                        {s.adminApprovalStatus !== 'REJECTED' && (
                          <button 
                            onClick={() => { setSelectedSeller(s); setShowRejectionForm(true); }}
                            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                            title="Reject Application"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER ACCOUNT REGISTRY DATABASE */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-[var(--border)]">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[var(--text)]">System User & Auth Registry</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage customer profiles, seller accounts, and administrator provisioning</p>
              </div>
              <button 
                onClick={() => setShowAddAdmin(!showAddAdmin)}
                className="px-5 py-2.5 bg-[#FF6B35] text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm"
              >
                {showAddAdmin ? 'Cancel' : '+ Add New Admin'}
              </button>
            </div>

            <AnimatePresence>
              {showAddAdmin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm p-6"
                >
                  <form onSubmit={handleAddAdmin} className="flex flex-wrap items-end gap-5">
                    <div className="space-y-2 flex-1 min-w-[220px]">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Admin Name</label>
                      <input 
                        type="text" required value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Super Admin Name"
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                    <div className="space-y-2 flex-1 min-w-[220px]">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Admin Email</label>
                      <input 
                        type="email" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@craffle.com"
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                    <div className="space-y-2 flex-1 min-w-[220px]">
                      <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Initial Password</label>
                      <input 
                        type="password" required value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium outline-none focus:border-[#FF6B35]"
                      />
                    </div>
                    <button type="submit" className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e65a2a] text-white font-bold rounded-xl text-sm h-fit shadow-sm">
                      Create Admin
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xs p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-semibold leading-relaxed">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs uppercase tracking-wider">
                      <th className="py-3 px-3">ID</th>
                      <th className="px-3">NAME</th>
                      <th className="px-3">EMAIL</th>
                      <th className="px-3">ROLE TYPE</th>
                      <th className="px-3">EMAIL VERIFICATION</th>
                      <th className="px-3">CREATED DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-4 px-3 text-[var(--muted)] font-mono font-bold text-xs">#{u.id}</td>
                        <td className="px-3 font-bold text-[var(--text)]">{u.name}</td>
                        <td className="px-3 text-[var(--text-secondary)] font-medium">{u.email}</td>
                        <td className="px-3">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : u.role === 'SELLER' ? 'bg-orange-500/10 text-[#FF6B35]' : 'bg-[var(--border)] text-[var(--text)]'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3">
                          <button 
                            onClick={() => handleToggleUserVerify(u.id, u.isVerified)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${u.isVerified ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-500'}`}
                          >
                            {u.isVerified ? 'Verified ✓' : 'Unverified ✗'}
                          </button>
                        </td>
                        <td className="px-3 text-[var(--muted)] font-medium">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HELPDESK TICKETS ROUTING ROOM */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[var(--text)]">Support Helpdesk & Complaints Desk</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Customer feedback, seller complaints, and conflict mediation room</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Left Column: Tickets List */}
              <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-xs p-6 space-y-4">
                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">Inbox Tickets</span>
                
                {tickets.length === 0 ? (
                  <p className="text-center py-16 text-sm text-[var(--muted)]">No support tickets.</p>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {tickets.map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => { setSelectedTicket(t); setAdminReplyText(''); }}
                        className={`p-4 border rounded-2xl cursor-pointer text-sm transition-all ${selectedTicket?.id === t.id ? 'border-[#FF6B35] bg-orange-500/10 shadow-xs' : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'}`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <strong className="text-[var(--text)] font-bold truncate block max-w-[160px]">{t.subject}</strong>
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${t.status === 'OPEN' ? 'bg-orange-500/10 text-[#FF6B35] border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">From: {t.senderName} ({t.senderRole})</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Active Selected Conversation Thread */}
              <div className="md:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-3xl shadow-xs p-7 flex flex-col justify-between min-h-[420px]">
                {selectedTicket ? (
                  <div className="space-y-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Ticket Header Controls */}
                      <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                        <div>
                          <span className="text-xs font-bold text-[#FF6B35] block">TICKET #{selectedTicket.id}</span>
                          <h4 className="font-black text-[var(--text)] text-base sm:text-lg">{selectedTicket.subject}</h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Sender: {selectedTicket.senderName} | Role: {selectedTicket.senderRole}</p>
                        </div>
                        <button 
                          onClick={() => handleResolveTicket(selectedTicket.id, selectedTicket.status)}
                          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${selectedTicket.status === 'OPEN' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' : 'bg-[#FF6B35] text-white hover:bg-orange-600 shadow-sm'}`}
                        >
                          {selectedTicket.status === 'OPEN' ? 'Mark Resolved ✓' : 'Re-open Ticket'}
                        </button>
                      </div>

                      {/* Main Message */}
                      <div className="py-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-1.5">Opening Query</span>
                        <p className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border)] text-[var(--text)]">{selectedTicket.message}</p>
                      </div>

                      {/* Conversation thread details */}
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {selectedTicket.replies.map((rep) => (
                          <div key={rep.id} className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] ${rep.senderRole === 'ADMIN' ? 'bg-orange-500/10 text-[var(--text)] ml-auto border border-orange-500/20' : 'bg-[var(--bg-secondary)] text-[var(--text)] mr-auto border border-[var(--border)]'}`}>
                            <div className="flex justify-between items-center mb-1 text-xs font-bold text-[var(--muted)]">
                              <span>{rep.senderName}</span>
                              <span>{new Date(rep.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p>{rep.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reply Form */}
                    <form onSubmit={handleTicketReplySubmit} className="flex gap-3 pt-4 border-t border-[var(--border)]">
                      <input 
                        type="text" required placeholder="Write official admin response..."
                        value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm outline-none focus:bg-[var(--panel)] focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                      />
                      <button type="submit" className="px-6 py-3 bg-[#FF6B35] hover:bg-[#e65a2a] text-white font-bold rounded-xl text-sm transition-all shadow-sm">
                        Send Reply
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--muted)] py-20 space-y-3">
                    <MessageSquare className="w-12 h-12 text-[var(--muted)]" />
                    <p className="font-bold text-base text-[var(--text)]">No Helpdesk ticket selected</p>
                    <p className="text-xs sm:text-sm text-[var(--muted)] max-w-sm">Select any ticket from the left panel inbox to open replies routing channels.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE PAYOUT SPLITS LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[var(--text)]">Unified Financial Split Ledger</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">Auditing marketplace orders, customer payments, and platform commission breakdown</p>
            </div>

            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-xs p-7 space-y-5">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                <span className="font-black text-[var(--text)] text-base">Commission Auditing Registry</span>
                <span className="text-xs font-semibold text-[var(--muted)]">Showing all marketplace transaction records</span>
              </div>

              {orders.length === 0 ? (
                <div className="py-16 text-center text-[var(--muted)] font-semibold text-sm">
                  No orders placed on the system yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-semibold leading-relaxed">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs uppercase tracking-wider">
                        <th className="py-3 px-3">ORDER ID</th>
                        <th className="px-3">CUSTOMER</th>
                        <th className="px-3">SELLER/COOK</th>
                        <th className="px-3">TOTAL VALUE</th>
                        <th className="px-3">PLATFORM COMMISSION (10%)</th>
                        <th className="px-3">SELLER NET SHARE (90%)</th>
                        <th className="px-3">ORDER STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                      {orders.map((o) => {
                        const comm = Number((o.total * 0.1).toFixed(2));
                        const net = Number((o.total * 0.9).toFixed(2));

                        return (
                          <tr key={o.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                            <td className="py-4 px-3 font-mono font-bold text-[var(--text)]">#{o.id}</td>
                            <td className="px-3 font-medium text-[var(--text)]">{o.customerName}</td>
                            <td className="px-3 font-medium text-[var(--text)]">{o.sellerName}</td>
                            <td className="px-3 font-black text-[var(--text)]">₹{o.total}</td>
                            <td className="px-3 text-amber-500 font-black">₹{comm}</td>
                            <td className="px-3 text-emerald-500 font-black">₹{net}</td>
                            <td className="px-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${o.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-[#FF6B35]'}`}>
                                {o.status}
                              </span>
                            </td>
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

      </main>

      {/* AADHAAR CARD VISUAL PREVIEW MODAL OVERLAY */}
      <AnimatePresence>
        {selectedSeller && !showRejectionForm && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 font-sans text-[var(--text)]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-[var(--border)] mb-4">
                <h3 className="font-extrabold text-sm text-[var(--text)] uppercase tracking-wider">ID Verification</h3>
                <button onClick={() => setSelectedSeller(null)} className="text-[var(--muted)] hover:text-[var(--text)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Aadhaar Image */}
              <div className="w-full aspect-video bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border)] relative shadow-inner">
                <img 
                  src={selectedSeller.governmentIdImage} 
                  alt="ID doc preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-4 text-xs font-semibold text-[var(--text-secondary)] space-y-1 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)]">
                <p><strong className="text-[var(--text)] font-bold">Government ID Name:</strong> {selectedSeller.name}</p>
                <p><strong className="text-[var(--text)] font-bold">ID Reference ({selectedSeller.governmentIdType}):</strong> {selectedSeller.governmentIdNumber}</p>
                <p><strong className="text-[var(--text)] font-bold">Operating Kitchen Address:</strong> {selectedSeller.address}</p>
              </div>

              {/* Action buttons inside document viewer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)] mt-4 font-bold text-xs">
                <button 
                  onClick={() => setSelectedSeller(null)}
                  className="px-4 py-2 bg-[var(--border)] hover:opacity-80 rounded-xl text-[var(--text)]"
                >
                  Close Viewer
                </button>
                <button 
                  onClick={() => handleApproveSeller(selectedSeller.id)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Approve Seller
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECTION REASON COMMENT DIALOG */}
      <AnimatePresence>
        {selectedSeller && showRejectionForm && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 font-sans text-[var(--text)]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border)] mb-4">
                <h3 className="font-extrabold text-sm text-[var(--text)] uppercase tracking-wider">Reject Seller Application</h3>
                <button onClick={() => { setSelectedSeller(null); setShowRejectionForm(false); }} className="text-[var(--muted)] hover:text-[var(--text)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRejectSeller} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[var(--muted)] block">Rejection Feedback/Comment reason</label>
                  <textarea 
                    required rows={3} value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)}
                    placeholder="ID document blurred, address coordinates mismatched..."
                    className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] rounded-xl text-xs outline-none focus:border-[#FF6B35]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)] font-bold">
                  <button 
                    type="button" onClick={() => { setSelectedSeller(null); setShowRejectionForm(false); }}
                    className="px-4 py-2 bg-[var(--border)] hover:opacity-80 rounded-xl text-[var(--text)]"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow"
                  >
                    Confirm Rejection
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
