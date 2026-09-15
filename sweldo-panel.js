/**
 * sweldo-panel.js — the Sweldo Check tab of the founder dashboard.
 *
 * ONE edit to metrics.html. Add this just before </body>:
 *
 *     <script type="module" src="./sweldo-panel.js"></script>
 *
 * It adds a third tab — 📊 Product · 📣 Acquisition · 💸 Sweldo — using the
 * dashboard's own showTab() and its own .tab / .tab.on classes, so the button
 * is a real one and not a lookalike.
 *
 * It takes its colours from the page it lands in, by measuring the actual
 * background. A dark panel inside a light dashboard is not a theme, it is a
 * bug, and that is what asking the operating system produced.
 *
 * It calls ONE function on the Sweldo project — sweldo_metrics() — which
 * returns aggregates only. No row of decoder_events is readable by this page
 * or any other, and no group smaller than five is ever reported.
 */

const CONFIG = {
  url: 'https://fhcowwnpdvqjsrrhfhfa.supabase.co',
  key: 'sb_publishable_ti6eVGMkou37JNugRR1a_Q_4vlqbKst',
};

/* ------------------------------------------------------------------ */
/* Hypotheses — the point of the panel                                 */
/* ------------------------------------------------------------------ */

const HYPOTHESES = [
  {
    id: 'H1',
    claim: 'A payslip explainer makes people come back. Not just read once and leave.',
    metric: 'Share of visits that are return visits',
    target: 15, unit: '%', minSample: 200, sampleLabel: 'visits',
    read: d => d.return_pct, sample: d => d.events,
    ifFalse: 'The decoder is a leaflet, not a product. Stop building on it.',
  },
  {
    id: 'H2',
    claim: 'People will tell us one thing about themselves in exchange for an answer.',
    metric: 'Visits that answered the question',
    target: 30, unit: '%', minSample: 100, sampleLabel: 'visits',
    read: d => d.answer_pct, sample: d => d.events,
    ifFalse: 'The salary database never gets built. Drop it from the roadmap.',
  },
  {
    id: 'H3',
    claim: 'Enough people share a job family to publish a real pay range.',
    metric: 'Job families with 5 or more reports',
    target: 3, unit: ' families', minSample: 100, sampleLabel: 'visits',
    read: d => (d.pay_by_family || []).length, sample: d => d.events,
    ifFalse: 'Saturate two job families instead of spreading across eleven.',
  },
  {
    id: 'H4',
    claim: 'Comparing two offers is a real job, not a feature we imagined.',
    metric: 'Calculations done in Two offers',
    target: 10, unit: '%', minSample: 150, sampleLabel: 'visits',
    read: d => (d.events ? round1(100 * d.mode_cmp / d.events) : null),
    sample: d => d.events,
    ifFalse: 'Cut the compare tab. One screen, one job.',
  },
  {
    id: 'H5',
    claim: 'Allowances are common enough to have been worth building.',
    metric: 'Entries that split out an allowance',
    target: 20, unit: '%', minSample: 100, sampleLabel: 'entries with basic pay',
    read: d => d.allowance_pct, sample: d => d.with_basic,
    ifFalse: 'Fold the allowance box away by default and stop maintaining it.',
  },
  {
    id: 'H6',
    claim: 'People come back around payday, which is what a payday product needs.',
    metric: 'Median days between first and return visit',
    target: 30, unit: ' days', minSample: 30, sampleLabel: 'returners',
    read: d => d.median_return_days, sample: d => d.returners,
    band: [12, 35],
    ifFalse: 'They come back for a reason other than payday. Find out which.',
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const round1 = n => Math.round(n * 10) / 10;
const num = n => (n == null ? '—' : Number(n).toLocaleString('en-PH'));
const peso = n => (n == null ? '—' : '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 }));
const pct = n => (n == null ? '—' : round1(n) + '%');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function verdictFor(h, d) {
  const value = h.read(d);
  const n = h.sample(d) || 0;
  if (n < h.minSample) {
    return { state: 'waiting', label: 'Waiting', value,
      note: `${num(n)} of ${num(h.minSample)} ${h.sampleLabel}` };
  }
  if (value == null) return { state: 'waiting', label: 'Waiting', value, note: 'no reading yet' };
  const ok = h.band ? (value >= h.band[0] && value <= h.band[1]) : (value >= h.target);
  return { state: ok ? 'pass' : 'fail', label: ok ? 'Holding' : 'Not holding', value, note: '' };
}

/**
 * Match the page, not the operating system.
 * The dashboard is light only. Asking the OS produced a dark panel inside a
 * light page — the exact inconsistency this replaces.
 */
function hostTheme() {
  try {
    for (const el of [document.body, document.documentElement]) {
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg && bg.match(/[\d.]+/g);
      if (!m || m.length < 3) continue;
      if (m.length > 3 && Number(m[3]) === 0) continue;   // transparent — keep looking
      const [r, g, b] = m.map(Number);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5 ? 'dark' : 'light';
    }
  } catch { /* fall through */ }
  return 'light';
}

/* ------------------------------------------------------------------ */
/* Styles — the dashboard's own shapes, scoped to this panel            */
/* ------------------------------------------------------------------ */

const CSS = `
#sweldo-panel{
  --sp-surface:#FFFFFF; --sp-surface-2:#F1F3F0;
  --sp-ink:#16211A; --sp-ink-2:#2A3230; --sp-ink-3:#68705F;
  --sp-line:#E8ECE6;
  --sp-good:#0E8A5F; --sp-warn:#B07C13; --sp-bad:#C4485E;
  --sp-accent:#7C5CFC; --sp-bar:#12A472;
  --sp-mono:'IBM Plex Mono',ui-monospace,Menlo,monospace;
  font-family:inherit; color:var(--sp-ink);
}
#sweldo-panel[data-sp-theme="dark"]{
  --sp-surface:#171E1A; --sp-surface-2:#1F2723;
  --sp-ink:#E8ECE6; --sp-ink-2:#B4BEB7; --sp-ink-3:#9AA394;
  --sp-line:rgba(255,255,255,.12);
  --sp-good:#3FCF9A; --sp-warn:#EAC77A; --sp-bad:#E8808F;
  --sp-accent:#A48BFF; --sp-bar:#3FCF9A;
}
#sweldo-panel *{box-sizing:border-box}

#sweldo-panel .sp-sec{
  color:var(--sp-accent);font-weight:800;font-size:14px;letter-spacing:.02em;
  text-transform:uppercase;margin:26px 0 12px;
}
#sweldo-panel .sp-sec:first-child{margin-top:0}
#sweldo-panel .sp-note{font-size:13.5px;color:var(--sp-ink-3);margin:0 0 16px;max-width:74ch;line-height:1.5}

#sweldo-panel .sp-tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:8px}
#sweldo-panel .sp-tile{background:var(--sp-surface);border:1px solid var(--sp-line);border-radius:14px;padding:16px 18px}
#sweldo-panel .sp-tile .v{
  font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1.05;display:block;
  font-variant-numeric:tabular-nums;
}
#sweldo-panel .sp-tile .k{
  font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--sp-ink-3);display:block;margin-top:7px;
}
#sweldo-panel .sp-tile .s{font-size:12px;color:var(--sp-ink-3);display:block;margin-top:5px}

#sweldo-panel .sp-hyp{display:grid;gap:10px}
#sweldo-panel .sp-h{
  background:var(--sp-surface);border:1px solid var(--sp-line);border-radius:14px;
  padding:15px 18px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;
}
#sweldo-panel .sp-h .claim{font-size:15px;font-weight:700;letter-spacing:-.01em;margin:0 0 3px;line-height:1.35}
#sweldo-panel .sp-h .id{font-family:var(--sp-mono);font-size:11px;color:var(--sp-ink-3);margin-right:8px;font-weight:500}
#sweldo-panel .sp-h .mx{font-size:13px;color:var(--sp-ink-3);margin:0}
#sweldo-panel .sp-h .fail-note{font-size:13px;color:var(--sp-ink-2);margin:7px 0 0;line-height:1.45}
#sweldo-panel .sp-read{text-align:right;white-space:nowrap}
#sweldo-panel .sp-read .now{font-size:22px;font-weight:800;display:block;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
#sweldo-panel .sp-read .tgt{font-size:11.5px;color:var(--sp-ink-3);display:block;margin-top:3px}
#sweldo-panel .pill{
  display:inline-block;font-size:10px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;padding:4px 9px;border-radius:999px;margin-top:8px;
}
#sweldo-panel .pill.pass{background:rgba(18,164,114,.14);color:var(--sp-good)}
#sweldo-panel .pill.fail{background:rgba(196,72,94,.14);color:var(--sp-bad)}
#sweldo-panel .pill.waiting{background:var(--sp-surface-2);color:var(--sp-ink-3)}

#sweldo-panel .sp-chart{background:var(--sp-surface);border:1px solid var(--sp-line);border-radius:14px;padding:18px 18px 12px}
#sweldo-panel .sp-bars{display:flex;align-items:flex-end;gap:3px;height:150px;position:relative;padding-left:34px}
#sweldo-panel .sp-bars .gl{position:absolute;left:34px;right:0;border-top:1px solid var(--sp-line)}
#sweldo-panel .sp-bars .gl .tick{
  position:absolute;right:calc(100% + 7px);top:-8px;font-family:var(--sp-mono);
  font-size:10px;color:var(--sp-ink-3);white-space:nowrap;
}
#sweldo-panel .sp-col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;position:relative}
#sweldo-panel .sp-bar{background:var(--sp-bar);border-radius:4px 4px 0 0;min-height:2px}
#sweldo-panel .sp-col .lab{font-family:var(--sp-mono);font-size:10px;color:var(--sp-ink-3);text-align:center;margin-top:7px;white-space:nowrap}
#sweldo-panel .sp-col .val{font-size:11px;font-weight:800;color:var(--sp-ink);text-align:center;margin-bottom:5px}
#sweldo-panel .sp-tip{
  position:absolute;z-index:20;background:var(--sp-ink);color:var(--sp-surface);
  font-family:var(--sp-mono);font-size:11px;padding:6px 9px;border-radius:7px;
  pointer-events:none;white-space:nowrap;transform:translate(-50%,-115%);opacity:0;transition:opacity .1s;
}
#sweldo-panel .sp-tip.on{opacity:1}
#sweldo-panel .sp-axisnote{font-size:12px;color:var(--sp-ink-3);margin:6px 0 0}

#sweldo-panel .sp-card{background:var(--sp-surface);border:1px solid var(--sp-line);border-radius:14px;padding:16px 18px}
#sweldo-panel .sp-tw{overflow-x:auto}
#sweldo-panel table{border-collapse:collapse;width:100%;font-size:14px}
#sweldo-panel table.wide{min-width:460px}
#sweldo-panel th,#sweldo-panel td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--sp-line)}
#sweldo-panel th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sp-ink-3);font-weight:800}
#sweldo-panel td.n{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}
#sweldo-panel td:first-child{word-break:break-word}
#sweldo-panel tbody tr:last-child td{border-bottom:0}
#sweldo-panel .sp-empty{background:var(--sp-surface-2);border-radius:14px;padding:18px 20px;font-size:14px;color:var(--sp-ink-2);line-height:1.5}
#sweldo-panel .sp-cols{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
#sweldo-panel .sp-stamp{font-family:var(--sp-mono);font-size:11px;color:var(--sp-ink-3);margin-top:18px}
@media (prefers-reduced-motion: reduce){#sweldo-panel *{transition:none!important}}
`;

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function tiles(d) {
  const t = [
    [num(d.events_30d), 'Visits, 30 days', `${num(d.events_7d)} in the last 7`],
    [pct(d.return_pct), 'Return rate', `${num(d.returns)} of ${num(d.events)} visits`],
    [pct(d.answer_pct), 'Gave an answer', `${num(d.answered)} answers`],
    [peso(d.median_gross), 'Median pay seen', 'monthly, rounded to ₱100'],
  ];
  return `<div class="sp-tiles">` + t.map(([v, k, s]) =>
    `<div class="sp-tile"><span class="v">${v}</span><span class="k">${k}</span><span class="s">${esc(s)}</span></div>`
  ).join('') + `</div>`;
}

function board(d) {
  return `<div class="sp-sec">Hypotheses — what we are trying to find out</div>
    <div class="sp-hyp">` + HYPOTHESES.map(h => {
    const v = verdictFor(h, d);
    const shown = v.value == null ? '—' : (h.unit === '%' ? pct(v.value) : num(v.value) + h.unit);
    const targetText = h.band ? `between ${h.band[0]} and ${h.band[1]} days` : `target ${h.target}${h.unit}`;
    return `<div class="sp-h">
      <div>
        <p class="claim"><span class="id">${h.id}</span>${esc(h.claim)}</p>
        <p class="mx">${esc(h.metric)} · ${esc(targetText)}</p>
        ${v.state === 'fail' ? `<p class="fail-note"><strong>If this stays false:</strong> ${esc(h.ifFalse)}</p>` : ''}
      </div>
      <div class="sp-read">
        <span class="now">${shown}</span>
        <span class="tgt">${v.note ? esc(v.note) : targetText}</span>
        <span class="pill ${v.state}">${v.label}</span>
      </div>
    </div>`;
  }).join('') + `</div>`;
}

function weekly(d) {
  const rows = (d.weekly || []).slice().reverse();
  if (!rows.length) return '';
  const max = Math.max(20, ...rows.map(r => Number(r.return_pct) || 0));
  const last = rows.length - 1;
  const bars = rows.map((r, i) => {
    const v = Number(r.return_pct) || 0;
    const h = Math.max(2, Math.round((v / max) * 100));
    const lab = new Date(r.week).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    return `<div class="sp-col" data-week="${esc(lab)}" data-v="${v}" data-n="${r.events}">
        ${i === last ? `<span class="val">${v}%</span>` : ''}
        <div class="sp-bar" style="height:${h}%"></div>
      </div>`;
  }).join('');
  const labels = rows.map((r, i) => {
    const lab = (i === 0 || i === last) ? new Date(r.week).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '';
    return `<div class="sp-col"><span class="lab">${lab}</span></div>`;
  }).join('');

  return `<div class="sp-sec">Return rate by week</div>
    <div class="sp-chart">
      <div class="sp-bars" id="sp-bars">
        <div class="gl" style="bottom:100%"><span class="tick">${max}%</span></div>
        <div class="gl" style="bottom:50%"><span class="tick">${Math.round(max / 2)}%</span></div>
        ${bars}
        <div class="sp-tip" id="sp-tip"></div>
      </div>
      <div class="sp-bars" style="height:auto;align-items:flex-start">${labels}</div>
      <p class="sp-axisnote">Share of that week's visits that came from a device which had been here before.</p>
    </div>`;
}

function tableBlock(title, head, rows, empty, wide) {
  if (!rows.length) return `<div><div class="sp-sec">${title}</div><div class="sp-empty">${empty}</div></div>`;
  return `<div><div class="sp-sec">${title}</div><div class="sp-card"><div class="sp-tw"><table class="${wide ? 'wide' : ''}">
    <thead><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ''}>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></div></div>`;
}

function render(root, d) {
  root.dataset.spTheme = hostTheme();

  if (!d.events) {
    root.innerHTML = `<div class="sp-sec">Sweldo Check — the payslip decoder</div>
      <p class="sp-note">Aggregates only. No row of anyone's salary is readable from here, including by this page.</p>
      <div class="sp-empty"><strong>Nothing recorded yet.</strong> The page is live and the table is connected;
      no one has used it. That is the expected state until the first post goes out.</div>`;
    return;
  }

  root.innerHTML = `
    <div class="sp-sec">Sweldo Check — the payslip decoder</div>
    <p class="sp-note">Aggregates only. No row of anyone's salary is readable from here, including by this page.
      Groups smaller than ${d.k} are never reported.</p>
    ${tiles(d)}
    ${board(d)}
    ${weekly(d)}
    <div style="margin-top:8px">
      ${tableBlock('Pay by job family', ['Family', 'Reports', 'p25', 'Median', 'p75'],
        (d.pay_by_family || []).map(r => [esc(r.bucket), num(r.n), peso(r.p25), peso(r.p50), peso(r.p75)]),
        `No family has reached ${d.k} reports yet. Nothing can be published until one does.`, true)}
    </div>
    <div class="sp-cols" style="margin-top:8px">
      ${tableBlock('Which question gets answered', ['Question', 'Answers'],
        (d.answers || []).map(r => [esc(r.key), num(r.n)]),
        'No one has answered the question yet.')}
      ${tableBlock('Where they came from', ['Source', 'Visits'],
        (d.sources || []).map(r => [esc(r.source), num(r.n)]),
        'No referrers recorded.')}
      ${tableBlock('How it was used', ['Mode', 'Visits'], [
        ['My pay', num(d.mode_take)],
        ['Worked backwards', num(d.mode_rev)],
        ['Two offers', num(d.mode_cmp)],
        ['Semi-monthly', num(d.semi_monthly)],
        ['Minimum wage', num(d.mwe)],
      ], '')}
    </div>
    <p class="sp-stamp">First visit ${d.first_seen ? new Date(d.first_seen).toLocaleDateString('en-PH') : '—'} ·
      last ${d.last_seen ? new Date(d.last_seen).toLocaleString('en-PH') : '—'} ·
      read ${new Date(d.generated_at).toLocaleString('en-PH')}</p>`;

  hoverBars(root);
}

function hoverBars(root) {
  const wrap = root.querySelector('#sp-bars');
  const tip = root.querySelector('#sp-tip');
  if (!wrap || !tip) return;
  wrap.addEventListener('pointermove', e => {
    const col = e.target.closest('.sp-col');
    if (!col || !col.dataset.week) { tip.classList.remove('on'); return; }
    const r = wrap.getBoundingClientRect(), c = col.getBoundingClientRect();
    tip.textContent = `${col.dataset.week} · ${col.dataset.v}% of ${col.dataset.n}`;
    tip.style.left = (c.left - r.left + c.width / 2) + 'px';
    tip.style.top = (c.top - r.top) + 'px';
    tip.classList.add('on');
  });
  wrap.addEventListener('pointerleave', () => tip.classList.remove('on'));
}

/* ------------------------------------------------------------------ */
/* Becoming a third tab                                                */
/* ------------------------------------------------------------------ */

const TABS = ['tab-product', 'tab-acq'];
const BTNS = ['tb-product', 'tb-acq'];

/**
 * Adds the button to the dashboard's own .tabs row, using its own classes, and
 * wraps showTab() so the existing two buttons switch away from this tab.
 * Returns the element the panel draws into, or null if this is not the
 * dashboard.
 */
function installTab() {
  const tabs = document.querySelector('.tabs');
  const board = document.getElementById('board');
  if (!tabs || !board) return null;

  let pane = document.getElementById('tab-sweldo');
  if (!pane || !pane.isConnected) {
    pane = document.createElement('div');
    pane.id = 'tab-sweldo';
    pane.style.display = 'none';           // Product stays the landing tab
    const inner = document.createElement('div');
    inner.id = 'sweldo-panel';
    pane.appendChild(inner);
    board.appendChild(pane);
  }

  let btn = document.getElementById('tb-sweldo');
  if (!btn || !btn.isConnected) {
    btn = document.createElement('button');
    btn.id = 'tb-sweldo';
    btn.className = 'tab';                 // the dashboard's own class
    btn.textContent = '💸 Sweldo';
    btn.addEventListener('click', showSweldo);
    tabs.appendChild(btn);
  }

  // The built-in buttons call the global showTab(). Wrap it once so choosing
  // either of them also closes this tab.
  if (typeof window.showTab === 'function' && !window.showTab.__sweldoWrapped) {
    const original = window.showTab;
    const wrapped = function () {
      original.apply(this, arguments);
      const p = document.getElementById('tab-sweldo');
      const b = document.getElementById('tb-sweldo');
      if (p) p.style.display = 'none';
      if (b) b.classList.remove('on');
    };
    wrapped.__sweldoWrapped = true;
    window.showTab = wrapped;
  }

  return pane.firstElementChild;
}

function showSweldo() {
  TABS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  BTNS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('on'); });
  const pane = document.getElementById('tab-sweldo');
  const btn = document.getElementById('tb-sweldo');
  if (pane) pane.style.display = '';
  if (btn) btn.classList.add('on');
}

/** Not the dashboard? Then a plain container on the page. */
function mountPlain() {
  let el = document.getElementById('sweldo-panel');
  if (el && el.isConnected) return el;
  el = document.createElement('div');
  el.id = 'sweldo-panel';
  document.body.appendChild(el);
  return el;
}

/** The dashboard rebuilds sections after sign-in. Put ourselves back if so. */
function keepMounted(paint) {
  const until = Date.now() + 20000;
  const timer = setInterval(() => {
    const el = document.getElementById('sweldo-panel');
    if (!el || !el.isConnected) {
      console.info('[sweldo-panel] container was removed — remounting');
      const fresh = installTab() || mountPlain();
      if (fresh) paint(fresh);
    }
    if (Date.now() > until) clearInterval(timer);
  }, 1000);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

(async function boot() {
  if (!document.getElementById('sweldo-panel-css')) {
    const st = document.createElement('style');
    st.id = 'sweldo-panel-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  const root = installTab() || mountPlain();
  if (!root) return;
  root.dataset.spTheme = hostTheme();
  console.info('[sweldo-panel] ready · theme ' + root.dataset.spTheme +
    ' · tab ' + (document.getElementById('tb-sweldo') ? 'installed' : 'not installed'));

  root.innerHTML = `<div class="sp-sec">Sweldo Check</div><p class="sp-note">Reading…</p>`;

  try {
    const res = await fetch(`${CONFIG.url}/rest/v1/rpc/sweldo_metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: CONFIG.key,
        Authorization: `Bearer ${CONFIG.key}`,
      },
      body: '{}',
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    render(root, data);
    keepMounted(el => render(el, data));
  } catch (err) {
    root.dataset.spTheme = hostTheme();
    root.innerHTML = `<div class="sp-sec">Sweldo Check</div>
      <div class="sp-empty"><strong>Could not read the Sweldo project.</strong>
      ${esc(String(err.message || err))}. Check that <code>003_sweldo_metrics.sql</code> has been run,
      and that the URL and key at the top of this file match the Sweldo project.</div>`;
  }
})();
