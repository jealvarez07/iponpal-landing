# IponPal landing tests

Zero-dependency Node test for the landing page (`iponpal.com`). No `npm install`,
no build step — just `node`.

## Running

From the repo root:

```bash
node tests/run_all.js
```

Expected: **1 passed · 0 failed · 0 skipped**

Or directly:

```bash
node tests/test_renderstats.js
```

Exit codes: `0` all passed · `1` a test failed · `2` target file not found.

## What's covered

### `test_renderstats.js` — 27 assertions
Targets `renderStats()` in `index.html`. The social-proof block.

The guarantee it enforces: **no `—` placeholder can ever reach a user.** The
original code had an early `return` before its fallback branch, so if
`public_stats` returned `null` the four dashes persisted forever — a section
headed "Piso-piso, sama-sama" showing nothing but dashes, right above the CTA.

Verified paths:

- Above the 25-saver floor → number grid shown, fallback hidden
- Below the floor (the current real state) → honest copy, grid hidden
- RPC errored → honest copy
- **RPC returned `null`** → honest copy (this was the bug)
- Boundaries at exactly 25 and 24
- EN and TL copy both render, with the "first 300" invitation intact
- Malformed payloads: `{}`, `savers: null`, `savers` as a string, null money
  fields (must render `₱0` and `1`, never `NaN` or `null`)
- Missing DOM node → no throw

## How it works

The test reads the shipped `index.html`, extracts the real `renderStats()` with a
regex, and runs it against a stub DOM. It tests the **deployed code**, not a copy,
so it can't drift out of sync.

Tradeoff: rename or reformat `renderStats()` and extraction stops matching — the
test then reports it can't find the function (exit 2) rather than passing
silently. Deliberate loud failure.

## Note

`test_save.js` and `test_sw.js` live in the **app** repo — they test the app's
persistence and service worker.

Add `tests/` to `.vercelignore` — harmless to serve, but no reason to.
