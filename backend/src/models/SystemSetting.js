import mongoose from 'mongoose';

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'cloudxen_config',
    },
    maxUploadSizeMB: {
      type: Number,
      default: 25,
      min: 1,
      max: 500,
    },
    allowedExtensions: {
      type: [String],
      default: [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'png',
        'jpg',
        'jpeg',
        'webp',
        'svg',
        'zip',
        'txt',
        'csv',
      ],
    },
    publicSharingEnabled: {
      type: Boolean,
      default: true,
    },
    defaultShareExpirationDays: {
      type: Number,
      default: 30, // 0 = never
    },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model('SystemSetting', SystemSettingSchema);
export default SystemSetting;

