(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- hero video: clips cross-fade into each other, so there is never a hard cut ---------- */
  let vids = [...document.querySelectorAll('.hero-video')];
  const FADE = 1.4;
  if (!reduce && vids.length && !navigator.connection?.saveData) {
    let cur = -1;
    const playNext = () => {
      if (!vids.length) return;
      const next = (cur + 1) % vids.length;
      const v = vids[next];
      try { v.currentTime = 0; } catch { /* not loaded yet */ }
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
      v.classList.add('on');
      if (cur >= 0 && cur !== next) { const old = vids[cur]; setTimeout(() => { old.classList.remove('on'); old.pause(); }, FADE * 1000); }
      cur = next;
    };
    vids.forEach((v, i) => {
      v.src = v.dataset.src;
      v.preload = 'auto';
      // start with whichever clip is ready first; the others join the rotation when their turn comes
      v.addEventListener('canplaythrough', () => { if (cur < 0) { cur = vids.indexOf(v) - 1; playNext(); } }, { once: true });
      v.addEventListener('timeupdate', () => {
        if (vids[cur] === v && v.duration && v.currentTime > v.duration - FADE - 0.1 && !v.dataset.handed) {
          v.dataset.handed = '1';
          if (vids.length === 1) { v.currentTime = 0; v.dataset.handed = ''; return; }
          playNext();
          setTimeout(() => { v.dataset.handed = ''; }, FADE * 1000 + 200);
        }
      });
      v.addEventListener('error', () => { const k = vids.indexOf(v); if (k >= 0) { vids.splice(k, 1); if (cur >= k) cur--; } v.remove(); }, { once: true });
    });
  }

  /* ---------- ambient particles: suits and chips drifting upward ---------- */
  const cv = document.getElementById('bg-particles');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    const SUITS = ['♠', '♥', '♦', '♣'];
    const COLORS = ['rgba(57,211,216,', 'rgba(61,220,132,', 'rgba(255,79,184,', 'rgba(245,153,74,'];
    let W = 0, H = 0, dpr = 1, parts = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.floor(innerWidth * dpr); H = cv.height = Math.floor(innerHeight * dpr);
      const n = Math.round(Math.min(46, innerWidth / 30));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30 * dpr,
      s: (8 + Math.random() * 16) * dpr, v: (0.12 + Math.random() * 0.35) * dpr, a: 0.08 + Math.random() * 0.22,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.006, sway: Math.random() * 6.28,
      kind: Math.random() < 0.7 ? 'suit' : (Math.random() < 0.5 ? 'chip' : 'dot'),
      suit: SUITS[(Math.random() * 4) | 0], col: COLORS[(Math.random() * 4) | 0],
    });
    let last = 0;
    const tick = (t) => {
      requestAnimationFrame(tick);
      if (t - last < 30) return; last = t;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y -= p.v; p.r += p.vr; p.sway += 0.01; const x = p.x + Math.sin(p.sway) * 14 * dpr;
        if (p.y < -40 * dpr) parts[i] = spawn(false);
        ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.r);
        if (p.kind === 'suit') {
          ctx.fillStyle = p.col + p.a + ')'; ctx.font = `${p.s}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(p.suit, 0, 0);
        } else if (p.kind === 'chip') {
          ctx.strokeStyle = p.col + (p.a + 0.05) + ')'; ctx.lineWidth = 2 * dpr;
          ctx.beginPath(); ctx.arc(0, 0, p.s * 0.55, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([3 * dpr, 4 * dpr]); ctx.beginPath(); ctx.arc(0, 0, p.s * 0.36, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.fillStyle = p.col + (p.a + 0.2) + ')'; ctx.beginPath(); ctx.arc(0, 0, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    };
    addEventListener('resize', resize); resize(); requestAnimationFrame(tick);
  }

  /* ---------- the live app window ---------- */
  const fmt = (n) => (n < 0 ? '−$' : '+$') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const el = (id) => document.getElementById(id);
  const kPl = el('k-pl'), kHands = el('k-hands'), kBb = el('k-bb'), kEv = el('k-ev');
  const line = el('line-path'), fill = el('fill-path'), ev = el('ev-path'), dot = el('line-dot'), handsBox = el('hands');
  if (line) {
    const BB = 2; // $1/$2
    const MAXPTS = 60;
    let pl = 0, evv = 0, hands = 0;
    let series = [], evSeries = [];
    // a believable winning session: small pots, a few big ones, a cooler, a heater
    const seed = () => {
      pl = 0; evv = 0; hands = 0; series = [0]; evSeries = [0];
      for (let i = 0; i < 34; i++) step(true);
    };
    const swing = () => {
      const r = Math.random();
      if (r < 0.52) return -(Math.random() * 4 + 1);           // folded blinds / small loss
      if (r < 0.82) return Math.random() * 14 + 2;              // small pot won
      if (r < 0.92) return -(Math.random() * 60 + 20);          // lost a bigger pot
      return Math.random() * 120 + 40;                           // big pot won
    };
    const step = (silent) => {
      const d = swing();
      pl += d; hands += 1 + ((Math.random() * 2) | 0);
      evv += d * (0.75 + Math.random() * 0.5) + (Math.random() < 0.1 ? 8 : 0);
      series.push(pl); evSeries.push(evv);
      if (series.length > MAXPTS) { series.shift(); evSeries.shift(); }
      if (!silent) addHand(d);
    };
    const path = (arr, lo, hi) => {
      const w = 400, h = 150, pad = 14;
      const sx = w / (MAXPTS - 1);
      const sy = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
      return arr.map((v, i) => `${i ? 'L' : 'M'}${(i * sx).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
    };
    const draw = () => {
      const all = series.concat(evSeries);
      const lo = Math.min(...all) - 10, hi = Math.max(...all) + 10;
      const d = path(series, lo, hi);
      line.setAttribute('d', d);
      ev.setAttribute('d', path(evSeries, lo, hi));
      const lastX = ((series.length - 1) * 400) / (MAXPTS - 1);
      fill.setAttribute('d', `${d} L${lastX.toFixed(1)} 150 L0 150 Z`);
      const m = /([\d.]+) ([\d.-]+)$/.exec(d);
      if (m) { dot.setAttribute('cx', m[1]); dot.setAttribute('cy', m[2]); }
      setText(kPl, fmt(pl)); kPl.className = pl >= 0 ? 'up' : 'down';
      setText(kHands, hands.toLocaleString('en-US'));
      setText(kBb, ((pl / BB) / Math.max(hands, 1) * 100).toFixed(1));
      setText(kEv, (evv < 0 ? '−$' : '+$') + Math.abs(evv).toFixed(0));
    };
    const setText = (node, t) => { if (node.textContent !== t) { node.textContent = t; node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); } };
    const RANKS = 'AKQJT98765432', SU = [['♠', ''], ['♥', 'r'], ['♦', 'r'], ['♣', '']];
    const card = () => { const s = SU[(Math.random() * 4) | 0]; return `${RANKS[(Math.random() * 13) | 0]}<span class="${s[1]}">${s[0]}</span>`; };
    const ACTS = ['Raise, cbet, wins', 'Call, river value', '3-bet pot', 'All-in, called', 'Check-raise flop', 'Fold to 3-bet', 'Limped pot', 'Squeeze, takes it'];
    const addHand = (d) => {
      const row = document.createElement('div');
      row.className = 'hand';
      row.innerHTML = `<span class="cards">${card()}${card()}</span><span class="tbl">T${1 + ((Math.random() * 4) | 0)}</span><span class="act">${ACTS[(Math.random() * ACTS.length) | 0]}</span><span class="amt ${d >= 0 ? 'up' : 'down'}">${fmt(d)}</span>`;
      handsBox.prepend(row);
      while (handsBox.children.length > 5) handsBox.lastChild.remove();
    };
    seed();
    for (let i = 0; i < 4; i++) addHand(swing());
    draw();
    if (!reduce) setInterval(() => { step(false); draw(); if (series.length >= MAXPTS && Math.random() < 0.01) seed(); }, 1400);

    /* mouse parallax on top of the sway */
    const stage = document.querySelector('.stage'), app = el('app3d');
    if (stage && app && !reduce && matchMedia('(pointer: fine)').matches) {
      let tx = 0, ty = 0, cx = 0, cy = 0;
      addEventListener('mousemove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 10; ty = (e.clientY / innerHeight - 0.5) * -8; }, { passive: true });
      const loop = () => { cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06; stage.style.transform = `rotateY(${cx.toFixed(2)}deg) rotateX(${cy.toFixed(2)}deg)`; requestAnimationFrame(loop); };
      stage.style.transformStyle = 'preserve-3d';
      loop();
    }
  }

  /* ---------- feature spotlight + art tilt/parallax ---------- */
  document.querySelectorAll('.feature').forEach((f) => {
    f.addEventListener('pointermove', (e) => {
      const r = f.getBoundingClientRect();
      f.style.setProperty('--mx', `${e.clientX - r.left}px`); f.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  if (!reduce) {
    const arts = [...document.querySelectorAll('.show-art')];
    arts.forEach((a) => {
      a.addEventListener('pointermove', (e) => {
        const r = a.getBoundingClientRect();
        a.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
        a.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--ry', '0deg'); a.style.setProperty('--rx', '0deg'); });
    });
    const par = () => {
      for (const a of arts) {
        const r = a.getBoundingClientRect();
        const off = ((r.top + r.height / 2) - innerHeight / 2) / innerHeight;
        a.style.setProperty('--py', `${(off * -26).toFixed(1)}px`);
      }
    };
    addEventListener('scroll', par, { passive: true }); par();
  }
})();
