'use strict';

const { stripAnsi, truncateLines } = require('./utils');

const DEFAULT_MAX_LINES = 200;
const BLANK_RUN_RE = /\n[\t ]*\n([\t ]*\n)+/g;

function compactBlankRuns(text) {
  return text.replace(BLANK_RUN_RE, '\n\n');
}

function filter(raw, opts = {}) {
  const max = opts.maxLines || DEFAULT_MAX_LINES;
  const compacted = compactBlankRuns(stripAnsi(raw));
  return truncateLines(compacted, max);
}

module.exports = { filter, compactBlankRuns };
