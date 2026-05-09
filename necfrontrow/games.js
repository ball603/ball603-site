/* ============================================================
   NEC Front Row - Games Data
   ============================================================
   Embed URLs are auto-generated from the Hudl broadcast ID:
     https://vcloud.hudl.com/broadcast/embed/{id}?autoplay=1

   The home page automatically filters to today's games.
   Yesterday's games stay in this file so direct game URLs still work.
   ============================================================ */

window.NEC_GAMES = [
  /* ---------- Yesterday: May 8, 2026 (kept for URL access) ---------- */
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

  /* ---------- Today: May 9, 2026 ---------- */
  {
    id: "4021701",
    sport: "Softball",
    title: "Game 6 - CCSU vs. Wagner",
    datetime: "2026-05-09T09:00:00-04:00",
    site: "NEC & Associate Schools"
  },
  {
    id: "4021704",
    sport: "Softball",
    title: "Game 7 (If Necessary) - CCSU vs. Wagner",
    datetime: "2026-05-09T11:30:00-04:00",
    site: "NEC & Associate Schools"
  },
  {
    id: "3640663",
    sport: "Baseball",
    title: "Coppin State at Wagner",
    datetime: "2026-05-09T13:00:00-04:00",
    site: "Wagner (NY)"
  },
  {
    id: "4021707",
    sport: "Baseball",
    title: "Central Connecticut at Mercyhurst",
    datetime: "2026-05-09T13:00:00-04:00",
    site: "Mercyhurst (PA)"
  },
  {
    id: "4021709",
    sport: "Baseball",
    title: "UMES at Le Moyne",
    datetime: "2026-05-09T13:00:00-04:00",
    site: "Le Moyne (NY)"
  },

  /* ---------- Upcoming ---------- */
  {
    id: "3640667",
    sport: "Baseball",
    title: "Coppin State at Wagner",
    datetime: "2026-05-10T12:00:00-04:00",
    site: "Wagner (NY)"
  },
  {
    id: "3640678",
    sport: "Baseball",
    title: "Mercyhurst at Wagner",
    datetime: "2026-05-14T15:00:00-04:00",
    site: "Wagner (NY)"
  },
  {
    id: "3640684",
    sport: "Baseball",
    title: "Mercyhurst at Wagner",
    datetime: "2026-05-15T13:00:00-04:00",
    site: "Wagner (NY)"
  },
  {
    id: "3640687",
    sport: "Baseball",
    title: "Mercyhurst at Wagner",
    datetime: "2026-05-16T12:00:00-04:00",
    site: "Wagner (NY)"
  }
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
