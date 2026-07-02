/* ============================================================
   COLOR WAGON RENTALS - BOOKED DATES
   ------------------------------------------------------------
   Heidi: this is the ONLY file you need to touch to update the
   booking calendars on the website.

   To add a booking, copy one of the lines below and change:
     unit:  'gertrude', 'violet', or 'trailer'
     start: pickup day   (format: 'YYYY-MM-DD')
     end:   return day   (format: 'YYYY-MM-DD')

   Don't forget the comma at the end of each line!
   ============================================================ */

const CWR_BOOKED_DATES = [
  // July 1-5 - both vans booked
  { unit: 'gertrude', start: '2026-07-01', end: '2026-07-05' },
  { unit: 'violet',   start: '2026-07-01', end: '2026-07-05' },

  // July 13-16 - Violet
  { unit: 'violet',   start: '2026-07-13', end: '2026-07-16' },

  // July 17-20 - both vans
  { unit: 'gertrude', start: '2026-07-17', end: '2026-07-20' },
  { unit: 'violet',   start: '2026-07-17', end: '2026-07-20' },

  // August 12-26 - Violet
  { unit: 'violet',   start: '2026-08-12', end: '2026-08-26' },

  // August 14-21 - Gertrude
  { unit: 'gertrude', start: '2026-08-14', end: '2026-08-21' },
];
