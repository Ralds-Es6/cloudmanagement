import crypto from 'crypto';
import mongoose from 'mongoose';
import { Folder } from '../models/Folder.js';
import { Document } from '../models/Document.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { getFileStreamFromR2 } from '../services/r2Service.js';

const isMongoAvailable = () => mongoose.connection.readyState === 1;

/**
 * Generate or update share link for a Folder
 * POST /api/share/folder/:id
 */
export const generateFolderShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permission = 'viewer' } = req.body;

    const folder = await Folder.findById(id);
    if (!folder || folder.isDeleted) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Permission check: Owner or Admin only
    const isOwner = folder.owner && folder.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the folder owner can manage sharing.' });
    }

    const token = folder.shareLink?.token || crypto.randomBytes(16).toString('hex');
    folder.shareLink = {
      enabled: true,
      token,
      permission: ['viewer', 'editor'].includes(permission) ? permission : 'viewer',
      createdAt: new Date(),
    };
    await folder.save();

    res.status(200).json({
      success: true,
      message: 'Share link activated successfully',
      data: folder.shareLink,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable share link for a Folder
 * DELETE /api/share/folder/:id
 */
export const disableFolderShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const isOwner = folder.owner && folder.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the folder owner can disable sharing.' });
    }

    folder.shareLink = {
      enabled: false,
      token: null,
      permission: 'viewer',
      createdAt: null,
    };
    await folder.save();

    res.status(200).json({
      success: true,
      message: 'Share link disabled. Access is now strictly private.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate or update share link for a single Document
 * POST /api/share/document/:id
 */
export const generateDocumentShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permission = 'viewer' } = req.body;

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the document owner can manage sharing.' });
    }

    const token = doc.shareLink?.token || crypto.randomBytes(16).toString('hex');
    doc.shareLink = {
      enabled: true,
      token,
      permission: ['viewer', 'editor'].includes(permission) ? permission : 'viewer',
      createdAt: new Date(),
    };
    await doc.save();

    res.status(200).json({
      success: true,
      message: 'Document share link activated',
      data: doc.shareLink,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable share link for a single Document
 * DELETE /api/share/document/:id
 */
export const disableDocumentShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the document owner can disable sharing.' });
    }

    doc.shareLink = {
      enabled: false,
      token: null,
      permission: 'viewer',
      createdAt: null,
    };
    await doc.save();

    res.status(200).json({
      success: true,
      message: 'Document share link disabled',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a share token (Public lookup)
 * Returns either folder or document with complete folder structure isolation!
 * GET /api/share/resolve/:token
 */
export const resolveShareToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Check system-wide public sharing killswitch
    const systemSetting = await SystemSetting.findOne({ key: 'cloudxen_config' });
    if (systemSetting && systemSetting.publicSharingEnabled === false) {
      return res.status(403).json({
        success: false,
        message: 'Public link sharing is currently disabled by system administrator.',
      });
    }

    // Check Folder share link
    const folder = await Folder.findOne({ 'shareLink.token': token, 'shareLink.enabled': true, isDeleted: false })
      .populate('owner', 'name email');

    if (folder) {
      return res.status(200).json({
        success: true,
        type: 'folder',
        data: {
          _id: folder._id,
          name: folder.name,
          color: folder.color,
          permission: folder.shareLink.permission,
          ownerName: folder.owner?.name || 'Storage User',
          createdAt: folder.createdAt,
        },
      });
    }

    // Check Document share link
    const doc = await Document.findOne({ 'shareLink.token': token, 'shareLink.enabled': true, isDeleted: false })
      .populate('owner', 'name email');

    if (doc) {
      return res.status(200).json({
        success: true,
        type: 'document',
        data: {
          _id: doc._id,
          name: doc.name,
          originalName: doc.originalName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          extension: doc.extension,
          category: doc.category,
          permission: doc.shareLink.permission,
          author: doc.author,
          createdAt: doc.createdAt,
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: 'This share link is invalid, expired, or has been disabled by the owner.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get contents of a shared folder (Downward-only subtree scoping)
 * GET /api/share/folder/:token/contents
 */
export const getSharedFolderContents = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { parentId } = req.query;

    const rootSharedFolder = await Folder.findOne({
      'shareLink.token': token,
      'shareLink.enabled': true,
      isDeleted: false,
    });

    if (!rootSharedFolder) {
      return res.status(403).json({ success: false, message: 'Invalid or revoked share link' });
    }

    // The active target directory is either the rootSharedFolder or a descendant
    let targetFolderId = rootSharedFolder._id;
    if (parentId && parentId !== 'root' && parentId !== 'null' && parentId !== String(rootSharedFolder._id)) {
      // Verify that parentId is strictly a descendant of rootSharedFolder (NO CLIMBING UP!)
      let current = await Folder.findById(parentId);
      let isDescendant = false;
      while (current && current.parentId) {
        if (String(current.parentId) === String(rootSharedFolder._id)) {
          isDescendant = true;
          break;
        }
        current = await Folder.findById(current.parentId);
      }
      if (isDescendant) {
        targetFolderId = parentId;
      }
    }

    const [subfolders, documents] = await Promise.all([
      Folder.find({ parentId: targetFolderId, isDeleted: false }).sort({ name: 1 }),
      Document.find({ folderId: targetFolderId, isDeleted: false }).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      permission: rootSharedFolder.shareLink.permission,
      data: {
        currentFolderId: targetFolderId,
        isRoot: String(targetFolderId) === String(rootSharedFolder._id),
        subfolders,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream/Download single document via share token
 * GET /api/share/document/:token/download
 */
export const downloadSharedDocument = async (req, res, next) => {
  try {
    const { token } = req.params;

    const doc = await Document.findOne({
      'shareLink.token': token,
      'shareLink.enabled': true,
      isDeleted: false,
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or share link disabled' });
    }

    if (doc.storageType === 'r2' && doc.r2Key) {
      const s3Stream = await getFileStreamFromR2(doc.r2Key);
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(doc.originalName || doc.name)}"`
      );
      return s3Stream.pipe(res);
    }

    return res.status(404).json({ success: false, message: 'Physical file not found in storage' });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-pin shared folder/document to logged-in user's "Shared with me" list
 * POST /api/share/pin/:token
 */
export const pinSharedItem = async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    // Check Folder
    const folder = await Folder.findOne({ 'shareLink.token': token, 'shareLink.enabled': true, isDeleted: false });
    if (folder) {
      // Don't pin to own drive
      if (String(folder.owner) !== String(userId)) {
        const alreadyShared = folder.sharedWith.some((s) => String(s.user) === String(userId));
        if (!alreadyShared) {
          folder.sharedWith.push({
            user: userId,
            permission: folder.shareLink.permission,
            sharedAt: new Date(),
          });
          await folder.save();
        }
      }
      return res.status(200).json({ success: true, message: 'Folder pinned to your Shared with me' });
    }

    // Check Document
    const doc = await Document.findOne({ 'shareLink.token': token, 'shareLink.enabled': true, isDeleted: false });
    if (doc) {
      if (String(doc.owner) !== String(userId)) {
        const alreadyShared = doc.sharedWith.some((s) => String(s.user) === String(userId));
        if (!alreadyShared) {
          doc.sharedWith.push({
            user: userId,
            permission: doc.shareLink.permission,
            sharedAt: new Date(),
          });
          await doc.save();
        }
      }
      return res.status(200).json({ success: true, message: 'Document pinned to your Shared with me' });
    }

    res.status(404).json({ success: false, message: 'Invalid share token' });
  } catch (error) {
    next(error);
  }
};

