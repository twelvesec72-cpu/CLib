# GoughRead

A private catalogue for a physical book collection. One HTML file, no build step,
no account, no server. Data lives in `localStorage` on the device that scanned it.

**Live:** https://twelvesec72-cpu.github.io/CLib/

The repo is `CLib` with a capital L and the Pages path is case-sensitive.
Renaming the repo changes the URL and breaks every installed copy.

**The app was called Clib until the GoughRead artwork was adopted.** The name
is now GoughRead everywhere a person can see it. Everything a person *cannot*
see deliberately keeps the old prefix — the `clib.*` `localStorage` keys, the
`clib-photos` database, the `clib-v*` and `clib-covers-v1` caches, the repo,
and the `clib-backup` service on dellcasa. Those are not labels, they are
addresses: rename one and the installed phones come back to an empty shelf
with nothing still pointing at the old data. Verified by loading a library
written under the old build into the renamed app — books, collections,
settings, photographed cover and spine colour all intact.

## Files

| File | Role |
| --- | --- |
| `index.html` | The whole app — markup, CSS and JS |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker. **Bump `CACHE` on every deploy.** |
| `icon-192.png`, `icon-512.png` | App icons (`purpose: any`) |
| `icon-maskable-512.png` | Maskable icon (`purpose: maskable`) |
| `splash.webp` | The GoughRead artwork shown on a cold start (154 KB) |
| `admin/` | Windows key manager. **Not part of the PWA — do not upload it.** |

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

## Splash

`splash.webp` — the GoughRead sunflower — shows on a cold start: the artwork
fades in over about half a second, holds, and the whole layer fades out, gone
from the DOM at ~2.9 s. Tapping skips it. `prefers-reduced-motion` gets the
picture with no fades and a shorter hold.

Three things it does deliberately:

- **The amber is painted by the container, not the image.** The screen is the
  right colour on the very first frame and stays right while the artwork
  decodes, so the half-built app never flashes underneath — and it still looks
  intentional if the image never loads at all.
- **It is in the markup, not built in JS**, for the same reason.
- **It is removed from the DOM, not left at `opacity: 0`**, where it would go
  on swallowing every tap. Removal is on a timer rather than `transitionend`,
  because a transition that never fires would strand the overlay over the
  whole app.

It is precached by the service worker, and the manifest's `background_color`
matches it so the OS launch screen hands over to it without a jump.

## Icons

All three are the sunflower, full bleed on its amber field, generated from one
512px source by `scratchpad/make-icons2.ps1`.

The maskable one needs no extra padding: the flower measures 328px on a 512px
canvas — 64%, against a safe zone of 80% — and sits within 2px of centre.
Shrinking it further would only make it look small in the launcher once Android
crops it. Checked against circle, squircle and square crops at 120px and 48px.

**An installed home-screen icon does not update on redeploy.** Android and iOS
both capture it at install time, so a phone that already has GoughRead keeps
the old indigo book-spine icon until it is removed from the home screen and
added again. Nothing is lost by doing that — the library lives in the browser's
storage for the origin, not in the installed shortcut.

## Theme

Van Gogh palettes: **Starry Night** (deep indigo, chrome yellow) for dark, and
for light the **splash artwork itself, sampled**. The amber field it is painted
on is `--bg`, its book-page creams are the card surfaces, and the brown the
wordmark is lettered in is `--text` — so the app is the same picture the splash
is: cream pages laid on an amber ground. `--bgfx` adds the brush strokes that
ground is built from, as an inline SVG tile. The tile is 520 px with strokes of
varying length, weight and angle; a small tile of uniform arcs reads as a grid
of commas rather than as paint.

`--surface-3` is only ever the shelf board, so in light it is a wood brown
rather than a third card colour — at a card-like tone it vanished into the
amber and the shelf had nothing to stand on.

`--accent` is a **fill** and always carries `--on-accent` text. `--accent-ink`
is the same colour family as **type** — chrome yellow is far too pale to read
as text, so the tab label, active filter pill and links use the ink. Keeping
the two apart is what holds the light theme above 4.5:1.

All 23 pairs were measured against the new ground; the worst is 4.89:1. Note
that `--muted` and `--accent-ink` are a shade deeper than the artwork's own
mid-browns: on an amber ground rather than a cream one, the lighter versions
land at 4.3:1 and fail.

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

## Backup to my server

Settings → **Backup to my server** pushes the library and its cover photos to
`clib-backup` on dellcasa, reachable from anywhere with **nothing installed on
the phone**.

**Setup is one URL and one key.** There is no username and no login: the key
*is* the identity. The server maps it to a person and scopes every read and
write to that person's own directory, so a mis-pasted key fails with a 401
rather than writing into someone else's library. **Test connection** answers
*Connected as sarah*, which is how you know it landed right.

| | |
| --- | --- |
| URL | `https://dellcasa.tail2b3657.ts.net:8443` — the same for everyone |
| Key | 32 hex characters, one per person |

### Managing keys

**The desktop app is the easy way**: `admin/GoughReadKeys.ps1`, launched by
`admin/GoughRead Keys.vbs` (a `.vbs` because a `.cmd` or a shortcut straight to
powershell.exe flashes a console first). There is a *GoughRead Keys* shortcut on the
Windows desktop. It lists everyone with their book count, cover count and how
long since their last backup — **red once a week has passed with no backup**,
which is the whole point, since a silent backup failure is otherwise invisible.
Buttons for add, show key, rotate and remove.

It holds no state: every button is one SSH call to `~/clib-backup/admin.sh`,
which answers in JSON. The server's `users.json` stays the only source of
truth, so the app and the shell scripts are interchangeable.

On dellcasa directly, in `~/clib-backup`. `users.json` is re-read when it
changes, so none of these need a restart:

| | |
| --- | --- |
| `./add-user.sh sarah` | new person, prints their key |
| `./show-key.sh` | list who exists, no keys shown |
| `./show-key.sh sarah` | print an existing key again, e.g. for a second device |
| `./rotate-key.sh sarah` | new key, old one dead, their backups untouched |
| `./admin.sh <cmd> [name]` | the JSON version of all of the above, plus `list` and `remove` |

Keys are stored in plain text in `users.json` (chmod 600; the server only
hashes them in memory), so a forgotten key is looked up, not lost. Rotation is
for a leak or a lost phone, not for forgetfulness.

`remove` revokes a key but **deliberately leaves `data/<name>` alone** —
withdrawing someone's access should never be the same action as destroying
their only backup. Re-adding them later gets a new key and the same folder.

### Two phases, so a repeat backup sends nothing

`POST /backup` carries the books, collections and a bare list of photo **ids** —
a few hundred KB. The server replies with the ids it does not already hold, and
only those JPEGs are then `PUT` one at a time. The first backup uploads
everything; every one after that uploads ~0 bytes of image, which matters over
a relay.

### Guards worth knowing about

- **Shrink refusal.** A backup holding less than half the books of the one on
  the server comes back `409`, and the app asks before forcing it. This is the
  only thing standing between an auto-backup and quietly overwriting a good
  library with an empty one after the app's data gets cleared — or a tablet
  nobody has opened in a month syncing over a phone's newer copy.
- **The API key never leaves in an export.** `exportableSettings()` strips it,
  because a JSON export lands in Downloads and gets mailed around.
- **Auto-backup is deliberately quiet**: debounced 90 s after a change, at most
  hourly, skipped when offline and retried on `online`, checked once at startup
  if a day has passed. Failures only change the status line until a whole week
  has gone by with no success — silence is the bigger risk by then.

### Transport

**Tailscale Funnel**, which needs nothing on the client. `tailscale funnel
--bg --https=8443 http://localhost:8100` inside the `tailscale` container. Note
that Funnel is **per-port**: 443 (Vaultwarden) and 8096/8098 stay tailnet-only
and were verified unreachable from off-tailnet while 8443 answers.

Funnel's public DNS record took about twenty minutes to appear after first
enabling it. `NXDOMAIN` right after running the command is not a failure —
check again before changing anything.

The service is at `~/clib-backup` rather than `/DATA/AppData/` because creating
a directory there needs root and this box has no passwordless sudo. It runs as
`user: "1000:1000"`, without which every backup file lands root-owned and you
cannot prune or rsync your own data.

**This is off-device, not off-site.** dellcasa is in the same house as the
phones; it defends against a cleared browser or a lost phone, not a fire.

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
