import mongoose from 'mongoose';

const shortReportSchema = new mongoose.Schema({
  shortId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Short', index: true },
  reporterId: { type: String, required: true, index: true },
  reason: { 
    type: String, 
    enum: ['spam', 'inappropriate', 'misleading', 'copyright', 'offensive', 'other'], 
    default: 'inappropriate' 
  },
  details: { type: String, default: '', trim: true, maxlength: 500 },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'dismissed', 'action_taken'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

const ShortReportModel = mongoose.model('ShortReport', shortReportSchema);
export const ShortReport = (mongoose.models.ShortReport as typeof ShortReportModel) || ShortReportModel;
