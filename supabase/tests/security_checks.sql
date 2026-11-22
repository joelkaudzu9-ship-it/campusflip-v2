\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create or replace function pg_temp.try(label text, stmt text, who text, uid text) returns void language plpgsql as $f$
declare n int; r text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
  perform set_config('request.jwt.claim.role', who, true);
  execute format('set local role %I', who);
  begin
    execute stmt; get diagnostics n = row_count;
    raise notice '% | %', rpad(label,58), case when n>0 or stmt ilike 'select%' then 'ALLOWED (rows='||n||')' else 'no rows affected' end;
  exception when others then
    raise notice '% | BLOCKED (%)', rpad(label,58), left(sqlerrm,60);
  end;
  execute 'reset role';
end $f$;
begin;
-- seller U1 attacks
select pg_temp.try('1 anon reads all emails/phones from profiles', 'select email, phone, is_admin from public.profiles', 'anon', null);
select pg_temp.try('2 user makes THEMSELVES admin', $$update public.profiles set is_admin=true where id='00000000-0000-0000-0000-0000000000a1'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('3 user gives themselves 999 referral credits', $$update public.profiles set referral_credits=999 where id='00000000-0000-0000-0000-0000000000a1'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('4 seller activates pending listing w/o paying', $$update public.listings set status='active' where id='11111111-1111-1111-1111-111111111111'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('5 seller boosts own listing for free', $$update public.listings set is_boosted=true where id='22222222-2222-2222-2222-222222222222'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('6 seller inserts sale listing already active', $$insert into public.listings(seller_id,title,price,kind,status) values ('00000000-0000-0000-0000-0000000000a1','free ride',5,'sale','active')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('7 seller creates flash deal w/o paying', $$insert into public.flash_deals(listing_id,original_price,deal_price,ends_at) values ('22222222-2222-2222-2222-222222222222',2000,1000,now()+interval '1 day')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('8 anon calls finalize_campusflip_payment(own charge)', $$select public.finalize_campusflip_payment('chg_boost','x')$$, 'anon', null);
select pg_temp.try('9 user reports listing as already resolved', $$insert into public.reports(listing_id,reporter_id,reason,status) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a2','spam','resolved')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
-- legit flows
select pg_temp.try('L15 user saves a listing', $$insert into public.saved_listings(user_id,listing_id) values ('00000000-0000-0000-0000-0000000000a2','22222222-2222-2222-2222-222222222222')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('L1 seller edits own title/price', $$update public.listings set title='New title', price=1500 where id='22222222-2222-2222-2222-222222222222'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L2 seller marks listing sold', $$update public.listings set status='sold' where id='22222222-2222-2222-2222-222222222222'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L3 seller creates sale listing pending_payment', $$insert into public.listings(seller_id,title,price,kind,status) values ('00000000-0000-0000-0000-0000000000a1','ok',5,'sale','pending_payment')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L4 seller creates wanted post (active, no fee)', $$insert into public.listings(seller_id,title,kind,status) values ('00000000-0000-0000-0000-0000000000a1','need calc','wanted','active')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L5 user edits own display_name', $$update public.profiles set display_name='Chikondi' where id='00000000-0000-0000-0000-0000000000a1'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L6 anon reads public profile columns', 'select id, display_name, business_name, is_verified, avatar_url from public.profiles', 'anon', null);
select pg_temp.try('L7 anon reads active listings', $$select id,title,price from public.listings where status='active'$$, 'anon', null);
select pg_temp.try('L8 anon increments listing views (RPC)', $$select public.increment_listing_views('22222222-2222-2222-2222-222222222222')$$, 'anon', null);
select pg_temp.try('L9 service_role finalizes listing payment', $$select public.finalize_campusflip_payment('chg_listing','ref1')$$, 'service_role', null);
select pg_temp.try('L10 service_role finalizes boost payment', $$select public.finalize_campusflip_payment('chg_boost','ref2')$$, 'service_role', null);
select pg_temp.try('L11 admin is_admin() RPC', $$select public.is_admin()$$, 'authenticated','00000000-0000-0000-0000-0000000000ad');
select pg_temp.try('L12 admin dashboard stats RPC', $$select public.admin_dashboard_stats()$$, 'authenticated','00000000-0000-0000-0000-0000000000ad');
select pg_temp.try('L13 admin removes a listing', $$update public.listings set status='removed' where id='11111111-1111-1111-1111-111111111111'$$, 'authenticated','00000000-0000-0000-0000-0000000000ad');
select pg_temp.try('L14 user files a normal report', $$insert into public.reports(listing_id,reporter_id,reason) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a2','spam')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('L16 user calls request_account_deletion', $$select public.request_account_deletion()$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
rollback;
