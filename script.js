// ApexTrade Terminal - Pure Standalone Vanilla JS
(function () {
  'use strict';

  // Initial Assets
  const ASSETS = [
    { id: 'btc', symbol: 'BTC/USDT', name: 'Bitcoin', price: 68420.50, change24h: 3.42, high24h: 69150.00, low24h: 66280.00, volume24h: 2418500200, category: 'Layer 1', decimals: 2 },
    { id: 'eth', symbol: 'ETH/USDT', name: 'Ethereum', price: 3542.80, change24h: 4.18, high24h: 3590.00, low24h: 3395.20, volume24h: 1385400100, category: 'Layer 1', decimals: 2 },
    { id: 'sol', symbol: 'SOL/USDT', name: 'Solana', price: 178.65, change24h: 7.82, high24h: 182.40, low24h: 164.20, volume24h: 894200500, category: 'Layer 1', decimals: 2 },
    { id: 'bnb', symbol: 'BNB/USDT', name: 'BNB Chain', price: 594.30, change24h: 1.15, high24h: 602.10, low24h: 585.00, volume24h: 412500000, category: 'Layer 1', decimals: 2 },
    { id: 'sui', symbol: 'SUI/USDT', name: 'Sui Network', price: 2.1850, change24h: -2.45, high24h: 2.3100, low24h: 2.1200, volume24h: 284100000, category: 'Layer 1', decimals: 4 },
    { id: 'avax', symbol: 'AVAX/USDT', name: 'Avalanche', price: 33.45, change24h: -1.08, high24h: 34.80, low24h: 32.70, volume24h: 195400000, category: 'Layer 1', decimals: 2 },
    { id: 'link', symbol: 'LINK/USDT', name: 'Chainlink', price: 15.22, change24h: 5.64, high24h: 15.60, low24h: 14.30, volume24h: 142300000, category: 'DeFi', decimals: 2 },
    { id: 'near', symbol: 'NEAR/USDT', name: 'NEAR Protocol', price: 5.340, change24h: 8.91, high24h: 5.520, low24h: 4.880, volume24h: 235100000, category: 'AI', decimals: 3 },
    { id: 'doge', symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.1465, change24h: 12.30, high24h: 0.1520, low24h: 0.1290, volume24h: 620000000, category: 'Meme', decimals: 4 },
    { id: 'pepe', symbol: 'PEPE/USDT', name: 'Pepe', price: 0.00000985, change24h: -4.15, high24h: 0.00001050, low24h: 0.00000940, volume24h: 310500000, category: 'Meme', decimals: 8 }
  ];

  // State
  let activeAsset = ASSETS[0];
  let activeCategory = 'All';
  let searchQuery = '';
  let timeframe = '5m';
  let chartType = 'candle';
  let showEma20 = true;
  let showEma50 = true;
  let simSpeed = 1;
  let soundEnabled = false;
  let activePosTab = 'positions';
  let candles = [];
  let bids = [];
  let asks = [];
  let trades = [];
  let positions = [];
  let orders = [];
  let portfolio = {
    totalEquity: 50000,
    availableMargin: 50000,
    positionMargin: 0,
    unrealizedPnl: 0,
    realizedPnlToday: 0,
    winCount: 0,
    lossCount: 0
  };

  // Trade form state
  let tradeSide = 'buy';
  let tradeType = 'market';
  let tradeLeverage = 10;

  // Audio synthesis
  let audioCtx = null;
  function playTickSound(isUp) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isUp ? 880 : 660, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  function playTradeSound() {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.16);
    } catch (e) {}
  }

  // Toasts
  function showToast(title, desc, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-desc">${desc}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  // Candle generation
  function generateCandles(basePrice, count = 65) {
    const arr = [];
    const now = Date.now();
    let cur = basePrice * 0.95;
    for (let i = count - 1; i >= 0; i--) {
      const vola = 0.007 + Math.random() * 0.007;
      const change = (Math.random() - 0.485) * vola * cur;
      const open = cur;
      const close = Math.max(open * 0.5, open + change);
      const high = Math.max(open, close) + Math.random() * vola * cur * 0.7;
      const low = Math.min(open, close) - Math.random() * vola * cur * 0.7;
      const volume = Math.round((Math.random() * 80 + 10) * (basePrice > 1000 ? 5 : 200));
      arr.push({ timestamp: now - i * 300000, open, high, low, close, volume });
      cur = close;
    }
    arr[arr.length - 1].close = basePrice;
    return arr;
  }

  // Orderbook generation
  function generateOrderBook(price, decimals, depth = 12) {
    const b = [];
    const a = [];
    const step = price * 0.0002;
    let bTot = 0, aTot = 0;
    for (let i = 1; i <= depth; i++) {
      const aSize = +(Math.random() * 2 + 0.1).toFixed(2);
      aTot += aSize;
      a.push({ price: +(price + i * step).toFixed(decimals), size: aSize, total: +aTot.toFixed(2) });

      const bSize = +(Math.random() * 2 + 0.1).toFixed(2);
      bTot += bSize;
      b.push({ price: +(price - i * step).toFixed(decimals), size: bSize, total: +bTot.toFixed(2) });
    }
    a.reverse();
    return { bids: b, asks: a };
  }

  // Trades generation
  function generateInitialTrades(price, decimals, count = 20) {
    const list = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const isWhale = Math.random() < 0.05;
      const size = +((Math.random() * (isWhale ? 15 : 2) + 0.05) * (price > 1000 ? 1 : 40)).toFixed(decimals > 2 ? 3 : 2);
      const time = new Date(now - i * 3000).toTimeString().split(' ')[0];
      list.push({ id: `tr-${now}-${i}`, price: +(price + (Math.random() - 0.5) * price * 0.0005).toFixed(decimals), size, time, side, isWhale });
    }
    return list;
  }

  // Initialize data
  candles = generateCandles(activeAsset.price);
  const ob = generateOrderBook(activeAsset.price, activeAsset.decimals);
  bids = ob.bids;
  asks = ob.asks;
  trades = generateInitialTrades(activeAsset.price, activeAsset.decimals);

  // Render Top Navbar
  function renderNavbar() {
    const isPos = activeAsset.change24h >= 0;
    document.getElementById('nav-symbol').textContent = activeAsset.symbol;
    const priceEl = document.getElementById('nav-price');
    priceEl.textContent = `$${activeAsset.price.toFixed(activeAsset.decimals)}`;
    priceEl.style.color = isPos ? 'var(--emerald)' : 'var(--rose)';

    const changeEl = document.getElementById('nav-change');
    changeEl.textContent = `${isPos ? '+' : ''}${activeAsset.change24h.toFixed(2)}%`;
    changeEl.style.color = isPos ? 'var(--emerald)' : 'var(--rose)';

    document.getElementById('nav-high').textContent = `$${activeAsset.high24h.toFixed(activeAsset.decimals)}`;
    document.getElementById('nav-low').textContent = `$${activeAsset.low24h.toFixed(activeAsset.decimals)}`;
    document.getElementById('nav-vol').textContent = `$${(activeAsset.volume24h / 1e6).toFixed(1)}M`;
    document.getElementById('nav-equity').textContent = `$${portfolio.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Render Market List
  function renderMarkets(deltaAssetId = null, dir = null) {
    const list = document.getElementById('market-rows');
    if (!list) return;
    const filtered = ASSETS.filter(a => {
      const matchCat = activeCategory === 'All' || a.category === activeCategory;
      const matchQuery = a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });

    list.innerHTML = filtered.map(a => {
      const isSel = a.id === activeAsset.id;
      const isUp = a.change24h >= 0;
      const flashClass = a.id === deltaAssetId ? (dir === 'up' ? 'flash-up' : 'flash-down') : '';
      return `
        <div class="market-row ${isSel ? 'selected' : ''} ${flashClass}" data-id="${a.id}">
          <div>
            <strong style="color:#f1f5f9;">${a.symbol.split('/')[0]}</strong>
            <span style="font-size:10px; color:var(--text-muted);">/USDT</span>
          </div>
          <div class="font-mono tabular-nums" style="text-align:right;">
            $${a.price.toFixed(a.decimals)}
          </div>
          <div class="font-mono tabular-nums" style="text-align:right; font-weight:600; color:${isUp ? 'var(--emerald)' : 'var(--rose)'};">
            ${isUp ? '+' : ''}${a.change24h.toFixed(2)}%
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    list.querySelectorAll('.market-row').forEach(row => {
      row.onclick = () => {
        const id = row.getAttribute('data-id');
        const found = ASSETS.find(x => x.id === id);
        if (found) {
          activeAsset = found;
          candles = generateCandles(activeAsset.price);
          const newOb = generateOrderBook(activeAsset.price, activeAsset.decimals);
          bids = newOb.bids;
          asks = newOb.asks;
          trades = generateInitialTrades(activeAsset.price, activeAsset.decimals);
          updateTradeFormPrice();
          renderNavbar();
          renderMarkets();
          renderOrderBook();
          renderTrades();
          drawChart();
        }
      };
    });
  }

  // Render Orderbook
  function renderOrderBook() {
    const asksEl = document.getElementById('book-asks');
    const bidsEl = document.getElementById('book-bids');
    if (!asksEl || !bidsEl) return;

    const maxTotal = Math.max(asks[0]?.total || 1, bids[bids.length - 1]?.total || 1);

    asksEl.innerHTML = asks.slice(-8).map(ask => {
      const pct = Math.min(100, (ask.total / maxTotal) * 100);
      return `
        <div class="book-row font-mono tabular-nums" data-price="${ask.price}">
          <div class="depth-bar ask" style="width:${pct}%;"></div>
          <span style="color:var(--rose); font-weight:600; z-index:1;">${ask.price.toFixed(activeAsset.decimals)}</span>
          <span style="text-align:right; color:#cbd5e1; z-index:1;">${ask.size.toFixed(2)}</span>
          <span style="text-align:right; color:var(--text-muted); z-index:1;">${ask.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    bidsEl.innerHTML = bids.slice(0, 8).map(bid => {
      const pct = Math.min(100, (bid.total / maxTotal) * 100);
      return `
        <div class="book-row font-mono tabular-nums" data-price="${bid.price}">
          <div class="depth-bar bid" style="width:${pct}%;"></div>
          <span style="color:var(--emerald); font-weight:600; z-index:1;">${bid.price.toFixed(activeAsset.decimals)}</span>
          <span style="text-align:right; color:#cbd5e1; z-index:1;">${bid.size.toFixed(2)}</span>
          <span style="text-align:right; color:var(--text-muted); z-index:1;">${bid.total.toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Spread
    const spread = Math.max(0, (asks[asks.length - 1]?.price || activeAsset.price) - (bids[0]?.price || activeAsset.price));
    document.getElementById('spread-val').textContent = `$${spread.toFixed(activeAsset.decimals)}`;
    document.getElementById('spread-mark').textContent = `$${activeAsset.price.toFixed(activeAsset.decimals)}`;
    document.getElementById('spread-mark').style.color = activeAsset.change24h >= 0 ? 'var(--emerald)' : 'var(--rose)';

    // Click on book row to populate trade price
    document.querySelectorAll('.book-row').forEach(row => {
      row.onclick = () => {
        const p = row.getAttribute('data-price');
        setOrderType('limit');
        document.getElementById('input-price').value = p;
        calculateTradeForm();
      };
    });
  }

  // Render Trades
  function renderTrades() {
    const feed = document.getElementById('trades-feed');
    if (!feed) return;
    feed.innerHTML = trades.slice(0, 25).map(tr => {
      const isBuy = tr.side === 'buy';
      return `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; padding:3px 10px; font-size:11px; ${tr.isWhale ? 'background:rgba(245,158,11,0.1); border-left:2px solid var(--amber);' : ''}">
          <span class="font-mono tabular-nums" style="color:${isBuy ? 'var(--emerald)' : 'var(--rose)'}; font-weight:600;">
            ${tr.price.toFixed(activeAsset.decimals)} ${tr.isWhale ? '⚡' : ''}
          </span>
          <span class="font-mono tabular-nums" style="text-align:right; color:#cbd5e1;">${tr.size}</span>
          <span class="font-mono tabular-nums" style="text-align:right; color:var(--text-muted);">${tr.time}</span>
        </div>
      `;
    }).join('');
  }

  // Calculate EMA
  function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    const res = [];
    let prev = null;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        res.push(null);
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[j].close;
        prev = sum / period;
        res.push(prev);
      } else {
        prev = data[i].close * k + prev * (1 - k);
        res.push(prev);
      }
    }
    return res;
  }

  // Draw Candlestick Canvas
  function drawChart() {
    const canvas = document.getElementById('trading-canvas');
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padR = 60;
    const padB = 24;
    const plotW = w - padR;
    const plotH = h - padB;
    const volH = Math.min(plotH * 0.2, 70);
    const priceH = plotH - volH - 6;

    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, w, h);

    let min = Infinity, max = -Infinity, maxVol = 0;
    candles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    const range = (max - min) || 1;
    const yMin = min - range * 0.08;
    const yMax = max + range * 0.08;
    const ySpan = yMax - yMin;

    const count = candles.length;
    const candleW = Math.max(3, (plotW / count) * 0.72);
    const spacing = plotW / count;

    const getY = (val) => priceH - ((val - yMin) / ySpan) * priceH;

    // Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#151b27';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i <= 5; i++) {
      const p = yMin + (ySpan / 5) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.fillText(p.toFixed(activeAsset.decimals), plotW + 6, y + 3);
    }

    // Volume bars
    candles.forEach((c, i) => {
      const x = i * spacing + spacing / 2;
      const isUp = c.close >= c.open;
      const vH = (c.volume / (maxVol || 1)) * volH;
      ctx.fillStyle = isUp ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';
      ctx.fillRect(x - candleW / 2, plotH - vH, candleW, vH);
    });

    // Candles
    if (chartType === 'candle') {
      candles.forEach((c, i) => {
        const x = i * spacing + spacing / 2;
        const isUp = c.close >= c.open;
        const oY = getY(c.open);
        const cY = getY(c.close);
        const hY = getY(c.high);
        const lY = getY(c.low);

        ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, hY);
        ctx.lineTo(x, lY);
        ctx.stroke();

        ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
        ctx.fillRect(x - candleW / 2, Math.min(oY, cY), candleW, Math.max(Math.abs(cY - oY), 1.5));
      });
    } else {
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = i * spacing + spacing / 2;
        const y = getY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // EMAs
    if (showEma20) {
      const ema20 = calculateEMA(candles, 20);
      ctx.beginPath();
      let s = false;
      ema20.forEach((val, i) => {
        if (val !== null) {
          const x = i * spacing + spacing / 2;
          const y = getY(val);
          if (!s) { ctx.moveTo(x, y); s = true; }
          else ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (showEma50) {
      const ema50 = calculateEMA(candles, 50);
      ctx.beginPath();
      let s = false;
      ema50.forEach((val, i) => {
        if (val !== null) {
          const x = i * spacing + spacing / 2;
          const y = getY(val);
          if (!s) { ctx.moveTo(x, y); s = true; }
          else ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Current Market Price Dashed Line
    const curY = getY(activeAsset.price);
    const isUp = activeAsset.change24h >= 0;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isUp ? '#10b981' : '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, curY);
    ctx.lineTo(plotW, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price badge on right
    ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
    ctx.fillRect(plotW, curY - 9, padR, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(activeAsset.price.toFixed(activeAsset.decimals), plotW + 4, curY + 3);
  }

  // Trade Form calculations
  function updateTradeFormPrice() {
    if (tradeType === 'market') {
      document.getElementById('input-price').value = activeAsset.price.toFixed(activeAsset.decimals);
    }
  }

  function calculateTradeForm() {
    const price = parseFloat(document.getElementById('input-price').value) || activeAsset.price;
    const size = parseFloat(document.getElementById('input-size').value) || 0;
    const orderVal = price * size;
    const reqMargin = orderVal / tradeLeverage;
    const isLong = tradeSide === 'buy';
    const estLiq = isLong ? price * (1 - (1 / tradeLeverage) * 0.9) : price * (1 + (1 / tradeLeverage) * 0.9);

    document.getElementById('sum-val').textContent = `$${orderVal.toFixed(2)}`;
    document.getElementById('sum-margin').textContent = `$${reqMargin.toFixed(2)}`;
    document.getElementById('sum-liq').textContent = `$${estLiq.toFixed(activeAsset.decimals)}`;
    document.getElementById('sum-avail').textContent = `$${portfolio.availableMargin.toFixed(2)}`;
    document.getElementById('unit-size').textContent = activeAsset.symbol.split('/')[0];
  }

  function setOrderType(type) {
    tradeType = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${type}"]`).classList.add('active');
    const input = document.getElementById('input-price');
    if (type === 'market') {
      input.disabled = true;
      input.value = activeAsset.price.toFixed(activeAsset.decimals);
    } else {
      input.disabled = false;
    }
    calculateTradeForm();
  }

  // Positions & Orders Table
  function renderPositionsTable() {
    const container = document.getElementById('positions-content');
    if (!container) return;

    if (activePosTab === 'positions') {
      if (positions.length === 0) {
        container.innerHTML = `
          <div style="padding:40px; text-align:center; color:var(--text-muted);">
            No open positions. Use the right terminal to place a Long or Short order.
          </div>
        `;
        return;
      }
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Size</th>
              <th>Entry Price</th>
              <th>Mark Price</th>
              <th>Liq. Price</th>
              <th>Margin</th>
              <th>Unrealized PnL (ROI)</th>
              <th style="text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${positions.map(p => {
              const isProfit = p.pnl >= 0;
              return `
                <tr class="font-mono tabular-nums">
                  <td>
                    <span style="font-weight:700; color:${p.side === 'long' ? 'var(--emerald)' : 'var(--rose)'};">
                      ${p.side.toUpperCase()} ${p.leverage}x
                    </span> ${p.symbol}
                  </td>
                  <td>${p.size.toFixed(3)}</td>
                  <td>$${p.entryPrice.toFixed(2)}</td>
                  <td style="font-weight:700; color:#fff;">$${p.markPrice.toFixed(2)}</td>
                  <td style="color:var(--amber);">$${p.liquidationPrice.toFixed(2)}</td>
                  <td>$${p.margin.toFixed(2)}</td>
                  <td style="font-weight:700; color:${isProfit ? 'var(--emerald)' : 'var(--rose)'};">
                    ${isProfit ? '+' : ''}$${p.pnl.toFixed(2)} (${isProfit ? '+' : ''}${p.pnlPercent.toFixed(2)}%)
                  </td>
                  <td style="text-align:right;">
                    <button class="btn-close-pos" data-id="${p.id}" style="padding:3px 8px; font-size:11px; border-radius:4px; background:var(--bg-card); border:1px solid var(--border-color); color:#fff;">
                      Market Close
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      container.querySelectorAll('.btn-close-pos').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          closePosition(id);
        };
      });

    } else if (activePosTab === 'orders') {
      const openOrds = orders.filter(o => o.status === 'open');
      if (openOrds.length === 0) {
        container.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">No open limit orders.</div>`;
        return;
      }
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Pair</th><th>Side</th><th>Price</th><th>Size</th><th>Margin</th><th style="text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${openOrds.map(o => `
              <tr class="font-mono tabular-nums">
                <td>${new Date(o.createdAt).toLocaleTimeString()}</td>
                <td><strong>${o.symbol}</strong></td>
                <td style="color:${o.side === 'buy' ? 'var(--emerald)' : 'var(--rose)'}; font-weight:700;">${o.side.toUpperCase()}</td>
                <td>$${o.price.toFixed(2)}</td>
                <td>${o.size.toFixed(3)}</td>
                <td>$${o.margin.toFixed(2)}</td>
                <td style="text-align:right;">
                  <button class="btn-cancel-ord" data-id="${o.id}" style="padding:2px 6px; font-size:11px; background:var(--bg-card); border:1px solid var(--border-color); color:#fff; border-radius:3px;">Cancel</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      container.querySelectorAll('.btn-cancel-ord').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          orders = orders.map(o => o.id === id ? { ...o, status: 'cancelled' } : o);
          renderPositionsTable();
          showToast('Order Cancelled', 'Limit order removed from order book.');
        };
      });

    } else {
      // Portfolio Overview
      container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; padding:16px;">
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Total Portfolio Equity</div>
            <div class="font-mono" style="font-size:18px; font-weight:700; color:#fff;">$${portfolio.totalEquity.toFixed(2)}</div>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Available Margin</div>
            <div class="font-mono" style="font-size:18px; font-weight:700; color:#cbd5e1;">$${portfolio.availableMargin.toFixed(2)}</div>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Session Realized PnL</div>
            <div class="font-mono" style="font-size:18px; font-weight:700; color:${portfolio.realizedPnlToday >= 0 ? 'var(--emerald)' : 'var(--rose)'};">
              ${portfolio.realizedPnlToday >= 0 ? '+' : ''}$${portfolio.realizedPnlToday.toFixed(2)}
            </div>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Trade Win Rate</div>
            <div class="font-mono" style="font-size:18px; font-weight:700; color:#fff;">
              ${portfolio.winCount + portfolio.lossCount > 0 ? ((portfolio.winCount / (portfolio.winCount + portfolio.lossCount)) * 100).toFixed(0) + '%' : 'N/A'}
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('pos-count-badge').textContent = positions.length;
    document.getElementById('ord-count-badge').textContent = orders.filter(o => o.status === 'open').length;
  }

  function closePosition(id) {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    const pnl = pos.pnl;
    const isWin = pnl >= 0;
    positions = positions.filter(p => p.id !== id);
    portfolio.totalEquity += pnl;
    portfolio.realizedPnlToday += pnl;
    if (isWin) portfolio.winCount++;
    else portfolio.lossCount++;

    updatePortfolioMargins();
    renderNavbar();
    renderPositionsTable();
    playTradeSound();
    showToast('Position Closed', `Realized ${isWin ? '+' : ''}$${pnl.toFixed(2)} profit.`, isWin ? 'success' : 'danger');
  }

  function updatePortfolioMargins() {
    let posMargin = 0;
    let unPnl = 0;
    positions = positions.map(pos => {
      const match = ASSETS.find(a => a.symbol === pos.symbol);
      const curPrice = match ? match.price : pos.markPrice;
      const isLong = pos.side === 'long';
      const pnl = isLong ? (curPrice - pos.entryPrice) * pos.size * pos.leverage : (pos.entryPrice - curPrice) * pos.size * pos.leverage;
      const pnlPercent = pos.margin > 0 ? (pnl / pos.margin) * 100 : 0;
      posMargin += pos.margin;
      unPnl += pnl;
      return { ...pos, markPrice: curPrice, pnl, pnlPercent };
    });

    portfolio.positionMargin = posMargin;
    portfolio.unrealizedPnl = unPnl;
    portfolio.availableMargin = Math.max(0, portfolio.totalEquity - posMargin + unPnl);
  }

  // Simulation loop
  setInterval(() => {
    if (simSpeed === 0) return;

    // 1. Tick active coin
    const vol = 0.0007 * (Math.random() * 2);
    const dir = Math.random() > 0.495 ? 1 : -1;
    const delta = dir * activeAsset.price * vol;
    const newPrice = Math.max(0.00000001, +(activeAsset.price + delta).toFixed(activeAsset.decimals));
    const isUp = newPrice >= activeAsset.price;

    activeAsset.price = newPrice;
    activeAsset.high24h = Math.max(activeAsset.high24h, newPrice);
    activeAsset.low24h = Math.min(activeAsset.low24h, newPrice);
    activeAsset.change24h += isUp ? 0.02 : -0.02;

    playTickSound(isUp);

    // 2. Random other coin tick
    if (Math.random() < 0.2) {
      const randCoin = ASSETS[Math.floor(Math.random() * ASSETS.length)];
      if (randCoin.id !== activeAsset.id) {
        const cDelta = (Math.random() - 0.49) * 0.0005 * randCoin.price;
        randCoin.price = +(randCoin.price + cDelta).toFixed(randCoin.decimals);
        randCoin.change24h += cDelta >= 0 ? 0.01 : -0.01;
      }
    }

    // 3. Update last candle
    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      last.close = newPrice;
      last.high = Math.max(last.high, newPrice);
      last.low = Math.min(last.low, newPrice);
      last.volume += Math.round(Math.random() * 5 + 1);
    }

    // 4. Append trade
    const isWhale = Math.random() < 0.04;
    const tSize = +((Math.random() * (isWhale ? 12 : 2) + 0.02) * (newPrice > 1000 ? 1 : 50)).toFixed(activeAsset.decimals > 2 ? 3 : 2);
    trades.unshift({
      id: `tr-${Date.now()}`,
      price: newPrice,
      size: tSize,
      time: new Date().toTimeString().split(' ')[0],
      side: isUp ? 'buy' : 'sell',
      isWhale
    });
    if (trades.length > 35) trades.pop();

    // 5. Shift orderbook
    const step = newPrice * 0.0002;
    asks = asks.map((r, idx) => ({ ...r, price: +(newPrice + (asks.length - idx) * step).toFixed(activeAsset.decimals) }));
    bids = bids.map((r, idx) => ({ ...r, price: +(newPrice - (idx + 1) * step).toFixed(activeAsset.decimals) }));

    // 6. Check limit orders
    orders.forEach(ord => {
      if (ord.status === 'open' && ord.symbol === activeAsset.symbol) {
        if ((ord.side === 'buy' && newPrice <= ord.price) || (ord.side === 'sell' && newPrice >= ord.price)) {
          ord.status = 'filled';
          const isLong = ord.side === 'buy';
          const estLiq = isLong ? ord.price * (1 - (1 / ord.leverage) * 0.9) : ord.price * (1 + (1 / ord.leverage) * 0.9);
          positions.unshift({
            id: `pos-${Date.now()}`,
            symbol: ord.symbol,
            side: isLong ? 'long' : 'short',
            entryPrice: ord.price,
            markPrice: newPrice,
            size: ord.size,
            margin: ord.margin,
            leverage: ord.leverage,
            liquidationPrice: estLiq,
            pnl: 0,
            pnlPercent: 0
          });
          playTradeSound();
          showToast('Limit Order Filled', `${ord.side.toUpperCase()} ${ord.size} @ $${ord.price.toFixed(2)}`);
        }
      }
    });

    updatePortfolioMargins();
    renderNavbar();
    renderMarkets(activeAsset.id, isUp ? 'up' : 'down');
    renderOrderBook();
    renderTrades();
    renderPositionsTable();
    updateTradeFormPrice();
    calculateTradeForm();
    drawChart();

  }, Math.max(200, Math.floor(1000 / simSpeed)));

  // Setup DOM Event Listeners
  window.addEventListener('DOMContentLoaded', () => {
    // Category filters
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat');
        renderMarkets();
      };
    });

    // Search input
    document.getElementById('market-search').oninput = (e) => {
      searchQuery = e.target.value;
      renderMarkets();
    };

    // Timeframes
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        timeframe = btn.getAttribute('data-tf');
        candles = generateCandles(activeAsset.price);
        drawChart();
      };
    });

    // Chart Type (Candle vs Line)
    document.getElementById('btn-chart-candle').onclick = () => {
      chartType = 'candle';
      document.getElementById('btn-chart-candle').classList.add('active');
      document.getElementById('btn-chart-line').classList.remove('active');
      drawChart();
    };
    document.getElementById('btn-chart-line').onclick = () => {
      chartType = 'line';
      document.getElementById('btn-chart-line').classList.add('active');
      document.getElementById('btn-chart-candle').classList.remove('active');
      drawChart();
    };

    // Indicators
    document.getElementById('toggle-ema20').onclick = function () {
      showEma20 = !showEma20;
      this.classList.toggle('active', showEma20);
      drawChart();
    };
    document.getElementById('toggle-ema50').onclick = function () {
      showEma50 = !showEma50;
      this.classList.toggle('active', showEma50);
      drawChart();
    };

    // Trade form Long/Short
    document.getElementById('btn-side-buy').onclick = () => {
      tradeSide = 'buy';
      document.getElementById('btn-side-buy').classList.add('active');
      document.getElementById('btn-side-sell').classList.remove('active');
      const submitBtn = document.getElementById('btn-order-submit');
      submitBtn.className = 'btn-submit-order buy';
      submitBtn.textContent = `Open Long ${activeAsset.symbol.split('/')[0]}`;
      calculateTradeForm();
    };

    document.getElementById('btn-side-sell').onclick = () => {
      tradeSide = 'sell';
      document.getElementById('btn-side-sell').classList.add('active');
      document.getElementById('btn-side-buy').classList.remove('active');
      const submitBtn = document.getElementById('btn-order-submit');
      submitBtn.className = 'btn-submit-order sell';
      submitBtn.textContent = `Open Short ${activeAsset.symbol.split('/')[0]}`;
      calculateTradeForm();
    };

    // Order Type Market / Limit
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.onclick = () => setOrderType(btn.getAttribute('data-type'));
    });

    // Percentage chips
    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.onclick = () => {
        const pct = parseFloat(btn.getAttribute('data-pct'));
        const price = parseFloat(document.getElementById('input-price').value) || activeAsset.price;
        const targetMargin = portfolio.availableMargin * (pct / 100);
        const targetVal = targetMargin * tradeLeverage;
        if (price > 0) {
          document.getElementById('input-size').value = (targetVal / price).toFixed(activeAsset.decimals > 2 ? 4 : 3);
          calculateTradeForm();
        }
      };
    });

    // Leverage slider
    const levSlider = document.getElementById('input-leverage');
    levSlider.oninput = (e) => {
      tradeLeverage = parseInt(e.target.value);
      document.getElementById('leverage-readout').textContent = `${tradeLeverage}x`;
      calculateTradeForm();
    };

    // Size input
    document.getElementById('input-size').oninput = calculateTradeForm;
    document.getElementById('input-price').oninput = calculateTradeForm;

    // Order Submit
    document.getElementById('trade-form').onsubmit = (e) => {
      e.preventDefault();
      const price = parseFloat(document.getElementById('input-price').value) || activeAsset.price;
      const size = parseFloat(document.getElementById('input-size').value) || 0;
      if (size <= 0) {
        showToast('Invalid Size', 'Please enter a positive order size', 'danger');
        return;
      }
      const reqMargin = (price * size) / tradeLeverage;
      if (reqMargin > portfolio.availableMargin) {
        showToast('Insufficient Margin', `Required: $${reqMargin.toFixed(2)}, Available: $${portfolio.availableMargin.toFixed(2)}`, 'danger');
        return;
      }

      if (tradeType === 'market') {
        const isLong = tradeSide === 'buy';
        const estLiq = isLong ? price * (1 - (1 / tradeLeverage) * 0.9) : price * (1 + (1 / tradeLeverage) * 0.9);
        positions.unshift({
          id: `pos-${Date.now()}`,
          symbol: activeAsset.symbol,
          side: isLong ? 'long' : 'short',
          entryPrice: price,
          markPrice: price,
          size,
          margin: reqMargin,
          leverage: tradeLeverage,
          liquidationPrice: estLiq,
          pnl: 0,
          pnlPercent: 0
        });
        playTradeSound();
        showToast('Market Order Executed', `Opened ${isLong ? 'LONG' : 'SHORT'} ${size} ${activeAsset.symbol} @ $${price.toFixed(2)}`);
      } else {
        orders.unshift({
          id: `ord-${Date.now()}`,
          symbol: activeAsset.symbol,
          side: tradeSide,
          type: 'limit',
          price,
          size,
          margin: reqMargin,
          leverage: tradeLeverage,
          status: 'open',
          createdAt: Date.now()
        });
        showToast('Limit Order Placed', `Order placed @ $${price.toFixed(2)} in order book queue.`);
      }

      document.getElementById('input-size').value = '';
      updatePortfolioMargins();
      renderPositionsTable();
      calculateTradeForm();
    };

    // Positions tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePosTab = btn.getAttribute('data-tab');
        renderPositionsTable();
      };
    });

    // Speed Controls
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        simSpeed = parseInt(btn.getAttribute('data-speed'));
      };
    });

    // Sound toggle
    document.getElementById('btn-sound-toggle').onclick = () => {
      soundEnabled = !soundEnabled;
      document.getElementById('btn-sound-toggle').textContent = soundEnabled ? '🔊 Sound On' : '🔇 Muted';
      if (soundEnabled) playTickSound(true);
    };

    // Quick Deposit
    document.getElementById('btn-deposit-funds').onclick = () => {
      portfolio.totalEquity += 10000;
      updatePortfolioMargins();
      renderNavbar();
      showToast('Deposit Added', '+$10,000 USDT credited to test account.');
    };

    // Reset Portfolio
    document.getElementById('btn-reset-portfolio').onclick = () => {
      positions = [];
      orders = [];
      portfolio = { totalEquity: 50000, availableMargin: 50000, positionMargin: 0, unrealizedPnl: 0, realizedPnlToday: 0, winCount: 0, lossCount: 0 };
      updatePortfolioMargins();
      renderNavbar();
      renderPositionsTable();
      showToast('Portfolio Reset', 'Balance restored to initial $50,000 USDT.');
    };

    // Event Dropdown
    const eventBtn = document.getElementById('btn-simulate-event');
    const eventDropdown = document.getElementById('event-dropdown');
    eventBtn.onclick = (e) => {
      e.stopPropagation();
      eventDropdown.classList.toggle('hidden');
    };
    document.addEventListener('click', () => {
      eventDropdown.classList.add('hidden');
    });

    document.getElementById('act-whale-buy').onclick = () => {
      activeAsset.price = +(activeAsset.price * 1.045).toFixed(activeAsset.decimals);
      activeAsset.change24h += 4.5;
      showToast('Whale Buy Triggered', `+$45M sweep executed on ${activeAsset.symbol}!`);
    };
    document.getElementById('act-whale-dump').onclick = () => {
      activeAsset.price = +(activeAsset.price * 0.955).toFixed(activeAsset.decimals);
      activeAsset.change24h -= 4.5;
      showToast('Whale Flash Dump', `-$50M sell wall triggered on ${activeAsset.symbol}!`, 'danger');
    };
    document.getElementById('act-volatility').onclick = () => {
      activeAsset.price = +(activeAsset.price * (Math.random() > 0.5 ? 1.06 : 0.94)).toFixed(activeAsset.decimals);
      showToast('Macro Volatility', `Extreme market fluctuations injected!`);
    };

    // Canvas resize observer
    window.addEventListener('resize', drawChart);

    // Initial renders
    renderNavbar();
    renderMarkets();
    renderOrderBook();
    renderTrades();
    renderPositionsTable();
    updateTradeFormPrice();
    calculateTradeForm();
    drawChart();
  });

})();
