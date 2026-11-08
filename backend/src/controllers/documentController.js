import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { Folder } from '../models/Folder.js';
import { isR2Configured } from '../config/r2.js';
import {
  uploadFileToR2,
  getFileStreamFromR2,
  deleteFileFromR2,
  checkObjectExistsInR2,
  createFolderMarkerInR2,
} from '../services/r2Service.js';
import { getFolderR2Key, buildAncestors } from './folderController.js';

// Pure dynamic in-memory store for documents if MongoDB is temporarily offline
let memoryDocuments = [];

const isMongoAvailable = () => mongoose.connection.readyState === 1;

// Helper to deduce category
const getCategoryByExt = (ext) => {
  switch (ext) {
    case '.pdf':
    case '.doc':
    case '.docx':
      return 'Document';
    case '.xls':
    case '.xlsx':
    case '.csv':
      return 'Spreadsheet';
    case '.ppt':
    case '.pptx':
      return 'Presentation';
    case '.txt':
    case '.md':
      return 'Text';
    default:
      return 'Other';
  }
};

/**
 * Upload single document (Hybrid: MongoDB for metadata, Cloudflare R2 for file storage)
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or invalid file format.',
      });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let folder = req.body.folder || 'Team Folder';
    let folderId = req.body.folderId || null;
    const ownerId = req.user?._id || null;
    const ownerName = req.user?.name || req.body.owner || 'Administrator';
    const author = ownerName;
    const category = getCategoryByExt(ext);

    // Resolve folderId and folderDoc if one was provided
    let folderDoc = null;
    if (isMongoAvailable()) {
      if (folderId && mongoose.Types.ObjectId.isValid(folderId)) {
        folderDoc = await Folder.findById(folderId);
        if (folderDoc) {
          folder = folderDoc.name;
        }
      } else if (folder && folder !== 'Team Folder') {
        folderDoc = await Folder.findOne({ name: folder, isDeleted: false });
        if (folderDoc) {
          folderId = folderDoc._id;
        }
      }
    }

    let storageType = 'r2';
    let r2Key = null;
    let r2Bucket = null;
    let r2Url = null;

    if (!isR2Configured()) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}
      return res.status(500).json({
        success: false,
        message: 'Cloudflare R2 is not configured in backend/.env',
      });
    }

    let destinationKey;
    if (folderDoc) {
      const folderPrefix = await getFolderR2Key(folderDoc);
      destinationKey = `${folderPrefix}${filename}`;
      // Ensure folder marker exists in R2
      try {
        await createFolderMarkerInR2(folderPrefix);
      } catch (_) {}
    } else {
      const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '_');
      destinationKey = `documents/${sanitizedFolder}/${filename}`;
      try {
        await createFolderMarkerInR2(`documents/${sanitizedFolder}/`);
      } catch (_) {}
    }

    try {
      const r2Result = await uploadFileToR2(filePath, destinationKey, mimetype);
      if (!r2Result.uploadedToR2) {
        throw new Error(r2Result.message || 'Could not upload file to Cloudflare R2');
      }

      r2Key = r2Result.key;
      r2Bucket = r2Result.bucket;
      r2Url = r2Result.publicUrl;

      // Delete temporary local file immediately so zero files remain in codebase
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn('Failed to delete temporary local file:', cleanupErr.message);
      }
    } catch (r2Err) {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}

      console.error('[Cloudflare R2 Upload Error]:', r2Err.message);
      return res.status(502).json({
        success: false,
        message: `Cloudflare R2 Error: ${r2Err.message}. Ensure Cloudflare edge certificates and bucket permissions are active.`,
      });
    }

    const finalFilePath = r2Url || `r2://${destinationKey}`;

    let doc;
    if (isMongoAvailable()) {
      doc = await Document.create({
        name: originalname,
        originalName: originalname,
        fileName: filename,
        filePath: finalFilePath,
        fileSize: size,
        mimeType: mimetype,
        extension: ext,
        folder,
        folderId,
        category,
        owner: ownerId,
        ownerName,
        author,
        storageType,
        r2Key,
        r2Bucket,
        r2Url,
      });
    } else {
      doc = {
        _id: `doc-${Date.now()}`,
        name: originalname,
        originalName: originalname,
        fileName: filename,
        filePath: finalFilePath,
        fileSize: size,
        mimeType: mimetype,
        extension: ext,
        folder,
        folderId,
        category,
        owner: ownerId,
        ownerName,
        author,
        storageType,
        r2Key,
        r2Bucket,
        r2Url,
        isFavorite: false,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryDocuments.unshift(doc);
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded directly to Cloudflare R2 and synced to database',
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to build full location breadcrumb trail for a document
 */
const resolveDocAncestors = async (docObj, folderCache = new Map()) => {
  if (!docObj.folderId) {
    return [];
  }
  const fId = String(docObj.folderId);
  if (folderCache.has(fId)) {
    return folderCache.get(fId);
  }

  let trail = [];
  if (isMongoAvailable() && mongoose.isValidObjectId(fId)) {
    const folderDoc = await Folder.findById(fId).select('_id name parentId');
    if (folderDoc) {
      const parentAncestors = await buildAncestors(folderDoc);
      trail = [...parentAncestors, { _id: folderDoc._id.toString(), name: folderDoc.name }];
    }
  }

  folderCache.set(fId, trail);
  return trail;
};

/**
 * Get all documents
 * GET /api/documents
 */
export const getDocuments = async (req, res, next) => {
  try {
    const { folder, folderId, category, isFavorite, isDeleted, search, userId, sharedOnly } = req.query;

    if (isMongoAvailable()) {
      const query = {};

      // Role and Ownership Scoping:
      if (req.user?.role === 'admin' && userId) {
        // Admin inspecting a specific user's documents
        query.owner = userId;
      } else if (req.user?.role === 'admin' && !sharedOnly && !userId) {
        // Admin master view (sees all files)
      } else if (sharedOnly === 'true') {
        // Strictly files explicitly shared with this user
        query['sharedWith.user'] = req.user._id;
      } else {
        // Regular user: strictly their own files
        query.owner = req.user._id;
      }
      if (folderId !== undefined) {
        if (folderId === 'null' || folderId === 'root' || folderId === '') {
          // Strict root scoping: only documents not inside any subfolder
          query.folderId = null;
        } else if (mongoose.Types.ObjectId.isValid(folderId)) {
          query.$or = [{ folderId }, { folder: folderId }];
        } else {
          query.folder = folderId;
        }
      } else if (folder) {
        query.folder = folder;
      }
      if (category && category !== 'All') query.category = category;
      if (isFavorite !== undefined) query.isFavorite = isFavorite === 'true';
      query.isDeleted = isDeleted === 'true';

      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      const docs = await Document.find(query).sort({ isPinned: -1, createdAt: -1 });

      // AUTOMATIC TWO-WAY CLOUDFLARE SYNC (Shelf-Check):
      // Verify R2 files exist; if deleted directly from Cloudflare R2, purge the orphaned DB record
      const validDocs = [];
      const deletedDocIds = [];

      await Promise.all(
        docs.map(async (doc) => {
          if (doc.storageType === 'r2' && doc.r2Key) {
            const exists = await checkObjectExistsInR2(doc.r2Key);
            if (!exists) {
              deletedDocIds.push(doc._id);
              return;
            }
          }
          validDocs.push(doc);
        })
      );

      if (deletedDocIds.length > 0) {
        await Document.deleteMany({ _id: { $in: deletedDocIds } });
        console.log(`[Auto-Sync] Pruned ${deletedDocIds.length} document(s) deleted directly from Cloudflare R2.`);
      }

      const folderCache = new Map();
      const enrichedDocs = await Promise.all(
        validDocs.map(async (doc) => {
          const docObj = doc.toObject ? doc.toObject() : { ...doc };
          docObj.ancestors = await resolveDocAncestors(docObj, folderCache);
          return docObj;
        })
      );

      return res.status(200).json({
        success: true,
        count: enrichedDocs.length,
        data: enrichedDocs,
      });
    }

    // In-memory fallback
    let results = [...memoryDocuments];
    const showDeleted = isDeleted === 'true';
    results = results.filter((d) => Boolean(d.isDeleted) === showDeleted);

    if (folderId !== undefined) {
      if (folderId === 'null' || folderId === 'root' || folderId === '') {
        results = results.filter((d) => !d.folderId);
      } else {
        results = results.filter(
          (d) => String(d.folderId) === String(folderId) || d.folder === folderId
        );
      }
    } else if (folder) {
      results = results.filter((d) => d.folder === folder);
    }
    if (category && category !== 'All') {
      results = results.filter((d) => d.category === category);
    }
    if (isFavorite !== undefined) {
      results = results.filter((d) => d.isFavorite === (isFavorite === 'true'));
    }
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter((d) => d.name.toLowerCase().includes(lower));
    }

    const validResults = [];
    const missingIds = [];

    await Promise.all(
      results.map(async (doc) => {
        if (doc.storageType === 'r2' && doc.r2Key) {
          const exists = await checkObjectExistsInR2(doc.r2Key);
          if (!exists) {
            missingIds.push(doc._id);
            return;
          }
        }
        validResults.push(doc);
      })
    );

    if (missingIds.length > 0) {
      memoryDocuments = memoryDocuments.filter((d) => !missingIds.includes(d._id));
    }

    const memFolderCache = new Map();
    const enrichedResults = await Promise.all(
      validResults.map(async (doc) => {
        const docObj = { ...doc };
        docObj.ancestors = await resolveDocAncestors(docObj, memFolderCache);
        return docObj;
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedResults.length,
      data: enrichedResults,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document by ID
 * GET /api/documents/:id
 */
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let doc;
    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      doc = await Document.findById(id);
    } else {
      doc = memoryDocuments.find((d) => String(d._id) === id);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (doc.storageType === 'r2' && doc.r2Key) {
      const exists = await checkObjectExistsInR2(doc.r2Key);
      if (!exists) {
        if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
          await Document.findByIdAndDelete(id);
        } else {
          memoryDocuments = memoryDocuments.filter((d) => String(d._id) !== id);
        }
        return res.status(404).json({
          success: false,
          message: 'Document was deleted directly from Cloudflare R2 storage',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download document (Streams from Cloudflare R2 if stored in R2, or local disk)
 * GET /api/documents/:id/download
 */
export const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    let doc;
    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      doc = await Document.findById(id);
    } else {
      doc = memoryDocuments.find((d) => String(d._id) === id);
    }

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for download',
      });
    }

    const downloadFileName = encodeURIComponent(doc.originalName || doc.name);

    // 1. If stored in Cloudflare R2
    if (doc.storageType === 'r2' && doc.r2Key && isR2Configured()) {
      const exists = await checkObjectExistsInR2(doc.r2Key);
      if (!exists) {
        if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
          await Document.findByIdAndDelete(id);
        }
        return res.status(404).json({
          success: false,
          message: 'Document was deleted directly from Cloudflare R2 storage',
        });
      }

      try {
        const stream = await getFileStreamFromR2(doc.r2Key);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${downloadFileName}"`
        );
        res.setHeader(
          'Content-Type',
          doc.mimeType || 'application/octet-stream'
        );
        return stream.pipe(res);
      } catch (r2Error) {
        console.warn('R2 stream failed, falling back to local file if available:', r2Error.message);
      }
    }

    // 2. If stored on local disk
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      return res.download(doc.filePath, doc.originalName || doc.name);
    }

    // 3. Fallback mock stream for pre-seeded documents
    const sampleContent = Buffer.from(
      `Document: ${doc.name}\nCategory: ${doc.category}\nAuthor: ${doc.author}\nDownloaded from Document Management System`
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFileName}"`
    );
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    return res.send(sampleContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle favorite status
 * PATCH /api/documents/:id/favorite
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      const doc = await Document.findById(id);
      if (!doc) {
        return res
          .status(404)
          .json({ success: false, message: 'Document not found' });
      }
      doc.isFavorite = !doc.isFavorite;
      await doc.save();
      return res.status(200).json({ success: true, data: doc });
    }

    const docIndex = memoryDocuments.findIndex((d) => String(d._id) === id);
    if (docIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }
    memoryDocuments[docIndex].isFavorite =
      !memoryDocuments[docIndex].isFavorite;

    res.status(200).json({
      success: true,
      data: memoryDocuments[docIndex],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Move document to Trash (soft delete)
 * DELETE /api/documents/:id
 */
export const moveToTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      const doc = await Document.findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!doc) {
        return res
          .status(404)
          .json({ success: false, message: 'Document not found' });
      }
      return res
        .status(200)
        .json({ success: true, message: 'Moved to trash', data: doc });
    }

    const docIndex = memoryDocuments.findIndex((d) => String(d._id) === id);
    if (docIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }
    memoryDocuments[docIndex].isDeleted = true;
    memoryDocuments[docIndex].deletedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Moved to trash',
      data: memoryDocuments[docIndex],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Restore document from Trash
 * PATCH /api/documents/:id/restore
 */
export const restoreFromTrash = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      const doc = await Document.findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true }
      );
      if (!doc) {
        return res
          .status(404)
          .json({ success: false, message: 'Document not found' });
      }
      return res
        .status(200)
        .json({ success: true, message: 'Document restored', data: doc });
    }

    const docIndex = memoryDocuments.findIndex((d) => String(d._id) === id);
    if (docIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }
    memoryDocuments[docIndex].isDeleted = false;
    memoryDocuments[docIndex].deletedAt = null;

    res.status(200).json({
      success: true,
      message: 'Document restored',
      data: memoryDocuments[docIndex],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete document (Deletes from Cloudflare R2 and local disk)
 * DELETE /api/documents/:id/permanent
 */
export const deletePermanently = async (req, res, next) => {
  try {
    const { id } = req.params;

    let doc;
    if (isMongoAvailable() && mongoose.isValidObjectId(id)) {
      doc = await Document.findByIdAndDelete(id);
    } else {
      const idx = memoryDocuments.findIndex((d) => String(d._id) === id);
      if (idx !== -1) {
        doc = memoryDocuments.splice(idx, 1)[0];
      }
    }

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Document not found' });
    }

    // 1. Delete from Cloudflare R2 if stored there
    if (doc.storageType === 'r2' && doc.r2Key) {
      try {
        await deleteFileFromR2(doc.r2Key);
      } catch (err) {
        console.warn('Failed to delete object from R2:', err.message);
      }
    }

    // 2. Clean up local disk file if exists
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        console.warn('Could not delete physical local file:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted from database and storage',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reconcile & Synchronize database records with Cloudflare R2
 * POST /api/documents/sync
 */
export const syncWithCloudflare = async (req, res, next) => {
  try {
    let prunedCount = 0;
    if (isMongoAvailable()) {
      const allR2Docs = await Document.find({ storageType: 'r2' });
      const deletedDocIds = [];

      await Promise.all(
        allR2Docs.map(async (doc) => {
          if (doc.r2Key) {
            const exists = await checkObjectExistsInR2(doc.r2Key);
            if (!exists) {
              deletedDocIds.push(doc._id);
            }
          }
        })
      );

      if (deletedDocIds.length > 0) {
        await Document.deleteMany({ _id: { $in: deletedDocIds } });
        prunedCount = deletedDocIds.length;
      }
    } else {
      const missingIds = [];
      await Promise.all(
        memoryDocuments.map(async (doc) => {
          if (doc.storageType === 'r2' && doc.r2Key) {
            const exists = await checkObjectExistsInR2(doc.r2Key);
            if (!exists) missingIds.push(doc._id);
          }
        })
      );
      if (missingIds.length > 0) {
        memoryDocuments = memoryDocuments.filter((d) => !missingIds.includes(d._id));
        prunedCount = missingIds.length;
      }
    }

    res.status(200).json({
      success: true,
      message: `Cloudflare R2 sync completed. ${prunedCount} orphaned file(s) pruned.`,
      prunedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Pin Document to Top (Max 8 per folder/root)
 * PATCH /api/documents/:id/pin
 */
export const togglePinDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isOwner = doc.owner && doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to pin this document' });
    }

    const nextPinState = !doc.isPinned;

    if (nextPinState) {
      const currentPinnedCount = await Document.countDocuments({
        owner: doc.owner || req.user._id,
        folderId: doc.folderId,
        isPinned: true,
        isDeleted: false,
      });

      if (currentPinnedCount >= 8) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 8 pinned documents reached for this directory.',
        });
      }
    }

    doc.isPinned = nextPinState;
    doc.pinnedAt = nextPinState ? new Date() : null;
    await doc.save();

    res.status(200).json({
      success: true,
      message: nextPinState ? 'Document pinned to top' : 'Document unpinned',
      data: {
        _id: doc._id,
        isPinned: doc.isPinned,
        pinnedAt: doc.pinnedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
