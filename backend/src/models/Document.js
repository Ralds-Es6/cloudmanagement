import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      default: 'Team Folder',
      trim: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    category: {
      type: String,
      enum: ['Document', 'Spreadsheet', 'Presentation', 'Text', 'Other'],
      default: 'Document',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerName: {
      type: String,
      default: 'System Administrator',
    },
    author: {
      type: String,
      default: 'System Administrator',
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        permission: {
          type: String,
          enum: ['viewer', 'editor'],
          default: 'viewer',
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shareLink: {
      enabled: { type: Boolean, default: false },
      token: { type: String, default: null, index: true },
      permission: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
      createdAt: { type: Date, default: null },
    },
    storageType: {
      type: String,
      enum: ['local', 'r2'],
      default: 'local',
    },
    r2Key: {
      type: String,
      default: null,
    },
    r2Bucket: {
      type: String,
      default: null,
    },
    r2Url: {
      type: String,
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to format human-readable size
DocumentSchema.methods.getFormattedSize = function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const Document =
  mongoose.models.Document || mongoose.model('Document', DocumentSchema);

export default Document;

