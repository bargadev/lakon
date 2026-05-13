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

function backupFile(platformId, filePath) {
  if (!fs.existsSync(filePath)) return null;
  const dir = platformDir(platformId);
  fs.mkdirSync(dir, { recursive: true });
  const ts = Date.now();
  const dest = path.join(dir, `${path.basename(filePath)}.${ts}.bak`);
  fs.copyFileSync(filePath, dest);
  const manifest = path.join(dir, 'manifest.json');
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(manifest, 'utf8')); } catch {}
  entries.push({ ts, source: filePath, backup: dest });
  fs.writeFileSync(manifest, JSON.stringify(entries, null, 2));
  return dest;
}

function latestBackup(platformId) {
  const manifest = path.join(platformDir(platformId), 'manifest.json');
  try {
    const entries = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return entries[entries.length - 1] || null;
  } catch {
    return null;
  }
}

function listBackups(platformId) {
  const manifest = path.join(platformDir(platformId), 'manifest.json');
  try { return JSON.parse(fs.readFileSync(manifest, 'utf8')); }
  catch { return []; }
}

function restoreBackup(platformId) {
  const entry = latestBackup(platformId);
  if (!entry) return null;
  if (!fs.existsSync(entry.backup)) return null;
  fs.mkdirSync(path.dirname(entry.source), { recursive: true });
  fs.copyFileSync(entry.backup, entry.source);
  return entry;
}

module.exports = { backupFile, latestBackup, listBackups, restoreBackup, backupRoot };
