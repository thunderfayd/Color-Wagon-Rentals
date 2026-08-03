// Records a single pageview into Blobs. No cookies, no IPs, no PII —
// just aggregate counts so the admin dashboard can show site traffic.
const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  let path = String(body.path || '/').slice(0, 120);
  const newVisitor = !!body.newVisitor;
  const newDay = !!body.newDay;

  try {
    connectLambda(event);
    const store = getStore('colorwagon');
    const t = (await store.get('traffic', { type: 'json' })) || { totalViews: 0, totalVisitors: 0, days: {}, pages: {} };
    const today = new Date().toISOString().split('T')[0];

    t.totalViews = (t.totalViews || 0) + 1;
    if (newVisitor) t.totalVisitors = (t.totalVisitors || 0) + 1;

    t.days = t.days || {};
    if (!t.days[today]) t.days[today] = { views: 0, visitors: 0 };
    t.days[today].views++;
    if (newDay) t.days[today].visitors++;

    t.pages = t.pages || {};
    t.pages[path] = (t.pages[path] || 0) + 1;

    // Keep only the most recent ~120 days so the record stays small.
    const dayKeys = Object.keys(t.days).sort();
    if (dayKeys.length > 120) dayKeys.slice(0, dayKeys.length - 120).forEach((k) => delete t.days[k]);

    await store.setJSON('traffic', t);
  } catch (e) { /* best-effort — never fail the page */ }

  return { statusCode: 204, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }, body: '' };
};
