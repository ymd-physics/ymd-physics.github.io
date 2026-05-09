(function () {
  const body = document.body;
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const syncScrolled = function () {
    body.classList.toggle('is-scrolled', window.scrollY > 12);
  };

  syncScrolled();
  window.addEventListener('scroll', syncScrolled, { passive: true });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) {
      body.classList.remove('nav-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
