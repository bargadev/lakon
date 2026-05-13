'use strict';

const fs = require('fs');
const path = require('path');
const { backupFile } = require('./backup');

const HOOK_BASENAME = 'lakon-bash-rewrite.js';
const HOOK_SRC = path.join(__dirname, '..', 'hooks', 'bash-rewrite.js');

function hookDest(home) {
  return path.join(home, '.claude', 'hooks', HOOK_BASENAME);
}

function settingsPath(home) {
  return path.join(home, '.claude', 'settings.json');
}

function readSettings(home) {
  const p = settingsPath(home);
  if (!fs.existsSync(p)) return { ok: true, data: {} };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function writeSettings(home, data) {
  fs.writeFileSync(settingsPath(home), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function hasOurHook(entry) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => h && typeof h.command === 'string' && h.command.includes(HOOK_BASENAME));
}

function installHook(home) {
  const dest = hookDest(home);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(HOOK_SRC, dest);
  fs.chmodSync(dest, 0o755);

  const sp = settingsPath(home);
  if (fs.existsSync(sp)) backupFile('claude-code', sp);

  const { ok, data, error } = readSettings(home);
  if (!ok) {
    return { hookFile: dest, settingsMerged: false, note: `settings.json could not be parsed (${error}). Add the hook entry manually — see README.` };
  }

  data.hooks = data.hooks || {};
  data.hooks.PreToolUse = data.hooks.PreToolUse || [];

  const existing = data.hooks.PreToolUse.find((e) => e.matcher === 'Bash');
  if (existing) {
    if (!hasOurHook(existing)) {
      existing.hooks = existing.hooks || [];
      existing.hooks.push({ type: 'command', command: dest });
    }
  } else {
    data.hooks.PreToolUse.push({
      matcher: 'Bash',
      hooks: [{ type: 'command', command: dest }],
    });
  }

  writeSettings(home, data);
  return { hookFile: dest, settingsMerged: true };
}

function uninstallHook(home) {
  const dest = hookDest(home);

  const { ok, data } = readSettings(home);
  if (ok && data.hooks && Array.isArray(data.hooks.PreToolUse)) {
    data.hooks.PreToolUse = data.hooks.PreToolUse
      .map((entry) => {
        if (entry.matcher !== 'Bash' || !Array.isArray(entry.hooks)) return entry;
        const remaining = entry.hooks.filter((h) => !(h.command && h.command.includes(HOOK_BASENAME)));
        if (remaining.length === 0) return null;
        return { ...entry, hooks: remaining };
      })
      .filter(Boolean);
    if (data.hooks.PreToolUse.length === 0) delete data.hooks.PreToolUse;
    if (data.hooks && Object.keys(data.hooks).length === 0) delete data.hooks;
    if (fs.existsSync(settingsPath(home))) writeSettings(home, data);
  }

  if (fs.existsSync(dest)) {
    try { fs.unlinkSync(dest); } catch {}
  }
}

module.exports = { installHook, uninstallHook, hookDest, HOOK_BASENAME };
