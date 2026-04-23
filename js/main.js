/**
 * Lidermed IT Platform — корпоративный сайт. Меню, cookie, формы. RU/O'Z i18n.
 */
(function () {
  'use strict';

  function getT() {
    var lang = (window.i18n && window.i18n.getLang()) ? window.i18n.getLang() : 'uz';
    return (window.i18n && window.i18n.t && window.i18n.t[lang]) ? window.i18n.t[lang] : (window.i18n.t.uz || window.i18n.t.ru);
  }

  // ——— Мобильное меню ———
  var menuToggle = document.getElementById('menuToggle');
  var navMain = document.getElementById('navMain');
  if (menuToggle && navMain) {
    menuToggle.addEventListener('click', function () {
      var isOpen = navMain.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    navMain.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navMain.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ——— Cookie ———
  var cookieNotice = document.getElementById('cookieNotice');
  var cookieAccept = document.getElementById('cookieAccept');
  if (cookieNotice && cookieAccept) {
    if (localStorage.getItem('cookieAccepted') === '1') {
      cookieNotice.classList.add('hidden');
    }
    cookieAccept.addEventListener('click', function () {
      localStorage.setItem('cookieAccepted', '1');
      cookieNotice.classList.add('hidden');
    });
  }

  // ——— Slider «Почему мы» — 10 сек, стрелки, пауза при наведении ———
  (function initWhyWeSlider() {
    var slider = document.getElementById('whyWeSlider');
    var dotsWrap = document.getElementById('whyWeSliderDots');
    var btnPrev = document.getElementById('whyWeSliderPrev');
    var btnNext = document.getElementById('whyWeSliderNext');
    if (!slider || !dotsWrap) return;
    var slides = slider.querySelectorAll('.slide');
    var n = slides.length;
    if (n === 0) return;
    var current = 0;
    var intervalId;
    var paused = false;

    function goToSlide(i) {
      current = (i + n) % n;
      slides.forEach(function (el, idx) {
        el.classList.toggle('active', idx === current);
      });
      dotsWrap.querySelectorAll('button').forEach(function (btn, idx) {
        btn.classList.toggle('active', idx === current);
      });
    }

    function tick() {
      if (!paused) goToSlide(current + 1);
    }

    function resetInterval() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(tick, 10000);
    }

    var wrap = slider.closest('.slider-wrap');
    if (wrap) {
      wrap.addEventListener('mouseenter', function () { paused = true; });
      wrap.addEventListener('mouseleave', function () { paused = false; });
      wrap.addEventListener('focusin', function () { paused = true; });
      wrap.addEventListener('focusout', function () { paused = false; });
    }

    for (var d = 0; d < n; d++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Slide ' + (d + 1));
      btn.addEventListener('click', function (idx) {
        return function () {
          goToSlide(idx);
          resetInterval();
        };
      }(d));
      dotsWrap.appendChild(btn);
    }
    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        goToSlide(current - 1);
        resetInterval();
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        goToSlide(current + 1);
        resetInterval();
      });
    }
    goToSlide(0);
    resetInterval();
  })();

  // ——— Форма обратной связи ———
  var contactForm = document.getElementById('contactForm');
  var formStatus = document.getElementById('formStatus');
  var phoneInput = document.getElementById('phone');
  var uzPhonePattern = /^\+998 \d{2} \d{3}-\d{2}-\d{2}$/;

  function formatUzPhone(value) {
    var digits = (value || '').replace(/\D/g, '');
    if (digits.indexOf('998') === 0) {
      digits = digits.slice(3);
    }
    digits = digits.slice(0, 9);
    var out = '+998';
    if (digits.length > 0) out += ' ' + digits.slice(0, 2);
    if (digits.length > 2) out += ' ' + digits.slice(2, 5);
    if (digits.length > 5) out += '-' + digits.slice(5, 7);
    if (digits.length > 7) out += '-' + digits.slice(7, 9);
    return out;
  }

  if (phoneInput) {
    phoneInput.addEventListener('focus', function () {
      if (!phoneInput.value) {
        phoneInput.value = '+998 ';
      }
    });
    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatUzPhone(phoneInput.value);
    });
    phoneInput.addEventListener('blur', function () {
      if (phoneInput.value === '+998 ') {
        phoneInput.value = '';
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('name').value.trim();
      var phone = (phoneInput && phoneInput.value.trim()) || '';

      if (!name || !phone) {
        setFormStatus((getT().formError || 'Заполните имя и телефон.'), 'error');
        return;
      }

      if (!uzPhonePattern.test(phone)) {
        setFormStatus('Telefon raqamni +998 XX XXX-XX-XX formatida kiriting.', 'error');
        return;
      }

      var payload = { name: name, email: '', phone: phone, type: 'consult', message: '' };

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.ok) {
          contactForm.reset();
          setFormStatus((getT().formSuccess || 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.'), 'success');
        } else {
          return res.json().then(function (data) {
            setFormStatus(data.message || (getT().formSendError || 'Ошибка отправки. Попробуйте ещё раз.'), 'error');
          });
        }
      }).catch(function (err) {
        console.error('Lead submit error:', err);
        setFormStatus((getT().formSendError || 'Сервер недоступен. Попробуйте позже или свяжитесь по телефону.'), 'error');
      });
    });
  }

  function setFormStatus(text, type) {
    if (!formStatus) return;
    formStatus.textContent = text;
    formStatus.className = 'form-status ' + (type || '');
  }

  // ——— Услуги из API (админка) ———
  var servicesContainer = document.getElementById('servicesContainer');
  if (servicesContainer) {
    fetch('/api/public/content')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.services && data.services.length > 0) {
          function esc(s) {
            if (s == null) return '';
            var d = document.createElement('div');
            d.textContent = s;
            return d.innerHTML;
          }
          servicesContainer.innerHTML = data.services.map(function (s) {
            return '<div class="service-item"><h3>' + esc(s.title) + '</h3><p>' + esc(s.description || '') + '</p></div>';
          }).join('');
        }
      })
      .catch(function () {});
  }

  // ——— Kontaktlar va ijtimoiy tarmoqlar sozlamalardan ———
  fetch('/api/public/settings')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s) return;
      document.querySelectorAll('[data-i18n="contactPhoneVal"]').forEach(function (el) {
        if (s.phone) {
          el.textContent = s.phone;
          if (el.tagName === 'A') el.href = 'tel:' + s.phone.replace(/[\s()-]/g, '');
        }
      });
      document.querySelectorAll('[data-i18n="contactEmailVal"]').forEach(function (el) {
        if (s.email) {
          el.textContent = s.email;
          if (el.tagName === 'A') el.href = 'mailto:' + s.email;
        }
      });
      document.querySelectorAll('[data-i18n="contactAddressVal"]').forEach(function (el) {
        if (s.address) el.textContent = s.address;
      });
      var social = s.social || {};
      var footerSocial = document.getElementById('footerSocial');
      if (footerSocial) {
        var links = '';
        if (social.telegram) links += '<a href="' + social.telegram + '" target="_blank" rel="noopener">Telegram</a>';
        if (social.whatsapp) links += '<a href="' + social.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>';
        if (social.instagram) links += '<a href="' + social.instagram + '" target="_blank" rel="noopener">Instagram</a>';
        footerSocial.innerHTML = links || '';
      }
    })
    .catch(function () {});
})();
