import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const isMongoAvailable = () => mongoose.connection.readyState === 1;

/**
 * Protect routes - verifies JWT in Authorization header
 */
export const protect = async (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secure_document_management_jwt_secret_key_2026'
    );

    if (isMongoAvailable() && mongoose.isValidObjectId(decoded.id)) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists.',
        });
      }
      req.user = user;
    } else {
      req.user = {
        _id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role || 'admin',
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) permission check
 * @param  {...string} roles - e.g. 'admin', 'editor', 'viewer'
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role '${req.user.role}' does not have permission to perform this action. Required: [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

