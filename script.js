/* =========================================================
   Acme 1-2-3 — site interactions (vanilla JS)
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Theme toggle (persisted in localStorage) ---------- */
  var themeToggle = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var next = theme === 'dark' ? 'light' : 'dark';
    themeToggle.setAttribute('aria-label', 'Switch to ' + next + ' mode');
    themeToggle.setAttribute('title', 'Switch to ' + next + ' mode');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#0a1424' : '#0b1f3a');
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  themeToggle.addEventListener('click', function () {
    var theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    storageSet('theme', theme);
  });

  // Follow OS changes only if the user hasn't chosen explicitly
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) {
      if (!storageGet('theme')) applyTheme(e.matches ? 'dark' : 'light');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- Mobile menu ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');

  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menuToggle.addEventListener('click', function () {
    setMenu(!navLinks.classList.contains('open'));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  /* ---------- Smooth scroll for in-page links ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.pushState) history.pushState(null, '', id === '#top' ? location.pathname : id);
    });
  });

  /* ---------- Header shadow + active nav link ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    var navMap = {};
    navLinks.querySelectorAll('a:not(.btn)').forEach(function (a) {
      navMap[a.getAttribute('href').slice(1)] = a;
    });

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = navMap[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    document.querySelectorAll('main section[id]').forEach(function (s) { sectionObserver.observe(s); });

    /* Reveal-on-scroll for cards and blocks */
    if (!reduceMotion) {
      var revealEls = document.querySelectorAll('.card, .about-copy, .about-why, .info-item, .contact-form');
      var revealObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = (i % 4) * 70 + 'ms';
        revealObserver.observe(el);
      });
    }
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Contact form validation ---------- */
  var form = document.getElementById('contactForm');
  var success = document.getElementById('formSuccess');
  var successName = document.getElementById('successName');
  var resetBtn = document.getElementById('resetForm');
  var statusEl = document.getElementById('formStatus');
  if (!form) return;

  // Inquiries are sent to the site's Cloudflare Pages Function
  // (functions/api/contact.js), which emails them to the business owner.
  var FORM_ENDPOINT = '/api/contact';

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var phoneRe = /^[+()\d\s.-]{7,20}$/;

  var rules = {
    name: function (v) {
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Name must be at least 2 characters.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Please enter your email address.';
      if (!emailRe.test(v)) return 'Please enter a valid email (e.g. you@example.com).';
      return '';
    },
    phone: function (v) {
      if (!v) return '';
      var digits = v.replace(/\D/g, '');
      if (!phoneRe.test(v) || digits.length < 7 || digits.length > 15) return 'Please enter a valid phone number.';
      return '';
    },
    service: function (v) {
      return v ? '' : 'Please choose a service.';
    },
    message: function (v) {
      if (!v) return 'Please tell us a little about your project.';
      if (v.length < 10) return 'Message must be at least 10 characters.';
      return '';
    }
  };

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var msg = rule(input.value.trim());
    var field = input.closest('.field');
    var errorEl = document.getElementById(input.name + '-error');
    field.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (errorEl) errorEl.textContent = msg;
    return !msg;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    // Validate on blur; re-validate live once a field has been flagged
    input.addEventListener('blur', function () { validateField(input); });
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('invalid')) validateField(input);
    });
    input.addEventListener('change', function () {
      if (input.tagName === 'SELECT') validateField(input);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Silently drop bot submissions (honeypot filled)
    if (form.elements.company && form.elements.company.value) return;

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.hidden = true;

    var data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      service: form.elements.service.value,
      message: form.elements.message.value.trim(),
      company: form.elements.company ? form.elements.company.value : ''
    };

    function done() {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }

    function fail() {
      // Offer the email or phone shown in the contact section as a fallback
      var direct = document.querySelector('.contact-info a[href^="mailto:"]') ||
        document.querySelector('.contact-info a[href^="tel:"]');
      statusEl.textContent = 'Sorry, your message could not be sent. Please try again';
      if (direct) {
        statusEl.appendChild(document.createTextNode(' or contact us directly at '));
        var link = direct.cloneNode(true);
        statusEl.appendChild(link);
      }
      statusEl.appendChild(document.createTextNode('.'));
      statusEl.hidden = false;
      done();
    }

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (json) { return { ok: res.ok, json: json }; });
      })
      .then(function (r) {
        if (!r.ok || r.json.success !== true) throw new Error(r.json.message || 'Send failed');
        successName.textContent = data.name.split(' ')[0];
        form.hidden = true;
        success.hidden = false;
        success.focus();
        done();
      })
      .catch(fail);
  });

  resetBtn.addEventListener('click', function () {
    form.reset();
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('invalid'); });
    form.querySelectorAll('.error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    statusEl.hidden = true;
    success.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
})();
