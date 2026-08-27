/**
 * Bundle — Popup Controller
 * Wires the mascot SVG animations, state machine, collections CRUD, and Chrome APIs together.
 */

// ─── State ───────────────────────────────────────────────────────────
let collections = [];
let editingId = null;
let typingTimer = null;

const $ = (sel) => document.querySelector(sel);

// ─── State Machine ───────────────────────────────────────────────────
const mascotEl = $('#mascot-svg');
const labelEl = $('#mascot-label');
const sm = new BundleStateMachine(mascotEl, labelEl);

// ─── Storage ─────────────────────────────────────────────────────────
async function loadCollections() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get('collections');
      collections = data.collections || [];
    } else {
      collections = JSON.parse(localStorage.getItem('bundle_collections') || '[]');
    }
  } catch {
    collections = JSON.parse(localStorage.getItem('bundle_collections') || '[]');
  }
}

async function saveCollections() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ collections });
    } else {
      localStorage.setItem('bundle_collections', JSON.stringify(collections));
    }
  } catch {
    localStorage.setItem('bundle_collections', JSON.stringify(collections));
  }
}

// ─── Render collections list ─────────────────────────────────────────
function renderCollections() {
  const list = $('#collections-list');
  const empty = $('#empty-state');

  if (collections.length === 0) {
    list.innerHTML = '';
    empty.style.display = '';
    sm.onPopupOpen(false);
    return;
  }

  empty.style.display = 'none';
  sm.onPopupOpen(true);

  list.innerHTML = collections.map((c, i) => `
    <div class="collection-card" data-index="${i}">
      <div class="collection-emoji">${c.emoji || '📦'}</div>
      <div class="collection-info">
        <div class="collection-name">${escapeHtml(c.name)}</div>
        <div class="collection-count">${c.urls.length} item${c.urls.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="collection-actions">
        <button class="btn-action edit" title="Edit" data-index="${i}">✏️</button>
        <button class="btn-action delete" title="Delete" data-index="${i}">🗑</button>
      </div>
    </div>
  `).join('');

  // Bind events
  list.querySelectorAll('.collection-card').forEach(card => {
    const idx = parseInt(card.dataset.index);

    card.addEventListener('mouseenter', () => sm.onCollectionHover());
    card.addEventListener('mouseleave', () => sm.onCollectionHoverEnd());

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-action')) return;
      openCollection(idx, card);
    });
  });

  list.querySelectorAll('.btn-action.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditForm(parseInt(btn.dataset.index));
    });
  });

  list.querySelectorAll('.btn-action.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCollection(parseInt(btn.dataset.index));
    });
  });
}

// ─── Open collection ─────────────────────────────────────────────────
async function openCollection(index, cardEl) {
  const col = collections[index];
  if (!col || !col.urls.length) return;

  sm.onCollectionClick();
  if (cardEl) cardEl.classList.add('opening');

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      const result = await chrome.runtime.sendMessage({
        type: 'OPEN_COLLECTION',
        urls: col.urls,
      });
      if (result && result.failed > 0) {
        sm.onTabsError();
      } else {
        sm.onTabsOpened();
      }
    } else {
      // Local dev fallback
      col.urls.forEach(url => {
        let finalUrl = url;
        if (!/^https?:\/\//i.test(url)) {
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
        window.open(finalUrl, '_blank');
      });
      sm.onTabsOpened();
    }
  } catch (err) {
    console.error('Failed to open collection:', err);
    sm.onTabsError();
  }

  setTimeout(() => {
    if (cardEl) cardEl.classList.remove('opening');
  }, 400);
}

// ─── Delete collection ───────────────────────────────────────────────
async function deleteCollection(index) {
  collections.splice(index, 1);
  await saveCollections();
  sm.onCollectionDeleted();
  renderCollections();
}

// ─── Form ────────────────────────────────────────────────────────────
function openNewForm() {
  editingId = null;
  $('#form-title').textContent = 'New Collection';
  $('#input-name').value = '';
  $('#input-emoji').value = '';
  $('#input-urls').value = '';
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
}

function openEditForm(index) {
  editingId = index;
  const col = collections[index];
  $('#form-title').textContent = 'Edit Collection';
  $('#input-name').value = col.name;
  $('#input-emoji').value = col.emoji || '';
  $('#input-urls').value = col.urls.join('\n');
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
}

function closeForm() {
  $('#form-overlay').style.display = 'none';
  editingId = null;
  sm.onUserStoppedTyping();
}

async function saveForm() {
  const name = $('#input-name').value.trim();
  const emoji = $('#input-emoji').value.trim() || '📦';
  const urlsRaw = $('#input-urls').value.trim();

  if (!name) {
    sm.onTabsError();
    $('#input-name').focus();
    return;
  }

  const urls = urlsRaw.split('\n').map(u => u.trim()).filter(Boolean);

  if (urls.length === 0) {
    sm.onTabsError();
    $('#input-urls').focus();
    return;
  }

  const entry = { name, emoji, urls, id: Date.now().toString(36) };

  if (editingId !== null) {
    entry.id = collections[editingId].id || entry.id;
    collections[editingId] = entry;
  } else {
    collections.push(entry);
  }

  await saveCollections();
  closeForm();
  renderCollections();
  sm.onTabsOpened();
}

// ─── Event bindings ──────────────────────────────────────────────────
$('#btn-add').addEventListener('click', openNewForm);
$('#btn-empty-add').addEventListener('click', openNewForm);
$('#btn-cancel').addEventListener('click', closeForm);
$('#btn-save').addEventListener('click', saveForm);

// Typing detection — switch mascot to typing-wink while user types
['#input-name', '#input-emoji', '#input-urls'].forEach(sel => {
  $(sel).addEventListener('input', () => {
    sm.onUserTyping();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => sm.onUserStoppedTyping(), 1500);
  });
});

// Close overlay on backdrop click
$('#form-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeForm();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeForm();
  if (e.key === 'Enter' && e.ctrlKey && $('#form-overlay').style.display !== 'none') {
    saveForm();
  }
});

// ─── Utility ─────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Boot ────────────────────────────────────────────────────────────
(async () => {
  await loadCollections();
  renderCollections();
})();
