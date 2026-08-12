import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  pushNotifications: { type: Boolean, default: true },
  emailAlerts: { type: Boolean, default: false },
  darkMode: { type: Boolean, default: false }
}, { timestamps: true });


const SettingsModel = mongoose.model('Settings', settingsSchema);
export const Settings = (mongoose.models.Settings as typeof SettingsModel) || SettingsModel;
