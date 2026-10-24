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
    <div className="w-full px-6 lg:px-10 py-8 page-enter transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center shrink-0 shadow-xs border border-orange-500/20">
          <Settings className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] tracking-tight">Settings & Preferences</h1>
          <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] font-normal mt-1">Manage your appearance theme, notification alerts, and account security</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-secondary)] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF6B35]" />
          <span className="text-base font-semibold">Retrieving your preferences...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* THEME & APPEARANCE CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-9 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-5 border-b border-[var(--border)]">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-[var(--text)] tracking-wider flex items-center gap-2.5 uppercase">
                  <Moon className="w-5 h-5 text-[#FF6B35]" /> Appearance & Theme
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Choose how Craffle looks across your browsing experience
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-extrabold text-[#FF6B35] bg-orange-50 dark:bg-orange-950/40 px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-orange-200 dark:border-orange-900/50">
                {theme === 'system' ? 'Auto (System)' : resolvedTheme.toUpperCase()}
              </span>
            </div>

            {/* Three-way segmented mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              {/* Light Mode Card */}
              <div
                onClick={() => handleSelectTheme('light')}
                className={`p-6 sm:p-7 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-4 ${
                  theme === 'light'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${
                  theme === 'light' ? 'bg-[#FF6B35] text-white' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Sun className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-[var(--text)]">Light Theme</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Clean, bright white surfaces</p>
                </div>
                {theme === 'light' && (
                  <span className="text-xs font-extrabold uppercase text-[#FF6B35] flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/60 dark:bg-orange-950/50">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>

              {/* Dark Mode Card */}
              <div
                onClick={() => handleSelectTheme('dark')}
                className={`p-6 sm:p-7 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-4 ${
                  theme === 'dark'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${
                  theme === 'dark' ? 'bg-[#FF6B35] text-white' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Moon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-[var(--text)]">Dark Theme</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Deep slate charcoal tones</p>
                </div>
                {theme === 'dark' && (
                  <span className="text-xs font-extrabold uppercase text-[#FF6B35] flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/60 dark:bg-orange-950/50">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>

              {/* System Preference Card */}
              <div
                onClick={() => handleSelectTheme('system')}
                className={`p-6 sm:p-7 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-4 ${
                  theme === 'system'
                    ? 'border-[#FF6B35] bg-orange-50/20 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${
                  theme === 'system' ? 'bg-[#FF6B35] text-white' : 'bg-[var(--panel)] text-[var(--muted)]'
                }`}>
                  <Laptop className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-base sm:text-lg text-[var(--text)]">System Default</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Syncs with OS preferences</p>
                </div>
                {theme === 'system' && (
                  <span className="text-xs font-extrabold uppercase text-[#FF6B35] flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/60 dark:bg-orange-950/50">
                    <Check className="w-3.5 h-3.5" /> Auto
                  </span>
                )}
              </div>
            </div>

            {/* Quick Toggle Switch Row */}
            <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-between border border-[var(--border)]/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--panel)] text-[#FF6B35] flex items-center justify-center border border-[var(--border)] shadow-xs">
                  {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text)]">Quick Dark Mode Toggle</h4>
                  <p className="text-sm text-[var(--text-secondary)]">Currently resolved as {resolvedTheme}</p>
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
                className={`w-16 h-8 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 ${
                  isDark ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'
                }`}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-transform flex items-center justify-center ${
                    isDark ? 'translate-x-9' : 'translate-x-1'
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-3.5 h-3.5 text-[#FF6B35]" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-9 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-extrabold text-base sm:text-lg text-[var(--text)] tracking-wider flex items-center gap-2.5 mb-7 uppercase">
              <Bell className="w-5 h-5 text-[#FF6B35]" /> Notification Preferences
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-base sm:text-lg">Push Notifications</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Get real-time updates on your kitchen order status and delivery milestones</p>
                </div>
                <button 
                  onClick={handleTogglePush}
                  className={`w-14 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${pushEnabled ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5.5 h-5.5 bg-white rounded-full absolute top-0.5 transition-transform ${pushEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <div className="h-px bg-[var(--border)]" />
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-base sm:text-lg">Email Alerts</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Receive promotional specials, seasonal offerings, and creator recommendations</p>
                </div>
                <button 
                  onClick={handleToggleEmail}
                  className={`w-14 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${emailEnabled ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5.5 h-5.5 bg-white rounded-full absolute top-0.5 transition-transform ${emailEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ACCOUNT & PRIVACY */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-sm space-y-3 transition-colors duration-200">
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors text-left group cursor-pointer border border-transparent hover:border-[var(--border)]">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-[#FF6B35] flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-base font-bold text-[var(--text)] block">Privacy & Security Guidelines</span>
                <span className="text-sm text-[var(--text-secondary)]">Read how Craffle protects your payment details, delivery address, and personal location data</span>
              </div>
            </button>
            
            {onLogout && (
              <button 
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-500/10 transition-colors text-left group cursor-pointer border border-transparent hover:border-red-200" 
                onClick={onLogout}
              >
                <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <LogOut className="w-6 h-6" />
                </div>
                <span className="text-base font-bold text-red-500">Sign Out of Craffle</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
