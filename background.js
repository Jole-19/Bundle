// Bundle — Background service worker
// Handles tab opening and relays state changes to the popup.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_COLLECTION') {
    openCollection(msg.urls).then((result) => sendResponse(result));
    return true; // keep the message channel open for async response
  }
});

async function openCollection(urls) {
  const results = { opened: 0, failed: 0, errors: [] };

  for (const entry of urls) {
    try {
      let url = entry;
      // If it's a search query (no protocol), wrap it in a Google search
      if (!/^https?:\/\//i.test(url) && !/^chrome/i.test(url)) {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
      await chrome.tabs.create({ url, active: false });
      results.opened++;
    } catch (err) {
      results.failed++;
      results.errors.push(err.message);
    }
  }

  return results;
}
