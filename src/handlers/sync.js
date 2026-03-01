'use strict';

const { markFileUploaded } = require('../utils/dynamodb');

/**
 * S3 Trigger — s3:ObjectCreated:*
 *
 * When a file is uploaded directly to S3 via the presigned URL,
 * this function fires and updates the DynamoDB record status
 * from PENDING → UPLOADED.
 *
 * S3 key format: projects/{projectName}/{fileType}/{fileName}
 * We extract projectName from the key to use as the DynamoDB partition key.
 */
module.exports.handler = async (event) => {
  for (const record of event.Records) {
    try {
      const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      console.log('S3 ObjectCreated event for key:', s3Key);

      // Parse: projects/{projectName}/{fileType}/{fileName}
      const parts = s3Key.split('/');
      if (parts.length < 4 || parts[0] !== 'projects') {
        console.warn('Unexpected S3 key format, skipping:', s3Key);
        continue;
      }

      const projectName = parts[1];

      // We need the FileID to update the correct record.
      // Since the upload handler wrote the record with the S3Key,
      // we query by ProjectID and look for matching S3Key.
      // However, to keep it simple and avoid a scan, the upload handler
      // stores the FileID in the S3 object metadata — but presigned URLs
      // make that tricky. Instead, we use a convention:
      //
      // The Sync Lambda queries DynamoDB for PENDING records in this project
      // whose S3Key matches, and marks them UPLOADED.

      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

      const client = new DynamoDBClient({ region: process.env.REGION });
      const docClient = DynamoDBDocumentClient.from(client);

      // Query all files for this project
      const queryResult = await docClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: 'ProjectID = :pid',
          FilterExpression: 'S3Key = :s3key AND #status = :pending',
          ExpressionAttributeNames: { '#status': 'Status' },
          ExpressionAttributeValues: {
            ':pid': projectName,
            ':s3key': s3Key,
            ':pending': 'PENDING',
          },
        })
      );

      if (queryResult.Items && queryResult.Items.length > 0) {
        const item = queryResult.Items[0];
        await markFileUploaded(item.ProjectID, item.FileID);
        console.log(`Marked file ${item.FileID} in project ${item.ProjectID} as UPLOADED`);
      } else {
        console.warn('No PENDING record found for S3 key:', s3Key);
      }
    } catch (error) {
      console.error('Sync handler error:', error);
      // Don't throw — process remaining records
    }
  }
};
