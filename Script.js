/* ═══════════════════════════════════════════════════════════════
   CLOUD APP — script.js
   Vanilla JS · Offline · localStorage
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── STORAGE ────────────────────────────────────────────────── */
const DB = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('cloud_' + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem('cloud_' + key, JSON.stringify(val)); } catch {}
  },
  remove(key) { localStorage.removeItem('cloud_' + key); }
};

/* ─── STATE ──────────────────────────────────────────────────── */
const State = {
  notes:      DB.get('notes', []),
  categories: DB.get('categories', ['Personal','Friends','Family','School','Work']),
  events:     DB.get('events', {}),       // { 'YYYY-MM-DD': [{id,title,type,time}] }
  mindmaps:   DB.get('mindmaps', []),
  settings:   DB.get('settings', { accent:'#ff6600', fontSize:16, dateFormat:'ymd', weekStart:0 }),

  save() {
    DB.set('notes', this.notes);
    DB.set('categories', this.categories);
    DB.set('events', this.events);
    DB.set('mindmaps', this.mindmaps);
    DB.set('settings', this.settings);
  }
};

/* ─── UTILITIES ──────────────────────────────────────────────── */
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtDate = d => {
  const dt = new Date(d), y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,'0'), day=String(dt.getDate()).padStart(2,'0');
  const f = State.settings.dateFormat;
  if(f==='dmy') return `${day}/${m}/${y}`;
  if(f==='mdy') return `${m}/${day}/${y}`;
  return `${y}-${m}-${day}`;
};
const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const EVENT_ICONS = { reminder:'⏰', birthday:'🎂', task:'📌', meeting:'💼', anniversary:'💍', custom:'⭐' };

/* ─── APPLY SETTINGS ─────────────────────────────────────────── */
function applySettings() {
  document.documentElement.style.setProperty('--accent', State.settings.accent);
  // derive glow colors from hex
  const hex = State.settings.accent;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-dim', `rgb(${Math.round(r*.7)},${Math.round(g*.7)},${Math.round(b*.7)})`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`);
  document.documentElement.style.setProperty('--accent-glow-soft', `rgba(${r},${g},${b},0.15)`);
  document.documentElement.style.fontSize = State.settings.fontSize + 'px';
}

/* ══════════════════════════════════════════════════════════════
   SPLASH
══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  applySettings();
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.remove();
      document.getElementById('app').classList.remove('hidden');
      initApp();
    }, 600);
  }, 2000);
});

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
let currentPage = 'notepad';

function initApp() {
  initNav();
  initNotepad();
  initCalendar();
  initMindMapList();
  initSettings();
  initModals();
}

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === currentPage) return;
      switchPage(page);
    });
  });
}

function switchPage(page) {
  const prev = document.getElementById('page-' + currentPage);
  const next = document.getElementById('page-' + page);
  if (!prev || !next) return;
  prev.classList.remove('active');
  next.classList.add('active');
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  if (page === 'calendar') renderCalendar();
  if (page === 'mindmap') renderMindMapList();
}

/* ══════════════════════════════════════════════════════════════
   MODAL / SHEET SYSTEM
══════════════════════════════════════════════════════════════ */
let sheetBackdropHandler = null;

function showModal(id) {
  const bd = document.getElementById('modal-backdrop');
  const m  = document.getElementById(id);
  bd.classList.remove('hidden');
  m.classList.remove('hidden');
  requestAnimationFrame(() => { requestAnimationFrame(() => { m.classList.add('show'); }); });
  bd.onclick = () => hideModal(id);
}
function hideModal(id) {
  const bd = document.getElementById('modal-backdrop');
  const m  = document.getElementById(id);
  m.classList.remove('show');
  setTimeout(() => { m.classList.add('hidden'); bd.classList.add('hidden'); bd.onclick = null; }, 200);
}

function showSheet(id) {
  const bd = document.getElementById('modal-backdrop');
  const sh = document.getElementById(id);
  bd.classList.remove('hidden');
  sh.classList.remove('hidden');
  requestAnimationFrame(() => { requestAnimationFrame(() => { sh.classList.add('show'); }); });
  sheetBackdropHandler = () => hideSheet(id);
  bd.onclick = sheetBackdropHandler;
}
function hideSheet(id) {
  const bd = document.getElementById('modal-backdrop');
  const sh = document.getElementById(id);
  sh.classList.remove('show');
  setTimeout(() => { sh.classList.add('hidden'); bd.classList.add('hidden'); bd.onclick = null; }, 350);
}

function showConfirm(title, text, onOk) {
  document.getElementById('modal-confirm-title').textContent = title;
  document.getElementById('modal-confirm-text').textContent  = text;
  showModal('modal-confirm');
  const okBtn = document.getElementById('modal-confirm-ok');
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.addEventListener('click', () => { hideModal('modal-confirm'); onOk(); });
  document.getElementById('modal-confirm-cancel').onclick = () => hideModal('modal-confirm');
}

function initModals() {
  document.getElementById('modal-confirm-cancel').onclick = () => hideModal('modal-confirm');
}

/* ══════════════════════════════════════════════════════════════
   NOTEPAD
══════════════════════════════════════════════════════════════ */
let activeCat = null;   // null = all
let activeNoteId = null;
let activeNoteOptionsId = null;
let activeCatOptionsId  = null;
let autosaveTimer = null;

function initNotepad() {
  renderCategories();
  renderNotes();

  // FAB
  document.getElementById('fab-note').addEventListener('click', () => openEditor(null));

  // Category add
  document.getElementById('cat-add-btn').addEventListener('click', () => {
    document.getElementById('modal-cat-input').value = '';
    showModal('modal-cat');
    setTimeout(() => document.getElementById('modal-cat-input').focus(), 300);
  });
  document.getElementById('modal-cat-cancel').onclick = () => hideModal('modal-cat');
  document.getElementById('modal-cat-confirm').onclick = () => {
    const name = document.getElementById('modal-cat-input').value.trim();
    if (!name) return;
    State.categories.push(name);
    State.save();
    renderCategories();
    hideModal('modal-cat');
  };
  document.getElementById('modal-cat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modal-cat-confirm').click();
  });

  // Note settings btn
  document.getElementById('notepad-settings-btn').addEventListener('click', openSettings);

  // Note options sheet
  document.getElementById('sheet-edit').addEventListener('click', () => {
    hideSheet('note-options-sheet');
    openEditor(activeNoteOptionsId);
  });
  document.getElementById('sheet-duplicate').addEventListener('click', () => {
    hideSheet('note-options-sheet');
    const note = State.notes.find(n => n.id === activeNoteOptionsId);
    if (!note) return;
    const dup = { ...note, id: uid(), title: note.title + ' (copy)', modified: Date.now(), created: Date.now() };
    State.notes.unshift(dup);
    State.save();
    renderNotes();
  });
  document.getElementById('sheet-move-cat').addEventListener('click', () => {
    hideSheet('note-options-sheet');
    openMoveCatSheet(activeNoteOptionsId);
  });
  document.getElementById('sheet-open-mm').addEventListener('click', () => {
    hideSheet('note-options-sheet');
    const note = State.notes.find(n => n.id === activeNoteOptionsId);
    if (!note) return;
    const mmId = note.mindmapId || null;
    openMindMapCanvas(mmId, note.title, activeNoteOptionsId);
  });
  document.getElementById('sheet-delete').addEventListener('click', () => {
    hideSheet('note-options-sheet');
    showConfirm('DELETE NOTE', 'This note will be permanently deleted.', () => {
      State.notes = State.notes.filter(n => n.id !== activeNoteOptionsId);
      State.save();
      renderNotes();
    });
  });

  // Category options sheet
  document.getElementById('sheet-cat-rename').addEventListener('click', () => {
    hideSheet('cat-options-sheet');
    const oldName = activeCatOptionsId;
    document.getElementById('modal-cat-input').value = oldName;
    showModal('modal-cat');
    document.getElementById('modal-cat-confirm').onclick = () => {
      const newName = document.getElementById('modal-cat-input').value.trim();
      if (!newName) return;
      const idx = State.categories.indexOf(oldName);
      if (idx !== -1) State.categories[idx] = newName;
      State.notes.forEach(n => { if (n.category === oldName) n.category = newName; });
      if (activeCat === oldName) activeCat = newName;
      State.save();
      renderCategories();
      renderNotes();
      hideModal('modal-cat');
    };
  });
  document.getElementById('sheet-cat-delete').addEventListener('click', () => {
    hideSheet('cat-options-sheet');
    showConfirm('DELETE CATEGORY', `Delete "${activeCatOptionsId}"? Notes will move to uncategorized.`, () => {
      State.categories = State.categories.filter(c => c !== activeCatOptionsId);
      State.notes.forEach(n => { if (n.category === activeCatOptionsId) n.category = null; });
      if (activeCat === activeCatOptionsId) activeCat = null;
      State.save();
      renderCategories();
      renderNotes();
    });
  });
}

function renderCategories() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';

  // All
  const allLi = document.createElement('li');
  allLi.className = 'cat-item' + (activeCat === null ? ' active' : '');
  allLi.innerHTML = `<span class="cat-icon">📋</span><span>ALL</span>`;
  allLi.addEventListener('click', () => { activeCat = null; renderCategories(); renderNotes(); });
  list.appendChild(allLi);

  State.categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'cat-item' + (activeCat === cat ? ' active' : '');
    const icons = { Personal:'👤', Friends:'👥', Family:'🏠', School:'📚', Work:'💼' };
    const icon = icons[cat] || '🏷';
    li.innerHTML = `<span class="cat-icon">${icon}</span><span>${esc(cat.slice(0,6))}</span>`;
    li.addEventListener('click', (e) => {
      activeCat = cat; renderCategories(); renderNotes();
    });
    li.addEventListener('contextmenu', e => { e.preventDefault(); openCatOptionsSheet(cat); });
    li.addEventListener('touchstart', (() => {
      let t; return () => { t = setTimeout(() => openCatOptionsSheet(cat), 500); };
    })());
    li.addEventListener('touchend', () => clearTimeout(undefined));
    list.appendChild(li);
  });
}

function renderNotes() {
  const grid  = document.getElementById('notes-grid');
  const empty = document.getElementById('empty-state');
  const label = document.getElementById('notes-cat-name');
  const count = document.getElementById('notes-count');

  let notes = State.notes.filter(n => activeCat === null || n.category === activeCat);
  label.textContent = activeCat ? activeCat.toUpperCase() : 'ALL NOTES';
  count.textContent = notes.length;
  grid.innerHTML = '';

  if (notes.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  notes.forEach((note, i) => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.style.animationDelay = (i * 0.05) + 's';
    const hasMap = !!note.mindmapId;
    card.innerHTML = `
      <div class="note-card-title">${esc(note.title || 'Untitled')}</div>
      <div class="note-card-date">${fmtDate(note.modified)}</div>
      <div class="note-card-footer">
        <span class="note-card-cat">${esc(note.category || 'general')}</span>
        <div style="display:flex;align-items:center;gap:6px">
          ${hasMap ? '<span class="note-has-mm">🧠</span>' : ''}
          <button class="note-card-options" data-id="${note.id}">⋮</button>
        </div>
      </div>`;
    card.addEventListener('click', e => {
      if (e.target.classList.contains('note-card-options')) return;
      openEditor(note.id);
    });
    card.querySelector('.note-card-options').addEventListener('click', e => {
      e.stopPropagation();
      openNoteOptionsSheet(note.id, note.title);
    });
    grid.appendChild(card);
  });
}

function openNoteOptionsSheet(id, title) {
  activeNoteOptionsId = id;
  document.getElementById('sheet-note-title').textContent = (title || 'Untitled').toUpperCase();
  showSheet('note-options-sheet');
}
function openCatOptionsSheet(cat) {
  activeCatOptionsId = cat;
  document.getElementById('sheet-cat-name').textContent = cat.toUpperCase();
  showSheet('cat-options-sheet');
}
function openMoveCatSheet(noteId) {
  const list = document.getElementById('move-cat-list');
  list.innerHTML = '';
  const cats = [null, ...State.categories];
  cats.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'sheet-item';
    li.textContent = cat ? cat : '— Uncategorized';
    li.addEventListener('click', () => {
      const note = State.notes.find(n => n.id === noteId);
      if (note) { note.category = cat; State.save(); renderNotes(); }
      hideSheet('move-cat-sheet');
    });
    list.appendChild(li);
  });
  showSheet('move-cat-sheet');
}

/* ──────────────────────────────── NOTE EDITOR */
function openEditor(noteId) {
  let note;
  if (noteId) {
    note = State.notes.find(n => n.id === noteId);
  }
  if (!note) {
    note = {
      id: uid(), title: '', content: '',
      category: activeCat || null,
      created: Date.now(), modified: Date.now(),
      mindmapId: null
    };
    State.notes.unshift(note);
    State.save();
    noteId = note.id;
  }
  activeNoteId = note.id;

  document.getElementById('editor-title').value  = note.title;
  document.getElementById('editor-content').innerHTML = note.content || '';
  document.getElementById('editor-meta').textContent =
    `MODIFIED: ${fmtDate(note.modified)} · CAT: ${note.category || 'none'}`;

  const overlay = document.getElementById('note-editor');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('show')); });
  document.getElementById('editor-title').focus();
}

function closeEditor() {
  saveCurrentNote();
  const overlay = document.getElementById('note-editor');
  overlay.classList.remove('show');
  setTimeout(() => { overlay.classList.add('hidden'); activeNoteId = null; }, 350);
  renderNotes();
}

function saveCurrentNote(silent = false) {
  if (!activeNoteId) return;
  const note = State.notes.find(n => n.id === activeNoteId);
  if (!note) return;
  note.title    = document.getElementById('editor-title').value.trim() || 'Untitled';
  note.content  = document.getElementById('editor-content').innerHTML;
  note.modified = Date.now();
  State.save();
  if (!silent) {
    const ind = document.getElementById('autosave-indicator');
    ind.classList.add('show');
    setTimeout(() => ind.classList.remove('show'), 1500);
  }
}

// Editor setup
document.getElementById('editor-back').addEventListener('click', closeEditor);

document.getElementById('editor-title').addEventListener('input', () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveCurrentNote(), 1000);
});
document.getElementById('editor-content').addEventListener('input', () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveCurrentNote(), 1000);
});
document.getElementById('editor-save').addEventListener('click', () => saveCurrentNote());

// Toolbar formatting
document.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('editor-content').focus();
    document.execCommand(btn.dataset.cmd, false, null);
  });
});

// Link insert
document.getElementById('tb-link').addEventListener('click', () => {
  const url = prompt('Enter URL:');
  if (url) {
    document.getElementById('editor-content').focus();
    document.execCommand('createLink', false, url);
  }
});

// Image insert
document.getElementById('editor-img-btn').addEventListener('click', () => {
  document.getElementById('img-file-input').click();
});
document.getElementById('img-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.createElement('img');
    img.src = ev.target.result;
    const content = document.getElementById('editor-content');
    content.focus();
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.insertNode(img);
      range.collapse(false);
    } else { content.appendChild(img); }
    saveCurrentNote(true);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// Editor mind map btn
document.getElementById('editor-mm-btn').addEventListener('click', () => {
  if (!activeNoteId) return;
  const note = State.notes.find(n => n.id === activeNoteId);
  saveCurrentNote(true);
  openMindMapCanvas(note.mindmapId || null, note.title, activeNoteId);
});

/* ══════════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════════ */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selectedDate = null;

function initCalendar() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  // Swipe on calendar grid
  let touchStartX = 0;
  const calGrid = document.getElementById('cal-days');
  calGrid.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive:true });
  calGrid.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      if (dx < 0) document.getElementById('cal-next').click();
      else document.getElementById('cal-prev').click();
    }
  });

  document.getElementById('fab-event').addEventListener('click', () => {
    if (!selectedDate) return alert('Please select a date first.');
    openAddEventModal();
  });
  document.getElementById('modal-event-cancel').onclick = () => hideModal('modal-event');
  document.getElementById('modal-event-confirm').onclick = addEvent;
  document.getElementById('cal-settings-btn').addEventListener('click', openSettings);
}

function renderCalendar() {
  const display = document.getElementById('cal-month-display');
  display.textContent = `${calYear} ${MONTHS[calMonth]}`;

  const grid  = document.getElementById('cal-days');
  grid.innerHTML = '';

  const today   = new Date();
  const todayStr = toDateStr(today);
  const w
