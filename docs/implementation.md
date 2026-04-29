# Implementation notes

How Celebrate actually works. Updated as each part is built.

---

## Database schema

Single table: `celebrations`.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Auto-increment primary key |
| `view_id` | TEXT | Public ID used in share URLs — unique, indexed |
| `edit_token_hash` | TEXT | SHA-256 of the edit token — indexed, never the token itself |
| `occasion` | TEXT | Occasion type or custom text |
| `components` | TEXT | JSON blob of all component data |
| `created_at` | TEXT | ISO datetime, set on insert |
| `updated_at` | TEXT | ISO datetime, updated on each save |

Migration: `migrations/0001_initial.sql`  
Database: `celebrate-db` (Cloudflare D1, free tier)  
Binding: `DB` (configured in `wrangler.toml`)

---

## Worker API

Implemented as Cloudflare Pages Functions (`functions/` directory). No separate Worker deployment — Functions deploy automatically alongside the Pages site and share the same D1 binding.

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/celebrations` | None | Create a celebration |
| GET | `/api/celebrations/:view_id` | None | Fetch celebration data for the viewer |
| PATCH | `/api/celebrations/:view_id` | Bearer token | Update a celebration |

### POST `/api/celebrations`

Request body:
```json
{
  "occasion": "birthday",
  "components": { }
}
```

Response `201`:
```json
{
  "view_id": "abc12345",
  "edit_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

`edit_token` is returned **once only** and never stored in plaintext.

### GET `/api/celebrations/:view_id`

Response `200`:
```json
{
  "view_id": "abc12345",
  "occasion": "birthday",
  "components": { },
  "created_at": "2026-04-26 10:00:00",
  "updated_at": "2026-04-26 10:00:00"
}
```

`edit_token_hash` is never returned.

### PATCH `/api/celebrations/:view_id`

Header: `Authorization: Bearer <edit_token>`

Request body (all fields optional — omitted fields are unchanged):
```json
{
  "occasion": "birthday",
  "components": { }
}
```

Response `200`: `{ "ok": true }`  
Response `401`: token missing, invalid, or view_id not found.

### Auth model

On create, a UUID is generated as the `edit_token`. Its SHA-256 hex digest is stored in the DB. On PATCH, the token from the Authorization header is hashed and compared — the plaintext token is never stored or logged.

### Shared utilities

`sha256(text)` and `generateViewId()` are inlined in each function file. The `functions/_shared/` directory exists but is unused — cross-directory imports caused bundler resolution errors with Wrangler.

---

## Builder UI

Single scrolling page (`index.html`) with a sticky step nav at the top.

### Sections

| # | Section | Required fields |
|---|---|---|
| 1 | Occasion | One preset selected, or custom text |
| 2 | Who | Recipient name, sender name |
| 3 | Message | Greeting (auto-filled from occasion); personal note optional |
| 4 | Look & Feel | Background scheme (5 presets); emoji theme (7 presets, defaults from occasion) |

### Step nav behaviour
- Highlights the section currently in view (IntersectionObserver)
- Shows a ✓ on each step once its required fields are filled
- Step items are anchor links — clicking scrolls to that section

### Occasion selection
- Grid of preset buttons; selecting one auto-fills the greeting and sets a matching emoji theme default
- Custom option reveals a free-text input
- Greeting is only auto-overwritten if it still holds a default value

### Confirmation screen
- Shown after successful `POST /api/celebrations`, replaces the builder
- Displays share link and edit link, each with a copy-to-clipboard button
- Edit token saved to `localStorage` keyed by `celebrate_edit_<view_id>`
- Edit link shown with a warning about permanence

### Components JSON shape (sent to API)
```json
{
  "occasion": "birthday",
  "components": {
    "recipientName": { "value": "Cornelia" },
    "greeting":      { "value": "Happy Birthday" },
    "sender":        { "value": "Graham" },
    "background":    { "scheme": "sunset" },
    "emojiTheme":    { "set": "birthday" },
    "personalNote":  { "value": "…" }
  }
}
```
`personalNote` is omitted if empty.

---

## Celebration viewer

Served by `functions/c/[view_id].js` — a Pages Function that fetches the celebration from D1 and returns a complete HTML page. The celebration data is inlined as `window.__C__` so the animation can start immediately without a second API call, and OG meta tags can include the recipient's name.

### What gets rendered
- Animated gradient background (scheme applied as `body.bg-<scheme>` CSS class)
- Emoji starfield animation — pool drawn from the chosen theme set
- Recipient name in script typography (Great Vibes)
- Greeting in spaced italic caps (Cormorant Garamond)
- Personal note if present
- Sender footer if present

### Animation
Adapted from the birthday site. Emoji spawn from the centre and zoom outward (starfield/perspective illusion). Tapping/clicking anywhere spawns a burst. All themes use the same motion model — no theme-specific behaviours yet.

### Emoji sets
| Theme key | Emojis |
|---|---|
| birthday | 🎂 🎁 🎈 🎉 ⭐ 🥳 🍰 |
| anniversary | 💍 💐 🥂 ❤️ ✨ 🕯️ 💑 |
| congratulations | 🏆 🥇 ⭐ 🎊 🌟 🎉 🥂 |
| farewell | ✈️ 🌍 👋 🌅 🗺️ 🧳 🌐 |
| get-well | 🌸 🌻 ☀️ 🍵 💪 🌈 🌷 |
| thank-you | 🙏 💐 ✨ 🌸 ❤️ 🌟 💛 |
| celebration | 🎊 ✨ 🥳 🌟 🎉 🎈 ⭐ |

### Output escaping
User content is HTML-escaped via `escapeHtml()` before injection into element content and attributes. The inlined JSON blob (`window.__C__`) is sanitised by `safeJson()` to prevent `</script>` and `<!--` injection inside the `<script>` block.

---

## Edit token flow

### How the edit link works

1. Creator visits `/c/<view_id>?edit=<token>`
2. Pages Function verifies the token hash against the DB
3. If valid → `302` redirect to `/?id=<view_id>&edit=<token>` (the builder in edit mode)
4. If invalid → serves the viewer normally (token silently ignored)

### Builder edit mode

On load, `main.js` reads `?id=` and `?edit=` URL params. If both are present:
- Token is saved to `localStorage` for this browser
- Existing celebration is fetched from `GET /api/celebrations/:view_id`
- Form is pre-populated with all saved values
- Header subtitle changes to "Update your celebration"
- Submit button changes to "Save changes"
- On submit, calls `PATCH /api/celebrations/:view_id` with `Authorization: Bearer <token>`
- Confirmation shows "Changes saved" and hides the edit link section (creator already has it)

### Viewer edit button

`viewer.js` checks `localStorage` for `celebrate_edit_<view_id>`. If a token is found, a subtle "Edit" link appears in the bottom-left of the viewer — visible only to the creator on a browser where they created or edited the celebration. Recipients never see it.

---

## Photo upload

_Not yet built._

---

## Favicon

`assets/favicon.svg` — a 32×32 bunting mark: three triangular flags (purple `#5c35b8`, gold `#e8961e`, rose `#d94d7a`) hanging from a twine rope (`#a08060`). Exported as `favicon-32.png` (32×32) and `apple-touch-icon.png` (180×180). All three are referenced in every HTML `<head>`.

---

## OG images

### Static (site-wide)

`assets/og-image.png` (1200×630) — used by the home page and about page. Dark gradient background, 12 bunting flags across the top, "Celebrate" wordmark, tagline. Source SVG at `assets/og-image.svg`.

### Dynamic (per celebration)

`functions/og/c/[view_id].js` — serves a personalised 1200×630 PNG for each celebration at `GET /og/c/:view_id`.

**How it works:**

1. Check Cloudflare Cache API for a cached PNG. Return immediately if found.
2. Fetch the celebration row from D1.
3. Initialise `@resvg/resvg-wasm` once per isolate. The WASM binary is bundled via a static `import` from the npm package — it is compiled once at deploy time, so the runtime never calls `WebAssembly.instantiate()` on a raw buffer (which Workers forbid).
4. Load Great Vibes and Inter fonts from jsDelivr CDN. Font bytes are cached in the Cache API after the first fetch.
5. Build an SVG: gradient background matched to the celebration's colour scheme, bunting flags, greeting text (Inter, letter-spaced), recipient name (Great Vibes, size scaled to name length), "from sender" line, Celebrate brand mark.
6. Render SVG → PNG via `resvg.render().asPng()`.
7. Cache the PNG (1 hour browser / 1 day CDN edge) and return it.
8. Any error falls back to a `302` redirect to the static OG image.

**Viewer OG tags:**

`functions/c/[view_id].js` includes absolute `og:image` and `twitter:image` URLs pointing to `/og/c/<view_id>`, with `twitter:card: summary_large_image`.

---

## Security

### What is in place

| Control | Where |
|---|---|
| Parameterised queries everywhere | All D1 calls use `prepare().bind()` — no string interpolation |
| Edit token never stored in plaintext | Only the SHA-256 hex digest is written to D1; the raw UUID is returned once and forgotten |
| HTML output escaping | `escapeHtml()` covers all user-supplied strings injected into HTML |
| JSON script injection guard | `safeJson()` replaces `</script>` and `<!--` in the inlined `window.__C__` blob |
| `edit_token_hash` excluded from GET response | The public read endpoint never returns the hash |

---

### Known gaps and concerns

#### 1. No rate limiting on the create endpoint — HIGH
`POST /api/celebrations` has no rate limiting. Repeated requests can exhaust the D1 free-tier row/storage limit and take the site down. Fix: add a KV-backed counter per IP, or enable Cloudflare Rate Limiting on the route.

#### 2. No input size or shape validation — HIGH
`occasion` and `components` are stored as-is with no length caps or key validation. A large `personalNote` (or deeply nested `components` object) is written straight to D1 and re-read on every page load. Fix: enforce `maxLength` on each field in the API before writing, and strip unknown component keys.

#### 3. Edit token leaks via Referer header — MEDIUM
The raw edit token travels in the URL (`/?id=…&edit=<token>`). The builder page loads Google Fonts from `fonts.googleapis.com`, so the browser sends a `Referer` header containing the full URL — including the token — to Google. There is no `Referrer-Policy` header to suppress this. Fix: add `<meta name="referrer" content="no-referrer">` (or a `Referrer-Policy: no-referrer` response header) to the builder page.

#### 4. No Content-Security-Policy headers — MEDIUM
Neither the viewer nor the builder sets a CSP header. The output escaping is correct today, but CSP is a critical second line of defence. A regression in escaping would be directly exploitable without it. Suggested policy for the viewer:
```
default-src 'none'; script-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:
```

#### 5. OG image cache not invalidated after edits — LOW
`functions/og/c/[view_id].js` caches the rendered PNG with `s-maxage=86400` (24 h) keyed only on `view_id`. After a PATCH the cached image won't refresh for up to a day. Fix: incorporate `updated_at` (or a content hash) into the cache key.

#### 6. No delete endpoint — LOW
There is no mechanism for a creator (or operator) to remove a celebration. Abusive content cannot be taken down without direct D1 access. See the backlog in `build-plan.md`.

#### 7. Edit token stored in localStorage — LOW
`localStorage` is readable by any script on the page. An XSS vulnerability (not currently present) would expose the token. A `httpOnly` cookie would be immune to JS access, but would require significant flow changes. Acceptable for now given there are no third-party scripts.

#### 8. Third-party font loading — LOW
Both pages load fonts from `fonts.googleapis.com` / `fonts.gstatic.com`. Visitor IPs and page URLs (including edit tokens; see point 3) are logged by Google. Self-hosting the two font files (`Great Vibes`, `Cormorant Garamond`) under `assets/fonts/` would eliminate this dependency and the associated privacy leak.

#### 9. Modulo bias in view_id generation — NEGLIGIBLE
`generateViewId()` uses `byte % 36` over a 36-character alphabet. Since 256 is not divisible by 36, the first four characters (`a`–`d`) are ~0.4 % more probable per byte. With 36⁸ ≈ 2.8 trillion possible IDs this is not practically exploitable, but a rejection-sampling approach would eliminate the bias entirely.

---

## "Create your own" link

Every celebration viewer includes a subtle `<a href="/" class="viewer-create-btn">Celebrate someone →</a>` fixed at the bottom-centre of the page. Injected directly into the viewer HTML by `functions/c/[view_id].js`, styled at very low opacity so it doesn't distract from the celebration.
