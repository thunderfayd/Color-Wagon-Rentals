/* =============================================
   Color Wagon Rentals — Booking System
   ============================================= */

// ---- State ----
const state = {
  step: 1,
  vehicle: null,
  pickupDate: null,
  returnDate: null,
  nights: 0,
  firstName: '', lastName: '', email: '', phone: '',
  address: '', dob: '', licenseNum: '', licenseState: '',
  groupSize: '', destination: '', specialRequests: ''
};

// ---- Pre-loaded bookings (demo data) ----
function getBookings() {
  const stored = localStorage.getItem('cwrBookings');
  const saved = stored ? JSON.parse(stored) : [];
  // Merge with seed data, avoiding duplicates by id
  const seedIds = new Set(saved.map(b => b.id));
  const seeds = [
    { id: 'seed1', unit: 'gertrude', start: '2026-06-14', end: '2026-06-21', name: 'Sample Guest' },
    { id: 'seed2', unit: 'gertrude', start: '2026-07-05', end: '2026-07-12', name: 'Sample Guest' },
    { id: 'seed3', unit: 'violet',   start: '2026-06-20', end: '2026-06-27', name: 'Sample Guest' },
    { id: 'seed4', unit: 'violet',   start: '2026-07-18', end: '2026-07-25', name: 'Sample Guest' },
    { id: 'seed5', unit: 'trailer',  start: '2026-07-04', end: '2026-07-11', name: 'Sample Guest' },
    { id: 'seed6', unit: 'gertrude', start: '2026-08-01', end: '2026-08-08', name: 'Sample Guest' },
    { id: 'seed7', unit: 'violet',   start: '2026-08-15', end: '2026-08-22', name: 'Sample Guest' },
  ].filter(s => !seedIds.has(s.id));
  return [...saved, ...seeds];
}

function saveBooking(booking) {
  const bookings = getBookings().filter(b => !b.id.startsWith('seed'));
  bookings.push(booking);
  localStorage.setItem('cwrBookings', JSON.stringify(bookings));
}

// ---- Unit config ----
const UNITS = {
  gertrude: { name: 'Gertrude', price: 650, color: '#DC2626', emoji: '🌿', sleeps: 2 },
  violet:   { name: 'Violet',   price: 650, color: '#7C3AED', emoji: '💜', sleeps: 2 },
  trailer:  { name: 'The Trailer', price: null, color: '#D97706', emoji: '🏠', sleeps: 6 }
};

// ---- FullCalendar (availability overview) ----
let fullCalendar = null;
let activeFilter = 'all';

function getCalendarEvents(filter) {
  const bookings = getBookings();
  return bookings
    .filter(b => filter === 'all' || b.unit === filter)
    .map(b => {
      const unit = UNITS[b.unit] || {};
      return {
        title: unit.name || b.unit,
        start: b.start,
        end: b.end,
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
      alert(`This ${unitData.name || unit} rental is already booked.\n\nStart: ${info.event.startStr}\nEnd: ${info.event.endStr}\n\nPlease choose different dates or a different camper.`);
    },
    dateClick(info) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const clicked = new Date(info.dateStr);
      if (clicked < today) return;
      // Jump to booking form
      const section = document.getElementById('booking-form');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Pre-fill pickup date if we're on step 2 or later
        setTimeout(() => {
          if (state.step >= 2 && pickupFlatpickr) {
            pickupFlatpickr.setDate(info.dateStr);
          }
        }, 500);
      }
    },
    validRange: { start: new Date().toISOString().split('T')[0] },
    firstDay: 0,
  });
  fullCalendar.render();
}

// ---- Mini calendar for date step ----
let miniCalendar = null;
let pickupFlatpickr = null;
let returnFlatpickr = null;

function initDatePickers() {
  const pickupEl = document.getElementById('pickupDate');
  const returnEl = document.getElementById('returnDate');
  if (!pickupEl || !returnEl) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  pickupFlatpickr = flatpickr(pickupEl, {
    minDate: 'today',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'F j, Y',
    onChange(selectedDates) {
      if (selectedDates.length) {
        state.pickupDate = selectedDates[0];
        const minReturn = new Date(selectedDates[0]);
        minReturn.setDate(minReturn.getDate() + 7);
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
    minDate: new Date(today.getTime() + 7 * 86400000),
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

  if (nights < 7) {
    conflictAlert.style.display = 'block';
    conflictAlert.textContent = '⚠️ Minimum rental is 7 nights. Please extend your return date.';
    okAlert.style.display = 'none';
    return;
  }

  // Check conflicts
  if (state.vehicle) {
    const bookings = getBookings().filter(b => b.unit === state.vehicle);
    const pStart = state.pickupDate.getTime();
    const pEnd = state.returnDate.getTime();
    const conflict = bookings.some(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      return pStart < bEnd && pEnd > bStart;
    });
    if (conflict) {
      conflictAlert.style.display = 'block';
      conflictAlert.textContent = '⚠️ Those dates overlap with an existing booking for ' + UNITS[state.vehicle].name + '. Please choose different dates or a different unit.';
      okAlert.style.display = 'none';
      return;
    }
  }

  conflictAlert.style.display = 'none';
  okAlert.style.display = 'block';
  const weeks = Math.floor(nights / 7);
  const extra = nights % 7;
  let txt = `${nights} nights`;
  if (weeks > 0) txt += ` (${weeks} week${weeks > 1 ? 's' : ''}${extra > 0 ? ' + ' + extra + ' day' + (extra > 1 ? 's' : '') : ''})`;
  if (nightsSummary) nightsSummary.textContent = txt + ' — These dates are available!';
}

// ---- Vehicle Selection ----
function selectVehicle(unit, el) {
  state.vehicle = unit;
  document.querySelectorAll('.vehicle-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  updateSummary();
  checkDateAvailability();
  // Refresh full calendar filter if on all
  if (fullCalendar && activeFilter !== 'all') {
    filterCalendar(unit, null);
    document.querySelectorAll('.cal-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.unit === unit);
    });
    activeFilter = unit;
  }
}

// Handle URL param for pre-selecting unit
(function() {
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
      if (err) { err.style.display = 'block'; }
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
    else { if (pickupErr) pickupErr.classList.remove('show'); }
    if (!state.returnDate || state.nights < 7) { if (returnErr) returnErr.classList.add('show'); ok = false; }
    else { if (returnErr) returnErr.classList.remove('show'); }
    // Check conflict
    if (ok && state.vehicle) {
      const bookings = getBookings().filter(b => b.unit === state.vehicle);
      const pStart = state.pickupDate.getTime();
      const pEnd = state.returnDate.getTime();
      const conflict = bookings.some(b => {
        const bStart = new Date(b.start).getTime();
        const bEnd = new Date(b.end).getTime();
        return pStart < bEnd && pEnd > bStart;
      });
      if (conflict) {
        alert('Those dates are already booked for ' + UNITS[state.vehicle].name + '. Please choose different dates.');
        return false;
      }
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
    // Age check
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
  if (step === 4) {
    // Handled in submitBooking
    return true;
  }
  return true;
}

function renderSteps() {
  for (let i = 1; i <= 5; i++) {
    const panel = document.getElementById('step' + i);
    const dot = document.getElementById('dot' + i);
    const lbl = document.getElementById('lbl' + i);
    if (panel) panel.classList.toggle('visible', i === state.step);
    if (dot) {
      dot.classList.toggle('active', i === state.step);
      dot.classList.toggle('done', i < state.step);
      if (i < state.step) dot.innerHTML = '';
      else if (i === state.step) dot.innerHTML = '<span class="num">' + i + '</span>';
      else dot.innerHTML = '<span class="num">' + i + '</span>';
    }
    if (lbl) lbl.classList.toggle('active', i === state.step);
    if (i < 5) {
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
  if (state.pickupDate) {
    rows.push(['Pickup', formatDate(state.pickupDate)]);
  }
  if (state.returnDate) {
    rows.push(['Return', formatDate(state.returnDate)]);
    if (state.nights > 0) rows.push(['Duration', state.nights + ' nights']);
  }
  if (state.firstName) {
    rows.push(['Guest', state.firstName + ' ' + state.lastName]);
  }

  if (rows.length === 0) {
    body.innerHTML = '<p class="summary-empty">Your booking details will appear here as you complete each step.</p>';
    if (cta) cta.style.display = 'none';
    return;
  }

  body.innerHTML = rows.map(([label, val]) =>
    `<div class="summary-row"><span class="label">${label}</span><span>${val}</span></div>`
  ).join('');

  // Price
  if (state.vehicle && state.nights > 0) {
    const u = UNITS[state.vehicle];
    if (u.price) {
      const weeks = Math.ceil(state.nights / 7);
      const est = weeks * u.price;
      if (cta) cta.style.display = 'block';
      if (total) total.textContent = '$' + est.toLocaleString();
    } else {
      if (cta) cta.style.display = 'none';
    }
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
  const weeks = Math.ceil(state.nights / 7);
  const est = u.price ? '$' + (weeks * u.price).toLocaleString() : 'Contact for pricing';
  el.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Camper</div>
        <div style="font-weight:600;">${u.emoji || ''} ${u.name || state.vehicle}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Guest</div>
        <div style="font-weight:600;">${state.firstName} ${state.lastName}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Pickup Date</div>
        <div style="font-weight:600;">${formatDate(state.pickupDate)}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Return Date</div>
        <div style="font-weight:600;">${formatDate(state.returnDate)}</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Duration</div>
        <div style="font-weight:600;">${state.nights} nights (${weeks} week${weeks > 1 ? 's' : ''})</div>
      </div>
      <div>
        <div style="font-size:0.75rem; color:var(--gray); text-transform:uppercase; letter-spacing:.08em; margin-bottom:.25rem;">Estimated Total</div>
        <div style="font-weight:700; color:var(--green); font-size:1.1rem;">${est}</div>
      </div>
    </div>
    <div style="border-top:1px solid #E5E7EB; padding-top:1rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.875rem; color:#374151;">
      <div><span style="color:var(--gray);">Email:</span> ${state.email}</div>
      <div><span style="color:var(--gray);">Phone:</span> ${state.phone}</div>
      <div><span style="color:var(--gray);">Group:</span> ${state.groupSize} traveler${state.groupSize !== '1' ? 's' : ''}</div>
      <div><span style="color:var(--gray);">License:</span> ${state.licenseState} ${state.licenseNum}</div>
      ${state.destination ? `<div style="grid-column:1/-1;"><span style="color:var(--gray);">Destination:</span> ${state.destination}</div>` : ''}
    </div>`;
}

// ---- Submit Booking ----
function submitBooking() {
  const agree = document.getElementById('agreeTerms');
  const ageCheck = document.getElementById('agreeAge');
  const depCheck = document.getElementById('agreeDeposit');
  const termsErr = document.getElementById('terms-error');
  if (!agree.checked || !ageCheck.checked || !depCheck.checked) {
    if (termsErr) termsErr.style.display = 'block';
    return;
  }
  if (termsErr) termsErr.style.display = 'none';

  // Generate booking ID
  const id = 'CWR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const booking = {
    id,
    unit: state.vehicle,
    start: state.pickupDate.toISOString().split('T')[0],
    end: state.returnDate.toISOString().split('T')[0],
    name: state.firstName + ' ' + state.lastName,
    email: state.email,
    phone: state.phone,
    groupSize: state.groupSize,
    submittedAt: new Date().toISOString()
  };
  saveBooking(booking);

  // Show confirmation
  document.getElementById('confirmationId').textContent = id;
  const emailEl = document.getElementById('confirmEmail');
  if (emailEl) emailEl.textContent = state.email;

  const u = UNITS[state.vehicle] || {};
  const weeks = Math.ceil(state.nights / 7);
  const confDet = document.getElementById('confirmationDetails');
  if (confDet) {
    confDet.innerHTML = `
      <div class="conf-detail-card">
        <div class="label">Camper</div>
        <div class="value">${u.emoji || ''} ${u.name || state.vehicle}</div>
      </div>
      <div class="conf-detail-card">
        <div class="label">Guest Name</div>
        <div class="value">${state.firstName} ${state.lastName}</div>
      </div>
      <div class="conf-detail-card">
        <div class="label">Pickup Date</div>
        <div class="value">${formatDate(state.pickupDate)}</div>
      </div>
      <div class="conf-detail-card">
        <div class="label">Return Date</div>
        <div class="value">${formatDate(state.returnDate)}</div>
      </div>
      <div class="conf-detail-card">
        <div class="label">Duration</div>
        <div class="value">${state.nights} nights</div>
      </div>
      <div class="conf-detail-card">
        <div class="label">Booking Status</div>
        <div class="value" style="color:var(--gold);">⏳ Pending Confirmation</div>
      </div>`;
  }

  goToStep(5);

  // Refresh the full calendar to show new booking
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
});
