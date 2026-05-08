# NEC Front Row

Static site for the official video network of the Northeast Conference.

## Setup

1. Drop your logo in `images/logo.png` (recommended: ~400x100px PNG with transparent background).
2. Upload the entire folder to your server.
3. Done. `index.html` is the home page.

## Updating Games

Edit `games.js`. Each game object needs:

- `id` — Hudl broadcast ID (drives the embed URL automatically)
- `sport` — display label (e.g. "Baseball")
- `title` — matchup (e.g. "Stonehill at LIU")
- `datetime` — ISO 8601 with timezone offset (e.g. `2026-05-08T12:00:00-04:00`)
- `site` — venue/host school

Embed URLs are auto-generated from the ID using the pattern
`https://vcloud.hudl.com/broadcast/embed/{id}?autoplay=1`.
To override, add an `embed_url` field to a specific game.

## How it works

- `index.html` filters games whose `datetime` is today (in the visitor's local timezone) and lists them, sorted earliest first.
- Click a card → `game.html?id={id}` loads with the embedded Hudl player.
- Status pill auto-updates: Upcoming → LIVE (during the ~3.5 hour window after start) → Ended.

## File structure

```
necfrontrow/
├── index.html      Home (today's games)
├── game.html       Single game with player
├── styles.css      All styles
├── games.js        Data + helpers
├── README.md       This file
└── images/
    └── logo.png    Your logo (replace placeholder)
```