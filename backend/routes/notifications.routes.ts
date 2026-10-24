import express from 'express';
import { Notification } from '../models/Notification.js';

const router = express.Router();

// Get notifications for a user
router.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId as any })
      .sort({ createdAt: -1 })
      .lean();
    const mapped = notifications.map((n: any) => ({
      ...n,
      id: n._id.toString()
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count for a user
router.get('/api/notifications/unread-count/:userId', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.params.userId as any, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notifications as read
router.post('/api/notifications/mark-read', async (req, res) => {
  try {
    console.log('Received mark-read request body:', req.body);
    const { userId, markAll, notificationId } = req.body;
    if (markAll && userId) {
      const result = await Notification.updateMany({ userId: userId as any, isRead: false }, { isRead: true });
      console.log('markAllRead result:', result);
    } else if (notificationId) {
      const result = await Notification.findByIdAndUpdate(notificationId as any, { isRead: true });
      console.log('markRead result:', result);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
