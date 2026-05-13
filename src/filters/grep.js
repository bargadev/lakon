'use strict';

const { stripAnsi, truncateLines } = require('./utils');

function filter(raw) {
  const lines = stripAnsi(raw).split('\n').filter(Boolean);
  if (lines.length <= 50) return lines.join('\n');
  const head = lines.slice(0, 40).join('\n');
  return `${head}\n… +${lines.length - 40} more matches (use a tighter pattern)`;
}

module.exports = { filter };
