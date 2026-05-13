'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function backupRoot() {
  const base = process.env.LAKON_HOME || path.join(os.homedir(), '.lakon');
  return path.join(base, 'backups');
}

function platformDir(platformId) {
  return path.join(backupRoot(), platformId);
}

function manifestPath(platformId) {
  return path.join(platformDir(platformId), 'manifest.json');
}

function listBackups(platformId) {
  try { return JSON.parse(fs.readFileSync(manifestPath(platformId), 'utf8')); }
  catch { return []; }
}

function hasBackupFor(platformId, filePath) {
  return listBackups(platformId).some((e) => e.source === filePath);
}

function backupFile(platformId, filePath, { skipIfExists = true } = {}) {
  if (!fs.existsSync(filePath)) return null;
  if (skipIfExists && hasBackupFor(platformId, filePath)) return null;

  const dir = platformDir(platformId);
  fs.mkdirSync(dir, { recursive: true });
  const ts = Date.now();
  const dest = path.join(dir, `${path.basename(filePath)}.${ts}.bak`);
  fs.copyFileSync(filePath, dest);

  const entries = listBackups(platformId);
  entries.push({ ts, source: filePath, backup: dest });
  fs.writeFileSync(manifestPath(platformId), JSON.stringify(entries, null, 2));
  return dest;
}

function latestPerSource(platformId) {
  const entries = listBackups(platformId);
  const bySource = new Map();
  for (const e of entries) bySource.set(e.source, e);
  return [...bySource.values()];
}

function restoreAllBackups(platformId) {
  const entries = latestPerSource(platformId);
  const restored = [];
  for (const entry of entries) {
    if (!fs.existsSync(entry.backup)) continue;
    fs.mkdirSync(path.dirname(entry.source), { recursive: true });
    fs.copyFileSync(entry.backup, entry.source);
    restored.push(entry);
  }
  return restored;
}

module.exports = {
  backupFile,
  listBackups,
  hasBackupFor,
  restoreAllBackups,
  backupRoot,
};
