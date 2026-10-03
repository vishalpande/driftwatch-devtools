// panel.js — Receives messages and renders the drift log

let totalCalls = 0, totalDrifts = 0;

const tabId = chrome.devtools.inspectedWindow.tabId;

// Live calls (devtools.js buffers the same ones, so skip duplicates already replayed)
const seen = new Set();
const key = d => d.timestamp + d.method + d.url;
function show(d) {
  if (seen.has(key(d))) return;
  seen.add(key(d));
  renderEntry(d);
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== 'API_CALL' || sender.tab?.id !== tabId) return;
  show(msg.payload);
});

// Replay calls captured before this panel was first opened
chrome.runtime.sendMessage({ type: 'DW_GET_BUFFER', tabId }, buffered => {
  if (chrome.runtime.lastError || !Array.isArray(buffered)) return;
  buffered.forEach(show);
});

// The interceptor only attaches when a page loads; warn if this tab was loaded before the extension
chrome.devtools.inspectedWindow.eval('!!window.__driftwatch', active => {
  if (active === false) {
    document.getElementById('notice').hidden = false;
  }
});

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderEntry(data) {
  totalCalls++;
  if (data.hasDrift) totalDrifts++;

  document.getElementById('empty')?.remove();
  document.getElementById('counter').textContent =
    `${totalCalls} calls · ${totalDrifts} drift${totalDrifts !== 1 ? 's' : ''}`;

  const entry = document.createElement('div');
  entry.className = `entry ${data.hasDrift ? 'drift' : 'clean'}`;

  entry.innerHTML = `
    <div class="entry-top">
      <span class="method">${esc(data.method)}</span>
      <span class="url" title="${esc(data.url)}">${esc(data.url)}</span>
      <span class="latency">${data.latency}ms</span>
      ${data.hasDrift
        ? `<span class="drift-badge">⚠ ${data.diffs.length} DRIFT${data.diffs.length > 1 ? 'S' : ''}</span>`
        : data.checked === 0
          ? `<span class="latency">no UI fields matched</span>`
          : `<span class="ok-badge">✓ IN SYNC · ${data.checked} fields</span>`}
    </div>
    <div class="ts">${new Date(data.timestamp).toLocaleTimeString()}</div>
  `;

  if (data.hasDrift) {
    const detail = document.createElement('div');
    detail.className = 'drift-detail';
    detail.innerHTML = `
      <div class="diff-header">
        <span>Field</span>
        <span>API Value</span>
        <span>UI Value</span>
      </div>
      ${data.diffs.slice(0, 10).map(d => `
        <div class="diff-row">
          <span class="diff-field">${esc(d.path)} <small>(${esc(d.source)})</small></span>
          <span class="diff-api">${esc(JSON.stringify(d.apiValue))}</span>
          <span class="diff-ui">${esc(JSON.stringify(d.uiValue))}</span>
        </div>
      `).join('')}
    `;
    entry.appendChild(detail);

    entry.addEventListener('click', () => {
      detail.classList.toggle('open');
    });
  }

  document.getElementById('log').prepend(entry);
}

function clearLog() {
  chrome.runtime.sendMessage({ type: 'DW_CLEAR', tabId });
  seen.clear();
  totalCalls = 0; totalDrifts = 0;
  document.getElementById('log').innerHTML =
    '<div class="empty" id="empty"><p>Log cleared.</p></div>';
  document.getElementById('counter').textContent = '0 calls · 0 drifts';
}

document.getElementById('clear').addEventListener('click', clearLog);
