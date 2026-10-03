// Driftwatch — interceptor.js (runs in the page's MAIN world)
// Intercepts fetch + XHR, then checks each JSON response field against what the UI shows.
//
// Two UI sources are checked, with zero instrumentation:
//   1. State stores (window.__redux_store__, window.__zustand_stores__), matched by field name
//   2. The rendered DOM, matched by data-testid / id / name / itemprop / class == field name
// A field is "drift" when the UI exposes a place for it but none of them shows the API value.

(() => {
if (window.__driftwatch) return; // already injected
window.__driftwatch = true;

const MAX_LEAVES = 500;
const MAX_ELEMENTS = 6000;

// ─── Helpers ────────────────────────────────────────────────────────────────
// "totalPrice", "total_price", "total-price" -> "totalprice"
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Flatten an object into [{ path, key, value }] for primitive leaves
function flatten(obj, path = '', out = [], depth = 0) {
  if (out.length >= MAX_LEAVES || depth > 8 || obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    obj.slice(0, 20).forEach((v, i) => flatten(v, `${path}[${i}]`, out, depth + 1));
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(k => flatten(obj[k], path ? `${path}.${k}` : k, out, depth + 1));
  } else if (typeof obj !== 'function' && typeof obj !== 'boolean') {
    if (typeof obj === 'string' && (obj.length > 80 || !obj.trim())) return out;
    const key = path.split('.').pop().replace(/\[\d+\]$/, '');
    if (key) out.push({ path, key, value: obj });
  }
  return out;
}

// Pull numbers out of display text: "₹3,999.00" -> [3999], "4 items" -> [4]
function numbersIn(text) {
  return (String(text).replace(/(\d),(?=\d{3}\b)/g, '$1').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

// Does a UI value (state value or display text) represent the API value?
function sameValue(apiValue, uiValue) {
  if (typeof apiValue === 'number') {
    const nums = typeof uiValue === 'number' ? [uiValue] : numbersIn(uiValue);
    return nums.some(n => Math.abs(n - apiValue) < 0.005);
  }
  const a = String(apiValue).trim().toLowerCase();
  const u = String(uiValue).trim().toLowerCase();
  return u === a || u.includes(a);
}

// ─── 1. State-store comparison ──────────────────────────────────────────────
function stateLeaves() {
  const leaves = [];
  try {
    if (window.__REDUX_DEVTOOLS_EXTENSION__ && window.__redux_store__) {
      flatten(window.__redux_store__.getState(), '', leaves);
    }
    if (window.__zustand_stores__) {
      window.__zustand_stores__.forEach((store, name) => flatten(store.getState(), String(name), leaves));
    }
  } catch (e) {}
  return leaves;
}

function compareState(apiLeaves) {
  const byKey = new Map();
  stateLeaves().forEach(l => {
    const k = norm(l.key);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(l);
  });
  const diffs = [];
  let checked = 0;
  apiLeaves.forEach(api => {
    const candidates = byKey.get(norm(api.key));
    if (!candidates) return;
    checked++;
    if (!candidates.some(c => sameValue(api.value, c.value))) {
      diffs.push({ path: api.path, apiValue: api.value, uiValue: candidates[0].value, source: 'state' });
    }
  });
  return { diffs, checked };
}

// ─── 2. DOM comparison ──────────────────────────────────────────────────────
const ID_ATTRS = ['data-testid', 'data-test', 'data-field', 'data-key', 'data-name', 'id', 'name', 'itemprop'];

function isVisible(el) {
  return el.getClientRects().length > 0;
}

function displayText(el) {
  const raw = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
    ? el.value
    : el.getAttribute('data-value') ?? el.textContent;
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

// Index visible elements by every identifier they carry (attribute values + class names)
function indexDom() {
  const index = new Map();
  const add = (name, el) => {
    const k = norm(name);
    if (k.length < 2) return;
    if (!index.has(k)) index.set(k, []);
    index.get(k).push(el);
  };
  const els = document.body ? document.body.querySelectorAll('*') : [];
  const n = Math.min(els.length, MAX_ELEMENTS);
  for (let i = 0; i < n; i++) {
    const el = els[i];
    if (el.children.length > 3 && !el.hasAttribute('data-value')) continue; // containers, not values
    if (!isVisible(el)) continue;
    ID_ATTRS.forEach(attr => { if (el.hasAttribute(attr)) add(el.getAttribute(attr), el); });
    if (el.classList) el.classList.forEach(c => add(c, el));
  }
  return index;
}

function compareDom(apiLeaves) {
  const index = indexDom();
  const diffs = [];
  let checked = 0;
  apiLeaves.forEach(api => {
    const els = index.get(norm(api.key));
    if (!els) return;
    const texts = els.map(displayText).filter(t => t && t.length <= 100);
    if (!texts.length) return;
    checked++;
    if (!texts.some(t => sameValue(api.value, t))) {
      diffs.push({ path: api.path, apiValue: api.value, uiValue: texts[0], source: 'dom' });
    }
  });
  return { diffs, checked };
}

// ─── 3. Analyze one API response ────────────────────────────────────────────
function analyze(url, method, t0, apiData) {
  const apiLeaves = flatten(apiData);
  const state = compareState(apiLeaves);
  const dom = compareDom(apiLeaves);

  // A field found in both state and DOM is reported once per source, but drift only needs one
  const diffs = [...state.diffs, ...dom.diffs];
  window.postMessage({
    source: 'driftwatch',
    type: 'API_CALL',
    payload: {
      url: String(url),
      method: String(method).toUpperCase(),
      timestamp: new Date().toISOString(),
      latency: Date.now() - t0,
      apiResponse: apiData,
      diffs,
      hasDrift: diffs.length > 0,
      checked: state.checked + dom.checked,
      fieldCount: apiLeaves.length
    }
  }, '*');
}

// Wait a moment for the UI to re-render before reading it
const afterRender = fn => setTimeout(fn, 50);

// ─── 4. Intercept fetch ──────────────────────────────────────────────────────
const _origFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0]?.url || args[0];
  const method = args[1]?.method || args[0]?.method || 'GET';
  const t0 = Date.now();

  const response = await _origFetch.apply(this, args);
  response.clone().json()
    .then(apiData => afterRender(() => analyze(url, method, t0, apiData)))
    .catch(() => {}); // non-JSON response

  return response;
};

// ─── 5. Intercept XMLHttpRequest ─────────────────────────────────────────────
const _origXHROpen = XMLHttpRequest.prototype.open;
const _origXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
  this._ce_url = url;
  this._ce_method = method;
  return _origXHROpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function() {
  const t0 = Date.now();
  this.addEventListener('load', () => {
    try {
      const apiData = JSON.parse(this.responseText);
      afterRender(() => analyze(this._ce_url, this._ce_method, t0, apiData));
    } catch (e) {} // non-JSON or non-text response
  });
  return _origXHRSend.apply(this, arguments);
};
})();
