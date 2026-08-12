/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Terminal, Trash2, ArrowRightLeft, Users, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  date: string;
}

interface DeveloperConsoleProps {
  onBypassLogin: (role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'PENDING_SELLER') => void;
  onRefreshDB: () => void;
}

export default function DeveloperConsole({ onBypassLogin, onRefreshDB }: DeveloperConsoleProps) {
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emails' | 'shortcuts'>('emails');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/debug/emails');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.reverse()); // Show newest first
      }
    } catch (err) {
      console.error('Error fetching simulated emails:', err);
    }
  };

  const clearEmails = async () => {
    try {
      await fetch('/api/debug/emails/clear', { method: 'POST' });
      setEmails([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="dev-console" className="fixed bottom-0 right-4 z-50 max-w-md w-full bg-slate-900 border border-slate-700 rounded-t-xl shadow-2xl text-xs font-sans text-slate-100 overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Craffle Developer & Mail Console</span>
          {emails.length > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-500 text-[10px] text-white rounded-full font-bold">
              {emails.length}
            </span>
          )}
        </div>
        <span className="text-slate-400 font-bold">{isOpen ? '▼ Hide' : '▲ Open'}</span>
      </button>

      {isOpen && (
        <div className="h-80 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-850">
            <button 
              onClick={() => setActiveTab('emails')}
              className={`flex-1 py-2 text-center border-b font-medium transition-all ${activeTab === 'emails' ? 'border-orange-500 text-orange-500 bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Simulated Mail Server
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('shortcuts')}
              className={`flex-1 py-2 text-center border-b font-medium transition-all ${activeTab === 'shortcuts' ? 'border-orange-500 text-orange-500 bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Role Shortcuts & Database
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'emails' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-slate-400">Incoming mail log (for registration OTPs and approvals)</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={fetchEmails} 
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                      title="Refresh Logs"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    {emails.length > 0 && (
                      <button 
                        onClick={clearEmails} 
                        className="p-1 hover:bg-slate-800 rounded text-red-400 hover:text-red-300"
                        title="Clear Mail Log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-1">
                    <Mail className="w-8 h-8 text-slate-600 stroke-1" />
                    <p>No simulated emails sent yet.</p>
                    <p className="text-[10px] text-center max-w-[200px]">Register an account or reset passwords to generate verification OTP emails!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px]">
                    {emails.map((email) => {
                      // Extracting OTP if exists in the body
                      const otpMatch = email.body.match(/\*\*(\d{6})\*\*/);
                      const extractedOtp = otpMatch ? otpMatch[1] : null;

                      return (
                        <div key={email.id} className="p-2 bg-slate-800 border border-slate-700 rounded-lg space-y-1 relative">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-300">To: {email.to}</span>
                            <span className="text-[10px] text-slate-500">{new Date(email.date).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-orange-400 font-semibold text-[11px]">{email.subject}</div>
                          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-[11px]">
                            {email.body}
                          </div>
                          {extractedOtp && (
                            <div className="mt-2 p-1.5 bg-orange-950/40 border border-orange-500/30 rounded flex items-center justify-between">
                              <span className="text-orange-300 font-bold">Verification OTP:</span>
                              <span className="text-sm tracking-wider font-mono font-bold text-orange-400 px-2 bg-slate-900 rounded border border-orange-500/50">
                                {extractedOtp}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-slate-400 font-medium mb-2 border-b border-slate-800 pb-1">Instant Login Shortcuts (Bypass Auth)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => onBypassLogin('CUSTOMER')}
                      className="p-2 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800/80 rounded-lg flex flex-col items-start gap-1 transition-all"
                    >
                      <span className="text-blue-300 font-bold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Customer Mode
                      </span>
                      <span className="text-[10px] text-slate-400 text-left">Login as sushmitha@gmail.com</span>
                    </button>

                    <button 
                      onClick={() => onBypassLogin('SELLER')}
                      className="p-2 bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-lg flex flex-col items-start gap-1 transition-all"
                    >
                      <span className="text-emerald-300 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Seller Mode
                      </span>
                      <span className="text-[10px] text-slate-400 text-left">Amma Mary (Approved)</span>
                    </button>

                    <button 
                      onClick={() => onBypassLogin('ADMIN')}
                      className="p-2 bg-red-900/40 hover:bg-red-900/60 border border-red-800/80 rounded-lg flex flex-col items-start gap-1 transition-all"
                    >
                      <span className="text-red-300 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Platform Admin
                      </span>
                      <span className="text-[10px] text-slate-400 text-left">Full control room</span>
                    </button>

                    <button 
                      onClick={() => onBypassLogin('PENDING_SELLER')}
                      className="p-2 bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-800/80 rounded-lg flex flex-col items-start gap-1 transition-all"
                    >
                      <span className="text-yellow-300 font-bold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Pending Seller
                      </span>
                      <span className="text-[10px] text-slate-400 text-left">Ganesh Foodie (Unapproved)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-400 font-medium mb-2 border-b border-slate-800 pb-1">System Control</h4>
                  <button 
                    onClick={async () => {
                      setIsRefreshing(true);
                      await onRefreshDB();
                      setTimeout(() => setIsRefreshing(false), 800);
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Reset & Re-seed Database
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-1.5">Clears custom logs and resets standard users, sellers, products and reviews.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
