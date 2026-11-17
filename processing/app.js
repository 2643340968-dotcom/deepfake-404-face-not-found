(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const app = $('.app');
  const gallery = $('.gallery');
  const slidesRoot = $('.slides');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const { presets, palette, messages, hsvToHex, hexToHsv } = window.MaskDesign;
  const count = presets.length;
  const defaults = preset => ({ characters: '01', colour: '#505B90', movement: preset.movement, density: preset.density });
  const settings = presets.map(defaults);
  let language = 'zh';
  try { const saved = localStorage.getItem('dpm.language'); if (saved === 'en' || saved === 'zh') language = saved; } catch { /* Offline / restricted storage still supports switching. */ }
  const t = (key, values = {}) => messages[language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const number = index => String(index + 1).padStart(2, '0');
  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let current = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('dpm.design.v1'));
    if (saved && Array.isArray(saved.settings)) {
      saved.settings.slice(0, count).forEach((config, index) => {
        if (config && /^#[0-9a-f]{6}$/i.test(config.colour) && typeof config.characters === 'string' && Number.isFinite(config.movement) && Number.isFinite(config.density)) settings[index] = { colour:config.colour.toUpperCase(), characters:[...config.characters].slice(0,12).join(''), movement:clamp(config.movement,0,100), density:clamp(config.density,30,100) };
      });
      const selected = presets.findIndex(preset => preset.id === saved.selected);
      if (selected >= 0) current = selected;
    }
  } catch { /* An unavailable or old draft never blocks the experience. */ }
  let customizing = false;
  let paused = reducedMotion.matches;
  let visible = true;
  let clock = 0;
  let lastFrame = 0;
  let copyTimer;
  let dragging = null;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let pickerHSV = hexToHsv(settings[0].colour);
  let focusTimer;
  let lastHomeDraw = -1;
  const home = $('#home'), homeArt = $('.home-art-trigger'), homeCanvas = $('#home-mask');
  const homePointer = { x:0, y:0, targetX:0, targetY:0, active:false };
  const homeDuration = 2.15;
  let homeElapsed = 3, homeOpening = false, homeStartedAt = 0;
  let homePulse = 10, pulseX = 0, pulseY = 0;
  let layoutTransition = null, layoutRevision = 0, fallbackTimer;
  let saveTimer;
  function persistDesign() {
    try { localStorage.setItem('dpm.design.v1', JSON.stringify({ selected:presets[mod(current,count)].id, settings })); }
    catch { window.dispatchEvent(new CustomEvent('dpm:storage-error')); }
    window.dispatchEvent(new CustomEvent('dpm:design'));
  }
  function saveDesign() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistDesign, 120);
  }
  window.addEventListener('pagehide',persistDesign);

  function hash(a, b) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
  const clouds = presets.map(preset => {
    const points = [];
    let minV = Infinity, maxV = -Infinity;
    for (let row = 0; row < 85; row++) {
      const v = .12 + (row + .5) / 85 * 1.16;
      for (let column = 0; column < 85; column++) {
        const u = (column + .5) / 85 * 2 - 1;
        const upper = preset.upper(u), lower = preset.lower(u);
        if (v < upper || v > lower) continue;
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        points.push({ u, v, row, column, seed: hash(column, row), edge: Math.min(v - upper, lower - v, (1 - Math.abs(u)) * .3) });
      }
    }
    return { points, center: (minV + maxV) / 2, height: (maxV - minV) * 400 };
  });

  presets.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.preset = index;
    const label = document.createElement('span'); label.className = 'shape-name';
    const serial = document.createElement('span'); serial.textContent = number(index);
    button.append(serial, label); $('.pagination').append(button);
    const option = document.createElement('option'); option.value = index; $('#shape').append(option);
  });
  palette.forEach(colour => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.colour = colour.hex;
    button.style.setProperty('--swatch-colour', colour.hex); $('.quick-colours').append(button);
  });

  const atlasCache = new Map();
  function atlasFor(config) {
    const characters = [...(config.characters.trim() || '01')];
    const key = `${config.colour}:${characters.join('')}`;
    if (atlasCache.has(key)) return atlasCache.get(key);
    const atlas = document.createElement('canvas');
    const size = 36;
    atlas.width = characters.length * size;
    atlas.height = size;
    const context = atlas.getContext('2d');
    context.font = '600 27px Consolas, monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = config.colour;
    characters.forEach((character, i) => context.fillText(character, i * size + size / 2, size / 2));
    const result = { atlas, count: characters.length, size };
    if (atlasCache.size > 30) atlasCache.clear();
    atlasCache.set(key, result);
    return result;
  }

  const slots = [];
  for (let ordinal = -2; ordinal <= 2; ordinal++) {
    const button = document.createElement('button');
    button.className = 'mask-slide';
    button.type = 'button';
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    button.append(canvas);
    slidesRoot.append(button);
    const slot = { button, canvas, context: canvas.getContext('2d', { alpha: true }), ordinal, width: 0, height: 0, arrival: -1000, lastDraw: -1000 };
    slots.push(slot);
    button.addEventListener('click', () => {
      if (dragging?.moved) return;
      if (slot.ordinal === current) setCustomize(true);
      else selectOrdinal(slot.ordinal);
    });
  }

  function resizeCanvases() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    slots.forEach(slot => {
      const rect = slot.button.getBoundingClientRect();
      // CSS transforms scale the slide; use its layout dimensions for a crisp backing store.
      const width = slot.button.offsetWidth, height = slot.button.offsetHeight;
      if (!width || !height || !rect.width) return;
      if (slot.width === width && slot.height === height && slot.dpr === dpr) return;
      slot.width = width; slot.height = height; slot.dpr = dpr;
      slot.canvas.width = Math.round(width * dpr);
      slot.canvas.height = Math.round(height * dpr);
      slot.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    if (paused) drawAll(true);
  }
  new ResizeObserver(resizeCanvases).observe(gallery);

  function updateSlides(animateArrival = true) {
    for (const slot of slots) {
      let recycled = false;
      while (slot.ordinal < current - 2) { slot.ordinal += 5; recycled = true; }
      while (slot.ordinal > current + 2) { slot.ordinal -= 5; recycled = true; }
      if (recycled) slot.button.classList.add('is-recycled');
      const position = slot.ordinal - current;
      const selected = position === 0;
      const preset = presets[mod(slot.ordinal, presets.length)];
      const scale = selected ? 1 : .52;
      slot.button.style.transform = `translate3d(${ -50 + position * 68 }%,0,0) scale(${scale})`;
      slot.button.style.opacity = Math.abs(position) > 1 ? '0' : selected ? '1' : '.65';
      slot.button.style.zIndex = selected ? '2' : '1';
      slot.button.style.pointerEvents = Math.abs(position) > 1 || (customizing && !selected) ? 'none' : 'auto';
      slot.button.tabIndex = selected || (customizing && !selected) || Math.abs(position) > 1 ? -1 : 0;
      slot.button.setAttribute('aria-hidden', String(Math.abs(position) > 1 || (customizing && !selected)));
      slot.button.setAttribute('aria-label', t(selected ? 'customizeMask' : 'switchMask', { name: preset.name[language] }));
      slot.button.classList.toggle('is-selected', selected);
      if (selected && animateArrival) slot.arrival = clock;
      if (recycled) requestAnimationFrame(() => requestAnimationFrame(() => slot.button.classList.remove('is-recycled')));
    }
  }

  function updateCopy(immediate = false) {
    const index = mod(current, presets.length), preset = presets[index];
    const copy = $('.selection-copy');
    clearTimeout(copyTimer);
    const write = () => {
      $('#mask-name').textContent = preset.name[language];
      $('#mask-description').textContent = preset.description[language];
      $('#current-number').textContent = number(index);
      $('#total-number').textContent = String(count).padStart(2, '0');
      $('.editor-name').textContent = preset.name[language];
      $('.editor-number').textContent = `${number(index)} / ${String(count).padStart(2, '0')}`;
      copy.classList.remove('changing');
    };
    if (immediate || reducedMotion.matches) write();
    else { copy.classList.add('changing'); copyTimer = setTimeout(write, 150); }
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.preset) === index)));
    for (const [selector, offset] of [['.neighbour-left', -1], ['.neighbour-right', 1]]) {
      const neighbor = mod(current + offset, presets.length), element = $(selector);
      element.querySelector('.neighbour-index').textContent = String(neighbor + 1).padStart(2, '0');
      element.querySelector('.neighbour-name').textContent = presets[neighbor].name[language];
    }
  }

  function selectOrdinal(ordinal, fromEditor = false) {
    if ((customizing && !fromEditor) || ordinal === current) return;
    current = ordinal;
    saveDesign();
    updateSlides(); updateCopy();
    if (customizing) syncFields();
    if (paused) drawAll(true);
  }
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    const half = Math.floor(count / 2);
    const delta = mod(Number(button.dataset.preset) - mod(current, count) + half, count) - half;
    selectOrdinal(current + delta);
  }));

  function syncFields() {
    const config = settings[mod(current, count)];
    $('#shape').value = mod(current, count);
    $('#characters').value = config.characters;
    pickerHSV = hexToHsv(config.colour);
    colourError(false); syncColourUI();
    for (const name of ['movement', 'density']) {
      $(`#${name}`).value = config[name];
      $(`#${name}-value`).value = config[name];
    }
  }
  function transitionLayout(update, { enabled=true, direction='forward' } = {}) {
    const revision=++layoutRevision;
    if(layoutTransition) layoutTransition.skipTransition();
    clearTimeout(fallbackTimer);
    document.querySelectorAll('.route-entering').forEach(view=>view.classList.remove('route-entering'));
    const motion=enabled && !paused && !reducedMotion.matches && !document.hidden;
    if(!motion || typeof document.startViewTransition!=='function') {
      app.classList.remove('native-transition');
      update();
      if(motion) {
        const view=document.querySelector('[data-view]:not([hidden])');
        view?.classList.add('route-entering');
        fallbackTimer=setTimeout(()=>view?.classList.remove('route-entering'),600);
      }
      return;
    }
    app.classList.add('native-transition'); app.dataset.flow=direction;
    const transition=document.startViewTransition(()=>{
      if(revision!==layoutRevision) return;
      update(); resizeCanvases(); drawAll(true); resizeHomeCanvas(); renderHome();
    });
    layoutTransition=transition;
    transition.ready.catch(()=>{});
    transition.finished.catch(()=>{}).then(()=>{
      if(layoutTransition!==transition) return;
      layoutTransition=null; app.classList.remove('native-transition'); delete app.dataset.flow;
    });
  }
  function setCustomize(open, animate=true) {
    if (customizing === open) return;
    if(animate) { transitionLayout(()=>setCustomize(open,false),{direction:open?'forward':'back'}); return; }
    customizing = open;
    app.dataset.mode = open ? 'customize' : 'collection';
    if (app.dataset.page === 'collection') history.replaceState(null, '', open ? '#customize' : '#collection');
    $('.editor').inert = !open;
    syncModeLabels();
    updateSlides(false);
    clearTimeout(focusTimer);
    if (open) { syncFields(); $('.editor').scrollTop = 0; window.scrollTo({top:0,behavior:'instant'}); focusTimer = setTimeout(() => $('.back-button').focus({ preventScroll: true }), paused || reducedMotion.matches ? 0 : 450); }
    else if(app.dataset.page==='collection') { $('.customize-button').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: paused || reducedMotion.matches || app.classList.contains('native-transition') ? 'instant' : 'smooth' }); }
  }
  $('.customize-button').addEventListener('click', () => {
    if (customizing && !readHex()) { colourError(true); $('#colour-hex').focus(); return; }
    if (customizing) window.dispatchEvent(new CustomEvent('dpm:enter-live'));
    else setCustomize(true);
  });
  $('.back-button').addEventListener('click', () => setCustomize(false));
  $('#shape').addEventListener('change', event => {
    const half = Math.floor(count / 2);
    const delta = mod(Number(event.target.value) - mod(current, count) + half, count) - half;
    selectOrdinal(current + delta, true);
  });
  $('#characters').addEventListener('input', event => {
    settings[mod(current, count)].characters = [...event.target.value].slice(0, 12).join('');
    saveDesign();
    if (paused) drawAll(true);
  });
  for (const name of ['movement', 'density']) $(`#${name}`).addEventListener('input', event => {
    settings[mod(current, count)][name] = Number(event.target.value);
    saveDesign();
    $(`#${name}-value`).value = event.target.value;
    if (paused) drawAll(true);
  });
  $('.reset-button').addEventListener('click', () => {
    const index = mod(current, count);
    settings[index] = defaults(presets[index]);
    saveDesign();
    syncFields();
    if (paused) drawAll(true);
  });

  function syncMotion() {
    app.dataset.motion = paused ? 'paused' : 'running';
    $('.motion-button').setAttribute('aria-pressed', String(paused));
    $('.motion-button').setAttribute('aria-label', t(paused ? 'play' : 'pause'));
    $('.motion-symbol').textContent = paused ? '▷' : 'Ⅱ';
    $('.motion-label').textContent = t(paused ? 'motionOff' : 'motionOn');
    $('.home-replay').disabled = paused;
    homeArt.disabled = paused;
    if (paused) { layoutTransition?.skipTransition(); finishHomeEntrance(); renderHome(); }
  }
  $('.motion-button').addEventListener('click', () => { paused = !paused; syncMotion(); drawAll(true); });
  reducedMotion.addEventListener('change', event => { paused = event.matches; syncMotion(); drawAll(true); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; lastFrame = 0; });

  function syncModeLabels() {
    $('.customize-button > span:first-child').textContent = t(customizing ? 'done' : 'customize');
    $('.customize-button .button-arrow').textContent = '↗';
    $('.heading-eyebrow').textContent = t(customizing ? 'headingCustom' : 'headingCollection');
  }
  function setLanguage(nextLanguage) {
    language = nextLanguage;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', t(element.dataset.i18nAria)); });
    const heading = $('.home-title h1');
    heading.setAttribute('aria-label', t('brand'));
    heading.replaceChildren(...t('homeTitle').split('\n').map(line => {
      const reveal = document.createElement('span'), text = document.createElement('span');
      reveal.className = 'home-title-line'; text.textContent = line; reveal.append(text); return reveal;
    }));
    gallery.setAttribute('aria-roledescription', t('carouselRole'));
    document.querySelectorAll('[data-preset]').forEach(button => {
      const preset = presets[Number(button.dataset.preset)];
      button.querySelector('.shape-name').textContent = preset.name[language];
      button.setAttribute('aria-label', t('selectMask', { name: preset.name[language] }));
    });
    [...$('#shape').options].forEach((option, index) => { option.textContent = `${number(index)} / ${presets[index].name[language]}`; });
    document.querySelectorAll('[data-colour]').forEach((button, index) => {
      button.setAttribute('aria-label', palette[index][language]); button.title = palette[index][language];
    });
    syncModeLabels(); updateCopy(true); updateSlides(false); syncMotion(); syncColourUI(false);
    try { localStorage.setItem('dpm.language', language); } catch { /* Language selection remains available without storage. */ }
    window.dispatchEvent(new CustomEvent('dpm:language'));
  }
  $('.language-button').addEventListener('click', () => setLanguage(language === 'zh' ? 'en' : 'zh'));

  const wheel = $('#colour-wheel');
  function paintWheel() {
    const context = wheel.getContext('2d');
    const center = wheel.width / 2, radius = center * .93;
    context.clearRect(0, 0, wheel.width, wheel.height);
    const hues = context.createConicGradient(0, center, center);
    ['#F00','#FF0','#0F0','#0FF','#00F','#F0F','#F00'].forEach((colour, index) => hues.addColorStop(index / 6, colour));
    context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = hues; context.fill();
    const saturation = context.createRadialGradient(center, center, 0, center, center, radius);
    saturation.addColorStop(0, '#FFF'); saturation.addColorStop(1, '#FFFFFF00');
    context.fillStyle = saturation; context.fill();
  }
  function colourError(invalid) {
    $('#colour-hex').setAttribute('aria-invalid', String(invalid));
    $('#hex-error').hidden = !invalid;
  }
  function syncColourUI(writeHex = true) {
    const config = settings[mod(current, count)], { h, s, v } = pickerHSV;
    const radians = h * Math.PI / 180;
    $('.wheel-marker').style.left = `${50 + Math.cos(radians) * s * .465}%`;
    $('.wheel-marker').style.top = `${50 + Math.sin(radians) * s * .465}%`;
    $('.colour-preview').style.backgroundColor = config.colour;
    if (writeHex) $('#colour-hex').value = config.colour;
    $('.colour-readout').textContent = `${Math.round(h)}° · ${Math.round(s)}%`;
    wheel.setAttribute('aria-valuenow', String(Math.min(359, Math.round(h))));
    wheel.setAttribute('aria-valuetext', t('wheelValue', { h: Math.round(h), s: Math.round(s) }));
    $('#brightness').value = Math.round(v);
    $('#brightness-value').value = Math.round(v);
    $('#brightness').style.background = `linear-gradient(to right,#000,${hsvToHex({ h, s, v: 100 })})`;
    document.querySelectorAll('[data-colour]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.colour === config.colour)));
  }
  function applyColour(hex, preserveHSV = false) {
    settings[mod(current, count)].colour = hex.toUpperCase();
    saveDesign();
    if (!preserveHSV) pickerHSV = hexToHsv(hex);
    colourError(false); syncColourUI();
    if (paused) drawAll(true);
  }
  function colourFromPointer(event) {
    const rect = wheel.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    pickerHSV.h = mod(Math.atan2(y, x) * 180 / Math.PI, 360);
    pickerHSV.s = clamp(Math.hypot(x, y) / (rect.width * .465) * 100, 0, 100);
    applyColour(hsvToHex(pickerHSV), true);
  }
  let wheelPointer = null;
  wheel.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); wheel.focus({ preventScroll: true });
    wheelPointer = event.pointerId; wheel.setPointerCapture(event.pointerId); colourFromPointer(event);
  });
  wheel.addEventListener('pointermove', event => { if (event.pointerId === wheelPointer) colourFromPointer(event); });
  const releaseWheel = event => { if (event.pointerId === wheelPointer) { wheelPointer = null; if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId); } };
  wheel.addEventListener('pointerup', releaseWheel); wheel.addEventListener('pointercancel', releaseWheel);
  wheel.addEventListener('keydown', event => {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft') pickerHSV.h = mod(pickerHSV.h - step, 360);
    else if (event.key === 'ArrowRight') pickerHSV.h = mod(pickerHSV.h + step, 360);
    else if (event.key === 'ArrowUp') pickerHSV.s = clamp(pickerHSV.s + step, 0, 100);
    else if (event.key === 'ArrowDown') pickerHSV.s = clamp(pickerHSV.s - step, 0, 100);
    else if (event.key === 'Home') pickerHSV.h = 0;
    else if (event.key === 'End') pickerHSV.h = 359;
    else return;
    event.preventDefault(); applyColour(hsvToHex(pickerHSV), true);
  });
  $('#brightness').addEventListener('input', event => { pickerHSV.v = Number(event.target.value); applyColour(hsvToHex(pickerHSV), true); });
  $('.quick-colours').addEventListener('click', event => { const button = event.target.closest('[data-colour]'); if (button) applyColour(button.dataset.colour); });
  function readHex() { const match = $('#colour-hex').value.trim().match(/^#?([\da-f]{6})$/i); return match ? '#' + match[1].toUpperCase() : null; }
  $('#colour-hex').addEventListener('input', () => { const hex = readHex(); if (hex) applyColour(hex); });
  $('#colour-hex').addEventListener('blur', () => { const hex = readHex(); if (hex) applyColour(hex); else colourError(true); });

  const dialog = $('.project-dialog');
  document.querySelectorAll('.project-button').forEach(button=>button.addEventListener('click', () => dialog.showModal()));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && !event.composedPath().some(e => e !== dialog && e instanceof HTMLElement && dialog.contains(e))) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

  gallery.addEventListener('pointerdown', event => {
    if (customizing || event.button !== 0) return;
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  });
  gallery.addEventListener('pointermove', event => {
    const rect = gallery.getBoundingClientRect();
    pointer.targetX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    pointer.targetY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    if (!dragging || dragging.id !== event.pointerId) return;
    const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { dragging.moved = true; gallery.classList.add('is-dragging'); gallery.setPointerCapture(event.pointerId); }
    if (dragging.moved) {
      const amount = clamp(dx, -100, 100);
      for (const slot of slots) slot.canvas.style.transform = `translateX(${amount * (slot.ordinal === current ? .26 : .12)}px)`;
    }
  });
  function finishDrag(event, cancelled = false) {
    if (!dragging || dragging.finished || event.pointerId !== dragging.id) return;
    dragging.finished = true;
    const dx = event.clientX - dragging.x;
    if (!cancelled && dragging.moved && Math.abs(dx) > 45) selectOrdinal(current + (dx < 0 ? 1 : -1));
    slots.forEach(slot => { slot.canvas.style.transform = ''; });
    gallery.classList.remove('is-dragging');
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    // Keep the drag flag until the synthetic click has passed.
    setTimeout(() => { dragging = null; }, 0);
  }
  gallery.addEventListener('pointerup', event => finishDrag(event));
  gallery.addEventListener('pointercancel', event => finishDrag(event, true));
  gallery.addEventListener('pointerleave', () => { pointer.targetX = 0; pointer.targetY = 0; });
  window.addEventListener('pointerup', event => finishDrag(event));
  document.addEventListener('keydown', event => {
    if (app.dataset.page && app.dataset.page !== 'collection') return;
    if (event.target.matches('input, textarea, select') || dialog.open) return;
    if (event.key === 'Escape' && customizing) { setCustomize(false); return; }
    if (customizing) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); selectOrdinal(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); selectOrdinal(current + 1); }
  });

  function drawSlot(slot, force) {
    const offset = slot.ordinal - current;
    if (Math.abs(offset) > 1 || (customizing && offset !== 0) || !slot.width) return;
    const active = offset === 0;
    if (!force && clock - slot.lastDraw < (active ? 1 / 30 : 1 / 12)) return;
    slot.lastDraw = clock;
    const context = slot.context, w = slot.width, h = slot.height;
    context.clearRect(0, 0, w, h);
    const index = mod(slot.ordinal, count), config = settings[index], preset = presets[index], cloud = clouds[index];
    const sprite = atlasFor(config);
    const scale = Math.min(w / Math.max(570, 484 * preset.width + 60), h / Math.max(460, cloud.height + 65));
    const wave = config.movement / 100;
    const t = clock;
    const yaw = active ? pointer.x * .19 + Math.sin(t * .35) * .13 : Math.sin(t * .28 + index) * .1;
    const pitch = active ? pointer.y * .055 : .012;
    const reflow = active && !paused ? Math.sin(clamp((clock - slot.arrival) / .8, 0, 1) * Math.PI) : 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const density = config.density / 100;
    const digitPhase = Math.floor(t * 2);
    for (const point of cloud.points) {
      const { u, v, seed, edge, column, row } = point;
      if (seed > density) continue;
      const flow = Math.sin(v * 14 - t * .8 + u * 2.8);
      if (preset.pattern === 'contour' && edge > .04 && Math.sin(v * 30 + u * 7 - t * .45) > -.55) continue;
      let px = u * 242 * preset.width;
      let py = (v - cloud.center) * 400;
      let depth = (1 - u * u) * 40 + Math.cos((v - .55) * 4) * 12;
      px += Math.sin(v * 11 + t * .65 + u * 3) * wave * (preset.pattern === 'flow' ? 18 : 9);
      py += Math.sin(u * 5 + t * .7) * wave * (preset.pattern === 'flow' ? 9 : 5);
      px += (seed - .5) * reflow * 25;
      py += Math.sin(seed * 30) * reflow * 12;
      const x = px * cos + depth * sin;
      depth = depth * cos - px * sin;
      const y = py + depth * pitch;
      const lens = 700 / (700 - depth);
      const edgeFade = .5 + .5 * clamp(edge / .045, 0, 1);
      const shading = .62 + .24 * Math.cos(u * 2.3 - yaw * 3) + .1 * flow;
      let opacity = edgeFade * shading * (.8 + seed * .2);
      if (preset.pattern === 'flow') opacity *= .6 + .4 * Math.pow((flow + 1) / 2, .5);
      const size = (8.1 + seed * 1.1) * scale * lens;
      const charIndex = mod(column + row * 3 + Math.floor(seed * 27) + digitPhase * (seed > .6 ? 1 : 0), sprite.count);
      context.globalAlpha = clamp(opacity, .06, .9);
      context.drawImage(sprite.atlas, charIndex * sprite.size, 0, sprite.size, sprite.size, w / 2 + x * scale * lens - size / 2, h / 2 + y * scale * lens - size / 2, size, size);
    }
    context.globalAlpha = 1;
  }
  function drawAll(force = false) { slots.forEach(slot => drawSlot(slot, force)); }
  function animate(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const delta = Math.min((timestamp - lastFrame) / 1000, .06);
    lastFrame = timestamp;
    if (visible && !paused && (!app.dataset.page || ['home','collection'].includes(app.dataset.page))) {
      clock += delta;
      pointer.x += (pointer.targetX - pointer.x) * .055;
      pointer.y += (pointer.targetY - pointer.y) * .055;
      if (app.dataset.page === 'home') {
        homeElapsed += delta; homePulse += delta;
        homePointer.x += (homePointer.targetX-homePointer.x)*.09;
        homePointer.y += (homePointer.targetY-homePointer.y)*.09;
        if(clock-lastHomeDraw>1/30) { renderHome(); lastHomeDraw=clock; }
        if(homeOpening && homeElapsed>homeDuration+.15) finishHomeEntrance();
      } else drawAll();
    }
    requestAnimationFrame(animate);
  }
  function paintPreview(canvas, config, time = 0) {
    const index = Math.max(0, presets.findIndex(p => p.id === config.shape));
    const preset = presets[index], cloud = clouds[index], sprite = atlasFor(config);
    const context = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const scale = Math.min(w / (550 * preset.width), h / (cloud.height + 70));
    context.clearRect(0,0,w,h);
    for (const point of cloud.points) {
      if (point.seed > config.density / 100) continue;
      if (preset.pattern === 'contour' && point.edge > .04 && Math.sin(point.v * 30 + point.u * 7) > -.55) continue;
      const size = (8.1 + point.seed) * scale;
      const glyph = mod(point.column + point.row * 3 + Math.floor(point.seed * 27) + Math.floor(time*2)*(point.seed>.6?1:0), sprite.count);
      const flow=Math.sin(point.v*11+time*.65+point.u*3)*config.movement/100*(time?9:0);
      context.globalAlpha = .55 + Math.min(point.edge / .045,1) * .3;
      context.drawImage(sprite.atlas,glyph*sprite.size,0,sprite.size,sprite.size,w/2+(point.u*242*preset.width+flow)*scale-size/2,h/2+(point.v-cloud.center)*400*scale-size/2,size,size);
    }
    context.globalAlpha=1;
  }
  function finishHomeEntrance() {
    homeElapsed=homeDuration+.2; homeOpening=false;
    home.classList.remove('home-entering'); app.classList.remove('home-opening');
  }
  function enterHome(settled=false) {
    homeElapsed=paused || settled ? homeDuration+.2 : 0; homePulse=10;
    homePointer.active=false; homePointer.x=homePointer.y=homePointer.targetX=homePointer.targetY=0;
    home.classList.remove('home-entering'); app.classList.remove('home-opening');
    if(!paused && !settled) {
      // Restart the reveal only when entering this page or explicitly replaying it.
      void home.offsetWidth;
      home.classList.add('home-entering'); app.classList.add('home-opening'); homeOpening=true;
      homeStartedAt=performance.now();
    }
    renderHome();
  }
  function resizeHomeCanvas() {
    const rect=homeArt.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    if(!rect.width || !rect.height) return;
    const width=Math.round(homeArt.clientWidth*dpr), height=Math.round(homeArt.clientHeight*dpr);
    if(homeCanvas.width!==width || homeCanvas.height!==height) { homeCanvas.width=width; homeCanvas.height=height; renderHome(); }
  }
  new ResizeObserver(resizeHomeCanvas).observe(homeArt);
  function leaveHome() { finishHomeEntrance(); homePointer.active=false; }
  function pointAtHome(event) {
    const rect=homeArt.getBoundingClientRect();
    homePointer.targetX=(event.clientX-rect.left)/rect.width*2-1;
    homePointer.targetY=(event.clientY-rect.top)/rect.height*2-1;
    homePointer.active=event.pointerType!=='touch';
  }
  homeArt.addEventListener('pointermove',pointAtHome);
  homeArt.addEventListener('pointerleave',()=>{homePointer.active=false; homePointer.targetX=homePointer.targetY=0;});
  homeArt.addEventListener('click',event=>{
    if(paused) return;
    if(event.detail) {
      const wasActive=homePointer.active;
      pointAtHome(event); homePointer.active=wasActive;
    }
    pulseX=event.detail?homePointer.targetX:0; pulseY=event.detail?homePointer.targetY:0; homePulse=0;
  });
  $('.home-replay').addEventListener('click',()=>enterHome());
  function renderHome() {
    if(!window.MaskUI || app.dataset.page!=='home') return;
    if(homeOpening) homeElapsed=(performance.now()-homeStartedAt)/1000;
    const config=window.MaskUI.selected, index=Math.max(0,presets.findIndex(p=>p.id===config.shape));
    const preset=presets[index], cloud=clouds[index], sprite=atlasFor(config);
    const ctx=homeCanvas.getContext('2d'), w=homeCanvas.width, h=homeCanvas.height;
    const scale=Math.min(w/(540*preset.width),h/(cloud.height+50));
    const time=paused?0:clock, yaw=paused?0:homePointer.x*.16+Math.sin(time*.25)*.07;
    const progress=paused?1:clamp(homeElapsed/homeDuration,0,1);
    const pointerX=w*(homePointer.x+1)/2, pointerY=h*(homePointer.y+1)/2;
    const interactionScale=w/(homeArt.clientWidth||w);
    ctx.clearRect(0,0,w,h);
    // A sparse fringe keeps the field open; the same characters form the solid surface.
    for(let i=0;i<105;i++) {
      const angle=hash(i,12)*Math.PI*2, radius=.67+hash(i,24)*.2;
      const x=w/2+Math.cos(angle)*w*radius*.57, y=h/2+Math.sin(angle)*h*radius*.52;
      const size=7+hash(i,36)*3, glyph=i%sprite.count;
      ctx.globalAlpha=(.04+hash(i,48)*.065)*Math.min(progress*2,1);
      ctx.drawImage(sprite.atlas,glyph*sprite.size,0,sprite.size,sprite.size,x+Math.sin(time*.3+i)*5,y+Math.cos(time*.25+i)*6,size,size);
    }
    for(const point of cloud.points) {
      const {u,v,seed,edge,row,column}=point;
      if(seed>config.density/100) continue;
      if(preset.pattern==='contour' && edge>.04 && Math.sin(v*30+u*7)>-.55) continue;
      const local=clamp((progress-seed*.2)/.8,0,1), gather=1-Math.pow(1-local,3);
      const depth=(1-u*u)*43;
      const flow=Math.sin(v*11+time*.65+u*3)*config.movement/100*9;
      let x=w/2+((u*242*preset.width+flow)*Math.cos(yaw)+depth*Math.sin(yaw))*scale;
      let y=h/2+((v-cloud.center)*400+Math.sin(u*5+time*.7)*config.movement/100*4)*scale;
      x+=(seed-.5)*w*.95*(1-gather); y+=(hash(row,column)-.5)*h*1.1*(1-gather);
      if(!paused) {
        const dx=x-pointerX, dy=y-pointerY, distance=Math.hypot(dx,dy);
        const force=homePointer.active?Math.pow(Math.max(0,1-distance/(170*interactionScale)),2)*42*interactionScale:0;
        if(distance>1) { x+=dx/distance*force; y+=dy/distance*force; }
        const rx=x-w*(pulseX+1)/2, ry=y-h*(pulseY+1)/2, rd=Math.hypot(rx,ry);
        const ripple=Math.exp(-Math.pow((rd-homePulse*600*interactionScale)/(95*interactionScale),2))*Math.max(0,1-homePulse/1.5)*35*interactionScale;
        if(rd>1) { x+=rx/rd*ripple; y+=ry/rd*ripple; }
      }
      const size=(8.6+seed)*scale*(.8+.2*gather);
      const glyph=mod(column+row*3+Math.floor(seed*27)+Math.floor(time*2)*(seed>.6?1:0),sprite.count);
      ctx.globalAlpha=(.2+.8*gather)*(.4+Math.min(edge/.055,1)*.42);
      ctx.drawImage(sprite.atlas,glyph*sprite.size,0,sprite.size,sprite.size,x-size/2,y-size/2,size,size);
    }
    ctx.globalAlpha=1;
  }
  window.MaskUI = {
    get language() { return language; }, t,
    get selected() { return { shape:presets[mod(current,count)].id, ...settings[mod(current,count)], characters:settings[mod(current,count)].characters.trim() || '01' }; },
    setCustomize, setLanguage, paintPreview, enterHome, leaveHome, renderHome, transitionLayout,
    refresh() { resizeCanvases(); drawAll(true); },
    useConfig(config) {
      const index=presets.findIndex(preset=>preset.id===config.shape);
      if(index<0) return;
      current=index; settings[index]={ characters:config.characters, colour:config.colour, movement:config.movement, density:config.density };
      updateSlides(); updateCopy(true); syncFields(); persistDesign(); drawAll(true);
    }
  };
  pickerHSV = hexToHsv(settings[mod(current,count)].colour);
  paintWheel(); setLanguage(language); resizeCanvases(); drawAll(true);
  requestAnimationFrame(animate);
})();
