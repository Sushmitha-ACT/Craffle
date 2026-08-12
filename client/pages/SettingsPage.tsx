import React, { useState, useEffect } from 'react';
import { Settings, Bell, Moon, Shield, LogOut, Loader2 } from 'lucide-react';

interface SettingsPageProps {
  user: any;
  token: string | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onLogout?: () => void;
  isDark: boolean;
  toggleDark: () => void;
}

export default function SettingsPage({ user, token, showToast, onLogout, isDark, toggleDark }: SettingsPageProps) {
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
        setPushEnabled(data.pushNotifications);
        setEmailEnabled(data.emailAlerts);
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
        setPushEnabled(!nextVal); // rollback
        showToast('Failed to save push settings.', 'error');
      }
    } catch (err) {
      setPushEnabled(!nextVal); // rollback
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
        setEmailEnabled(!nextVal); // rollback
        showToast('Failed to save email settings.', 'error');
      }
    } catch (err) {
      setEmailEnabled(!nextVal); // rollback
      showToast('Network error saving settings.', 'error');
    }
  };

  // Toggle dark mode setting
  const handleToggleDarkMode = () => {
    toggleDark();
    showToast(`Dark Mode turned ${!isDark ? 'ON' : 'OFF'}`, 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter transition-colors duration-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF6B35] flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] transition-colors duration-200">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] font-medium transition-colors duration-200">Manage your app preferences</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
          <span className="text-sm font-semibold">Retrieving your preferences...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Notifications */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-[11px] text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase transition-colors duration-200">
              <Bell className="w-4 h-4 text-[var(--muted)]" /> NOTIFICATIONS
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-sm transition-colors duration-200">Push Notifications</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 transition-colors duration-200">Get updates on your order status</p>
                </div>
                <button 
                  onClick={handleTogglePush}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${pushEnabled ? 'bg-[#FF6B35]' : 'bg-[var(--secondary)]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              <div className="h-px bg-[var(--border)]" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[var(--text)] text-sm transition-colors duration-200">Email Alerts</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 transition-colors duration-200">Receive promotional emails and news</p>
                </div>
                <button 
                  onClick={handleToggleEmail}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${emailEnabled ? 'bg-[#FF6B35]' : 'bg-[var(--secondary)]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm transition-colors duration-200">
            <h3 className="font-bold text-[11px] text-[var(--text)] tracking-wider flex items-center gap-2 mb-6 uppercase transition-colors duration-200">
              <Moon className="w-4 h-4 text-[var(--muted)]" /> APPEARANCE
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[var(--text)] text-sm transition-colors duration-200">Dark Mode</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 transition-colors duration-200">Switch to a dark theme</p>
              </div>
              <button 
                onClick={handleToggleDarkMode}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${isDark ? 'bg-[#FF6B35]' : 'bg-[var(--secondary)]'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Support & Logout */}
          <div className="bg-[var(--panel)] rounded-3xl p-6 border border-[var(--border)] shadow-sm space-y-2 transition-colors duration-200">
            <button className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-left group">
              <Shield className="w-5 h-5 text-[#FF6B35]" />
              <span className="text-sm font-bold text-[var(--text)] transition-colors duration-200">Privacy Policy</span>
            </button>
            
            <button 
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-left group" 
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold text-red-500 transition-colors duration-200">Sign Out</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
