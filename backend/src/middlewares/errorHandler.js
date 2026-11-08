import multer from 'multer';

export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle Multer file size error specifically
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size exceeds the 10MB limit. Maximum allowed size is 10MB per document.';
  } else if (err.code === 'MEDIA_NOT_ALLOWED' || err.code === 'INVALID_FILE_TYPE') {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
