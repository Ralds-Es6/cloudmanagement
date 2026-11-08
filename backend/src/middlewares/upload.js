import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads destination
const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strictly Document Extensions (No videos, no music, no executables)
export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.md',
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
];

// 10MB Maximum File Size Limit
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

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

// File filter restricting strictly to document types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  // Explicitly block audio and video
  if (
    mimetype.startsWith('video/') ||
    mimetype.startsWith('audio/') ||
    ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.wav', '.flac', '.aac', '.m4a'].includes(ext)
  ) {
    const error = new Error(
      'Media files (videos and music/audio) are strictly prohibited. Only documents are permitted.'
    );
    error.code = 'MEDIA_NOT_ALLOWED';
    return cb(error, false);
  }

  const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimetype);

  if (isExtensionAllowed || isMimeAllowed) {
    cb(null, true);
  } else {
    const error = new Error(
      `File rejected: Only document files are allowed (${ALLOWED_EXTENSIONS.join(
        ', '
      )}). Maximum file size is 10MB.`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // Exactly 10MB
  },
});

export default documentUpload;
