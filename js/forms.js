/**
 * Newman Exclusive — contact page paths + form submission
 * Sends each submission to the Google Sheet (Apps Script) and Supabase in parallel.
 * If both fail, falls back to Formspree so a lead is never lost.
 */
(function () {
  'use strict';

  var CFG = window.NX_FORMS || {};
  var MIN_FILL_MS = 2500; // submissions faster than this are almost always bots
  var TIMEOUT_MS = 12000;

  /* ---------- Path selector (tabs) ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.path-option'));

  function selectPath(path, updateHash) {
    var found = false;
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-path') === path;
      if (on) found = true;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      var pane = document.getElementById(tab.getAttribute('aria-controls'));
      if (pane) pane.hidden = !on;
    });
    if (found && updateHash && window.history && history.replaceState) {
      history.replaceState(null, '', path === 'inquiry' ? location.pathname : '#' + path);
    }
    return found;
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectPath(tab.getAttribute('data-path'), true); });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });

  // Deep links: contact.html#virtual or contact.html#trunk-show
  var initial = (location.hash || '').replace('#', '');
  if (!initial || !selectPath(initial, false)) selectPath('inquiry', false);
  // Same-page links (e.g. <a href="#trunk-show">) don't reload, so follow hash changes too
  window.addEventListener('hashchange', function () {
    var path = (location.hash || '').replace('#', '');
    if (path) selectPath(path, false);
  });

  /* ---------- Helpers ---------- */
  function timeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }

  function collect(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (key === 'company_website') return;
      value = typeof value === 'string' ? value.trim() : value;
      data[key] = data[key] ? data[key] + ', ' + value : value; // checkbox groups → "A, B"
    });
    data.form_type = form.getAttribute('data-form-type');
    data.submitted_at = new Date().toISOString();
    data.page = location.href;
    if (!data.timezone) data.timezone = timeZone();
    return data;
  }

  function withTimeout(promise) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, TIMEOUT_MS);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  /* ---------- Destinations ---------- */
  function sendToSheet(data) {
    if (!CFG.SHEET_ENDPOINT) return Promise.reject(new Error('sheet not configured'));
    // text/plain keeps this a "simple" request (no CORS preflight), which Apps Script requires
    return withTimeout(fetch(CFG.SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    })).then(function (res) { return res.json(); })
      .then(function (json) { if (!json || !json.ok) throw new Error((json && json.error) || 'sheet error'); return true; });
  }

  function sendToSupabase(data) {
    if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return Promise.reject(new Error('supabase not configured'));
    var row = {
      form_type: data.form_type,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      city: data.city || null,
      country: data.country || null,
      payload: data
    };
    return withTimeout(fetch(CFG.SUPABASE_URL + '/rest/v1/' + (CFG.SUPABASE_TABLE || 'leads'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CFG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CFG.SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    })).then(function (res) { if (!res.ok) throw new Error('supabase ' + res.status); return true; });
  }

  function sendToFormspree(data) {
    if (!CFG.FORMSPREE_ENDPOINT) return Promise.reject(new Error('formspree not configured'));
    var fd = new FormData();
    Object.keys(data).forEach(function (k) { fd.append(k, data[k]); });
    fd.append('_replyto', data.email || '');
    fd.append('_subject', 'Website: ' + data.form_type + ' — ' + (data.name || ''));
    return withTimeout(fetch(CFG.FORMSPREE_ENDPOINT, {
      method: 'POST', body: fd, headers: { 'Accept': 'application/json' }
    })).then(function (res) { if (!res.ok) throw new Error('formspree ' + res.status); return true; });
  }

  function settle(p) {
    return p.then(function () { return true; }, function (e) {
      if (window.console) console.warn('[NX forms]', e && e.message);
      return false;
    });
  }

  function deliver(data) {
    return Promise.all([settle(sendToSheet(data)), settle(sendToSupabase(data))]).then(function (r) {
      if (r[0] || r[1]) return true;
      return settle(sendToFormspree(data));
    });
  }

  /* ---------- Success states ---------- */
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showSuccess(form, data) {
    var first = escapeHtml((data.name || '').split(' ')[0]);
    var box = document.createElement('div');
    box.className = 'form-success';
    box.setAttribute('tabindex', '-1');

    if (data.form_type === 'virtual_consultation') {
      if (CFG.BOOKING_URL) {
        box.innerHTML =
          '<h4>Thank you' + (first ? ', ' + first : '') + '. One last step</h4>' +
          '<p>Choose a time below that suits you. Your confirmation email will include the video link.</p>';
        var embed = document.createElement('div');
        embed.className = 'booking-embed';
        var iframe = document.createElement('iframe');
        iframe.src = CFG.BOOKING_URL;
        iframe.title = 'Book your virtual consultation';
        iframe.loading = 'lazy';
        embed.appendChild(iframe);
        var link = document.createElement('a');
        link.href = CFG.BOOKING_URL; link.target = '_blank'; link.rel = 'noopener';
        link.className = 'booking-fallback'; link.textContent = 'Calendar not loading? Open it in a new tab →';
        embed.appendChild(link);
        box.appendChild(embed);
      } else {
        box.innerHTML =
          '<h4>Thank you' + (first ? ', ' + first : '') + '.</h4>' +
          '<p>We\'ll email you within 24 hours to confirm a time and send your ' + escapeHtml(data.video_platform || 'video') +
          ' link. Need us sooner? <a href="' + CFG.WHATSAPP_URL + '" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p>';
      }
    } else if (data.form_type === 'trunk_show_interest') {
      box.innerHTML =
        '<h4>You\'re on the list' + (first ? ', ' + first : '') + '.</h4>' +
        '<p>We\'ll email you as soon as a trunk show is planned near ' + escapeHtml(data.city || 'you') +
        '. Can\'t wait? You can also <a href="#virtual" data-goto="virtual">book a virtual consultation</a>.</p>';
      var go = box.querySelector('[data-goto]');
      if (go) go.addEventListener('click', function (e) { e.preventDefault(); selectPath('virtual', true); });
    } else {
      box.innerHTML = '<h4>Thank you.</h4><p>We\'ve received your message and will be in touch shortly.</p>';
    }

    form.parentNode.replaceChild(box, form);
    box.focus({ preventScroll: true });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Field checks (beyond the browser's built-in "required") ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function phoneDigits(v) { return String(v || '').replace(/\D/g, '').length; }

  function attachFieldChecks(form) {
    var phone = form.querySelector('input[name="phone"]');
    var email = form.querySelector('input[name="email"]');
    if (phone) {
      var checkPhone = function () {
        var n = phoneDigits(phone.value);
        phone.setCustomValidity(phone.value && (n < 7 || n > 15)
          ? 'Please enter a full phone / WhatsApp number, including country code.' : '');
      };
      phone.addEventListener('input', checkPhone);
      phone.addEventListener('blur', checkPhone);
    }
    if (email) {
      var checkEmail = function () {
        email.setCustomValidity(email.value && !EMAIL_RE.test(email.value.trim())
          ? 'Please enter a valid email address.' : '');
      };
      email.addEventListener('input', checkEmail);
      email.addEventListener('blur', checkEmail);
    }
    return function runChecks() {
      if (phone) phone.dispatchEvent(new Event('blur'));
      if (email) email.dispatchEvent(new Event('blur'));
    };
  }

  /* ---------- Wire up forms ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('form.nx-form'), function (form) {
    var startedAt = Date.now();
    var runChecks = attachFieldChecks(form);
    var tz = form.querySelector('input[name="timezone"]');
    if (tz) tz.value = timeZone();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var btn = form.querySelector('button[type="submit"]');
      if (status) status.textContent = '';

      runChecks();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var data = collect(form);
      var hp = form.querySelector('input[name="company_website"]');
      var isBot = (hp && hp.value) || Date.now() - startedAt < MIN_FILL_MS;
      if (isBot) { showSuccess(form, data); return; } // look normal, send nothing

      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      deliver(data).then(function (ok) {
        if (ok) {
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'generate_lead', { form_type: data.form_type });
          }
          var redirect = form.getAttribute('data-success-redirect');
          if (redirect) { window.location.href = redirect; return; }
          showSuccess(form, data);
        } else {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (status) {
            status.innerHTML = 'Sorry, something went wrong sending your message. Please try again, or ' +
              '<a href="' + CFG.WHATSAPP_URL + '" target="_blank" rel="noopener">message us on WhatsApp</a>.';
          }
        }
      });
    });
  });
})();
