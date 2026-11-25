/* The RunGood app, rebuilt for the website: the dashboard in the hero, a HUD on a table, the results
   graph and the club bankroll. Same colours, boxes and cards as the desktop app; made-up numbers. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const money = (n, sign = true) => (n < 0 ? '−$' : sign ? '+$' : '$') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const num = (n, d = 1) => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const setT = (el, t) => { if (el && el.textContent !== t) { el.textContent = t; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } };

  /* ---------- scale every fixed-size app piece to the space it has ---------- */
  const fits = [...document.querySelectorAll('.fit')];
  const fitAll = () => fits.forEach((f) => {
    const w = +f.dataset.w, h = +f.dataset.h, k = f.clientWidth / w;
    f.style.height = `${h * k}px`;
    const inner = f.firstElementChild; inner.style.transform = `scale(${k})`;
  });
  if ('ResizeObserver' in window) new ResizeObserver(fitAll).observe(document.body); else addEventListener('resize', fitAll);
  fitAll();

  /* ---------- cards (four-colour deck, like the app) ---------- */
  const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const deck = () => { const d = []; for (const r of RANKS) for (const s of 'shdc') d.push([r, s]); for (let i = d.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [d[i], d[j]] = [d[j], d[i]]; } return d; };
  const cardHtml = ([r, s], cls = '') => `<span class="rg-card ${s} ${cls}">${r}<i>${SUIT[s]}</i></span>`;

  /* ---------- a chart in the app's style: grid, BB labels on the right, green line, end label ---------- */
  function chart(box, opts = {}) {
    box.innerHTML = '<svg></svg><div class="rg-enddot"></div><div class="rg-endpill"></div>';
    const svg = box.querySelector('svg'), dot = box.querySelector('.rg-enddot'), pill = box.querySelector('.rg-endpill');
    const unit = opts.unit || 'BB';
    const lab = (v) => unit === '$' ? money(v, v !== 0).replace('.00', '') : `${v > 0 ? '+' : ''}${v.toFixed(1)} ${unit}`;
    return (series, ev, animate) => {
      const W = box.clientWidth, H = box.clientHeight, padR = 64, padT = 8, padB = 16, cw = W - padR;
      const all = ev ? series.concat(ev) : series;
      let lo = Math.min(0, ...all), hi = Math.max(10, ...all);
      const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000][[10, 20, 25, 50, 100, 200, 250, 500, 1000].findIndex((s) => (hi - lo) / s <= 4)] || 2000;
      lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
      const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
      const x = (i, n) => (i / Math.max(n - 1, 1)) * (cw - 8);
      const pts = (a) => a.map((v, i) => `${x(i, a.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      let g = '<defs><linearGradient id="rgfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3ddc84" stop-opacity=".22"/><stop offset="1" stop-color="#3ddc84" stop-opacity="0"/></linearGradient></defs>';
      for (let v = lo; v <= hi + 1e-9; v += step) {
        g += `<line class="${v === 0 ? 'zero' : 'gl'}" x1="0" x2="${cw}" y1="${y(v)}" y2="${y(v)}"/><text class="yl" x="${cw + 8}" y="${y(v) + 3.5}">${lab(v)}</text>`;
      }
      const p = pts(series);
      g += `<polygon class="area" points="0,${y(lo)} ${p} ${x(series.length - 1, series.length)},${y(lo)}"/>`;
      if (ev) g += `<polyline class="ev" points="${pts(ev)}"/>`;
      g += `<polyline class="line" points="${p}"/>`;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = g;
      const last = series[series.length - 1], lx = x(series.length - 1, series.length), ly = y(last);
      dot.style.left = `${lx}px`; dot.style.top = `${ly}px`;
      pill.style.left = `${lx}px`; pill.style.top = `${ly}px`; pill.textContent = unit === '$' ? money(last) : `${num(last)} ${unit}`;
      if (animate) {
        const line = svg.querySelector('.line'), len = line.getTotalLength ? line.getTotalLength() : 2000;
        line.style.strokeDasharray = len; line.style.strokeDashoffset = len; svg.querySelector('.area').style.opacity = 0;
        dot.style.opacity = pill.style.opacity = 0;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          line.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.4,.1,.2,1)'; line.style.strokeDashoffset = 0;
          const a = svg.querySelector('.area'); a.style.transition = 'opacity 1.2s 1.8s'; a.style.opacity = 1;
          setTimeout(() => { dot.style.opacity = pill.style.opacity = 1; }, 2500);
        }));
      }
    };
  }

  /* a believable winning stretch, in dollars at $1/$2 */
  const swing = () => { const r = Math.random(); if (r < .5) return -rnd(1, 6); if (r < .8) return rnd(3, 34); if (r < .91) return -rnd(40, 150); return rnd(60, 240); };
  const winningRun = (n, minEnd, maxEnd = minEnd * 3) => { for (let t = 0; t < 600; t++) { let v = 0; const s = [0]; for (let i = 0; i < n; i++) { v += swing(); s.push(v); } if (v > minEnd && v < maxEnd && Math.min(...s.slice(-8)) > minEnd * .5) return s; } return Array.from({ length: n + 1 }, (_, i) => i * minEnd / n); };

  /* ---------- the dashboard ---------- */
  const ICON = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    spade: '<path d="M12 2C9.5 6 4 9 4 13.2a4 4 0 0 0 6.9 2.7L10 21h4l-.9-5.1A4 4 0 0 0 20 13.2C20 9 14.5 6 12 2z"/>',
    chart: '<path d="M6 19v-6M11 19V8M16 19v-9M21 19H3"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12.5h2M3 9h15"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3 19c.5-3.3 3-5 6-5s5.5 1.7 6 5M16 6.5a3 3 0 0 1 0 5.8M18 14.5c1.6.6 2.6 2.2 3 4.5"/>',
    hud: '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
    spots: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1"/>',
    stake: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.5-3.3 3-5 6-5 1.4 0 2.6.3 3.6 1M17 13.5v5M14.5 16h5"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
  };
  const ico = (k) => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;

  const dash = $('#rg-dash');
  if (dash) {
    dash.innerHTML = `
      <div class="rg-title"><svg class="spade" viewBox="0 0 24 24">${ICON.spade}</svg><b>RUNGOOD</b><span class="sep">/</span><span class="sec">Dashboard</span>
        <div class="right"><span class="rg-pill"><span class="d"></span>ClubGG · tracking 3 tables</span><div class="rg-win"><i>—</i><i>▢</i><i>✕</i></div></div></div>
      <div class="rg-body">
        <div class="rg-rail"><span>${ico('menu')}</span><span class="logo">${ico('spade')}</span><span class="on">${ico('chart')}</span><span>${ico('wallet')}</span><span>${ico('cal')}</span><span>${ico('users')}</span><span>${ico('hud')}</span><span>${ico('spots')}</span><span>${ico('stake')}</span><span>${ico('cog')}</span></div>
        <div class="rg-main">
          <div class="rg-col">
            <div class="rg-panel rg-filters"><div class="rg-f sel"><small>Period</small><b>This month</b></div><div class="rg-f"><small>Club</small><b>All clubs</b></div><div class="rg-f"><small>Stakes</small><b>All stakes</b></div><div class="rg-f"><small>Game</small><b>All games</b></div><div class="rg-f more">More</div></div>
            <div class="rg-panel rg-kpis">
              <div class="rg-kpi big"><div class="rg-cap">Net profit</div><div class="v up"><span data-k="net"></span><small>BB</small></div><div class="s"><span data-k="netusd"></span><span class="rg-badge" data-k="badge"></span></div></div>
              <div class="rg-kpi"><div class="rg-cap">All-in EV</div><div class="v up"><span data-k="ev"></span><small>BB</small></div><div class="s" data-k="evsub"></div></div>
              <div class="rg-kpi"><div class="rg-cap">Win rate</div><div class="v up"><span data-k="wr"></span><small>bb/100</small></div><div class="s">5 stakes · 3 clubs</div></div>
              <div class="rg-kpi"><div class="rg-cap">Hands</div><div class="v" data-k="hands"></div><div class="s" data-k="sess"></div></div>
            </div>
            <div class="rg-panel rg-results">
              <div class="rg-rhead"><span class="rg-cap" style="color:var(--ink)">Results</span><span class="rg-tabs"><i class="on">Last session</i><i>Period</i></span><span class="rg-tabs"><i class="on">Hands</i><i>Date</i><i>Sessions</i><i>Monthly</i></span></div>
              <div class="rg-chart" data-k="chart"></div>
              <div class="rg-foot"><span>Hands won<b data-k="hw"></b></span><span>VPIP / PFR<b>24.1 / 19.6</b></span><span>W$WSF<b>49.8%</b></span><span>Rake<b data-k="rake"></b></span></div>
            </div>
          </div>
          <div class="rg-col">
            <div class="rg-panel rg-sess">
              <div class="rg-shead"><span class="t">Sessions</span><span class="rg-count">2</span><span class="rg-tabs" style="margin-left:auto"><i class="on">All</i><i>Won</i><i>Lost</i></span></div>
              <div class="rg-srow"><div class="a"><b><span class="rg-live">LIVE</span>Today · 9:02 PM</b><div><span data-k="shands"></span> hands · Desert Aces + Neon Ninety · 3 tables</div></div><div class="b"><b class="up" data-k="snet"></b><small data-k="sbb"></small></div></div>
              <div class="rg-srow"><div class="a"><b>Yesterday · 8:15 PM</b><div>604 hands · Desert Aces · 4 tables</div></div><div class="b"><b class="up">+$412.80</b><small>+34.2 bb/100</small></div></div>
            </div>
            <div class="rg-panel rg-hands">
              <div class="rg-hhead"><i class="on">Hands</i><i>Results</i><i>Big hands</i><span class="rg-track">Tracking 3 tables</span></div>
              <div class="rg-cur"><span><b>Current session</b> <span class="mut">· <span data-k="chands"></span> hands</span></span><b data-k="cnet"></b></div>
              <div class="rg-list" data-k="list"></div>
            </div>
          </div>
        </div>
      </div>`;
    const K = (k) => dash.querySelector(`[data-k="${k}"]`);
    const BB = 2;
    const TABLES = [
      { game: 'NLHE $1/$2', club: 'Desert Aces', t: 'T1', plo: false },
      { game: 'NLHE $1/$2', club: 'Desert Aces', t: 'T2', plo: false },
      { game: 'PLO $1/$2', club: 'Neon Ninety', t: 'T3', plo: true },
    ];
    let month = 1648.6, monthEv = 1502.4, hands = 4712, rake = 286.4, won = 0, sessHands = 0;
    let sess = winningRun(70, 180, 420);
    month += sess[sess.length - 1]; sessHands = 140 + ((Math.random() * 30) | 0); hands += sessHands; won = Math.round(sessHands * .31);
    let evSess = sess.map((v, i) => v * .9 + i * .4);
    let clock = 21 * 60 + 47;
    const draw = chart(K('chart'));
    const addHand = (d) => {
      const tb = pick(TABLES), dk = deck(), n = tb.plo ? 4 : 2;
      const row = document.createElement('div'); row.className = 'rg-hand';
      clock += 1;
      const hh = Math.floor(clock / 60) % 24, mm = clock % 60, ampm = hh >= 12 ? 'PM' : 'AM';
      const ev = Math.random() < .2 ? `<small> · EV ${num(d / BB * rnd(.6, 1.2))} bb</small>` : '';
      row.innerHTML = `<div class="rg-cards ${tb.plo ? 'plo' : ''}">${dk.slice(0, n).map((c) => cardHtml(c)).join('')}</div>
        <div class="g"><b>${tb.game}</b><span>ClubGG · ${tb.club} · ${tb.t} · ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ampm}</span></div>
        <div class="r"><b class="${d >= 0 ? 'up' : 'dn'}">${money(d)}</b><small>${num(d / BB)} bb</small>${ev}</div>`;
      const list = K('list'); list.prepend(row);
      while (list.children.length > 9) list.lastChild.remove();
    };
    const render = () => {
      const sNet = sess[sess.length - 1];
      setT(K('net'), num(month / BB)); setT(K('netusd'), `${money(month)} · this month`);
      K('badge').textContent = `▲ ${num(month / BB / hands * 100)} bb/100`;
      setT(K('ev'), num(monthEv / BB)); K('evsub').textContent = '64 all-ins · luck-adjusted';
      setT(K('wr'), num(month / BB / hands * 100)); setT(K('hands'), hands.toLocaleString('en-US')); K('sess').textContent = '21 sessions';
      K('hw').textContent = `${(won / sessHands * 100).toFixed(1)}%`; K('rake').textContent = money(rake, false);
      setT(K('shands'), String(sessHands)); setT(K('snet'), money(sNet)); K('sbb').textContent = `${num(sNet / BB / sessHands * 100)} bb/100`;
      setT(K('chands'), String(sessHands)); setT(K('cnet'), money(sNet));
      draw(sess.map((v) => v / BB), evSess.map((v) => v / BB));
    };
    for (let i = 0; i < 9; i++) addHand(swing());
    render();
    const tick = () => {
      let d = swing();
      if (sess[sess.length - 1] + d < 60) d = Math.abs(d);
      if (sess[sess.length - 1] > 900 && d > 0) d = -d * .6;   // and not an absurd one   // keep the demo session a winner
      sess.push(sess[sess.length - 1] + d); evSess.push(evSess[evSess.length - 1] + d * rnd(.7, 1.15));
      if (sess.length > 110) { sess.shift(); evSess.shift(); }
      month += d; monthEv += d * rnd(.7, 1.1); hands += 1; sessHands += 1; if (d > 0) won += 1; rake += Math.max(0, d) * .04;
      addHand(d); render();
    };
    if (!reduce) setInterval(tick, 1700);

    /* mouse parallax on top of the slow sway */
    const stage = $('.stage');
    if (stage && !reduce && matchMedia('(pointer: fine)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0;
      addEventListener('mousemove', (e) => { tx = (e.clientX / innerWidth - .5) * 8; ty = (e.clientY / innerHeight - .5) * -6; }, { passive: true });
      stage.style.transformStyle = 'preserve-3d';
      const loop = () => { cx += (tx - cx) * .06; cy += (ty - cy) * .06; stage.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${cy.toFixed(2)}deg)`; requestAnimationFrame(loop); };
      loop();
    }
  }

  /* ---------- HUD on a table ---------- */
  const hud = $('#rg-hud');
  if (hud) {
    const P = {
      top: { x: 506, y: 92, name: 'SharkBait77', tag: 'tag', stack: 412, box: [584, 58], s: { h: 1240, v: 274, p: 226, tb: [30, 372], af: [192, 69] } },
      tl: { x: 205, y: 150, name: 'Mo_Money', tag: 'fish', stack: 188.5, box: [118, 202], s: { h: 412, v: 239, p: 41, tb: [3, 160], af: [40, 52] } },
      tr: { x: 807, y: 150, name: 'QuietGiant', tag: 'nit', stack: 260, box: [700, 202], s: { h: 890, v: 125, p: 98, tb: [14, 310], af: [101, 58] } },
      bl: { x: 205, y: 515, name: 'NeonNights', tag: 'lag', stack: 534, box: [118, 395], s: { h: 760, v: 266, p: 205, tb: [52, 241], af: [215, 52] } },
      br: { x: 807, y: 515, name: 'AceVentura', tag: 'reg', stack: 301, box: [700, 395], s: { h: 2105, v: 463, p: 379, tb: [61, 702], af: [356, 121] } },
      hero: { x: 506, y: 588, name: 'Hero', stack: 400, hero: true },
    };
    const tagName = { tag: 'TAG', fish: 'FISH', nit: 'NIT', lag: 'LAG', reg: 'REG' };
    let html = '<div class="hs-tag">NLHE $1/$2 · <b>Desert Aces</b> · 6-max</div><div class="hs-board"></div><div class="hs-pot">Pot $3.00</div><div class="hs-dealer" style="left:860px;top:232px">D</div>';
    for (const [k, p] of Object.entries(P)) {
      html += `<div class="hs-seat" data-s="${k}" style="left:${p.x}px;top:${p.y}px">${p.hero ? '<div class="hs-hole" data-k="hole"></div>' : ''}<div class="hs-plate"><div class="n">${p.name}</div><div class="st">$${p.stack.toFixed(2)}</div><div class="hs-act"></div></div></div>`;
      if (!p.hero) html += `<div class="hb" data-b="${k}" style="left:${p.box[0]}px;top:${p.box[1]}px"></div>`;
    }
    hud.innerHTML = html;
    const pct = (a, b) => (b ? (a / b) * 100 : 0);
    const col = (stat, v) => {
      if (stat === 'v') return v >= 40 ? 'fish' : v >= 28 ? 'o' : v >= 15 ? 'g' : 'r';
      if (stat === 'p') return v >= 26 ? 'o' : v >= 14 ? 'g' : v >= 8 ? 'o' : 'r';
      if (stat === 'tb') return v >= 10 ? 'o' : v >= 4 ? 'g' : 'r';
      return v >= 3.5 ? 'o' : v >= 1.5 ? 'g' : 'r';
    };
    const renderBox = (k, bump) => {
      const p = P[k], s = p.s, b = hud.querySelector(`[data-b="${k}"]`);
      const v = pct(s.v, s.h), pf = pct(s.p, s.h), tb = pct(s.tb[0], s.tb[1]), af = s.af[0] / s.af[1];
      const t = (stat, val, lab, n, d = 0) => `<div class="hb-t ${col(stat, val)}${bump === stat ? ' bump' : ''}"><b>${val.toFixed(d)}</b><i>${lab}</i><u>${n}</u></div>`;
      b.innerHTML = `<div class="hb-name"><span class="hb-tag ${p.tag}">${tagName[p.tag]}</span>${p.name}<small>· ${s.h.toLocaleString('en-US')}h</small></div>
        <div class="hb-tiles">${t('v', v, 'VPIP', `${s.v}/${s.h}`)}${t('p', pf, 'PFR', `${s.p}/${s.h}`)}${t('tb', tb, '3B', `${s.tb[0]}/${s.tb[1]}`)}${t('af', af, 'AF', `${s.af[0]}/${s.af[1]}`, 1)}</div>`;
    };
    Object.keys(P).forEach((k) => { if (!P[k].hero) renderBox(k); });
    const seat = (k) => hud.querySelector(`[data-s="${k}"]`);
    const board = $('.hs-board', hud), pot = $('.hs-pot', hud), hole = hud.querySelector('[data-k="hole"]');
    let potV = 3, dk = deck();
    const say = (k, text, amt = 0, kind = '') => {
      hud.querySelectorAll('.hs-seat.act').forEach((e) => e.classList.remove('act'));
      const s = seat(k); s.classList.add('act');
      const a = s.querySelector('.hs-act'); a.textContent = text; a.className = `hs-act on ${kind}`;
      if (kind === 'fold') s.classList.add('folded');
      if (amt) { P[k].stack -= amt; potV += amt; s.querySelector('.st').textContent = `$${P[k].stack.toFixed(2)}`; pot.textContent = `Pot $${potV.toFixed(2)}`; }
    };
    const deal = (n) => { for (let i = 0; i < n; i++) board.insertAdjacentHTML('beforeend', cardHtml(dk.pop())); };
    const reset = () => {
      dk = deck(); potV = 3; pot.textContent = 'Pot $3.00'; pot.style.color = ''; board.innerHTML = '<span class="hs-slot"></span><span class="hs-slot"></span><span class="hs-slot"></span><span class="hs-slot"></span><span class="hs-slot"></span>';
      hud.querySelectorAll('.hs-seat').forEach((s) => { s.classList.remove('act', 'folded'); s.querySelector('.hs-act').className = 'hs-act'; });
      const strong = [[['A', 's'], ['K', 's']], [['Q', 'h'], ['Q', 'd']], [['A', 'd'], ['Q', 'd']], [['J', 'c'], ['J', 's']], [['A', 'h'], ['J', 'h']]];
      const hc = pick(strong); dk = dk.filter((c) => !hc.some((h) => h[0] === c[0] && h[1] === c[1]));
      hole.innerHTML = hc.map((c) => cardHtml(c)).join('');
      ['top', 'tl', 'tr', 'bl', 'br'].forEach((k) => { const s = seat(k); s.querySelector('.hs-hole')?.remove(); s.insertAdjacentHTML('afterbegin', '<div class="hs-hole"><span class="rg-card back"></span><span class="rg-card back"></span></div>'); });
      board.innerHTML = '';
    };
    const clearActs = () => hud.querySelectorAll('.hs-act').forEach((a) => { if (!a.classList.contains('fold')) a.classList.remove('on'); });
    const fold = (k) => { say(k, 'Fold', 0, 'fold'); seat(k).querySelector('.hs-hole')?.remove(); };
    const SCRIPT = [
      () => say('tl', 'Call $2', 2), () => fold('tr'), () => say('top', 'Raise $8', 8), () => fold('bl'), () => fold('br'),
      () => say('hero', 'Call $8', 8), () => say('tl', 'Call $6', 6),
      () => { clearActs(); deal(3); }, () => say('tl', 'Check', 0, 'chk'), () => say('top', 'Bet $14', 14), () => say('hero', 'Raise $42', 42), () => fold('tl'), () => say('top', 'Call $28', 28),
      () => { clearActs(); deal(1); }, () => say('top', 'Check', 0, 'chk'), () => say('hero', 'Bet $70', 70), () => fold('top'),
      () => {
        P.hero.stack += potV; seat('hero').querySelector('.st').textContent = `$${P.hero.stack.toFixed(2)}`;
        pot.textContent = `You win $${potV.toFixed(2)}`; pot.style.color = '#3ddc84';
        // one more hand on every player: their boxes update
        const upd = { top: { v: 1, p: 1, bump: 'v' }, tl: { v: 1, p: 0, bump: 'v' }, tr: { v: 0, p: 0, bump: 'v' }, bl: { v: 0, p: 0, bump: 'p' }, br: { v: 0, p: 0, bump: 'p' } };
        for (const [k, u] of Object.entries(upd)) { const s = P[k].s; s.h += 1; s.v += u.v; s.p += u.p; renderBox(k, u.bump); }
        P.top.s.af[0] += 1;
      },
      () => { if (P.hero.stack > 900) P.hero.stack = 400; reset(); },
    ];
    reset();
    let i = 0;
    const run = () => { SCRIPT[i](); i = (i + 1) % SCRIPT.length; };
    if (!reduce) {
      let timer = null;
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && !timer) timer = setInterval(run, 1150);
        else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
      })).observe(hud);
    }
  }

  /* ---------- the results card, drawn as it scrolls into view ---------- */
  const gc = $('#rg-graph');
  if (gc) {
    gc.innerHTML = `<div class="rg-panel rg-results">
      <div class="rg-rhead"><span class="rg-cap" style="color:var(--ink)">Results</span><span class="rg-tabs"><i>Last session</i><i class="on">Period</i></span><span class="rg-tabs"><i class="on">Hands</i><i>Date</i><i>Sessions</i><i>Monthly</i></span><span class="rg-tabs" style="margin-left:auto"><i>☰ Lines</i></span></div>
      <div class="rg-chart" style="margin-top:14px"></div>
      <div class="rg-foot"><span>Hands won<b>31.4%</b></span><span>Sessions<b>21</b></span><span>VPIP / PFR<b>24.1 / 19.6</b></span><span>W$WSF<b>49.8%</b></span><span>Rake<b>$286.40</b></span></div></div>`;
    const draw = chart($('.rg-chart', gc));
    let s = winningRun(140, 1500).map((v) => v / 2), ev = s.map((v, i) => v * .92 + i * .2);
    let shown = false;
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !shown) {
        shown = true; draw(s, ev, !reduce);
        if (!reduce) setTimeout(() => setInterval(() => { let d = swing() / 2; if (s[s.length - 1] + d < 500) d = Math.abs(d); s.push(s[s.length - 1] + d); ev.push(ev[ev.length - 1] + d * rnd(.7, 1.1)); s.shift(); ev.shift(); draw(s, ev); }, 1600), 3200);
      }
    }), { threshold: .35 }).observe(gc);
    draw(s, ev);
  }

  /* ---------- the club bankroll page ---------- */
  const bk = $('#rg-bank');
  if (bk) {
    bk.innerHTML = `
      <div class="bk-top"><h4>Bankroll</h4><span class="tab on">Overview</span><span class="tab">Clubs</span><span class="tab">Compare</span></div>
      <div class="bk-clubs"><i>All clubs</i><i class="on">Desert Aces</i><i>Neon Ninety</i><i>Club 21</i></div>
      <div class="bk-grid">
        <div class="rg-panel bk-card"><div class="bk-h"><span class="bk-num">1</span><span class="rg-cap">Club balance</span></div>
          <div class="bk-row"><span class="mut">Starting balance</span><b>$500.00</b></div>
          <div class="bk-row"><span class="mut">Tracked results<small>3,410 hands, after rake</small></span><b class="up">+$1,184.20</b></div>
          <div class="bk-row"><span class="mut">Money moved<small>1 cash-out</small></span><b>−$400.00</b></div>
          <div class="bk-row total"><span>= Expected now</span><b class="up">$1,284.20</b></div>
          <div class="bk-match"><span class="ok">✓</span><span>Club shows <b>1,284.20 chips</b> · matches</span></div></div>
        <div class="rg-panel bk-card"><div class="bk-h"><span class="bk-num">2</span><span class="rg-cap">Tracked results</span><span class="mut3" style="margin-left:auto;font-size:10.5px">this month</span></div>
          <div class="bk-row"><span class="mut">Won<small>after rake</small></span><b class="up">+$1,184.20</b></div>
          <div class="bk-row"><span class="mut">Rake paid</span><b>$318.40</b></div>
          <div class="bk-row"><span class="mut">Rakeback earned<small>30% deal</small></span><b class="up">+$95.52</b></div>
          <div class="bk-row"><span class="mut">Chip value</span><b>1 chip = $1.00</b></div>
          <div class="bk-row total"><span>Total</span><b class="up">+$1,279.72</b></div></div>
      </div>
      <div class="rg-panel bk-stmt"><div class="bk-h"><span class="rg-cap">Agent statements</span></div>
        <div class="bk-srow h"><span>Week</span><span>Agent says</span><span>Your hands</span><span>Rakeback</span><span></span></div>
        <div class="bk-srow"><span>Week 47 · Nov 17–23</span><b class="up">+$612.40</b><b class="up">+$612.40</b><span>+$44.10</span><span class="bk-ok">✓ Matches</span></div>
        <div class="bk-srow"><span>Week 46 · Nov 10–16</span><b class="up">+$318.00</b><b class="up">+$341.50</b><span>+$29.80</span><span class="bk-warn">$23.50 short</span></div>
      </div>`;
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setTimeout(() => $('.bk-match', bk).classList.add('in'), 500); }), { threshold: .4 }).observe(bk);
  }
  /* ---------- the staking page ---------- */
  const sk = $('#rg-stake');
  if (sk) {
    sk.innerHTML = `
      <div class="sk-deal"><h4>BigStack Mike <span>· you get 50% · makeup on · since Nov 1</span></h4><div class="sk-btn"><i>Settle</i><i>Report (HTML)</i><i>Report (PNG)</i></div></div>
      <div class="sk-kpis">
        <div class="rg-panel sk-kpi"><div class="rg-cap">Net result</div><div class="v up" data-k="net">+$2,140.50</div><div class="s">6,820 hands · 31 sessions</div></div>
        <div class="rg-panel sk-kpi"><div class="rg-cap">Win rate</div><div class="v up">+15.7<small>bb/100</small></div><div class="s">$38.20 / hour</div></div>
        <div class="rg-panel sk-kpi"><div class="rg-cap">Makeup</div><div class="v">$0.00</div><div class="s">Cleared Nov 16</div></div>
        <div class="rg-panel sk-kpi"><div class="rg-cap">If settled now</div><div class="v up split" data-k="split">$620.25 / $620.25</div><div class="s">You / backer</div></div>
      </div>
      <div class="rg-panel sk-chart"><span class="rg-cap" style="color:var(--ink)">Running total</span><div class="rg-chart"></div></div>
      <div class="rg-panel sk-set">
        <div class="sk-row h"><span>Date</span><span>Type</span><span>Who paid</span><span>Amount</span><span>Effect</span></div>
        <div class="sk-row"><span>Nov 16</span><span>Settlement</span><span>You → backer</span><b>$450.00</b><span class="mut">Profit split, makeup reset</span></div>
      </div>`;
    const draw = chart($('.rg-chart', sk), { unit: '$' });
    const run = winningRun(90, 1900, 2500);
    const net = run[run.length - 1], half = Math.max(0, net - 900) / 2;
    sk.querySelector('[data-k="net"]').textContent = money(net);
    sk.querySelector('[data-k="split"]').textContent = `${money(half, false)} / ${money(half, false)}`;
    let shown = false;
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !shown) { shown = true; draw(run, null, !reduce); } }), { threshold: .35 }).observe(sk);
    draw(run);
  }
  fitAll();
})();
