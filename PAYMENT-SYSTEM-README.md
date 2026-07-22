# Newman Exclusive — Payment & Deposit System

**Important — file placement:** your repo already has a `README.md` and a `payment.html` at the root. To avoid overwriting anything:
- This file is named so it won't clash with your existing `README.md` — keep it wherever you like (e.g. rename to `PAYMENT-SYSTEM-README.md` or drop it in a new `/docs` folder), just don't overwrite your root README.
- **`payment.html` in this folder is meant to *replace* your current one.** Your existing `payment.html` is currently a "Work in Progress" placeholder — I rebuilt it using your actual site's header, nav, footer, fonts (Playfair Display / Great Vibes), colors (gold `#d4af37` / navy `#1a263c`), GA tag, and schema markup, so it's a drop-in replacement. The "Payment" link already in your nav bar will just start working.
- **`instore.html`** and **`admin.html`** are new internal tools — not linked from your public nav (and shouldn't be; customers don't need to see them). Your dad/staff would just bookmark these URLs directly.

Behind the scenes `payment.html` and `instore.html` write into one shared database table (Supabase), so this also gives you the transaction database you asked about in item 3.

## 1. Create your Supabase project (free tier is fine)

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once created, go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
3. Open `js/config.js` and paste them in:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...';
   const PROMPTPAY_ID = '0812345678'; // your dad's PromptPay-linked number or Tax ID
   ```

## 2. Set up the database

1. In Supabase, go to **SQL Editor → New query**.
2. Paste the entire contents of `supabase-schema.sql` and run it.
   This creates the `transactions` table and its security rules.
3. Go to **Storage → New bucket**, name it exactly `slips`, and set it to **Private**.
   (The policies for it are already included in the SQL you just ran.)

## 3. Create staff logins for the admin dashboard

1. Go to **Authentication → Users → Add user**.
2. Add one for yourself and one for your dad (or shared shop staff), with email + password.
3. Those credentials are what you'll use to log into `admin.html`.

## 4. Add the files to your site

Replace your existing root `payment.html` with the one in this folder (same filename, so it just overwrites the placeholder), and add `instore.html`, `admin.html`, and the `js/` folder alongside your other HTML files. Commit and push — GitHub Pages will serve them at:
- `yoursite.com/payment.html` (already linked from your nav bar — no other file needs to change)
- `yoursite.com/instore.html`
- `yoursite.com/admin.html`

`instore.html` is meant to be opened on a shop tablet/phone at checkout — not linked anywhere public. `admin.html` is where you and your dad log in to review everything — also not linked anywhere public, just bookmark it directly.

## How the flow works

1. Customer or staff fills in the amount → a PromptPay QR is generated **entirely in the browser** (no backend call needed for this part — it's the same EMVCo QR standard every Thai bank app reads).
2. Customer scans and pays via their own banking app.
3. Customer/staff uploads a screenshot of the transfer confirmation.
4. That gets saved into Supabase: the photo goes into the `slips` storage bucket, and the order details go into the `transactions` table with status `pending`.
5. You or your dad log into `admin.html`, see all pending transactions, view the slip photo, and mark it **Confirmed** (money really arrived) or **Rejected** (bad/missing slip).

## About notifications

Since LINE Notify was discontinued by LINE in 2025, the setup above relies on **checking the admin dashboard** rather than push notifications. Two ways to add active notifications later, if it becomes worth the extra setup:

- **Email on new submission** — a small Supabase Edge Function that fires on every `insert` and emails you via a service like Resend (free tier covers small volume). I can build this next if you want it — it's a natural add-on once the base system above is live and tested.
- **LINE Official Account (Messaging API)** — LINE's replacement for Notify. Heavier to set up (requires a LINE Official Account + webhook), but keeps notifications inside LINE where you already work. Worth it only if checking the dashboard a few times a day feels like too much friction.

## Notes / things to double check

- Test the QR with a small real amount (e.g. ฿1) using your own banking app before rolling this out to customers.
- `PROMPTPAY_ID` is currently a placeholder — make sure it matches whatever number/ID your dad's PromptPay is actually registered to.
- The admin dashboard requires login — customers can only ever *submit* transactions, never see or edit anyone else's.
