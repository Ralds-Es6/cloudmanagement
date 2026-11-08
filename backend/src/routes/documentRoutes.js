import express from 'express';
import { documentUpload } from '../middlewares/upload.js';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  downloadDocument,
  toggleFavorite,
  togglePinDocument,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  syncWithCloudflare,
} from '../controllers/documentController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All document routes require authentication
router.use(protect);

// Synchronize database records with Cloudflare R2 (Admin only)
router.post('/sync', authorize('admin'), syncWithCloudflare);

// Document upload with strict document-only filter
router.post('/upload', documentUpload.single('file'), uploadDocument);

// Document listings and details
router.get('/', getDocuments);
router.get('/:id', getDocumentById);

// Document download
router.get('/:id/download', downloadDocument);

// Document interactions
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/pin', togglePinDocument);
router.delete('/:id', moveToTrash);
router.patch('/:id/restore', restoreFromTrash);

// Permanent deletion is strictly restricted to Admin
router.delete('/:id/permanent', authorize('admin'), deletePermanently);

export default router;
