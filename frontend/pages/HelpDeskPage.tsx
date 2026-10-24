/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Send, Plus, Clock,
  CheckCircle2, Headphones, X, Loader2,
  CornerDownRight, RefreshCw, ShieldCheck
} from 'lucide-react';
import { SupportTicket } from '@shared/types';

interface HelpDeskPageProps {
  user: any;
  token: string;
}

export default function HelpDeskPage({ user, token }: HelpDeskPageProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id || user?._id?.toString?.() || '';
  const userName = user?.name || 'Customer';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.replies]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?senderId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (selectedTicket) {
          const updated = data.find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchTickets();
  }, [userId]);

  const handleSubmitNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          senderName: userName,
          senderRole: 'CUSTOMER',
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSubject('');
        setNewMessage('');
        setShowNewForm(false);
        await fetchTickets();
        if (data.ticket) setSelectedTicket({ ...data.ticket, id: data.ticket.id || data.ticket._id?.toString() });
      }
    } catch { }
    setSubmitting(false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, senderName: userName, senderRole: 'CUSTOMER', message: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setReplyText('');
        setSelectedTicket(data.ticket);
        await fetchTickets();
      }
    } catch { }
    setSubmitting(false);
  };

  const sc = (status: string) => status === 'OPEN'
    ? { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
    : { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };

  const fmt = (d: string) => { try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Help Desk</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Report an issue — our team will respond promptly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchTickets()} className="p-2.5 rounded-xl transition-colors" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowNewForm(true); setSelectedTicket(null); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:shadow-lg"
            style={{ background: 'var(--primary)' }}>
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Tickets', value: tickets.length, icon: MessageSquare, color: 'var(--primary)' },
          { label: 'Open', value: tickets.filter(t => t.status === 'OPEN').length, icon: Clock, color: '#F59E0B' },
          { label: 'Resolved', value: tickets.filter(t => t.status === 'RESOLVED').length, icon: CheckCircle2, color: '#10B981' },
        ].map(stat => (
          <div key={stat.label} className="card-surface p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}18`, color: stat.color }}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{stat.value}</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Ticket List */}
        <div className="md:col-span-2 card-surface p-0 overflow-hidden rounded-2xl">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>Your Tickets</h2>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} /></div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'var(--muted)' }} />
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>No tickets yet</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Click "New Ticket" to report an issue</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {tickets.map((ticket) => {
                  const s = sc(ticket.status);
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <button key={ticket.id}
                      onClick={() => { setSelectedTicket(ticket); setShowNewForm(false); setReplyText(''); }}
                      className="w-full text-left p-4 rounded-xl border transition-all"
                      style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)', background: isSelected ? 'var(--primary-light)' : 'transparent' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{ticket.subject}</p>
                        <span className={`shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${s.bg} ${s.text} ${s.border}`}>{ticket.status}</span>
                      </div>
                      <p className="text-xs truncate mb-2" style={{ color: 'var(--muted)' }}>{ticket.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{fmt(ticket.createdAt)}</span>
                        {ticket.replies?.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            {ticket.replies.length} repl{ticket.replies.length === 1 ? 'y' : 'ies'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="md:col-span-3 card-surface overflow-hidden rounded-2xl flex flex-col" style={{ minHeight: '520px' }}>
          <AnimatePresence mode="wait">
            {showNewForm && (
              <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Plus className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-black" style={{ color: 'var(--text)' }}>Submit a Support Ticket</h3>
                  </div>
                  <button onClick={() => setShowNewForm(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--muted)' }}><X className="w-4 h-4" /></button>
                </div>
                <div className="mb-5 p-4 rounded-xl border" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)40' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--primary)' }}>Before submitting</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
                    <li>Include your order ID for order issues</li>
                    <li>Be specific for faster resolution</li>
                    <li>Response time: within 24 hours</li>
                  </ul>
                </div>
                <form onSubmit={handleSubmitNewTicket} className="flex flex-col gap-4 flex-1">
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text)' }}>Subject <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} required
                      placeholder="e.g. Order not delivered, Wrong item received..."
                      className="input-field w-full text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text)' }}>Description <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} required rows={6}
                      placeholder="Describe your problem in detail..."
                      className="input-field w-full text-sm resize-none" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowNewForm(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-sm border transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>Cancel</button>
                    <button type="submit" disabled={submitting || !newSubject.trim() || !newMessage.trim()}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                      style={{ background: 'var(--primary)' }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {!showNewForm && selectedTicket && (
              <motion.div key={`t-${selectedTicket.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Ticket #{selectedTicket.id.slice(-6)}</span>
                      <h3 className="text-sm font-black mt-0.5 truncate" style={{ color: 'var(--text)' }}>{selectedTicket.subject}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Opened {fmt(selectedTicket.createdAt)}</p>
                    </div>
                    {(() => { const s = sc(selectedTicket.status); return (
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border}`}>
                        {selectedTicket.status === 'OPEN' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {selectedTicket.status}
                      </span>
                    ); })()}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '340px' }}>
                  <div className="flex justify-end">
                    <div className="max-w-[82%] space-y-1">
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed text-white" style={{ background: 'var(--primary)' }}>
                        {selectedTicket.message}
                      </div>
                      <p className="text-[10px] font-medium text-right" style={{ color: 'var(--muted)' }}>You • {fmt(selectedTicket.createdAt)}</p>
                    </div>
                  </div>

                  {selectedTicket.replies?.map((reply) => {
                    const isAdmin = reply.senderRole === 'ADMIN';
                    return (
                      <div key={reply.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-[82%] space-y-1">
                          {isAdmin && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)', color: 'white' }}>
                                <ShieldCheck className="w-3 h-3" />
                              </div>
                              <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>Craffle Support</span>
                            </div>
                          )}
                          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed border"
                            style={isAdmin
                              ? { background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)', borderBottomLeftRadius: 4 }
                              : { background: 'var(--primary)', color: 'white', borderColor: 'transparent', borderBottomRightRadius: 4 }}>
                            {reply.message}
                          </div>
                          <p className={`text-[10px] font-medium ${isAdmin ? 'text-left' : 'text-right'}`} style={{ color: 'var(--muted)' }}>
                            {isAdmin ? reply.senderName : 'You'} • {fmt(reply.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {selectedTicket.replies?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CornerDownRight className="w-6 h-6 mb-2" style={{ color: 'var(--muted)' }} />
                      <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Waiting for admin response...</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {selectedTicket.status === 'OPEN' ? (
                  <form onSubmit={handleSendReply} className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder="Add a reply or more details..." className="input-field flex-1 text-sm" />
                    <button type="submit" disabled={submitting || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-60 transition-all"
                      style={{ background: 'var(--primary)' }}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                ) : (
                  <div className="p-4 border-t text-center text-xs font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-emerald-500" />
                    This ticket has been resolved by the admin team.
                  </div>
                )}
              </motion.div>
            )}

            {!showNewForm && !selectedTicket && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center flex-1 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Headphones className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black mb-2" style={{ color: 'var(--text)' }}>We are here to help</h3>
                <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--muted)' }}>Select a ticket to continue a conversation, or open a new one to report an issue.</p>
                <button onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: 'var(--primary)' }}>
                  <Plus className="w-4 h-4" /> Submit New Ticket
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
