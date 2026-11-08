import mongoose from 'mongoose';

/**
 * Connect to MongoDB database with automatic offline fallback
 */
export const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/document_management_db';

  // 1. Attempt Primary connection (MongoDB Atlas Cloud)
  if (primaryUri) {
    try {
      console.log('[MongoDB] Attempting connection to primary database (Atlas Cloud)...');
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 10000, // 10s timeout to allow initial DNS SRV handshake
      });

      console.log(`[MongoDB] Connected successfully to Cloud: ${conn.connection.host}`);
      return conn;
    } catch (primaryError) {
      console.warn(`[MongoDB] Cloud Atlas connection failed: ${primaryError.message}`);
      console.warn('[MongoDB] No internet or cluster unreachable. Falling back to local MongoDB...');
    }
  }

  // 2. Fallback to Local MongoDB instance
  try {
    console.log(`[MongoDB] Connecting to local database: ${localUri}`);
    const localConn = await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log(`[MongoDB] Connected successfully to Local fallback: ${localConn.connection.host}`);
    return localConn;
  } catch (localError) {
    console.error(`[MongoDB] Local connection error: ${localError.message}`);
    console.warn('[MongoDB] Server will continue running, but database operations will fail until MongoDB is available.');
    return null;
  }
};

export const checkDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host || 'none',
    isCloud: mongoose.connection.host ? !mongoose.connection.host.includes('127.0.0.1') && !mongoose.connection.host.includes('localhost') : false,
  };
};

