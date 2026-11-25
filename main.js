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
  // Video only. The still image appears ONLY if no clip can play on this computer.
  // Each clip ends on its own first frame, so a clip looping on itself never jumps; we only
  // cross-fade to the next angle once that clip is fully loaded, laying it on top of the playing one.
  const vids = [...document.querySelectorAll('.hero-video')];
  const poster = document.querySelector('.hero-poster');
  const FADE = 1.4;
  const showPoster = () => poster && poster.classList.add('show');
  if (reduce || !vids.length || navigator.connection?.saveData) {
    showPoster();
  } else {
    let cur = null, z = 1, handed = false;
    const ok = (v) => v.isConnected && !v.error && v.readyState >= 3;
    const show = (v) => {
      v.style.zIndex = String(++z);
      try { v.currentTime = 0; } catch { /* ignore */ }
      const p = v.play(); if (p && p.catch) p.catch(() => {});
      v.classList.add('on');
      const old = cur; cur = v; handed = false;
      if (old && old !== v) setTimeout(() => { if (cur !== old) { old.classList.remove('on'); old.pause(); } }, FADE * 1000 + 150);
    };
    vids.forEach((v) => {
      v.loop = true;            // seamless on its own; used whenever the next angle is not ready yet
      v.preload = 'auto';
      v.src = v.dataset.src;
      v.addEventListener('canplaythrough', () => { if (!cur) show(v); }, { once: true });
      v.addEventListener('timeupdate', () => {
        if (cur !== v || !v.duration) return;
        if (v.currentTime < 1) handed = false;
        if (!handed && v.currentTime > v.duration - FADE - 0.15) {
          const i = vids.indexOf(v);
          for (let k = 1; k < vids.length; k++) {
            const n = vids[(i + k) % vids.length];
            if (ok(n)) { handed = true; show(n); return; }
          }
          handed = true;        // nothing else ready: let this clip loop on itself
        }
      });
      v.addEventListener('error', () => { v.remove(); if (!vids.some(ok) && !cur) showPoster(); }, { once: true });
    });
    // still nothing playing after 6 s (blocked autoplay, old browser): fall back to the still
    setTimeout(() => { if (!cur || cur.paused) showPoster(); }, 6000);
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

  /* ---------- feature spotlight + art tilt/parallax ---------- */
  document.querySelectorAll('.feature').forEach((f) => {
    f.addEventListener('pointermove', (e) => {
      const r = f.getBoundingClientRect();
      f.style.setProperty('--mx', `${e.clientX - r.left}px`); f.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  if (!reduce) {
    const arts = [...document.querySelectorAll('.show-shot')];
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
