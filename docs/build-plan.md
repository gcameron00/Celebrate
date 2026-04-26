# Build plan

Sequenced by dependency. Each step should be complete and working before the next begins.

---

## ✓ 1. Database schema

Single `celebrations` table with `view_id`, `edit_token_hash`, `occasion`, `components` JSON blob, timestamps. D1 migration in `migrations/0001_initial.sql`.

---

## ✓ 2. Worker API

Cloudflare Pages Functions in `functions/`. Endpoints: `POST /api/celebrations`, `GET /api/celebrations/:view_id`, `PATCH /api/celebrations/:view_id`. Auth via SHA-256 hashed edit tokens. See `docs/implementation.md` for full detail.

---

## ✓ 3. Builder UI

Single scrolling page (`index.html`) with sticky step nav. Four sections: Occasion, Who, Message, Look & Feel. Confirmation screen with share link and edit link on success.

**Known issues / future:**
- Step nav active state doesn't track scroll position correctly — revisit with UI polish
- Styling and layout pass needed
- Allow creators to add custom emoji to a theme

---

## ✓ 4. Celebration viewer

Served by `functions/c/[view_id].js`. Full HTML page returned from D1 data, celebration data inlined as `window.__C__`. Animated emoji starfield, Great Vibes name typography, Cormorant Garamond greeting.

---

## ✓ 5. Edit token flow

Edit token (UUID) returned once on create, SHA-256 hash stored in DB. Visiting `/c/<view_id>?edit=<token>` verifies the token then redirects to the builder in edit mode. Token persisted to `localStorage`. Viewer shows a subtle Edit button to the creator.

---

## 6. Photo upload

Allows the creator to include a photo in their celebration. Stored in Cloudflare R2.

**What it needs to do:**
- Accept an image file in the builder (field is stubbed with "coming soon")
- Upload to R2 via a Worker upload endpoint
- Store the R2 object key on the celebration record
- Serve the image to the viewer

**Decisions to make:**
- File size and type limits
- Whether to resize/optimise on upload or serve as-is
- Whether the upload happens at form-fill time or only on Create

**Deliverables:**
- R2 bucket config in `wrangler.toml`
- Upload endpoint in Worker
- Photo component in builder and viewer

---

## Backlog

### Delete celebration
No mechanism to delete a celebration yet. Options: add a delete button to edit mode (requires token verification), or a scheduled cleanup of old records. Decision pending.

### Styling and layout pass
The builder and viewer are functional but unstyled beyond basics. A visual polish pass is needed — particularly the step nav, form spacing on mobile, and the confirmation screen.

### Custom emoji in themes
Allow creators to add their own emoji to a theme set, or define a fully custom set.

### Step nav active state
The step nav does not reliably track which section is in view on scroll. Needs IntersectionObserver tuning or a scroll-position-based approach.
