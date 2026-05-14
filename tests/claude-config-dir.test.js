'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function freshHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lakon-cfg-'));
}

function withEnv(key, value, fn) {
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
}

function freshRequire(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('claudeConfigDir defaults to ~/.claude', () => {
  withEnv('CLAUDE_CONFIG_DIR', undefined, () => {
    const { claudeConfigDir } = freshRequire('../src/install/paths');
    assert.equal(claudeConfigDir('/tmp/fakehome'), '/tmp/fakehome/.claude');
  });
});

test('claudeConfigDir honors CLAUDE_CONFIG_DIR env var', () => {
  withEnv('CLAUDE_CONFIG_DIR', '/custom/claude-arco', () => {
    const { claudeConfigDir } = freshRequire('../src/install/paths');
    assert.equal(claudeConfigDir('/tmp/fakehome'), '/custom/claude-arco');
  });
});

test('installHook writes to CLAUDE_CONFIG_DIR when set', () => {
  const home = freshHome();
  const cfgDir = path.join(home, '.claude-arco');
  withEnv('CLAUDE_CONFIG_DIR', cfgDir, () => {
    const { installHook } = freshRequire('../src/install/claude-hook');
    installHook(home);
    assert.ok(fs.existsSync(path.join(cfgDir, 'hooks', 'lakon-bash-rewrite.js')));
    assert.ok(fs.existsSync(path.join(cfgDir, 'hooks', 'lakon-stop-hook.js')));
    assert.ok(fs.existsSync(path.join(cfgDir, 'settings.json')));
    assert.ok(!fs.existsSync(path.join(home, '.claude', 'hooks')));
  });
});

test('installCommands writes to CLAUDE_CONFIG_DIR when set', () => {
  const home = freshHome();
  const cfgDir = path.join(home, '.claude-my');
  withEnv('CLAUDE_CONFIG_DIR', cfgDir, () => {
    const { installCommands } = freshRequire('../src/install/claude-commands');
    installCommands(home);
    assert.ok(fs.existsSync(path.join(cfgDir, 'commands', 'lakon', 'gain.md')));
    assert.ok(!fs.existsSync(path.join(home, '.claude', 'commands')));
  });
});

test('isolation: two CLAUDE_CONFIG_DIRs produce independent installs', () => {
  const home = freshHome();
  const dirMy = path.join(home, '.claude-my');
  const dirArco = path.join(home, '.claude-arco');

  withEnv('CLAUDE_CONFIG_DIR', dirMy, () => {
    const { installHook } = freshRequire('../src/install/claude-hook');
    installHook(home);
  });
  withEnv('CLAUDE_CONFIG_DIR', dirArco, () => {
    const { installHook } = freshRequire('../src/install/claude-hook');
    installHook(home);
  });

  assert.ok(fs.existsSync(path.join(dirMy, 'hooks', 'lakon-stop-hook.js')));
  assert.ok(fs.existsSync(path.join(dirArco, 'hooks', 'lakon-stop-hook.js')));
  assert.ok(!fs.existsSync(path.join(home, '.claude')));
});

test('uninstallHook removes from CLAUDE_CONFIG_DIR', () => {
  const home = freshHome();
  const cfgDir = path.join(home, '.claude-arco');
  withEnv('CLAUDE_CONFIG_DIR', cfgDir, () => {
    const { installHook, uninstallHook } = freshRequire('../src/install/claude-hook');
    installHook(home);
    uninstallHook(home);
    assert.equal(fs.existsSync(path.join(cfgDir, 'hooks', 'lakon-bash-rewrite.js')), false);
    const settings = JSON.parse(fs.readFileSync(path.join(cfgDir, 'settings.json'), 'utf8'));
    assert.equal(Object.keys(settings).length, 0);
  });
});
