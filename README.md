# Spacial File Manager — Serverless Backend

A serverless file management service built with **AWS Lambda**, **API Gateway**, **DynamoDB**, and **S3**.  
Users can upload, organize, and retrieve files across multiple projects with filtering by file type.

---

## Architecture

```
User → API Gateway → Lambda → DynamoDB (metadata)
                            → S3 (file storage via presigned URLs)
```

| Component | AWS Service |
|-----------|-------------|
| API Layer | Amazon API Gateway |
| Compute | AWS Lambda (Node.js 20.x) |
| Metadata Store | Amazon DynamoDB |
| Object Store | Amazon S3 |

### Upload Flow (Presigned URL Pattern)

1. Client calls `POST /upload` with project name, file type, and file name
2. Lambda writes a `PENDING` record to DynamoDB and returns a **presigned S3 PUT URL**
3. Client uploads the file **directly to S3** using the presigned URL (bypasses Lambda's 6MB limit)
4. S3 triggers a background Lambda that marks the DynamoDB record as `UPLOADED`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Request a presigned upload URL |
| `GET` | `/projects/{projectName}/files` | List files for a project (optional `?fileType=pdf`) |
| `GET` | `/files/{fileId}/download?projectName=X` | Get a presigned download URL |
| `GET` | `/files?fileType=pdf` | List files by type across all projects (GSI) |

### Example: Upload a File

```bash
# 1. Request a presigned URL
curl -X POST https://<api-id>.execute-api.eu-west-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "Alpha", "fileType": "pdf", "fileName": "report.pdf"}'

# Response:
# { "uploadUrl": "https://s3...", "fileId": "abc-123", "s3Key": "projects/Alpha/pdf/report.pdf" }

# 2. Upload the file directly to S3
curl -X PUT "<uploadUrl from step 1>" \
  -H "Content-Type: application/pdf" \
  --data-binary @report.pdf
```

### Example: List Project Files

```bash
curl https://<api-id>.execute-api.eu-west-1.amazonaws.com/dev/projects/Alpha/files?fileType=pdf
```

### Example: Download a File

```bash
curl "https://<api-id>.execute-api.eu-west-1.amazonaws.com/dev/files/abc-123/download?projectName=Alpha"
# Response contains a presigned download URL
```

---

## DynamoDB Schema

**Table:** `FilesTable-dev`

| Attribute | Type | Role |
|-----------|------|------|
| `ProjectID` | String | Partition Key |
| `FileID` | String | Sort Key (UUID) |
| `FileName` | String | Original file name |
| `FileType` | String | Extension (pdf, png, etc.) |
| `S3Key` | String | Full S3 object key |
| `Status` | String | `PENDING` or `UPLOADED` |
| `UploadDate` | String | ISO 8601 timestamp |

**GSI:** `FileType-index` (PK: `FileType`, SK: `UploadDate`)

---

## Project Structure

```
├── serverless.yml              # Infrastructure as Code (API GW, Lambda, DynamoDB, S3)
├── package.json
├── src/
│   ├── handlers/
│   │   ├── upload.js           # POST /upload — generates presigned URL
│   │   ├── sync.js             # S3 trigger — marks records as UPLOADED
│   │   ├── getFiles.js         # GET /projects/{name}/files
│   │   ├── download.js         # GET /files/{id}/download
│   │   └── getFilesByType.js   # GET /files?fileType=pdf
│   └── utils/
│       ├── s3.js               # S3 presigned URL helpers
│       ├── dynamodb.js         # DynamoDB CRUD operations
│       └── helpers.js          # Response builder, MIME types
├── PRD.md                      # Product Requirements Document
└── README.md                   # This file
```

---

## Prerequisites

- **Node.js** 20.x+
- **Serverless Framework** v3 (`npm install -g serverless`)
- **AWS credentials** configured (`~/.aws/credentials`)

---

## Setup & Deployment

```bash
# Install dependencies
npm install

# Install Serverless Framework globally
npm install -g serverless

# Deploy to AWS (dev stage)
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

After deployment, the CLI outputs the API Gateway URL and resource names.

---

## Local Testing

```bash
# Invoke a function locally
serverless invoke local --function upload --data '{"body": "{\"projectName\":\"Alpha\",\"fileType\":\"pdf\",\"fileName\":\"test.pdf\"}"}'
```

---

## Cleanup

```bash
# Remove all AWS resources
serverless remove --stage dev
```

---

## Key Design Decisions

1. **Presigned URLs** — Files go directly from client → S3, avoiding Lambda's 6MB payload limit and reducing execution costs
2. **DynamoDB single-table** — One table with a GSI handles both per-project and cross-project queries efficiently
3. **S3 prefix strategy** — `projects/{id}/{type}/{name}` enables lifecycle policies and manual browsing
4. **S3 event trigger** — Automatically confirms upload completion without client polling
5. **CORS enabled** — Supports browser-based direct uploads to S3
