\pset format unaligned
\pset tuples_only on
create or replace function pg_temp.try(label text, stmt text, who text, uid text) returns void language plpgsql as $f$
declare out text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  perform set_config('request.jwt.claim.role', who, true);
  execute format('set local role %I', who);
  begin
    execute stmt into out; raise notice '% | OK -> %', rpad(label,52), left(coalesce(out,'null'),70);
  exception when others then raise notice '% | BLOCKED (%)', rpad(label,52), left(sqlerrm,50);
  end;
  execute 'reset role';
end $f$;
begin;
select pg_temp.try('X1 user get_my_profile()', $$select public.get_my_profile()::text$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('X2 anon get_my_profile()', $$select public.get_my_profile()::text$$, 'anon', null);
select pg_temp.try('X3 non-admin admin_list_profiles()', $$select public.admin_list_profiles()::text$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('X4 admin admin_list_profiles() count', $$select jsonb_array_length(public.admin_list_profiles())::text$$, 'authenticated','00000000-0000-0000-0000-0000000000ad');
select pg_temp.try('X5 non-admin admin_set_verified()', $$select public.admin_set_verified('00000000-0000-0000-0000-0000000000a1', true)::text$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('X6 admin admin_set_verified()', $$select public.admin_set_verified('00000000-0000-0000-0000-0000000000a1', true)::text$$, 'authenticated','00000000-0000-0000-0000-0000000000ad');
select pg_temp.try('X7 user get_referral_stats()', $$select public.get_referral_stats()::text$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('X8 boost finalize 1st call', $$select (public.finalize_campusflip_payment('chg_boost','r'))->>'message'$$, 'service_role', null);
select boost_expires_at as after_first from public.listings where id='22222222-2222-2222-2222-222222222222' \gset
select pg_temp.try('X9 boost finalize 2nd call (idempotent?)', $$select (public.finalize_campusflip_payment('chg_boost','r'))->>'message'$$, 'service_role', null);
select (boost_expires_at = :'after_first'::timestamptz) as boost_not_extended_again from public.listings where id='22222222-2222-2222-2222-222222222222';
select pg_temp.try('X10 anon get_listing_seller_whatsapp()', $$select public.get_listing_seller_whatsapp('22222222-2222-2222-2222-222222222222')$$, 'anon', null);
rollback;
