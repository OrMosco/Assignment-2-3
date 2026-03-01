'use strict';

const crypto = require('crypto');
const { generateUploadUrl } = require('../utils/s3');
const { createFileRecord } = require('../utils/dynamodb');
const { response, getContentType } = require('../utils/helpers');

/**
 * POST /upload
 *
 * Request body:
 *   { "projectName": "Alpha", "fileType": "pdf", "fileName": "report.pdf" }
 *
 * Response:
 *   { "uploadUrl": "https://...", "fileId": "uuid", "s3Key": "projects/..." }
 *
 * Flow:
 *   1. Validate input
 *   2. Generate a unique FileID
 *   3. Build the S3 key: projects/{projectName}/{fileType}/{fileName}
 *   4. Write a PENDING record to DynamoDB
 *   5. Generate a presigned PUT URL for direct upload to S3
 *   6. Return the URL + metadata to the client
 */
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { projectName, fileType, fileName } = body;

    // --- Validation ---
    if (!projectName || !fileType || !fileName) {
      return response(400, {
        error: 'Missing required fields: projectName, fileType, fileName',
      });
    }

    const fileId = crypto.randomUUID();
    const s3Key = `projects/${projectName}/${fileType}/${fileName}`;
    const contentType = getContentType(fileType);
    const bucket = process.env.BUCKET_NAME;

    // Write PENDING record to DynamoDB
    await createFileRecord({
      projectId: projectName,
      fileId,
      fileName,
      fileType: fileType.toLowerCase(),
      s3Key,
    });

    // Generate presigned PUT URL (expires in 15 minutes)
    const uploadUrl = await generateUploadUrl(bucket, s3Key, contentType, 900);

    return response(200, {
      message: 'Presigned upload URL generated successfully',
      uploadUrl,
      fileId,
      s3Key,
      expiresIn: '15 minutes',
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
