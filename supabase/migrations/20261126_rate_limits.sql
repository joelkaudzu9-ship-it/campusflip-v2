-- Abuse limits, enforced in the database so they cannot be skipped by calling the API directly.
--   * 10 new listings per seller per hour
--   * 10 reports per student per day, and one report per listing per student
--   * 30 "contact seller" lookups per student per hour (also stops harvesting of phone numbers)
-- Changing a limit = edit the number below and run this file again. Safe to run more than once.
-- Service-role / background jobs (no signed-in user) and admins are exempt.

-- ---------- listings: 10 per hour ----------
create or replace function public.limit_listing_creation()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare c_limit constant int := 10;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if (select count(*) from public.listings
       where seller_id = new.seller_id and created_at > now() - interval '1 hour') >= c_limit then
    raise exception 'You are posting too fast. Please wait a little while before adding more listings.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists a_limit_listing_creation on public.listings;
create trigger a_limit_listing_creation before insert on public.listings
  for each row execute function public.limit_listing_creation();

-- ---------- reports: 10 per day, one per listing ----------
create or replace function public.limit_reports()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare c_limit constant int := 10;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if exists (select 1 from public.reports where listing_id = new.listing_id and reporter_id = new.reporter_id) then
    raise exception 'You have already reported this listing. Our team will review it.'
      using errcode = 'check_violation';
  end if;
  if (select count(*) from public.reports
       where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= c_limit then
    raise exception 'You have sent many reports today. Please try again tomorrow.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists a_limit_reports on public.reports;
create trigger a_limit_reports before insert on public.reports
  for each row execute function public.limit_reports();

-- ---------- contact lookups: 30 per hour ----------
create table if not exists public.contact_lookups (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists contact_lookups_user_time_idx on public.contact_lookups(user_id, created_at desc);
alter table public.contact_lookups enable row level security;
revoke all on public.contact_lookups from anon, authenticated;

create or replace function public.get_listing_seller_whatsapp(p_listing_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  seller_phone text;
  c_limit constant int := 30;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to contact sellers.';
  end if;

  -- housekeeping: keep only the last two days for this user
  delete from public.contact_lookups where user_id = auth.uid() and created_at < now() - interval '2 days';

  if (select count(*) from public.contact_lookups
       where user_id = auth.uid() and created_at > now() - interval '1 hour') >= c_limit then
    raise exception 'You have contacted many sellers in a short time. Please try again in a little while.';
  end if;

  select sc.whatsapp_number into seller_phone
    from public.listings l
    join public.seller_contacts sc on sc.user_id = l.seller_id
   where l.id = p_listing_id and l.status = 'active' and l.seller_id <> auth.uid();

  if seller_phone is null then
    raise exception 'Seller contact is unavailable.';
  end if;

  insert into public.contact_lookups(user_id) values (auth.uid());
  return seller_phone;
end $$;

revoke all on function public.get_listing_seller_whatsapp(uuid) from public, anon;
grant execute on function public.get_listing_seller_whatsapp(uuid) to authenticated;
