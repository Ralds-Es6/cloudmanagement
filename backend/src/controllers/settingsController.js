import mongoose from 'mongoose';
import { SystemSetting } from '../models/SystemSetting.js';
import { Document } from '../models/Document.js';
import { Folder } from '../models/Folder.js';
import { User } from '../models/User.js';
import { deleteFileFromR2, deleteFolderMarkerInR2 } from '../services/r2Service.js';
import { getFolderR2Key } from './folderController.js';
import { isR2Configured, R2_CONFIG } from '../config/r2.js';

export const DEFAULT_MAX_UPLOAD_SIZE_MB = 25;
export const DEFAULT_ALLOWED_EXTENSIONS = [
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
];

/**
 * Helper to fetch or initialize system setting document
 */
export const getOrCreateSettings = async () => {
  if (mongoose.connection.readyState !== 1) {
    return {
      maxUploadSizeMB: DEFAULT_MAX_UPLOAD_SIZE_MB,
      allowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
      publicSharingEnabled: true,
      defaultShareExpirationDays: 30,
    };
  }

  let settings = await SystemSetting.findOne({ key: 'cloudxen_config' });
  if (!settings) {
    settings = await SystemSetting.create({
      key: 'cloudxen_config',
      maxUploadSizeMB: DEFAULT_MAX_UPLOAD_SIZE_MB,
      allowedExtensions: [...DEFAULT_ALLOWED_EXTENSIONS],
      publicSharingEnabled: true,
      defaultShareExpirationDays: 30,
    });
  }
  return settings;
};

/**
 * GET /api/settings/upload-rules
 * Any authenticated user: Fetch active allowed file extensions & max upload size
 */
export const getUploadRules = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.status(200).json({
      success: true,
      data: {
        maxUploadSizeMB: settings.maxUploadSizeMB ?? DEFAULT_MAX_UPLOAD_SIZE_MB,
        allowedExtensions: Array.isArray(settings.allowedExtensions)
          ? settings.allowedExtensions
          : [...DEFAULT_ALLOWED_EXTENSIONS],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/settings
 * Admin only: Fetch all settings, live storage stats, and connection health
 */
export const getSettings = async (req, res, next) => {
  try {
    const isMongoOk = mongoose.connection.readyState === 1;

    let settings = {
      maxUploadSizeMB: 25,
      allowedExtensions: [
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
      publicSharingEnabled: true,
      defaultShareExpirationDays: 30,
    };

    let stats = {
      totalDocuments: 0,
      trashDocuments: 0,
      activeStorageBytes: 0,
      trashStorageBytes: 0,
      totalFolders: 0,
      totalUsers: 0,
    };

    if (isMongoOk) {
      settings = await getOrCreateSettings();

      const [activeDocs, trashDocs, totalFolders, totalUsers] = await Promise.all([
        Document.find({ isDeleted: false }).select('fileSize'),
        Document.find({ isDeleted: true }).select('fileSize'),
        Folder.countDocuments({ isDeleted: false }),
        User.countDocuments(),
      ]);

      const activeStorageBytes = activeDocs.reduce(
        (sum, d) => sum + (d.fileSize || 0),
        0
      );
      const trashStorageBytes = trashDocs.reduce(
        (sum, d) => sum + (d.fileSize || 0),
        0
      );

      stats = {
        totalDocuments: activeDocs.length,
        trashDocuments: trashDocs.length,
        activeStorageBytes,
        trashStorageBytes,
        totalFolders,
        totalUsers,
      };
    }

    const r2Status = {
      configured: isR2Configured(),
      bucketName: R2_CONFIG.bucketName || 'Not configured',
      endpoint: R2_CONFIG.endpoint ? 'Connected' : 'Missing Endpoint',
    };

    const mongoStatus = {
      connected: isMongoOk,
      dbName: mongoose.connection.name || 'document_management_db',
    };

    res.status(200).json({
      success: true,
      data: {
        settings,
        stats,
        infrastructure: {
          mongo: mongoStatus,
          r2: r2Status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Admin only: Update configuration
 */
export const updateSettings = async (req, res, next) => {
  try {
    const {
      maxUploadSizeMB,
      allowedExtensions,
      publicSharingEnabled,
      defaultShareExpirationDays,
    } = req.body;

    const settings = await getOrCreateSettings();

    if (maxUploadSizeMB !== undefined) {
      settings.maxUploadSizeMB = Math.max(1, Math.min(500, Number(maxUploadSizeMB)));
    }
    if (Array.isArray(allowedExtensions)) {
      settings.allowedExtensions = allowedExtensions.map((ext) =>
        ext.toLowerCase().trim().replace(/^\./, '')
      );
    }
    if (publicSharingEnabled !== undefined) {
      settings.publicSharingEnabled = Boolean(publicSharingEnabled);
    }
    if (defaultShareExpirationDays !== undefined) {
      settings.defaultShareExpirationDays = Math.max(0, Number(defaultShareExpirationDays));
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/purge-trash
 * Admin only: Permanently delete all soft-deleted documents from DB and Cloudflare R2
 */
export const purgeAllTrash = async (req, res, next) => {
  try {
    const trashDocs = await Document.find({ isDeleted: true });
    let freedBytes = 0;
    let purgedR2Count = 0;

    for (const doc of trashDocs) {
      freedBytes += doc.fileSize || 0;
      const objectKey = doc.r2Key || doc.fileKey;
      if (objectKey) {
        try {
          await deleteFileFromR2(objectKey);
          purgedR2Count++;
        } catch (err) {
          console.warn(`[Purge Trash R2 Error] ${objectKey}:`, err.message);
        }
      }
    }

    // Permanently remove soft-deleted documents & folders from database
    const docResult = await Document.deleteMany({ isDeleted: true });
    const folderResult = await Folder.deleteMany({ isDeleted: true });

    res.status(200).json({
      success: true,
      message: `Trash permanently purged. Freed ${(freedBytes / (1024 * 1024)).toFixed(2)} MB.`,
      data: {
        purgedDocuments: docResult.deletedCount,
        purgedFolders: folderResult.deletedCount,
        freedBytes,
        purgedR2Count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/users
 * Admin only: Create a user account
 */
export const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' ? 'admin' : 'user',
    });

    res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully`,
      data: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settings/users/:id/reset-password
 * Admin only: Reset password for any user
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    targetUser.password = newPassword;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${targetUser.email}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/settings/users/:id
 * Admin only: Permanently delete a user AND cascade-delete all their folders, documents, and R2 objects
 */
export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      });
    }

    if (String(req.user?._id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own currently signed-in administrator account.',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // 1. Find all documents owned by this user (both active and trashed)
    const userDocs = await Document.find({ owner: targetUser._id });
    let deletedR2Files = 0;

    for (const doc of userDocs) {
      const objectKey = doc.r2Key || doc.fileKey;
      if (objectKey) {
        try {
          await deleteFileFromR2(objectKey);
          deletedR2Files++;
        } catch (err) {
          console.warn(`[Delete User R2 File Error] ${objectKey}:`, err.message);
        }
      }
    }

    // 2. Find all folders owned by this user and remove R2 folder markers
    const userFolders = await Folder.find({ owner: targetUser._id });
    for (const folder of userFolders) {
      try {
        const markerKey = await getFolderR2Key(folder);
        await deleteFolderMarkerInR2(markerKey);
      } catch (err) {
        console.warn(`[Delete User R2 Folder Marker Error] ${folder.name}:`, err.message);
      }
    }

    // 3. Delete all owned documents & folders from MongoDB
    const [docDeleteResult, folderDeleteResult] = await Promise.all([
      Document.deleteMany({ owner: targetUser._id }),
      Folder.deleteMany({ owner: targetUser._id }),
      // Clean up any dangling sharedWith entries referencing this user
      Document.updateMany(
        { 'sharedWith.user': targetUser._id },
        { $pull: { sharedWith: { user: targetUser._id } } }
      ),
      Folder.updateMany(
        { 'sharedWith.user': targetUser._id },
        { $pull: { sharedWith: { user: targetUser._id } } }
      ),
    ]);

    // 4. Delete the User account itself
    await User.deleteOne({ _id: targetUser._id });

    res.status(200).json({
      success: true,
      message: `Account "${targetUser.name}" and all associated data (${folderDeleteResult.deletedCount} folders, ${docDeleteResult.deletedCount} files) have been permanently deleted.`,
      data: {
        deletedUserId: targetUser._id,
        deletedDocuments: docDeleteResult.deletedCount,
        deletedFolders: folderDeleteResult.deletedCount,
        deletedR2Files,
      },
    });
  } catch (error) {
    next(error);
  }
};

