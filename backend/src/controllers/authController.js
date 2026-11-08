import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { Folder } from '../models/Folder.js';
import { Document } from '../models/Document.js';
import { verifyTurnstileToken } from '../services/turnstileService.js';

const isMongoAvailable = () => mongoose.connection.readyState === 1;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT signed token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'super_secure_document_management_jwt_secret_key_2026',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Seed initial accounts: Admin and User (configurable via .env)
 */
export const seedAdminUser = async () => {
  try {
    if (!isMongoAvailable()) return;

    // Clean up old obsolete editor/viewer test entries if present
    await User.deleteMany({ role: { $in: ['editor', 'viewer'] } });

    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@cloud.local').toLowerCase().trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

    const userEmail = (process.env.SEED_USER_EMAIL || 'user@cloud.local').toLowerCase().trim();
    const userPassword = process.env.SEED_USER_PASSWORD || 'user123';
    const userName = process.env.SEED_USER_NAME || 'Gerald Quinto';

    const seedAccounts = [
      {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      },
      {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: 'user',
      },
    ];

    // Remove any previous peer test accounts if present
    await User.deleteMany({ email: 'alex@cloud.local' });

    for (const u of seedAccounts) {
      const user = await User.findOne({ email: u.email }).select('+password');
      if (!user) {
        await User.create(u);
        console.log(`[Auth] Seeded new ${u.role}: ${u.email}`);
      } else {
        // Automatically sync name, role, and password if changed in .env
        let needsSave = false;
        if (user.role !== u.role) {
          user.role = u.role;
          needsSave = true;
        }
        if (u.name && user.name !== u.name) {
          user.name = u.name;
          needsSave = true;
        }

        const isPasswordMatch = await user.matchPassword(u.password);
        if (!isPasswordMatch) {
          user.password = u.password;
          needsSave = true;
          console.log(`[Auth] Detected changed password in .env for ${u.role} (${u.email}). Updating credentials...`);
        }

        if (needsSave) {
          await user.save();
          console.log(`[Auth] Successfully updated credentials for ${u.role} (${u.email}) from .env`);
        }
      }
    }
  } catch (err) {
    console.warn('[Auth Seed Warning]:', err.message);
  }
};

/**
 * Login user & return token
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    // Cloudflare Turnstile Verification
    if (process.env.TURNSTILE_SECRET_KEY) {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
      const verification = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!verification.success) {
        return res.status(403).json({
          success: false,
          message: verification.message,
        });
      }
    }

    if (!isMongoAvailable()) {
      // In-memory mock login fallback
      const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@cloud.local').toLowerCase().trim();
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
      const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

      const userEmail = (process.env.SEED_USER_EMAIL || 'user@cloud.local').toLowerCase().trim();
      const userPassword = process.env.SEED_USER_PASSWORD || 'user123';
      const userName = process.env.SEED_USER_NAME || 'Gerald Quinto';

      const normalizedInput = email.toLowerCase().trim();

      if (
        (normalizedInput === adminEmail || normalizedInput === 'admin') &&
        password === adminPassword
      ) {
        const mockUser = {
          _id: 'mock-admin-id',
          name: adminName,
          email: adminEmail,
          role: 'admin',
        };
        const token = generateToken(mockUser);
        return res.status(200).json({
          success: true,
          token,
          user: mockUser,
        });
      }

      if (normalizedInput === userEmail && password === userPassword) {
        const mockUser = {
          _id: 'mock-user-id',
          name: userName,
          email: userEmail,
          role: 'user',
        };
        const token = generateToken(mockUser);
        return res.status(200).json({
          success: true,
          token,
          user: mockUser,
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new user with assigned role (Admin only or setup)
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (!isMongoAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Database is required for registration',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const validRole = ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: validRole,
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with their storage metrics (Admin only)
 * GET /api/auth/users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    if (!isMongoAvailable()) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const users = await User.find().select('-password').sort({ createdAt: 1 });

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const [folderCount, docs] = await Promise.all([
          Folder.countDocuments({ owner: u._id, isDeleted: false }),
          Document.find({ owner: u._id, isDeleted: false }).select('fileSize'),
        ]);

        const fileCount = docs.length;
        const totalBytes = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

        return {
          id: u._id,
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.avatar || '',
          folderCount,
          fileCount,
          totalBytes,
          storageMB: (totalBytes / (1024 * 1024)).toFixed(2),
          createdAt: u.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      data: enrichedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth2 Login / Auto-Signup
 * POST /api/auth/google
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required',
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth Client ID is not configured on the server',
      });
    }

    // Verify token with Google public keys
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('[Google OAuth Verification Error]:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: 'Google authentication token verification failed or expired',
      });
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account did not provide an email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isMongoAvailable()) {
      // In-memory fallback
      const mockUser = {
        _id: 'google-' + googleId,
        name: name || 'Google User',
        email: normalizedEmail,
        role: 'user',
        avatar: picture || '',
        authProvider: 'google',
      };
      const token = generateToken(mockUser);
      return res.status(200).json({
        success: true,
        token,
        user: mockUser,
      });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    });

    if (user) {
      // Update Google ID or avatar if not yet linked
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        updated = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        updated = true;
      }
      if (email_verified && !user.isEmailVerified) {
        user.isEmailVerified = true;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create new user (strictly as 'user' role)
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: picture || '',
        role: 'user',
        isEmailVerified: Boolean(email_verified),
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

