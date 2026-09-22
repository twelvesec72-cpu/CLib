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

## Views

Grid, list, and **shelf** — spines standing side by side, cycled with the icon
in the top bar.

The spines are **drawn, not photographed**. No spine-image source exists (Open
Library holds front covers only), and `covers.openlibrary.org` sends no CORS
headers, so a fetched cover cannot even be sampled onto a canvas to borrow its
colour. So each spine is derived from the record: thickness from `pageCount`
(23–50 px, the way a thick book really is thicker), colour from an FNV-1a hash
of title + first author against a fixed palette, and height jittered from the
same hash. A given book therefore always looks identical, and a shelf of them
looks varied.

A book with a **photographed** cover is the exception: that photo is a local
canvas, so it can be sampled, and the spine takes the cover's own dominant
colour instead of a hashed one. Its ink flips between cream and near-black on
whichever gives more contrast.

## Photographed covers

Any book's **Edit** screen has *Photograph it* (straight to the camera, via
`capture="environment"`) and *Choose a photo* (camera roll or files). A photo
always beats the Open Library cover, which is what you want for a battered
paperback or a book Open Library has never heard of.

Two inputs rather than one because `capture` is what makes iOS and Android open
the camera immediately, and it also suppresses the photo library — you cannot
have both behaviours from one element.

- **Where they live: IndexedDB, not `localStorage`.** A Blob in IndexedDB is a
  handle to a file on disk; it is not base64 and it does not touch the 5 MB
  book budget. The book record holds only the photo's id.
- **What gets stored.** The source is downscaled to 620 px on the long edge and
  re-encoded as JPEG at 0.82. A 4032x3024 camera frame becomes 620x465 in about
  50 ms, and a 1.4 MB source lands at 40–90 KB. EXIF rotation is applied by the
  `<img>` element, so no orientation handling is needed.
- **Dominant colour.** Pixels go into a coarse 4x4x4 cube and the fullest
  bucket wins, skipping anything above 232 or below 24 luminance — otherwise
  page edges, studio backgrounds and barcode blocks dominate and every spine
  comes out grey.
- **Nothing is written until Save.** A cancelled edit leaves no orphan blob, a
  photo swapped twice leaves only the last one, and the blob is committed
  *before* the book record so a record can never point at a photo that is not
  there. If the store refuses the write the save is abandoned with the sheet
  still open.
- **Deleting a book deletes its photo**, unless another book still points at it
  (an "add all" import can share one). Anything orphaned anyway is swept 2.5 s
  after boot.
- **`navigator.storage.persist()` is requested at boot.** Safari discards a
  site's storage after seven idle days unless it is persistent or installed to
  the home screen, and a photographed cover cannot be fetched back from
  anywhere. A plain browser tab may be refused, which is what the JSON backup
  is for.

## Theme

Van Gogh palettes: **Starry Night** (deep indigo, chrome yellow) for dark,
**Sunflowers** (cream, ochre, umber) for light, both over two soft radial
washes set in `--bgfx`. The top bar and tab bar are transparent so the wash
runs edge to edge; nothing scrolls under them, so they do not need a fill.

`--accent` is a **fill** and always carries `--on-accent` text. `--accent-ink`
is the same colour family as **type** — chrome yellow is far too pale to read
on cream, so the tab label, active filter pill and links use the ink. Keeping
the two apart is what holds the light theme above 4.5:1. Every pair was
measured; the worst is 4.68:1 (ink on accent-soft, light).

## How it works

- **Scanning.** `BarcodeDetector` where it exists (Android Chrome); otherwise
  ZXing-js is lazy-loaded from jsDelivr the first time the scanner opens (iOS
  Safari). Decoded EAN-13s are checksum-validated and must carry a `978`/`979`
  Bookland prefix before any lookup happens.
- **The decode loop is ours, not ZXing's.** `decodeContinuously` re-runs on
  failure with a **0 ms** delay against the full native-resolution frame, which
  pins a core flat out and starves the video preview on an iPhone, and it only
  reschedules itself for three specific exception types — any other throw (such
  as a frame arriving before iOS reports `videoWidth`) stops it permanently and
  silently. Instead there is a self-scheduling loop that never overlaps, and
  frames are downscaled to 760 px, alternating the centre band with the whole
  frame. Measured on the same machine: 62 ms → 27 ms per empty frame, and
  15 ms → 3 ms when a barcode is actually present.
- **Two scan modes, both confirmed.** Nothing is ever recorded from a barcode
  alone. *One at a time* does not decode at all until you tap **Scan**, then
  shows the book and adds it to the library on **Add**. *Rapid* reads
  continuously and puts each book in the review queue on **Accept**, where a
  whole batch gets its shelf, collection and status in one go. While a card is
  up, decoding is paused, so a neighbouring spine drifting into frame cannot
  replace the book you are looking at.
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
- **Covers.** For a looked-up cover only the URL is stored, never the image,
  which keeps a few thousand books inside the ~5 MB `localStorage` quota. They
  are cached by the service worker so the library still looks right offline. A
  cover you photograph yourself is a Blob in IndexedDB instead — see below.
- **Offline.** The app shell is precached, so it opens and renders with no
  connection. Lookups fail with a message rather than a dead spinner.

## How much fits

`localStorage` is capped at about **5 MB per origin** — a browser limit, not a
choice in this code, and the reason covers are stored as URLs rather than
images. Measured against 2,000 fully-populated records (ISBN-13 and -10, title,
authors, publisher, year, pages, series, shelf, collections, cover URL, dates):
**~1.06 KB per book**, so roughly **4,900 books**, or about 6,200 for sparse
records. Settings shows live usage.

Past that, the next step is moving the books to IndexedDB too, which has no
practical cap — worth doing only if the shelf ever approaches a few thousand.

Photographed covers are **not** in that 5 MB and are not the constraint. They
are in IndexedDB, whose quota is a share of free disk: 6.2 GB on the machine
this was measured on, around 1 GB on iOS. At 60 KB a photo that is tens of
thousands of covers, far past the ~4,900 books the records themselves allow.
Settings reports the two separately.

## Backups

Export is the only recovery path in this version — clearing browser data
destroys the library. Export from Settings regularly; the filename is dated.

**JSON is now the real backup and CSV is not.** The JSON file carries the
books, the collections, the settings *and* every photographed cover as a data
URL, because those photos exist nowhere else. It costs roughly 55–125 KB per
photo once base64 has taken its 33%. CSV stays for spreadsheets: it has a
`coverPhoto` column that says `yes` or nothing, so a CSV-restored library at
least tells you which books need re-photographing.

Import takes either file. It offers merge (skip what you already have),
add-all (duplicates included) and replace. Replace requires typing `REPLACE`
and auto-exports the current library **as JSON** first — a CSV safety net would
silently drop the photos it is meant to be protecting. Photos are written back
under their original ids, after the chosen books are saved and only for the
books actually kept, then anything orphaned is swept.

## Storage keys

`localStorage`: `clib.books`, `clib.collections`, `clib.settings`,
`clib.schemaVersion`, `clib.queue` (the un-reviewed rapid-mode scans, so ten
scans survive a reload).

IndexedDB: database `clib-photos`, store `covers`, keyed by `id`, one record
per photographed cover — `{ id, blob, bytes, addedAt }`.

Schema v2 added `coverPhotoId` and `spineColor` to the book record. Nothing
needs migrating: a v1 record normalises to empty strings for both.
