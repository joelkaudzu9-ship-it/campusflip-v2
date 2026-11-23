-- 1) Only @kuhes.ac.mw emails can create accounts (enforced in the database, not just the form).
-- 2) One-time welcome bonus of 2 free-listing credits (MK 400) for a VERIFIED KUHeS email.
-- Safe to run more than once. Existing accounts are not affected by (1).

alter table public.profiles add column if not exists welcome_bonus_at timestamptz;

create or replace function public.is_kuhes_email(p_email text)
returns boolean language sql immutable as
$$ select coalesce(lower(p_email) ~ '^[^@[:space:]]+@kuhes\.ac\.mw$', false) $$;

create or replace function public.enforce_kuhes_email()
returns trigger language plpgsql as $$
begin
  if not public.is_kuhes_email(new.email) then
    raise exception 'CampusFlip is only for KUHeS students. Please use your name@kuhes.ac.mw email address.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists a_enforce_kuhes_email_insert on auth.users;
create trigger a_enforce_kuhes_email_insert
  before insert on auth.users
  for each row execute function public.enforce_kuhes_email();

-- Changing the email later must also stay on the university domain.
drop trigger if exists a_enforce_kuhes_email_update on auth.users;
create trigger a_enforce_kuhes_email_update
  before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.enforce_kuhes_email();

create or replace function public.claim_welcome_bonus()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_credits integer;
  c_bonus constant integer := 2;
begin
  if v_uid is null then raise exception 'Please sign in.'; end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_uid;

  if v_confirmed is null then return jsonb_build_object('success', false, 'reason', 'unverified'); end if;
  if not public.is_kuhes_email(v_email) then return jsonb_build_object('success', false, 'reason', 'not_kuhes'); end if;

  update public.profiles
     set referral_credits = referral_credits + c_bonus, welcome_bonus_at = now()
   where id = v_uid and welcome_bonus_at is null
   returning referral_credits into v_credits;

  if not found then return jsonb_build_object('success', false, 'reason', 'already_claimed'); end if;
  return jsonb_build_object('success', true, 'bonus', c_bonus, 'credits', v_credits);
end $$;

revoke all on function public.claim_welcome_bonus() from public, anon;
grant execute on function public.claim_welcome_bonus() to authenticated;
