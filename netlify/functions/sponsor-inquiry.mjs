// Ball 603 — receive a sponsorship enquiry from sponsor.html.
//
// POST { school, tier, sport, business, name, email, phone, note, page, website }
//   → { ok: true }
//
// THIS IS THE ONLY PUBLIC WRITE PATH ON THE SITE. Every other function that
// writes — publish-rpi-save, social-manage, social-tags — sits behind the CMS
// password. This one cannot: it is a form on a marketing page, filled in by
// people who have never heard of the CMS. So the defences are here instead:
//
//   * every field is length-capped before it reaches the database
//   * a honeypot field catches the bots that fill in everything they find
//   * submissions are rate limited per source, counted in the table itself
//     because a serverless function has no memory between invocations
//   * a repeat of the same email and school within a few minutes is treated as
//     a double-click rather than a second lead
//
// PRIVACY: the raw IP is never stored. Rate limiting only needs to know that
// two submissions came from the same place, and a salted hash answers that
// without keeping a visitor's address on file.
//
// NO EMAIL BY DEFAULT. Ball 603 has no outbound email — notification-helper.js
// is OneSignal push aimed at fans, which is the wrong audience entirely for a
// sales lead. So the enquiry lands in the CMS Inquiries tab and waits there. If
// RESEND_API_KEY ever gets set, this also sends a copy; until then its absence
// is normal and is not treated as an error.

import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
const NOTIFY_EMAIL = process.env.SPONSOR_INQUIRY_EMAIL || 'kj@ball603.com';
const NOTIFY_FROM = process.env.SPONSOR_INQUIRY_FROM || 'Ball 603 <noreply@ball603.com>';

// Salts the IP hash so the stored value can't be reversed by hashing a list of
// candidate addresses. Any stable secret works; the service key is already
// here and never leaves the server.
const IP_SALT = process.env.SPONSOR_INQUIRY_SALT || SUPABASE_SERVICE_KEY || 'ball603';

// Generous for a real person, tight enough that nothing enormous lands in the
// table. A note longer than this is almost certainly paste or spam.
const LIMITS = {
  school: 120, tier: 40, sport: 60, business: 160,
  name: 120, email: 200, phone: 40, note: 2000, page: 200
};

const RATE_WINDOW_MIN = 60;
const RATE_MAX = 5;        // per source per window
const DUPE_WINDOW_MIN = 10;

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const clean = (value, max) => {
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
};

// Same shape the page checks before it posts, so a visitor is never told their
// address is fine and then refused by the server.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sourceHash(request) {
  const fwd = request.headers.get('x-nf-client-connection-ip') ||
              request.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim();
  if (!ip) return null;
  return createHash('sha256').update(IP_SALT + '|' + ip).digest('hex').slice(0, 32);
}

async function emailCopy(row) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'no RESEND_API_KEY' };
  try {
    const lines = [
      `School:   ${row.school}`,
      `Tier:     ${row.tier || '(not specified)'}`,
      row.sport ? `Sport:    ${row.sport}` : null,
      `Business: ${row.business}`,
      `Contact:  ${row.name}`,
      `Email:    ${row.email}`,
      row.phone ? `Phone:    ${row.phone}` : null,
      '',
      row.note || '(no message)'
    ].filter(Boolean).join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_EMAIL],
        reply_to: row.email,
        subject: `Sponsor enquiry — ${row.business} for ${row.school}`,
        text: lines
      })
    });
    if (!res.ok) return { sent: false, reason: `Resend ${res.status}` };
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

export default async (request) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  const fail = (status, error) =>
    new Response(JSON.stringify({ ok: false, error }), { status, headers });
  const done = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers });

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return fail(405, 'POST only');

  if (!SUPABASE_SERVICE_KEY) {
    console.error('sponsor-inquiry: no service key configured');
    return fail(500, 'We could not record that just now');
  }

  let body;
  try { body = await request.json(); }
  catch { return fail(400, 'Could not read that form'); }

  /* The honeypot. sponsor.html renders a hidden 'website' field that a person
     never sees and never fills; scripted submitters fill every input they find.
     A hit is answered with a normal success so the bot has nothing to learn
     from, and nothing is written. */
  if (clean(body.website, 200)) {
    console.log('sponsor-inquiry: honeypot hit, discarded');
    return done();
  }

  const row = {
    school:   clean(body.school, LIMITS.school),
    tier:     clean(body.tier, LIMITS.tier),
    sport:    clean(body.sport, LIMITS.sport),
    business: clean(body.business, LIMITS.business),
    name:     clean(body.name, LIMITS.name),
    email:    clean(body.email, LIMITS.email),
    phone:    clean(body.phone, LIMITS.phone),
    note:     clean(body.note, LIMITS.note),
    page:     clean(body.page, LIMITS.page)
  };

  const missing = ['school', 'business', 'name', 'email'].filter(k => !row[k]);
  if (missing.length) {
    return fail(400, 'Please fill in your school, business name, your name and an email.');
  }
  if (!EMAIL_RE.test(row.email)) {
    return fail(400, 'That email address does not look right.');
  }

  row.email = row.email.toLowerCase();
  row.ip_hash = sourceHash(request);
  row.user_agent = clean(request.headers.get('user-agent'), 300);

  try {
    // Rate limit. Counted in the table because a serverless function keeps
    // nothing between invocations — there is no in-memory counter to use.
    if (row.ip_hash) {
      const since = new Date(Date.now() - RATE_WINDOW_MIN * 60000).toISOString();
      const recent = await supabase(
        `sponsor_inquiries?select=id&ip_hash=eq.${encodeURIComponent(row.ip_hash)}` +
        `&created_at=gte.${encodeURIComponent(since)}&limit=${RATE_MAX + 1}`
      );
      if ((recent || []).length >= RATE_MAX) {
        console.warn('sponsor-inquiry: rate limited');
        return fail(429,
          'That is a few enquiries in a short time. Email kj@ball603.com or call 617-216-7639 and we will pick it up from there.');
      }
    }

    /* A second identical submission moments later is a double-click or an
       impatient retry, not a second lead. Answering ok without inserting keeps
       the list clean and, importantly, does not punish the visitor for it. */
    const dupeSince = new Date(Date.now() - DUPE_WINDOW_MIN * 60000).toISOString();
    const dupes = await supabase(
      `sponsor_inquiries?select=id&email=eq.${encodeURIComponent(row.email)}` +
      `&school=eq.${encodeURIComponent(row.school)}` +
      `&created_at=gte.${encodeURIComponent(dupeSince)}&limit=1`
    );
    if ((dupes || []).length) {
      console.log('sponsor-inquiry: duplicate within window, not stored again');
      return done();
    }

    const inserted = await supabase('sponsor_inquiries', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });

    const saved = Array.isArray(inserted) ? inserted[0] : inserted;
    console.log(`sponsor-inquiry: #${saved?.id} ${row.business} for ${row.school}`);

    /* The email is a nicety on top of a row that is already saved, so its
       failure must never turn a captured lead into an error for the visitor. */
    const mail = await emailCopy(row);
    if (!mail.sent && mail.reason !== 'no RESEND_API_KEY') {
      console.warn('sponsor-inquiry: email copy failed —', mail.reason);
    }

    return done();

  } catch (err) {
    // The visitor gets the phone number, not a stack trace.
    console.error('sponsor-inquiry failed:', err);
    return fail(500, 'We could not record that just now');
  }
};
