/**
 * 텔레그램봇허브 — Interactive Layer
 * Canvas Particles · Scroll Reveal · Counter Animation · 3D Card Tilt · Nav
 */

(function () {
  'use strict';

  /* ============================================================
     PARTICLE SYSTEM
     ============================================================ */
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, dpr, particles, mouse = { x: -9999, y: -9999 };

  const COLORS = ['#6C63FF', '#00D2FF', '#A8FF78', '#9B5DE5', '#00FFC8', '#FFD700'];
  const COUNT  = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 18000));

  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(Math.random() * 0.5 + 0.15);
      this.r  = Math.random() * 1.8 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    update() {
      // Subtle mouse repulsion
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const force = (100 - dist) / 100 * 0.3;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }
      // Damping
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < -10 || this.x > W + 10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
    }
  }

  function initCanvas() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
  }

  function initParticles() {
    particles = Array.from({ length: COUNT }, () => new Particle());
  }

  function drawConnections() {
    const threshold = 130;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < threshold) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(108,99,255,' + (1 - d / threshold) * 0.15 + ')';
          ctx.globalAlpha = 1;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  let rafId;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(animate);
  }

  // Hero visibility — pause when off screen
  const heroObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!rafId) rafId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
  }, { threshold: 0.01 });
  heroObserver.observe(document.getElementById('hero'));

  // Resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initCanvas();
      initParticles();
    }, 200);
  });

  // Mouse
  document.getElementById('hero').addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  document.getElementById('hero').addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  initCanvas();
  initParticles();
  rafId = requestAnimationFrame(animate);

  /* ============================================================
     SCROLL REVEAL
     ============================================================ */
  const revealEls = document.querySelectorAll(
    '.reveal-up, .reveal-left, .reveal-right, .reveal-card'
  );

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          revealObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  // Stagger reveal-card items within same parent
  document.querySelectorAll('.bots-grid, .features-grid').forEach(grid => {
    Array.from(grid.children).forEach((child, i) => {
      child.style.transitionDelay = (i * 80) + 'ms';
    });
  });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ============================================================
     COUNTER ANIMATION
     ============================================================ */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterEls = document.querySelectorAll('.stat-num[data-target]');
  const counterObserver = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          counterObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counterEls.forEach(el => counterObserver.observe(el));

  /* ============================================================
     3D CARD TILT
     ============================================================ */
  const tiltCards = document.querySelectorAll('[data-tilt]');

  function applyTilt(card, e) {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    const maxTilt = 10;
    card.style.transform = `
      perspective(800px)
      rotateY(${x * maxTilt}deg)
      rotateX(${-y * maxTilt}deg)
      scale3d(1.02,1.02,1.02)
    `;
  }

  function resetTilt(card) {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
    setTimeout(() => { card.style.transition = ''; }, 400);
  }

  tiltCards.forEach(card => {
    card.addEventListener('mousemove', e => applyTilt(card, e));
    card.addEventListener('mouseleave', () => resetTilt(card));
  });

  /* ============================================================
     SCROLL PROGRESS BAR
     ============================================================ */
  const progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
    }, { passive: true });
  }

  /* ============================================================
     BACK TO TOP BUTTON
     ============================================================ */
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ============================================================
     FAQ ACCORDION
     ============================================================ */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const answer = btn.nextElementSibling;

      // Close all others
      document.querySelectorAll('.faq-q[aria-expanded="true"]').forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const otherA = other.nextElementSibling;
          otherA.classList.remove('open');
          otherA.hidden = true;
        }
      });

      // Toggle this one
      btn.setAttribute('aria-expanded', String(!expanded));
      if (!expanded) {
        answer.hidden = false;
        requestAnimationFrame(() => answer.classList.add('open'));
      } else {
        answer.classList.remove('open');
        answer.hidden = true;
      }
    });
  });

  /* ============================================================
     NAV: SCROLL STATE + ACTIVE LINK + HAMBURGER
     ============================================================ */
  const nav        = document.getElementById('main-nav');
  const navLinks   = document.querySelectorAll('.nav-link');
  const hamburger  = document.getElementById('hamburger');
  const navMenu    = document.getElementById('nav-links');

  // Scrolled state
  function handleNavScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // Active section highlight
  const sections = document.querySelectorAll('[id]');
  const activeObserver = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => activeObserver.observe(s));

  // Hamburger
  hamburger.addEventListener('click', () => {
    const open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!open));
    navMenu.classList.toggle('open', !open);
  });

  // Close on link click (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('open');
    });
  });

  /* ============================================================
     SMOOTH ANCHOR SCROLL
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

})();

/* ============================================================
   ADS · FRIEND LINKS · STATS  (Main Site Integration Layer)
   ============================================================ */
(function () {
  'use strict';

  /* ── Stats Tracking ── */
  function trackPageVisit() {
    try {
      var stats = _getStats();
      stats.totalVisits = (stats.totalVisits || 0) + 1;
      var today = new Date().toISOString().slice(0, 10);
      stats.dailyVisits = stats.dailyVisits || {};
      stats.dailyVisits[today] = (stats.dailyVisits[today] || 0) + 1;
      // Keep only last 30 days
      var keys = Object.keys(stats.dailyVisits).sort();
      if (keys.length > 30) {
        keys.slice(0, keys.length - 30).forEach(function(k){ delete stats.dailyVisits[k]; });
      }
      _setStats(stats);
    } catch(e) {}
  }

  function trackBotClick(botId) {
    try {
      var stats = _getStats();
      stats.botClicks = stats.botClicks || {};
      stats.botClicks[botId] = (stats.botClicks[botId] || 0) + 1;
      _setStats(stats);
    } catch(e) {}
  }

  function trackAdClick(adType) {
    try {
      var stats = _getStats();
      stats.adClicks = stats.adClicks || {};
      stats.adClicks[adType] = (stats.adClicks[adType] || 0) + 1;
      _setStats(stats);
    } catch(e) {}
  }

  function _getStats() {
    try { return JSON.parse(localStorage.getItem('site_stats')) || {}; }
    catch(e) { return {}; }
  }

  function _setStats(s) {
    try { localStorage.setItem('site_stats', JSON.stringify(s)); }
    catch(e) {}
  }

  /* ── Render Ads ── */
  function renderAds() {
    var cfg;
    try { cfg = JSON.parse(localStorage.getItem('ads_config')) || {}; }
    catch(e) { return; }

    ['banner', 'sidebar', 'inline', 'footer'].forEach(function(type) {
      var slot = document.getElementById('ad-' + type);
      var ad = cfg[type];
      if (!slot || !ad || !ad.enabled) return;

      slot.style.display = '';

      // Set text content (do not use innerHTML for security)
      var textEl = slot.querySelector('.ad-text');
      if (textEl && ad.content) textEl.textContent = ad.content;

      // Set link
      var linkEl = slot.querySelector('.ad-link');
      if (linkEl && ad.link) {
        linkEl.href = ad.link;
        linkEl.addEventListener('click', function() { trackAdClick(type); });
      }

      // Set image
      if (ad.imageUrl) {
        var imgEl = slot.querySelector('.ad-img');
        if (imgEl) {
          imgEl.src = ad.imageUrl;
          imgEl.alt = ad.title || '';
          imgEl.style.display = '';
        }
      }
    });
  }

  /* ── Render Friend Links ── */
  function renderLinks() {
    var links;
    try { links = JSON.parse(localStorage.getItem('friend_links')) || []; }
    catch(e) { links = []; }

    var approved = links.filter(function(l) { return l.status === 'approved'; });
    var grid = document.getElementById('friend-links-grid');
    var emptyMsg = document.getElementById('friend-links-empty');
    var section = document.getElementById('friend-links');

    if (!grid) return;

    // Hide entire section if no approved links
    if (approved.length === 0) {
      if (grid) grid.textContent = '';
      if (emptyMsg) emptyMsg.style.display = '';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    grid.textContent = '';
    approved.forEach(function(link) {
      var a = document.createElement('a');
      a.href       = link.siteUrl;
      a.target     = '_blank';
      a.rel        = 'noopener';
      a.className  = 'fl-card';

      // Logo or placeholder
      if (link.logoUrl) {
        var img = document.createElement('img');
        img.src       = link.logoUrl;
        img.alt       = link.siteName;
        img.className = 'fl-card-logo';
        img.onerror   = function() {
          this.style.display = 'none';
          a.insertBefore(_makePlaceholder(link.siteName), a.firstChild);
        };
        a.appendChild(img);
      } else {
        a.appendChild(_makePlaceholder(link.siteName));
      }

      var nameEl = document.createElement('span');
      nameEl.className = 'fl-card-name';
      nameEl.textContent = link.siteName;
      a.appendChild(nameEl);

      if (link.siteDesc) {
        var descEl = document.createElement('span');
        descEl.className = 'fl-card-desc';
        descEl.textContent = link.siteDesc;
        a.appendChild(descEl);
      }

      grid.appendChild(a);
    });
  }

  function _makePlaceholder(name) {
    var el = document.createElement('div');
    el.className = 'fl-card-logo-placeholder';
    el.textContent = (name || '?').charAt(0).toUpperCase();
    return el;
  }

  /* ── Apply Friend Link Modal ── */
  function initApplyForm() {
    var overlay = document.getElementById('modal-apply-link');
    var form    = document.getElementById('form-apply-link');
    var success = document.getElementById('apply-success');
    if (!overlay || !form) return;

    function openModal() {
      form.style.display = '';
      if (success) success.style.display = 'none';
      overlay.style.display = 'flex';
      requestAnimationFrame(function() { overlay.classList.add('open'); });
    }

    function closeModal() {
      overlay.classList.remove('open');
      setTimeout(function() { overlay.style.display = 'none'; form.reset(); }, 220);
    }

    // Open buttons
    var btnApply = document.getElementById('btn-apply-link');
    var btnApplyEmpty = document.getElementById('btn-apply-link-empty');
    if (btnApply)      btnApply.addEventListener('click', openModal);
    if (btnApplyEmpty) btnApplyEmpty.addEventListener('click', openModal);

    // Close
    var closeBtn = document.getElementById('fl-modal-close');
    var cancelBtn = document.getElementById('fl-cancel');
    var successClose = document.getElementById('fl-success-close');
    if (closeBtn)    closeBtn.addEventListener('click', closeModal);
    if (cancelBtn)   cancelBtn.addEventListener('click', closeModal);
    if (successClose) successClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    // Submit
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var siteName = document.getElementById('apply-sitename').value.trim();
      var siteUrl  = document.getElementById('apply-url').value.trim();
      if (!siteName || !siteUrl) return;

      var links;
      try { links = JSON.parse(localStorage.getItem('friend_links')) || []; }
      catch(err) { links = []; }

      var id = Math.random().toString(36).slice(2,10) + Date.now().toString(36);
      links.push({
        id:           id,
        siteName:     siteName,
        siteUrl:      siteUrl,
        siteDesc:     document.getElementById('apply-desc').value.trim(),
        logoUrl:      document.getElementById('apply-logo').value.trim(),
        contactEmail: document.getElementById('apply-email').value.trim(),
        status:       'pending',
        submittedAt:  new Date().toISOString(),
        reviewedAt:   null,
      });

      try { localStorage.setItem('friend_links', JSON.stringify(links)); } catch(err) {}

      // Show success
      form.style.display = 'none';
      if (success) success.style.display = '';
    });
  }

  /* ── Bind Bot Click Tracking ── */
  function bindBotTracking() {
    var botMap = {
      dremshop: 'bot-dremshop',
      lotto:    'bot-lotto',
      kard:     'bot-kard',
      usdt:     'bot-usdt',
      emoji:    'bot-emoji',
      poker:    'bot-poker',
      chain:    'bot-chain',
      usdtbank: 'bot-usdtbank',
    };
    Object.entries(botMap).forEach(function(entry) {
      var sectionId = entry[0];
      var trackKey  = entry[1];
      var section   = document.getElementById(sectionId);
      if (!section) return;
      var links = section.querySelectorAll('a[href*="t.me"]');
      links.forEach(function(a) {
        a.addEventListener('click', function() { trackBotClick(trackKey); });
      });
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function() {
    trackPageVisit();
    renderAds();
    renderLinks();
    initApplyForm();
    bindBotTracking();
  });

})();
