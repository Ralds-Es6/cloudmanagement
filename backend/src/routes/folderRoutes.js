import express from 'express';
import {
  getFolders,
  getFolderById,
  createFolder,
  renameFolder,
  deleteFolder,
  downloadFolderZip,
  togglePinFolder,
  toggleFavoriteFolder,
} from '../controllers/folderController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// All folder routes require authentication
router.use(protect);

router.get('/', getFolders);
router.post('/', createFolder);
router.get('/:id', getFolderById);
router.patch('/:id/rename', renameFolder);
router.patch('/:id/pin', togglePinFolder);
router.patch('/:id/favorite', toggleFavoriteFolder);
router.delete('/:id', deleteFolder);
router.get('/:id/download-zip', downloadFolderZip);

export default router;
