-- Safer daily account purge.
-- The old cron command ended with "delete every login that has no profile", which could also remove a
-- brand-new sign-up whose profile had not been saved yet. This version collects the accounts that are
-- due FIRST (deletion requested more than 30 days ago) and removes only those.
-- Safe to run more than once. Replaces the schedule named campusflip_hard_delete.

create or replace function public.hard_delete_expired_accounts()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_ids uuid[];
begin
  select array_agg(id) into v_ids
    from public.profiles
   where deletion_requested_at is not null
     and deletion_requested_at < now() - interval '30 days';

  if v_ids is null then return 0; end if;

  delete from public.notifications        where user_id = any(v_ids);
  delete from public.saved_listings       where user_id = any(v_ids);
  delete from public.seller_contacts      where user_id = any(v_ids);
  delete from public.notification_preferences where user_id = any(v_ids);
  delete from public.push_subscriptions   where user_id = any(v_ids);
  delete from public.referrals            where referrer_id = any(v_ids) or referee_id = any(v_ids);
  delete from public.payments             where user_id = any(v_ids);
  delete from public.listing_photos       where listing_id in (select id from public.listings where seller_id = any(v_ids));
  delete from public.flash_deals          where listing_id in (select id from public.listings where seller_id = any(v_ids));
  delete from public.reports              where reporter_id = any(v_ids)
                                             or listing_id in (select id from public.listings where seller_id = any(v_ids));
  delete from public.listings             where seller_id = any(v_ids);
  delete from public.profiles             where id = any(v_ids);
  delete from auth.users                  where id = any(v_ids);

  return array_length(v_ids, 1);
end $$;

revoke all on function public.hard_delete_expired_accounts() from public, anon, authenticated;

-- Point the existing daily job at it (only where pg_cron exists, i.e. on Supabase).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('campusflip_hard_delete', '0 3 * * *', 'select public.hard_delete_expired_accounts();');
  end if;
end $$;
