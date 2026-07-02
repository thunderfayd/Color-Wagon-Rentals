# Color Wagon Rentals — Owner's Guide

A plain-English guide to running your website. No coding experience needed.
The most important part — **managing your bookings** — is now a simple
password-protected dashboard (Section 2).

---

## 1. How the website works (the 30-second version)

- Your website is shown to the public by **Netlify** (the company that puts it online).
- The website's files live on **GitHub** (the master copy / filing cabinet).
- **When a file changes on GitHub, Netlify rebuilds the public site within 1–2 minutes.**
- Your **booking calendar is now live** — you manage it from the dashboard and changes appear on the site **instantly**, no waiting for a rebuild.

Your GitHub project: **https://github.com/thunderfayd/Color-Wagon-Rentals**
Your Netlify login: **https://app.netlify.com**

---

## 2. Your Booking Dashboard ⭐ (the main one)

Go to: **https://www.colorwagonrentals.com/admin.html**

Log in with your dashboard password (see Section 5 for how it's set). Bookmark this page.

The dashboard has three parts:

### 📥 New Requests
Every booking someone submits on the website shows up here — with their name, dates,
contact info, group size, license, and whether they've signed the rental agreement.
For each request you can:
- **✓ Confirm & block dates** — marks those dates as booked. The calendar on the public
  site updates **immediately**.
- **Decline** — removes the request (does not block the dates).

### 📅 Booked & Blocked Dates
Everything currently blocking the calendar. Click **Remove** on any entry to free those
dates back up instantly.

### ➕ Add a Booking or Block Dates
Took a booking by phone, or need to block dates for maintenance? Pick the camper, choose
a start and end date, and click **Add**. It blocks those dates right away.

> The dashboard refreshes itself every 30 seconds, and there's a **↻ Refresh** button.
> Your login is remembered until you close the browser tab or click **Log out**.

---

## 3. Where booking & contact requests go (email copies)

Every booking request also arrives by **email** through Netlify Forms, so you get a copy
even when you're not looking at the dashboard. Contact-form messages come the same way.

To turn on email alerts:
1. Log in to **https://app.netlify.com** and open your site.
2. Click **Forms** → you'll see **booking** and **contact**.
3. **Forms → Settings & notifications → Add notification → Email notification** → send to
   **ColorWagonRentals@gmail.com**.

> The dashboard is your control center; email is your backup copy. Confirming a booking is
> always done by you in the dashboard, so you stay in control of what's official.

---

## 4. The rental agreement e-signature (SignWell)

The booking flow includes a **"Sign" step** where renters electronically sign your rental
agreement before their request is submitted. This runs on **SignWell**.

**Until SignWell is connected (Section 5), the site automatically falls back** to telling
renters "we'll email your rental agreement to sign" — so nothing is broken in the meantime.

Once it's connected, the multi-page agreement (with all ~12 signature spots) is built as a
**template** in your SignWell account. To change the agreement wording or signature spots,
you edit that template in SignWell — the website doesn't need to change.

---

## 5. One-time setup (your developer does this once)

These are set in **Netlify → Site configuration → Environment variables**, then a redeploy:

| Variable | What it's for |
|----------|----------------|
| `ADMIN_PASSWORD` | The password for your booking dashboard (Section 2). Pick something strong. |
| `SIGNWELL_API_KEY` | From your SignWell account → Settings → API. |
| `SIGNWELL_TEMPLATE_ID` | The id of your rental-agreement template in SignWell. |
| `SIGNWELL_TEST_MODE` | Set to `true` while testing (free), remove/`false` when live. |

Also, the live calendar uses **Netlify Blobs** for storage — it turns on automatically for
the site; no configuration needed. The very first time the calendar loads, it seeds itself
from the dates that were in `js/bookings-data.js`.

To change your dashboard password later: update `ADMIN_PASSWORD` in Netlify and redeploy.

---

## 6. Backup method — editing the calendar file directly

The dashboard is the easy way. If it's ever unavailable, the site still reads a static
fallback list in **`js/bookings-data.js`** on GitHub. Each booking is one line:

```js
{ unit: 'gertrude', start: '2026-07-01', end: '2026-07-05' },
```

- `unit`: `'gertrude'`, `'violet'`, or `'trailer'` (lowercase, in quotes)
- `start`: pickup day, `'YYYY-MM-DD'`
- `end`: return day, `'YYYY-MM-DD'`
- Keep the **quotes** and the **comma at the end of each line**.

Edit on GitHub (pencil icon → change → **Commit changes**), wait ~1–2 minutes. Note the
live dashboard data takes priority once it's running; this file is the safety net and the
first-run seed.

---

## 7. Things to leave to your developer

These touch several files at once:

- **Changing prices** ($99 / $650, the $50 cleaning & prep fee, the sales-tax rate — they
  appear in several places, including the price math in `js/booking.js`).
- **Adding or swapping photos** (new photos must be shrunk to web size first, or pages get slow).
- **Editing wording** on the pages.
- **Changing the phone number, email, or address.**

---

## 8. Troubleshooting

**The dashboard says "not configured."** `ADMIN_PASSWORD` hasn't been set in Netlify yet
(Section 5).

**Login says the password is wrong.** Double-check `ADMIN_PASSWORD` in Netlify; after
changing it you must redeploy the site.

**A confirmed booking isn't on the calendar.** Refresh the public booking page — it updates
within a few seconds. If you edited `bookings-data.js` by hand, remember the live dashboard
data takes priority.

**The `bookings-data.js` file broke the page.** Usually a missing comma, curly “smart
quotes” instead of straight `'quotes'`, or a wrong date format. On GitHub use the file's
**History** to restore an earlier version — nothing is ever lost.

---

## Quick reference card

- **Manage bookings:** https://www.colorwagonrentals.com/admin.html (log in) → confirm,
  remove, or add dates. Updates the site instantly.
- **Email copies of requests:** Netlify → **Forms** (turn on email alerts).
- **Rental agreement:** SignWell template holds the signature pages; falls back to "we'll
  email it" until connected.
- **Setup values:** `ADMIN_PASSWORD`, `SIGNWELL_API_KEY`, `SIGNWELL_TEMPLATE_ID` in Netlify.
