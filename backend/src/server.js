import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { R2_CONFIG } from './config/r2.js';
import { ensureAllFolderMarkersInR2 } from './controllers/folderController.js';
import { seedAdminUser } from './controllers/authController.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  seedAdminUser();
  if (R2_CONFIG.isConfigured) {
    ensureAllFolderMarkersInR2().then(() => {
      console.log('[Cloudflare R2] Active folder directory markers synced.');
    });
  }
});

// Log R2 setup state on startup
if (R2_CONFIG.isConfigured) {
  console.log(`[Cloudflare R2] Configured for bucket: ${R2_CONFIG.bucketName}`);
} else {
  console.log('[Cloudflare R2] Pending configuration (Credentials in .env not filled yet)');
}

app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
});

