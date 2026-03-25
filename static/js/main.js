/* ── SentimentEdge main.js ─────────────────────────────────────────────────── */

let priceChart = null;
let sentChart  = null;
let activeTicker = null;

// ── CLOCK ──────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clock').textContent = `${h}:${m}:${s} EST`;
}
updateClock();
setInterval(updateClock, 1000);

// ── TICKER STRIP ───────────────────────────────────────────────────────────────
async function initTickerStrip() {
  const res  = await fetch('/api/tickers');
  const data = await res.json();

  document.getElementById('tickerCount').textContent = `${data.length} TICKERS`;

  // Build sidebar
  const list = document.getElementById('tickerList');
  list.innerHTML = '';
  data.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="ticker-item-btn" data-sym="${t.symbol}" onclick="loadTicker('${t.symbol}', this)">
        <div class="tib-top">
          <span class="tib-sym">${t.symbol}</span>
          <span class="tib-price">$${t.price.toFixed(2)}</span>
        </div>
        <div class="tib-bottom">
          <span class="tib-name">${t.name}</span>
          <span class="tib-change ${t.change >= 0 ? 'up' : 'down'}">${t.change >= 0 ? '+' : ''}${t.change}%</span>
        </div>
      </button>`;
    list.appendChild(li);
  });

  // Build scrolling strip — duplicate for seamless loop
  const strip = document.getElementById('tickerStrip');
  const buildItems = () => data.map(t => `
    <span class="ticker-item">
      <span class="t-sym">${t.symbol}</span>
      <span class="t-price">$${t.price.toFixed(2)}</span>
      <span class="${t.change >= 0 ? 't-up' : 't-down'}">${t.change >= 0 ? '▲' : '▼'} ${Math.abs(t.change)}%</span>
    </span>
    <span class="ticker-sep">·</span>
  `).join('');
  strip.innerHTML = buildItems() + buildItems(); // duplicate for loop
}

// ── LOAD TICKER ────────────────────────────────────────────────────────────────
async function loadTicker(sym, btn) {
  if (activeTicker === sym) return;
  activeTicker = sym;

  // Update sidebar active state
  document.querySelectorAll('.ticker-item-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Show data state
  document.getElementById('emptyState').classList.add('hidden');
  const ds = document.getElementById('dataState');
  ds.classList.remove('hidden');
  ds.classList.add('loading');

  const res  = await fetch(`/api/analyze/${sym}`);
  const d    = await res.json();
  ds.classList.remove('loading');

  // ── Header ──
  document.getElementById('dTicker').textContent   = sym;
  document.getElementById('dName').textContent     = d.name;
  document.getElementById('dPrice').textContent    = `$${d.price.toFixed(2)}`;
  const chEl = document.getElementById('dChange');
  chEl.textContent = `${d.change >= 0 ? '+' : ''}${d.change}%`;
  chEl.className = 'stock-change ' + (d.change >= 0 ? 'up' : 'down');

  // ── KPIs ──
  const sent = d.avg_sentiment;
  document.getElementById('dSentiment').textContent = (sent >= 0 ? '+' : '') + sent.toFixed(2);
  document.getElementById('dSentiment').className = 'kpi-value ' + (sent > 0 ? 'up' : sent < 0 ? 'down' : '');
  const barPct = Math.round(((sent + 1) / 2) * 100);
  const bar = document.getElementById('dSentimentBar');
  bar.style.width = barPct + '%';
  bar.style.background = sent > 0.2 ? 'var(--green)' : sent < -0.2 ? 'var(--red)' : 'var(--accent)';

  document.getElementById('dArticles').textContent = d.articles.toLocaleString();

  const predEl = document.getElementById('dPrediction');
  predEl.textContent  = d.prediction.toUpperCase();
  predEl.className    = 'kpi-direction ' + (d.prediction === 'up' ? 'up' : 'down');
  document.getElementById('dConfidence').textContent = `${d.confidence}% confidence`;

  // ── Price Chart ──
  const priceBadge = document.getElementById('priceTrend');
  const prices = d.prices;
  const trend = prices[prices.length - 1] > prices[0];
  priceBadge.textContent = trend ? '▲ UPTREND' : '▼ DOWNTREND';
  priceBadge.className   = 'chart-badge ' + (trend ? 'up' : 'down');

  if (priceChart) priceChart.destroy();
  const ctx1 = document.getElementById('priceChart').getContext('2d');
  const gradient = ctx1.createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, trend ? 'rgba(0,230,118,0.18)' : 'rgba(255,61,90,0.18)');
  gradient.addColorStop(1, 'transparent');
  priceChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Now'],
      datasets: [{
        data: prices,
        borderColor: trend ? '#00e676' : '#ff3d5a',
        borderWidth: 2,
        pointBackgroundColor: trend ? '#00e676' : '#ff3d5a',
        pointRadius: [0,0,0,0,0,0,4],
        fill: true, backgroundColor: gradient, tension: 0.4,
      }]
    },
    options: chartOpts('$')
  });

  // ── Sentiment Distribution Chart ──
  if (sentChart) sentChart.destroy();
  const ctx2 = document.getElementById('sentimentChart').getContext('2d');
  const sentLabels = ['Very Neg','Neg','Neutral−','Neutral+','Pos','Very Pos'];
  const sentColors = [
    'rgba(255,61,90,0.9)', 'rgba(255,100,100,0.7)', 'rgba(90,122,148,0.5)',
    'rgba(90,122,148,0.5)', 'rgba(0,200,100,0.7)', 'rgba(0,230,118,0.9)'
  ];
  sentChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: sentLabels,
      datasets: [{
        data: d.sentiment_dist,
        backgroundColor: sentColors,
        borderRadius: 2, borderSkipped: false,
      }]
    },
    options: chartOpts('%', true)
  });

  // ── ML Models ──
  const models = d.models;
  const vals   = Object.values(models);
  const maxVal = Math.max(...vals);
  const [lr, rf, gb] = vals;

  setTimeout(() => {
    document.getElementById('fillLR').style.width = lr + '%';
    document.getElementById('fillRF').style.width = rf + '%';
    document.getElementById('fillGB').style.width = gb + '%';
    document.getElementById('pctLR').textContent = lr + '%';
    document.getElementById('pctRF').textContent = rf + '%';
    document.getElementById('pctGB').textContent = gb + '%';

    // Highlight best
    ['modelLR','modelRF','modelGB'].forEach((id, i) => {
      document.getElementById(id).style.opacity = vals[i] === maxVal ? '1' : '0.6';
    });
    document.getElementById('fillLR').classList.remove('best');
    document.getElementById('fillRF').classList.remove('best');
    const bestId = lr === maxVal ? 'fillLR' : rf === maxVal ? 'fillRF' : 'fillGB';
    document.getElementById(bestId).classList.add('best');
  }, 80);

  // ── News ──
  const newsList = document.getElementById('newsList');
  newsList.innerHTML = '';
  d.news.forEach((item, i) => {
    const s = item.sentiment;
    const pillClass = s > 0.2 ? 'pill-pos' : s < -0.2 ? 'pill-neg' : 'pill-neu';
    const pillText  = s > 0.2 ? `+${s.toFixed(2)}` : s.toFixed(2);
    const el = document.createElement('div');
    el.className = 'news-item';
    el.style.animationDelay = `${i * 60}ms`;
    el.innerHTML = `
      <div>
        <div class="news-headline">${item.headline}</div>
      </div>
      <div class="news-meta">
        <span class="news-source">${item.source}</span>
        <span class="news-time">${item.time}</span>
        <span class="sentiment-pill ${pillClass}">${pillText}</span>
      </div>`;
    newsList.appendChild(el);
  });
}

// ── CHART DEFAULTS ─────────────────────────────────────────────────────────────
function chartOpts(prefix = '', hideX = false) {
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d1117',
        borderColor: '#1e2d3d', borderWidth: 1,
        titleColor: '#5a7a94', bodyColor: '#c9d8e8',
        titleFont: { family: "'Space Mono', monospace", size: 10 },
        bodyFont:  { family: "'Space Mono', monospace", size: 11 },
        callbacks: {
          label: ctx => prefix === '$'
            ? ` $${ctx.parsed.y.toFixed(2)}`
            : ` ${ctx.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        display: !hideX,
        ticks: { color: '#5a7a94', font: { family: "'Space Mono', monospace", size: 9 } },
        grid:  { color: 'rgba(30,45,61,0.5)' },
      },
      y: {
        position: 'right',
        ticks: { color: '#5a7a94', font: { family: "'Space Mono', monospace", size: 9 } },
        grid:  { color: 'rgba(30,45,61,0.5)' },
      }
    }
  };
}

// ── INIT ───────────────────────────────────────────────────────────────────────
initTickerStrip();
