/* =========================================================
   QUANTA — script.js
   ========================================================= */

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------------------------------------------------
   NAV: scroll state + mobile toggle
   --------------------------------------------------------- */
const nav = document.getElementById('nav');
const navLinks = document.getElementById('navLinks');
const navToggle = document.getElementById('navToggle');

window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 20);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('is-open'));
});

/* ---------------------------------------------------------
   Cursor glow (desktop only, follows pointer)
   --------------------------------------------------------- */
const glow = document.getElementById('cursorGlow');
let glowActive = window.matchMedia('(hover: hover)').matches;
if (glowActive) {
  window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });
} else if (glow) {
  glow.style.display = 'none';
}

/* ---------------------------------------------------------
   Scroll reveal
   --------------------------------------------------------- */
const revealEls = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = Array.from(el.parentElement.querySelectorAll('[data-reveal]')).indexOf(el) * 90;
      setTimeout(() => el.classList.add('is-visible'), delay);
      revealObserver.unobserve(el);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

/* ---------------------------------------------------------
   Service cards: spectral hue derived from data-wave (nm)
   Maps roughly 450-700nm to a hue value for a true
   "emission spectrum" feel rather than a flat accent color.
   --------------------------------------------------------- */
function wavelengthToHue(nm) {
  // rough visible-spectrum mapping: 450nm (blue/violet) -> ~250deg
  // 700nm (red) -> ~0deg. Approximate perceptual curve.
  const clamped = Math.max(450, Math.min(700, nm));
  const t = (clamped - 450) / (700 - 450); // 0..1
  return Math.round(250 - t * 250);
}
document.querySelectorAll('.service-card').forEach(card => {
  const nm = parseFloat(card.dataset.wave);
  card.style.setProperty('--card-hue', wavelengthToHue(nm));
});

/* ---------------------------------------------------------
   Reveal for process/work cards using same observer pattern
   already handled by [data-reveal] above.
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   HERO CANVAS
   A particle jumps between discrete "energy level" rings.
   Each jump emits a burst of photon particles in the color
   of that level — a literal rendering of "quanta" as the
   discrete unit powering the whole visual identity.
   --------------------------------------------------------- */
(function heroCanvas() {
  const canvas = document.getElementById('quantaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let particles = [];
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const levels = [0.16, 0.27, 0.40, 0.55]; // radius as fraction of min(w,h)
  const colors = ['#7C8CF8', '#4CC9F0', '#4DFFC4', '#FFB454'];

  let currentLevel = 1;
  let electronAngle = 0;
  let jumpTimer = 0;
  let jumpEvery = 160; // frames between jumps
  let bursts = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function center() {
    return { x: w * 0.5, y: h * 0.46 };
  }

  function drawRings() {
    const c = center();
    const base = Math.min(w, h);
    ctx.save();
    levels.forEach((lvl, i) => {
      const r = lvl * base;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === currentLevel ? colors[i] : 'rgba(232,234,237,0.08)';
      ctx.lineWidth = i === currentLevel ? 1.4 : 1;
      ctx.globalAlpha = i === currentLevel ? 0.55 : 1;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawNucleus() {
    const c = center();
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 26);
    grad.addColorStop(0, 'rgba(232,234,237,0.9)');
    grad.addColorStop(1, 'rgba(232,234,237,0)');
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(c.x, c.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawElectron() {
    const c = center();
    const base = Math.min(w, h);
    const r = levels[currentLevel] * base;
    const x = c.x + Math.cos(electronAngle) * r;
    const y = c.y + Math.sin(electronAngle) * r * 0.55; // elliptical orbit
    const color = colors[currentLevel];

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    return { x, y, color };
  }

  function spawnBurst(x, y, color) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 0.6 + Math.random() * 1.6;
      bursts.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
  }

  function updateBursts() {
    bursts.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 0.018;
    });
    bursts = bursts.filter(p => p.life > 0);
  }

  function drawBursts() {
    bursts.forEach(p => {
      ctx.beginPath();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    drawRings();
    drawNucleus();
    const e = drawElectron();
    updateBursts();
    drawBursts();

    if (!reduceMotion) {
      electronAngle += 0.012;
      jumpTimer++;
      if (jumpTimer > jumpEvery) {
        jumpTimer = 0;
        jumpEvery = 130 + Math.random() * 120;
        spawnBurst(e.x, e.y, e.color);
        let next = currentLevel;
        while (next === currentLevel) next = Math.floor(Math.random() * levels.length);
        currentLevel = next;
      }
      requestAnimationFrame(tick);
    }
  }

  if (reduceMotion) {
    drawRings();
    drawNucleus();
    drawElectron();
  } else {
    tick();
  }
})();

/* ---------------------------------------------------------
   CONTACT CANVAS
   A quiet field of drifting points — ambient, not busy.
   --------------------------------------------------------- */
(function contactCanvas() {
  const canvas = document.getElementById('contactCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let dots = [];
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((w * h) / 22000);
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.4,
      vy: 0.05 + Math.random() * 0.12,
      hue: [ '#4CC9F0', '#FFB454', '#7C8CF8' ][Math.floor(Math.random() * 3)],
      a: 0.15 + Math.random() * 0.35
    }));
  }
  window.addEventListener('resize', resize);
  resize();

  function tick() {
    ctx.clearRect(0, 0, w, h);
    dots.forEach(d => {
      ctx.beginPath();
      ctx.globalAlpha = d.a;
      ctx.fillStyle = d.hue;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!reduceMotion) {
        d.y -= d.vy;
        if (d.y < -4) d.y = h + 4;
      }
    });
    if (!reduceMotion) requestAnimationFrame(tick);
  }
  tick();
})();

/* ---------------------------------------------------------
   CONTACT FORM (front-end only — wire to your backend
   or a form service like Formspree / a serverless function)
   --------------------------------------------------------- */
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formStatus.textContent = 'Sending…';

  // TODO: replace with a real submit — e.g. fetch() to your API,
  // or an action endpoint from a form service.
  setTimeout(() => {
    formStatus.textContent = "Message received — we'll reply within one business day.";
    contactForm.reset();
  }, 700);
});
