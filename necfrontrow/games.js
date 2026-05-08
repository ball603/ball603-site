/* ============================================================
   NEC Front Row - Games Data
   ============================================================
   Embed URLs are auto-generated from the Hudl broadcast ID:
     https://vcloud.hudl.com/broadcast/embed/{id}?autoplay=1

   To override for a specific game, add embed_url to that game.
   ============================================================ */

window.NEC_GAMES = [
  {
    id: "4018936",
    sport: "Baseball",
    title: "Stonehill at LIU",
    datetime: "2026-05-08T12:00:00-04:00",
    site: "LIU (NY)"
  },
  {
    id: "4018937",
    sport: "Baseball",
    title: "Delaware State at New Haven",
    datetime: "2026-05-08T12:00:00-04:00",
    site: "New Haven (CT)"
  },
  {
    id: "3640656",
    sport: "Baseball",
    title: "Coppin State at Wagner",
    datetime: "2026-05-08T15:00:00-04:00",
    site: "Wagner (NY)"
  },
  {
    id: "4018938",
    sport: "Baseball",
    title: "Central Connecticut at Mercyhurst",
    datetime: "2026-05-08T15:00:00-04:00",
    site: "Mercyhurst (PA)"
  },
  {
    id: "4018940",
    sport: "Baseball",
    title: "UMES at Le Moyne",
    datetime: "2026-05-08T15:00:00-04:00",
    site: "Le Moyne (NY)"
  },
];

/* Returns the embed URL for a game (uses override if present) */
window.getEmbedUrl = function (game) {
  if (game && game.embed_url) return game.embed_url;
  return "https://vcloud.hudl.com/broadcast/embed/" + game.id + "?autoplay=1";
};

/* Find a game by id */
window.getGameById = function (id) {
  for (var i = 0; i < window.NEC_GAMES.length; i++) {
    if (window.NEC_GAMES[i].id === id) return window.NEC_GAMES[i];
  }
  return null;
};