import mongoose from 'mongoose';
import { ZipArchive } from 'archiver';
import fs from 'fs';
import path from 'path';
import { Folder } from '../models/Folder.js';
import { Document } from '../models/Document.js';
import {
  getFileStreamFromR2,
  createFolderMarkerInR2,
  deleteFolderMarkerInR2,
} from '../services/r2Service.js';

// In-memory fallback repository
let memoryFolders = [];

const isMongoAvailable = () => mongoose.connection.readyState === 1;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Helper to build the ancestor trail for a given folder
 */
export const buildAncestors = async (folder) => {
  const ancestors = [];
  let currentParentId = folder.parentId;

  while (currentParentId) {
    if (isMongoAvailable()) {
      const parent = await Folder.findById(currentParentId).select('_id name parentId');
      if (!parent) break;
      ancestors.unshift({ _id: parent._id.toString(), name: parent.name });
      currentParentId = parent.parentId;
    } else {
      const parent = memoryFolders.find((f) => String(f._id) === String(currentParentId));
      if (!parent) break;
      ancestors.unshift({ _id: String(parent._id), name: parent.name });
      currentParentId = parent.parentId;
    }
  }

  return ancestors;
};

/**
 * Generate full hierarchical Cloudflare R2 folder key prefix
 * e.g., documents/Parent/Subfolder/
 */
export const getFolderR2Key = async (folder) => {
  if (!folder) return 'documents/';
  const ancestors = await buildAncestors(folder);
  const parts = [...ancestors.map((a) => a.name), folder.name].map((n) =>
    n.replace(/[^a-zA-Z0-9_-]/g, '_')
  );
  return `documents/${parts.join('/')}/`;
};

/**
 * Sync all active folders to Cloudflare R2 by ensuring 0-byte markers exist
 */
export const ensureAllFolderMarkersInR2 = async () => {
  try {
    if (isMongoAvailable()) {
      const activeFolders = await Folder.find({ isDeleted: false });
      for (const f of activeFolders) {
        const markerKey = await getFolderR2Key(f);
        await createFolderMarkerInR2(markerKey);
      }
    }
  } catch (err) {
    console.warn('[Sync Folder Markers Warning]:', err.message);
  }
};

/**
 * Helper to recursively find all descendant folder IDs
 */
const getDescendantFolderIds = async (folderId) => {
  const descendantIds = [folderId.toString()];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    let children = [];
    if (isMongoAvailable()) {
      children = await Folder.find({ parentId: currentId, isDeleted: false }).select('_id');
      for (const child of children) {
        descendantIds.push(child._id.toString());
        queue.push(child._id);
      }
    } else {
      children = memoryFolders.filter(
        (f) => String(f.parentId) === String(currentId) && !f.isDeleted
      );
      for (const child of children) {
        descendantIds.push(String(child._id));
        queue.push(child._id);
      }
    }
  }

  return descendantIds;
};

/**
 * Get Folders
 * Supports ?parentId=<id> or ?parentId=null or ?all=true
 * GET /api/folders
 */
export const getFolders = async (req, res, next) => {
  try {
    const { parentId, all, userId, isFavorite } = req.query;

    if (isMongoAvailable()) {
      const query = { isDeleted: false };

      // Scoped ownership check:
      if (req.user?.role === 'admin' && userId) {
        query.owner = userId;
      } else if (req.query.sharedOnly === 'true') {
        query['sharedWith.user'] = req.user._id;
      } else if (req.user?.role !== 'admin') {
        // Regular users can only fetch their own folders
        query.owner = req.user._id;
      }

      if (isFavorite === 'true') {
        query.isFavorite = true;
        // Don't constrain to root parentId if querying favorites from all depths
        if (parentId && parentId !== 'null' && parentId !== 'root') {
          query.parentId = parentId;
        }
      } else if (all === 'true') {
        // Return all folders regardless of parent
      } else if (parentId === 'null' || parentId === 'root' || parentId === '' || parentId === undefined) {
        query.parentId = null;
      } else {
        query.parentId = parentId;
      }

      const folders = await Folder.find(query).sort({ isPinned: -1, createdAt: -1 });

      // Compute subfolders and files count for each folder + ancestors
      const enrichedFolders = await Promise.all(
        folders.map(async (f) => {
          const [subfoldersCount, filesCount, ancestors] = await Promise.all([
            Folder.countDocuments({ parentId: f._id, isDeleted: false }),
            Document.countDocuments({
              $or: [{ folderId: f._id }, { folder: f.name }],
              isDeleted: false,
            }),
            buildAncestors(f),
          ]);

          return {
            ...f.toObject(),
            subfoldersCount,
            filesCount,
            ancestors,
          };
        })
      );

      return res.status(200).json({
        success: true,
        count: enrichedFolders.length,
        data: enrichedFolders,
      });
    }

    // In-memory fallback
    let results = memoryFolders.filter((f) => !f.isDeleted);
    if (isFavorite === 'true') {
      results = results.filter((f) => f.isFavorite === true);
    } else if (all !== 'true') {
      const parent =
        parentId === 'null' || parentId === 'root' || parentId === '' || parentId === undefined
          ? null
          : String(parentId);
      results = results.filter((f) => (f.parentId ? String(f.parentId) : null) === parent);
    }

    const enrichedResults = await Promise.all(
      results.map(async (f) => ({
        ...f,
        ancestors: await buildAncestors(f),
      }))
    );

    res.status(200).json({ success: true, count: enrichedResults.length, data: enrichedResults });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single folder details by ID or Name + Ancestor trail
 * GET /api/folders/:id
 */
export const getFolderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let folder = null;

    if (isMongoAvailable()) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        folder = await Folder.findOne({ _id: id, isDeleted: false });
      }
      if (!folder) {
        // Fallback search by exact name for backward compatibility
        folder = await Folder.findOne({ name: id, isDeleted: false });
      }

      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      const ancestors = await buildAncestors(folder);
      const [subfoldersCount, filesCount] = await Promise.all([
        Folder.countDocuments({ parentId: folder._id, isDeleted: false }),
        Document.countDocuments({
          $or: [{ folderId: folder._id }, { folder: folder.name }],
          isDeleted: false,
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          ...folder.toObject(),
          ancestors,
          subfoldersCount,
          filesCount,
        },
      });
    }

    // In-memory fallback
    folder = memoryFolders.find((f) => (String(f._id) === id || f.name === id) && !f.isDeleted);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const ancestors = await buildAncestors(folder);
    res.status(200).json({
      success: true,
      data: {
        ...folder,
        ancestors,
        subfoldersCount: 0,
        filesCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Folder (with Sibling Uniqueness Enforcement)
 * POST /api/folders
 */
export const createFolder = async (req, res, next) => {
  try {
    const { name, description, parentId, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const trimmedName = name.trim();
    let normalizedParentId = null;

    if (parentId && parentId !== 'null' && parentId !== 'root' && parentId !== '') {
      if (mongoose.Types.ObjectId.isValid(parentId)) {
        normalizedParentId = parentId;
      } else {
        // Check if parentId passed is a folder name
        if (isMongoAvailable()) {
          const parentFolder = await Folder.findOne({ name: parentId, isDeleted: false });
          if (parentFolder) normalizedParentId = parentFolder._id;
        }
      }
    }

    // ENFORCE SIBLING UNIQUENESS
    // Folders under the exact same parent and owner cannot have the same name (case-insensitive)
    if (isMongoAvailable()) {
      const ownerId = req.user?._id || null;
      const siblingQuery = {
        parentId: normalizedParentId,
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
        isDeleted: false,
      };
      if (ownerId) siblingQuery.owner = ownerId;

      const siblingExists = await Folder.findOne(siblingQuery);

      if (siblingExists) {
        return res.status(409).json({
          success: false,
          message: `A folder named "${trimmedName}" already exists in this location. Please choose a different name.`,
        });
      }

      const folder = await Folder.create({
        name: trimmedName,
        description: description || '',
        parentId: normalizedParentId,
        color: color || '#4361ee',
        owner: ownerId,
      });

      // Immediately create 0-byte directory marker in Cloudflare R2
      try {
        const markerKey = await getFolderR2Key(folder);
        await createFolderMarkerInR2(markerKey);
      } catch (r2Err) {
        console.warn('[R2 Folder Marker Creation Warning]:', r2Err.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: folder,
      });
    }

    // In-memory fallback
    const siblingExists = memoryFolders.find(
      (f) =>
        String(f.parentId || null) === String(normalizedParentId || null) &&
        f.name.toLowerCase() === trimmedName.toLowerCase() &&
        !f.isDeleted
    );

    if (siblingExists) {
      return res.status(409).json({
        success: false,
        message: `A folder named "${trimmedName}" already exists in this location. Please choose a different name.`,
      });
    }

    const folder = {
      _id: `folder-${Date.now()}`,
      name: trimmedName,
      description: description || '',
      parentId: normalizedParentId,
      color: color || '#4361ee',
      filesCount: 0,
      createdAt: new Date().toISOString(),
    };
    memoryFolders.unshift(folder);

    // Create R2 directory marker
    try {
      const markerKey = await getFolderR2Key(folder);
      await createFolderMarkerInR2(markerKey);
    } catch (r2Err) {
      console.warn('[R2 Folder Marker Creation Warning]:', r2Err.message);
    }

    res.status(201).json({ success: true, message: 'Folder created', data: folder });
  } catch (error) {
    next(error);
  }
};

/**
 * Rename Folder (with Sibling Uniqueness Enforcement)
 * PATCH /api/folders/:id/rename
 */
export const renameFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'New folder name is required' });
    }

    const trimmedName = name.trim();

    if (isMongoAvailable()) {
      const folder = await Folder.findOne({ _id: id, isDeleted: false });
      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      // Check sibling uniqueness excluding current folder
      const siblingExists = await Folder.findOne({
        _id: { $ne: folder._id },
        parentId: folder.parentId,
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
        isDeleted: false,
      });

      if (siblingExists) {
        return res.status(409).json({
          success: false,
          message: `A folder named "${trimmedName}" already exists in this location.`,
        });
      }

      const oldR2Key = await getFolderR2Key(folder);
      const oldName = folder.name;
      folder.name = trimmedName;
      await folder.save();
      const newR2Key = await getFolderR2Key(folder);

      // Reflect rename in Cloudflare R2 markers
      try {
        await createFolderMarkerInR2(newR2Key);
        await deleteFolderMarkerInR2(oldR2Key);
      } catch (r2Err) {
        console.warn('[R2 Folder Marker Rename Warning]:', r2Err.message);
      }

      // Cascade update document folder string so legacy lookups continue working
      await Document.updateMany(
        { $or: [{ folderId: folder._id }, { folder: oldName }] },
        { folder: trimmedName }
      );

      return res.status(200).json({
        success: true,
        message: 'Folder renamed successfully',
        data: folder,
      });
    }

    // In-memory fallback
    const folder = memoryFolders.find((f) => String(f._id) === id && !f.isDeleted);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const siblingExists = memoryFolders.find(
      (f) =>
        String(f._id) !== id &&
        String(f.parentId || null) === String(folder.parentId || null) &&
        f.name.toLowerCase() === trimmedName.toLowerCase() &&
        !f.isDeleted
    );

    if (siblingExists) {
      return res.status(409).json({
        success: false,
        message: `A folder named "${trimmedName}" already exists in this location.`,
      });
    }

    folder.name = trimmedName;
    res.status(200).json({ success: true, message: 'Folder renamed', data: folder });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Folder
 * ?mode=cascade (default: delete folder + all subfolders + files)
 * ?mode=unlink (delete folder only: move child subfolders & files to parent or root)
 * DELETE /api/folders/:id
 */
export const deleteFolder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mode = req.query.mode || 'cascade';

    if (isMongoAvailable()) {
      const folder = await Folder.findOne({ _id: id, isDeleted: false });
      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      if (mode === 'unlink') {
        // Remove R2 folder marker for this single folder
        try {
          const markerKey = await getFolderR2Key(folder);
          await deleteFolderMarkerInR2(markerKey);
        } catch (r2Err) {
          console.warn('[R2 Folder Marker Delete Warning]:', r2Err.message);
        }

        // Move immediate subfolders to this folder's parent
        await Folder.updateMany(
          { parentId: folder._id, isDeleted: false },
          { parentId: folder.parentId }
        );

        // Move immediate documents to this folder's parent or default Team Folder
        let parentFolderName = 'Team Folder';
        if (folder.parentId) {
          const parentFolder = await Folder.findById(folder.parentId);
          if (parentFolder) parentFolderName = parentFolder.name;
        }

        await Document.updateMany(
          { folderId: folder._id, isDeleted: false },
          { folderId: folder.parentId, folder: parentFolderName }
        );

        // Soft delete this single folder
        folder.isDeleted = true;
        folder.deletedAt = new Date();
        await folder.save();

        return res.status(200).json({
          success: true,
          message: 'Folder deleted. Contents were preserved and moved up one level.',
        });
      }

      // Default: CASCADE delete folder, all descendant folders, and all files
      const allTargetFolderIds = await getDescendantFolderIds(folder._id);

      // Clean up R2 folder markers for all cascade-deleted folders
      try {
        const foldersToClean = await Folder.find({ _id: { $in: allTargetFolderIds } });
        for (const f of foldersToClean) {
          const markerKey = await getFolderR2Key(f);
          await deleteFolderMarkerInR2(markerKey);
        }
      } catch (markerErr) {
        console.warn('[R2 Cascade Delete Markers Warning]:', markerErr.message);
      }

      // Soft delete all descendant folders
      await Folder.updateMany(
        { _id: { $in: allTargetFolderIds } },
        { isDeleted: true, deletedAt: new Date() }
      );

      // Soft delete all documents in those folders
      const deleteDocResult = await Document.updateMany(
        {
          $or: [
            { folderId: { $in: allTargetFolderIds } },
            { folder: folder.name },
          ],
          isDeleted: false,
        },
        { isDeleted: true, deletedAt: new Date() }
      );

      return res.status(200).json({
        success: true,
        message: `Folder and all its subfolders and ${deleteDocResult.modifiedCount} files were moved to trash.`,
      });
    }

    // In-memory fallback
    const folder = memoryFolders.find((f) => String(f._id) === id && !f.isDeleted);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    folder.isDeleted = true;
    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Download Folder as ZIP
 * Recursively packages all files inside folder and nested subfolders
 * GET /api/folders/:id/download-zip
 */
export const downloadFolderZip = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isMongoAvailable()) {
      return res.status(503).json({ success: false, message: 'Database required for zip archive' });
    }

    const rootFolder = await Folder.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { name: id },
      ],
      isDeleted: false,
    });

    if (!rootFolder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Build map of folderId -> relative path inside ZIP
    const folderPathMap = new Map();
    folderPathMap.set(rootFolder._id.toString(), '');

    // Queue to traverse hierarchy
    const queue = [{ id: rootFolder._id, path: '' }];

    while (queue.length > 0) {
      const current = queue.shift();
      const children = await Folder.find({ parentId: current.id, isDeleted: false });
      for (const child of children) {
        const childPath = current.path ? `${current.path}/${child.name}` : child.name;
        folderPathMap.set(child._id.toString(), childPath);
        queue.push({ id: child._id, path: childPath });
      }
    }

    const allFolderIds = Array.from(folderPathMap.keys());

    // Find all active documents in these folders
    const documents = await Document.find({
      $or: [
        { folderId: { $in: allFolderIds } },
        { folder: rootFolder.name },
      ],
      isDeleted: false,
    });

    // Prepare ZIP archive stream
    const archive = new ZipArchive({
      zlib: { level: 6 },
    });

    const safeFilename = `${rootFolder.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;

    res.attachment(safeFilename);
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('[Zip Error]:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to generate zip file' });
      }
    });

    // Add each document to the archive under its relative folder path
    for (const doc of documents) {
      const relativeDirPath =
        (doc.folderId && folderPathMap.get(doc.folderId.toString())) || '';
      const zipEntryName = relativeDirPath
        ? `${relativeDirPath}/${doc.originalName || doc.name}`
        : (doc.originalName || doc.name);

      if (doc.storageType === 'r2' && doc.r2Key) {
        try {
          const r2Stream = await getFileStreamFromR2(doc.r2Key);
          archive.append(r2Stream, { name: zipEntryName });
        } catch (r2Err) {
          console.warn(`[Zip Warning] Failed to stream from R2 (${doc.name}):`, r2Err.message);
          // Fallback to local if exists
          if (doc.filePath && fs.existsSync(doc.filePath)) {
            archive.file(doc.filePath, { name: zipEntryName });
          }
        }
      } else if (doc.filePath && fs.existsSync(doc.filePath)) {
        archive.file(doc.filePath, { name: zipEntryName });
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Pin Folder to Top (Max 8 per directory)
 * PATCH /api/folders/:id/pin
 */
export const togglePinFolder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findById(id);
    if (!folder || folder.isDeleted) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Permission check: Owner or Admin
    const isOwner = folder.owner && folder.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to pin this folder' });
    }

    const nextPinState = !folder.isPinned;

    if (nextPinState) {
      // Check maximum 8 pins in this scope (same parentId)
      const currentPinnedCount = await Folder.countDocuments({
        owner: folder.owner || req.user._id,
        parentId: folder.parentId,
        isPinned: true,
        isDeleted: false,
      });

      if (currentPinnedCount >= 8) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 8 pinned folders reached for this directory.',
        });
      }
    }

    folder.isPinned = nextPinState;
    folder.pinnedAt = nextPinState ? new Date() : null;
    await folder.save();

    res.status(200).json({
      success: true,
      message: nextPinState ? 'Folder pinned to top' : 'Folder unpinned',
      data: {
        _id: folder._id,
        isPinned: folder.isPinned,
        pinnedAt: folder.pinnedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Favorite Folder
 * PATCH /api/folders/:id/favorite
 */
export const toggleFavoriteFolder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      const folder = await Folder.findById(id);
      if (!folder || folder.isDeleted) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      const isOwner = folder.owner && folder.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to favorite this folder' });
      }

      folder.isFavorite = !folder.isFavorite;
      await folder.save();

      return res.status(200).json({
        success: true,
        message: folder.isFavorite ? 'Folder added to favorites' : 'Folder removed from favorites',
        data: folder,
      });
    }

    const folderIndex = memoryFolders.findIndex((f) => String(f._id) === id && !f.isDeleted);
    if (folderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    memoryFolders[folderIndex].isFavorite = !memoryFolders[folderIndex].isFavorite;

    res.status(200).json({
      success: true,
      message: memoryFolders[folderIndex].isFavorite
        ? 'Folder added to favorites'
        : 'Folder removed from favorites',
      data: memoryFolders[folderIndex],
    });
  } catch (error) {
    next(error);
  }
};
