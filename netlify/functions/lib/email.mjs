// Ball 603 outbound email (Resend).
//
// Every send here is BEST EFFORT. A contributor's password reset must not fail
// because an email provider hiccuped, so sendEmail() never throws and never
// rejects - it reports {sent:false, reason} and the caller carries on.
//
// Requires RESEND_API_KEY (Netlify env, Functions scope). Without it this
// module quietly no-ops, which is the normal state before email is configured.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM      = process.env.MAIL_FROM      || 'Ball 603 <noreply@ball603.com>';
const MAIL_REPLY_TO  = process.env.MAIL_REPLY_TO  || 'kj@ball603.com';
const PORTAL_URL     = process.env.PORTAL_URL     || 'https://ball603.com/contributor-portal.html';

export const emailEnabled = () => Boolean(RESEND_API_KEY);

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Shared shell so every Ball 603 email looks like the others.
   Inline styles only - email clients strip <style> blocks. */
function wrap(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr><td style="background:#f57c00;padding:14px 20px;">
          <span style="color:#fff;font:700 18px Helvetica,Arial,sans-serif;letter-spacing:-0.2px;">Ball 603</span>
        </td></tr>
        <tr><td style="padding:22px 20px;font:14px/1.5 Helvetica,Arial,sans-serif;color:#1a1a1a;">
          <h1 style="margin:0 0 14px;font-size:17px;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:14px 20px;border-top:1px solid #eee;font:12px/1.5 Helvetica,Arial,sans-serif;color:#888;">
          Ball 603 &middot; <a href="https://ball603.com" style="color:#f57c00;">ball603.com</a><br>
          Questions? Just reply to this email.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:18px 0;"><a href="${escapeHtml(href)}" style="background:#f57c00;color:#fff;text-decoration:none;padding:10px 18px;border-radius:5px;font-weight:600;display:inline-block;">${escapeHtml(label)}</a></p>`;

export async function sendEmail({ to, subject, title, bodyHtml, text }) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'email not configured' };
  if (!to || !subject)  return { sent: false, reason: 'missing recipient or subject' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        reply_to: MAIL_REPLY_TO,
        subject,
        html: wrap(title || subject, bodyHtml || ''),
        text: text || undefined
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Logged, never surfaced to the user and never thrown.
      console.error('Resend send failed:', res.status, detail.slice(0, 300));
      return { sent: false, reason: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Resend send error:', err.message);
    return { sent: false, reason: err.message };
  }
}

/* ---------------- templates ---------------- */

export function newAccountEmail({ name, email, password }) {
  return {
    subject: 'Your Ball 603 contributor account',
    title: `Welcome aboard, ${String(name || '').split(' ')[0] || 'there'}`,
    bodyHtml: `
      <p>Your Ball 603 contributor account is ready. Sign in to claim games, upload scorebooks and manage your schedule.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:6px;padding:12px 14px;margin:4px 0 2px;">
        <tr><td style="font:13px/1.7 Helvetica,Arial,sans-serif;color:#333;">
          <strong>Email:</strong> ${escapeHtml(email)}<br>
          <strong>Password:</strong> <code style="background:#fff;border:1px solid #ddd;padding:2px 6px;border-radius:3px;">${escapeHtml(password)}</code>
        </td></tr>
      </table>
      ${button(PORTAL_URL, 'Open the portal')}
      <p style="color:#666;font-size:13px;">Please change that password once you're in &mdash; it's on your profile page.</p>`,
    text: `Your Ball 603 contributor account is ready.\n\nEmail: ${email}\nPassword: ${password}\n\nSign in: ${PORTAL_URL}\n\nPlease change your password once you're in.`
  };
}

export function passwordResetEmail({ name, email, password }) {
  return {
    subject: 'Your Ball 603 password was reset',
    title: 'Your password was reset',
    bodyHtml: `
      <p>KJ reset the password on your Ball 603 contributor account. Here's the new one:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:6px;padding:12px 14px;margin:4px 0 2px;">
        <tr><td style="font:13px/1.7 Helvetica,Arial,sans-serif;color:#333;">
          <strong>Email:</strong> ${escapeHtml(email)}<br>
          <strong>New password:</strong> <code style="background:#fff;border:1px solid #ddd;padding:2px 6px;border-radius:3px;">${escapeHtml(password)}</code>
        </td></tr>
      </table>
      ${button(PORTAL_URL, 'Sign in')}
      <p style="color:#666;font-size:13px;">Change it to something of your own once you're in. If you didn't expect this, reply and let KJ know.</p>`,
    text: `Your Ball 603 password was reset.\n\nEmail: ${email}\nNew password: ${password}\n\nSign in: ${PORTAL_URL}\n\nPlease change it once you're in.`
  };
}

export function coverageDecisionEmail({ name, decision, role, away, home, date, gender, division, round }) {
  const picked = decision === 'selected';
  const roleName = { photog: 'photographer', videog: 'videographer', writer: 'writer' }[role] || role;
  const when = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';
  const matchup = `${away} at ${home}`;
  const tag = [gender, division, round].filter(Boolean).join(' ');

  return {
    subject: picked ? `You're covering ${matchup}` : `Coverage change: ${matchup}`,
    title: picked ? "You're on this game" : "You're no longer on this game",
    bodyHtml: `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${picked ? '#f1f8f2' : '#fdecea'};border:1px solid ${picked ? '#c8e6c9' : '#f5c2c0'};border-radius:6px;padding:12px 14px;margin:0 0 14px;">
        <tr><td style="font:14px/1.6 Helvetica,Arial,sans-serif;color:#1a1a1a;">
          <strong>${escapeHtml(matchup)}</strong><br>
          ${escapeHtml([tag, when].filter(Boolean).join(' · '))}
        </td></tr>
      </table>
      ${picked
        ? `<p>You're assigned as <strong>${escapeHtml(roleName)}</strong>. See you there.</p>`
        : `<p>KJ assigned this one to someone else. The NHIAA limits how many of our people can be credentialed per game, so not everyone who asks can be on it.</p>
           <p style="color:#666;font-size:13px;">You can request it again from the portal if you still want it.</p>`}
      ${button(PORTAL_URL, 'Open your schedule')}`,
    text: `${picked ? "You're covering" : "You're no longer on"} ${matchup}${tag ? ' (' + tag + ')' : ''}${when ? ' on ' + when : ''}.${picked ? ` Assigned as ${roleName}.` : ' KJ assigned someone else.'}\n\n${PORTAL_URL}`
  };
}
