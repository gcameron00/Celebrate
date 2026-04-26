(function () {
  'use strict';

  const celebration = window.__C__;
  if (!celebration) return;

  const { components } = celebration;

  // ─── Apply background scheme ─────────────────────────────
  const scheme = components.background?.scheme ?? 'sunset';
  document.body.classList.add('bg-' + scheme);

  // ─── Emoji pool ──────────────────────────────────────────
  const EMOJI_SETS = {
    'birthday':        ['🎂','🎁','🎈','🎉','⭐','🥳','🍰'],
    'anniversary':     ['💍','💐','🥂','❤️','✨','🕯️','💑'],
    'congratulations': ['🏆','🥇','⭐','🎊','🌟','🎉','🥂'],
    'farewell':        ['✈️','🌍','👋','🌅','🗺️','🧳','🌐'],
    'get-well':        ['🌸','🌻','☀️','🍵','💪','🌈','🌷'],
    'thank-you':       ['🙏','💐','✨','🌸','❤️','🌟','💛'],
    'celebration':     ['🎊','✨','🥳','🌟','🎉','🎈','⭐'],
  };

  const themeKey = components.emojiTheme?.set ?? 'celebration';
  const pool     = (EMOJI_SETS[themeKey] ?? EMOJI_SETS['celebration'])
                    .map(emoji => ({ emoji }));

  const stage = document.getElementById('stage');
  if (!stage) return;

  // ─── State ───────────────────────────────────────────────
  let W = window.innerWidth;
  let H = window.innerHeight;
  const MAX        = W < 480 ? 22 : 32;
  const items      = [];
  let   frame      = 0;
  const SPAWN_EVERY = 10;

  // ─── Helpers ─────────────────────────────────────────────
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function pick(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
  function offscreen(item) {
    return item.x < -160 || item.x > W + 160 ||
           item.y < -160 || item.y > H + 160;
  }

  // ─── Item factory ────────────────────────────────────────
  function createItem(opts) {
    const def = pick(pool);
    const el  = document.createElement('span');
    el.className = 'item';
    el.setAttribute('role', 'img');
    el.textContent = def.emoji;

    const item = {
      el,
      x:             W / 2 + rand(-40, 40),
      y:             H / 2 + rand(-40, 40),
      angle:         rand(0, Math.PI * 2),
      speed:         rand(0.8, 1.6),
      size:          rand(18, 26),
      maxSize:       rand(52, 96),
      opacity:       0,
      rotation:      rand(0, 360),
      rotationSpeed: rand(-1.5, 1.5),
      alive:         true,
    };

    if (opts) Object.assign(item, opts);

    stage.appendChild(el);
    items.push(item);
    return item;
  }

  // ─── Per-frame update ─────────────────────────────────────
  function updateItem(item) {
    const dx       = item.x - W / 2;
    const dy       = item.y - H / 2;
    const dist     = Math.sqrt(dx * dx + dy * dy);
    const maxDist  = Math.sqrt(W * W + H * H) / 2;
    const progress = Math.min(dist / maxDist, 1);

    const speedMult = 1 + progress * 2.8;
    item.x += Math.cos(item.angle) * item.speed * speedMult;
    item.y += Math.sin(item.angle) * item.speed * speedMult;

    item.size     = 20 + progress * item.maxSize;
    item.opacity  = Math.min(1, progress * 5);
    item.rotation += item.rotationSpeed * (1 + progress * 0.8);
  }

  function applyItem(item) {
    const s  = item.el.style;
    s.fontSize  = item.size + 'px';
    s.opacity   = item.opacity;
    s.transform = `translate(${item.x - item.size * 0.5}px,${item.y - item.size * 0.5}px) rotate(${item.rotation}deg)`;
  }

  function removeItem(item) {
    item.el.remove();
    const i = items.indexOf(item);
    if (i > -1) items.splice(i, 1);
  }

  // ─── Pre-populate so screen isn't empty at load ──────────
  for (let i = 0; i < 10; i++) {
    const item     = createItem();
    const progress = rand(0.1, 0.7);
    const angle    = rand(0, Math.PI * 2);
    const maxDist  = Math.sqrt(W * W + H * H) / 2;
    item.x       = W / 2 + Math.cos(angle) * maxDist * progress;
    item.y       = H / 2 + Math.sin(angle) * maxDist * progress;
    item.angle   = angle;
    item.size    = 20 + progress * item.maxSize;
    item.opacity = Math.min(1, progress * 5);
  }

  // ─── Main loop ────────────────────────────────────────────
  function loop() {
    frame++;
    if (frame % SPAWN_EVERY === 0 && items.length < MAX) createItem();

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      updateItem(item);
      if (item.alive && offscreen(item)) item.alive = false;
      if (!item.alive) removeItem(item);
      else applyItem(item);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // ─── Tap / click burst ────────────────────────────────────
  document.addEventListener('pointerdown', function (e) {
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
      createItem({
        x:       e.clientX,
        y:       e.clientY,
        angle,
        speed:   rand(1.5, 3.5),
        size:    rand(24, 40),
        maxSize: rand(40, 72),
        opacity: 0.9,
      });
    }
  }, { passive: true });

  // ─── Resize ───────────────────────────────────────────────
  window.addEventListener('resize', function () {
    W = window.innerWidth;
    H = window.innerHeight;
  }, { passive: true });

  // ─── Edit button (creator only, via localStorage) ─────────
  const viewId = celebration.viewId;
  if (viewId) {
    let storedToken = null;
    try { storedToken = localStorage.getItem(`celebrate_edit_${viewId}`); } catch (_) {}
    if (storedToken) {
      const editBtn = document.createElement('a');
      editBtn.href      = `/c/${viewId}?edit=${storedToken}`;
      editBtn.className = 'viewer-edit-btn';
      editBtn.textContent = 'Edit';
      document.body.appendChild(editBtn);
    }
  }

})();
