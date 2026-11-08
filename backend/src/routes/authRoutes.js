import express from 'express';
import { login, register, getMe, getAllUsers, googleLogin } from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getAllUsers);

export default router;

