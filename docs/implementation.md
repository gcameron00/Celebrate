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

`functions/_shared/utils.js` — `sha256(text)` and `generateViewId()` (8-char alphanumeric).

---

## Builder UI

_Not yet built._

---

## Celebration viewer

_Not yet built._

---

## Edit token flow

_Not yet built._

---

## Photo upload

_Not yet built._
