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
    <div className="w-full px-6 lg:px-10 py-8 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>Help Desk</h1>
            <p className="text-[15px] sm:text-[16px] font-normal mt-1" style={{ color: 'var(--text-secondary)' }}>Report an issue — our support team will respond promptly</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchTickets()} className="p-3 rounded-xl border border-[var(--border)] transition-colors hover:bg-[var(--panel)] cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} title="Refresh Tickets">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => { setShowNewForm(true); setSelectedTicket(null); }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[15px] text-white shadow-md transition-all hover:shadow-lg shadow-orange-500/20 cursor-pointer"
            style={{ background: 'var(--primary)' }}>
            <Plus className="w-5 h-5" /> New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Tickets', value: tickets.length, icon: MessageSquare, color: 'var(--primary)' },
          { label: 'Open', value: tickets.filter(t => t.status === 'OPEN').length, icon: Clock, color: '#F59E0B' },
          { label: 'Resolved', value: tickets.filter(t => t.status === 'RESOLVED').length, icon: CheckCircle2, color: '#10B981' },
        ].map(stat => (
          <div key={stat.label} className="card-surface p-6 rounded-2xl flex items-center gap-4 border border-[var(--border)] shadow-xs">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs" style={{ background: `${stat.color}18`, color: stat.color }}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-black" style={{ color: 'var(--text)' }}>{stat.value}</p>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ticket List (5 cols on lg) */}
        <div className="lg:col-span-5 card-surface p-0 overflow-hidden rounded-3xl border border-[var(--border)] shadow-sm">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-extrabold uppercase tracking-wider" style={{ color: 'var(--text)' }}>Your Tickets</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-secondary)]" style={{ color: 'var(--text-secondary)' }}>
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '620px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} /></div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-secondary)', color: 'var(--muted)' }}>
                  <MessageSquare className="w-8 h-8" />
                </div>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>No tickets yet</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Click "New Ticket" to report an issue</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {tickets.map((ticket) => {
                  const s = sc(ticket.status);
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <button key={ticket.id}
                      onClick={() => { setSelectedTicket(ticket); setShowNewForm(false); setReplyText(''); }}
                      className="w-full text-left p-5 rounded-2xl border transition-all cursor-pointer hover:border-orange-300"
                      style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)', background: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)' }}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-[16px] font-bold truncate flex-1" style={{ color: 'var(--text)' }}>{ticket.subject}</p>
                        <span className={`shrink-0 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-lg border ${s.bg} ${s.text} ${s.border}`}>{ticket.status}</span>
                      </div>
                      <p className="text-[14px] line-clamp-2 mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ticket.message}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/40">
                        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{fmt(ticket.createdAt)}</span>
                        {ticket.replies?.length > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--panel)', color: 'var(--primary)' }}>
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

        {/* Right Panel (7 cols on lg) */}
        <div className="lg:col-span-7 card-surface overflow-hidden rounded-3xl border border-[var(--border)] shadow-sm flex flex-col" style={{ minHeight: '620px' }}>
          <AnimatePresence mode="wait">
            {showNewForm && (
              <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black" style={{ color: 'var(--text)' }}>Submit a Support Ticket</h3>
                  </div>
                  <button onClick={() => setShowNewForm(false)} className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] cursor-pointer" style={{ color: 'var(--muted)' }}><X className="w-5 h-5" /></button>
                </div>
                <div className="mb-6 p-5 rounded-2xl border" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)40' }}>
                  <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--primary)' }}>Tips for quick resolution</p>
                  <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
                    <li>Include your order ID if you are facing issues with an order</li>
                    <li>Be specific about the problem so our team can resolve it faster</li>
                    <li>Expected initial response time: within 24 hours</li>
                  </ul>
                </div>
                <form onSubmit={handleSubmitNewTicket} className="flex flex-col gap-5 flex-1">
                  <div>
                    <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text)' }}>Subject <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} required
                      placeholder="e.g. Order not delivered, Item damaged, Payment query..."
                      className="input-field w-full text-[15px] p-3.5 rounded-xl" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-sm font-bold block mb-2" style={{ color: 'var(--text)' }}>Description <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} required rows={7}
                      placeholder="Describe your issue with full details..."
                      className="input-field w-full text-[15px] p-3.5 rounded-xl resize-none flex-1" />
                  </div>
                  <div className="flex gap-4 pt-3">
                    <button type="button" onClick={() => setShowNewForm(false)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[15px] border transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>Cancel</button>
                    <button type="submit" disabled={submitting || !newSubject.trim() || !newMessage.trim()}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer shadow-md shadow-orange-500/20"
                      style={{ background: 'var(--primary)' }}>
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {submitting ? 'Submitting Ticket...' : 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {!showNewForm && selectedTicket && (
              <motion.div key={`t-${selectedTicket.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
                <div className="px-7 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Ticket #{selectedTicket.id.slice(-6)}</span>
                      <h3 className="text-lg font-black mt-0.5 truncate" style={{ color: 'var(--text)' }}>{selectedTicket.subject}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Opened {fmt(selectedTicket.createdAt)}</p>
                    </div>
                    {(() => { const s = sc(selectedTicket.status); return (
                      <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 flex items-center gap-1.5 ${s.bg} ${s.text} ${s.border}`}>
                        {selectedTicket.status === 'OPEN' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {selectedTicket.status}
                      </span>
                    ); })()}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: '420px' }}>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] space-y-1">
                      <div className="px-5 py-3.5 rounded-2xl rounded-br-sm text-[15px] leading-relaxed text-white shadow-xs" style={{ background: 'var(--primary)' }}>
                        {selectedTicket.message}
                      </div>
                      <p className="text-xs font-medium text-right" style={{ color: 'var(--muted)' }}>You • {fmt(selectedTicket.createdAt)}</p>
                    </div>
                  </div>

                  {selectedTicket.replies?.map((reply) => {
                    const isAdmin = reply.senderRole === 'ADMIN';
                    return (
                      <div key={reply.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-[85%] space-y-1">
                          {isAdmin && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs" style={{ background: 'var(--primary)', color: 'white' }}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>Craffle Support</span>
                            </div>
                          )}
                          <div className="px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed border shadow-xs"
                            style={isAdmin
                              ? { background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)', borderBottomLeftRadius: 4 }
                              : { background: 'var(--primary)', color: 'white', borderColor: 'transparent', borderBottomRightRadius: 4 }}>
                            {reply.message}
                          </div>
                          <p className={`text-xs font-medium ${isAdmin ? 'text-left' : 'text-right'}`} style={{ color: 'var(--muted)' }}>
                            {isAdmin ? reply.senderName : 'You'} • {fmt(reply.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {selectedTicket.replies?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CornerDownRight className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Waiting for admin response...</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {selectedTicket.status === 'OPEN' ? (
                  <form onSubmit={handleSendReply} className="p-5 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                      placeholder="Add a reply or more details..." className="input-field flex-1 text-[15px] p-3.5 rounded-xl" />
                    <button type="submit" disabled={submitting || !replyText.trim()}
                      className="px-6 py-3.5 rounded-xl font-bold text-[15px] text-white flex items-center gap-2 disabled:opacity-60 transition-all cursor-pointer shadow-md shadow-orange-500/20"
                      style={{ background: 'var(--primary)' }}>
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      Reply
                    </button>
                  </form>
                ) : (
                  <div className="p-5 border-t text-center text-sm font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    <CheckCircle2 className="w-5 h-5 inline mr-2 text-emerald-500" />
                    This ticket has been resolved by the admin team.
                  </div>
                )}
              </motion.div>
            )}

            {!showNewForm && !selectedTicket && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center flex-1 p-10 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-xs" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Headphones className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>We are here to help</h3>
                <p className="text-[15px] mb-6 max-w-md" style={{ color: 'var(--muted)' }}>Select a ticket from the left to view the conversation, or open a new ticket to get assistance from our support team.</p>
                <button onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[15px] text-white shadow-md shadow-orange-500/20 cursor-pointer" style={{ background: 'var(--primary)' }}>
                  <Plus className="w-5 h-5" /> Submit New Ticket
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
