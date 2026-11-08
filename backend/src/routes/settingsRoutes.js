import express from 'express';
import {
  getSettings,
  updateSettings,
  purgeAllTrash,
  createUserByAdmin,
  resetUserPassword,
} from '../controllers/settingsController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All settings routes are strictly Admin-only
router.use(protect);
router.use(authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/purge-trash', purgeAllTrash);
router.post('/users', createUserByAdmin);
router.post('/users/:id/reset-password', resetUserPassword);

export default router;

