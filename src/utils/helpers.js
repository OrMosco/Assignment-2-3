/**
 * Build a standard JSON API response with CORS headers.
 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Map file extension to MIME content type.
 */
function getContentType(fileType) {
  const mimeTypes = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    txt: 'text/plain',
    zip: 'application/zip',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
  };
  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

module.exports = { response, getContentType };
