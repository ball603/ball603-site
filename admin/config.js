/* The one file to change when this becomes another conference's site.
   Everything league-specific lives here and nowhere else. */
window.CMS = {
  league:   'NEC',
  siteName: 'NEC Front Row',

  /* Supabase → Project Settings → API.
     The project URL and the publishable/anon key are meant to be public - they
     sit in every browser request. What protects the data is the row-level
     security we set up in 02-security.sql, not secrecy about these two values.
     The SECRET / service_role key must never appear in a file like this. */
  supabaseUrl: 'PASTE_YOUR_PROJECT_URL_HERE',
  supabaseKey: 'PASTE_YOUR_PUBLISHABLE_ANON_KEY_HERE',

  /* Times are stored UTC and shown in this zone, so a November game doesn't
     drift by an hour when the clocks change. */
  timeZone: 'America/New_York'
};
