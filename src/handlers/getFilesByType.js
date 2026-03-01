'use strict';

const { getFilesByType } = require('../utils/dynamodb');
const { response } = require('../utils/helpers');

/**
 * GET /files?fileType=pdf
 *
 * Queries the GSI (FileType-index) to fetch all files of a given type
 * across ALL projects.
 */
module.exports.handler = async (event) => {
  try {
    const fileType = event.queryStringParameters?.fileType;

    if (!fileType) {
      return response(400, { error: 'Missing required query parameter: fileType' });
    }

    const files = await getFilesByType(fileType.toLowerCase());

    return response(200, {
      fileType,
      count: files.length,
      files: files.map((f) => ({
        projectId: f.ProjectID,
        fileId: f.FileID,
        fileName: f.FileName,
        fileType: f.FileType,
        status: f.Status,
        uploadDate: f.UploadDate,
        s3Key: f.S3Key,
      })),
    });
  } catch (error) {
    console.error('getFilesByType handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
