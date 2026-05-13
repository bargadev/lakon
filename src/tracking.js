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

function aggregate(entries) {
  const sum = (xs, k) => xs.reduce((a, e) => a + (e[k] || 0), 0);
  return {
    calls: entries.length,
    raw: sum(entries, 'raw'),
    out: sum(entries, 'out'),
    saved: sum(entries, 'saved'),
  };
}

function byWindow(entries, ms) {
  const cutoff = Date.now() - ms;
  return aggregate(entries.filter((e) => e.t >= cutoff));
}

function byCommand(entries) {
  const map = new Map();
  for (const e of entries) {
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

function report() {
  const entries = readEntries();
  if (!entries.length) {
    return 'lakon: no usage recorded yet. Run a few commands through `lakon` first.\n';
  }
  const buckets = [
    ['last hour ', byWindow(entries, HOUR_MS)],
    ['last 24h  ', byWindow(entries, DAY_MS)],
    ['last 7d   ', byWindow(entries, WEEK_MS)],
    ['last 30d  ', byWindow(entries, 30 * DAY_MS)],
    ['all time  ', aggregate(entries)],
  ];

  const lines = [];
  lines.push('lakon — savings report');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('window      calls    raw       filtered   saved      %');
  lines.push('───────────────────────────────────────────────────────────');
  for (const [label, agg] of buckets) {
    const row =
      `${label}` +
      `${String(agg.calls).padStart(6)}  ` +
      `${fmt(agg.raw).padStart(8)}  ` +
      `${fmt(agg.out).padStart(8)}   ` +
      `${fmt(agg.saved).padStart(8)}   ` +
      `${pct(agg.saved, agg.raw).toString().padStart(3)}%`;
    lines.push(row);
  }
  lines.push('───────────────────────────────────────────────────────────');

  const top = byCommand(entries).slice(0, 5);
  if (top.length) {
    lines.push('');
    lines.push('top commands (all time):');
    for (const c of top) {
      lines.push(`  ${c.cmd.padEnd(8)} calls=${c.calls}  saved=${fmt(c.saved)}  ${pct(c.saved, c.raw)}%`);
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
