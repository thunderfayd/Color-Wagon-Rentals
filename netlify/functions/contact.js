// Receives a message from the "Questions? We'd Love to Help" form.
//
// The message is written to Blobs first and emailed second. That order is the
// whole point: storage is the record, email is the ping. If the mail transport
// is unconfigured or down, the message still lands in the dashboard instead of
// evaporating the way every message before this did.
const { getStore, connectLambda } = require('@netlify/blobs');
const { notify } = require('../lib/notify');

const MAX = 4000;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }

  // Honeypot: real people leave this empty. Accept it so the bot sees success
  // and moves on, but store nothing.
  if (data.company) return json(200, { ok: true, stored: false, emailed: false });

  const name = str(data.name, 120);
  const email = str(data.email, 200);
  const message = str(data.message, MAX);
  if (!name || !email || !message) return json(400, { error: 'missing_fields' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'bad_email' });

  const entry = {
    id: 'C-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    name: name,
    email: email,
    phone: str(data.phone, 40),
    interested_in: str(data.interested_in, 60),
    message: message,
    receivedAt: new Date().toISOString(),
    read: false
  };

  let stored = false;
  try {
    connectLambda(event);
    const store = getStore('colorwagon');
    let messages = (await store.get('messages', { type: 'json' })) || [];
    messages.push(entry);
    if (messages.length > 500) messages = messages.slice(-500);
    await store.setJSON('messages', messages);
    stored = true;
  } catch (e) { /* fall through: we still try to email it */ }

  const result = await notify({
    subject: 'Website message from ' + entry.name,
    replyTo: entry.email,
    text: [
      entry.name + ' sent a message through colorwagonrentals.com.',
      '',
      'Email:     ' + entry.email,
      'Phone:     ' + (entry.phone || 'not given'),
      'Asking about: ' + (entry.interested_in || 'not specified'),
      '',
      entry.message,
      '',
      '-- ',
      'Reply to this email and it goes straight back to them.',
      'It is also saved at colorwagonrentals.com/admin'
    ].join('\n')
  });

  // If neither path worked there is nothing holding this message, and the
  // visitor needs to be told rather than shown a checkmark.
  if (!stored && !result.sent) return json(502, { error: 'not_delivered' });

  return json(200, { ok: true, stored: stored, emailed: result.sent });
};

function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}
