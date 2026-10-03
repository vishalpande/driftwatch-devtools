// content-script.js — isolated world relay: page (MAIN world) -> extension
window.addEventListener('message', e => {
  if (e.source !== window || e.data?.source !== 'driftwatch') return;
  try {
    // Rejects with "Receiving end does not exist" when DevTools isn't open; that's expected.
    chrome.runtime.sendMessage(e.data).catch(() => {});
  } catch (_) {} // "Extension context invalidated" after the extension is reloaded
});
