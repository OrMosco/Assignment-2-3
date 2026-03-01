const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Create a new file metadata record with PENDING status.
 */
async function createFileRecord({ projectId, fileId, fileName, fileType, s3Key }) {
  const now = new Date().toISOString();
  const params = {
    TableName: TABLE_NAME,
    Item: {
      ProjectID: projectId,
      FileID: fileId,
      FileName: fileName,
      FileType: fileType,
      S3Key: s3Key,
      Status: 'PENDING',
      UploadDate: now,
    },
  };
  await docClient.send(new PutCommand(params));
  return params.Item;
}

/**
 * Update file status from PENDING to UPLOADED.
 */
async function markFileUploaded(projectId, fileId) {
  const params = {
    TableName: TABLE_NAME,
    Key: { ProjectID: projectId, FileID: fileId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'Status' },
    ExpressionAttributeValues: { ':status': 'UPLOADED' },
  };
  await docClient.send(new UpdateCommand(params));
}

/**
 * Query files by project, optionally filtering by file type.
 */
async function getFilesByProject(projectId, fileType) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'ProjectID = :pid',
    ExpressionAttributeValues: { ':pid': projectId },
  };

  if (fileType) {
    params.FilterExpression = 'FileType = :ft';
    params.ExpressionAttributeValues[':ft'] = fileType;
  }

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Query files by type across all projects using the GSI.
 */
async function getFilesByType(fileType) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'FileType-index',
    KeyConditionExpression: 'FileType = :ft',
    ExpressionAttributeValues: { ':ft': fileType },
  };

  const result = await docClient.send(new QueryCommand(params));
  return result.Items || [];
}

/**
 * Get a single file record by ProjectID and FileID.
 */
async function getFile(projectId, fileId) {
  const params = {
    TableName: TABLE_NAME,
    Key: { ProjectID: projectId, FileID: fileId },
  };
  const result = await docClient.send(new GetCommand(params));
  return result.Item;
}

module.exports = {
  createFileRecord,
  markFileUploaded,
  getFilesByProject,
  getFilesByType,
  getFile,
};
