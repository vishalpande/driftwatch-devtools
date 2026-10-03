# ⚡ Driftwatch

A Chrome DevTools extension that catches **UI/API drift**: when what a page shows no longer matches what the backend just returned.

It intercepts `fetch` and `XMLHttpRequest` calls, reads the page's state and DOM, and reports mismatches **field by field** in a DevTools panel. No code changes, no SDK, no instrumentation in the app under test.

```
GET  /api/cart            3ms   ⚠ 2 DRIFTS
      Field            API Value     UI Value
      items (dom)      4             "3"
      total (dom)      549           "₹499.00"

GET  /api/profile         4ms   ✓ IN SYNC · 5 fields
```

## Why

Stale UI is a quiet class of bug: a cart badge that says 3 when the server says 4, a price that didn't refresh after an update, a status that never flipped. Unit tests don't see it and the network tab only shows half the picture. Driftwatch puts the API response and the rendered UI side by side, automatically.

## How it works

1. **Intercept.** A script injected into the page's own JavaScript context wraps `fetch` and `XMLHttpRequest`. (Extension content scripts run in an isolated world by default and cannot see the page's real `fetch`, so the interceptor is registered with `world: "MAIN"`.)
2. **Flatten.** Each JSON response is flattened into leaf fields (`cart.items[0].price`).
3. **Find the UI's version of each field**, waiting ~50ms for the UI to re-render:
   - **State stores:** Redux (`window.__redux_store__`) and Zustand (`window.__zustand_stores__`), matched by field name, so the store doesn't have to mirror the API's shape.
   - **Rendered DOM:** visible elements whose `data-testid`, `id`, `name`, `itemprop`, `data-field` or class name equals the field name.
4. **Compare with formatting tolerance.** `₹499.00` equals `499`, `1,299` equals `1299`, text matches case-insensitively.
5. **Report.** A field is drift only when the UI has a place for it and none of those places show the API value. Fields with no UI counterpart are skipped, not flagged.

## Install

1. Clone or download this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open any page, press **F12**, and open the **⚡ Driftwatch** tab.

Requires Chrome 111+ (for `world: "MAIN"` content scripts).

> The interceptor attaches when a page loads. If you install or reload the extension while a tab is already open, reload that tab too. The panel shows a banner when this is needed.

## Try it

A demo app lives in `test/`:

```bash
cd test
python3 -m http.server 8765
```

- <http://localhost:8765/> has a fake Redux store (`{items: 3, total: 499}`) and buttons that fetch matching and mismatching API responses.
- <http://localhost:8765/dom.html> has no store, only labelled DOM elements, to show DOM-based detection.

With DevTools open on the Driftwatch tab, click the buttons. Matching responses show green; mismatching ones show red and expand to the exact fields.

## What the panel shows

| Badge | Meaning |
|---|---|
| `✓ IN SYNC · N fields` | N fields were found in the UI and all matched |
| `⚠ N DRIFTS` | N fields differ; click the entry to expand |
| `no UI fields matched` | The response was captured but nothing in the UI could be tied to its fields |

Each drift row shows the field path, the API value, the UI value, and the source (`dom` or `state`).

## Limitations

- **Matching is by name.** Driftwatch finds UI fields through identifiers like `data-testid="total"` or `class="total"`. Sites with obfuscated or generated class names will mostly show `no UI fields matched`. Adding `data-testid` attributes in your own app makes detection precise.
- **Repeated elements.** For lists (many prices, many rows), a field counts as in sync if *any* matching element shows the value, so some drift in lists can be missed.
- **JSON only.** Non-JSON responses are ignored.
- **State stores must be exposed on `window`.** Redux and Zustand stores that aren't reachable from the page can't be read.

## Project layout

| File | Role |
|---|---|
| `manifest.json` | Manifest V3 config; registers the scripts below |
| `interceptor.js` | Runs in the page's main world: wraps `fetch`/XHR, compares API vs UI |
| `content-script.js` | Isolated-world relay from the page to the extension |
| `devtools.html` / `devtools.js` | Creates the DevTools tab and buffers calls made before the panel is opened |
| `panel.html` / `panel.js` | The panel UI |
| `test/` | Demo pages and mock API responses |

## Privacy

Everything runs locally in your browser. Driftwatch does not send API responses, page content or any other data anywhere.

## License

MIT
