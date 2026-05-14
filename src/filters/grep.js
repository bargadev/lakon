'use strict';

const { stripAnsi } = require('./utils');

const KEEP_HEAD = 15;

function filter(raw) {
  const lines = stripAnsi(raw).split('\n').filter(Boolean);
  if (lines.length <= KEEP_HEAD) return lines.join('\n');
  const head = lines.slice(0, KEEP_HEAD).join('\n');
  return `${head}\n… +${lines.length - KEEP_HEAD} more matches (tighten the pattern)`;
}

module.exports = { filter };
