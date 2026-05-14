'use strict';

const fs = require('fs');
const path = require('path');
const { backupFile, restoreAllBackups } = require('./backup');
const { installHook, uninstallHook } = require('./claude-hook');
const { installCommands, uninstallCommands } = require('./claude-commands');

const MARK_BEGIN = '<!-- lakon:begin -->';
const MARK_END = '<!-- lakon:end -->';

function wrap(rule) {
  return `${MARK_BEGIN}\n${rule.trim()}\n${MARK_END}\n`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function readSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function hasBlock(filePath) {
  const existing = readSafe(filePath);
  if (!existing) return false;
  const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}`);
  return re.test(existing);
}

function upsertBlock(platformId, filePath, rule) {
  ensureDir(path.dirname(filePath));
  if (fs.existsSync(filePath) && !hasBlock(filePath)) {
    backupFile(platformId, filePath);
  }
  const existing = readSafe(filePath);
  const block = wrap(rule);
  const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`);
  const next = re.test(existing) ? existing.replace(re, block) : (existing ? `${existing.trim()}\n\n${block}` : block);
  fs.writeFileSync(filePath, next, 'utf8');
  return filePath;
}

function stripBlock(filePath) {
  const existing = readSafe(filePath);
  if (!existing) return null;
  const re = new RegExp(`\\n*${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n?`);
  if (!re.test(existing)) return null;
  const next = existing.replace(re, '').trim();
  if (next) fs.writeFileSync(filePath, next + '\n', 'utf8');
  else fs.unlinkSync(filePath);
  return filePath;
}

function revertPlatform(platformId) {
  return restoreAllBackups(platformId);
}

const PLATFORMS = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    detect: (home) => dirExists(path.join(home, '.claude')),
    install: ({ home, rule, id }) => {
      const rulePath = upsertBlock(id, path.join(home, '.claude', 'CLAUDE.md'), rule);
      const hookResult = installHook(home);
      const cmds = installCommands(home);
      const suffixHook = hookResult.settingsMerged ? '+ PreToolUse hook' : `(hook: ${hookResult.note})`;
      const suffixCmds = cmds.length ? `+ ${cmds.join(' ')}` : '';
      return [rulePath, suffixHook, suffixCmds].filter(Boolean).join(' ');
    },
    uninstall: ({ home }) => {
      uninstallHook(home);
      uninstallCommands(home);
      return stripBlock(path.join(home, '.claude', 'CLAUDE.md'));
    },
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    detect: (home) => dirExists(path.join(home, '.codex')),
    install: ({ home, rule, id }) => upsertBlock(id, path.join(home, '.codex', 'AGENTS.md'), rule),
    uninstall: ({ home }) => stripBlock(path.join(home, '.codex', 'AGENTS.md')),
  },
  {
    id: 'cursor',
    label: 'Cursor (per-repo rule)',
    detect: () => fs.existsSync(path.join(process.cwd(), '.cursor')) || true,
    install: ({ rule, id }) => upsertBlock(id, path.join(process.cwd(), '.cursor', 'rules', 'lakon.mdc'), rule),
    uninstall: () => stripBlock(path.join(process.cwd(), '.cursor', 'rules', 'lakon.mdc')),
  },
  {
    id: 'windsurf',
    label: 'Windsurf (per-repo rule)',
    detect: () => fs.existsSync(path.join(process.cwd(), '.windsurf')) || true,
    install: ({ rule, id }) => upsertBlock(id, path.join(process.cwd(), '.windsurf', 'rules', 'lakon.md'), rule),
    uninstall: () => stripBlock(path.join(process.cwd(), '.windsurf', 'rules', 'lakon.md')),
  },
  {
    id: 'cline',
    label: 'Cline (per-repo rule)',
    detect: () => fs.existsSync(path.join(process.cwd(), '.clinerules')) || true,
    install: ({ rule, id }) => upsertBlock(id, path.join(process.cwd(), '.clinerules', 'lakon.md'), rule),
    uninstall: () => stripBlock(path.join(process.cwd(), '.clinerules', 'lakon.md')),
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    detect: (home) => dirExists(path.join(home, '.gemini')),
    install: ({ home, rule, id }) => upsertBlock(id, path.join(home, '.gemini', 'GEMINI.md'), rule),
    uninstall: ({ home }) => stripBlock(path.join(home, '.gemini', 'GEMINI.md')),
  },
];

module.exports = { list: () => PLATFORMS, revertPlatform };
