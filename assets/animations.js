/* ============================================================
   OptimizeTechStudio — Animations Pack
   Global scroll-driven, mouse-driven and entrance animations.
   Loaded by every page after the inline reveal observer.
   ============================================================ */
(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // ---------- Scroll-driven header + steps rail ----------
  let scrollRaf = 0;
  let railLen = 0;
  let lastY = window.scrollY;

  // Scroll progress bar
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  // Measure where the LAST step's node dot sits, so the rail ends exactly there
  // (not dangling past the final dot). Recomputed on load + resize only.
  function measureRail() {
    const steps = document.querySelector('.steps');
    if (!steps) return;
    const stepEls = steps.querySelectorAll('.step');
    if (!stepEls.length) return;
    const last = stepEls[stepEls.length - 1];
    const dotTop = parseFloat(getComputedStyle(last, '::before').top) || 56;
    // dot centre = step offset within .steps + dot top + dot radius; rail starts at 10px
    railLen = Math.max(0, last.offsetTop + dotTop + 8 - 10);
    steps.style.setProperty('--rail-end', railLen + 'px');
  }
  function updateScroll() {
    scrollRaf = 0;
    const y = window.scrollY;
    const header = document.querySelector('header.site');
    if (header) {
      header.classList.toggle('scrolled', y > 8);
      // Smart header: hide on scroll-down (past the hero), reveal on scroll-up
      const goingDown = y > lastY;
      if (y > 140 && goingDown && Math.abs(y - lastY) > 6) header.classList.add('nav-hidden');
      else if (!goingDown) header.classList.remove('nav-hidden');
      // never hide while a mobile menu is open
      if (document.body.classList.contains('nav-open')) header.classList.remove('nav-hidden');
    }

    // Scroll progress
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--sp', docH > 0 ? Math.min(1, y / docH).toFixed(4) : '0');

    // Steps rail fill — grows from the top to the last dot as the section scrolls through
    const steps = document.querySelector('.steps');
    if (steps) {
      const rect = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const visible = Math.max(0, Math.min(rect.height, vh - rect.top));
      const prog = rect.height > 0
        ? Math.max(0, Math.min(1, (visible / rect.height) * 1.1))
        : 0;
      steps.style.setProperty('--scroll-fill', (prog * railLen) + 'px');
    }
    lastY = y;
  }
  function onScroll() {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll);
  }
  function onResize() { measureRail(); onScroll(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  measureRail();
  updateScroll();

  // ---------- Animated counters in .stat-strip ----------
  const stats = document.querySelectorAll('.stat-strip .stat b');
  if (stats.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const raw = el.textContent.trim();
        // Extract leading number; preserve any suffix (+, %, k, wk, etc.)
        const m = raw.match(/^([\d.,]+)(.*)$/);
        if (!m) return;
        const targetStr = m[1].replace(/,/g, '');
        const target = parseFloat(targetStr);
        if (isNaN(target)) return;
        const suffix = m[2];
        const decimals = (targetStr.split('.')[1] || '').length;
        const duration = 1400;
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3);
        function tick(now) {
          const t = Math.min(1, (now - start) / duration);
          const v = target * ease(t);
          el.textContent = v.toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = raw; // restore exact original string
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    stats.forEach(s => io.observe(s));
  }

  // ---------- Hero card mouse parallax ----------
  document.querySelectorAll('.hero-card').forEach(card => {
    const parent = card.closest('.hero-grid') || card.parentElement;
    if (!parent) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    parent.addEventListener('mousemove', (e) => {
      const r = parent.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 14;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    parent.addEventListener('mouseleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    function applyTilt() {
      raf = 0;
      const dx = (tx - cx) * 0.12;
      const dy = (ty - cy) * 0.12;
      cx += dx; cy += dy;
      card.style.transform = `perspective(1200px) rotateY(${cx.toFixed(2)}deg) rotateX(${(-cy).toFixed(2)}deg) translateZ(0)`;
      if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
        raf = requestAnimationFrame(applyTilt);
      }
    }
  });

  // ---------- Stack cards: stagger + drift per card ----------
  document.querySelectorAll('.hero-card .stack-card').forEach((card, i) => {
    card.style.animation = `stackFloat 5s ease-in-out ${i * 0.4}s infinite alternate`;
  });
  // inject keyframes once
  if (!document.getElementById('__sr_kf')) {
    const st = document.createElement('style');
    st.id = '__sr_kf';
    st.textContent = `@keyframes stackFloat { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }`;
    document.head.appendChild(st);
  }

  // ---------- Magnetic buttons (primary CTAs) ----------
  document.querySelectorAll('.cta-btn').forEach(btn => {
    let raf = 0;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
      const dy = ((e.clientY - r.top) / r.height - 0.5) * 8;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          btn.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
          raf = 0;
        });
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // ---------- Cursor spotlight on dark sections ----------
  document.querySelectorAll('section.s.dark, .mid-cta-inner, .price-card.featured').forEach(el => {
    el.classList.add('with-spotlight');
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      el.style.setProperty('--spot', '1');
    });
    el.addEventListener('mouseleave', () => el.style.setProperty('--spot', '0'));
  });

  // ---------- Logo strip: convert to marquee ----------
  document.querySelectorAll('.logo-strip').forEach(strip => {
    if (strip.dataset.marquee === '1') return;
    strip.dataset.marquee = '1';
    const cells = Array.from(strip.querySelectorAll('.logo-cell'));
    if (!cells.length) return;
    const track = document.createElement('div');
    track.className = 'logo-strip-track';
    cells.forEach(c => {
      c.style.border = 'none';
      c.style.borderRight = '1px solid var(--line)';
      track.appendChild(c);
    });
    // duplicate for seamless loop
    cells.forEach(c => track.appendChild(c.cloneNode(true)));
    strip.innerHTML = '';
    strip.appendChild(track);
    // restore borders styling (already set via class)
  });

  // ---------- Step nodes: activate as they scroll into center ----------
  const steps = document.querySelectorAll('.step');
  if (steps.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        en.target.classList.toggle('active', en.isIntersecting && en.intersectionRatio > 0.4);
      });
    }, { threshold: [0, 0.4, 1] });
    steps.forEach(s => io.observe(s));
  }

  // ---------- Floating shapes injection on dark sections (one per section) ----------
  document.querySelectorAll('section.s.dark').forEach(sec => {
    if (sec.querySelector('.dark-shapes')) return;
    const shapes = document.createElement('div');
    shapes.className = 'dark-shapes';
    for (let i = 0; i < 5; i++) shapes.appendChild(document.createElement('span'));
    sec.prepend(shapes);
  });

  // ---------- Hero parallax for backgrounds ----------
  let parallaxRaf = 0;
  function parallax() {
    parallaxRaf = 0;
    const y = window.scrollY;
    document.querySelectorAll('.hero, .page-hero').forEach(h => {
      h.style.setProperty('--py', (y * 0.15).toFixed(1) + 'px');
    });
  }
  window.addEventListener('scroll', () => {
    if (!parallaxRaf) parallaxRaf = requestAnimationFrame(parallax);
  }, { passive: true });

  // Apply translate via CSS variable to the hero ::after grid
  if (!document.getElementById('__sr_parallax_style')) {
    const st = document.createElement('style');
    st.id = '__sr_parallax_style';
    st.textContent = `
      .hero::after, .page-hero::after { transform: translateY(var(--py, 0)); }
      .hero::before, .page-hero::before { transform: translateY(calc(var(--py, 0) * 0.5)); }
    `;
    document.head.appendChild(st);
  }

  // ---------- Cinematic hero headline: split into words and rise ----------
  (function () {
    const h1 = document.querySelector('.hero h1');
    if (!h1 || h1.classList.contains('split')) return;
    const frag = document.createDocumentFragment();
    let idx = 0;
    const delays = [];
    Array.from(h1.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        // text node: wrap each word
        node.textContent.split(/(\s+)/).forEach(tok => {
          if (tok.trim() === '') { frag.appendChild(document.createTextNode(tok)); return; }
          const w = document.createElement('span');
          w.className = 'word';
          w.textContent = tok;
          w.style.setProperty('--wd', (0.12 + idx * 0.075).toFixed(3) + 's');
          idx++;
          frag.appendChild(w);
        });
      } else if (node.nodeType === 1) {
        // element (e.g. .accent-word): split ITS words too, keep its classes
        // so each word flows naturally yet keeps the gradient styling.
        const cls = node.getAttribute('class') || '';
        node.textContent.split(/(\s+)/).forEach(tok => {
          if (tok === '') return;
          if (tok.trim() === '') { frag.appendChild(document.createTextNode(tok)); return; }
          const w = document.createElement('span');
          w.className = ('word ' + cls).trim();
          w.textContent = tok;
          w.style.setProperty('--wd', (0.12 + idx * 0.075).toFixed(3) + 's');
          idx++;
          frag.appendChild(w);
        });
      }
    });
    h1.innerHTML = '';
    h1.appendChild(frag);
    h1.classList.add('split');
    requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('words-in')));
  })();

  // ---------- Cursor-follow spotlight on light cards ----------
  document.querySelectorAll('.who-card, .q-card').forEach(card => {
    if (card.closest('section.s.dark')) return;
    if (card.querySelector(':scope > .card-spot')) return;
    const spot = document.createElement('span');
    spot.className = 'card-spot';
    spot.setAttribute('aria-hidden', 'true');
    card.insertBefore(spot, card.firstChild);
    let raf = 0, mx = 50, my = 50;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        spot.style.setProperty('--cx', mx.toFixed(1) + '%');
        spot.style.setProperty('--cy', my.toFixed(1) + '%');
      });
    });
  });

  // ---------- CTA buttons: sheen sweep element ----------
  document.querySelectorAll('.cta-btn').forEach(btn => {
    if (btn.querySelector(':scope > .btn-sheen')) return;
    const sheen = document.createElement('span');
    sheen.className = 'btn-sheen';
    sheen.setAttribute('aria-hidden', 'true');
    btn.appendChild(sheen);
  });

  // ---------- Add reveal class to common elements not pre-tagged ----------
  document.querySelectorAll('.step, .industry, .why-row, .price-card').forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });
  // Re-run reveal observer
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }
})();
