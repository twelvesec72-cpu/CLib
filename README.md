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
| `splash.webp` | The GoughRead artwork shown on a cold start (1116×2000, 404 KB; the painted version since v19) |
| `goughread-bg-gold.webp` | The light theme's background painting (388 KB) |
| `goughread-bg-night.webp` | The dark theme's background painting (231 KB) |
| `young-serif.woff2` | The display serif for headings and book titles (27 KB, in `sw.js` SHELL so it works offline) |
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

Grid, list, and **shelf** — spines standing side by side, picked with the
three-way switch above the books (the current one is highlighted). When a
search or filter is hiding books, "3 of 14 shown · Clear" appears beside it.

**UI ported from the Android app, 2026-10-06 (`clib-v15`).** The Android fork
(`..\GoughRead-Android`) went through a 27-item UX review. Everything that
applies to a browser was brought back here:
- **Book card:** a one-tap Want / Reading / Read switch on the card, which
  stamps the finished date. Status shown as cover badges (tick / open book)
  and in words in list view, with its own colour for Reading.
- **Editor:** a discard-changes prompt, a pinned Save, the "More details" fold,
  shelf suggestions and errors next to the field.
- **Review:** options collapsed into one row; choices survive lookups.
- **Lists and scanning:** each tab keeps its own scroll position, the camera
  auto-starts once permission has been given, and the full splash plays only
  on the first launch.
- **Accessibility:** press feedback, a focus ring, dialog semantics with focus
  trap, polite live toasts, labels, a 44px+ minimum size for anything tappable
  and a 12px text floor.
- **Look:** Young Serif headings and a tablet layout.

Kept from this copy and not changed: the server backup, the service worker, the
`clib.*` keys and the schema. Not ported because they are Android-only: the
share-sheet export, the Haptics plugin (vibration uses `navigator.vibrate`
here), the Back button, the native launch screen and the in-app privacy policy.
The settings footer shows the deploy version, read from the `sw.js` cache name.

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

## Loans

A loan is a name and a day, nothing more.

- **Lend.** Open a book and tap **Lend this book**. Enter who has it and the
  day (it defaults to today; future days are refused). The name field offers
  everyone who has borrowed before, with the five most recent as chips.
- **Return.** A lent book's sheet shows "Lent to Sarah · since Oct 3 · 4 days"
  and a **Mark returned** button. That moves the loan into `loanHistory`, and
  the sheet then lists it under **Lent before** (the last three, with a count of
  the rest).
- **Find what's out.** The status filter has an **On loan** entry, sorted with
  the longest-out book first whatever the sort pill says. Search matches the
  borrower's name, so typing "sarah" finds everything she has.
- **Library views.** In grid view the borrower's name runs across the top of the
  cover. In list view, "Lent to Sarah" replaces the status word. Every view's
  accessible label includes it.

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

`splash.webp` — the GoughRead sunflower, painted in impasto over the same gold
swirl as the light background since v19 — shows on a cold start: the artwork
fades in over about half a second, holds, and the whole layer fades out.
The fade-out starts at 3.2 s on the very first run and at 2.4 s on every
later cold start, and the splash is gone from the DOM 0.6 s after that.
Before v20, later starts got only 0.8 s, which was mostly fade-in and far too
quick to see the painting. Tapping skips it. `prefers-reduced-motion` gets
the picture with no fades and a shorter hold (2.2 s first, 1.6 s after).

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

**Switching:** since v19 there is a sun/moon switch in the top bar, next to +
(`#themeSwitch`, `role="switch"`, checked = dark). It replaced the Theme
dropdown in Settings, which is gone. The switch only knows light and dark.
Anyone still on `theme:'auto'` (the old "Match device") keeps it until they
tap. Until then, the switch shows what the device is giving them and follows
OS changes.

Van Gogh palettes: **Starry Night** (deep indigo, chrome yellow) for dark, and
for light the **splash artwork itself, sampled**. The amber field it is painted
on is `--bg`, its book-page creams are the card surfaces, and the brown the
wordmark is lettered in is `--text` — so the app is the same picture the splash
is: cream pages laid on an amber ground.

Since v17 both themes paint a **picture** as the `body` background (`--bgfx`),
never a tile. Both use `cover` and `no-repeat`, because a repeated painting
shows its seam instantly.

- **Light: `goughread-bg-gold.webp`** (1116×2000, 388 KB), a gold swirl of
  impasto strokes, anchored `center` on the swirl's eye. Raw, it averages
  `#cd9d53` with darker strokes, which takes `--muted` under 3.3:1 for the text
  that sits straight on it (grid authors, tab labels). A cream veil is layered
  over it in `--bgfx`. v17 used `.42` (4.75:1 average), which looked washed
  out. v18 uses `rgba(253,244,221,.28)`: about 4.3:1 average, with more of the
  paint showing.
- **Dark: `goughread-bg-night.webp`** (2000×1493, 231 KB), a night sky of
  swirling strokes over a dark hillside with lit windows, anchored
  `bottom center` so the lights sit just above the tab bar. Its wave crests are
  bright: raw, they put `--muted` at 3.1:1 on the brightest 5% of the picture.
  There is a navy veil over it: v17 used `.35` (4.5:1), and v18 uses
  `rgba(12,20,44,.22)` (about 3.9:1), for the same reason as light. It is navy
  because amber over a night sky turns it grey.

`--bg` stays underneath as the colour the screen is while a file is still
arriving. The topbar and tabbar are transparent, so the status bar takes
`--status`, the colour sampled from the painting's top edge under its veil:
`#e5be7f` in light and `#1c3252` in dark. `applyTheme()` prefers it over
`body`'s background colour.

The geometry is themed alongside the picture: `--bgfx-size`, `--bgfx-pos` and
`--bgfx-repeat`. Up to v16 light used an inline SVG brush-stroke tile, and dark
used `goughread-bg-starry-g-village.svg`. Both are gone from the app now.

`--surface-3` is only ever the shelf board, so in light it is a wood brown
rather than a third card colour — at a card-like tone it vanished into the
amber and the shelf had nothing to stand on.

**Light is the default**, not "match device" — the app is built around the
sunflower, and a phone being in dark mode should not be what decides
otherwise. Dark is still there as a choice in Settings.

That needed schema **v3** and a real migration, not just a changed default:
every existing install already had `theme:'auto'` written to disk, where a new
default would never reach it. The migration moves anyone still on `'auto'`
(the old default, so not a choice) and leaves anyone who actually picked light
or dark alone. It runs once, gated on the stored schema version.

It also forced a fix to the status bar: the two `<meta name="theme-color">`
tags in the head key off the **OS**, so a light app on a dark phone got a navy
bar above an amber screen. `applyTheme()` now appends a third tag set from the
painted `body` background (or `--status`, where a theme sets one), which wins
by coming last and tracks the real theme.

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

**Setup is one key.** Nothing else. There is no username, no login and no URL
to type: the key *is* the identity. The server maps it to a person and scopes
every read and write to that person's own directory, so a mis-pasted key fails
with a 401 rather than writing into someone else's library. **Test connection**
answers *Connected as sarah*, which is how you know it landed right.

The server is the same box for everyone, so it is the constant `BACKUP_URL` in
`index.html` rather than a field. A URL nobody can mistype never generates a
support call, and it cannot be lost with the rest of a device's settings.
Moving the server means a deploy — which is about the right amount of ceremony
for changing where everybody's library backs up to.

### Where the key is kept

In its own localStorage entry, `clib.backupKey`, **not** inside the
`clib.settings` blob. If that blob ever fails to parse — a half-written value,
a quota failure mid-write — it falls back to the defaults and is then saved
over the original, and everything in it is gone. The books live under their own
keys and survive that, which is exactly why it goes unnoticed: the library is
fine and the backup has quietly switched itself off.

Everything else the backup keeps in `settings` (`backupUser`, `backupAuto`,
`backupLastAt`, `backupLastMsg`) is rebuilt by pressing **Test connection**. The
key was the only value in there that could not be, so it is the only one that
moved out. Schema **v4** carries an existing key across.

There is a second way it used to go missing. **Test connection** and **Back up
now** fire a synthetic `change` on the key field first, to commit whatever has
been typed before they run. A password input that has come back blank on its
own — after a reload, or an autofill that did not restore — then looked
exactly like the user clearing the field, and the empty value was saved over
the real key. The handler now ignores a blank that arrives on an untrusted
event; only a real, user-fired one can clear the key.

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
scans survive a reload), and `clib.backupKey` — on its own, deliberately, for
the reason given under [Where the key is kept](#where-the-key-is-kept).

IndexedDB: database `clib-photos`, store `covers`, keyed by `id`, one record
per photographed cover — `{ id, blob, bytes, addedAt }`.

Schema history:

| | |
| --- | --- |
| v2 | added `coverPhotoId` and `spineColor` to the book record. Nothing to migrate: a v1 record normalises to empty strings for both. |
| v3 | light became the default theme. Migrates anyone still on `'auto'`, which was the old default rather than a choice. |
| v4 | the backup key moved to `clib.backupKey` and the server URL into the code. Migrates an existing key out of the settings blob, and strips the stray `backupUrl`/`backupKey` properties on the way past. |
| v4 (Oct 2026, no bump) | added `dateFinished` (`YYYY-MM-DD` or `''`) to the book record, plus a `dateFinished` CSV column. Nothing to migrate: older records and CSVs normalise to `''`. Choosing **Read** in the editor offers today's date; the field is editable and may be left blank. The date is kept if a book moves off Read. |
| v4 (Oct 2026, no bump) | added loans: `loanTo` (name or `''`), `loanDate` (`YYYY-MM-DD`, cleared when nobody has it) and `loanHistory` (`[{to, from, back}]`, oldest first), plus `loanTo`/`loanDate` CSV columns. History travels in the JSON backup only. Nothing to migrate: older records normalise to an empty loan. |

Changing a value in `DEFAULT_SETTINGS` alone never reaches an existing install
— settings are persisted on first run, so the stored blob always wins. A
changed default needs a schema-gated migration in `loadAll()`.
