'use strict';

const fs = require('fs');
const path = require('path');
const { backupFile } = require('./backup');

const HOOKS = [
  {
    basename: 'lakon-bash-rewrite.js',
    src: path.join(__dirname, '..', 'hooks', 'bash-rewrite.js'),
    matcher: 'Bash',
  },
  {
    basename: 'lakon-read-guard.js',
    src: path.join(__dirname, '..', 'hooks', 'read-guard.js'),
    matcher: 'Read',
  },
];

const ALL_BASENAMES = HOOKS.map((h) => h.basename);

function hookDest(home, basename) {
  return path.join(home, '.claude', 'hooks', basename);
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

function entryHasHook(entry, basename) {
  if (!entry || !Array.isArray(entry.hooks)) return false;
  return entry.hooks.some((h) => h && typeof h.command === 'string' && h.command.includes(basename));
}

function mergeHook(data, hookDef, dest) {
  data.hooks = data.hooks || {};
  data.hooks.PreToolUse = data.hooks.PreToolUse || [];

  const existing = data.hooks.PreToolUse.find((e) => e.matcher === hookDef.matcher);
  if (existing) {
    if (!entryHasHook(existing, hookDef.basename)) {
      existing.hooks = existing.hooks || [];
      existing.hooks.push({ type: 'command', command: dest });
    }
  } else {
    data.hooks.PreToolUse.push({
      matcher: hookDef.matcher,
      hooks: [{ type: 'command', command: dest }],
    });
  }
}

function installHook(home) {
  const sp = settingsPath(home);
  if (fs.existsSync(sp)) backupFile('claude-code', sp);

  const { ok, data, error } = readSettings(home);
  if (!ok) {
    return { hookFile: null, settingsMerged: false, note: `settings.json could not be parsed (${error}). Add hook entries manually — see README.` };
  }

  const installed = [];
  for (const h of HOOKS) {
    const dest = hookDest(home, h.basename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(h.src, dest);
    fs.chmodSync(dest, 0o755);
    mergeHook(data, h, dest);
    installed.push(dest);
  }

  writeSettings(home, data);
  return { hookFile: installed.join(', '), settingsMerged: true };
}

function uninstallHook(home) {
  const { ok, data } = readSettings(home);
  if (ok && data.hooks && Array.isArray(data.hooks.PreToolUse)) {
    data.hooks.PreToolUse = data.hooks.PreToolUse
      .map((entry) => {
        if (!Array.isArray(entry.hooks)) return entry;
        const remaining = entry.hooks.filter(
          (h) => !(h.command && ALL_BASENAMES.some((b) => h.command.includes(b)))
        );
        if (remaining.length === 0) return null;
        return { ...entry, hooks: remaining };
      })
      .filter(Boolean);
    if (data.hooks.PreToolUse.length === 0) delete data.hooks.PreToolUse;
    if (data.hooks && Object.keys(data.hooks).length === 0) delete data.hooks;
    if (fs.existsSync(settingsPath(home))) writeSettings(home, data);
  }

  for (const h of HOOKS) {
    const dest = hookDest(home, h.basename);
    if (fs.existsSync(dest)) {
      try { fs.unlinkSync(dest); } catch {}
    }
  }
}

module.exports = { installHook, uninstallHook, hookDest, HOOK_BASENAMES: ALL_BASENAMES };
