// Bundle — Background service worker
// Handles tab opening, tab grouping, and relays state changes to the popup.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_COLLECTION') {
    openCollection(msg).then((result) => sendResponse(result));
    return true; // keep the message channel open for async response
  }
});

async function openCollection({ urls = [], title = '', color = 'blue' }) {
  const results = { opened: 0, failed: 0, errors: [], existing: false };

  try {
    // Check if a tab group with matching title already exists
    if (chrome.tabGroups && chrome.tabGroups.query && title) {
      const existingGroups = await chrome.tabGroups.query({ title });
      if (existingGroups && existingGroups.length > 0) {
        const group = existingGroups[0];
        // Expand the group if collapsed and update color if changed
        const validColor = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'].includes(color) ? color : 'blue';
        await chrome.tabGroups.update(group.id, { collapsed: false, color: validColor });

        // Focus the first tab in the existing group
        if (chrome.tabs && chrome.tabs.query) {
          const groupTabs = await chrome.tabs.query({ groupId: group.id });
          if (groupTabs && groupTabs.length > 0) {
            await chrome.tabs.update(groupTabs[0].id, { active: true });
            if (groupTabs[0].windowId) {
              await chrome.windows.update(groupTabs[0].windowId, { focused: true });
            }
          }
        }

        results.existing = true;
        return results;
      }
    }
  } catch (err) {
    console.warn('Error checking existing tab group:', err);
  }

  const tabIds = [];

  for (const entry of urls) {
    try {
      let url = entry;
      // If it's a search query (no protocol), wrap it in a Google search
      if (!/^https?:\/\//i.test(url) && !/^chrome/i.test(url)) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
      const tab = await chrome.tabs.create({ url, active: false });
      if (tab && tab.id) {
        tabIds.push(tab.id);
      }
      results.opened++;
    } catch (err) {
      results.failed++;
      results.errors.push(err.message);
    }
  }

  // Group tabs if any were created
  if (tabIds.length > 0 && chrome.tabs && chrome.tabs.group) {
    try {
      const groupId = await chrome.tabs.group({ tabIds });
      if (chrome.tabGroups && chrome.tabGroups.update) {
        const validColor = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'].includes(color) ? color : 'blue';
        await chrome.tabGroups.update(groupId, {
          title: title || 'Bundle',
          color: validColor
        });
      }
    } catch (groupErr) {
      console.error('Failed to group tabs:', groupErr);
    }
  }

  return results;
}
