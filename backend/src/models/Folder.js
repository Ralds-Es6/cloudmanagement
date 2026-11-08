import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#4361ee',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
    workspace: {
      type: String,
      default: 'Personal Storage',
    },
    filesCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
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

// Compound index to help enforce sibling lookups
FolderSchema.index({ parentId: 1, name: 1, isDeleted: 1 });

export const Folder =
  mongoose.models.Folder || mongoose.model('Folder', FolderSchema);

export default Folder;
