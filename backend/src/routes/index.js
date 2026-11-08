import express from 'express';
import healthRoutes from './healthRoutes.js';
import documentRoutes from './documentRoutes.js';
import folderRoutes from './folderRoutes.js';
import authRoutes from './authRoutes.js';
import shareRoutes from './shareRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);
router.use('/folders', folderRoutes);
router.use('/share', shareRoutes);
router.use('/settings', settingsRoutes);

export default router;
