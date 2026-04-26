# Build plan

Sequenced by dependency. Each step should be complete and working before the next begins.

---

## 1. Database schema

Define what a "celebration" is at the data level. Everything else is built on top of this.

**Decisions to make:**
- Field list for a celebration record (id, view_id, edit_token_hash, occasion, components JSON, created_at, updated_at)
- Whether components are stored as a single JSON blob or normalised into rows (blob is simpler to start)
- Index strategy (view_id is the primary lookup key; edit_token_hash is used for auth)

**Deliverables:**
- D1 migration SQL file
- Schema documented in `docs/implementation.md`

---

## 2. Worker API

The HTTP layer between the builder UI and the database. Runs as a Cloudflare Worker.

**Endpoints needed:**
- `POST /api/celebrations` — create a new celebration, returns view_id + edit_token (plaintext, once only)
- `GET /api/celebrations/:view_id` — fetch celebration data for the viewer (public)
- `PATCH /api/celebrations/:view_id` — update a celebration, requires edit_token in header
- `GET /c/:view_id` — serve the celebration viewer HTML (routing, not data)

**Decisions to make:**
- How the edit token is passed on update requests (Authorization header vs body)
- Whether the Worker also serves static assets or Cloudflare Pages handles that
- Error response shape

**Deliverables:**
- Worker source in `worker/`
- `wrangler.toml` config
- Endpoints documented in `docs/implementation.md`

---

## 3. Builder UI

The creator's experience. A stepped form that collects all the inputs needed to build a celebration, then calls the API.

**Steps in the flow:**
1. Choose occasion (preset list + custom text input)
2. Configure components — toggle which components to include, fill in values for each
3. Review summary
4. Create — calls `POST /api/celebrations`, receives back the two URLs
5. Confirmation screen — shows share link and edit link prominently, explains the edit link must be saved

**Decisions to make:**
- Whether steps are separate screens or a single scrolling page
- Validation approach (what's required vs optional)
- How to handle the photo component at this stage (may be a stub until step 6)

**Deliverables:**
- Builder UI in `index.html` / `assets/`
- localStorage handling for the edit token

---

## Builder — known issues & future enhancements

- Step nav active state doesn't track scroll position correctly — revisit with UI polish
- Styling and layout pass needed
- Allow creators to add custom emoji to a theme

---

## 4. Celebration viewer

The recipient's experience. The visual heart of the product — an animated, full-screen celebration page assembled from the stored component data.

**What it needs to do:**
- Fetch celebration data from `GET /api/celebrations/:view_id`
- Render each component present in the data (background, emoji theme, name, greeting, note, photo, sender)
- Animate — the emoji starfield from the birthday site is the baseline; each occasion type may have its own defaults
- Be mobile-first (iPhone Safari primary target)
- Degrade gracefully if JS is disabled

**Decisions to make:**
- Whether the viewer is a separate HTML template or generated dynamically by the Worker
- Emoji sets per occasion type
- How photo is displayed if present

**Deliverables:**
- Viewer template / page
- Animation system (adapted from birthday site)
- Component rendering logic

---

## 5. Edit token flow

The UX layer around the creator's ongoing access to their celebration.

**What it needs to do:**
- On creation, save the edit token to `localStorage` keyed by view_id
- When a creator visits a share link, check localStorage — if a matching token exists, surface an "Edit" option
- When an edit link is visited directly (`?edit=<token>`), validate the token and enter edit mode
- On save, call `PATCH /api/celebrations/:view_id` with the token
- Make the "you must save this link" message impossible to miss

**Decisions to make:**
- What "edit mode" looks like — does it reuse the builder UI or is it a lighter inline editor?
- Whether there's a "delete" option at this stage

**Deliverables:**
- Token persistence and retrieval logic
- Edit mode UI
- Clear messaging about token permanence

---

## 6. Photo upload

Allows the creator to include a photo in their celebration. Stored in Cloudflare R2.

**What it needs to do:**
- Accept an image file in the builder
- Upload it to R2 (via a presigned URL or a Worker upload endpoint)
- Store the R2 object key on the celebration record
- Serve the image via R2's public URL (or a Worker proxy) to the viewer

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

Items to pick up after the core build is complete.

### Favicon
- Replace the placeholder `assets/favicon.svg` with a proper mark for the Celebrate brand

### OG image
- **Site-wide**: a static OG image for the home page and about page (used when someone shares the root URL)
- **Per celebration**: a dynamically generated OG image for each celebration (e.g. includes the recipient's name and occasion), served via a Cloudflare Worker using the Satori or `@vercel/og` approach — or a simpler static fallback image with the celebration title in the meta tags only

### "Create your own" link on the celebration viewer
- A subtle link on every celebration page pointing back to the home page
- Framing: "Make one for someone you love" or similar — warm, not promotional
- Placement: below the sender footer, or as a small branded element in a corner
- Should not distract from the celebration itself
