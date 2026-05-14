#!/usr/bin/env node
'use strict';

const { checkForUpdate, formatNotice } = require('./version-check');

async function readStdin() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

async function main() {
  try {
    await readStdin();
    const update = await checkForUpdate();
    if (!update) process.exit(0);

    const response = {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: formatNotice(update),
      },
    };
    process.stdout.write(JSON.stringify(response));
    process.exit(0);
    /* c8 ignore next 3 */
  } catch {
    process.exit(0);
  }
}

main();
