import fs from 'fs';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_CONFIG, isR2Configured } from '../config/r2.js';

/**
 * Upload a document file to Cloudflare R2 bucket
 * @param {string} localFilePath - Path on disk to the temporary uploaded file
 * @param {string} destinationKey - Target key/path in R2 bucket
 * @param {string} mimeType - Document MIME type
 */
export const uploadFileToR2 = async (localFilePath, destinationKey, mimeType) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return {
      uploadedToR2: false,
      message: 'Cloudflare R2 is not configured in .env',
    };
  }

  const fileStream = fs.createReadStream(localFilePath);
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: destinationKey,
    Body: fileStream,
    ContentType: mimeType,
  });

  const response = await client.send(command);

  // Construct public or direct R2 URL if public URL is provided
  const publicUrl = R2_CONFIG.publicUrl
    ? `${R2_CONFIG.publicUrl.replace(/\/$/, '')}/${destinationKey}`
    : null;

  return {
    uploadedToR2: true,
    etag: response.ETag,
    bucket: R2_CONFIG.bucketName,
    key: destinationKey,
    publicUrl,
  };
};

/**
 * Stream a document file directly from Cloudflare R2
 * @param {string} destinationKey - Target key in R2 bucket
 */
export const getFileStreamFromR2 = async (destinationKey) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    throw new Error('Cloudflare R2 is not configured.');
  }

  const command = new GetObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: destinationKey,
  });

  const response = await client.send(command);
  return response.Body; // Readable stream
};

/**
 * Generate a pre-signed temporary download URL for Cloudflare R2
 * @param {string} destinationKey - Target key in R2 bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 */
export const getR2PresignedUrl = async (destinationKey, expiresIn = 3600) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: destinationKey,
  });

  return await getSignedUrl(client, command, { expiresIn });
};

/**
 * Delete a document file from Cloudflare R2
 * @param {string} destinationKey - Target key in R2 bucket
 */
export const deleteFileFromR2 = async (destinationKey) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return false;
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: destinationKey,
  });

  await client.send(command);
  return true;
};

/**
 * Create a 0-byte directory marker in Cloudflare R2
 * S3-compatible storage displays empty folders when an object key ends with '/'
 * @param {string} folderKey - Key path ending with '/'
 */
export const createFolderMarkerInR2 = async (folderKey) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return false;
  }

  const key = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: Buffer.alloc(0),
      ContentType: 'application/x-directory',
    });

    await client.send(command);
    return true;
  } catch (err) {
    console.warn(`[R2 Folder Marker Error for ${key}]:`, err.message);
    return false;
  }
};

/**
 * Delete a directory marker in Cloudflare R2
 * @param {string} folderKey - Key path ending with '/'
 */
export const deleteFolderMarkerInR2 = async (folderKey) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return false;
  }

  const key = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (err) {
    console.warn(`[R2 Delete Folder Marker Error for ${key}]:`, err.message);
    return false;
  }
};

/**
 * Check if an object exists in Cloudflare R2 using a lightweight HEAD request
 * Returns:
 * - true if object exists or on transient network issues
 * - false if object was deleted / not found (HTTP 404 / NoSuchKey / NotFound)
 * @param {string} destinationKey - Target key in R2 bucket
 */
export const checkObjectExistsInR2 = async (destinationKey) => {
  const client = getR2Client();
  if (!isR2Configured() || !client) {
    return true; // Fail-safe: don't prune if R2 is not configured
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: destinationKey,
    });

    await client.send(command);
    return true;
  } catch (err) {
    const isNotFound =
      err.name === 'NotFound' ||
      err.name === 'NoSuchKey' ||
      err.Code === 'NoSuchKey' ||
      err.$metadata?.httpStatusCode === 404;

    if (isNotFound) {
      return false;
    }

    // Fail-safe: on unexpected network or connection error, preserve the document
    console.warn(`[R2 HeadObject Warning for ${destinationKey}]:`, err.message);
    return true;
  }
};

