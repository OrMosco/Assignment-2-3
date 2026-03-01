# Serverless File Management Service

A serverless file management platform built on **AWS** that allows users to upload, store, organize, and retrieve files across multiple projects. The system uses **presigned URLs** for direct-to-S3 uploads, **DynamoDB** for metadata tracking, and **Lambda** functions for business logic — all exposed through **API Gateway**.

---

## Live API (Deployed)

**Base URL:** `https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Request a presigned upload URL |
| `GET` | `/projects/{projectName}/files` | List files for a project (optional `?fileType=pdf`) |
| `GET` | `/files/{fileId}/download?projectName=X` | Get a presigned download URL |
| `GET` | `/files?fileType=pdf` | List files by type across all projects (GSI) |

> You can test the live API immediately using the [test script](#testing) or with curl/Postman.

---

## Architecture

```
┌──────────┐    POST /upload     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Client   │ ──────────────────►│ API Gateway   │────►│ Upload      │────►│ DynamoDB │
│ (Browser/ │                    │               │     │ Lambda      │     │ (PENDING)│
│  Postman) │                    └──────────────┘     └──────┬──────┘     └──────────┘
│           │                                                │
│           │◄── presigned PUT URL ──────────────────────────┘
│           │
│           │    HTTP PUT (file bytes)    ┌──────────┐
│           │ ──────────────────────────►│    S3     │
│           │                            │  Bucket   │
└──────────┘                             └─────┬────┘
                                               │ S3 Event
                                               ▼
                                         ┌───────────┐     ┌──────────┐
                                         │   Sync    │────►│ DynamoDB │
                                         │  Lambda   │     │(UPLOADED)│
                                         └───────────┘     └──────────┘
```

### AWS Services Used

| Component | Service | Purpose |
|-----------|---------|---------|
| API Layer | **Amazon API Gateway** | RESTful endpoints with CORS support |
| Compute | **AWS Lambda** (Node.js 20.x) | 5 functions: upload, sync, getFiles, download, getFilesByType |
| Metadata | **Amazon DynamoDB** | Single table with GSI for file type queries |
| Storage | **Amazon S3** | File storage with presigned URL access & CORS |

### Why Presigned URLs?

- **No file size limit** imposed by Lambda (supports up to 5GB vs Lambda's 6MB)
- **Lower cost** — Lambda only runs for milliseconds to generate the URL
- **Faster uploads** — client talks directly to S3, no middleman

---

## DynamoDB Schema

**Table:** `FilesTable-dev`

| Attribute | Type | Role |
|-----------|------|------|
| `ProjectID` | String | Partition Key (PK) |
| `FileID` | String | Sort Key (SK) — UUID |
| `FileName` | String | Original file name |
| `FileType` | String | File extension (pdf, png, docx…) |
| `S3Key` | String | Full S3 object key |
| `Status` | String | `PENDING` → `UPLOADED` |
| `UploadDate` | String | ISO 8601 timestamp |

**GSI:** `FileType-index` — Enables cross-project queries by file type
- Partition Key: `FileType`
- Sort Key: `UploadDate`

---

## Project Structure

```
├── serverless.yml              # Infrastructure as Code (API GW, Lambda, DynamoDB, S3)
├── package.json                # Dependencies and scripts
├── test.js                     # Automated end-to-end test script
├── src/
│   ├── handlers/
│   │   ├── upload.js           # POST /upload — generates presigned URL, writes PENDING record
│   │   ├── sync.js             # S3 trigger — updates record status to UPLOADED
│   │   ├── getFiles.js         # GET /projects/{name}/files — list & filter by type
│   │   ├── download.js         # GET /files/{id}/download — generates presigned GET URL
│   │   └── getFilesByType.js   # GET /files?fileType=X — cross-project GSI query
│   └── utils/
│       ├── s3.js               # S3 presigned URL generation (upload & download)
│       ├── dynamodb.js         # DynamoDB CRUD operations
│       └── helpers.js          # HTTP response builder, MIME type mapping
├── PRD.md                      # Product Requirements Document
└── README.md                   # This file
```

---

## API Usage Examples

### 1. Upload a File

```bash
# Step 1: Request a presigned upload URL
curl -X POST https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "Alpha", "fileType": "png", "fileName": "screenshot.png"}'

# Response:
# {
#   "message": "Presigned upload URL generated successfully",
#   "uploadUrl": "https://spacial-file-repo-dev.s3.eu-west-1.amazonaws.com/...",
#   "fileId": "3a6e93c0-...",
#   "s3Key": "projects/Alpha/png/screenshot.png",
#   "expiresIn": "15 minutes"
# }

# Step 2: Upload the file directly to S3 using the presigned URL
curl -X PUT "<uploadUrl from step 1>" \
  -H "Content-Type: image/png" \
  --data-binary @screenshot.png
```

### 2. List Project Files

```bash
# All files in a project
curl https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/Alpha/files

# Filter by type
curl https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/projects/Alpha/files?fileType=png
```

### 3. Download a File

```bash
curl "https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files/<fileId>/download?projectName=Alpha"
# Response contains a presigned download URL (valid for 60 minutes)
# Open the downloadUrl in a browser to download the file
```

### 4. Search Files by Type Across All Projects

```bash
curl https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev/files?fileType=png
```

---

## Testing

Run the automated end-to-end test script against the live API:

```bash
node test.js
```

The test script validates the **complete lifecycle**:

```
Test 1: POST /upload         → Presigned URL generation        ✅
Test 2: PUT file to S3       → Direct upload via presigned URL ✅
Test 3: S3 sync trigger      → Status: PENDING → UPLOADED     ✅
Test 4: GET project files    → List all files in a project     ✅
Test 5: GET filter by type   → Filter within a project         ✅
Test 6: GET files (GSI)      → Cross-project type query        ✅
Test 7: GET download URL     → Presigned download generation   ✅
Test 8: Actual download      → File integrity verification     ✅
```

---

## Setup & Deployment (Deploy Your Own Copy)

### Prerequisites

- Node.js 20.x+
- AWS account with credentials configured (`~/.aws/credentials`)
- Serverless Framework v3

### Deploy

```bash
# Clone the repository
git clone https://github.com/OrMosco/Assignment-2-3.git
cd Assignment-2-3

# Install dependencies
npm install

# Deploy to AWS (eu-west-1)
npx serverless@3 deploy --stage dev
```

After deployment, the CLI outputs the API Gateway URL. Update `BASE_URL` in `test.js` to point to your deployment.

### Remove All Resources

```bash
npx serverless@3 remove --stage dev
```

---

## Key Design Decisions

1. **Presigned URLs** — Files go directly from client → S3, avoiding Lambda's 6MB payload limit and reducing execution costs
2. **DynamoDB single-table design** — One table with a GSI handles both per-project queries and cross-project file type searches efficiently
3. **S3 prefix strategy** — `projects/{id}/{type}/{name}` enables lifecycle policies and manual browsing
4. **S3 event trigger** — Automatically confirms upload completion without requiring client polling
5. **CORS enabled** — Supports browser-based direct uploads to S3
6. **Infrastructure as Code** — Entire stack defined in `serverless.yml` for reproducible deployments
