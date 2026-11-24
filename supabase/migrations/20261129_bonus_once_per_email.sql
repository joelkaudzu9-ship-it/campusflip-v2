-- The welcome bonus can be claimed once per KUHeS email, even if the account is deleted and
-- the student signs up again. The claim is remembered in welcome_bonus_claims, which is not
-- removed when an account is purged. Only a hash of the email is kept. Safe to run more than once.

create table if not exists public.welcome_bonus_claims (
  email_hash text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.welcome_bonus_claims enable row level security;   -- no policies: server only
revoke all on public.welcome_bonus_claims from public, anon, authenticated;

-- Remember everyone who has already claimed.
insert into public.welcome_bonus_claims (email_hash, claimed_at)
select md5(lower(trim(p.email))), p.welcome_bonus_at
  from public.profiles p
 where p.welcome_bonus_at is not null and p.email is not null
on conflict do nothing;

create or replace function public.claim_welcome_bonus()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_credits integer;
  v_hash text;
  c_bonus constant integer := 2;
begin
  if v_uid is null then raise exception 'Please sign in.'; end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_uid;

  if v_confirmed is null then return jsonb_build_object('success', false, 'reason', 'unverified'); end if;
  if not public.is_kuhes_email(v_email) then return jsonb_build_object('success', false, 'reason', 'not_kuhes'); end if;

  v_hash := md5(lower(trim(v_email)));
  insert into public.welcome_bonus_claims (email_hash) values (v_hash) on conflict do nothing;
  if not found then return jsonb_build_object('success', false, 'reason', 'already_claimed'); end if;

  update public.profiles
     set referral_credits = referral_credits + c_bonus, welcome_bonus_at = now()
   where id = v_uid and welcome_bonus_at is null
   returning referral_credits into v_credits;

  if not found then return jsonb_build_object('success', false, 'reason', 'already_claimed'); end if;
  return jsonb_build_object('success', true, 'bonus', c_bonus, 'credits', v_credits);
end $$;

revoke all on function public.claim_welcome_bonus() from public, anon;
grant execute on function public.claim_welcome_bonus() to authenticated;
