/* =============================================
   Color Wagon Rentals - Booking System
   Real booked dates live in js/bookings-data.js
   ============================================= */

// ---- Pricing ----
const NIGHTLY_RATE = 99;
const WEEKLY_RATE = 650;
const MILES_PER_WEEK = 700;
const OVERAGE_PER_MILE = 0.45;

// Weekly blocks + remaining nights, never more than another full week.
function estimatePrice(nights) {
  const weeks = Math.floor(nights / 7);
  const rem = nights % 7;
  return weeks * WEEKLY_RATE + Math.min(rem * NIGHTLY_RATE, WEEKLY_RATE);
}

// Fees & tax added to every rental.
const CLEANING_FEE = 50;
// Wisconsin state sales tax (5%) + Manitowoc County (0.5%).
const SALES_TAX_RATE = 0.055;

function priceBreakdown(nights) {
  const base = estimatePrice(nights);
  const cleaning = CLEANING_FEE;
  const taxable = base + cleaning;
  const tax = Math.round(taxable * SALES_TAX_RATE * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  return { base, cleaning, tax, total };
}

function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- State ----
const state = {
  step: 1,
  vehicle: null,
  pickupDate: null,
  returnDate: null,
  nights: 0,
  firstName: '', lastName: '', email: '', phone: '',
  address: '', dob: '', licenseNum: '', licenseState: '',
  groupSize: '', destination: '', specialRequests: '', signed: false
};

// ---- Bookings: live availability (Netlify) with static fallback + this browser's pending requests ----
let liveBookings = null; // null until /api/availability responds; array once loaded

function baseBookings() {
  if (Array.isArray(liveBookings)) return liveBookings;
  return (typeof CWR_BOOKED_DATES !== 'undefined' ? CWR_BOOKED_DATES : []);
}

function getBookings() {
  const real = baseBookings().map((b, i) => ({ id: 'cal-' + i, ...b }));
  const stored = localStorage.getItem('cwrBookings');
  const requests = stored ? JSON.parse(stored) : [];
  return [...real, ...requests];
}

// Pull the always-current booked dates from the Netlify function so the
// calendar live-updates the moment Heidi confirms/cancels in the dashboard.
// Falls back silently to the static bookings-data.js list if unavailable.
async function loadLiveAvailability() {
  try {
    const res = await fetch('/api/availability', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.bookings)) {
      liveBookings = data.bookings;
      if (fullCalendar) {
        fullCalendar.removeAllEvents();
        fullCalendar.addEventSource(getCalendarEvents(activeFilter));
      }
      checkDateAvailability();
    }
  } catch (e) { /* offline / not deployed yet - static fallback stays */ }
}

function saveBooking(booking) {
  const stored = localStorage.getItem('cwrBookings');
  const requests = stored ? JSON.parse(stored) : [];
  requests.push(booking);
  localStorage.setItem('cwrBookings', JSON.stringify(requests));
}

// ---- Unit config ----
const UNITS = {
  gertrude: { name: 'Gertrude', priced: true, color: '#C2700E', emoji: '🍂', sleeps: 2 },
  violet:   { name: 'Violet',   priced: true, color: '#7C3AED', emoji: '🐸', sleeps: 2 },
  trailer:  { name: 'The Trailer', priced: false, color: '#B45309', emoji: '🏕️', sleeps: 6 }
};

// ---- FullCalendar (availability overview) ----
let fullCalendar = null;
let activeFilter = 'all';

// 'end' in the data is the return day; FullCalendar treats end as exclusive,
// so push it one day forward to display the full booked range.
function displayEnd(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getCalendarEvents(filter) {
  return getBookings()
    .filter(b => filter === 'all' || b.unit === filter)
    .map(b => {
      const unit = UNITS[b.unit] || {};
      return {
        title: (unit.name || b.unit) + ' booked',
        start: b.start,
        end: displayEnd(b.end),
        classNames: ['booked-' + b.unit],
        extendedProps: { unit: b.unit }
      };
    });
}

function filterCalendar(unit, btn) {
  activeFilter = unit;
  document.querySelectorAll('.cal-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (fullCalendar) {
    fullCalendar.removeAllEvents();
    fullCalendar.addEventSource(getCalendarEvents(unit));
  }
}

function initFullCalendar() {
  const el = document.getElementById('fullCalendar');
  if (!el || typeof FullCalendar === 'undefined') return;
  fullCalendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
    height: 'auto',
    events: getCalendarEvents('all'),
    eventClick(info) {
      const unit = info.event.extendedProps.unit;
      const unitData = UNITS[unit] || {};
      alert(`${unitData.name || unit} is already booked for those dates.\n\nPlease choose different dates or a different camper, or give us a call, we may be able to work something out!`);
    },
    dateClick(info) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const clicked = new Date(info.dateStr + 'T00:00:00');
      if (clicked < today) return;
      const section = document.getElementById('booking-form');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          if (state.step >= 2 && pickupFlatpickr) {
            pickupFlatpickr.setDate(info.dateStr, true);
          }
        }, 500);
      }
    },
    validRange: { start: new Date().toISOString().split('T')[0] },
    firstDay: 0,
  });
  fullCalendar.render();
}

// ---- Date pickers ----
let pickupFlatpickr = null;
let returnFlatpickr = null;

function initDatePickers() {
  const pickupEl = document.getElementById('pickupDate');
  const returnEl = document.getElementById('returnDate');
  if (!pickupEl || !returnEl || typeof flatpickr === 'undefined') return;

  pickupFlatpickr = flatpickr(pickupEl, {
    minDate: 'today',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'F j, Y',
    onChange(selectedDates) {
      if (selectedDates.length) {
        state.pickupDate = selectedDates[0];
        const minReturn = new Date(selectedDates[0]);
        minReturn.setDate(minReturn.getDate() + 1);
        returnFlatpickr.set('minDate', minReturn);
        if (state.returnDate && state.returnDate < minReturn) {
          returnFlatpickr.clear();
          state.returnDate = null;
        }
        checkDateAvailability();
        updateSummary();
      }
    }
  });

  returnFlatpickr = flatpickr(returnEl, {
    minDate: new Date(Date.now() + 86400000),
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'F j, Y',
    onChange(selectedDates) {
      if (selectedDates.length) {
        state.returnDate = selectedDates[0];
        checkDateAvailability();
        updateSummary();
      }
    }
  });
}

// Booked ranges block pickup/return overlap; the return day itself is
// left open so a new rental can start the day another one ends.
function hasConflict(unit, pickup, ret) {
  const pStart = pickup.getTime();
  const pEnd = ret.getTime();
  return getBookings()
    .filter(b => b.unit === unit)
    .some(b => {
      const bStart = new Date(b.start + 'T00:00:00').getTime();
      const bEnd = new Date(b.end + 'T00:00:00').getTime();
      return pStart < bEnd && pEnd > bStart;
    });
}

function checkDateAvailability() {
  const conflictAlert = document.getElementById('date-conflict-alert');
  const okAlert = document.getElementById('date-ok-alert');
  const nightsSummary = document.getElementById('nights-summary');
  if (!conflictAlert || !okAlert) return;

  if (!state.pickupDate || !state.returnDate) {
    conflictAlert.style.display = 'none';
    okAlert.style.display = 'none';
    return;
  }

  const nights = Math.round((state.returnDate - state.pickupDate) / 86400000);
  state.nights = nights;

  if (nights < 1) {
    conflictAlert.style.display = 'block';
    conflictAlert.textContent = '⚠️ Return date must be after your pickup date.';
    okAlert.style.display = 'none';
    return;
  }

  if (state.vehicle && hasConflict(state.vehicle, state.pickupDate, state.returnDate)) {
    conflictAlert.style.display = 'block';
    conflictAlert.textContent = '⚠️ Those dates overlap with an existing booking for ' + UNITS[state.vehicle].name + '. Please choose different dates or the other van.';
    okAlert.style.display = 'none';
    return;
  }

  conflictAlert.style.display = 'none';
  okAlert.style.display = 'block';
  const weeks = Math.floor(nights / 7);
  const extra = nights % 7;
  let txt = `${nights} night${nights > 1 ? 's' : ''}`;
  if (weeks > 0) txt += ` (${weeks} week${weeks > 1 ? 's' : ''}${extra > 0 ? ' + ' + extra + ' night' + (extra > 1 ? 's' : '') : ''})`;
  if (nightsSummary) nightsSummary.textContent = txt + ': these dates are open!';
}

// ---- Vehicle Selection ----
function selectVehicle(unit, el) {
  state.vehicle = unit;
  document.querySelectorAll('.vehicle-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const err = document.getElementById('v-error');
  if (err) err.style.display = 'none';
  updateSummary();
  checkDateAvailability();
  if (fullCalendar && activeFilter !== 'all') {
    filterCalendar(unit, null);
    document.querySelectorAll('.cal-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.unit === unit);
    });
    activeFilter = unit;
  }
}

// Pre-select unit from ?unit= in the URL
(function () {
  const p = new URLSearchParams(window.location.search);
  const u = p.get('unit');
  if (u && UNITS[u]) {
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('opt-' + u);
      if (el) selectVehicle(u, el);
    });
  }
})();

// ---- Step Navigation ----
function goToStep(n) {
  if (n > state.step) {
    if (!validateStep(state.step)) return;
  }
  state.step = n;
  renderSteps();
  if (n === 4) buildReviewSummary();
  window.scrollTo({ top: document.getElementById('booking-form').offsetTop - 80, behavior: 'smooth' });
}

function validateStep(step) {
  if (step === 1) {
    const err = document.getElementById('v-error');
    if (!state.vehicle) {
      if (err) err.style.display = 'block';
      return false;
    }
    if (err) err.style.display = 'none';
    return true;
  }
  if (step === 2) {
    let ok = true;
    const pickupErr = document.getElementById('pickup-error');
    const returnErr = document.getElementById('return-error');
    if (!state.pickupDate) { if (pickupErr) pickupErr.classList.add('show'); ok = false; }
    else if (pickupErr) pickupErr.classList.remove('show');
    if (!state.returnDate || state.nights < 1) { if (returnErr) returnErr.classList.add('show'); ok = false; }
    else if (returnErr) returnErr.classList.remove('show');
    if (ok && state.vehicle && hasConflict(state.vehicle, state.pickupDate, state.returnDate)) {
      alert('Those dates are already booked for ' + UNITS[state.vehicle].name + '. Please choose different dates.');
      return false;
    }
    return ok;
  }
  if (step === 3) {
    let ok = true;
    function checkField(id, errId, test) {
      const el = document.getElementById(id);
      const err = document.getElementById(errId);
      if (!el) return;
      if (!test(el.value.trim())) {
        el.classList.add('error');
        if (err) err.classList.add('show');
        ok = false;
      } else {
        el.classList.remove('error');
        if (err) err.classList.remove('show');
      }
    }
    checkField('firstName', 'fn-error', v => v.length > 0);
    checkField('lastName', 'ln-error', v => v.length > 0);
    checkField('email', 'email-error', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    checkField('phone', 'phone-error', v => v.length >= 7);
    checkField('address', 'addr-error', v => v.length > 5);
    checkField('licenseNum', 'lic-error', v => v.length > 3);
    checkField('licenseState', 'state-error', v => v.length > 0);
    checkField('groupSize', 'group-error', v => v.length > 0);
    const dobEl = document.getElementById('dob');
    const dobErr = document.getElementById('dob-error');
    if (dobEl && dobEl.value) {
      const dob = new Date(dobEl.value);
      const today = new Date();
      const age = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 25) {
        dobEl.classList.add('error');
        if (dobErr) dobErr.classList.add('show');
        ok = false;
      } else {
        dobEl.classList.remove('error');
        if (dobErr) dobErr.classList.remove('show');
      }
    } else {
      if (dobEl) dobEl.classList.add('error');
      if (dobErr) dobErr.classList.add('show');
      ok = false;
    }
    if (ok) {
      state.firstName = document.getElementById('firstName').value.trim();
      state.lastName = document.getElementById('lastName').value.trim();
      state.email = document.getElementById('email').value.trim();
      state.phone = document.getElementById('phone').value.trim();
      state.address = document.getElementById('address').value.trim();
      state.dob = document.getElementById('dob').value;
      state.licenseNum = document.getElementById('licenseNum').value.trim();
      state.licenseState = document.getElementById('licenseState').value;
      state.groupSize = document.getElementById('groupSize').value;
      state.destination = document.getElementById('destination').value.trim();
      state.specialRequests = document.getElementById('specialRequests').value.trim();
    }
    return ok;
  }
  return true;
}

function renderSteps() {
  for (let i = 1; i <= 6; i++) {
    const panel = document.getElementById('step' + i);
    const dot = document.getElementById('dot' + i);
    const lbl = document.getElementById('lbl' + i);
    if (panel) panel.classList.toggle('visible', i === state.step);
    if (dot) {
      dot.classList.toggle('active', i === state.step);
      dot.classList.toggle('done', i < state.step);
      dot.innerHTML = i < state.step ? '' : '<span class="num">' + i + '</span>';
    }
    if (lbl) lbl.classList.toggle('active', i === state.step);
    if (i < 6) {
      const line = document.getElementById('line' + i + (i + 1));
      if (line) line.classList.toggle('done', state.step > i);
    }
  }
}

// ---- Summary Sidebar ----
function updateSummary() {
  const body = document.getElementById('summaryBody');
  const cta = document.getElementById('summaryCta');
  const total = document.getElementById('summaryTotal');
  if (!body) return;

  const rows = [];
  if (state.vehicle) {
    const u = UNITS[state.vehicle];
    rows.push(['Camper', u.emoji + ' ' + u.name]);
  }
  if (state.pickupDate) rows.push(['Pickup', formatDate(state.pickupDate)]);
  if (state.returnDate) {
    rows.push(['Return', formatDate(state.returnDate)]);
    if (state.nights > 0) rows.push(['Duration', state.nights + ' night' + (state.nights > 1 ? 's' : '')]);
  }
  if (state.firstName) rows.push(['Guest', state.firstName + ' ' + state.lastName]);

  const priced = !!(state.vehicle && state.nights > 0 && UNITS[state.vehicle] && UNITS[state.vehicle].priced);
  let bd = null;
  if (priced) {
    bd = priceBreakdown(state.nights);
    rows.push(['Rental', money(bd.base)]);
    rows.push(['Cleaning &amp; prep', money(bd.cleaning)]);
    rows.push(['Est. WI tax', money(bd.tax)]);
  }

  if (rows.length === 0) {
    body.innerHTML = '<p class="summary-empty">Your booking details will appear here as you complete each step.</p>';
    if (cta) cta.style.display = 'none';
    return;
  }

  body.innerHTML = rows.map(([label, val]) =>
    `<div class="summary-row"><span class="label">${label}</span><span>${val}</span></div>`
  ).join('');

  if (priced) {
    if (cta) cta.style.display = 'block';
    if (total) total.textContent = money(bd.total);
  } else if (cta) {
    cta.style.display = 'none';
  }
}

function formatDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Review Summary (step 4) ----
function buildReviewSummary() {
  const el = document.getElementById('review-summary');
  if (!el) return;
  const u = UNITS[state.vehicle] || {};
  const bd = u.priced ? priceBreakdown(state.nights) : null;
  const est = bd ? money(bd.total) : 'Contact for pricing';
  const cell = (label, value) => `
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">${label}</div>
        <div style="font-weight:700;">${value}</div>
      </div>`;
  el.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
      ${cell('Camper', (u.emoji || '') + ' ' + (u.name || state.vehicle))}
      ${cell('Guest', state.firstName + ' ' + state.lastName)}
      ${cell('Pickup Date', formatDate(state.pickupDate))}
      ${cell('Return Date', formatDate(state.returnDate))}
      ${cell('Duration', state.nights + ' night' + (state.nights > 1 ? 's' : ''))}
      ${cell('Estimated Total', '<span style="color:var(--green-dark); font-size:1.1rem;">' + est + '</span>')}
    </div>
    ${bd ? `<div style="border-top:1px solid var(--cream-dark); margin-bottom:1rem; padding-top:0.85rem; font-size:0.9rem;">
      <div style="display:flex; justify-content:space-between; padding:0.15rem 0;"><span style="color:var(--gray);">Rental (${state.nights} night${state.nights > 1 ? 's' : ''})</span><span>${money(bd.base)}</span></div>
      <div style="display:flex; justify-content:space-between; padding:0.15rem 0;"><span style="color:var(--gray);">Cleaning &amp; prep fee</span><span>${money(bd.cleaning)}</span></div>
      <div style="display:flex; justify-content:space-between; padding:0.15rem 0;"><span style="color:var(--gray);">Wisconsin sales tax (5.5%)</span><span>${money(bd.tax)}</span></div>
      <div style="display:flex; justify-content:space-between; padding:0.4rem 0 0; font-weight:800; color:var(--green-dark);"><span>Estimated total</span><span>${money(bd.total)}</span></div>
    </div>` : ''}
    <div style="border-top:1px solid var(--cream-dark); padding-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.875rem;">
      <div><span style="color:var(--gray);">Email:</span> ${state.email}</div>
      <div><span style="color:var(--gray);">Phone:</span> ${state.phone}</div>
      <div><span style="color:var(--gray);">Group:</span> ${state.groupSize} traveler${state.groupSize !== '1' ? 's' : ''}</div>
      <div><span style="color:var(--gray);">License:</span> ${state.licenseState} ${state.licenseNum}</div>
      ${state.destination ? `<div style="grid-column:1/-1;"><span style="color:var(--gray);">Destination:</span> ${state.destination}</div>` : ''}
    </div>`;
}

// ---- Step 4 → validate agreement checkboxes, then move to e-signature ----
function proceedToSign() {
  const agree = document.getElementById('agreeTerms');
  const ageCheck = document.getElementById('agreeAge');
  const depCheck = document.getElementById('agreeDeposit');
  const termsErr = document.getElementById('terms-error');
  if (!agree.checked || !ageCheck.checked || !depCheck.checked) {
    if (termsErr) termsErr.style.display = 'block';
    return;
  }
  if (termsErr) termsErr.style.display = 'none';
  goToStep(5);
  initSignature();
}

// ---- Rental agreement e-signature (SignWell, embedded) ----
// Asks the Netlify function for an embedded signing session for this renter.
// If SignWell isn't configured yet, we fall back to "we'll email it to you".
let signatureRequested = false;
async function initSignature() {
  if (signatureRequested) return;
  signatureRequested = true;
  const loading = document.getElementById('sign-loading');
  const wrap = document.getElementById('sign-embed-wrap');
  const frame = document.getElementById('sign-embed');
  const fallback = document.getElementById('sign-fallback');
  if (loading) loading.style.display = 'block';
  try {
    const res = await fetch('/api/create-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: (state.firstName + ' ' + state.lastName).trim(),
        email: state.email,
        camper: (UNITS[state.vehicle] || {}).name || state.vehicle,
        pickup_date: state.pickupDate ? state.pickupDate.toISOString().split('T')[0] : '',
        return_date: state.returnDate ? state.returnDate.toISOString().split('T')[0] : ''
      })
    });
    const data = res.ok ? await res.json() : {};
    if (data && data.embedded_url) {
      if (frame) frame.src = data.embedded_url;
      if (wrap) wrap.style.display = 'block';
      if (loading) loading.style.display = 'none';
      return;
    }
  } catch (e) { /* not configured / offline - show the email fallback below */ }
  if (loading) loading.style.display = 'none';
  if (fallback) fallback.style.display = 'block';
}

// SignWell posts a message to the page when the signer finishes.
window.addEventListener('message', (e) => {
  let s = '';
  try { s = (typeof e.data === 'string' ? e.data : JSON.stringify(e.data || '')).toLowerCase(); } catch (_) { s = ''; }
  if (!s) return;
  if (s.includes('signwell') && (s.includes('complete') || s.includes('signed') || s.includes('finish'))) {
    state.signed = true;
    const done = document.getElementById('sign-done');
    if (done) done.style.display = 'block';
  }
});

// ---- Submit Booking ----
function submitBooking() {
  const id = 'CWR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const startStr = state.pickupDate.toISOString().split('T')[0];
  const endStr = state.returnDate.toISOString().split('T')[0];
  const u = UNITS[state.vehicle] || {};

  // Save locally so this browser's calendar blocks the requested dates right away.
  saveBooking({
    id,
    unit: state.vehicle,
    start: startStr,
    end: endStr,
    name: state.firstName + ' ' + state.lastName,
    email: state.email,
    phone: state.phone,
    groupSize: state.groupSize,
    submittedAt: new Date().toISOString()
  });

  // Deliver the request to Heidi & Will via Netlify Forms (no backend needed).
  // Fails silently if previewing locally - the confirmation still shows and the
  // request is preserved in localStorage above.
  const payload = new URLSearchParams({
    'form-name': 'booking',
    confirmation_id: id,
    camper: u.name || state.vehicle,
    pickup_date: startStr,
    return_date: endStr,
    nights: String(state.nights),
    estimated_total: u.priced ? money(priceBreakdown(state.nights).total) : 'Contact for pricing',
    first_name: state.firstName,
    last_name: state.lastName,
    email: state.email,
    phone: state.phone,
    address: state.address,
    date_of_birth: state.dob,
    license_number: state.licenseNum,
    license_state: state.licenseState,
    group_size: state.groupSize,
    destination: state.destination,
    special_requests: state.specialRequests,
    agreement_signed: state.signed ? 'yes' : 'emailed after booking'
  });
  fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.toString() })
    .catch(() => { /* offline / local preview - request is still saved locally */ });

  // Also store the request in the live system so it appears in Heidi & Will's
  // dashboard and can be confirmed with one click. Best-effort; never blocks.
  fetch('/api/request-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id, unit: state.vehicle, start: startStr, end: endStr,
      name: state.firstName + ' ' + state.lastName,
      email: state.email, phone: state.phone, address: state.address,
      dob: state.dob, license_number: state.licenseNum, license_state: state.licenseState,
      group_size: state.groupSize, nights: state.nights,
      estimated_total: u.priced ? priceBreakdown(state.nights).total : null,
      destination: state.destination, special_requests: state.specialRequests,
      signed: state.signed, submittedAt: new Date().toISOString()
    })
  }).catch(() => { /* not deployed yet - request still delivered via Netlify Forms */ });

  document.getElementById('confirmationId').textContent = id;
  const emailEl = document.getElementById('confirmEmail');
  if (emailEl) emailEl.textContent = state.email;

  const confDet = document.getElementById('confirmationDetails');
  if (confDet) {
    const card = (label, value) => `
      <div class="conf-detail-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
      </div>`;
    confDet.innerHTML =
      card('Camper', (u.emoji || '') + ' ' + (u.name || state.vehicle)) +
      card('Guest Name', state.firstName + ' ' + state.lastName) +
      card('Pickup Date', formatDate(state.pickupDate)) +
      card('Return Date', formatDate(state.returnDate)) +
      card('Duration', state.nights + ' night' + (state.nights > 1 ? 's' : '')) +
      card('Rental Agreement', state.signed
        ? '<span style="color:var(--green-dark);">✓ Signed</span>'
        : '<span style="color:var(--gertrude);">Sent to your email</span>') +
      card('Booking Status', '<span style="color:var(--gertrude);">⏳ Pending Confirmation</span>');
  }

  goToStep(6);

  if (fullCalendar) {
    fullCalendar.removeAllEvents();
    fullCalendar.addEventSource(getCalendarEvents(activeFilter));
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initFullCalendar();
  initDatePickers();
  renderSteps();
  updateSummary();
  loadLiveAvailability();
});
