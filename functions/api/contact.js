/**
 * Contact form handler — Cloudflare Pages Function (POST /api/contact)
 *
 * Emails each inquiry to the business owner through Resend (https://resend.com).
 * Nothing in this file is site-specific: every value is a setting on the
 * Cloudflare Pages project (Settings → Variables and Secrets).
 *
 *   RESEND_API_KEY  (secret, required)  Resend API key.
 *   CONTACT_TO      (required)          Where inquiries go. Comma-separate for several.
 *   SITE_NAME       (recommended)       Business name, e.g. "Acme 1-2-3".
 *   FROM_EMAIL      (optional)          Sender address on a domain verified in Resend,
 *                                       e.g. forms@acme123.com or notifications@site-inquiries.net.
 *                                       Defaults to Resend's test sender, which only
 *                                       delivers to the Resend account owner's own inbox.
 *   FROM_NAME       (optional)          Sender name. Defaults to "<SITE_NAME> Website".
 */

const RESEND_URL = 'https://api.resend.com/emails';
const TEST_SENDER = 'onboarding@resend.dev';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 100, email: 200, phone: 40, service: 100, message: 5000 };

export async function onRequestPost({ request, env }) {
  let body;
  try {
    const type = request.headers.get('content-type') || '';
    body = type.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return reply(400, 'Invalid request.');
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success for bots.
  if (clean(body.company)) return reply(200);

  const data = {
    name: clean(body.name),
    email: clean(body.email),
    phone: clean(body.phone),
    service: clean(body.service),
    message: clean(body.message, true),
  };

  const problem = validate(data);
  if (problem) return reply(400, problem);

  const to = (env.CONTACT_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || to.length === 0) {
    console.error('Contact form is not configured: set RESEND_API_KEY and CONTACT_TO.');
    return reply(500, 'The contact form is not set up yet.');
  }

  const siteName = clean(env.SITE_NAME) || 'Website';
  const fromName = clean(env.FROM_NAME) || `${siteName} Website`;
  const fromEmail = clean(env.FROM_EMAIL) || TEST_SENDER;

  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || 'Not provided'],
    ['Service', data.service],
    ['Message', data.message],
  ];

  const email = {
    from: `${fromName.replace(/[<>"]/g, '')} <${fromEmail}>`,
    to,
    reply_to: data.email,
    subject: `New inquiry from ${data.name} (${siteName} website)`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n\n'),
    html: renderHtml(siteName, rows),
  };

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return reply(502, 'Your message could not be sent.');
    }
  } catch (err) {
    console.error('Resend request failed', err);
    return reply(502, 'Your message could not be sent.');
  }

  return reply(200);
}

// Any method other than POST
export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}

function validate(d) {
  if (d.name.length < 2) return 'Please enter your name.';
  if (!EMAIL_RE.test(d.email)) return 'Please enter a valid email address.';
  if (!d.service) return 'Please choose a service.';
  if (d.message.length < 10) return 'Please tell us a little more about your project.';
  for (const [field, max] of Object.entries(LIMITS)) {
    if (d[field].length > max) return `The ${field} field is too long.`;
  }
  return '';
}

function clean(value, multiline = false) {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  // Single-line fields lose line breaks (keeps the email subject/headers safe);
  // the message keeps its line breaks but loses trailing spaces.
  return multiline ? v.replace(/[^\S\r\n]+$/gm, '') : v.replace(/[\r\n\t]+/g, ' ');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderHtml(siteName, rows) {
  const body = rows
    .map(([k, v]) => `<tr>
      <th align="left" valign="top" style="padding:10px 16px;background:#f3f6fb;border-bottom:1px solid #dde4ef;width:110px;font-weight:600">${k}</th>
      <td style="padding:10px 16px;border-bottom:1px solid #dde4ef;white-space:pre-wrap">${escapeHtml(v)}</td>
    </tr>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0f1c2e;max-width:640px">
  <p style="margin:0 0 16px">You have a new inquiry from the <strong>${escapeHtml(siteName)}</strong> website.</p>
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border:1px solid #dde4ef">${body}</table>
  <p style="margin:16px 0 0;color:#51607a;font-size:13px">Reply to this email to respond directly to the customer.</p>
</div>`;
}

function reply(status, message) {
  return new Response(JSON.stringify(status === 200 ? { success: true } : { success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
