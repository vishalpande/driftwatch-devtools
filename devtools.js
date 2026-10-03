// devtools.js — Creates the Driftwatch panel and buffers calls.
// This page loads as soon as DevTools opens; panel.js only loads when the tab is first
// clicked, so calls made before that would otherwise be lost.
const tabId = chrome.devtools.inspectedWindow.tabId;
const buffer = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'API_CALL' && sender.tab?.id === tabId) {
    buffer.push(msg.payload);
    if (buffer.length > 500) buffer.shift();
  } else if (msg?.type === 'DW_GET_BUFFER' && msg.tabId === tabId) {
    sendResponse(buffer.slice());
  } else if (msg?.type === 'DW_CLEAR' && msg.tabId === tabId) {
    buffer.length = 0;
  }
});

chrome.devtools.panels.create(
  "\u26A1 Driftwatch",   // Panel tab title
  "",                      // Icon path (empty = default)
  "panel.html"             // The panel UI
);
