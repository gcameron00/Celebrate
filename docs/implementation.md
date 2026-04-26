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

_Not yet built._

### Endpoints

_To be documented when built._

### Routing

_To be documented when built._

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
