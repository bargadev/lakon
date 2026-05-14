'use strict';

const fs = require('fs');
const path = require('path');

const COMMANDS = [
  {
    name: 'gain',
    body: `---
description: Show lakon token savings (raw vs filtered, per window and top commands).
allowed-tools: Bash(lakon gain:*), Bash(lak gain:*)
---

Run \`lakon gain\` and show the output verbatim. Do not summarize — the table is the answer.
`,
  },
  {
    name: 'reset',
    body: `---
description: Wipe the lakon savings log.
allowed-tools: Bash(lakon reset:*)
---

Run \`lakon reset\` and show the output. Confirm with the user before running if they didn't explicitly ask to clear.
`,
  },
  {
    name: 'inspect',
    body: `---
description: Run a command once through lakon and compare raw vs filtered token counts.
argument-hint: <command> [args...]
allowed-tools: Bash(lakon inspect:*)
---

Run \`lakon inspect $ARGUMENTS\` and show the output verbatim.
`,
  },
];

function commandsDir(home) {
  return path.join(home, '.claude', 'commands', 'lakon');
}

function installCommands(home) {
  const dir = commandsDir(home);
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const c of COMMANDS) {
    const p = path.join(dir, `${c.name}.md`);
    fs.writeFileSync(p, c.body, 'utf8');
    written.push(`/lakon:${c.name}`);
  }
  return written;
}

function uninstallCommands(home) {
  const dir = commandsDir(home);
  const removed = [];
  for (const c of COMMANDS) {
    const p = path.join(dir, `${c.name}.md`);
    try { fs.unlinkSync(p); removed.push(p); } catch {}
  }
  try {
    const left = fs.readdirSync(dir);
    if (!left.length) fs.rmdirSync(dir);
  } catch {}
  return removed;
}

module.exports = { installCommands, uninstallCommands, commandsDir };
