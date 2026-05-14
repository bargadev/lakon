'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function dataDir() {
  return process.env.LAKON_HOME || path.join(os.homedir(), '.lakon');
}

function logPath() {
  return path.join(dataDir(), 'log.jsonl');
}

function record({ cmd, args, rawTokens, filteredTokens }) {
  if (process.env.LAKON_NO_TRACK === '1') return;
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    const entry = {
      t: Date.now(),
      cmd,
      args: Array.isArray(args) ? args.slice(0, 4) : [],
      raw: rawTokens,
      out: filteredTokens,
      saved: Math.max(0, rawTokens - filteredTokens),
    };
    fs.appendFileSync(logPath(), JSON.stringify(entry) + '\n');
  } catch {
    // never let tracking break a user command
  }
}

function readEntries() {
  try {
    const raw = fs.readFileSync(logPath(), 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isSessionEntry(e) {
  return e.cmd === 'session';
}

function aggregate(entries) {
  const filtered = entries.filter((e) => !isSessionEntry(e));
  const sum = (xs, k) => xs.reduce((a, e) => a + (e[k] || 0), 0);
  return {
    calls: filtered.length,
    raw: sum(filtered, 'raw'),
    out: sum(filtered, 'out'),
    saved: sum(filtered, 'saved'),
  };
}

function aggregateSessions(entries) {
  const sessions = entries.filter(isSessionEntry);
  const sum = (k) => sessions.reduce((a, e) => a + (e[k] || 0), 0);
  return {
    turns: sessions.length,
    in_tokens: sum('in_tokens'),
    out_tokens: sum('out_tokens'),
    cache_read: sum('cache_read'),
  };
}

function inWindow(entries, ms) {
  if (ms === Infinity) return entries;
  const cutoff = Date.now() - ms;
  return entries.filter((e) => e.t >= cutoff);
}

function byWindow(entries, ms) {
  return aggregate(inWindow(entries, ms));
}

function byWindowSessions(entries, ms) {
  return aggregateSessions(inWindow(entries, ms));
}

function byCommand(entries) {
  const map = new Map();
  for (const e of entries) {
    if (isSessionEntry(e)) continue;
    const k = e.cmd || 'unknown';
    if (!map.has(k)) map.set(k, { cmd: k, calls: 0, raw: 0, out: 0, saved: 0 });
    const acc = map.get(k);
    acc.calls += 1;
    acc.raw += e.raw || 0;
    acc.out += e.out || 0;
    acc.saved += e.saved || 0;
  }
  return [...map.values()].sort((a, b) => b.saved - a.saved);
}

function pct(saved, raw) {
  if (!raw) return 0;
  return Math.round((saved / raw) * 100);
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function tok(n) {
  return fmt(n) + ' tok';
}

const WINDOW_LABELS = [
  ['last hour ', HOUR_MS],
  ['last 24h  ', DAY_MS],
  ['last 7d   ', WEEK_MS],
  ['last 30d  ', 30 * DAY_MS],
  ['all time  ', Infinity],
];

function report() {
  const entries = readEntries();
  if (!entries.length) {
    return 'lakon: no usage recorded yet. Run a few commands through `lakon` first.\n';
  }

  const lines = [];
  lines.push('lakon — savings report');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('shell + read/grep guards (tokens filtered before context):');
  lines.push('window      calls    before       after        saved       %');
  lines.push('───────────────────────────────────────────────────────────');
  for (const [label, ms] of WINDOW_LABELS) {
    const agg = byWindow(entries, ms);
    const row =
      `${label}` +
      `${String(agg.calls).padStart(6)}  ` +
      `${tok(agg.raw).padStart(10)}  ` +
      `${tok(agg.out).padStart(10)}   ` +
      `${tok(agg.saved).padStart(10)}   ` +
      `${pct(agg.saved, agg.raw).toString().padStart(3)}%`;
    lines.push(row);
  }
  lines.push('───────────────────────────────────────────────────────────');

  const sessionsAll = aggregateSessions(entries);
  if (sessionsAll.turns > 0) {
    lines.push('');
    lines.push('session output (LLM tokens — terse style trims this side):');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('window      turns    input        output       cache-read');
    lines.push('───────────────────────────────────────────────────────────');
    for (const [label, ms] of WINDOW_LABELS) {
      const agg = byWindowSessions(entries, ms);
      const row =
        `${label}` +
        `${String(agg.turns).padStart(6)}  ` +
        `${tok(agg.in_tokens).padStart(10)}  ` +
        `${tok(agg.out_tokens).padStart(10)}   ` +
        `${tok(agg.cache_read).padStart(10)}`;
      lines.push(row);
    }
    lines.push('───────────────────────────────────────────────────────────');
  }

  const top = byCommand(entries).slice(0, 5);
  if (top.length) {
    lines.push('');
    lines.push('top commands (all time):');
    for (const c of top) {
      lines.push(`  ${c.cmd.padEnd(8)} calls=${c.calls}  saved=${tok(c.saved)}  ${pct(c.saved, c.raw)}%`);
    }
  }

  lines.push('');
  lines.push(`log: ${logPath()}`);
  return lines.join('\n') + '\n';
}

function reset() {
  try { fs.unlinkSync(logPath()); return true; }
  catch { return false; }
}

module.exports = { record, report, reset, readEntries, logPath };
