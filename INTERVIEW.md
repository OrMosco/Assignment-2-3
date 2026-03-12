# Interview Questions & Answers

Common interview questions about this Serverless File Management Service project and thoughtful responses.

---

## 1. If you had more time, what would you have improved on this project?

### Authentication & Authorization
- **Add AWS Cognito integration** for user authentication with JWT tokens
- Implement **role-based access control (RBAC)** — e.g., project owners vs. viewers
- Add API key management for programmatic access

### Testing & Quality
- Add **unit tests** with Jest for all Lambda handlers and utility functions
- Implement **integration tests** using AWS SAM local or LocalStack
- Add **code coverage reporting** with minimum thresholds
- Set up **ESLint** with Airbnb or Standard style for consistent code quality

### Performance & Scalability
- Implement **pagination** for `getFiles` and `getFilesByType` endpoints (currently returns all results)
- Add **DynamoDB TTL** for automatic cleanup of orphaned PENDING records
- Implement **multipart uploads** for very large files (>5GB)
- Add **CloudFront CDN** in front of S3 for faster downloads globally

### Monitoring & Observability
- Set up **AWS X-Ray** for distributed tracing across Lambda functions
- Add **CloudWatch custom metrics** (upload counts, file sizes, error rates)
- Create **CloudWatch dashboards** for operational visibility
- Implement **structured logging** with correlation IDs for request tracing

### Features
- Add **file versioning** support (keep historical versions)
- Implement **file metadata** editing (rename, move between projects)
- Add **delete file** endpoint with soft-delete capability
- Support **folder hierarchies** within projects
- Add **search functionality** across file names and metadata
- Implement **webhooks** for upload completion notifications

### Infrastructure
- Add **multiple deployment stages** (dev, staging, prod) with proper environment isolation
- Implement **CI/CD pipeline** with GitHub Actions
- Add **infrastructure drift detection**
- Set up **AWS WAF** for API protection against common attacks

---

## 2. What did you struggle with most when building this project?

### S3 Event Trigger & Record Matching
The biggest challenge was **connecting the S3 upload event back to the correct DynamoDB record**. When a client uploads a file directly to S3 using a presigned URL, the Sync Lambda receives an S3 event containing only the object key — no reference to the FileID stored in DynamoDB.

**The problem:** How do you know which DynamoDB record to update from `PENDING` → `UPLOADED` when you only have the S3 key?

**Solutions considered:**
1. **Store FileID in S3 object metadata** — Presigned URLs make this tricky; you'd need to include metadata parameters in the URL
2. **Use S3 key as a unique identifier** — This is what I implemented: query DynamoDB by ProjectID (extracted from the S3 key path) and filter by S3Key + Status=PENDING
3. **Include FileID in the S3 key** — More explicit but uglier paths

**Trade-off:** The current approach requires a Query + Filter operation instead of a direct GetItem, but it keeps the S3 key human-readable and avoids complex presigned URL generation.

### Eventual Consistency
Understanding and designing for **eventual consistency** between S3 and DynamoDB was challenging:
- What if the Sync Lambda fails? (The file exists in S3 but DynamoDB still shows PENDING)
- What if someone queries files immediately after upload? (They might see PENDING status)

The current design handles failures gracefully (remaining records still process), but a production system would benefit from a dead-letter queue and retry mechanism.

### CORS Configuration
Getting **CORS to work correctly for browser uploads** required careful coordination between:
- S3 bucket CORS configuration (for direct PUT requests)
- API Gateway CORS settings (for the REST API)
- Presigned URL parameters

---

## 3. What are you most proud of about this project?

### Clean Architecture with Separation of Concerns
The codebase follows a **well-organized modular structure**:
```
src/
├── handlers/    # Lambda entry points — thin controllers
└── utils/       # Reusable business logic (S3, DynamoDB, helpers)
```
Each handler is focused and delegates to utility functions, making the code testable and maintainable.

### The Presigned URL Pattern
I'm proud of implementing the **direct-to-S3 upload pattern** correctly:
1. Client requests upload → Lambda generates presigned URL → Client uploads directly to S3
2. S3 triggers Sync Lambda → DynamoDB updates to UPLOADED

This architecture:
- **Eliminates Lambda payload limits** (6MB → 5GB+)
- **Reduces costs** (Lambda runs for milliseconds, not during file transfer)
- **Improves upload speed** (no intermediary processing)

### Infrastructure as Code
The entire stack is defined in **serverless.yml**:
- 5 Lambda functions
- API Gateway with CORS
- DynamoDB table with GSI
- S3 bucket with CORS
- All IAM permissions (least privilege)

Anyone can deploy an identical copy with a single `npx serverless deploy` command.

### The End-to-End Test Script
The `test.js` script validates the **complete workflow**:
1. Presigned URL generation
2. Direct S3 upload
3. Sync trigger verification
4. File listing by project
5. File filtering by type
6. Cross-project GSI query
7. Download URL generation
8. File integrity verification

This provides confidence that all components work together correctly.

### DynamoDB Single-Table Design with GSI
Using a **single DynamoDB table** with a well-designed GSI enables:
- Fast project-scoped queries (partition key = ProjectID)
- Cross-project file type queries (GSI partition key = FileType)
- Cost-effective pay-per-request billing

---

## 4. Why did you choose this specific implementation?

### Why Serverless Framework (vs. CDK, SAM, Terraform)?
- **Rapid development** — Less boilerplate than CDK or raw CloudFormation
- **Built-in best practices** — Auto-creates API Gateway, IAM roles, etc.
- **Single file infrastructure** — `serverless.yml` is concise and readable
- **Plugin ecosystem** — Easy to add offline testing, monitoring, etc.

### Why Presigned URLs (vs. Lambda Proxy Uploads)?
| Approach | Max Size | Cost | Latency |
|----------|----------|------|---------|
| Lambda Proxy | 6 MB | High (Lambda duration) | Higher |
| **Presigned URLs** | **5 GB+** | **Low (ms execution)** | **Lower** |

Presigned URLs are the industry-standard pattern for serverless file uploads.

### Why DynamoDB (vs. RDS, DocumentDB)?
- **Serverless-native** — No connection pooling issues with Lambda
- **Pay-per-request** — Perfect for variable workloads
- **Single-digit ms latency** — Fast metadata lookups
- **GSI support** — Enables cross-project queries without scans

### Why Single-Table Design (vs. Multiple Tables)?
- **Atomic operations** — Related data stays together
- **Cost efficiency** — One table to manage
- **Query flexibility** — GSIs enable different access patterns

### Why Node.js 20.x (vs. Python, Go)?
- **Native async/await** — Clean code for I/O-heavy operations
- **AWS SDK v3** — Modular imports reduce cold start times
- **Ecosystem** — Vast npm package availability
- **Team familiarity** — Common serverless runtime choice

### Why This S3 Key Structure?
```
projects/{projectName}/{fileType}/{fileName}
```
- **Human-readable** — Easy to browse in S3 console
- **Enables lifecycle policies** — Archive old projects or file types
- **Supports IAM path policies** — Lock down access by project
- **Avoids hot partitions** — Good prefix distribution

---

## Summary

This project demonstrates practical serverless architecture skills:
- **AWS service integration** (Lambda, API Gateway, S3, DynamoDB)
- **Security awareness** (presigned URLs, CORS, least-privilege IAM)
- **Production considerations** (error handling, logging, Infrastructure as Code)
- **Clean code practices** (modular design, consistent patterns)

The implementation prioritizes **simplicity and correctness** over feature completeness, making it a solid foundation that could be extended with the improvements listed above.
