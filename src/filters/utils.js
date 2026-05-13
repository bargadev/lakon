'use strict';

const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function stripAnsi(s) {
  return typeof s === 'string' ? s.replace(ANSI_RE, '') : s;
}

function truncateLines(text, maxLines, marker) {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  const kept = lines.slice(0, maxLines).join('\n');
  const dropped = lines.length - maxLines;
  const note = marker || `… +${dropped} more lines`;
  return `${kept}\n${note}`;
}

function truncateBytes(text, maxBytes, marker) {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  const buf = Buffer.from(text, 'utf8').subarray(0, maxBytes);
  const note = marker || `… truncated at ${maxBytes} bytes`;
  return `${buf.toString('utf8')}\n${note}`;
}

function countTokensApprox(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

module.exports = { stripAnsi, truncateLines, truncateBytes, countTokensApprox };
