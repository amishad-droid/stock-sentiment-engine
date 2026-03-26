/* ── MKTEDGE main.js ──────────────────────────────────────────────────────── */

let priceChart = null;
let sentChart  = null;
let active     = null;

// ── CLOCK + MARKET STATUS ──────────────────────────────────────────────────────
function tick() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clock').textContent = `${h}:${m}:${s}`;

  const day = now.getDay();
  const total = now.getHours() * 60 + now.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && total >= 570 && total < 960; // 9:30–16:00
  const el = document.getElementById('mktStatus');
  el.textContent  = isOpen ? 'OPEN' : 'CLOSED';
  el.style.color  = isOpen ? '#004400' : '#660000';
}
tick();
setInterval(tick, 1000);

// ── INIT ───────────────────────────────────────────────────────────────────────
async function init() {
  const res  = await fetch('/api/tickers');
  const data = await res.json();

  document.getElementById('coverageCount').textContent = data.length;

  // Sidebar
  const list = document.getElementById('covList');
  data.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="cov-btn" data-sym="${t.symbol}" onclick="load('${t.symbol}', this)">
        <div class="cb-top">
          <span class="cb-sym">${t.symbol}</span>
          <span class="cb-price">$${t.price.toFixed(2)}</span>
        </div>
        <div class="cb-bot">
          <span class="cb-name">${t.name}</span>
          <span class="cb-chg ${t.change >= 0 ? 'pos' : 'neg'}">${t.change >= 0 ? '+' : ''}${t.change}%</span>
        </div>
      </button>`;
    list.appendChild(li);
  });

  // Tape — duplicate for seamless scroll
  const tape = document.getElementById('tapeInner');
  const seg = () => data.map(t => `
    <span class="tape-item">
      <span class="tape-sym">${t.symbol}</span>
      <span class="tape-price">$${t.price.toFixed(2)}</span>
      <span class="${t.change >= 0 ? 'tape-up' : 'tape-down'}">${t.change >= 0 ? '▲' : '▼'}${Math.abs(t.change)}%</span>
    </span>`).join('');
  tape.innerHTML = seg() + seg();
}

// ── LOAD TICKER ────────────────────────────────────────────────────────────────
async function load(sym, btn) {
  if (active === sym) return;
  active = sym;

  document.querySelectorAll('.cov-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('dataView').classList.remove('hidden');

  const res = await fetch(`/api/analyze/${sym}`);
  const d   = await res.json();

  // Title row
  document.getElementById('dSym').textContent  = sym;
  document.getElementById('dName').textContent = d.name;
  document.getElementById('dPrice').textContent = `$${d.price.toFixed(2)}`;
  const chgEl = document.getElementById('dChg');
  chgEl.textContent = `${d.change >= 0 ? '+' : ''}${d.change}%`;
  chgEl.className   = 'tr-chg ' + (d.change >= 0 ? 'pos' : 'neg');

  // Function blocks
  const s = d.avg_sentiment;
  document.getElementById('fnSent').textContent     = (s >= 0 ? '+' : '') + s.toFixed(2);
  document.getElementById('fnSent').className       = 'fn-value ' + (s > 0.1 ? 'pos' : s < -0.1 ? 'neg' : '');
  document.getElementById('fnSentDesc').textContent = s > 0.4 ? 'STRONGLY BULLISH' : s > 0.1 ? 'BULLISH' : s < -0.4 ? 'STRONGLY BEARISH' : s < -0.1 ? 'BEARISH' : 'NEUTRAL';
  document.getElementById('fnArticles').textContent = d.articles.toLocaleString();

  const dirEl = document.getElementById('fnDir');
  dirEl.textContent  = d.prediction === 'up' ? '▲ BULL' : '▼ BEAR';
  dirEl.className    = 'fn-value big ' + (d.prediction === 'up' ? 'pos' : 'neg');
  document.getElementById('fnConf').textContent = `${d.confidence}% CONFIDENCE`;

  // Best model
  const models = d.models;
  const entries = Object.entries(models);
  const best = entries.reduce((a, b) => b[1] > a[1] ? b : a);
  const names = { logistic_regression: 'LOG. REG.', random_forest: 'RAND. FOREST', gradient_boosting: 'GRAD. BOOST' };
  document.getElementById('fnBestModel').textContent = names[best[0]] || best[0].toUpperCase();
  document.getElementById('fnBestAcc').textContent   = `${best[1]}% ACCURACY`;

  // Price chart
  if (priceChart) priceChart.destroy();
  const prices = d.prices;
  const up = prices[prices.length-1] >= prices[0];
  const badge = document.getElementById('priceBadge');
  badge.textContent = up ? '▲ UPTREND' : '▼ DOWNTREND';
  badge.className   = 'cb-badge ' + (up ? 'up' : 'down');

  const ctx1 = document.getElementById('priceChart').getContext('2d');
  const grad = ctx1.createLinearGradient(0,0,0,140);
  grad.addColorStop(0, up ? 'rgba(0,204,68,0.2)' : 'rgba(255,51,34,0.2)');
  grad.addColorStop(1, 'transparent');
  priceChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: ['6D','5D','4D','3D','2D','1D','NOW'],
      datasets: [{
        data: prices,
        borderColor: up ? '#00cc44' : '#ff3322',
        borderWidth: 1.5,
        pointBackgroundColor: up ? '#00cc44' : '#ff3322',
        pointRadius: [0,0,0,0,0,0,4],
        fill: true, backgroundColor: grad, tension: 0.3,
      }]
    },
    options: chartOpts('$')
  });

  // Sentiment dist chart
  if (sentChart) sentChart.destroy();
  const ctx2 = document.getElementById('sentChart').getContext('2d');
  sentChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['V.NEG','NEG','NEU-','NEU+','POS','V.POS'],
      datasets: [{
        data: d.sentiment_dist,
        backgroundColor: [
          'rgba(255,51,34,0.85)','rgba(255,100,80,0.6)',
          'rgba(100,80,0,0.4)','rgba(100,80,0,0.4)',
          'rgba(0,180,60,0.6)','rgba(0,204,68,0.85)'
        ],
        borderRadius: 0, borderSkipped: false,
      }]
    },
    options: chartOpts('', true)
  });

  // Model table
  const [lr, rf, gb] = [models.logistic_regression, models.random_forest, models.gradient_boosting];
  const maxAcc = Math.max(lr, rf, gb);
  setTimeout(() => {
    [['LR', lr], ['RF', rf], ['GB', gb]].forEach(([k, v]) => {
      document.getElementById(`acc${k}`).textContent = `${v}%`;
      document.getElementById(`bar${k}`).style.width = v + '%';
      const isBest = v === maxAcc;
      document.getElementById(`bar${k}`).classList.toggle('best', isBest);
      const stEl = document.getElementById(`st${k}`);
      stEl.textContent  = isBest ? '★ BEST' : 'ACTIVE';
      stEl.className    = 'mt-status ' + (isBest ? 'best-tag' : 'ok-tag');
      document.getElementById(`row${k}`).classList.toggle('best', isBest);
    });
  }, 60);

  // News
  const rows = document.getElementById('newsRows');
  rows.innerHTML = '';
  d.news.forEach((item, i) => {
    const sc = item.sentiment;
    const scoreClass  = sc > 0.2 ? 'pos' : sc < -0.2 ? 'neg' : 'neu';
    const sigClass    = sc > 0.2 ? 'sig-bull' : sc < -0.2 ? 'sig-bear' : 'sig-neu';
    const sigText     = sc > 0.2 ? 'BULLISH' : sc < -0.2 ? 'BEARISH' : 'NEUTRAL';
    const el = document.createElement('div');
    el.className = 'nt-row';
    el.style.animationDelay = `${i * 50}ms`;
    el.innerHTML = `
      <span class="nt-headline">${item.headline}</span>
      <span class="nt-source">${item.source}</span>
      <span class="nt-score ${scoreClass}">${(sc >= 0 ? '+' : '') + sc.toFixed(2)}</span>
      <span class="nt-signal ${sigClass}">${sigText}</span>
      <span class="nt-time">${item.time}</span>`;
    rows.appendChild(el);
  });
}

// ── CHART DEFAULTS ─────────────────────────────────────────────────────────────
function chartOpts(prefix, hideX = false) {
  const mono = "'IBM Plex Mono', monospace";
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f0c00', borderColor: '#3a2e00', borderWidth: 1,
        titleColor: '#6b5200', bodyColor: '#ffb000',
        titleFont: { family: mono, size: 10 },
        bodyFont:  { family: mono, size: 11 },
        callbacks: { label: ctx => prefix === '$' ? ` $${ctx.parsed.y.toFixed(2)}` : ` ${ctx.parsed.y}` }
      }
    },
    scales: {
      x: {
        display: !hideX,
        ticks: { color: '#6b5200', font: { family: mono, size: 9 } },
        grid:  { color: 'rgba(58,46,0,0.5)' },
      },
      y: {
        position: 'right',
        ticks: { color: '#6b5200', font: { family: mono, size: 9 } },
        grid:  { color: 'rgba(58,46,0,0.5)' },
      }
    }
  };
}

init();
