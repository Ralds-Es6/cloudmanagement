import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getOrCreateSettings,
  DEFAULT_ALLOWED_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
} from '../controllers/settingsController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary uploads destination (cleaned up immediately after R2 upload)
const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const ALLOWED_EXTENSIONS = DEFAULT_ALLOWED_EXTENSIONS.map((e) => `.${e}`);
export const MAX_FILE_SIZE_BYTES = DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Dynamic Multer middleware that strictly enforces live Admin Settings
 * (allowedExtensions & maxUploadSizeMB) from MongoDB on every upload request.
 */
export const dynamicDocumentUpload = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const allowedList = Array.isArray(settings.allowedExtensions)
      ? settings.allowedExtensions
          .map((ext) => String(ext).toLowerCase().trim().replace(/^\./, ''))
          .filter(Boolean)
      : [...DEFAULT_ALLOWED_EXTENSIONS];

    const maxMB = Number(settings.maxUploadSizeMB) || DEFAULT_MAX_UPLOAD_SIZE_MB;
    const maxBytes = maxMB * 1024 * 1024;

    const fileFilter = (_req, file, cb) => {
      const extWithDot = path.extname(file.originalname || '').toLowerCase();
      const extNoDot = extWithDot.replace(/^\./, '');

      if (allowedList.length === 0) {
        const error = new Error(
          'Uploads are currently disabled because no file extensions are enabled in Admin Settings.'
        );
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
      }

      if (!extNoDot || !allowedList.includes(extNoDot)) {
        const formattedAllowed = allowedList.map((e) => `.${e}`).join(', ');
        const error = new Error(
          `File type "${extWithDot || 'unknown'}" is currently disabled by administrator policy. Allowed formats: ${formattedAllowed}.`
        );
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
      }

      cb(null, true);
    };

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: maxBytes,
      },
    }).single('file');

    upload(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File exceeds the maximum allowed size of ${maxMB} MB configured by administrator.`,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'File upload rejected by system policy.',
      });
    });
  } catch (err) {
    next(err);
  }
};

export const documentUpload = {
  single: () => dynamicDocumentUpload,
};

export default dynamicDocumentUpload;
