'use strict';

const git = require('./git');
const ls = require('./ls');
const cat = require('./cat');
const grep = require('./grep');
const { countTokensApprox } = require('./utils');

const HANDLERS = {
  git: (args, raw) => git.filter(args[0], raw),
  ls: (_args, raw) => ls.filter(raw),
  tree: (_args, raw) => ls.filter(raw),
  cat: (_args, raw) => cat.filter(raw),
  head: (_args, raw) => cat.filter(raw, { maxLines: 50 }),
  tail: (_args, raw) => cat.filter(raw, { maxLines: 50 }),
  grep: (_args, raw) => grep.filter(raw),
  rg: (_args, raw) => grep.filter(raw),
  ag: (_args, raw) => grep.filter(raw),
};

function isSupported(cmd) {
  return Object.prototype.hasOwnProperty.call(HANDLERS, cmd);
}

function filterCommand(cmd, args, raw) {
  const handler = HANDLERS[cmd];
  if (!handler) return raw;
  try {
    return handler(args, raw);
  } catch {
    return raw;
  }
}

module.exports = { filterCommand, isSupported, countTokensApprox, HANDLERS };
