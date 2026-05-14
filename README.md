<p align="center">
  <img src="./assets/logo.svg" width="140" alt="lakon" />
</p>

<h1 align="center">lakon</h1>

<p align="center">
  <strong>Cut LLM tokens by up to 94% — without losing a single identifier.</strong>
</p>

<p align="center">
  <em>Spartan replies for AI agents. Less words. Win wars.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@bargadev/lakon"><img src="https://img.shields.io/npm/v/@bargadev/lakon?color=0F0F0F&label=npm" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0F0F0F" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A518-0F0F0F" alt="node ≥18" />
  <img src="https://img.shields.io/badge/deps-0-0F0F0F" alt="zero dependencies" />
  <img src="https://img.shields.io/badge/agents-6-0F0F0F" alt="6 AI agents" />
</p>

<p align="center">
  One command. <strong>Three fronts</strong>: terse model output · filtered shell output · blocked junk reads.<br/>
  Works across <strong>Claude Code, Codex, Cursor, Windsurf, Cline, Gemini CLI</strong>.
</p>

---

## At a glance — measured savings

| Command                          | Raw tokens | Filtered | Saved   |
|----------------------------------|-----------:|---------:|--------:|
| `git log -50`                    |      1,859 |      173 | **-91%** |
| `git diff HEAD~5`                |      7,965 |    2,523 | **-68%** |
| `ls -la` (large dir)             |        317 |       70 | **-78%** |
| `grep -rn function src/`         |        287 |       62 | **-78%** |
| `git status`                     |         57 |       18 | **-68%** |
| `Read node_modules/lodash.js`    |     ~5,000 |    **blocked** | **-100%** |

Real numbers from this repo. Run `lakon inspect <cmd>` on your own commands.

---

## The story behind the name

In 346 BC, Philip II of Macedon — father of Alexander the Great — sent the Spartans a message:

> *"If I invade Lakonía, I will raze your cities to the ground."*

The Spartans replied with a single word:

> *"If."*

That region was **Lakonía**. Its people gave the English language the word **laconic** — using as few words as possible. They didn't waste breath, didn't waste arrows, didn't waste anything.

Your AI coding agent does. It opens with *"Sure! I'd be happy to help…"*, repeats your question back, and explains what the diff already shows. It reads `git log` in full when one line per commit would do. Every wasted token is a soldier you didn't need to send.

**lakon trims both sides.**

---

## Three fronts. One install.

| Front                          | Wasted tokens look like…                              | lakon fixes it by…                                                                  |
|--------------------------------|-------------------------------------------------------|-------------------------------------------------------------------------------------|
| **Output** (the model)         | *"Great question! Let me explain…"*                   | Installing a terse-response rule. No preamble, no recap, no restating.              |
| **Input** (your shell tools)   | `git log` dumping 1.8 k tokens of author metadata     | Wrapping `git`/`ls`/`grep`/`cat`/`tree`/`head`/`tail` and compressing before context. |
| **Reads** (file ingestion)     | Agent runs `Read` on `pnpm-lock.yaml` → 80 k of nothing | A `PreToolUse` hook on `Read` blocks lockfiles & `node_modules`, caps files >800 lines. |
| **Search** (Grep tool)         | `Grep` returns 800 matches and you re-read every one  | A `PreToolUse` hook on `Grep` auto-caps `head_limit` at 30 with a one-shot hint.        |
| **Analysis** (the rule)        | `Read` 5k of logs to count errors in your head        | "Think in code" — write `node -e '…filter…count'`, consume only the answer.            |

Other tools stop at one front. lakon does all three transparently — your agent doesn't have to remember anything.

---

## Quick start

```bash
npm install -g @bargadev/lakon
lakon install
```

That's it. `lakon install` auto-detects which AI tools you have (Claude Code, Codex, Cursor, Windsurf, Cline, Gemini CLI) and configures each. From the next session forward your agent:

1. **Responds tersely** — no preamble, no restating, no recap. (rule in `CLAUDE.md` / equivalent)
2. **Has its `Bash` calls auto-rewritten** — `PreToolUse` hook intercepts `git`/`ls`/`cat`/`grep`/etc and prefixes them with `lakon` transparently.
3. **Has its `Read` calls guarded** — a second hook denies `node_modules/`, lockfiles, and build artifacts (with a hint to `grep` instead), and auto-caps reads over 800 lines.
4. **Has its `Grep` calls capped** — a third hook auto-sets `head_limit` to 30 if you didn't, with a once-per-session hint to use `output_mode:"count"` for tallies.
5. **Is told to "think in code"** — for any count/filter/parse task, the rule pushes the agent toward a one-shot `node -e` (or `awk`) script that consumes the data so the agent consumes only the answer.

You'll see savings stack up immediately in `lakon gain`.

> Both hooks are currently Claude Code-only (the only platform with a documented `PreToolUse` API). For Codex/Cursor/Windsurf/Cline/Gemini, the rule asks the model to grep-before-Read and use the `lakon` prefix itself.

> **Worried?** Every install backs up the target file first. `lakon revert` puts it back byte-for-byte.

---

## Use the filter directly

The CLI works as a standalone tool too. Run any shell command through `lakon` (or the short alias `lak`) to filter its output:

```bash
lakon git status        # compressed git status
lakon git log -50       # one line per commit (hash + subject)
lakon git diff          # only +/- lines, no noise
lakon ls -la            # size + name only
lakon grep -r foo src/  # truncates at 40 matches
```

Unsupported commands run unchanged.

---

## See your savings

```bash
lakon gain
```

```
lakon — savings report
───────────────────────────────────────────────────────────
window      calls    raw       filtered   saved      %
───────────────────────────────────────────────────────────
last hour     12      1.2k      380       820      68%
last 24h      87      9.8k     3.1k      6.7k      68%
last 7d      512     54.2k    17.8k     36.4k      67%
last 30d    2104    241.0k    79.2k    161.8k      67%
all time    2104    241.0k    79.2k    161.8k      67%
───────────────────────────────────────────────────────────

top commands (all time):
  git      calls=812  saved=124.3k  72%
  ls       calls=541  saved=18.2k   58%
  grep     calls=339  saved=12.0k   65%
```

### Inspect a single command

```bash
lakon inspect git log
```

```
cmd:      git log
raw:      1234 tokens (8127 bytes)
filtered: 187 tokens (1240 bytes)
saved:    85%
```

---

## Commands

| Command                          | What it does                                                          |
|----------------------------------|-----------------------------------------------------------------------|
| `lakon install [--only <p>]`     | Auto-detect agents and install the rule (with backup)                 |
| `lakon uninstall`                | Strip the lakon block from each config (keeps your other content)     |
| `lakon revert [--only <p>]`      | Restore each config to its pre-install state from backup              |
| `lakon backups`                  | Show backup history per platform                                      |
| `lakon list`                     | Show supported platforms and which are detected                       |
| `lakon <cmd> [args]`             | Run a command, filter its output, track savings                       |
| `lakon gain`                     | Show savings by hour / day / week / month / all-time                  |
| `lakon inspect <cmd>`            | Run once and show raw-vs-filtered (no tracking)                       |
| `lakon reset`                    | Wipe the savings log                                                  |

`lak` is the short alias for `lakon` — same behavior.

---

## Supported filters

| Command                | What it does                                                      |
|------------------------|-------------------------------------------------------------------|
| `git log`              | One line per commit (`<hash> <subject>`), capped at 50            |
| `git status`           | Drops hint paragraphs, separates changed vs untracked             |
| `git diff` / `show`    | Only `+`/`-`/`@@` lines, drops `index`/`---`/`+++`, cap 120 lines |
| `ls -la` / `tree`      | `<size>\t<name>` (drops perms / dates / link targets), cap 60     |
| `cat`                  | Collapses blank-line runs, cap 200 lines                          |
| `head` / `tail`        | Cap 50 lines                                                      |
| `grep` / `rg` / `ag`   | Cap 15 matches with "tighten the pattern" hint                    |

Unsupported commands run unchanged (passthrough), still tracked at 0 % savings.

### Read tool guard (Claude Code)

The `Read` hook automatically:

- **Denies** paths under `node_modules/`, `vendor/`, `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `__pycache__/`, `.venv/`, `.git/objects/`
- **Denies** lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`, `*.lock`)
- **Denies** build artifacts (`*.min.js`, `*.min.css`, `*.tsbuildinfo`, `*.map`, `*.log`)
- **Caps** files over 800 lines at 800 (with hint to `Read` again with `offset` for more, or `grep -n` for the symbol you need)

Each deny returns a one-line reason the model reads, so it knows to `grep -n` the symbol instead.

---

## Supported AI agents

| Agent        | What `lakon install` writes                                                                          |
|--------------|------------------------------------------------------------------------------------------------------|
| Claude Code  | Rule block in `~/.claude/CLAUDE.md` + **two** `PreToolUse` hooks in `~/.claude/settings.json` (Bash rewrite + Read guard) |
| Codex CLI    | Rule block in `~/.codex/AGENTS.md`                                                                   |
| Cursor       | `.cursor/rules/lakon.mdc` in the current repo                                                        |
| Windsurf     | `.windsurf/rules/lakon.md` in the current repo                                                       |
| Cline        | `.clinerules/lakon.md` in the current repo                                                           |
| Gemini CLI   | Rule block in `~/.gemini/GEMINI.md`                                                                  |

Each install is **idempotent** (rerunning replaces the existing block) and **reversible** (`uninstall` strips it, `revert` restores from backup).

---

## Backup & revert

Before writing to your config file for the first time, `lakon` copies it into `~/.lakon/backups/<platform>/<filename>.<timestamp>.bak`. Every install thereafter appends another snapshot to that file's manifest.

```bash
lakon uninstall   # strips just the lakon block; keeps your other CLAUDE.md content
lakon revert      # restores the file to its pre-install state, byte for byte
lakon backups     # shows every snapshot, per platform, with timestamps
```

Use `uninstall` to remove lakon while keeping your other edits. Use `revert` when you want a clean rollback to exactly the file you had before.

---

## How tracking works

Every filtered command appends a JSON line to `~/.lakon/log.jsonl`. `lakon gain` reads that log and aggregates by time window.

The log stores: timestamp, command name, first few args, raw/filtered token counts. **No file contents. No full arguments. No data ever leaves your machine.**

Override the location with `LAKON_HOME=/path`. Disable tracking entirely with `LAKON_NO_TRACK=1`.

---

## Configuration

| Env var          | Effect                                                |
|------------------|-------------------------------------------------------|
| `LAKON_HOME`     | Where to keep the log + backups (default `~/.lakon`)  |
| `LAKON_NO_TRACK` | Set to `1` to disable per-command logging             |

---

## Philosophy

> *"Brevity is the soul of wit."* — Shakespeare, *Hamlet*
> *"Vēnī, vīdī, vīcī."* — Julius Caesar, three words to describe winning a war.
> *"If."* — Spartans, refusing to be intimidated by a single conditional.

Every token your agent emits or reads is paid for — in latency, in money, in context budget. The fastest way to think clearly is to speak briefly. lakon doesn't make your agent dumber; it makes it Spartan.

---

## Development

```bash
git clone https://github.com/bargadev/lakon
cd lakon
node --test tests/
node bin/lakon.js --help
```

No dependencies. Node ≥ 18.

---

## Credits

Built on ideas from two excellent projects:

- [**caveman**](https://github.com/juliusbrussee/caveman) — terse-prose rule + auto-clarity carve-outs.
- [**rtk**](https://github.com/rtk-ai/rtk) — CLI output filtering as a force multiplier for LLM agents.

lakon condenses both into one zero-dependency npm package with a single install command, automatic backups, and time-windowed savings tracking.

---

## License

MIT. See [LICENSE](LICENSE).

---

<p align="center">
  <sub>Speak less. Ship more.</sub>
</p>
