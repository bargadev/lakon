'use strict';

const { stripAnsi, truncateLines } = require('./utils');

const DEFAULT_MAX_LINES = 500;

function filter(raw, opts = {}) {
  const max = opts.maxLines || DEFAULT_MAX_LINES;
  return truncateLines(stripAnsi(raw), max);
}

module.exports = { filter };
