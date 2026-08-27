/**
 * Bundle — Popup Controller
 * Wires the mascot SVG animations, state machine, collections CRUD, clean SVG icons, draft persistence, tab capture, and Chrome APIs.
 */

// ─── Constants & Icon Registry ───────────────────────────────────────
const AVAILABLE_ICONS = [
  'school', 'work', 'design', 'terminal', 'video', 'money', 'travel', 'health',
  'database', 'chip', 'cloud', 'shield', 'fire', 'mail', 'target', 'calendar',
  'search', 'settings', 'layers', 'layout', 'image', 'key', 'lock', 'tag',
  'writing', 'headphones', 'film', 'pin', 'flag', 'trophy', 'gift', 'sun',
  'package', 'folder', 'star', 'heart', 'bookmark', 'code', 
  'palette', 'globe', 'music', 'camera', 'book', 'bolt', 
  'bag', 'gamepad', 'coffee', 'link'
];

const EMOJI_FALLBACK_MAP = {
  '📦': 'package',
  '🎨': 'palette',
  '⭐': 'star',
  '❤️': 'heart',
  '🔖': 'bookmark',
  '💻': 'code',
  '🌐': 'globe',
  '🎵': 'music',
  '📷': 'camera',
  '📚': 'book',
  '⚡': 'bolt',
  '🛍️': 'bag',
  '🎮': 'gamepad',
  '☕': 'coffee',
  '🔗': 'link',
  '📁': 'folder'
};

// ─── State ───────────────────────────────────────────────────────────
let collections = [];
let editingId = null;
let typingTimer = null;

const $ = (sel) => document.querySelector(sel);

// ─── State Machine ───────────────────────────────────────────────────
const mascotEl = $('#mascot-svg');
const labelEl = $('#mascot-label');
const formMascotEl = $('#form-mascot-svg');
const sm = new BundleStateMachine(mascotEl, labelEl, formMascotEl);

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

// ─── Form Draft Persistence (prevents losing unsaved work when tab switches) ─
async function saveDraft() {
  const overlay = $('#form-overlay');
  if (overlay && overlay.style.display !== 'none') {
    const draft = {
      isOpen: true,
      editingId,
      name: $('#input-name').value,
      icon: $('#input-icon').value || 'package',
      urls: $('#input-urls').value
    };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ bundle_form_draft: draft });
      } else {
        localStorage.setItem('bundle_form_draft', JSON.stringify(draft));
      }
    } catch (e) {
      console.error('Draft save failed:', e);
    }
  }
}

async function clearDraft() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove('bundle_form_draft');
    } else {
      localStorage.removeItem('bundle_form_draft');
    }
  } catch (e) {
    console.error('Draft clear failed:', e);
  }
}

async function restoreDraft() {
  try {
    let draft = null;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const res = await chrome.storage.local.get('bundle_form_draft');
      draft = res.bundle_form_draft;
    } else {
      draft = JSON.parse(localStorage.getItem('bundle_form_draft') || 'null');
    }

    if (draft && draft.isOpen) {
      editingId = draft.editingId;
      $('#form-title').textContent = editingId !== null ? 'Edit Collection' : 'New Collection (Draft Restored)';
      $('#input-name').value = draft.name || '';
      $('#input-urls').value = draft.urls || '';
      renderIconPicker(draft.icon || 'package');
      $('#form-overlay').style.display = '';
      sm.onUserTyping();
      setTimeout(() => sm.onUserStoppedTyping(), 1000);
    }
  } catch (err) {
    console.error('Failed to restore draft:', err);
  }
}

// ─── SVG Sprite loader ───────────────────────────────────────────────
async function loadSvgSprite() {
  try {
    const res = await fetch('../assets/icons/ui-icons.svg');
    const svgText = await res.text();
    const container = $('#svg-sprite-container');
    if (container) container.innerHTML = svgText;
  } catch (err) {
    console.error('Failed to load SVG sprite:', err);
  }
}

// ─── Icon Helpers ────────────────────────────────────────────────────
function getValidIcon(col) {
  if (col.icon && AVAILABLE_ICONS.includes(col.icon)) return col.icon;
  if (col.emoji && EMOJI_FALLBACK_MAP[col.emoji]) return EMOJI_FALLBACK_MAP[col.emoji];
  return 'package';
}

function updateSelectedIconPreview(iconName) {
  const previewSvg = $('#selected-icon-svg');
  if (previewSvg) {
    previewSvg.innerHTML = `<use href="#icon-${iconName}"></use>`;
  }
}

function collapseIconPicker() {
  const picker = $('#icon-picker');
  const btn = $('#btn-toggle-icons');
  const btnText = $('#toggle-icon-text');
  if (picker) picker.classList.add('collapsed');
  if (btn) btn.classList.remove('open');
  if (btnText) btnText.textContent = 'More Icons';
}

function renderIconPicker(selectedIcon = 'package') {
  const container = $('#icon-picker');
  const hiddenInput = $('#input-icon');
  if (!container || !hiddenInput) return;

  hiddenInput.value = selectedIcon;
  updateSelectedIconPreview(selectedIcon);

  container.innerHTML = AVAILABLE_ICONS.map(icon => `
    <button type="button" class="icon-option ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}" data-tooltip="${icon}">
      <svg viewBox="0 0 24 24"><use href="#icon-${icon}"></use></svg>
    </button>
  `).join('');

  container.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hiddenInput.value = btn.dataset.icon;
      updateSelectedIconPreview(btn.dataset.icon);
      saveDraft();
      sm.onUserTyping();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => sm.onUserStoppedTyping(), 1000);
    });
  });
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
      <div class="collection-icon">
        <svg viewBox="0 0 24 24"><use href="#icon-${getValidIcon(c)}"></use></svg>
      </div>
      <div class="collection-info">
        <div class="collection-name">${escapeHtml(c.name)}</div>
        <div class="collection-count">${c.urls.length} item${c.urls.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="collection-actions">
        <button class="btn-action edit" title="Edit" data-index="${i}">
          <svg viewBox="0 0 24 24"><use href="#icon-edit"></use></svg>
        </button>
        <button class="btn-action delete" title="Delete" data-index="${i}">
          <svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
        </button>
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

// ─── Form & Tab Helpers ──────────────────────────────────────────────
function openNewForm() {
  editingId = null;
  $('#form-title').textContent = 'New Collection';
  $('#input-name').value = '';
  $('#input-urls').value = '';
  renderIconPicker('package');
  collapseIconPicker();
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
  saveDraft();
}

function openEditForm(index) {
  editingId = index;
  const col = collections[index];
  $('#form-title').textContent = 'Edit Collection';
  $('#input-name').value = col.name;
  $('#input-urls').value = col.urls.join('\n');
  renderIconPicker(getValidIcon(col));
  collapseIconPicker();
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
  saveDraft();
}

async function closeForm() {
  $('#form-overlay').style.display = 'none';
  editingId = null;
  await clearDraft();
  sm.onUserStoppedTyping();
}

async function saveForm() {
  const name = $('#input-name').value.trim();
  const icon = $('#input-icon').value || 'package';
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

  const entry = { name, icon, urls, id: Date.now().toString(36) };

  if (editingId !== null) {
    entry.id = collections[editingId].id || entry.id;
    collections[editingId] = entry;
  } else {
    collections.push(entry);
  }

  await saveCollections();
  await clearDraft();
  $('#form-overlay').style.display = 'none';
  editingId = null;
  renderCollections();
  sm.onTabsOpened();
}

// ─── Tab capture & Interactive Tab Picker ─────────────────────────────
function appendUrlToTextarea(urlToAdd) {
  const textarea = $('#input-urls');
  const existing = textarea.value.split('\n').map(u => u.trim()).filter(Boolean);
  if (!existing.includes(urlToAdd)) {
    existing.push(urlToAdd);
    textarea.value = existing.join('\n');
    saveDraft();
  }
}

let openTabsList = [];
let selectedTabUrls = new Set();

async function openTabPicker() {
  const overlay = $('#tab-picker-overlay');
  if (!overlay) return;

  selectedTabUrls.clear();

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
      openTabsList = tabs.filter(t => t.url && /^https?:\/\//i.test(t.url));
    } else {
      // Mock tabs for testing outside chrome extension context
      openTabsList = [
        { id: 1, title: 'Dribbble - Discover Top Designs', url: 'https://dribbble.com/search/white-websites', favIconUrl: 'https://dribbble.com/favicon.ico' },
        { id: 2, title: 'Pinterest - Visual Discovery Engine', url: 'https://pinterest.com', favIconUrl: 'https://pinterest.com/favicon.ico' },
        { id: 3, title: 'shadcn/ui - Beautifully Designed Components', url: 'https://ui.shadcn.com', favIconUrl: 'https://ui.shadcn.com/favicon.ico' },
        { id: 4, title: 'GitHub: Where the world builds software', url: 'https://github.com', favIconUrl: 'https://github.com/favicon.ico' }
      ];
    }
  } catch (err) {
    console.error('Failed to load tabs for picker:', err);
    openTabsList = [];
  }

  // Pre-select all tabs by default
  openTabsList.forEach(t => selectedTabUrls.add(t.url));

  renderTabPickerList();
  overlay.style.display = '';
}

function renderTabPickerList() {
  const container = $('#tab-picker-list');
  const confirmBtn = $('#btn-tab-picker-confirm');
  const toggleBtn = $('#btn-toggle-select-all');

  if (!container) return;

  if (openTabsList.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 24px; color: rgba(254,245,217,0.6); font-size: 12px;">No open website tabs found</div>`;
    if (confirmBtn) confirmBtn.textContent = '+ Add Selected';
    return;
  }

  const allSelected = selectedTabUrls.size === openTabsList.length;
  if (toggleBtn) toggleBtn.textContent = allSelected ? 'Deselect All' : 'Select All';

  if (confirmBtn) {
    confirmBtn.textContent = `+ Add Selected (${selectedTabUrls.size})`;
  }

  container.innerHTML = openTabsList.map(t => {
    const isChecked = selectedTabUrls.has(t.url);
    const favicon = t.favIconUrl || '';
    
    return `
      <div class="tab-item-row ${isChecked ? 'selected' : ''}" data-url="${escapeHtml(t.url)}">
        <input type="checkbox" class="tab-checkbox" ${isChecked ? 'checked' : ''} />
        ${favicon ? `<img class="tab-favicon" src="${escapeHtml(favicon)}" onerror="this.style.display='none'" />` : ''}
        <div class="tab-info">
          <div class="tab-title">${escapeHtml(t.title || t.url)}</div>
          <div class="tab-url-sub">${escapeHtml(t.url)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Row click listeners
  container.querySelectorAll('.tab-item-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const url = row.dataset.url;
      if (selectedTabUrls.has(url)) {
        selectedTabUrls.delete(url);
      } else {
        selectedTabUrls.add(url);
      }
      renderTabPickerList();
    });
  });
}

function toggleSelectAllTabs() {
  if (selectedTabUrls.size === openTabsList.length) {
    selectedTabUrls.clear();
  } else {
    openTabsList.forEach(t => selectedTabUrls.add(t.url));
  }
  renderTabPickerList();
}

function confirmSelectedTabs() {
  selectedTabUrls.forEach(url => appendUrlToTextarea(url));
  closeTabPicker();
  sm.onTabsOpened();
}

function closeTabPicker() {
  const overlay = $('#tab-picker-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function addAllTabs() {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
      const validUrls = tabs
        .map(t => t.url)
        .filter(url => url && /^https?:\/\//i.test(url));
      validUrls.forEach(url => appendUrlToTextarea(url));
    }
    sm.onTabsOpened();
  } catch (err) {
    console.error('Failed to query all tabs:', err);
  }
}

// ─── Popout Window ───────────────────────────────────────────────────
function popoutWindow() {
  if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.create) {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 400,
      height: 600
    });
  } else {
    window.open(window.location.href, 'BundleWindow', 'width=400,height=600');
  }
}

// ─── Event bindings ──────────────────────────────────────────────────
$('#btn-add').addEventListener('click', openNewForm);
$('#btn-empty-add').addEventListener('click', openNewForm);
$('#btn-cancel').addEventListener('click', closeForm);
$('#btn-save').addEventListener('click', saveForm);
$('#btn-popout').addEventListener('click', popoutWindow);
$('#btn-add-select-tabs').addEventListener('click', openTabPicker);
$('#btn-add-all-tabs').addEventListener('click', addAllTabs);
$('#btn-tab-picker-cancel').addEventListener('click', closeTabPicker);
$('#btn-tab-picker-confirm').addEventListener('click', confirmSelectedTabs);
$('#btn-toggle-select-all').addEventListener('click', toggleSelectAllTabs);

const toggleIconHeader = $('#toggle-icon-picker');
if (toggleIconHeader) {
  toggleIconHeader.addEventListener('click', () => {
    const picker = $('#icon-picker');
    const btn = $('#btn-toggle-icons');
    const btnText = $('#toggle-icon-text');
    if (picker) {
      const isCollapsed = picker.classList.toggle('collapsed');
      if (btn) btn.classList.toggle('open', !isCollapsed);
      if (btnText) btnText.textContent = isCollapsed ? 'More Icons' : 'Show Less';
    }
  });
}

// Typing detection & auto-drafting
['#input-name', '#input-urls'].forEach(sel => {
  const el = $(sel);
  if (el) {
    el.addEventListener('input', () => {
      saveDraft();
      sm.onUserTyping();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => sm.onUserStoppedTyping(), 1500);
    });
  }
});

// Close overlay on backdrop click
$('#form-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeForm();
});
$('#tab-picker-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTabPicker();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#tab-picker-overlay').style.display !== 'none') {
      closeTabPicker();
    } else {
      closeForm();
    }
  }
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
  await loadSvgSprite();
  await loadCollections();
  renderCollections();
  await restoreDraft();
})();
