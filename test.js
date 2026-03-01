/**
 * End-to-End Test Script for Serverless File Management Service
 *
 * Tests the complete lifecycle:
 *   1. Upload request (presigned URL generation)
 *   2. Direct file upload to S3
 *   3. S3 sync trigger (PENDING → UPLOADED)
 *   4. List files by project
 *   5. Filter files by type within a project
 *   6. Cross-project type query (GSI)
 *   7. Download URL generation
 *   8. Actual file download & integrity check
 *
 * Usage: node test.js
 */

const BASE_URL = 'https://dju30c5rd0.execute-api.eu-west-1.amazonaws.com/dev';
const PROJECT_NAME = `TestProject-${Date.now()}`;
const FILE_TYPE = 'txt';
const FILE_NAME = 'test-document.txt';
const FILE_CONTENT = 'Hello from the Serverless File Management Service! This is a test file.';

let uploadResult = null;
let passed = 0;
let failed = 0;

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text), ok: res.ok };
  } catch {
    return { status: res.status, data: text, ok: res.ok };
  }
}

function log(testNum, name, success, details = '') {
  const icon = success ? '✅' : '❌';
  console.log(`  ${icon} Test ${testNum}: ${name}${details ? ' — ' + details : ''}`);
  if (success) passed++;
  else failed++;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Serverless File Management Service — E2E Test Suite    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  API:     ${BASE_URL}`);
  console.log(`  Project: ${PROJECT_NAME}`);
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');

  // ─── Test 1: POST /upload ────────────────────────────────────────
  try {
    const res = await request(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: PROJECT_NAME,
        fileType: FILE_TYPE,
        fileName: FILE_NAME,
      }),
    });

    uploadResult = res.data;
    const success = res.ok && uploadResult.uploadUrl && uploadResult.fileId && uploadResult.s3Key;
    log(1, 'POST /upload (presigned URL)', success, `fileId: ${uploadResult.fileId}`);
  } catch (err) {
    log(1, 'POST /upload (presigned URL)', false, err.message);
  }

  // ─── Test 2: PUT file to S3 ─────────────────────────────────────
  try {
    const res = await fetch(uploadResult.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: FILE_CONTENT,
    });

    log(2, 'PUT file directly to S3', res.ok, `HTTP ${res.status}`);
  } catch (err) {
    log(2, 'PUT file directly to S3', false, err.message);
  }

  // ─── Test 3: Wait for S3 sync trigger ───────────────────────────
  console.log('  ⏳ Waiting 5s for S3 sync trigger...');
  await sleep(5000);

  try {
    const res = await request(`${BASE_URL}/projects/${PROJECT_NAME}/files`);
    const file = res.data.files?.find((f) => f.fileId === uploadResult.fileId);
    const success = file && file.status === 'UPLOADED';
    log(3, 'S3 sync trigger (PENDING → UPLOADED)', success, `status: ${file?.status || 'NOT FOUND'}`);
  } catch (err) {
    log(3, 'S3 sync trigger (PENDING → UPLOADED)', false, err.message);
  }

  // ─── Test 4: GET /projects/{name}/files ─────────────────────────
  try {
    const res = await request(`${BASE_URL}/projects/${PROJECT_NAME}/files`);
    const success = res.ok && res.data.count >= 1;
    log(4, 'GET /projects/{name}/files (list all)', success, `count: ${res.data.count}`);
  } catch (err) {
    log(4, 'GET /projects/{name}/files (list all)', false, err.message);
  }

  // ─── Test 5: GET /projects/{name}/files?fileType= ───────────────
  try {
    const res = await request(`${BASE_URL}/projects/${PROJECT_NAME}/files?fileType=${FILE_TYPE}`);
    const success = res.ok && res.data.count >= 1 && res.data.files.every((f) => f.fileType === FILE_TYPE);
    log(5, `GET /projects/{name}/files?fileType=${FILE_TYPE}`, success, `count: ${res.data.count}`);
  } catch (err) {
    log(5, `GET /projects/{name}/files?fileType=${FILE_TYPE}`, false, err.message);
  }

  // ─── Test 6: GET /files?fileType= (GSI cross-project) ──────────
  try {
    const res = await request(`${BASE_URL}/files?fileType=${FILE_TYPE}`);
    const hasOurFile = res.data.files?.some((f) => f.fileId === uploadResult.fileId);
    log(6, `GET /files?fileType=${FILE_TYPE} (GSI query)`, res.ok && hasOurFile, `total: ${res.data.count}`);
  } catch (err) {
    log(6, `GET /files?fileType=${FILE_TYPE} (GSI query)`, false, err.message);
  }

  // ─── Test 7: GET /files/{id}/download ───────────────────────────
  let downloadUrl = null;
  try {
    const res = await request(
      `${BASE_URL}/files/${uploadResult.fileId}/download?projectName=${PROJECT_NAME}`
    );
    downloadUrl = res.data.downloadUrl;
    const success = res.ok && downloadUrl && res.data.fileName === FILE_NAME;
    log(7, 'GET /files/{id}/download (presigned URL)', success, `fileName: ${res.data.fileName}`);
  } catch (err) {
    log(7, 'GET /files/{id}/download (presigned URL)', false, err.message);
  }

  // ─── Test 8: Actual file download & integrity check ─────────────
  try {
    const res = await fetch(downloadUrl);
    const content = await res.text();
    const success = content.includes(FILE_CONTENT);
    log(8, 'Download file & integrity check', success, `${content.length} bytes, content matches: ${success}`);
  } catch (err) {
    log(8, 'Download file & integrity check', false, err.message);
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('─────────────────────────────────────────────────────────────');

  if (failed === 0) {
    console.log('  🎉 All tests passed!');
  } else {
    console.log('  ⚠️  Some tests failed.');
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
