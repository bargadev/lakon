#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const { filterCommand, isSupported, countTokensApprox } = require('../src/filters');
const { install, uninstall, revert, listPlatforms, backupsReport } = require('../src/install');
const tracking = require('../src/tracking');

const HELP = `lakon — spartan replies for AI agents

Usage:
  lakon <cmd> [args...]      Run <cmd> and filter its output (tracks savings)
  lak <cmd> [args...]        (short alias)

  lakon install              Install rule + hooks for detected GLOBAL platforms
                             (Claude Code / Codex / Gemini — touches ~/ only)
  lakon install --here       Same as above + per-project rules (Cursor /
                             Windsurf / Cline) written into the current dir
  lakon install --only <p>   Install just one platform by id (any scope)
                             (every install backs up the target file first)
  lakon uninstall            Strip the lakon block (keeps rest of file)
  lakon revert [--only <p>]  Restore files to pre-install state from backup
  lakon backups              Show backup history per platform
  lakon list                 Show supported platforms

  lakon gain                 Show token savings (hour / day / week / month / all)
  lakon inspect <cmd> ...    Run <cmd> once and show raw vs filtered (no tracking)
  lakon reset                Wipe the savings log
  lakon --help               This help

Supported filters: git (log/status/diff/show), ls, tree, cat, head, tail, grep, rg, ag.
Unsupported commands run unchanged (passthrough, still tracked as 0% savings).

Multi-profile Claude Code (e.g. claude-my / claude-arco wrappers):
  CLAUDE_CONFIG_DIR=$HOME/.claude-my   lakon install
  CLAUDE_CONFIG_DIR=$HOME/.claude-arco lakon install
`;

function runAndFilter(cmd, args) {
  const child = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] });
  if (child.error) {
    process.stderr.write(`lakon: ${child.error.message}\n`);
    process.exit(127);
  }
  const raw = child.stdout || '';
  const filtered = isSupported(cmd) ? filterCommand(cmd, args, raw) : raw;
  process.stdout.write(filtered);
  if (filtered && !filtered.endsWith('\n')) process.stdout.write('\n');

  tracking.record({
    cmd,
    args,
    rawTokens: countTokensApprox(raw),
    filteredTokens: countTokensApprox(filtered),
  });

  process.exit(child.status ?? 0);
}

function inspectCmd(rest) {
  if (!rest.length) {
    process.stderr.write('lakon inspect: missing command\n');
    process.exit(2);
  }
  const [cmd, ...args] = rest;
  const child = spawnSync(cmd, args, { encoding: 'utf8' });
  const raw = child.stdout || '';
  const filtered = isSupported(cmd) ? filterCommand(cmd, args, raw) : raw;
  const rawTokens = countTokensApprox(raw);
  const newTokens = countTokensApprox(filtered);
  const saved = rawTokens === 0 ? 0 : Math.round((1 - newTokens / rawTokens) * 100);
  process.stdout.write(
    `cmd:      ${cmd} ${args.join(' ')}\n` +
      `raw:      ${rawTokens} tokens (${raw.length} bytes)\n` +
      `filtered: ${newTokens} tokens (${filtered.length} bytes)\n` +
      `saved:    ${saved}%\n`
  );
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(HELP);
    return;
  }

  const [first, ...rest] = argv;

  if (first === 'install') {
    const onlyIdx = rest.indexOf('--only');
    const only = onlyIdx >= 0 ? rest[onlyIdx + 1] : null;
    const here = rest.includes('--here');
    await install({ only, here });
    return;
  }
  if (first === 'uninstall') {
    await uninstall();
    return;
  }
  if (first === 'revert') {
    const onlyIdx = rest.indexOf('--only');
    const only = onlyIdx >= 0 ? rest[onlyIdx + 1] : null;
    await revert({ only });
    return;
  }
  if (first === 'backups') {
    process.stdout.write(backupsReport());
    return;
  }
  if (first === 'list') {
    process.stdout.write(listPlatforms().join('\n') + '\n');
    return;
  }
  if (first === 'gain' || first === 'stats') {
    process.stdout.write(tracking.report());
    return;
  }
  if (first === 'inspect') {
    inspectCmd(rest);
    return;
  }
  if (first === 'reset') {
    const ok = tracking.reset();
    process.stdout.write(ok ? 'lakon: log cleared\n' : 'lakon: nothing to clear\n');
    return;
  }

  runAndFilter(first, rest);
}

main().catch((err) => {
  process.stderr.write(`lakon: ${err.message}\n`);
  process.exit(1);
});
