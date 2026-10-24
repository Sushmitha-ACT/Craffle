import React, { useState, useEffect } from 'react';
import { Settings, Bell, Moon, Sun, Laptop, Shield, LogOut, Loader2, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface SettingsPageProps {
  user: any;
  token: string | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onLogout?: () => void;
  isDark?: boolean;
  toggleDark?: () => void;
}

export default function SettingsPage({ user, token, showToast, onLogout }: SettingsPageProps) {
  const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences from DB on mount
  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data) {
        setPushEnabled(data.pushNotifications ?? true);
        setEmailEnabled(data.emailAlerts ?? false);
      }
    })
    .catch(err => {
      console.error('Failed to load user settings:', err);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [token]);

  // Toggle push notification setting
  const handleTogglePush = async () => {
    if (!token) return;
    const nextVal = !pushEnabled;
    setPushEnabled(nextVal);
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pushNotifications: nextVal })
      });
      if (res.ok) {
        showToast(`Push notifications turned ${nextVal ? 'ON' : 'OFF'}`, 'success');
      } else {
        setPushEnabled(!nextVal);
        showToast('Failed to save push settings.', 'error');
      }
    } catch {
      setPushEnabled(!nextVal);
      showToast('Network error saving settings.', 'error');
    }
  };

  // Toggle email alerts setting
  const handleToggleEmail = async () => {
    if (!token) return;
    const nextVal = !emailEnabled;
    setEmailEnabled(nextVal);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emailAlerts: nextVal })
      });
      if (res.ok) {
        showToast(`Email alerts turned ${nextVal ? 'ON' : 'OFF'}`, 'success');
      } else {
        setEmailEnabled(!nextVal);
        showToast('Failed to save email settings.', 'error');
      }
    } catch {
      setEmailEnabled(!nextVal);
      showToast('Network error saving settings.', 'error');
    }
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    setTheme(mode);
    const label = mode === 'system' ? 'System Theme' : mode === 'dark' ? 'Dark Mode' : 'Light Mode';
    showToast(`${label} enabled`, 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter transition-colors duration-200">
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B35] flex items-center justify-center shadow-xs border border-orange-100">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text)] tracking-tight">Settings & Preferences</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">Manage your theme, notification alerts, and account security</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
          <span className="text-sm font-semibold">Retrieving your preferences...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* THEME & APPEARANCE CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-xs text-[var(--text)] tracking-wider flex items-center gap-2 uppercase">
                  <Moon className="w-4 h-4 text-[#FF6B35]" /> Appearance & Theme
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Choose how Craffle looks for your browsing experience
                </p>
              </div>
              <span className="text-xs font-bold text-[#FF6B35] bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-full uppercase tracking-wider">
                {theme === 'system' ? 'Auto (System)' : resolvedTheme.toUpperCase()}
              </span>
            </div>

            {/* Three-way segmented mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Light Mode Card */}
              <div
                onClick={() => handleSelectTheme('light')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${
                  theme === 'light'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  theme === 'light' ? 'bg-[#FF6B35] text-white shadow-sm' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text)]">Light Theme</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Clean, bright white surfaces</p>
                </div>
                {theme === 'light' && (
                  <span className="text-[10px] font-extrabold uppercase text-[#FF6B35] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              {/* Dark Mode Card */}
              <div
                onClick={() => handleSelectTheme('dark')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${
                  theme === 'dark'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#FF6B35] text-white shadow-sm' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text)]">Dark Theme</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Deep slate charcoal tones</p>
                </div>
                {theme === 'dark' && (
                  <span className="text-[10px] font-extrabold uppercase text-[#FF6B35] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              {/* System Preference Card */}
              <div
                onClick={() => handleSelectTheme('system')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${
                  theme === 'system'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  theme === 'system' ? 'bg-[#FF6B35] text-white shadow-sm' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text)]">System Default</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Syncs with OS preferences</p>
                </div>
                {theme === 'system' && (
                  <span className="text-[10px] font-extrabold uppercase text-[#FF6B35] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto
                  </span>
                )}
              </div>
            </div>

            {/* Quick Toggle Switch Row */}
            <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--panel)] text-[#FF6B35] flex items-center justify-center border border-[var(--border)]">
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Quick Dark Mode Toggle</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Currently resolved as {resolvedTheme}</p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={toggleTheme}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleTheme();
                  }
                }}
                className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 ${
                  isDark ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'
                }`}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform flex items-center justify-center ${
                    isDark ? 'translate-x-8' : 'translate-x-1'
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-3 h-3 text-[#FF6B35]" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-500" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-xs text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase">
              <Bell className="w-4 h-4 text-[#FF6B35]" /> Notification Preferences
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-sm">Push Notifications</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Get real-time updates on your kitchen order status</p>
                </div>
                <button 
                  onClick={handleTogglePush}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${pushEnabled ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="h-px bg-[var(--border)]" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-sm">Email Alerts</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Receive promotional specials and creator recommendations</p>
                </div>
                <button 
                  onClick={handleToggleEmail}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${emailEnabled ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ACCOUNT & PRIVACY */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm space-y-2 transition-colors duration-200">
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-left group">
              <Shield className="w-5 h-5 text-[#FF6B35]" />
              <div>
                <span className="text-sm font-bold text-[var(--text)] block">Privacy & Security Guidelines</span>
                <span className="text-xs text-[var(--text-secondary)]">Read how Craffle protects your payment & location data</span>
              </div>
            </button>
            
            {onLogout && (
              <button 
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left group" 
                onClick={onLogout}
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-500">Sign Out of Craffle</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
