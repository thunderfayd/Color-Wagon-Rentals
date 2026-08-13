// Sends Heidi and Will an email when something comes in through the site.
//
// This exists because the site used to rely on Netlify Forms for delivery and
// that was never switched on for this site. Every POST to "/" came back 404,
// which the browser code swallowed, so the visitor saw "message sent" and the
// message went nowhere at all. Delivery now runs through code we control, and
// the caller is told honestly whether the email actually went out.
//
// Two transports, tried in order. Either one is enough.
//
// 1. WEB3FORMS. One key, and it can live in the repo: Web3Forms access keys
//    are designed to be public and only ever deliver to the address that
//    registered them, so a stranger who copies it can send you mail and
//    nothing else. This is the path that needs no access to the Netlify
//    dashboard, which matters here because the account that owns this site
//    is not the one we can administer.
//
// 2. RESEND. Better sender reputation and a real From address on your own
//    domain, but the key is a genuine secret, so it has to be set as an
//    environment variable in Netlify rather than committed:
//      RESEND_API_KEY, NOTIFY_FROM (e.g. site@colorwagonrentals.com)
//
// NOTIFY_TO overrides the destination for Resend. Web3Forms decides the
// destination from whichever mailbox registered the key.
//
// With neither configured this is a no-op that reports { sent: false }. That
// is deliberate: whatever came in is already saved in the dashboard before
// this is ever called, so a missing key delays the ping, it never loses the
// lead.

const DEFAULT_TO = 'ColorWagonRentals@gmail.com';

// Paste the Web3Forms access key here to turn email on without touching
// Netlify. Safe to commit: see the note above.
const WEB3FORMS_KEY = '';

function web3key() {
  return process.env.WEB3FORMS_KEY || WEB3FORMS_KEY || '';
}

function resendReady() {
  return !!(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);
}

function configured() {
  return !!web3key() || resendReady();
}

// Which transport is live, for the dashboard checklist.
function transport() {
  if (web3key()) return 'web3forms';
  if (resendReady()) return 'resend';
  return null;
}

async function notify({ subject, text, replyTo }) {
  if (web3key()) {
    const r = await sendWeb3Forms({ subject, text, replyTo });
    if (r.sent) return r;
    // Fall through rather than give up: if both are set up, one being down
    // should not cost them the alert.
    if (resendReady()) return sendResend({ subject, text, replyTo });
    return r;
  }
  if (resendReady()) return sendResend({ subject, text, replyTo });
  return { sent: false, reason: 'not_configured' };
}

async function sendWeb3Forms({ subject, text, replyTo }) {
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: web3key(),
        subject: subject,
        from_name: 'Color Wagon Rentals website',
        // Web3Forms uses this as the reply-to, so hitting reply in Gmail
        // goes to the customer rather than back to the website.
        email: replyTo || DEFAULT_TO,
        message: text
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      return { sent: false, via: 'web3forms', reason: 'send_failed', status: res.status,
               detail: String(body.message || '').slice(0, 300) };
    }
    return { sent: true, via: 'web3forms' };
  } catch (e) {
    return { sent: false, via: 'web3forms', reason: 'network_error', detail: String(e && e.message).slice(0, 200) };
  }
}

async function sendResend({ subject, text, replyTo }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM,
        to: [process.env.NOTIFY_TO || DEFAULT_TO],
        subject: subject,
        text: text,
        reply_to: replyTo || undefined
      })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { sent: false, via: 'resend', reason: 'send_failed', status: res.status, detail: detail.slice(0, 300) };
    }
    return { sent: true, via: 'resend' };
  } catch (e) {
    return { sent: false, via: 'resend', reason: 'network_error', detail: String(e && e.message).slice(0, 200) };
  }
}

module.exports = { notify, configured, transport, DEFAULT_TO };
