import dotenv from 'dotenv';
dotenv.config();

import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Client Configuration
 * Cloudflare R2 provides S3-compatible object storage.
 * Documentation: https://developers.cloudflare.com/r2/api/s3/api/
 */

export const getR2Credentials = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || '',
  };
};

export const isR2Configured = () => {
  const creds = getR2Credentials();
  return Boolean(
    creds.endpoint &&
    creds.accessKeyId &&
    creds.secretAccessKey &&
    creds.bucketName
  );
};

export const getR2Client = () => {
  if (!isR2Configured()) return null;
  const creds = getR2Credentials();
  return new S3Client({
    region: 'auto',
    endpoint: creds.endpoint,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    forcePathStyle: true,
  });
};

export const r2Client = getR2Client();

export const R2_CONFIG = {
  get bucketName() {
    return getR2Credentials().bucketName;
  },
  get publicUrl() {
    return getR2Credentials().publicUrl;
  },
  get endpoint() {
    return getR2Credentials().endpoint;
  },
  get isConfigured() {
    return isR2Configured();
  },
};

export default r2Client;
