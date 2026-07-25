// Behavioural test for the patched renderStats(). Simulates a minimal DOM and
// runs every input path that can reach the function in production.
const { resolveTarget, fs } = require('./_resolve');
// LANDING page index.html (the one with renderStats + the social-proof block)
const TARGET = resolveTarget(['index.html', 'landing/index.html'], 'landing index.html');
const html = fs.readFileSync(TARGET, 'utf8');
console.log('  target:', TARGET);

// pull the real renderStats source out of the shipped file (no re-typing)
const m = html.match(/function renderStats\(\)\{[\s\S]*?\n  \}/);
if (!m) {
  console.error('⏭️  Not the landing index.html (no renderStats found) — skipping.');
  console.error('   This test belongs in the iponpal-landing repo.');
  process.exit(2);   // 2 = not applicable to this repo, NOT a failure
}
const renderStatsSrc = m[0];

const fmtN = n => n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,'')+'k':(''+n);
const fmtP = n => '₱'+(n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':n>=1e3?Math.round(n/1e3)+'k':(''+Math.round(n)));

function makeDom(){
  const el = id => ({ id, style:{display:''}, textContent:'—', innerHTML:'' });
  const nodes = {
    'stats': Object.assign(el('stats'), { style:{display:'none'} }),   // ships hidden
    'stats-fallback': Object.assign(el('stats-fallback'), { style:{display:''}, innerHTML:'STATIC_COPY' }),
    'sp-note': Object.assign(el('sp-note'), { style:{display:'none'} }),
    'st-savers': el('st-savers'), 'st-ipon': el('st-ipon'),
    'st-deposits': el('st-deposits'), 'st-days': el('st-days')
  };
  return { nodes, document:{ getElementById:id=>nodes[id]||null, documentElement:{lang:'tl'} } };
}

function run(stats, statsErr, lang){
  const dom = makeDom();
  const document = dom.document;
  document.documentElement.lang = lang || 'tl';
  const _stats = stats, _statsErr = statsErr;
  const fn = new Function('document','_stats','_statsErr','fmtN','fmtP',
    renderStatsSrc + '\n renderStats();');
  fn(document, _stats, _statsErr, fmtN, fmtP);
  return dom.nodes;
}

let pass = 0, fail = 0;
function check(name, cond, detail){
  if (cond) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, '→', detail); }
}

console.log('\n═══ renderStats() behavioural tests ═══\n');

// 1. Healthy, above floor
console.log('CASE 1 — RPC ok, savers=100 (above floor 25)');
let n = run({savers:100, ipon_total:52400, deposits:210, days_public:30}, false);
check('grid shown', n['stats'].style.display === '', n['stats'].style.display);
check('fallback hidden', n['stats-fallback'].style.display === 'none', n['stats-fallback'].style.display);
check('note shown', n['sp-note'].style.display === '', n['sp-note'].style.display);
check('savers formatted', n['st-savers'].textContent === '100', n['st-savers'].textContent);
check('ipon formatted', n['st-ipon'].textContent === '₱52k', n['st-ipon'].textContent);

// 2. Below floor (your CURRENT real state: ~11 savers)
console.log('\nCASE 2 — RPC ok, savers=11 (below floor) ← your state today');
n = run({savers:11, ipon_total:900, deposits:14, days_public:5}, false);
check('grid HIDDEN', n['stats'].style.display === 'none', n['stats'].style.display);
check('fallback shown', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);
check('note hidden', n['sp-note'].style.display === 'none', n['sp-note'].style.display);
check('copy has days', /5 araw/.test(n['stats-fallback'].innerHTML), n['stats-fallback'].innerHTML);
check('copy has 300 invite', /300/.test(n['stats-fallback'].innerHTML), n['stats-fallback'].innerHTML);
check('NO dashes leak', !/—\s*<\/div>/.test(n['stats-fallback'].innerHTML), 'dash found');

// 3. RPC hard error (network / CORS / 500)
console.log('\nCASE 3 — RPC errored (_statsErr=true, _stats=null)');
n = run(null, true);
check('grid hidden', n['stats'].style.display === 'none', n['stats'].style.display);
check('fallback shown', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);
check('copy present (no days)', /build in public/.test(n['stats-fallback'].innerHTML), n['stats-fallback'].innerHTML);

// 4. THE OLD BUG: RPC returned literal null, no error flag
console.log('\nCASE 4 — RPC returned null, no error ← THE BUG THAT LEFT DASHES FOREVER');
n = run(null, false);
check('grid hidden', n['stats'].style.display === 'none', n['stats'].style.display);
check('fallback SHOWN (was broken before)', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);
check('fallback has real copy, not empty', n['stats-fallback'].innerHTML.length > 20, n['stats-fallback'].innerHTML);

// 5. Boundary: exactly at floor
console.log('\nCASE 5 — boundary savers=25 (at floor) and 24 (below)');
n = run({savers:25, ipon_total:1000, deposits:10, days_public:9}, false);
check('25 → grid shown', n['stats'].style.display === '', n['stats'].style.display);
n = run({savers:24, ipon_total:1000, deposits:10, days_public:9}, false);
check('24 → fallback shown', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);

// 6. Language reactivity
console.log('\nCASE 6 — EN language on fallback');
n = run({savers:11, days_public:5}, false, 'en');
check('English copy', /We\u2019re new|building in public/.test(n['stats-fallback'].innerHTML), n['stats-fallback'].innerHTML);
check('English 300 invite', /300 Filipinos saving/.test(n['stats-fallback'].innerHTML), n['stats-fallback'].innerHTML);

// 7. Malformed / partial payloads
console.log('\nCASE 7 — malformed payloads');
n = run({}, false);
check('empty object → fallback', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);
n = run({savers:null}, false);
check('savers null → fallback', n['stats-fallback'].style.display === '', n['stats-fallback'].style.display);
n = run({savers:'150', ipon_total:null, deposits:null, days_public:null}, false);
check('savers as STRING "150" → grid (coerced)', n['stats'].style.display === '', n['stats'].style.display);
check('null ipon → ₱0 not NaN', n['st-ipon'].textContent === '₱0', n['st-ipon'].textContent);
check('null days → 1 not null', String(n['st-days'].textContent) === '1', n['st-days'].textContent);

// 8. Missing DOM (defensive)
console.log('\nCASE 8 — grid element absent (defensive)');
try {
  const fn = new Function('document','_stats','_statsErr','fmtN','fmtP', renderStatsSrc + '\n renderStats();');
  fn({ getElementById:()=>null, documentElement:{lang:'tl'} }, {savers:100}, false, fmtN, fmtP);
  check('no throw when #stats missing', true);
} catch(e){ check('no throw when #stats missing', false, e.message); }

console.log('\n═══ RESULT: ' + pass + ' passed, ' + fail + ' failed ═══\n');
process.exit(fail ? 1 : 0);
