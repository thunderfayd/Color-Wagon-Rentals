// Stores an incoming booking request so it shows up in the admin dashboard,
// then emails Heidi and Will about it.
//
// This used to say delivery happened via Netlify Forms. It did not: Forms was
// never enabled on this site, so those POSTs 404'd and the only thing keeping
// a booking request alive was this function writing to Blobs. Nobody was told
// a request had come in unless they happened to open the dashboard.
const { getStore, connectLambda } = require('@netlify/blobs');
const { notify } = require('../lib/notify');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json' }); }
  if (!data.unit || !data.start || !data.end) return json(400, { error: 'missing_fields' });

  try {
    connectLambda(event); // wire up Blobs credentials for classic (Lambda) functions
    const store = getStore('colorwagon');
    const requests = (await store.get('requests', { type: 'json' })) || [];
    data.receivedAt = new Date().toISOString();
    data.status = 'pending';
    requests.push(data);
    await store.setJSON('requests', requests);

    // Append to the permanent analytics log (compact + capped). Requests that
    // are later declined are removed from the queue but stay here for stats.
    try {
      let log = (await store.get('log', { type: 'json' })) || [];
      log.push({
        id: data.id,
        unit: data.unit,
        nights: data.nights != null ? data.nights : null,
        estimated_total: data.estimated_total != null ? data.estimated_total : null,
        signed: !!data.signed,
        receivedAt: data.receivedAt,
        status: 'pending'
      });
      if (log.length > 2000) log = log.slice(-2000);
      await store.setJSON('log', log);
    } catch (e) { /* analytics log is best-effort */ }

    const mail = await notify({
      subject: 'Booking request: ' + (data.name || 'someone') + ', ' + unitName(data.unit) + ' ' + data.start + ' to ' + data.end,
      replyTo: data.email || undefined,
      text: [
        (data.name || 'Someone') + ' requested a camper on colorwagonrentals.com.',
        '',
        'Camper:    ' + unitName(data.unit),
        'Dates:     ' + data.start + ' to ' + data.end + (data.nights ? ' (' + data.nights + ' nights)' : ''),
        'Quoted:    ' + (data.estimated_total != null ? '$' + data.estimated_total : 'contact for pricing'),
        '',
        'Name:      ' + (data.name || ''),
        'Email:     ' + (data.email || ''),
        'Phone:     ' + (data.phone || ''),
        'Address:   ' + (data.address || ''),
        'Born:      ' + (data.dob || ''),
        'Licence:   ' + (data.license_number || '') + ' (' + (data.license_state || '') + ')',
        'Group:     ' + (data.group_size || ''),
        'Heading:   ' + (data.destination || 'not said'),
        '',
        'Requests:  ' + (data.special_requests || 'none'),
        '',
        '-- ',
        'Confirm or decline it at colorwagonrentals.com/admin',
        'Reply to this email and it goes straight back to them.'
      ].join('\n')
    });

    return json(200, { ok: true, emailed: mail.sent });
  } catch (e) {
    return json(200, { ok: false, error: 'store_unavailable' });
  }
};

function unitName(u) {
  return { gertrude: 'Gertrude', violet: 'Violet', trailer: 'The Trailer' }[u] || u || 'a camper';
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}
