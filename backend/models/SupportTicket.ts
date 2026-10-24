import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['CUSTOMER', 'SELLER', 'ADMIN'], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const supportTicketSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['CUSTOMER', 'SELLER', 'ADMIN'], required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

const SupportTicketModel = mongoose.model('SupportTicket', supportTicketSchema);
export const SupportTicket = (mongoose.models.SupportTicket as typeof SupportTicketModel) || SupportTicketModel;
