// Creates an embedded SignWell signing session for the renter, from a
// reusable template (which holds the ~12 signature fields across pages).
//
// Requires these environment variables in Netlify:
//   SIGNWELL_API_KEY      - your SignWell API key
//   SIGNWELL_TEMPLATE_ID  - the template id for the rental agreement
//   SIGNWELL_TEST_MODE    - "true" while testing (optional)
//
// If the keys aren't set, returns { configured: false } and the booking
// page shows the "we'll email your agreement" fallback instead.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  const apiKey = process.env.SIGNWELL_API_KEY;
  const templateId = process.env.SIGNWELL_TEMPLATE_ID;
  if (!apiKey || !templateId) return json(200, { configured: false });

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }
  if (!data.name || !data.email) return json(400, { error: 'missing_fields' });

  try {
    const res = await fetch('https://www.signwell.com/api/v1/document_templates/documents/', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_mode: process.env.SIGNWELL_TEST_MODE === 'true',
        template_id: templateId,
        embedded_signing: true,
        embedded_signing_notifications: true,
        draft: false,
        subject: 'Color Wagon Rentals: Rental Agreement',
        message: 'Please review and sign your Color Wagon Rentals rental agreement.',
        recipients: [{ id: '1', name: data.name, email: data.email }],
        metadata: {
          camper: data.camper || '',
          pickup_date: data.pickup_date || '',
          return_date: data.return_date || ''
        }
      })
    });

    const doc = await res.json().catch(() => ({}));
    if (!res.ok) return json(200, { configured: true, error: 'signwell_error', status: res.status, detail: doc });

    const url = findEmbeddedUrl(doc);
    if (!url) return json(200, { configured: true, error: 'no_embedded_url' });
    return json(200, { configured: true, embedded_url: url });
  } catch (e) {
    return json(200, { configured: true, error: 'exception', message: String(e && e.message || e) });
  }
};

function findEmbeddedUrl(doc) {
  if (!doc || typeof doc !== 'object') return null;
  if (doc.embedded_signing_url) return doc.embedded_signing_url;
  const r = Array.isArray(doc.recipients) ? doc.recipients[0] : null;
  if (r && r.embedded_signing_url) return r.embedded_signing_url;
  return null;
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}
