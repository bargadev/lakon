'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const platforms = require('./platforms');
const { listBackups } = require('./backup');

const RULE_PATH = path.join(__dirname, '..', 'rules', 'caveman.md');

function readRule() {
  return fs.readFileSync(RULE_PATH, 'utf8');
}

function detectPlatforms() {
  const home = os.homedir();
  return platforms.list().filter((p) => p.detect(home));
}

async function install({ only } = {}) {
  const rule = readRule();
  const home = os.homedir();
  const targets = only
    ? platforms.list().filter((p) => p.id === only)
    : detectPlatforms();

  if (!targets.length) {
    if (only) {
      process.stdout.write(`lakon: unknown platform "${only}". Run \`lakon list\` to see options.\n`);
    } else {
      process.stdout.write('lakon: no supported platforms detected. Install Claude Code, Codex, Cursor, Windsurf, Cline, or Gemini CLI first.\n');
    }
    process.exitCode = 1;
    return;
  }

  for (const p of targets) {
    try {
      const result = p.install({ home, rule, id: p.id });
      process.stdout.write(`installed: ${p.label} → ${result}\n`);
    } catch (err) {
      process.stdout.write(`failed:    ${p.label} (${err.message})\n`);
      process.exitCode = 1;
    }
  }
  process.stdout.write('\nTip: `lakon uninstall` removes only the lakon block.\n');
  process.stdout.write('     `lakon revert` restores the file to its pre-install state from backup.\n');
}

async function uninstall() {
  const home = os.homedir();
  for (const p of platforms.list()) {
    try {
      const result = p.uninstall({ home });
      if (result) process.stdout.write(`removed:   ${p.label} → ${result}\n`);
    } catch (err) {
      process.stdout.write(`failed:    ${p.label} (${err.message})\n`);
    }
  }
}

async function revert({ only } = {}) {
  const targets = only
    ? platforms.list().filter((p) => p.id === only)
    : platforms.list();

  let any = false;
  for (const p of targets) {
    const entry = platforms.revertPlatform(p.id);
    if (entry) {
      const when = new Date(entry.ts).toISOString().replace('T', ' ').slice(0, 19);
      process.stdout.write(`restored:  ${p.label} → ${entry.source}\n           (from backup taken ${when})\n`);
      any = true;
    }
  }
  if (!any) {
    process.stdout.write('lakon: no backups found. (Backups only exist for files that already had content before install.)\n');
  }
}

function backupsReport() {
  const lines = ['lakon — backup history'];
  let any = false;
  for (const p of platforms.list()) {
    const entries = listBackups(p.id);
    if (!entries.length) continue;
    any = true;
    lines.push('');
    lines.push(`${p.label} (${p.id}):`);
    for (const e of entries) {
      const when = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19);
      lines.push(`  ${when}  ${e.source}\n      → ${e.backup}`);
    }
  }
  if (!any) lines.push('\n(no backups yet)');
  return lines.join('\n') + '\n';
}

function listPlatforms() {
  return platforms.list().map((p) => {
    const detected = p.detect(os.homedir()) ? ' (detected)' : '';
    return `${p.id.padEnd(14)} ${p.label}${detected}`;
  });
}

module.exports = { install, uninstall, revert, listPlatforms, backupsReport };
