-- ============================================================
-- Newman Exclusive — Transactions database
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_contact text,
  order_reference text,
  transaction_type text not null check (
    transaction_type in ('online_full', 'online_deposit', 'instore_deposit')
  ),
  amount numeric(10,2) not null,
  slip_image_path text,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'rejected')
  ),
  verified_by text,
  verified_at timestamptz,
  notes text
);

-- Row Level Security
alter table transactions enable row level security;

-- Anyone (customers on the public pay page) can INSERT a new transaction row,
-- but cannot read, update, or delete existing rows.
create policy "public can insert transactions"
  on transactions for insert
  to anon
  with check (true);

-- Only logged-in staff (Supabase Auth users) can view/update/manage transactions.
create policy "staff can view transactions"
  on transactions for select
  to authenticated
  using (true);

create policy "staff can update transactions"
  on transactions for update
  to authenticated
  using (true);

-- ============================================================
-- Storage bucket for payment slip photos
-- Do this part in the Dashboard UI (Storage -> New bucket):
--   1. Create a bucket named "slips"
--   2. Set it to "Private" (not public)
--   3. Then run the policies below in SQL Editor
-- ============================================================

create policy "public can upload slips"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'slips');

create policy "staff can view slips"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'slips');

-- ============================================================
-- To create staff/admin logins:
--   Supabase Dashboard -> Authentication -> Users -> Add user
--   (e.g. one for your dad, one for shop staff)
-- ============================================================
