// Public availability feed - powers the live booking calendar.
// Returns only { unit, start, end } (no customer info).
const { getStore, connectLambda } = require('@netlify/blobs');

// One-time seed: the dates that were in js/bookings-data.js at launch.
// After the first request these live in the Blobs store and are managed
// from the admin dashboard.
const SEED = [
  { unit: 'gertrude', start: '2026-07-01', end: '2026-07-05' },
  { unit: 'violet',   start: '2026-07-01', end: '2026-07-05' },
  { unit: 'violet',   start: '2026-07-13', end: '2026-07-16' },
  { unit: 'gertrude', start: '2026-07-17', end: '2026-07-20' },
  { unit: 'violet',   start: '2026-07-17', end: '2026-07-20' },
  { unit: 'violet',   start: '2026-08-12', end: '2026-08-26' },
  { unit: 'gertrude', start: '2026-08-14', end: '2026-08-21' }
];

exports.handler = async (event) => {
  try {
    connectLambda(event); // wire up Blobs credentials for classic (Lambda) functions
    const store = getStore('colorwagon');
    let confirmed = await store.get('confirmed', { type: 'json' });
    if (!Array.isArray(confirmed)) {
      confirmed = SEED.map((b, i) => ({ id: 'S-' + i, ...b }));
      await store.setJSON('confirmed', confirmed);
    }
    const bookings = confirmed.map((b) => ({ unit: b.unit, start: b.start, end: b.end }));
    return json(200, { bookings });
  } catch (e) {
    // Store not available (e.g. Blobs not enabled) - client falls back to the static list.
    return json(200, { bookings: [], error: 'store_unavailable' });
  }
};

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
