'use strict';

const { getFilesByProject } = require('../utils/dynamodb');
const { response } = require('../utils/helpers');

/**
 * GET /projects/{projectName}/files?fileType=pdf
 *
 * Lists all files for a given project.
 * Optionally filters by fileType query parameter.
 */
module.exports.handler = async (event) => {
  try {
    const projectName = event.pathParameters?.projectName;

    if (!projectName) {
      return response(400, { error: 'Missing path parameter: projectName' });
    }

    const fileType = event.queryStringParameters?.fileType || null;

    const files = await getFilesByProject(projectName, fileType);

    return response(200, {
      projectName,
      fileType: fileType || 'all',
      count: files.length,
      files: files.map((f) => ({
        fileId: f.FileID,
        fileName: f.FileName,
        fileType: f.FileType,
        status: f.Status,
        uploadDate: f.UploadDate,
        s3Key: f.S3Key,
      })),
    });
  } catch (error) {
    console.error('getFiles handler error:', error);
    return response(500, { error: 'Internal server error' });
  }
};
