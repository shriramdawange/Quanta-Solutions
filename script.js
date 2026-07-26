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
   Scroll reveal (base functionality, extended with 3D tilt)
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
   Service card 3D tilt + cursor-tracking glow
   On hover, tilt the card toward cursor position and move
   the glow center to follow cursor (desktop, hover-capable,
   no reduced-motion, viewport >= 680px only).
   --------------------------------------------------------- */
const canTilt3D = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
const isLargeScreen = window.innerWidth >= 680;

if (canTilt3D && isLargeScreen) {
  document.querySelectorAll('.service-card').forEach(card => {
    let glowEl = card.querySelector('.service-card__glow');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Calculate tilt: max ~6deg each axis based on cursor distance from card center
      const maxTilt = 6;
      const rotateY = ((mouseX - cardCenterX) / (rect.width / 2)) * maxTilt;
      const rotateX = -((mouseY - cardCenterY) / (rect.height / 2)) * maxTilt;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      // Move glow center toward cursor position within the card
      const localX = mouseX - rect.left;
      const localY = mouseY - rect.top;
      const glowPctX = (localX / rect.width) * 100;
      const glowPctY = (localY / rect.height) * 100;
      glowEl.style.backgroundImage = `radial-gradient(circle at ${glowPctX}% ${glowPctY}%, hsla(var(--card-hue),90%,65%,0.16), transparent 60%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0)';
      glowEl.style.backgroundImage = `radial-gradient(circle at 30% 0%, hsla(var(--card-hue),90%,65%,0.16), transparent 60%)`;
    });
  });
}

/* ---------------------------------------------------------
   HERO CANVAS: GALAXY STARFIELD + NEBULA LAYER
   Renders behind the quantum canvas as subtle, drifting
   atmosphere. Includes stars, nebula blobs, occasional
   shooting stars, vignette. Respects prefers-reduced-motion
   and pauses when hero is out of view (IntersectionObserver).
   --------------------------------------------------------- */
(function galaxyCanvas() {
  const canvas = document.getElementById('galaxyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let stars = [];
  let nebulas = [];
  let shootingStars = [];
  let isVisible = false;
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animationFrameId = null;

  // Intersection observer to pause rendering when hero is out of view (save CPU)
  const heroSection = canvas.closest('.hero');
  const visibilityObserver = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0 });
  if (heroSection) visibilityObserver.observe(heroSection);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
    initNebulas();
  }
  window.addEventListener('resize', resize);
  resize();

  function initStars() {
    stars = [];
    const starCount = Math.floor(80 + Math.random() * 70); // 80-150 stars
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1,
        opacity: 0.15 + Math.random() * 0.45,
        vx: (Math.random() - 0.5) * 0.15, // drift speed: 0.05-0.2 px/frame
        vy: (Math.random() - 0.5) * 0.15,
      });
    }
  }

  function initNebulas() {
    // 2-3 soft nebula blobs using cyan, violet, amber at low opacity
    nebulas = [];
    const nebCount = 2 + Math.floor(Math.random() * 2);
    const colors = ['#4CC9F0', '#7C8CF8', '#FFB454'];
    for (let i = 0; i < nebCount; i++) {
      nebulas.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 120 + Math.random() * 180,
        opacity: 0.05 + Math.random() * 0.05, // max 0.08-0.12
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function drawVignette() {
    // Radial gradient vignette: darker at edges, higher contrast at center
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  function updateStars() {
    stars.forEach(s => {
      if (!reduceMotion) {
        s.x += s.vx;
        s.y += s.vy;
        // wrap around edges for seamless drift
        if (s.x < -2) s.x = w + 2;
        if (s.x > w + 2) s.x = -2;
        if (s.y < -2) s.y = h + 2;
        if (s.y > h + 2) s.y = -2;
      }
    });
  }

  function drawStars() {
    stars.forEach(s => {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(232,234,237,' + s.opacity + ')';
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawNebulas() {
    nebulas.forEach(n => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.color.replace(')', ', ' + n.opacity + ')').replace('#', 'rgba('));
      // Convert hex to rgba for nebula color
      const hex = n.color;
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      grad.addColorStop(0, `rgba(${r},${g},${b},${n.opacity})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  let shootingStarTimer = 0;
  let nextShootingStarIn = 15 + Math.random() * 10; // every 15-25s

  function spawnShootingStar() {
    const angle = Math.random() * Math.PI * 2;
    shootingStars.push({
      x: w * 0.5 + Math.cos(angle) * (Math.max(w, h) * 0.8),
      y: h * 0.5 + Math.sin(angle) * (Math.max(w, h) * 0.8),
      vx: Math.cos(angle - Math.PI) * 3,
      vy: Math.sin(angle - Math.PI) * 3,
      life: 1,
      trail: 20,
    });
  }

  function updateShootingStars() {
    shootingStars.forEach(ss => {
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life -= 0.02;
    });
    shootingStars = shootingStars.filter(ss => ss.life > 0 && ss.x > -100 && ss.x < w + 100 && ss.y > -100 && ss.y < h + 100);
  }

  function drawShootingStars() {
    shootingStars.forEach(ss => {
      ctx.beginPath();
      const gradient = ctx.createLinearGradient(ss.x, ss.y, ss.x + ss.vx * ss.trail, ss.y + ss.vy * ss.trail);
      gradient.addColorStop(0, `rgba(232,234,237,${ss.life * 0.6})`);
      gradient.addColorStop(1, 'rgba(232,234,237,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x + ss.vx * ss.trail, ss.y + ss.vy * ss.trail);
      ctx.stroke();
    });
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);

    // Draw nebulas first (background)
    drawNebulas();

    // Draw stars
    updateStars();
    drawStars();

    // Draw shooting stars occasionally
    if (!reduceMotion) {
      shootingStarTimer += 1 / 60; // assume 60fps for timer logic
      if (shootingStarTimer > nextShootingStarIn) {
        spawnShootingStar();
        shootingStarTimer = 0;
        nextShootingStarIn = 15 + Math.random() * 10;
      }
      updateShootingStars();
      drawShootingStars();
    }

    // Draw vignette on top
    drawVignette();

    // Only continue animation if hero is visible
    if (isVisible) {
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  // Start initial render
  if (isVisible) {
    tick();
  } else {
    // Draw static version if not visible initially
    drawNebulas();
    drawStars();
    drawVignette();
  }

  // Resume animation when visibility changes
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !animationFrameId) {
      isVisible = true;
      tick();
    } else {
      isVisible = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  }, { threshold: 0 });
  if (heroSection) observer.observe(heroSection);
})();

/* ---------------------------------------------------------
   HERO PARALLAX DEPTH: 3D tilt on mouse move
   Hero content + canvas layers tilt subtly based on cursor
   position (3 depth layers, max ~12px translate, 2-3deg rotate).
   Desktop/hover-capable devices only, no reduced-motion,
   viewport >= 680px.
   --------------------------------------------------------- */
const canParallax = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
const isLargeViewport = window.innerWidth >= 680;

if (canParallax && isLargeViewport) {
  const hero = document.querySelector('.hero');
  const heroContent = document.getElementById('heroContent');
  const galaxyCanvas = document.getElementById('galaxyCanvas');
  const quantaCanvas = document.getElementById('quantaCanvas');

  window.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const heroX = rect.left + rect.width / 2;
    const heroY = rect.top + rect.height / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Normalized position: -1 to 1 within hero bounds
    const normX = ((mouseX - heroX) / (rect.width / 2)) * 0.5; // clamp range
    const normY = ((mouseY - heroY) / (rect.height / 2)) * 0.5;

    // Layer 1: Galaxy canvas (least movement)
    const galaxyTranslateX = normX * 4;
    const galaxyTranslateY = normY * 4;
    const galaxyRotate = 0;
    galaxyCanvas.style.transform = `translate(${galaxyTranslateX}px, ${galaxyTranslateY}px) rotateX(${galaxyRotate}deg)`;

    // Layer 2: Quanta canvas (medium movement)
    const quantaTranslateX = normX * 8;
    const quantaTranslateY = normY * 8;
    const quantaRotate = normX * 1.5;
    quantaCanvas.style.transform = `translate(${quantaTranslateX}px, ${quantaTranslateY}px) rotateZ(${quantaRotate}deg)`;

    // Layer 3: Content (most movement)
    const contentTranslateX = normX * 12;
    const contentTranslateY = normY * 12;
    const contentRotate = normX * 2.5;
    heroContent.style.transform = `translate(${contentTranslateX}px, ${contentTranslateY}px) rotateZ(${contentRotate}deg)`;
  }, { passive: true });

  // Reset on mouse leave
  hero.addEventListener('mouseleave', () => {
    galaxyCanvas.style.transform = 'translate(0, 0) rotateX(0)';
    quantaCanvas.style.transform = 'translate(0, 0) rotateZ(0)';
    heroContent.style.transform = 'translate(0, 0) rotateZ(0)';
  }, { passive: true });
}

// Reset parallax on viewport resize (handle mobile orientation changes)
window.addEventListener('resize', () => {
  const newLargeViewport = window.innerWidth >= 680;
  if (!newLargeViewport && canParallax && isLargeViewport) {
    // disable parallax on mobile
    const galaxyCanvas = document.getElementById('galaxyCanvas');
    const quantaCanvas = document.getElementById('quantaCanvas');
    const heroContent = document.getElementById('heroContent');
    if (galaxyCanvas) galaxyCanvas.style.transform = '';
    if (quantaCanvas) quantaCanvas.style.transform = '';
    if (heroContent) heroContent.style.transform = '';
  }
}, { passive: true });

/* ---------------------------------------------------------
   HERO CANVAS (Quantum ring/electron/photon burst system)
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
