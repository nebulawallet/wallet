/* ============================================================
   CONFIG — edit these
   ============================================================ */

// Where the download buttons point once a valid invite code is entered.
// Put the files in a `downloads/` folder next to index.html, or replace these
// with full URLs (e.g. GitHub Releases, Dropbox, your own server).
const DOWNLOADS = {
  setup: 'downloads/Nebula Wallet Setup 0.1.0.exe',
  portable: 'downloads/NebulaWallet-Portable-0.1.0.exe',
};

// SHA-256 hashes of valid invite codes (uppercased, spaces removed).
// Only hashes are stored so the codes themselves aren't readable in the source.
// To add a code, run in PowerShell (replace the code):
//   $c='NEBULA-ABCD-1234'; -join ([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($c)) | % { $_.ToString('x2') })
// and paste the output below as a new line.
const INVITE_HASHES = [
  '184fa23ff12312431d0c98ceb3f4f2ce56dfa4714b367341fa0ff9b047e8b12d',
];

/* ============================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Starfield ---------- */
(() => {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.round((innerWidth * innerHeight) / 5000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.2 + 0.2) * dpr,
      a: Math.random(),
      s: Math.random() * 0.015 + 0.003,
      v: (Math.random() * 0.08 + 0.02) * dpr,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.a += st.s;
      const alpha = 0.35 + Math.abs(Math.sin(st.a)) * 0.65;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(225, 225, 255, ${alpha})`;
      ctx.fill();
      if (!reduceMotion) {
        st.y -= st.v;
        if (st.y < -2) { st.y = h + 2; st.x = Math.random() * w; }
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  draw();
  addEventListener('resize', () => { resize(); if (reduceMotion) draw(); });
})();

/* ---------- Nav border on scroll ---------- */
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 80}ms`;
  io.observe(el);
});

/* ---------- Card spotlight ---------- */
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Invite-code download gate ---------- */
(() => {
  const dialog = document.getElementById('invite');
  const form = document.getElementById('invite-form');
  const input = document.getElementById('code');
  const err = document.getElementById('code-err');
  const stepCode = dialog.querySelector('.step-code');
  const stepDl = dialog.querySelector('.step-dl');
  const submit = form.querySelector('button[type=submit]');
  const UNLOCK_KEY = 'nebula-invite-ok';

  document.getElementById('dl-setup').href = DOWNLOADS.setup;
  document.getElementById('dl-portable').href = DOWNLOADS.portable;

  const normalize = (s) => s.toUpperCase().replace(/\s+/g, '');

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isUnlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch { return false; }
  }

  function showStep(unlocked) {
    stepCode.hidden = unlocked;
    stepDl.hidden = !unlocked;
  }

  function open() {
    showStep(isUnlocked());
    err.textContent = '';
    input.classList.remove('bad');
    dialog.showModal();
    if (!isUnlocked()) setTimeout(() => input.focus(), 50);
  }

  document.querySelectorAll('[data-download]').forEach((btn) => btn.addEventListener('click', open));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  // Click on the backdrop closes the dialog
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  input.addEventListener('input', () => {
    err.textContent = '';
    input.classList.remove('bad');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = normalize(input.value);
    if (!code) {
      err.textContent = 'Please enter your invite code.';
      input.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Checking…';
    let ok = false;
    try {
      ok = INVITE_HASHES.includes(await sha256(code));
    } catch {
      err.textContent = 'Your browser blocked the code check. Try opening the site over https.';
    }
    // Small delay so guessing feels less instant
    await new Promise((r) => setTimeout(r, 450));
    submit.disabled = false;
    submit.textContent = 'Unlock download';

    if (ok) {
      try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch {}
      showStep(true);
      stepDl.querySelector('a').focus();
    } else if (!err.textContent) {
      err.textContent = "That code isn't valid. Check it and try again.";
      input.classList.remove('bad');
      void input.offsetWidth; // restart shake animation
      input.classList.add('bad');
      input.select();
    }
  });
})();
