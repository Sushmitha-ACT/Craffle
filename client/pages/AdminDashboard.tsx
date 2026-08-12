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
      const res = await fetch('/api/admin/stats');
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
      const res = await fetch('/api/admin/users');
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
      const res = await fetch('/api/admin/sellers');
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
      const res = await fetch('/api/admin/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.reverse()); // Newest first
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.reverse());
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
  }, []);

  // Handle Seller Verification Approval
  const handleApproveSeller = async (id: string) => {
    if (!confirm('Are you sure you want to approve and onboard this seller?')) return;

    try {
      const res = await fetch(`/api/admin/sellers/approve/${id}`, {
        method: 'POST'
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
          confirmPassword: newAdminPassword,
          role: 'ADMIN'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: 'Craffle Head Admin',
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
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen bg-[#FDFCFB] font-sans pb-16">
      {/* Admin Navbar */}
      <header className="bg-white text-[#3D3A35] border-b border-[#EDE9E3] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF6B35] rounded-xl text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold font-serif flex items-center gap-1.5 text-[#3D3A35]">
                Craffle <span className="px-1.5 py-0.5 bg-[#FF6B35] text-[9px] rounded font-mono font-extrabold tracking-widest text-white uppercase">Control Panel</span>
              </span>
              <p className="text-[10px] text-[#7C756B] font-semibold">{user.email} (Super Admin)</p>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('sellers')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'sellers' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              Verify Cooks ({stats.pendingSellersCount})
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'users' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              User Registry
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'tickets' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              Helpdesk Routing
              {tickets.filter(t => t.status === 'OPEN').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-[9px] text-white rounded-full font-bold">
                  {tickets.filter(t => t.status === 'OPEN').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activeTab === 'ledger' ? 'bg-[#FF6B35] text-white' : 'text-[#7C756B] hover:text-[#3D3A35]'}`}
            >
              Split Ledger
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
        
        {/* TOP METRICS GRIDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Verified Sellers</span>
              <h3 className="text-2xl font-extrabold text-[#3D3A35]">{stats.sellersCount}</h3>
            </div>
            <div className="p-2.5 bg-[#FAF9F7] rounded-xl text-[#7C756B]">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Verification Pending</span>
              <h3 className="text-2xl font-extrabold text-[#FF6B35]">{stats.pendingSellersCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Total Items Listed</span>
              <h3 className="text-2xl font-extrabold text-[#3D3A35]">{stats.productsCount}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
              <Clipboard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-6 border border-[#EDE9E3] rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider block">Platform Commission Cut</span>
              <h3 className="text-2xl font-extrabold text-[#3D3A35]">₹{stats.platformRevenue}</h3>
            </div>
            <div className="p-2.5 bg-[#F0F7F0] rounded-xl text-[#4A7C4A]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TAB 1: PENDING SELLER ONBOARDING VERIFICATION */}
        {activeTab === 'sellers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Pending Home Cooks Onboarding Room</h3>
              <button onClick={loadAllData} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : sellers.filter(s => s.adminApprovalStatus === 'PENDING').length === 0 ? (
              <div className="bg-white p-12 border border-slate-100 text-center rounded-xl space-y-1">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No pending verification applications</p>
                <p className="text-xs text-slate-400">All registered home-chefs are currently verified and auditing parameters are clear.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sellers.filter(s => s.adminApprovalStatus === 'PENDING').map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">SELLER ID: #{s.id}</span>
                        <h4 className="font-extrabold text-slate-850 text-base">{s.name || s.businessName}</h4>
                        <p className="text-xs text-[#FF6B35] font-bold">{s.category}</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-yellow-50 text-yellow-600 rounded text-[9px] font-bold border border-yellow-200">
                        {s.adminApprovalStatus}
                      </span>
                    </div>

                    <div className="text-xs font-semibold space-y-1 bg-slate-50 p-3 rounded-lg text-slate-600">
                      <p><strong className="text-slate-500">Contact Phone:</strong> {s.phone}</p>
                      <p><strong className="text-slate-500">Kitchen Address:</strong> {s.address}</p>
                      <p className="flex items-center gap-1">
                        <strong className="text-slate-500">Aadhaar:</strong> 
                        {s.aadhaarVerified ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Verified</span> : <span className="text-red-500">Unverified</span>}
                      </p>
                      <p className="flex flex-col">
                        <span className="flex items-center gap-1">
                          <strong className="text-slate-500">Bank Account:</strong> 
                          {s.bankVerified ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Verified</span> : <span className="text-red-500">Unverified</span>}
                        </span>
                        <span className="pl-4 font-normal mt-0.5">
                          Bank: {s.bankName} | Holder: {s.bankAccountName || 'Masked'} <br/>
                          A/C: {s.bankAccount}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedSeller(s)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View ID Document
                      </button>

                      <div className="flex items-center gap-2 ml-auto">
                        <button 
                          onClick={() => handleApproveSeller(s.id)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                          title="Approve Seller"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedSeller(s); setShowRejectionForm(true); }}
                          className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                          title="Reject Seller"
                        >
                          <X className="w-4 h-4" />
                        </button>
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">System User & Auth Registry</h3>
              <button 
                onClick={() => setShowAddAdmin(!showAddAdmin)}
                className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors"
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
                  className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-4"
                >
                  <form onSubmit={handleAddAdmin} className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-slate-500 uppercase">Admin Name</label>
                      <input 
                        type="text" required value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                      <input 
                        type="email" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-bold text-slate-500 uppercase">Initial Password</label>
                      <input 
                        type="password" required value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-[#3D3A35] hover:bg-black text-white font-bold rounded-lg text-xs h-fit">
                      Create Admin
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold leading-relaxed">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="py-2.5">ID</th>
                      <th>NAME</th>
                      <th>EMAIL</th>
                      <th>ROLE TYPE</th>
                      <th>EMAIL VERIFICATION</th>
                      <th>CREATED DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3 text-slate-400 font-bold">#{u.id}</td>
                        <td className="font-bold text-slate-800">{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'SELLER' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleUserVerify(u.id, u.isVerified)}
                            className={`px-2.5 py-1 rounded font-bold text-[10px] uppercase transition-colors ${u.isVerified ? 'bg-emerald-50 text-emerald-600 border border-emerald-150 hover:bg-red-50 hover:text-red-600 hover:border-red-150' : 'bg-red-50 text-red-600 border border-red-150 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-150'}`}
                          >
                            {u.isVerified ? 'Verified ✓' : 'Unverified ✗'}
                          </button>
                        </td>
                        <td className="text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
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
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">Support Helpdesk & Complaints Desk</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Tickets List */}
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inbox Tickets</span>
                
                {tickets.length === 0 ? (
                  <p className="text-center py-12 text-xs text-slate-400">No support tickets.</p>
                ) : (
                  <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                    {tickets.map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => { setSelectedTicket(t); setAdminReplyText(''); }}
                        className={`p-3 border rounded-xl cursor-pointer text-xs transition-colors ${selectedTicket?.id === t.id ? 'border-[#FF6B35] bg-orange-50' : 'border-slate-100 hover:bg-slate-50'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-slate-800 truncate block max-w-[140px]">{t.subject}</strong>
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[8px] ${t.status === 'OPEN' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">From: {t.senderName} ({t.senderRole})</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Active Selected Conversation Thread */}
              <div className="md:col-span-2 bg-white border border-slate-100 rounded-xl shadow-sm p-5 flex flex-col justify-between min-h-[300px]">
                {selectedTicket ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Ticket Header Controls */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[9px] font-bold text-[#FF6B35] block">TICKET #{selectedTicket.id}</span>
                          <h4 className="font-extrabold text-slate-850 text-sm">{selectedTicket.subject}</h4>
                          <p className="text-[10px] text-slate-400">Sender: {selectedTicket.senderName} | Role: {selectedTicket.senderRole}</p>
                        </div>
                        <button 
                          onClick={() => handleResolveTicket(selectedTicket.id, selectedTicket.status)}
                          className={`px-3 py-1 rounded font-bold text-xs transition-colors ${selectedTicket.status === 'OPEN' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}
                        >
                          {selectedTicket.status === 'OPEN' ? 'Mark Resolved ✓' : 'Re-open Ticket'}
                        </button>
                      </div>

                      {/* Main Message */}
                      <div className="py-3 text-xs leading-relaxed text-slate-600">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Opening Query</span>
                        <p className="bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedTicket.message}</p>
                      </div>

                      {/* Conversation thread details */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedTicket.replies.map((rep) => (
                          <div key={rep.id} className={`p-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] ${rep.senderRole === 'ADMIN' ? 'bg-orange-50 text-slate-700 ml-auto border border-orange-100' : 'bg-slate-100 text-slate-700 mr-auto border border-slate-150'}`}>
                            <div className="flex justify-between items-center mb-0.5 text-[9px] font-bold text-slate-400">
                              <span>{rep.senderName}</span>
                              <span>{new Date(rep.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p>{rep.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reply Form */}
                    <form onSubmit={handleTicketReplySubmit} className="flex gap-2 pt-3 border-t border-slate-100">
                      <input 
                        type="text" required placeholder="Write official admin response..."
                        value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B35]"
                      />
                      <button type="submit" className="px-5 py-2 bg-orange-950 text-white font-bold rounded-xl text-xs hover:bg-orange-900 transition-colors">
                        Send Reply
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                    <p className="font-bold text-xs">No Helpdesk ticket selected</p>
                    <p className="text-[10px] text-slate-400">Select any ticket from the left panel inbox to open replies routing channels.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE PAYOUT SPLITS LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800">Unified Financial Split Ledger</h3>

            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 text-sm">Commission Auditing Registry</span>
                <span className="text-xs text-slate-400">Showing all marketplace transaction records</span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                  No orders placed on the system yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold leading-relaxed">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="py-2.5">ORDER ID</th>
                        <th>CUSTOMER</th>
                        <th>SELLER/COOK</th>
                        <th>TOTAL VALUE</th>
                        <th>PLATFORM COMMISSION (10%)</th>
                        <th>SELLER NET SHARE (90%)</th>
                        <th>ORDER STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {orders.map((o) => {
                        const comm = Number((o.total * 0.1).toFixed(2));
                        const net = Number((o.total * 0.9).toFixed(2));

                        return (
                          <tr key={o.id}>
                            <td className="py-3 font-bold text-slate-900">#{o.id}</td>
                            <td>{o.customerName}</td>
                            <td>{o.sellerName}</td>
                            <td className="font-extrabold text-slate-900">₹{o.total}</td>
                            <td className="text-yellow-600 font-extrabold">₹{comm}</td>
                            <td className="text-emerald-600 font-extrabold">₹{net}</td>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 font-sans text-slate-800"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">ID Verification</h3>
                <button onClick={() => setSelectedSeller(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Aadhaar Image */}
              <div className="w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
                <img 
                  src={selectedSeller.governmentIdImage} 
                  alt="ID doc preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-4 text-xs font-semibold text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg">
                <p><strong className="text-slate-800 font-bold">Government ID Name:</strong> {selectedSeller.name}</p>
                <p><strong className="text-slate-800 font-bold">ID Reference ({selectedSeller.governmentIdType}):</strong> {selectedSeller.governmentIdNumber}</p>
                <p><strong className="text-slate-800 font-bold">Operating Kitchen Address:</strong> {selectedSeller.address}</p>
              </div>

              {/* Action buttons inside document viewer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4 font-bold text-xs">
                <button 
                  onClick={() => setSelectedSeller(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 font-sans text-slate-800"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Reject Seller Application</h3>
                <button onClick={() => { setSelectedSeller(null); setShowRejectionForm(false); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRejectSeller} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-slate-500 block">Rejection Feedback/Comment reason</label>
                  <textarea 
                    required rows={3} value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)}
                    placeholder="ID document blurred, address coordinates mismatched..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 font-bold">
                  <button 
                    type="button" onClick={() => { setSelectedSeller(null); setShowRejectionForm(false); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700"
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
