'use strict';

const { getFile } = require('../utils/dynamodb');
const { generateDownloadUrl } = require('../utils/s3');
const { response } = require('../utils/helpers');

/**
 * GET /files/{fileId}/download?projectName=Alpha
 *
 * Generates a presigned GET URL so the client can download the file
 * directly from S3.
 */
module.exports.handler = async (event) => {
  try {
    const fileId = event.pathParameters?.fileId;
    const projectName = event.queryStringParameters?.projectName;

    if (!fileId || !projectName) {
      return response(400, {
        error: 'Missing required parameters: fileId (path) and projectName (query)',
      });
    }

    const file = await getFile(projectName, fileId);

    if (!file) {
      return response(404, { error: 'File not found' });
    }

    if (file.Status !== 'UPLOADED') {
      return response(409, {
        error: 'File is not yet uploaded',
        status: file.Status,
      });
    }

    const bucket = process.env.BUCKET_NAME;
    const downloadUrl = await generateDownloadUrl(bucket, file.S3Key, 3600);

    return response(200, {
      message: 'Presigned download URL generated successfully',
      downloadUrl,
      fileName: file.FileName,
      fileType: file.FileType,
      expiresIn: '60 minutes',
    });
  } catch (error) {
    console.error('Download handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
