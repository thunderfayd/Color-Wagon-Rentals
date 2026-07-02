// Nav scroll effect - transparent over the hero, solid once scrolled
(function () {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const overHero = nav.classList.contains('over-hero');
  function updateNav() {
    if (!overHero) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
})();

// Mobile menu
(function () {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;
  const setOpen = (open) => {
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  hamburger.addEventListener('click', () => setOpen(!mobileMenu.classList.contains('open')));
  // Close after tapping any link in the menu
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) setOpen(false);
  });
  // Close on Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();

// Smooth scroll for same-page anchor links (ignores bare "#" and off-page targets)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') { e.preventDefault(); return; }  // placeholder link - don't jump or crash
    const target = document.getElementById(href.slice(1));
    if (target) {
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 74;
      window.scrollTo({ top: target.offsetTop - navH - 16, behavior: 'smooth' });
    }
  });
});

// Fade-in on scroll
(function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fleet-card, .amenity-card, .step, .policy-card, .unit-detail, .layout-item').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();
