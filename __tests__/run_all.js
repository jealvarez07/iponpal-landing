#!/usr/bin/env node
/* Runs every test in this folder. Tests whose target file isn't in this repo
   are reported as SKIPPED (exit 2), not failures — so the same folder can live
   in both the app and landing repos without noise. */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const dir = __dirname;
const tests = fs.readdirSync(dir)
  .filter(f => /^test_.*\.js$/.test(f))
  .sort();

if (!tests.length) { console.error('No test_*.js files found in ' + dir); process.exit(1); }

let passed = 0, failed = 0, skipped = 0;
const results = [];

for (const t of tests) {
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(dir, t)], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
  } catch (e) {
    code = e.status == null ? 1 : e.status;
    out = (e.stdout || '') + (e.stderr || '');
  }
  const m = out.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
  if (code === 2) { skipped++; results.push(['SKIP', t, 'target not in this repo']); }
  else if (code === 0) { passed++; results.push(['PASS', t, m ? m[1] + ' assertions' : '']); }
  else { failed++; results.push(['FAIL', t, m ? m[2] + ' failing' : 'exit ' + code]);
         console.log('\n──── ' + t + ' output ────\n' + out); }
}

console.log('\n═══ TEST SUMMARY ═══');
for (const [s, t, note] of results) {
  const icon = s === 'PASS' ? '✅' : s === 'SKIP' ? '⏭️ ' : '❌';
  console.log('  ' + icon + ' ' + s.padEnd(4) + '  ' + t.padEnd(24) + note);
}
console.log('\n  ' + passed + ' passed · ' + failed + ' failed · ' + skipped + ' skipped\n');
process.exit(failed ? 1 : 0);
