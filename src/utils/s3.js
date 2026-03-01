const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.REGION });

/**
 * Generate a presigned PUT URL for uploading a file directly to S3.
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - URL expiry in seconds (default: 900 = 15 min)
 * @returns {Promise<string>} Presigned PUT URL
 */
async function generateUploadUrl(bucket, key, contentType, expiresIn = 900) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned GET URL for downloading a file from S3.
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Presigned GET URL
 */
async function generateDownloadUrl(bucket, key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

module.exports = { generateUploadUrl, generateDownloadUrl };
