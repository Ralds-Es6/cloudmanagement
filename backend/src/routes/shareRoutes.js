import express from 'express';
import {
  generateFolderShareLink,
  disableFolderShareLink,
  generateDocumentShareLink,
  disableDocumentShareLink,
  resolveShareToken,
  getSharedFolderContents,
  downloadSharedDocument,
  pinSharedItem,
} from '../controllers/shareController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Owner / Authenticated Share Management
router.post('/folder/:id', protect, generateFolderShareLink);
router.delete('/folder/:id', protect, disableFolderShareLink);
router.post('/document/:id', protect, generateDocumentShareLink);
router.delete('/document/:id', protect, disableDocumentShareLink);
router.post('/pin/:token', protect, pinSharedItem);

// Public Link Resolution & Scoped Subtree Access
router.get('/resolve/:token', resolveShareToken);
router.get('/folder/:token/contents', getSharedFolderContents);
router.get('/document/:token/download', downloadSharedDocument);

export default router;

