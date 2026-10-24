/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle, Package, Star, ShieldCheck, Info, X, Check } from 'lucide-react';
import { Notification, NotificationType } from '@shared/types';

interface NotificationCenterProps {
  userId: string;
  onNavigate: (page: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  [NotificationType.ORDER_PLACED]: <Package className="w-4.5 h-4.5" />,
  [NotificationType.ORDER_ACCEPTED]: <CheckCircle className="w-4.5 h-4.5" />,
  [NotificationType.ORDER_PREPARING]: <Package className="w-4.5 h-4.5" />,
  [NotificationType.ORDER_OUT_FOR_DELIVERY]: <Package className="w-4.5 h-4.5" />,
  [NotificationType.ORDER_DELIVERED]: <CheckCircle className="w-4.5 h-4.5" />,
  [NotificationType.ORDER_CANCELLED]: <X className="w-4.5 h-4.5" />,
  [NotificationType.NEW_REVIEW]: <Star className="w-4.5 h-4.5" />,
  [NotificationType.SELLER_APPROVED]: <ShieldCheck className="w-4.5 h-4.5" />,
  [NotificationType.SELLER_REJECTED]: <Info className="w-4.5 h-4.5" />,
  [NotificationType.SYSTEM]: <Bell className="w-4.5 h-4.5" />,
};

const COLOR_MAP: Record<string, string> = {
  [NotificationType.ORDER_PLACED]: 'var(--primary)',
  [NotificationType.ORDER_ACCEPTED]: 'var(--success)',
  [NotificationType.ORDER_DELIVERED]: 'var(--success)',
  [NotificationType.ORDER_CANCELLED]: 'var(--danger)',
  [NotificationType.NEW_REVIEW]: '#f59e0b',
  [NotificationType.SELLER_APPROVED]: 'var(--success)',
  [NotificationType.SELLER_REJECTED]: 'var(--danger)',
  [NotificationType.SYSTEM]: 'var(--primary)',
};

export default function NotificationCenter({ userId, onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, [userId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      const data = await res.json();
      setNotifications(data);
    } catch { }
    setLoading(false);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markAll: true })
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    if (!id) return;
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id })
    });
    setNotifications(prev => prev.map(n => (n.id === id || (n as any)._id === id) ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-xs">
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const notifId = notif.id || (notif as any)._id;
            return (
              <motion.div
                key={notifId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => { markRead(notifId); }}
                className={`p-4 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                  notif.isRead ? '' : 'border-l-3'
                }`}
                style={{
                  background: notif.isRead ? 'var(--panel)' : 'var(--primary-light)',
                  border: `1px solid ${notif.isRead ? 'var(--border)' : 'var(--primary)'}30`,
                  borderLeftColor: notif.isRead ? undefined : 'var(--primary)',
                  borderLeftWidth: notif.isRead ? undefined : '3px',
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: (COLOR_MAP[notif.type] || 'var(--primary)') + '15', color: COLOR_MAP[notif.type] || 'var(--primary)' }}>
                  {ICON_MAP[notif.type] || <Bell className="w-4.5 h-4.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{notif.title}</h4>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notif.message}</p>
                  <span className="text-[10px] font-medium mt-1.5 block" style={{ color: 'var(--muted)' }}>{timeAgo(notif.createdAt)}</span>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: 'var(--primary)' }} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
