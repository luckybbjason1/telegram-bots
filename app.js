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
