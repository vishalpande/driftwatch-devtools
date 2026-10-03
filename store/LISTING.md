# Chrome Web Store listing — copy/paste values

## Name
Driftwatch

## Summary (max 132 chars)
Catch UI/API drift: see field by field when what a page shows no longer matches the API response. No code changes needed.

## Category
Developer Tools

## Language
English

## Detailed description
Driftwatch finds stale UI. It sits in Chrome DevTools, watches the API calls a page makes, and checks each field of every JSON response against what the page actually shows. Mismatches appear in a ⚡ Driftwatch tab, field by field.

WHAT YOU GET
• Automatic interception of fetch and XMLHttpRequest calls, with latency
• Field-level drift: "total: API 549, UI ₹499.00"
• Checks the rendered DOM (data-testid, id, name, itemprop, class) and Redux / Zustand state stores
• Format-tolerant matching: ₹499.00 equals 499, 1,299 equals 1299
• No SDK, no code changes in the app you are testing

HOW TO USE
1. Open any page and press F12.
2. Open the ⚡ Driftwatch tab.
3. Use the page. Calls appear live; red entries expand to show the drifting fields.

TIPS
• Detection works best on apps that label UI elements (data-testid="total"). Sites with generated class names will show "no UI fields matched".
• If you install the extension while a tab is open, reload that tab once.

PRIVACY
Everything runs locally in your browser. Driftwatch sends no data anywhere.

Open source: https://github.com/vishalpande/driftwatch-devtools

## Single purpose (dashboard field)
Detect and display mismatches between the API responses a web page receives and the data the page displays, inside Chrome DevTools.

## Permission justifications (dashboard fields)
- **Host permission / content scripts on <all_urls>:** Driftwatch is a developer tool that must work on whichever site the developer is debugging, including localhost and staging domains that cannot be listed in advance. It wraps fetch/XMLHttpRequest on the page to read JSON responses and reads the page DOM/state to compare them. Data stays in the browser; nothing is transmitted.
- **Remote code:** No, the extension does not use remote code.

## Data usage disclosures (privacy tab)
- Collects no user data categories (leave all boxes unchecked).
- Certify: not sold to third parties; not used for unrelated purposes; not used for creditworthiness/lending.

## Privacy policy URL
https://github.com/vishalpande/driftwatch-devtools/blob/main/PRIVACY.md

## Homepage / support URL
https://github.com/vishalpande/driftwatch-devtools

## Assets still needed from you
- At least 1 screenshot, 1280x800 (or 640x400): the panel showing a red drift entry, using http://localhost:8765/
- Optional: small promo tile 440x280
