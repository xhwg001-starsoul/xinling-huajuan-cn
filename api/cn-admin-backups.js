const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { sendJson, getBearerToken, sendSafeError } = require("./_http");
const { createBackup, listBackups, getBackupDownload, deleteBackup, importBackupFile, importTempDir, maxImportBytes } = require("../services/backupService");

function backupIdFromUrl(req) {
  const url = new URL(req.url || "/api/cn-admin-backups", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[2] || "";
}

async function readRawBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("uploaded_backup_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function extractMultipartFile(buffer, contentType) {
  const match = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) {
    const error = new Error("multipart_boundary_missing");
    error.statusCode = 400;
    throw error;
  }
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  let cursor = buffer.indexOf(boundary);
  while (cursor !== -1) {
    const headerStart = cursor + boundary.length;
    if (buffer.slice(headerStart, headerStart + 2).toString() === "--") break;
    const partStart = buffer.slice(headerStart, headerStart + 2).toString() === "\r\n" ? headerStart + 2 : headerStart;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), partStart);
    if (headerEnd === -1) break;
    const headerText = buffer.slice(partStart, headerEnd).toString("utf8");
    const dataStart = headerEnd + 4;
    let nextBoundary = buffer.indexOf(boundary, dataStart);
    if (nextBoundary === -1) nextBoundary = buffer.length;
    let dataEnd = nextBoundary;
    if (buffer.slice(dataEnd - 2, dataEnd).toString() === "\r\n") dataEnd -= 2;
    if (/name="backupFile"/i.test(headerText) && /filename="/i.test(headerText)) {
      const content = buffer.slice(dataStart, dataEnd);
      if (!content.length) {
        const error = new Error("backup_file_required");
        error.statusCode = 400;
        throw error;
      }
      return content;
    }
    cursor = nextBoundary;
  }
  const error = new Error("backup_file_required");
  error.statusCode = 400;
  throw error;
}

async function handler(req, res) {
  const token = getBearerToken(req);
  try {
    if (req.method === "POST" && req.url.split("?")[0] === "/api/cn-admin-backups/import") {
      fs.mkdirSync(importTempDir, { recursive: true });
      const raw = await readRawBody(req, maxImportBytes + 1024 * 1024);
      const fileBuffer = extractMultipartFile(raw, req.headers["content-type"]);
      if (fileBuffer.length > maxImportBytes) {
        const error = new Error("uploaded_backup_too_large");
        error.statusCode = 413;
        throw error;
      }
      const tempPath = path.join(importTempDir, `upload-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.db`);
      await fsp.writeFile(tempPath, fileBuffer);
      return sendJson(res, 201, { ok: true, backup: await importBackupFile(token, tempPath) });
    }
    if (req.method === "POST" && req.url.split("?")[0] === "/api/cn-admin-backups") {
      return sendJson(res, 201, { ok: true, backup: await createBackup(token) });
    }
    if (req.method === "GET" && req.url.split("?")[0] === "/api/cn-admin-backups") {
      return sendJson(res, 200, { ok: true, backups: listBackups(token) });
    }
    if (req.method === "GET" && /\/download$/.test(req.url.split("?")[0])) {
      const id = backupIdFromUrl(req);
      const download = getBackupDownload(token, id);
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Length": download.size,
        "Content-Disposition": `attachment; filename="${download.fileName}"`,
      });
      return fs.createReadStream(download.filePath).pipe(res);
    }
    if (req.method === "DELETE") {
      const id = backupIdFromUrl(req);
      return sendJson(res, 200, { ok: true, backup: await deleteBackup(token, id) });
    }
    return sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    return sendSafeError(res, error, "cn_admin_backups_failed");
  }
}

module.exports = handler;
