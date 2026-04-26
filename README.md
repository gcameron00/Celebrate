# Celebrate

A platform for creating and sharing personal celebration mini-sites — crafted messages delivered as beautiful, animated web pages.

## Concept

Born from a one-off birthday site built for a specific person, Celebrate generalises that idea: anyone can create a bespoke celebration page for someone they care about, share a link, and let the recipient experience something more considered than a text message or generic e-card.

A celebration is a simple, elegant web page built from a small set of customisable components. The creator picks an occasion, chooses their components, fills in the personal details, and gets a shareable URL. The recipient opens the link and sees their celebration. No app, no account, no friction.

## Occasion types

Suggested occasions are provided as starting points. Creators can also write their own.

- Birthday
- Anniversary
- Congratulations
- Farewell
- Get Well
- Thank You
- Custom (free text)

## Components

Celebrations are assembled from components. The initial set is deliberately small; more will be added over time.

| Component | Description |
|---|---|
| Background | Animated gradient — colour scheme chosen by the creator |
| Emoji theme | A set of thematic emoji that animate across the screen |
| Recipient name | Displayed prominently in script typography |
| Greeting | A short headline (e.g. "Happy Birthday", "Congratulations") |
| Personal note | A free-text message from the creator to the recipient |
| Photo | A single uploaded image |
| Sender | The sign-off line ("with love from…") |

## How it works

### Creating a celebration

1. Go to the builder on the home page
2. Choose an occasion type
3. Pick and configure your components
4. Hit **Create** — the celebration is saved and two URLs are generated

### Two URLs

| URL | Purpose |
|---|---|
| **Share link** — `celebrate.example.com/c/abc123` | Send this to the recipient. It shows the finished celebration. |
| **Edit link** — `celebrate.example.com/c/abc123?edit=<token>` | Keep this yourself. It unlocks editing for as long as you have it. |

The edit link is shown prominently at creation time and saved to your browser's `localStorage` as a convenience. **If you lose the edit link and clear your browser, edit access cannot be recovered** — this is a deliberate privacy trade-off (see below).

### Editing a celebration

Visit your edit link, make changes, and save. The share link stays the same so you don't need to re-send it to the recipient.

### Viewing a celebration

The recipient opens the share link. No account, no sign-up — just the celebration.

## Privacy model

Celebrate stores no personal information. There are no user accounts and no email addresses.

Access control uses a **secret token model**:

- At creation time, a random secret token is generated and embedded in your edit link
- The database stores only a hash of that token — it cannot be reversed to identify you
- You are identified solely by possession of the edit link

This means we hold no data that could identify who created a celebration or who it was for. The trade-off is that lost edit links cannot be recovered.

## Tech stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite, free tier) |
| Asset storage | Cloudflare R2 (for photo uploads, free tier) |
| Frontend | Vanilla HTML / CSS / JS — no build step, no framework |

All infrastructure runs on Cloudflare's free tier.

## Docs

- [Build plan](docs/build-plan.md) — sequenced steps with detail on what each involves
- [Implementation notes](docs/implementation.md) — how it actually works, updated as each part is built

## Project structure

```
index.html              — builder / home page
about/index.html        — about page
c/                      — celebration viewer (served by Worker routing)
assets/
  css/styles.css        — global styles
  js/main.js            — global JS
  favicon.svg           — site icon
functions/              — Cloudflare Pages Functions (API)
  api/celebrations/     — create, read, update endpoints
docs/
  build-plan.md         — sequenced build steps
  implementation.md     — running implementation notes
```

## Inspiration

The birthday site that preceded this project — a bespoke animated page built for one person — demonstrated how much more personal a crafted web page feels compared to a card or message. Celebrate makes that same quality of experience available for any occasion, for anyone.

## Status

- [x] Scaffold deployed to Cloudflare Pages
- [x] Database schema
- [x] Worker API (create, read, update)
- [x] Builder UI
- [ ] Celebration viewer
- [ ] Photo upload (R2)
- [ ] Edit token flow
