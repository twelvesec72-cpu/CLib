# Clib

A private catalogue for a physical book collection. One HTML file, no build step,
no account, no server. Data lives in `localStorage` on the device that scanned it.

**Live:** https://twelvesec72-cpu.github.io/CLib/

The repo is `CLib` with a capital L and the Pages path is case-sensitive.
Renaming the repo changes the URL and breaks every installed copy.

## Files

| File | Role |
| --- | --- |
| `index.html` | The whole app — markup, CSS and JS |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker. **Bump `CACHE` on every deploy.** |
| `icon-192.png`, `icon-512.png` | App icons (`purpose: any`) |
| `icon-maskable-512.png` | Separate maskable icon, glyph inside the safe zone |

All paths are relative (`./`), so a custom domain can be added later without
touching the code.

## Deploying

1. Upload the files to `twelvesec72-cpu/CLib` on `main`, flat at the repo root.
2. Settings → Pages → Deploy from branch → `main` / `(root)`.
3. Open the live URL, then install to the home screen on each phone
   (Android Chrome → menu → Install app; iOS Safari → Share → Add to Home Screen).

**On every redeploy, edit the first line of `sw.js`** — `clib-v1` → `clib-v2` and
so on. Without it the installed phones keep serving the old app.

## How it works

- **Scanning.** `BarcodeDetector` where it exists (Android Chrome); otherwise
  ZXing-js is lazy-loaded from jsDelivr the first time the scanner opens (iOS
  Safari). Decoded EAN-13s are checksum-validated and must carry a `978`/`979`
  Bookland prefix before any lookup happens.
- **Two scan modes, both confirmed.** Nothing is ever recorded from a barcode
  alone. *One at a time* shows the book and adds it straight to the library on
  **Add**. *Rapid* shows the book and puts it in the review queue on **Accept**,
  where a whole batch gets its shelf, collection and status in one go. While a
  card is up, decoding is paused, so a neighbouring spine drifting into frame
  cannot replace the book you are looking at.
- **Accept is live before the lookup finishes.** Tap it on the beep and the
  title fills itself in afterwards. If that background lookup then comes back
  as a duplicate, a miss or a network error, the row is automatically unticked
  in the review queue — you cannot commit a book you never actually saw.
  Duplicates are caught locally and appear on the card instantly, so accepting
  one is always a deliberate choice and stays ticked.
- **Metadata.** Open Library, no API key. Three endpoints are tried in order:
  `/api/books`, `/isbn/{isbn}.json`, then `/search.json?q=isbn:`. Each is
  optional — an HTTP error from one is treated as a miss and the chain
  continues; only a total loss of contact raises an error. (`/api/books` has
  been answering 404 for valid ISBNs, which is why the chain does not trust it.)
- **Covers.** Only the URL is stored, never the image, which keeps a few
  thousand books inside the ~5 MB `localStorage` quota. Covers are cached by
  the service worker so the library still looks right offline.
- **Offline.** The app shell is precached, so it opens and renders with no
  connection. Lookups fail with a message rather than a dead spinner.

## Backups

CSV export is the only recovery path in this version — clearing browser data
destroys the library. Export from Settings regularly; the filename is dated.

Import offers merge (skip what you already have), add-all (duplicates included)
and replace. Replace requires typing `REPLACE` and auto-exports the current
library first.

## Storage keys

`clib.books`, `clib.collections`, `clib.settings`, `clib.schemaVersion`,
`clib.queue` (the un-reviewed rapid-mode scans, so ten scans survive a reload).
