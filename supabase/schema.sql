-- ReuseHub database schema for Supabase/PostgreSQL.
-- Run this file in the Supabase SQL Editor in a new project.
-- IMPORTANT: Review policies against your institution's requirements before public deployment.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 80),
  institution text,
  academic_year text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  seller_name text not null default 'Student',
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 10 and 1200),
  category text not null check (category in (
    'Engineering & Academic Textbooks', 'Reference Books', 'Notebooks', 'Stationery',
    'Calculators', 'Lab Coats & Lab Supplies', 'Other Educational Materials'
  )),
  condition text not null check (condition in ('New', 'Like New', 'Good', 'Fair')),
  listing_type text not null check (listing_type in ('donation', 'resale')),
  mrp numeric(10,2),
  price numeric(10,2) not null default 0 check (price >= 0),
  cover_image text not null default '',
  status text not null default 'available' check (status in ('available', 'reserved', 'completed', 'removed')),
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_mrp check (mrp is null or mrp > 0),
  constraint donation_is_free check ((listing_type = 'donation' and price = 0 and mrp is null) or (listing_type = 'resale' and price > 0))
);

create table if not exists public.listing_interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  buyer_name text not null default 'Student',
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_cannot_request_own_listing check (buyer_id <> seller_id)
);

create unique index if not exists one_active_interest_per_buyer_listing
  on public.listing_interests (listing_id, buyer_id)
  where status in ('pending', 'accepted');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (reason in ('Misleading item information', 'Prohibited item', 'Suspected scam', 'Duplicate listing', 'Incorrect price or description', 'Other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_public_feed_idx on public.listings (moderation_status, status, created_at desc);
create index if not exists listings_category_idx on public.listings (category, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id, created_at desc);
create index if not exists listing_interests_listing_idx on public.listing_interests (listing_id, created_at desc);
create index if not exists listing_interests_buyer_idx on public.listing_interests (buyer_id, created_at desc);
create index if not exists listing_interests_seller_idx on public.listing_interests (seller_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- Create a profile after a user signs up. Never accept the role from user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'student'), '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Stamp the public seller name on listings. This avoids exposing private profile columns publicly.
create or replace function public.prepare_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  public_name text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.seller_id <> auth.uid() then
      raise exception 'You can only create listings for your own account';
    end if;
    select p.display_name into public_name from public.profiles p where p.id = new.seller_id;
    new.seller_name := coalesce(public_name, 'Student');
    new.status := 'available';
    new.moderation_status := 'approved';
  elsif tg_op = 'UPDATE' then
    if new.seller_id <> old.seller_id then raise exception 'Listing ownership cannot be changed'; end if;
    if new.moderation_status is distinct from old.moderation_status and coalesce(current_setting('reusehub.moderation_action', true), '') <> 'on' then
      raise exception 'Moderation status can only be changed by the moderation workflow';
    end if;
    if new.status is distinct from old.status and coalesce(current_setting('reusehub.listing_status_action', true), '') <> 'on' then
      raise exception 'Listing status can only be changed through the listing workflow';
    end if;
    new.updated_at := now();
  end if;
  if new.listing_type = 'donation' then
    new.price := 0;
    new.mrp := null;
  elsif new.price <= 0 then
    raise exception 'Resale price must be greater than zero';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_prepare_trigger on public.listings;
create trigger listings_prepare_trigger
before insert or update on public.listings
for each row execute procedure public.prepare_listing();

-- Fill buyer/seller names server-side and verify that a request is created by the logged-in buyer.
create or replace function public.request_listing(p_listing_id uuid, p_message text default '')
returns public.listing_interests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_row public.listings%rowtype;
  profile_row public.profiles%rowtype;
  result_row public.listing_interests%rowtype;
begin
  if current_user_id is null then raise exception 'Sign in to send an interest request'; end if;
  select * into listing_row from public.listings where id = p_listing_id for update;
  if not found or listing_row.moderation_status <> 'approved' or listing_row.status <> 'available' then
    raise exception 'This item is no longer available';
  end if;
  if listing_row.seller_id = current_user_id then raise exception 'You cannot request your own listing'; end if;
  if exists (select 1 from public.listing_interests i where i.listing_id = p_listing_id and i.buyer_id = current_user_id and i.status in ('pending','accepted')) then
    raise exception 'You already have an active request for this item';
  end if;
  select * into profile_row from public.profiles where id = current_user_id;
  insert into public.listing_interests (listing_id, seller_id, buyer_id, buyer_name, message, status)
  values (p_listing_id, listing_row.seller_id, current_user_id, coalesce(profile_row.display_name, 'Student'), left(coalesce(p_message, ''), 500), 'pending')
  returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.accept_listing_interest(p_interest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.listing_interests%rowtype;
  listing_row public.listings%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to accept a request'; end if;
  select * into request_row from public.listing_interests where id = p_interest_id for update;
  if not found then raise exception 'Request not found'; end if;
  if request_row.seller_id <> auth.uid() then raise exception 'Only the seller can accept this request'; end if;
  if request_row.status <> 'pending' then raise exception 'This request is no longer pending'; end if;
  select * into listing_row from public.listings where id = request_row.listing_id for update;
  if not found or listing_row.status <> 'available' or listing_row.moderation_status <> 'approved' then raise exception 'This item is no longer available'; end if;
  perform set_config('reusehub.listing_status_action', 'on', true);
  update public.listings set status = 'reserved', updated_at = now() where id = listing_row.id;
  update public.listing_interests set status = 'declined', updated_at = now()
    where listing_id = listing_row.id and id <> request_row.id and status = 'pending';
  update public.listing_interests set status = 'accepted', updated_at = now() where id = request_row.id;
end;
$$;

create or replace function public.complete_listing_interest(p_interest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.listing_interests%rowtype;
  listing_row public.listings%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to complete this handover'; end if;
  select * into request_row from public.listing_interests where id = p_interest_id for update;
  if not found then raise exception 'Request not found'; end if;
  if request_row.seller_id <> auth.uid() and request_row.buyer_id <> auth.uid() then raise exception 'You are not part of this request'; end if;
  if request_row.status <> 'accepted' then raise exception 'Only an accepted request can be completed'; end if;
  select * into listing_row from public.listings where id = request_row.listing_id for update;
  if not found or listing_row.status <> 'reserved' then raise exception 'This item is not reserved'; end if;
  perform set_config('reusehub.listing_status_action', 'on', true);
  update public.listings set status = 'completed', updated_at = now() where id = listing_row.id;
  update public.listing_interests set status = 'completed', updated_at = now() where id = request_row.id;
end;
$$;

create or replace function public.remove_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare listing_row public.listings%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into listing_row from public.listings where id = p_listing_id for update;
  if not found then raise exception 'Listing not found'; end if;
  if listing_row.seller_id <> auth.uid() and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'You cannot remove this listing';
  end if;
  perform set_config('reusehub.listing_status_action', 'on', true);
  update public.listings set status = 'removed', updated_at = now() where id = p_listing_id;
end;
$$;

create or replace function public.moderate_listing(p_listing_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_moderation text;
  new_status text;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  if p_action not in ('approve','reject','remove') then raise exception 'Invalid moderation action'; end if;
  new_moderation := case when p_action = 'approve' then 'approved' else 'rejected' end;
  new_status := case when p_action = 'approve' then 'available' else 'removed' end;
  perform set_config('reusehub.moderation_action', 'on', true);
  perform set_config('reusehub.listing_status_action', 'on', true);
  update public.listings set moderation_status = new_moderation, status = new_status, updated_at = now() where id = p_listing_id;
  if not found then raise exception 'Listing not found'; end if;
end;
$$;

create or replace function public.resolve_listing_report(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') then
    raise exception 'Administrator access required';
  end if;
  if p_status not in ('reviewed','resolved') then raise exception 'Invalid report status'; end if;
  update public.reports set status = p_status, updated_at = now() where id = p_report_id;
  if not found then raise exception 'Report not found'; end if;
end;
$$;

create or replace function public.get_impact_stats()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'approvedListings', count(*) filter (where l.moderation_status = 'approved' and l.status <> 'removed'),
    'availableItems', count(*) filter (where l.moderation_status = 'approved' and l.status = 'available')
  ) || (
    select jsonb_build_object(
      'completedDonations', count(*) filter (where l.listing_type = 'donation' and l.status = 'completed'),
      'completedResales', count(*) filter (where l.listing_type = 'resale' and l.status = 'completed'),
      'completedHandovers', count(*) filter (where i.status = 'completed'),
      'declaredSavings', coalesce(sum(case when l.listing_type = 'resale' and l.mrp > l.price then l.mrp - l.price else 0 end) filter (where i.status = 'completed'), 0)
    ) from public.listing_interests i join public.listings l on l.id = i.listing_id
  )
  from public.listings l;
$$;

-- Row-level security is enabled on every client-exposed table.
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_interests enable row level security;
alter table public.reports enable row level security;

-- Profiles: users can only read/update their own profile. Admin role cannot be updated through this policy.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'user');
-- Profile insert is handled by the auth trigger; no public insert policy is needed.

-- Public listings: anyone may read approved listings that have not been removed, plus owners/admins may read their own listings.
drop policy if exists listings_read_public_or_owner on public.listings;
create policy listings_read_public_or_owner on public.listings for select to anon, authenticated using (
  (moderation_status = 'approved' and status <> 'removed')
  or seller_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists listings_insert_owner on public.listings;
create policy listings_insert_owner on public.listings for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists listings_update_owner on public.listings;
create policy listings_update_owner on public.listings for update to authenticated using (
  seller_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  seller_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- Listing status and moderation status changes are guarded by the trigger and RPC functions above.
drop policy if exists listings_delete_admin on public.listings;
create policy listings_delete_admin on public.listings for delete to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Requests are visible only to their buyer, their seller, or an administrator.
drop policy if exists interests_read_parties on public.listing_interests;
create policy interests_read_parties on public.listing_interests for select to authenticated using (
  buyer_id = auth.uid() or seller_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- Requests should be created through request_listing(), which validates ownership and availability.
-- Revoke direct insert. RPC function executes as security definer.
drop policy if exists interests_insert_buyer on public.listing_interests;
revoke insert on public.listing_interests from authenticated;
-- Direct updates are limited to pending cancellation/decline. Accept and complete require RPC.
drop policy if exists interests_update_buyer_cancel on public.listing_interests;
create policy interests_update_buyer_cancel on public.listing_interests for update to authenticated using (buyer_id = auth.uid() and status = 'pending') with check (buyer_id = auth.uid() and status = 'cancelled');
drop policy if exists interests_update_seller_decline on public.listing_interests;
create policy interests_update_seller_decline on public.listing_interests for update to authenticated using (seller_id = auth.uid() and status = 'pending') with check (seller_id = auth.uid() and status = 'declined');

-- Reports: a signed-in user can submit a report and see their own reports. Admins can review all.
drop policy if exists reports_select_reporter_or_admin on public.reports;
create policy reports_select_reporter_or_admin on public.reports for select to authenticated using (
  reporter_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists reports_insert_reporter on public.reports;
create policy reports_insert_reporter on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin on public.reports for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Storage bucket for public, non-sensitive listing photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists listing_images_public_read on storage.objects;
create policy listing_images_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'listing-images');
drop policy if exists listing_images_owner_upload on storage.objects;
create policy listing_images_owner_upload on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists listing_images_owner_update on storage.objects;
create policy listing_images_owner_update on storage.objects for update to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists listing_images_owner_delete on storage.objects;
create policy listing_images_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Limit execution of privileged functions to authenticated users; each function also checks auth.uid()/role.
revoke all on function public.request_listing(uuid, text) from public;
grant execute on function public.request_listing(uuid, text) to authenticated;
revoke all on function public.accept_listing_interest(uuid) from public;
grant execute on function public.accept_listing_interest(uuid) to authenticated;
revoke all on function public.complete_listing_interest(uuid) from public;
grant execute on function public.complete_listing_interest(uuid) to authenticated;
revoke all on function public.remove_listing(uuid) from public;
grant execute on function public.remove_listing(uuid) to authenticated;
revoke all on function public.moderate_listing(uuid, text) from public;
grant execute on function public.moderate_listing(uuid, text) to authenticated;
revoke all on function public.resolve_listing_report(uuid, text) from public;
grant execute on function public.resolve_listing_report(uuid, text) to authenticated;
revoke all on function public.get_impact_stats() from public;
grant execute on function public.get_impact_stats() to anon, authenticated;

-- Table grants. RLS provides the row-level restrictions; the update trigger protects status transitions.
grant select on public.listings to anon, authenticated;
grant insert, update on public.listings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.listing_interests to authenticated;
grant select, insert, update on public.reports to authenticated;
