(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage blocked */ } },
  };
  const SUPPORT_EMAIL = 'support@tranom.com';

  /* ---------- mobile nav ---------- */
  const toggle = $('#nav-toggle');
  const links = $('#nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      links.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- cookie consent ----------
     Scripts that need consent are added as
       <script type="text/plain" data-consent-category="analytics" data-src="https://..."></script>
     and only run after the visitor accepts. */
  const CONSENT_KEY = 'tranom-consent-v1';
  const banner = $('#consent');
  let consent = store.get(CONSENT_KEY);

  function runConsentedScripts() {
    if (!consent || !consent.analytics) return;
    $$('script[type="text/plain"][data-consent-category="analytics"]').forEach((placeholder) => {
      const s = document.createElement('script');
      if (placeholder.dataset.src) { s.src = placeholder.dataset.src; s.async = true; }
      else s.textContent = placeholder.textContent;
      placeholder.replaceWith(s);
    });
  }

  function showBanner(focus) {
    if (!banner) return;
    banner.hidden = false;
    if (focus) { const first = banner.querySelector('button'); if (first) first.focus(); }
  }

  if (banner) {
    banner.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-consent-choice]');
      if (!btn) return;
      const hadAnalytics = !!(consent && consent.analytics);
      consent = { analytics: btn.dataset.consentChoice === 'accept', date: new Date().toISOString() };
      store.set(CONSENT_KEY, consent);
      banner.hidden = true;
      document.dispatchEvent(new CustomEvent('tranom:consent', { detail: consent }));
      if (hadAnalytics && !consent.analytics) window.location.reload(); // unload scripts that already ran
      else runConsentedScripts();
    });
    if (!consent) showBanner(false);
  }
  $$('[data-consent-open]').forEach((b) => b.addEventListener('click', () => showBanner(true)));
  window.tranomConsent = { get: () => consent, open: () => showBanner(true) };
  runConsentedScripts();

  /* ---------- "Start recovery" links preselect the situation ---------- */
  $$('[data-situation]').forEach((a) => {
    a.addEventListener('click', () => {
      const input = $(`#start-form input[name="situation"][value="${a.dataset.situation}"]`);
      if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });

  /* ---------- recovery request form ---------- */
  const form = $('#start-form');
  if (!form) return;

  const startedAt = Date.now();
  const MIN_FILL_MS = 3000;          // faster than any person can fill the form
  const RESUBMIT_MS = 60 * 1000;     // one request per minute from the same browser
  const LAST_KEY = 'tranom-last-request';

  const el = {
    group: $('#g-situation'),
    name: $('#f-name'),
    email: $('#f-email'),
    username: $('#f-username'),
    usernameReq: $('#username-req'),
    usernameHint: $('#username-hint'),
    details: $('#f-details'),
    count: $('#details-count'),
    consent: $('#f-consent'),
    honeypot: $('#f-company'),
    submit: $('#submit-btn'),
    status: $('#form-status'),
    done: $('#form-done'),
    doneText: $('#form-done-text'),
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PASSWORD_RE = /\b(pass(word)?|pwd|pw)\b\s*(is|was|:|=)\s*\S{4,}/i;
  const COOKIE_RE = /ROBLOSECURITY|_\|WARNING:-DO-NOT-SHARE-THIS/i;
  const situation = () => (form.querySelector('input[name="situation"]:checked') || {}).value || '';

  function robloxNameError(v) {
    if (v.length < 3 || v.length > 20) return 'Roblox usernames are 3 to 20 characters long.';
    if (!/^[A-Za-z0-9_]+$/.test(v)) return 'Use only letters, numbers and an underscore.';
    if (v.startsWith('_') || v.endsWith('_') || (v.match(/_/g) || []).length > 1) return 'Roblox usernames can have one underscore, not at the start or end.';
    return '';
  }

  const rules = {
    situation: () => (situation() ? '' : 'Choose what happened.'),
    name: () => (el.name.value.trim().length >= 2 ? '' : 'Enter your name.'),
    email: () => {
      const v = el.email.value.trim();
      if (!v) return 'Enter your email address so we can reply.';
      return EMAIL_RE.test(v) ? '' : 'Enter a valid email address, like name@example.com.';
    },
    username: () => {
      const v = el.username.value.trim();
      if (!v) return situation() === 'username' ? '' : 'Enter your Roblox username.';
      return robloxNameError(v);
    },
    details: () => {
      const v = el.details.value.trim();
      if (COOKIE_RE.test(v)) return 'Remove the cookie text. Never share it with anyone, including us.';
      if (PASSWORD_RE.test(v)) return 'Remove your password from this message. We never need it.';
      if (v.length < 20) return 'Tell us a little more (at least 20 characters).';
      if ((v.match(/https?:\/\/|www\./gi) || []).length > 2) return 'Please include no more than two links.';
      return '';
    },
    consent: () => (el.consent.checked ? '' : 'Tick this box to continue.'),
  };
  const targets = { situation: el.group, name: el.name, email: el.email, username: el.username, details: el.details, consent: el.consent };
  const touched = new Set();

  function check(key, show) {
    const msg = rules[key]();
    const target = targets[key];
    const err = $(`#err-${key}`);
    if (show) {
      err.textContent = msg;
      if (msg) target.setAttribute('aria-invalid', 'true');
      else target.removeAttribute('aria-invalid');
    }
    return msg;
  }

  function syncUsernameRequirement() {
    const optional = situation() === 'username';
    el.username.required = !optional;
    el.usernameReq.hidden = optional;
    el.usernameHint.hidden = !optional;
    if (touched.has('username')) check('username', true);
  }

  function updateCount() { el.count.textContent = `${el.details.value.length} / 2000`; }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'situation') { touched.add('situation'); check('situation', true); syncUsernameRequirement(); }
    if (e.target === el.consent) { touched.add('consent'); check('consent', true); }
  });
  [['name', el.name], ['email', el.email], ['username', el.username], ['details', el.details]].forEach(([key, input]) => {
    input.addEventListener('blur', () => { if (input.value.trim()) touched.add(key); if (touched.has(key)) check(key, true); });
    input.addEventListener('input', () => { if (touched.has(key)) check(key, true); });
  });
  el.details.addEventListener('input', updateCount);

  function setStatus(html, isError) {
    el.status.classList.toggle('is-error', !!isError);
    el.status.innerHTML = html;
  }

  function showDone() {
    const name = el.name.value.trim().split(/\s+/)[0];
    const email = el.email.value.trim();
    el.doneText.textContent = `Thanks${name ? ', ' + name : ''}. We'll email ${email || 'you'} with your next steps. If you don't see our reply, check your spam folder.`;
    form.hidden = true;
    el.done.hidden = false;
    el.done.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', false);

    const errors = Object.keys(rules).map((k) => { touched.add(k); return [k, check(k, true)]; }).filter(([, m]) => m);
    if (errors.length) {
      setStatus(`Please fix ${errors.length === 1 ? 'the highlighted field' : `the ${errors.length} highlighted fields`}.`, true);
      const first = targets[errors[0][0]];
      (first.matches('fieldset') ? first.querySelector('input') : first).focus();
      return;
    }

    // Spam checks: bots fill the hidden field or submit instantly. Show them success and send nothing.
    if (el.honeypot.value || Date.now() - startedAt < MIN_FILL_MS) { showDone(); return; }

    const last = store.get(LAST_KEY);
    if (last && Date.now() - last < RESUBMIT_MS) {
      setStatus('You just sent a request. Please wait a minute before sending another.', true);
      return;
    }

    const endpoint = form.dataset.endpoint;
    const fallback = `email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
    if (!endpoint) {
      setStatus(`Online requests aren't switched on yet. Please ${fallback} with the details above.`, true);
      return;
    }

    el.submit.disabled = true;
    el.submit.textContent = 'Sending…';
    try {
      const data = new FormData(form);
      data.set('_subject', `Recovery request: ${situation()}`);
      const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      store.set(LAST_KEY, Date.now());
      showDone();
    } catch (_) {
      setStatus(`We couldn't send your request. Check your connection and try again, or ${fallback}.`, true);
    } finally {
      el.submit.disabled = false;
      el.submit.textContent = 'Start recovery';
    }
  });

  syncUsernameRequirement();
  updateCount();
})();
