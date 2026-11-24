import express from 'express';
import {
  getSettings,
  getUploadRules,
  updateSettings,
  purgeAllTrash,
  createUserByAdmin,
  resetUserPassword,
  deleteUserByAdmin,
} from '../controllers/settingsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All settings routes require authentication
router.use(protect);

// Accessible to all authenticated users so upload modals enforce live Admin rules
router.get('/upload-rules', getUploadRules);

// All remaining settings routes are strictly Admin-only
router.use(authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/purge-trash', purgeAllTrash);
router.post('/users', createUserByAdmin);
router.post('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUserByAdmin);

export default router;
