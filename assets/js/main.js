(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
  }

  /* ---------- recovery assistant ---------- */
  const form = $('#recovery-form');
  if (!form) return;

  const LINKS = {
    reset: { href: 'https://www.roblox.com/login/forgot-password-or-username', label: 'Open the reset page' },
    support: { href: 'https://www.roblox.com/support', label: 'Open Roblox Support' },
    appeals: { href: 'https://www.roblox.com/report-appeals', label: 'Open Violations and Appeals' },
    help: { href: 'https://en.help.roblox.com/hc/en-us', label: 'Open the Help Center' },
  };

  const PROOF = {
    receipts: { weight: 3, label: 'Robux or Premium receipts', line: 'I have receipts for Robux or Premium purchases made on this account and can share the order or transaction IDs.' },
    giftcard: { weight: 3, label: 'a redeemed gift card', line: 'I redeemed a Roblox gift card on this account and still have the card or its PIN.' },
    firstEmail: { weight: 2, label: 'the first email used', line: 'I can tell you the first email address that was used on this account.' },
    created: { weight: 1, label: 'the creation date', line: 'I know roughly when the account was created.' },
    oldNames: { weight: 1, label: 'past usernames', line: 'I can list usernames this account has used before.' },
    device: { weight: 1, label: 'your usual device', line: 'I can tell you which devices and location I usually play from.' },
  };

  const read = () => {
    const fd = new FormData(form);
    return {
      situation: fd.get('situation') || 'hacked',
      access: new Set(fd.getAll('access')),
      proof: fd.getAll('proof'),
      username: $('#f-username').value.trim(),
      email: $('#f-email').value.trim(),
      date: $('#f-date').value,
      details: $('#f-details').value.trim(),
    };
  };

  const step = (title, text, link) => ({ title, text, link });

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  function proofScore(proof) {
    const score = proof.reduce((n, k) => n + (PROOF[k] ? PROOF[k].weight : 0), 0);
    if (score >= 6) return { level: 'strong', label: 'Strong', pct: Math.min(100, 55 + score * 5) };
    if (score >= 3) return { level: 'fair', label: 'Fair', pct: 30 + score * 6 };
    return { level: 'weak', label: score ? 'Weak' : 'None yet', pct: Math.max(8, score * 10) };
  }

  function missingProofHint(proof) {
    const strong = ['receipts', 'giftcard'].filter((k) => !proof.includes(k));
    if (strong.length === 2) {
      return 'Look for purchase receipts in your email or app store history, or a gift card you redeemed. These carry the most weight with Support.';
    }
    const have = proof.map((k) => PROOF[k].label);
    return have.length ? `You have ${listJoin(have)}. Keep screenshots or order numbers ready to share.` : '';
  }

  const listJoin = (arr) => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

  function buildPlan(s) {
    const canReset = s.access.has('email') || s.access.has('phone');
    const via = [s.access.has('email') && 'email', s.access.has('phone') && 'phone number'].filter(Boolean);
    const steps = [];
    let path, summary, msgKind = 'support';

    const supportSteps = () => {
      steps.push(step('Collect your proof of ownership', missingProofHint(s.proof) || 'Gather anything that shows the account is yours.'));
      steps.push(step('Contact Roblox Support', 'Fill in your contact details, choose "Account Hacked or Can\'t Log In" as the help category, and paste the message below.', LINKS.support));
      steps.push(step('Reply from the same email', 'Support may ask follow-up questions. Answer from the same address and don\'t open duplicate tickets.'));
    };

    switch (s.situation) {
      case 'password':
        if (canReset) {
          path = 'Self-service reset';
          summary = `You can reset the password yourself with the ${listJoin(via)} on the account. No ticket needed.`;
          msgKind = 'fallback';
          steps.push(step('Open the reset page', 'On the Roblox login screen, choose "Forgot Password or Username?".', LINKS.reset));
          steps.push(step(`Request a reset by ${listJoin(via)}`, 'Enter the details on your account. Roblox sends a reset link or code.'));
          steps.push(step('Check spam, then use the newest link', 'Reset emails can take a few minutes. Older links stop working once you request a new one.'));
          steps.push(step('Pick a password you haven\'t used before', 'Make it long and unique to Roblox, then work through the checklist below.'));
        } else {
          path = 'Roblox Support ticket';
          summary = 'Without the email or phone on the account, a reset can\'t reach you. Roblox Support can verify you another way.';
          supportSteps();
        }
        break;

      case 'username':
        if (canReset) {
          path = 'Self-service lookup';
          summary = `Roblox can send the usernames linked to your ${listJoin(via)}.`;
          msgKind = 'fallback';
          steps.push(step('Open the reset page', 'On the Roblox login screen, choose "Forgot Password or Username?" and switch to the Username tab.', LINKS.reset));
          steps.push(step(`Enter your ${listJoin(via)}`, 'Roblox sends every username tied to it. Check spam if nothing arrives.'));
          steps.push(step('Sign in and confirm your details', 'Once you\'re in, make sure the email and phone on the account are current.'));
        } else {
          path = 'Roblox Support ticket';
          summary = 'Without the email or phone on the account, Support will need other proof that the account is yours.';
          supportSteps();
        }
        break;

      case 'twostep':
        if (s.access.has('backup')) {
          path = 'Backup code';
          summary = 'A backup code gets you past 2-Step Verification. Each code works once.';
          msgKind = 'fallback';
          steps.push(step('Use a backup code', 'On the verification screen, choose the option to use a backup code and enter one you saved.'));
          steps.push(step('Reset 2-Step Verification', 'Once you\'re in, open Settings, then Security, set up 2-Step Verification again and save the new backup codes.'));
        } else if (s.access.has('session')) {
          path = 'Fix it from a signed-in device';
          summary = 'A device that\'s still signed in lets you manage 2-Step Verification without Support.';
          msgKind = 'fallback';
          steps.push(step('Open Settings, then Security', 'On the device that\'s still signed in, update your 2-Step Verification method.'));
          steps.push(step('Save new backup codes', 'Store them somewhere you can reach without your phone.'));
        } else if (s.access.has('email')) {
          path = 'Email code';
          summary = 'If your 2-Step Verification uses email, the code goes to the email on the account.';
          msgKind = 'fallback';
          steps.push(step('Check the email on the account', 'Look for the most recent code from Roblox, including spam. Codes expire quickly.'));
          steps.push(step('Still stuck? Contact Support', 'If your method was an authenticator app you no longer have, Support can help after verifying you.', LINKS.support));
        } else {
          path = 'Roblox Support ticket';
          summary = 'With no backup codes or signed-in device, Roblox Support needs to verify you before removing 2-Step Verification.';
          supportSteps();
        }
        break;

      case 'banned':
        path = 'Official appeal';
        summary = 'If you think the moderation was a mistake, appeal it through Roblox\'s Violations and Appeals page.';
        msgKind = 'appeal';
        steps.push(step('Read the moderation notice', 'Note which rule it mentions and the date. You\'ll need both for the appeal.'));
        steps.push(step('Open Violations and Appeals', 'Sign in, choose the violation, and submit an appeal with the message below.', LINKS.appeals));
        steps.push(step('Keep it short and factual', 'Explain what happened in your own words. Calm, specific appeals are easier to review.'));
        steps.push(step('Don\'t make an alt account to get around it', 'Ban evasion can lead to further action on every account involved.'));
        break;

      case 'hacked':
      case 'other':
      default:
        path = 'Roblox Support ticket';
        summary = s.situation === 'hacked'
          ? (canReset ? 'Your email still works, so try a reset first. If the attacker changed it, go straight to Support.' : 'The attacker probably changed your email or phone, so Roblox Support needs to verify you.')
          : 'Roblox Support can look at your case once you show the account is yours.';
        if (s.situation === 'hacked') {
          if (canReset) steps.push(step('Try a password reset first', `A reset by ${listJoin(via)} may get you back in right away.`, LINKS.reset));
          steps.push(step('Secure your email account', 'Change your email password and turn on 2-step sign-in there, so nobody can reset your Roblox password again.'));
        }
        supportSteps();
        break;
    }

    return { path, summary, steps, msgKind };
  }

  function buildMessage(s, kind) {
    const name = s.username || '[your username]';
    const contact = s.email || '[your email]';
    const when = formatDate(s.date);
    const proofLines = s.proof.map((k) => PROOF[k] && '- ' + PROOF[k].line).filter(Boolean);

    if (kind === 'appeal') {
      return [
        'Hello Roblox Moderation team,',
        '',
        `I'd like to appeal the moderation action on my account, ${name}${when ? `, from ${when}` : ''}.`,
        '',
        s.details || '[Explain what happened in your own words.]',
        '',
        'I have read the Community Standards and I believe this action may have been a mistake. I would appreciate it if you could review it again.',
        '',
        'Thank you for your time.',
        name,
      ].join('\n');
    }

    const canReset = s.access.has('email') || s.access.has('phone');
    const opening = {
      hacked: 'I can no longer access my Roblox account and I believe it was compromised.',
      password: canReset
        ? 'I can\'t sign in to my Roblox account and the password reset isn\'t working for me.'
        : 'I can\'t sign in to my Roblox account and I no longer have access to the email or phone number on it.',
      username: canReset
        ? 'I can\'t remember my Roblox username and the username lookup isn\'t working for me.'
        : 'I can\'t remember my Roblox username and I no longer have access to the email or phone number on the account.',
      twostep: 'I can\'t complete 2-Step Verification on my Roblox account because I no longer have access to my verification method.',
      other: 'I need help getting back into my Roblox account.',
    }[s.situation] || 'I need help getting back into my Roblox account.';

    const lines = [
      'Hello Roblox Support,',
      '',
      opening,
      '',
      `Username: ${name}`,
      `Contact email: ${contact}`,
    ];
    if (when) lines.push(`Date I lost access: ${when}`);
    lines.push('', 'What happened:', s.details || '[Describe what happened in a few sentences.]');
    if (proofLines.length) lines.push('', 'Proof that this account is mine:', ...proofLines);
    lines.push('', 'I have not shared my password with anyone. Please help me restore access and secure the account.', '', 'Thank you,', name);
    return lines.join('\n');
  }

  const els = {
    path: $('#r-path'), summary: $('#r-summary'), steps: $('#r-steps'),
    meter: $('#r-meter'), strength: $('#r-strength'), bar: $('#r-bar'),
    msg: $('#r-message'), msgTitle: $('#r-msg-title'), copy: $('#copy-btn'), status: $('#copy-status'),
    example: $('#example-note'),
  };
  const externalIcon = '<svg aria-hidden="true"><use href="#external"/></svg>';
  let lastStepsKey = '';

  function render() {
    const s = read();
    const plan = buildPlan(s);
    els.path.textContent = plan.path;
    els.summary.textContent = plan.summary;

    const key = JSON.stringify(plan.steps);
    if (key !== lastStepsKey) {
      lastStepsKey = key;
      els.steps.innerHTML = '';
      plan.steps.forEach((st, i) => {
        const li = document.createElement('li');
        li.style.animationDelay = `${i * 50}ms`;
        const t = document.createElement('strong'); t.textContent = st.title; li.appendChild(t);
        const p = document.createElement('span'); p.textContent = st.text; li.appendChild(p);
        if (st.link) {
          const a = document.createElement('a');
          a.href = st.link.href; a.target = '_blank'; a.rel = 'noopener';
          a.innerHTML = externalIcon; a.prepend(document.createTextNode(st.link.label + ' '));
          li.appendChild(a);
        }
        els.steps.appendChild(li);
      });
    }

    const selfService = plan.msgKind === 'fallback';
    const score = proofScore(s.proof);
    if (plan.msgKind !== 'support') {
      els.meter.dataset.level = 'na';
      els.strength.textContent = 'Not needed';
      els.bar.style.width = '100%';
    } else {
      els.meter.dataset.level = score.level;
      els.strength.textContent = score.label;
      els.bar.style.width = score.pct + '%';
    }

    els.msgTitle.textContent = plan.msgKind === 'appeal'
      ? 'Your appeal'
      : selfService ? 'If that doesn\'t work, send this to Support' : 'Message for Roblox Support';
    if (!els.msg.dataset.edited) els.msg.value = buildMessage(s, plan.msgKind === 'appeal' ? 'appeal' : 'support');
    fitMessage();
  }

  function fitMessage() {
    els.msg.style.height = 'auto';
    els.msg.style.height = els.msg.scrollHeight + 2 + 'px';
  }

  form.addEventListener('input', () => {
    if (els.example) els.example.hidden = true;
    delete els.msg.dataset.edited;
    els.status.textContent = '';
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  els.msg.addEventListener('input', () => { els.msg.dataset.edited = '1'; fitMessage(); });
  window.addEventListener('resize', fitMessage);

  els.copy.addEventListener('click', () => {
    const text = els.msg.value;
    const done = () => { els.status.textContent = 'Copied. Paste it into the Roblox Support form.'; };
    const fallback = () => {
      els.msg.focus(); els.msg.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      els.status.textContent = ok ? 'Copied. Paste it into the Roblox Support form.' : 'Text selected. Press Ctrl+C or Cmd+C to copy it.';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  });

  // "Plan my recovery" links on the use-case cards preselect the situation
  $$('[data-situation]').forEach((a) => {
    a.addEventListener('click', () => {
      const input = form.querySelector(`input[name="situation"][value="${a.dataset.situation}"]`);
      if (input) {
        input.checked = true;
        form.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  /* ---------- security checklist (remembered on this device only) ---------- */
  const boxes = $$('#checklist input[type="checkbox"]');
  const count = $('#cl-count');
  const STORE = 'tranom-checklist';
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (_) { return []; } };
  const save = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } };
  const saved = load();
  boxes.forEach((b) => { b.checked = saved.includes(b.id); });
  const updateCount = () => { count.textContent = String(boxes.filter((b) => b.checked).length); };
  boxes.forEach((b) => b.addEventListener('change', () => {
    save(boxes.filter((x) => x.checked).map((x) => x.id));
    updateCount();
  }));
  updateCount();

  render();
})();
