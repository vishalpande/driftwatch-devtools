# Driftwatch Privacy Policy

_Last updated: 2026-10-03_

Driftwatch is a developer tool that compares API responses with what a web page displays.

**What it accesses.** While the extension is installed, it reads the JSON responses of `fetch` and `XMLHttpRequest` calls on the pages you visit, and the visible text and state (for example Redux or Zustand stores exposed on `window`) of those pages, so it can compare them.

**What it does with that data.** The data is processed entirely inside your browser and shown in the Driftwatch panel in Chrome DevTools. It is held in memory only (the last 500 calls per open DevTools window) and is discarded when DevTools is closed.

**What it does not do.** Driftwatch does not collect, store, sell or share any personal or other data. It does not send any data to the developer or to any third party. It makes no network requests of its own, and it contains no analytics, advertising or tracking code. It does not use remote code.

**Contact.** Questions: pandevishal40@gmail.com, or open an issue at https://github.com/vishalpande/driftwatch-devtools/issues
