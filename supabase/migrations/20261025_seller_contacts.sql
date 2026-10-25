-- ReuseHub: opt-in seller phone/WhatsApp contact details.
-- Apply this migration to an existing Supabase project. Safe to re-run.

create table if not exists public.seller_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone_number text not null default '' check (char_length(phone_number) <= 40),
  whatsapp_number text not null default '' check (char_length(whatsapp_number) <= 40),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_contacts_public_requires_number check (
    not is_public or btrim(phone_number) <> '' or btrim(whatsapp_number) <> ''
  )
);

alter table public.seller_contacts enable row level security;

-- Do not expose the whole contact table through the public API.
drop policy if exists seller_contacts_read_public_or_owner on public.seller_contacts;
drop policy if exists seller_contacts_select_owner on public.seller_contacts;
create policy seller_contacts_select_owner on public.seller_contacts
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists seller_contacts_insert_owner on public.seller_contacts;
create policy seller_contacts_insert_owner on public.seller_contacts
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists seller_contacts_update_owner on public.seller_contacts;
create policy seller_contacts_update_owner on public.seller_contacts
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists seller_contacts_delete_owner on public.seller_contacts;
create policy seller_contacts_delete_owner on public.seller_contacts
for delete to authenticated
using (user_id = (select auth.uid()));

-- Public viewers only receive contact details for a requested, approved listing
-- when its seller has opted in. This prevents direct enumeration of contact rows.
create or replace function public.get_public_seller_contact(p_listing_id uuid)
returns table (
  user_id uuid,
  phone_number text,
  whatsapp_number text,
  is_public boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id, c.phone_number, c.whatsapp_number, c.is_public, c.updated_at
  from public.seller_contacts as c
  join public.listings as l on l.seller_id = c.user_id
  where l.id = p_listing_id
    and l.moderation_status = 'approved'
    and l.status in ('available', 'reserved')
    and c.is_public = true
  limit 1;
$$;

revoke all on public.seller_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.seller_contacts to authenticated;
revoke all on function public.get_public_seller_contact(uuid) from public;
grant execute on function public.get_public_seller_contact(uuid) to anon, authenticated;
