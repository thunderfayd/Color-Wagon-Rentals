// Sends Heidi and Will an email when something comes in through the site.
//
// This exists because the site used to rely on Netlify Forms for delivery and
// that was never switched on for this site. Every POST to "/" came back 404,
// which the browser code swallowed, so the visitor saw "message sent" and the
// message went nowhere at all. Delivery now runs through code we control, and
// the caller is told honestly whether the email actually went out.
//
// Transport is Resend over plain HTTPS, so there is no dependency to install
// and nothing to keep patched. Set these in the Netlify site settings:
//
//   RESEND_API_KEY   the API key from resend.com
//   NOTIFY_TO        who gets the alert (defaults to the shop mailbox)
//   NOTIFY_FROM      the verified sender, e.g. site@colorwagonrentals.com
//
// Until the key is set this is a no-op that reports { sent: false }. That is
// deliberate: whatever came in is already saved in the dashboard before this
// is ever called, so a missing key delays the ping, it never loses the lead.

const DEFAULT_TO = 'ColorWagonRentals@gmail.com';

function configured() {
  return !!(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);
}

async function notify({ subject, text, replyTo }) {
  if (!configured()) return { sent: false, reason: 'not_configured' };

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
        // So hitting reply in Gmail goes to the customer, not to the website.
        reply_to: replyTo || undefined
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { sent: false, reason: 'send_failed', status: res.status, detail: detail.slice(0, 300) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: 'network_error', detail: String(e && e.message).slice(0, 200) };
  }
}

module.exports = { notify, configured, DEFAULT_TO };
