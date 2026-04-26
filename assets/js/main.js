(function () {
  'use strict';

  // ─── Data ────────────────────────────────────────────────
  const OCCASION_DEFAULTS = {
    'birthday':        { greeting: 'Happy Birthday',    theme: 'birthday'        },
    'anniversary':     { greeting: 'Happy Anniversary', theme: 'anniversary'     },
    'congratulations': { greeting: 'Congratulations',   theme: 'congratulations' },
    'farewell':        { greeting: 'Farewell',           theme: 'farewell'        },
    'get-well':        { greeting: 'Get Well Soon',      theme: 'get-well'        },
    'thank-you':       { greeting: 'Thank You',          theme: 'thank-you'       },
    'custom':          { greeting: '',                   theme: 'celebration'     },
  };

  const EMOJI_THEMES = {
    'birthday':        { label: 'Birthday',      icons: ['🎂','🎁','🎈','🎉','⭐'] },
    'anniversary':     { label: 'Anniversary',   icons: ['💍','💐','🥂','❤️','✨'] },
    'congratulations': { label: 'Achievement',   icons: ['🏆','🥇','⭐','🎊','🌟'] },
    'farewell':        { label: 'Adventure',     icons: ['✈️','🌍','👋','🌅','🗺️'] },
    'get-well':        { label: 'Get Well',      icons: ['🌸','🌻','☀️','🍵','💪'] },
    'thank-you':       { label: 'Gratitude',     icons: ['🙏','💐','✨','🌸','❤️'] },
    'celebration':     { label: 'Celebration',   icons: ['🎊','✨','🥳','🌟','🎉'] },
  };

  // ─── Elements ────────────────────────────────────────────
  const builderWrap    = document.getElementById('builder-wrap');
  const form           = document.getElementById('builder-form');
  const occasionBtns   = document.querySelectorAll('.occasion-btn');
  const customWrap     = document.getElementById('custom-occasion-wrap');
  const customInput    = document.getElementById('custom-occasion');
  const recipientInput = document.getElementById('recipient-name');
  const senderInput    = document.getElementById('sender');
  const greetingInput  = document.getElementById('greeting');
  const noteInput      = document.getElementById('personal-note');
  const emojiGrid      = document.getElementById('emoji-grid');
  const createBtn      = document.getElementById('create-btn');
  const formError      = document.getElementById('form-error');
  const confirmation   = document.getElementById('confirmation');

  if (!form) return;

  // ─── Edit mode state ──────────────────────────────────────
  let isEditMode       = false;
  let editViewId       = null;
  let editToken        = null;

  // ─── State ───────────────────────────────────────────────
  let selectedOccasion = null;
  const greetingDefaults = new Set(Object.values(OCCASION_DEFAULTS).map(d => d.greeting).filter(Boolean));

  // ─── Emoji grid ───────────────────────────────────────────
  function buildEmojiGrid(activeTheme) {
    emojiGrid.innerHTML = '';
    Object.entries(EMOJI_THEMES).forEach(([key, theme]) => {
      const label = document.createElement('label');
      label.className = 'emoji-opt';

      const radio = document.createElement('input');
      radio.type  = 'radio';
      radio.name  = 'emojiTheme';
      radio.value = key;
      if (key === activeTheme) radio.checked = true;

      const inner = document.createElement('span');
      inner.className = 'emoji-opt-label';
      inner.innerHTML =
        `<span class="emoji-opt-icons">${theme.icons.join('')}</span>` +
        `<span>${theme.label}</span>`;

      label.appendChild(radio);
      label.appendChild(inner);
      emojiGrid.appendChild(label);
    });
  }

  buildEmojiGrid('celebration');

  // ─── Step nav completion ──────────────────────────────────
  function isSectionDone(id) {
    switch (id) {
      case 'occasion': return selectedOccasion !== null;
      case 'who':      return recipientInput.value.trim() !== '' && senderInput.value.trim() !== '';
      case 'message':  return greetingInput.value.trim() !== '';
      case 'look':     return true;
    }
  }

  function updateStepNav() {
    document.querySelectorAll('.step').forEach(step => {
      step.classList.toggle('done', isSectionDone(step.dataset.section));
    });
  }

  // ─── Scroll → active section ─────────────────────────────
  const scrollObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        const match = document.querySelector(`.step[data-section="${entry.target.id}"]`);
        if (match) match.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -65% 0px' });

  ['occasion', 'who', 'message', 'look'].forEach(id => {
    const el = document.getElementById(id);
    if (el) scrollObserver.observe(el);
  });

  // ─── Occasion selection ───────────────────────────────────
  occasionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      occasionBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedOccasion = btn.dataset.occasion;
      customWrap.hidden = selectedOccasion !== 'custom';

      const defaults = OCCASION_DEFAULTS[selectedOccasion];
      if (defaults) {
        if (!greetingInput.value.trim() || greetingDefaults.has(greetingInput.value.trim())) {
          greetingInput.value = defaults.greeting;
        }
        buildEmojiGrid(defaults.theme);
      }
      updateStepNav();
    });
  });

  // ─── Field input listeners ────────────────────────────────
  [recipientInput, senderInput, greetingInput, customInput].forEach(el => {
    el.addEventListener('input', updateStepNav);
  });

  // ─── Build request body from form ─────────────────────────
  function buildBody(occasionValue) {
    const body = {
      occasion: occasionValue,
      components: {
        recipientName: { value: recipientInput.value.trim() },
        greeting:      { value: greetingInput.value.trim() },
        sender:        { value: senderInput.value.trim() },
        background:    { scheme: document.querySelector('input[name="background"]:checked')?.value ?? 'sunset' },
        emojiTheme:    { set:    document.querySelector('input[name="emojiTheme"]:checked')?.value  ?? 'celebration' },
      },
    };
    if (noteInput.value.trim()) body.components.personalNote = { value: noteInput.value.trim() };
    return body;
  }

  // ─── Submit ───────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();

    const occasionValue = selectedOccasion === 'custom'
      ? customInput.value.trim()
      : selectedOccasion;

    if (!occasionValue) {
      showError('Please choose an occasion.');
      document.getElementById('occasion').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!recipientInput.value.trim()) { showError("Please enter the recipient's name."); recipientInput.focus(); return; }
    if (!senderInput.value.trim())    { showError('Please enter your name.');            senderInput.focus();    return; }
    if (!greetingInput.value.trim())  { showError('Please enter a greeting.');           greetingInput.focus();  return; }

    createBtn.disabled    = true;
    createBtn.textContent = isEditMode ? 'Saving…' : 'Creating…';

    try {
      if (isEditMode) {
        await saveEdit(occasionValue);
      } else {
        await createNew(occasionValue);
      }
    } catch {
      showError('Something went wrong — please try again.');
      createBtn.disabled    = false;
      createBtn.textContent = isEditMode ? 'Save changes' : 'Create celebration';
    }
  });

  // ─── Create flow ──────────────────────────────────────────
  async function createNew(occasionValue) {
    const res = await fetch('/api/celebrations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildBody(occasionValue)),
    });
    if (!res.ok) throw new Error('server');

    const { view_id, edit_token: token } = await res.json();
    try { localStorage.setItem(`celebrate_edit_${view_id}`, token); } catch (_) {}
    showCreateConfirmation(view_id, token, recipientInput.value.trim());
  }

  // ─── Edit / save flow ────────────────────────────────────
  async function saveEdit(occasionValue) {
    const res = await fetch(`/api/celebrations/${editViewId}`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${editToken}`,
      },
      body: JSON.stringify(buildBody(occasionValue)),
    });
    if (!res.ok) throw new Error('server');
    showSaveConfirmation();
  }

  // ─── Populate form from existing celebration data ─────────
  function populateForm(data) {
    const { occasion, components } = data;

    // Select occasion button (triggers greeting/theme defaults, then we override below)
    const knownBtn = document.querySelector(`.occasion-btn[data-occasion="${occasion}"]`);
    if (knownBtn) {
      knownBtn.click();
    } else {
      document.querySelector('.occasion-btn[data-occasion="custom"]')?.click();
      customInput.value = occasion;
    }

    // Override with actual saved values
    if (components.recipientName?.value) recipientInput.value = components.recipientName.value;
    if (components.sender?.value)        senderInput.value    = components.sender.value;
    if (components.greeting?.value)      greetingInput.value  = components.greeting.value;
    if (components.personalNote?.value)  noteInput.value      = components.personalNote.value;

    const scheme = components.background?.scheme;
    if (scheme) {
      const radio = document.querySelector(`input[name="background"][value="${scheme}"]`);
      if (radio) radio.checked = true;
    }

    const theme = components.emojiTheme?.set;
    if (theme) buildEmojiGrid(theme);

    updateStepNav();
  }

  // ─── Confirmations ────────────────────────────────────────
  function showCreateConfirmation(viewId, token, recipientName) {
    const base     = window.location.origin;
    const shareUrl = `${base}/c/${viewId}`;
    const editUrl  = `${base}/c/${viewId}?edit=${token}`;

    document.getElementById('confirm-recipient').textContent = recipientName;
    document.getElementById('share-link').value = shareUrl;
    document.getElementById('edit-link').value  = editUrl;

    builderWrap.hidden  = true;
    confirmation.hidden = false;

    makeCopyButton('copy-share', shareUrl);
    makeCopyButton('copy-edit',  editUrl);
  }

  function showSaveConfirmation() {
    const viewUrl = `${window.location.origin}/c/${editViewId}`;
    document.getElementById('confirm-recipient').textContent = recipientInput.value.trim();
    document.getElementById('share-link').value = viewUrl;

    // Hide the edit link section — creator already has it
    const editLinkSection = document.getElementById('edit-link')?.closest('.confirm-link');
    if (editLinkSection) editLinkSection.hidden = true;

    document.querySelector('.confirm-box h1').textContent = 'Changes saved';

    builderWrap.hidden  = true;
    confirmation.hidden = false;

    makeCopyButton('copy-share', viewUrl);
  }

  function makeCopyButton(btnId, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  }

  // ─── Edit mode init (from URL params) ────────────────────
  const params = new URLSearchParams(window.location.search);
  editViewId   = params.get('id');
  editToken    = params.get('edit');

  if (editViewId && editToken) {
    isEditMode = true;

    // Persist token to localStorage for this browser
    try { localStorage.setItem(`celebrate_edit_${editViewId}`, editToken); } catch (_) {}

    // Update UI for edit mode
    document.querySelector('.builder-header p').textContent = 'Update your celebration.';
    createBtn.textContent = 'Save changes';

    // Fetch existing data and populate
    fetch(`/api/celebrations/${editViewId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => populateForm(data))
      .catch(() => showError('Could not load celebration data.'));
  }

  // ─── Helpers ─────────────────────────────────────────────
  function showError(msg) { formError.textContent = msg; formError.hidden = false; }
  function hideError()    { formError.hidden = true; }

})();
