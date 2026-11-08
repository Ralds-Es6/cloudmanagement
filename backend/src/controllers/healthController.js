import { checkDBStatus } from '../config/db.js';
import { R2_CONFIG } from '../config/r2.js';

export const getHealthStatus = (req, res) => {
  const mongoInfo = checkDBStatus();
  
  res.status(200).json({
    success: true,
    message: 'Backend API is running',
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
      },
      mongodb: {
        type: mongoInfo.isCloud ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB',
        status: mongoInfo.state,
        host: mongoInfo.host,
        connected: mongoInfo.state === 'connected',
      },
      cloudflareR2: {
        type: 'object storage',
        configured: R2_CONFIG.isConfigured,
        bucket: R2_CONFIG.bucketName || 'Not configured yet',
        endpoint: R2_CONFIG.endpoint ? 'Configured' : 'Missing',
      },
    },
  });
};

