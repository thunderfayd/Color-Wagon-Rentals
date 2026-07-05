// Password-protected admin API for Heidi & Will's dashboard.
// Requires the ADMIN_PASSWORD environment variable set in Netlify.
const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }

  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return json(500, { error: 'not_configured', message: 'Set ADMIN_PASSWORD in Netlify site settings.' });
  if (!body.password || body.password !== pass) return json(401, { error: 'unauthorized' });

  connectLambda(event); // wire up Blobs credentials for classic (Lambda) functions
  const store = getStore('colorwagon');

  // Load + normalise (every confirmed booking must have a stable id).
  let confirmed = (await store.get('confirmed', { type: 'json' })) || [];
  let requests = (await store.get('requests', { type: 'json' })) || [];
  let log = (await store.get('log', { type: 'json' })) || [];
  let mutatedConfirmed = false;
  let mutatedLog = false;
  confirmed = confirmed.map((b, i) => {
    if (!b.id) { mutatedConfirmed = true; return { id: 'S-' + i + '-' + Date.now().toString(36), ...b }; }
    return b;
  });

  const action = body.action || 'list';

  if (action === 'confirm') {
    const r = requests.find((x) => x.id === body.id);
    if (r) {
      confirmed.push({ id: r.id, unit: r.unit, start: r.start, end: r.end, name: r.name || '', email: r.email || '', estimated_total: r.estimated_total != null ? r.estimated_total : null });
      requests = requests.filter((x) => x.id !== body.id);
      mutatedConfirmed = true;
      await store.setJSON('requests', requests);
      const li = log.find((x) => x.id === body.id);
      if (li) { li.status = 'confirmed'; mutatedLog = true; }
    }
  } else if (action === 'decline') {
    requests = requests.filter((x) => x.id !== body.id);
    await store.setJSON('requests', requests);
    const li = log.find((x) => x.id === body.id);
    if (li) { li.status = 'declined'; mutatedLog = true; }
  } else if (action === 'add') {
    if (!body.unit || !body.start || !body.end) return json(400, { error: 'missing_fields' });
    confirmed.push({
      id: 'M-' + Date.now().toString(36),
      unit: body.unit, start: body.start, end: body.end,
      name: body.name || 'Blocked'
    });
    mutatedConfirmed = true;
  } else if (action === 'delete') {
    const before = confirmed.length;
    confirmed = confirmed.filter((x) => x.id !== body.id);
    mutatedConfirmed = mutatedConfirmed || confirmed.length !== before;
  } else if (action !== 'list') {
    return json(400, { error: 'unknown_action' });
  }

  if (mutatedConfirmed) await store.setJSON('confirmed', confirmed);
  if (mutatedLog) await store.setJSON('log', log);

  // Sort for a tidy dashboard.
  confirmed.sort((a, b) => (a.start < b.start ? -1 : 1));
  requests.sort((a, b) => ((a.receivedAt || '') > (b.receivedAt || '') ? -1 : 1));

  // Live setup status for the launch checklist (all functions share Netlify env vars).
  const config = {
    signwell: !!(process.env.SIGNWELL_API_KEY && process.env.SIGNWELL_TEMPLATE_ID),
    signwell_test: process.env.SIGNWELL_TEST_MODE === 'true',
    payment: !!(process.env.PAYMENT_LINK_URL || process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_SECRET_KEY),
    payment_link: process.env.PAYMENT_LINK_URL || process.env.STRIPE_PAYMENT_LINK || ''
  };

  return json(200, { confirmed, requests, log, config });
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}
