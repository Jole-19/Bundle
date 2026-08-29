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

const TAB_GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

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
let activeGroups = {};
let editingId = null;
let typingTimer = null;

const $ = (sel) => document.querySelector(sel);

async function refreshActiveGroups() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      activeGroups = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_GROUPS' }) || {};
    }
  } catch (err) {
    console.warn('Failed to refresh active groups:', err);
    activeGroups = {};
  }
}

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

  // Assign distinct default colors to collections if missing or duplicated
  let updated = false;
  const usedColors = new Set();
  collections.forEach((col) => {
    if (!col.color || usedColors.has(col.color)) {
      const available = TAB_GROUP_COLORS.find(c => !usedColors.has(c)) || TAB_GROUP_COLORS[usedColors.size % TAB_GROUP_COLORS.length];
      col.color = available;
      updated = true;
    }
    usedColors.add(col.color);
  });

  if (updated) {
    saveCollections();
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
      color: $('#input-color')?.value || 'blue',
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
      renderColorPicker(draft.color || 'blue');
      renderIconPicker(draft.icon || 'package');
      $('#form-overlay').style.display = '';
      sm.onFormOpen();
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

// ─── Color Helpers ───────────────────────────────────────────────────
function getNextAvailableColor() {
  const usedColors = collections.map(c => c.color).filter(Boolean);
  const unused = TAB_GROUP_COLORS.find(c => !usedColors.includes(c));
  if (unused) return unused;
  return TAB_GROUP_COLORS[collections.length % TAB_GROUP_COLORS.length];
}

function renderColorPicker(selectedColor = 'blue') {
  const container = $('#color-picker');
  const hiddenInput = $('#input-color');
  const badgeLabel = $('#selected-color-name');
  if (!container || !hiddenInput) return;

  const validColor = TAB_GROUP_COLORS.includes(selectedColor) ? selectedColor : getNextAvailableColor();
  hiddenInput.value = validColor;
  if (badgeLabel) badgeLabel.textContent = validColor;

  container.innerHTML = TAB_GROUP_COLORS.map(c => `
    <button type="button" class="color-swatch-option ${c === validColor ? 'selected' : ''}" data-color="${c}" title="${c}"></button>
  `).join('');

  container.querySelectorAll('.color-swatch-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      container.querySelectorAll('.color-swatch-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const chosenColor = btn.dataset.color;
      hiddenInput.value = chosenColor;
      if (badgeLabel) badgeLabel.textContent = chosenColor;
      saveDraft();
      sm.onUserTyping();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => sm.onUserStoppedTyping(), 1000);
    });
  });
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

  list.innerHTML = collections.map((c, i) => {
    const key = c.name ? c.name.trim() : '';
    const groupInfo = activeGroups[key] || activeGroups[key.toLowerCase()];
    const isGroupActive = !!groupInfo;
    const isCollapsed = groupInfo ? groupInfo.collapsed : false;

    const statusBadge = isGroupActive
      ? `<span class="collection-status-tag ${isCollapsed ? 'collapsed' : ''}"><span class="status-dot"></span>${isCollapsed ? 'Collapsed' : 'Open'}</span>`
      : '';

    const toggleButton = isGroupActive
      ? `<button class="btn-action toggle-group" title="${isCollapsed ? 'Expand tab group' : 'Collapse tab group'}" data-index="${i}" data-group-id="${groupInfo.id}">
           <svg viewBox="0 0 24 24"><use href="#icon-${isCollapsed ? 'chevron-up' : 'chevron-down'}"></use></svg>
         </button>`
      : '';

    const closeButton = isGroupActive
      ? `<button class="btn-action close-group" title="Close active tab group" data-index="${i}" data-group-id="${groupInfo.id}">
           <svg viewBox="0 0 24 24"><use href="#icon-close-group"></use></svg>
         </button>`
      : '';

    return `
      <div class="collection-card ${isGroupActive ? 'has-active-group' : ''}" data-index="${i}">
        <div class="collection-icon">
          <svg viewBox="0 0 24 24"><use href="#icon-${getValidIcon(c)}"></use></svg>
        </div>
        <div class="collection-info">
          <div class="collection-name">
            ${escapeHtml(c.name)}
            ${statusBadge}
          </div>
          <div class="collection-count">
            <span class="collection-color-pill ${escapeHtml(c.color || 'blue')}"></span>
            ${c.urls.length} item${c.urls.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div class="collection-actions">
          ${toggleButton}
          ${closeButton}
          <button class="btn-action edit" title="Edit" data-index="${i}">
            <svg viewBox="0 0 24 24"><use href="#icon-edit"></use></svg>
          </button>
          <button class="btn-action delete" title="Delete" data-index="${i}">
            <svg viewBox="0 0 24 24"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

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

  list.querySelectorAll('.btn-action.toggle-group').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const col = collections[idx];
      if (col && typeof chrome !== 'undefined' && chrome.runtime) {
        const groupId = parseInt(btn.dataset.groupId) || undefined;
        await chrome.runtime.sendMessage({
          type: 'TOGGLE_GROUP_COLLAPSE',
          title: col.name,
          groupId
        });
        await refreshActiveGroups();
        renderCollections();
      }
    });
  });

  list.querySelectorAll('.btn-action.close-group').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const col = collections[idx];
      if (col && typeof chrome !== 'undefined' && chrome.runtime) {
        const groupId = parseInt(btn.dataset.groupId) || undefined;
        await chrome.runtime.sendMessage({
          type: 'CLOSE_GROUP',
          title: col.name,
          groupId
        });
        sm.onCollectionDeleted();
        await refreshActiveGroups();
        renderCollections();
      }
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
      requestDeleteCollection(parseInt(btn.dataset.index));
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
        title: col.name,
        color: col.color || 'blue'
      });
      if (result && result.failed > 0) {
        sm.onTabsError();
      } else {
        sm.onTabsOpened();
      }
      await refreshActiveGroups();
      renderCollections();
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

// ─── Delete collection modal ─────────────────────────────────────────
let pendingDeleteIndex = null;

function requestDeleteCollection(index) {
  pendingDeleteIndex = index;
  const col = collections[index];
  if (!col) return;

  const nameEl = $('#delete-target-name');
  if (nameEl) nameEl.textContent = `"${col.name}"`;

  const overlay = $('#delete-confirm-overlay');
  if (overlay) overlay.style.display = '';

  sm.transition(MASCOT_STATES.SAD);
}

function closeDeleteConfirmModal() {
  const overlay = $('#delete-confirm-overlay');
  if (overlay) overlay.style.display = 'none';
  pendingDeleteIndex = null;
  sm.onPopupOpen(collections.length > 0);
}

async function confirmDeleteCollection() {
  if (pendingDeleteIndex === null) return;
  const index = pendingDeleteIndex;

  const overlay = $('#delete-confirm-overlay');
  if (overlay) overlay.style.display = 'none';
  pendingDeleteIndex = null;

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
  renderColorPicker(getNextAvailableColor());
  renderIconPicker('package');
  collapseIconPicker();
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
  saveDraft();
  sm.onFormOpen();
}

function openEditForm(index) {
  editingId = index;
  const col = collections[index];
  $('#form-title').textContent = 'Edit Collection';
  $('#input-name').value = col.name;
  $('#input-urls').value = col.urls.join('\n');
  renderColorPicker(col.color || 'blue');
  renderIconPicker(getValidIcon(col));
  collapseIconPicker();
  $('#form-overlay').style.display = '';
  $('#input-name').focus();
  saveDraft();
  sm.onFormOpen();
}

async function closeForm() {
  $('#form-overlay').style.display = 'none';
  editingId = null;
  await clearDraft();
  sm.stopFormLoop();
  sm.onUserStoppedTyping();
}

async function saveForm() {
  const name = $('#input-name').value.trim();
  const color = $('#input-color')?.value || 'blue';
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

  const entry = { name, color, icon, urls, id: Date.now().toString(36) };

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

  sm.transition(MASCOT_STATES.THINKING);
  selectedTabUrls.clear();

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const tabs = await chrome.tabs.query({ lastFocusedWindow: true });
      openTabsList = tabs.filter(t => t.url && /^https?:\/\//i.test(t.url));
    } else {
      // Mock tabs for testing outside chrome extension context (matching Image 1)
      openTabsList = [
        { id: 1, title: 'Multi-link chrome extension with custom...', url: 'https://claude.ai/chat/4df03d4a-c158-4270-83...', favIconUrl: 'https://claude.ai/favicon.ico' },
        { id: 2, title: 'localhost', url: 'http://localhost:5190/#etat=idle', favIconUrl: '' },
        { id: 3, title: 'These UI libraries + AI = beautiful looking ...', url: 'https://www.youtube.com/watch?v=hglonrdRTS...', favIconUrl: 'https://www.youtube.com/s/desktop/f27ef640/img/favicon.ico' },
        { id: 4, title: 'Variables and Operators | The Odin Proje...', url: 'https://www.theodinproject.com/lessons/found...', favIconUrl: 'https://www.theodinproject.com/favicon.ico' },
        { id: 5, title: 'As a designer, how to convert design to l...', url: 'https://www.youtube.com/watch?v=design_to_code', favIconUrl: 'https://www.youtube.com/s/desktop/f27ef640/img/favicon.ico' }
      ];
    }
  } catch (err) {
    console.error('Failed to load tabs for picker:', err);
    openTabsList = [];
  }

  // Leave tabs unselected by default
  selectedTabUrls.clear();

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
        <div class="custom-tab-checkbox ${isChecked ? 'checked' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        ${favicon
        ? `<img class="tab-favicon" src="${escapeHtml(favicon)}" onerror="this.outerHTML='<div class=\\'tab-favicon-fallback\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/><line x1=\\'2\\' y1=\\'12\\' x2=\\'22\\' y2=\\'12\\'/></svg></div>'"/>`
        : `<div class="tab-favicon-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg></div>`
      }
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

// Typing & focus/blur detection & auto-drafting
['#input-name', '#input-urls'].forEach(sel => {
  const el = $(sel);
  if (el) {
    el.addEventListener('focus', () => {
      sm.transition(MASCOT_STATES.EXCITED);
    });
    el.addEventListener('blur', () => {
      sm.onUserStoppedTyping();
    });
    el.addEventListener('input', () => {
      saveDraft();
      sm.onUserTyping();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => sm.onUserStoppedTyping(), 1500);
    });
  }
});

// Delete modal button listeners
const btnDeleteCancel = $('#btn-delete-cancel');
const btnDeleteConfirm = $('#btn-delete-confirm');
if (btnDeleteCancel) btnDeleteCancel.addEventListener('click', closeDeleteConfirmModal);
if (btnDeleteConfirm) btnDeleteConfirm.addEventListener('click', confirmDeleteCollection);

// Close overlay on backdrop click
$('#form-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeForm();
});
$('#tab-picker-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTabPicker();
});
const deleteOverlay = $('#delete-confirm-overlay');
if (deleteOverlay) {
  deleteOverlay.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteConfirmModal();
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#delete-confirm-overlay') && $('#delete-confirm-overlay').style.display !== 'none') {
      closeDeleteConfirmModal();
    } else if ($('#tab-picker-overlay').style.display !== 'none') {
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

// ─── Intro Splash Animation ──────────────────────────────────────────
async function playIntroSplash() {
  const splashOverlay = $('#intro-splash');
  const splashMascot = $('#splash-mascot-svg');
  const splashMascotWrap = $('#splash-mascot-wrap');
  const splashTitle = $('#splash-title');

  if (!splashOverlay || !splashMascot) return;

  // Single static mascot state (excited) with subtle entrance pulse
  splashMascot.setAttribute('data', '../assets/mascot/animations/excited.svg');
  if (splashMascotWrap) {
    splashMascotWrap.classList.add('pulse');
  }

  await new Promise(r => setTimeout(r, 200));

  // Pop in the word "Bundle"
  if (splashTitle) {
    splashTitle.classList.add('pop-in');
  }

  // Hold the full Mascot + "Bundle" splash state for 2 seconds (2000ms)
  await new Promise(r => setTimeout(r, 1200));

  // CRT TV Power-Off collapse effect
  splashOverlay.classList.add('tv-off');

  await new Promise(r => setTimeout(r, 1000));

  splashOverlay.style.display = 'none';
}

// ─── Boot ────────────────────────────────────────────────────────────
(async () => {
  await loadSvgSprite();
  await loadCollections();
  await refreshActiveGroups();
  renderCollections();
  await restoreDraft();
  await playIntroSplash();
})();
