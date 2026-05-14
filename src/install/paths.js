'use strict';

const path = require('path');

function claudeConfigDir(home) {
  return process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
}

module.exports = { claudeConfigDir };
