// Stores an incoming booking request so it shows up in the admin dashboard.
// Delivery/email still happens via Netlify Forms; this is the "live" copy.
const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }
  if (!data.unit || !data.start || !data.end) return json(400, { error: 'missing_fields' });

  try {
    connectLambda(event); // wire up Blobs credentials for classic (Lambda) functions
    const store = getStore({ name: 'colorwagon', consistency: 'strong' });
    const requests = (await store.get('requests', { type: 'json' })) || [];
    data.receivedAt = new Date().toISOString();
    data.status = 'pending';
    requests.push(data);
    await store.setJSON('requests', requests);
    return json(200, { ok: true });
  } catch (e) {
    return json(200, { ok: false, error: 'store_unavailable' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}
