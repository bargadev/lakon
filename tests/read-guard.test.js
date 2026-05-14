'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.join(__dirname, '..', 'src', 'hooks', 'read-guard.js');

function runHook(input) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  return res.stdout.trim();
}

test('denies node_modules paths', () => {
  const out = runHook({
    tool_name: 'Read',
    tool_input: { file_path: '/repo/node_modules/lodash/index.js' },
  });
  const parsed = JSON.parse(out);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(parsed.hookSpecificOutput.permissionDecisionReason, /node_modules/);
});

test('denies lockfiles', () => {
  const out = runHook({
    tool_name: 'Read',
    tool_input: { file_path: '/repo/pnpm-lock.yaml' },
  });
  const parsed = JSON.parse(out);
  assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(parsed.hookSpecificOutput.permissionDecisionReason, /lockfile/);
});

test('denies build artifacts (min.js, tsbuildinfo)', () => {
  const cases = ['/repo/app.min.js', '/repo/tsconfig.tsbuildinfo', '/repo/dist/main.js'];
  for (const fp of cases) {
    const out = runHook({ tool_name: 'Read', tool_input: { file_path: fp } });
    const parsed = JSON.parse(out);
    assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny', `expected deny for ${fp}`);
  }
});

test('passes small file through unchanged', () => {
  const tmp = path.join(os.tmpdir(), `lakon-test-${Date.now()}.txt`);
  fs.writeFileSync(tmp, Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n'));
  try {
    const out = runHook({ tool_name: 'Read', tool_input: { file_path: tmp } });
    assert.equal(out, '');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('caps large file at 800 lines', () => {
  const tmp = path.join(os.tmpdir(), `lakon-test-big-${Date.now()}.txt`);
  fs.writeFileSync(tmp, Array.from({ length: 1500 }, (_, i) => `line ${i}`).join('\n'));
  try {
    const out = runHook({ tool_name: 'Read', tool_input: { file_path: tmp } });
    const parsed = JSON.parse(out);
    assert.equal(parsed.hookSpecificOutput.permissionDecision, 'allow');
    assert.equal(parsed.hookSpecificOutput.updatedInput.limit, 800);
    assert.equal(parsed.hookSpecificOutput.updatedInput.offset, 1);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('respects explicit offset/limit on large file', () => {
  const tmp = path.join(os.tmpdir(), `lakon-test-big2-${Date.now()}.txt`);
  fs.writeFileSync(tmp, Array.from({ length: 1500 }, (_, i) => `line ${i}`).join('\n'));
  try {
    const out = runHook({
      tool_name: 'Read',
      tool_input: { file_path: tmp, offset: 100, limit: 50 },
    });
    assert.equal(out, '');
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('ignores non-Read tools', () => {
  const out = runHook({
    tool_name: 'Bash',
    tool_input: { command: 'ls' },
  });
  assert.equal(out, '');
});
