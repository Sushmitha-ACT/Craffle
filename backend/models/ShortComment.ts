import mongoose from 'mongoose';

const shortCommentSchema = new mongoose.Schema({
  shortId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Short', index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: 'Customer' },
  userAvatar: { type: String },
  text: { type: String, required: true, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

shortCommentSchema.index({ shortId: 1, createdAt: -1 });

const ShortCommentModel = mongoose.model('ShortComment', shortCommentSchema);
export const ShortComment = (mongoose.models.ShortComment as typeof ShortCommentModel) || ShortCommentModel;
