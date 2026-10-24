import express from 'express';
import { SupportTicket } from '../models/SupportTicket.js';

const router = express.Router();

// List tickets for support desk (public or authenticated)
router.get('/api/support/tickets', async (req, res) => {
  try {
    const { senderId } = req.query;
    const query: any = senderId ? { senderId: String(senderId) } : {};
    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 }).lean();
    res.json(tickets.map(t => ({
      ...t,
      id: t._id.toString(),
      replies: (t.replies || []).map((r: any) => ({
        ...r,
        id: r._id ? r._id.toString() : (r.id || ''),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
      })),
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Create new support ticket
router.post('/api/support/tickets', async (req, res) => {
  try {
    const { senderId, senderName, senderRole, subject, message } = req.body;
    if (!senderId || !senderName || !subject || !message) {
      return res.status(400).json({ error: 'Missing required ticket fields' });
    }

    const ticket = await SupportTicket.create({
      senderId,
      senderName,
      senderRole: senderRole || 'CUSTOMER',
      subject,
      message,
      status: 'OPEN',
      replies: []
    });

    res.status(201).json({
      message: 'Support ticket submitted successfully',
      ticket: {
        ...ticket.toObject(),
        id: ticket._id.toString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Append reply to an existing ticket
router.post('/api/support/tickets/:id/reply', async (req, res) => {
  try {
    const { senderId, senderName, senderRole, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const reply = {
      senderId: senderId || 'admin',
      senderName: senderName || 'Craffle Head Admin',
      senderRole: senderRole || 'ADMIN',
      message: message.trim(),
      createdAt: new Date()
    };

    ticket.replies.push(reply as any);
    await ticket.save();

    res.json({
      message: 'Reply posted',
      ticket: {
        ...ticket.toObject(),
        id: ticket._id.toString(),
        replies: ticket.replies.map((r: any) => ({
          id: r._id.toString(),
          senderId: r.senderId,
          senderName: r.senderName,
          senderRole: r.senderRole,
          message: r.message,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

export default router;
