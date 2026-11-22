-- =============================================================================
-- CampusFlip security hardening migration
-- Generated 2026-11-22 from the schema dump in supabase/schema.sql.
--
-- !! REVIEW AND TEST IN A STAGING PROJECT FIRST (see supabase/README.md). !!
-- It changes who can read and write core tables. Every step is explained.
-- Deploy the matching front-end FIRST (it falls back gracefully), then run this.
-- =============================================================================
begin;

-- -----------------------------------------------------------------------------
-- 1. Tables with no row-level security (anyone with the public key could write)
--    The helper functions that use them are SECURITY DEFINER, so they keep working.
-- -----------------------------------------------------------------------------
alter table public.campus_items     enable row level security;
alter table public.match_brands     enable row level security;
alter table public.match_stopwords  enable row level security;
alter table public.match_synonyms   enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Function privileges.
--    Postgres lets PUBLIC execute every function by default, and Supabase exposes
--    public functions as RPC. That includes finalize_campusflip_payment(), which
--    marks a payment successful and activates a listing / boost / shop plan with
--    NO auth check: any caller who knows a charge_id (their own pending one) could
--    get a listing, boost or shop plan for free, and repeat it to extend them.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Make finalize_campusflip_payment idempotent for boosts and shop plans too
-- (previously every call extended the boost / plan again).
CREATE OR REPLACE FUNCTION public.finalize_campusflip_payment(p_charge_id text, p_provider_reference text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  new_expiry_time timestamptz;
  current_boost_expiry timestamptz;
  current_plan_expiry timestamptz;
  v_seller_id uuid;
  v_flash_deal_id uuid;
  v_listing_status text;
  v_listing_title text;
  v_should_notify boolean;
BEGIN
  SELECT * INTO payment_row
  FROM public.payments
  WHERE charge_id = p_charge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  -- Idempotent for every payment type: a charge can only be applied once.
  IF payment_row.status = 'successful' AND payment_row.payment_type <> 'listing' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed');
  END IF;
  IF payment_row.payment_type = 'listing' THEN
    SELECT status, title INTO v_listing_status, v_listing_title
    FROM public.listings
    WHERE id = payment_row.listing_id;

    IF v_listing_status = 'active' THEN
      RETURN jsonb_build_object('success', true, 'message', 'Already processed');
    END IF;
  END IF;

  UPDATE public.payments
  SET status = 'successful',
      paid_at = COALESCE(paid_at, now()),
      provider_reference = COALESCE(p_provider_reference, provider_reference),
      updated_at = now()
  WHERE id = payment_row.id;
  IF payment_row.payment_type = 'listing' THEN
    new_expiry_time := now() + interval '14 days';

    -- Only listings still awaiting payment/renewal are activated, so a listing an admin
    -- removed while the payment was in flight is not silently re-published.
    UPDATE public.listings
    SET status = 'active',
        expires_at = new_expiry_time,
        updated_at = now()
    WHERE id = payment_row.listing_id
      AND status IN ('pending_payment', 'draft', 'expired');

    IF payment_row.amount = 0 THEN
      SELECT seller_id INTO v_seller_id
      FROM public.listings
      WHERE id = payment_row.listing_id;

      IF v_seller_id IS NOT NULL THEN
        -- One credit pays for one listing. The UPDATE is atomic, so several requests sent
        -- at once with a single credit cannot all succeed; the extra ones raise and roll back.
        UPDATE public.profiles
        SET referral_credits = referral_credits - 1
        WHERE id = v_seller_id
          AND referral_credits > 0;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'No referral credit available' USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
    SELECT public.user_wants_notification(payment_row.user_id, 'payment_updates')
    INTO v_should_notify;

    IF v_should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message, listing_id)
      VALUES (
        payment_row.user_id,
        'payment_update',
        'Your listing is live',
        COALESCE(v_listing_title, 'Your listing') || ' has been published and is now visible to buyers.',
        payment_row.listing_id
      );
    END IF;
  ELSIF payment_row.payment_type IN ('boost', 'boost_discount') THEN
    SELECT boost_expires_at, title INTO current_boost_expiry, v_listing_title
    FROM public.listings
    WHERE id = payment_row.listing_id;

    IF current_boost_expiry IS NOT NULL AND current_boost_expiry > now() THEN
      new_expiry_time := current_boost_expiry + interval '7 days';
    ELSE
      new_expiry_time := now() + interval '7 days';
    END IF;

    UPDATE public.listings
    SET is_boosted = true,
        boost_expires_at = new_expiry_time,
        updated_at = now()
    WHERE id = payment_row.listing_id;

    SELECT public.user_wants_notification(payment_row.user_id, 'payment_updates')
    INTO v_should_notify;

    IF v_should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message, listing_id)
      VALUES (
        payment_row.user_id,
        'payment_update',
        'Boost activated',
        COALESCE(v_listing_title, 'Your listing') || ' is now pinned to the top for 7 days.',
        payment_row.listing_id
      );
    END IF;
  ELSIF payment_row.payment_type = 'shop_plan' THEN
    SELECT shop_plan_expires_at INTO current_plan_expiry
    FROM public.profiles
    WHERE id = payment_row.user_id;

    IF current_plan_expiry IS NOT NULL AND current_plan_expiry > now() THEN
      new_expiry_time := current_plan_expiry + interval '1 month';
    ELSE
      new_expiry_time := now() + interval '1 month';
    END IF;

    UPDATE public.profiles
    SET is_verified = true,
        shop_plan_expires_at = new_expiry_time
    WHERE id = payment_row.user_id;

    SELECT public.user_wants_notification(payment_row.user_id, 'payment_updates')
    INTO v_should_notify;

    IF v_should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        payment_row.user_id,
        'payment_update',
        'Verified shop activated',
        'Your shop is now verified. The blue check is visible on all your listings.'
      );
    END IF;
  ELSIF payment_row.payment_type = 'flash_deal' THEN
    SELECT id INTO v_flash_deal_id
    FROM public.flash_deals
    WHERE listing_id = payment_row.listing_id
      AND is_active = false
      AND ends_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_flash_deal_id IS NOT NULL THEN
      UPDATE public.flash_deals
      SET is_active = true
      WHERE id = v_flash_deal_id;
    END IF;

    SELECT title INTO v_listing_title
    FROM public.listings WHERE id = payment_row.listing_id;

    SELECT public.user_wants_notification(payment_row.user_id, 'payment_updates')
    INTO v_should_notify;

    IF v_should_notify THEN
      INSERT INTO public.notifications (user_id, type, title, message, listing_id)
      VALUES (
        payment_row.user_id,
        'payment_update',
        'Flash Deal activated',
        COALESCE(v_listing_title, 'Your listing') || ' is now on sale with a limited-time discount.',
        payment_row.listing_id
      );
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported payment type: %', payment_row.payment_type;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Payment finalized');
END;
$$;
-- Grants are applied after every function below exists (see section 7).

-- -----------------------------------------------------------------------------
-- 3. profiles: stop leaking private columns and block self-promotion.
--    Policy "Profiles are publicly viewable" is USING (true), so any visitor could
--    read email, phone, is_admin, referral_credits for EVERY student. And the
--    self-update policy had no column limit, so a user could set their own
--    is_admin = true, is_verified = true or referral_credits = 1000000.
-- -----------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, business_name, campus_id, avatar_url, is_verified,
              created_at, updated_at, shop_plan_expires_at)
  on public.profiles to anon, authenticated;
grant update (display_name, business_name, avatar_url) on public.profiles to authenticated;

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- These policies read profiles.is_admin directly as the calling role. Once is_admin is
-- no longer a readable column they would fail with "permission denied for table
-- profiles" and take down the public listing feed, so they use public.is_admin()
-- (SECURITY DEFINER) instead.
drop policy if exists "Public can view active listings" on public.listings;
create policy "Public can view active listings" on public.listings
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());

drop policy if exists "Admins update any listing" on public.listings;
create policy "Admins update any listing" on public.listings
  for update using (public.is_admin());

drop policy if exists "Admins read all reports" on public.reports;
create policy "Admins read all reports" on public.reports
  for select using (public.is_admin());

drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports" on public.reports
  for update using (public.is_admin());

-- Realtime ignores column privileges and would still broadcast whole rows.
alter publication supabase_realtime drop table public.profiles;

-- Private profile data is read through functions that check who is asking.
create or replace function public.get_my_profile()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_build_object(
    'id', p.id, 'is_admin', p.is_admin, 'referral_code', p.referral_code,
    'referral_credits', p.referral_credits, 'email', p.email, 'phone', p.phone,
    'deletion_requested_at', p.deletion_requested_at), '{}'::jsonb)
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.admin_list_profiles()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Access denied' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select id, display_name, business_name, is_verified, email, phone, created_at, avatar_url
    from public.profiles) x), '[]'::jsonb);
end $$;

create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Access denied' using errcode = '42501'; end if;
  update public.profiles set is_verified = p_verified where id = p_user_id;
  return jsonb_build_object('success', true);
end $$;

-- -----------------------------------------------------------------------------
-- 4. listings: payment bypass.
--    A seller could INSERT a sale listing with status 'active', or UPDATE their own
--    listing to status 'active' / is_boosted = true / a far-future expires_at,
--    skipping the MK 200 fee and the MK 500 boost.
-- -----------------------------------------------------------------------------
drop policy if exists "Users can create their own listings" on public.listings;
create policy "Users can create their own listings" on public.listings
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and is_boosted = false and boost_expires_at is null and views_count = 0
    and (
      (kind = 'sale'  and status in ('draft', 'pending_payment'))
      or (kind <> 'sale' and status in ('draft', 'pending_payment', 'active'))
    )
  );

drop policy if exists "Admins update listings" on public.listings;  -- duplicate of "Admins update any listing"

create or replace function public.guard_listing_client_update()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Only restrict direct client writes. SECURITY DEFINER functions (payments, expiry
  -- cron, view counter) run as the function owner and the service role is not
  -- 'authenticated', so both pass straight through.
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.is_admin() then return new; end if;

  if new.seller_id          is distinct from old.seller_id
     or new.kind             is distinct from old.kind
     or new.is_boosted       is distinct from old.is_boosted
     or new.boost_expires_at is distinct from old.boost_expires_at
     or new.expires_at       is distinct from old.expires_at
     or new.views_count      is distinct from old.views_count then
    raise exception 'These listing fields can only be changed by the system.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not (
       new.status in ('sold', 'removed', 'draft')
    or (new.status = 'pending_payment' and new.kind = 'sale'
        and old.status in ('draft', 'pending_payment', 'expired', 'sold'))
    or (new.status = 'active' and new.kind <> 'sale'
        and old.status in ('draft', 'pending_payment', 'expired', 'sold', 'active'))
  ) then
    raise exception 'Invalid status change.' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists guard_listing_client_update on public.listings;
create trigger guard_listing_client_update
  before update on public.listings
  for each row execute function public.guard_listing_client_update();

-- -----------------------------------------------------------------------------
-- 5. flash_deals: free deals.
--    Sellers could INSERT a flash deal (is_active defaults to true) or UPDATE
--    is_active = true themselves, skipping the MK 300 fee. Deals are created by the
--    payment edge function and switched on by finalize_campusflip_payment().
--    Sellers keep read and delete.
-- -----------------------------------------------------------------------------
drop policy if exists "Sellers can create flash deals"           on public.flash_deals;
drop policy if exists "Sellers can create their own flash deals" on public.flash_deals;
drop policy if exists "Sellers can update their flash deals"     on public.flash_deals;
drop policy if exists "Sellers can update their own flash deals" on public.flash_deals;
drop policy if exists "Sellers can delete their flash deals"     on public.flash_deals;  -- duplicate

-- -----------------------------------------------------------------------------
-- 6. reports: reporters could create a report that is already 'resolved'.
-- -----------------------------------------------------------------------------
drop policy if exists "Authenticated users can report listings" on public.reports;
create policy "Authenticated users can report listings" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'pending');

-- -----------------------------------------------------------------------------
-- 7. Function grants (after all functions exist).
-- -----------------------------------------------------------------------------
-- Functions created in this migration start with PUBLIC execute, so revoke again.
revoke execute on all functions in schema public from public, anon, authenticated;

do $$
declare r record;
begin
  -- Needed by RLS policies, so both roles must be able to run them.
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname in ('is_admin', 'increment_listing_views')
              or (p.proname = 'can_save_listing' and p.pronargs = 2))
  loop execute format('grant execute on function %s to anon, authenticated', r.sig); end loop;

  -- Signed-in users only.
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname in (
             'admin_dashboard_stats', 'claim_referral', 'get_listing_seller_whatsapp', 'get_referral_stats',
             'list_active_sessions', 'request_account_deletion', 'sign_out_other_sessions',
             'get_my_profile', 'admin_list_profiles', 'admin_set_verified')
              or (p.proname = 'can_save_listing' and p.pronargs = 1))
  loop execute format('grant execute on function %s to authenticated', r.sig); end loop;

  -- Harmless pure helpers used inside triggers.
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'generate_referral_code', 'listing_match_score', 'normalize_title', 'set_updated_at',
             'set_wanted_expiry', 'test_match_score')
  loop execute format('grant execute on function %s to anon, authenticated', r.sig); end loop;

  -- Server only (edge functions and cron use the service role / owner).
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'finalize_campusflip_payment', 'run_marketplace_expirations', 'consume_referral_credits',
             'match_wanted_for_listing', 'preview_wanted_matches', 'user_wants_marketing', 'user_wants_notification')
  loop execute format('grant execute on function %s to service_role', r.sig); end loop;
end $$;

commit;
