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

### Security
User content is HTML-escaped before injection. The inlined JSON is sanitised to prevent `</script>` injection.

---

## Edit token flow

_Not yet built._

---

## Photo upload

_Not yet built._
