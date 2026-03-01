# Product Requirements Document (PRD)

## Serverless File Management Service

**Version:** 1.0
**Date:** March 1, 2026

---

## 1. Overview

A serverless file management platform built on AWS that allows users to upload, store, organize, and retrieve files across multiple projects. The system uses presigned URLs for direct-to-S3 uploads, DynamoDB for metadata tracking, and Lambda functions for business logic — all exposed through API Gateway.

---

## 2. Objectives

- Enable users to upload files to a centralized remote repository
- Organize files by project and file type
- Allow users to download and review files at any time
- Support filtering and retrieval by file type (e.g., PDF, PNG, DOCX)
- Minimize infrastructure costs using serverless architecture
- Avoid Lambda payload limits by leveraging S3 presigned URLs

---

## 3. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As a user, I want to upload a file to a specific project so it is stored remotely | **Must** |
| US-02 | As a user, I want to download a file I previously uploaded | **Must** |
| US-03 | As a user, I want to filter files by type (e.g., all PDFs) within a project | **Must** |
| US-04 | As a user, I want to filter files by type across all projects (GSI query) | **Should** |
| US-05 | As a user, I want to list all files belonging to a specific project | **Must** |
| US-06 | As a user, I want the upload status to reflect whether the file reached S3 | **Should** |

---

## 4. API Specification

### 4.1 Upload File (Request Presigned URL)

```
POST /upload
```

**Request Body:**
```json
{
  "projectName": "Alpha",
  "fileType": "pdf",
  "fileName": "report.pdf"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...presigned-put-url...",
  "fileId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "s3Key": "projects/Alpha/pdf/report.pdf"
}
```

**Flow:**
1. Lambda generates a presigned PUT URL
2. Lambda writes a PENDING record to DynamoDB
3. Client uploads the file directly to S3 using the presigned URL
4. S3 event triggers a second Lambda to mark the record as UPLOADED

---

### 4.2 List / Filter Files

```
GET /projects/{projectName}/files?fileType=pdf
```

**Response (200):**
```json
{
  "projectName": "Alpha",
  "files": [
    {
      "fileId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "fileName": "report.pdf",
      "fileType": "pdf",
      "status": "UPLOADED",
      "uploadDate": "2026-03-01T10:30:00Z"
    }
  ]
}
```

---

### 4.3 Download File (Request Presigned Download URL)

```
GET /files/{fileId}/download?projectName=Alpha
```

**Response (200):**
```json
{
  "downloadUrl": "https://s3.amazonaws.com/...presigned-get-url...",
  "fileName": "report.pdf"
}
```

---

### 4.4 List Files by Type Across All Projects (GSI)

```
GET /files?fileType=pdf
```

---

## 5. Architecture & AWS Services

| Component | Service | Details |
|-----------|---------|---------|
| API Layer | Amazon API Gateway | REST API with routes for upload, list, download |
| Compute | AWS Lambda | 3 functions: Upload handler, S3 sync trigger, Query handler |
| Metadata | Amazon DynamoDB | Single table with GSI on FileType |
| Storage | Amazon S3 | Bucket with prefix: `projects/{project_id}/{file_type}/{file_name}` |

---

## 6. DynamoDB Schema

### Main Table: `FilesTable`

| Attribute | Type | Role |
|-----------|------|------|
| `ProjectID` | String | Partition Key (PK) |
| `FileID` | String | Sort Key (SK) — UUID |
| `FileName` | String | Original file name |
| `FileType` | String | Extension (pdf, png, docx…) |
| `S3Key` | String | Full S3 object key |
| `Status` | String | `PENDING` or `UPLOADED` |
| `UploadDate` | String | ISO 8601 timestamp |

### GSI: `FileType-index`

| Attribute | Role |
|-----------|------|
| `FileType` | GSI Partition Key |
| `UploadDate` | GSI Sort Key |

---

## 7. S3 Bucket Design

- **Bucket Name:** `<your-app-name>-file-repository`
- **Prefix Strategy:** `projects/{ProjectID}/{FileType}/{FileName}`
- **CORS:** Enabled (to allow browser-based direct uploads)
- **Event Notification:** `s3:ObjectCreated:*` → triggers the Sync Lambda

---

## 8. Lambda Functions

| Function | Trigger | Responsibility |
|----------|---------|----------------|
| `uploadHandler` | API Gateway `POST /upload` | Validates input, writes PENDING record to DynamoDB, generates presigned PUT URL, returns URL to client |
| `s3SyncHandler` | S3 `ObjectCreated` event | Extracts S3 key from event, updates DynamoDB record status from PENDING → UPLOADED |
| `queryHandler` | API Gateway `GET /projects/…` and `GET /files/…` | Queries DynamoDB (main table or GSI), generates presigned GET URLs for downloads |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Presigned URL expiry | 15 minutes (upload), 60 minutes (download) |
| Max file size | 5 GB (S3 presigned PUT limit) |
| Lambda timeout | 30 seconds |
| Lambda memory | 256 MB |
| DynamoDB billing | On-demand (pay-per-request) |
| Region | Single region deployment |

---

## 10. Tech Stack

- **Runtime:** Node.js 20.x (or Python 3.12) on Lambda
- **Framework:** Serverless Framework / AWS SAM / AWS CDK
- **IaC:** CloudFormation (generated by framework)
- **Testing:** Jest / Pytest + localstack for local dev

---

## 11. Deployment

Infrastructure defined as code and deployed via CI/CD or CLI:

```bash
# Using Serverless Framework
sls deploy --stage dev

# Using AWS SAM
sam build && sam deploy --guided
```

---

## 12. Future Considerations

- File versioning (S3 versioning + version attribute in DynamoDB)
- File deletion endpoint
- Batch upload (multiple presigned URLs in one request)
- Thumbnail generation for images (Lambda + S3 trigger)
- Authentication via Amazon Cognito or API keys

---

# Required Keys & Configuration

To build and deploy this project, you need to provide the following:

## AWS Credentials (Required)

| Key | Where to Get It | What It's For |
|-----|-----------------|---------------|
| **`AWS_ACCESS_KEY_ID`** | AWS Console → IAM → Users → Security Credentials | Authenticates your CLI/SDK calls to AWS |
| **`AWS_SECRET_ACCESS_KEY`** | AWS Console → IAM → Users → Security Credentials | Paired with Access Key ID for authentication |
| **`AWS_REGION`** | Your choice (e.g., `us-east-1`, `eu-west-1`) | Determines where all resources are created |

## Resource Names You Define (Required)

| Key / Config | Example Value | Notes |
|-------------|---------------|-------|
| **S3 Bucket Name** | `my-app-file-repo` | Must be globally unique across all of AWS |
| **DynamoDB Table Name** | `FilesTable` | You choose this; referenced in Lambda code |
| **API Gateway Stage Name** | `dev` or `prod` | URL prefix for your API |

## IAM Permissions Needed

Your IAM user (or the Lambda execution role) needs policies for:

| Permission | Service |
|------------|---------|
| `s3:PutObject`, `s3:GetObject` | S3 (for presigned URLs) |
| `s3:PutBucketNotification` | S3 (for event triggers) |
| `dynamodb:PutItem`, `dynamodb:Query`, `dynamodb:UpdateItem` | DynamoDB |
| `lambda:CreateFunction`, `lambda:InvokeFunction` | Lambda |
| `apigateway:*` | API Gateway (for deployment) |
| `logs:*` | CloudWatch Logs |
| `iam:PassRole` | IAM (for assigning roles to Lambda) |

## Optional

| Key | Purpose |
|-----|---------|
| **Cognito User Pool ID** | If you add authentication later |
| **Custom Domain Name** | If you want a friendly API URL instead of the default API Gateway URL |

---

### Quick Start Checklist

1. [ ] Create an AWS account (or use an existing one)
2. [ ] Create an IAM user with programmatic access
3. [ ] Attach the permissions above (or use `AdministratorAccess` for dev)
4. [ ] Run `aws configure` and enter your `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`
5. [ ] Choose a globally unique S3 bucket name
6. [ ] Deploy using your chosen IaC framework
