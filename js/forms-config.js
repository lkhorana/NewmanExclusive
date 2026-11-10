/**
 * Newman Exclusive — form settings
 * Fill these in after following FORMS-SETUP.md. Any value left as '' is simply skipped.
 */
window.NX_FORMS = {
  // 1) Google Apps Script web app URL (ends in /exec). Primary: writes to the Google Sheet + emails the team.
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/AKfycbx5KslZQmOQZEG7r2Ka-EXwgg6zOntMrpjfgFR9XVQRLVK_iBhqXAMxO6V4loNEByOphw/exec',

  // 2) Supabase backup copy of every submission (table created by supabase-leads.sql).
  SUPABASE_URL: 'https://ghafvssbyniuhzqghtra.supabase.co',
  SUPABASE_ANON_KEY: '', // paste the same anon/publishable key used in js/config.js
  SUPABASE_TABLE: 'leads',

  // 3) Last-resort fallback, only used if both of the above fail.
  FORMSPREE_ENDPOINT: 'https://formspree.io/f/mqeezwan',

  // Booking page for virtual consultations (Google Calendar appointment schedule or Cal.com link).
  // When set, clients see the calendar right after submitting the consultation form.
  // When empty, they're told the team will email them a time and video link.
  BOOKING_URL: '',

  WHATSAPP_URL: 'https://wa.me/66879163808'
};
