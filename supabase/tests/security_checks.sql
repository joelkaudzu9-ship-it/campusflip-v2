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
insert into public.notifications(id,user_id,type,title,message) values
 ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','system','mine','m'),
 ('aaaaaaaa-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','system','theirs','m');
select pg_temp.try('N1 user clears own notification', $$delete from public.notifications where id='aaaaaaaa-0000-0000-0000-000000000001'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('N2 user clears someone else notification', $$delete from public.notifications where id='aaaaaaaa-0000-0000-0000-000000000002'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('N3 anon clears notifications', $$delete from public.notifications$$, 'anon', null);
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.try('W1 gmail signup is rejected', $$insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000f1','someone@gmail.com')$$, 'postgres', null);
select pg_temp.try('W2 look-alike domain signup is rejected', $$insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000f2','x@kuhes.ac.mw.evil.com')$$, 'postgres', null);
select pg_temp.try('W3 KUHeS signup is accepted', $$insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000f3','new@kuhes.ac.mw')$$, 'postgres', null);
select pg_temp.try('W4 verified student claims welcome bonus', $$select public.claim_welcome_bonus()$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('W5 bonus really added 2 credits', $$with x as (select 1 from public.profiles where id='00000000-0000-0000-0000-0000000000a1' and referral_credits=2 and welcome_bonus_at is not null) select * from x$$, 'postgres', null);
select pg_temp.try('W6 second claim is refused (already_claimed)', $$with x as (select public.claim_welcome_bonus() r) select 1 from x where r->>'reason'='already_claimed'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('W7 unverified email is refused (unverified)', $$with x as (select public.claim_welcome_bonus() r) select 1 from x where r->>'reason'='unverified'$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('W8 anon cannot claim bonus', $$select public.claim_welcome_bonus()$$, 'anon', null);
select pg_temp.try('P1 user registers own device for push', $$select public.register_push_subscription('https://push.example/abc','key','auth','ua')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('P2 anon registers a device', $$select public.register_push_subscription('https://push.example/zzz','key','auth','ua')$$, 'anon', null);
select pg_temp.try('P3 http (non-https) endpoint rejected', $$select public.register_push_subscription('http://evil.example/x','key','auth','ua')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('P4 user inserts push row directly for someone else', $$insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values ('00000000-0000-0000-0000-0000000000a2','https://push.example/v','k','a')$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('P5 other user sees my device', $$with x as (select 1 from public.push_subscriptions) select * from x$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('P6 other user deletes my device', $$delete from public.push_subscriptions where endpoint='https://push.example/abc'$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('P7 shared phone: next user takes over the device', $$select public.register_push_subscription('https://push.example/abc','key2','auth2','ua')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('P8 previous user no longer owns it', $$delete from public.push_subscriptions where endpoint='https://push.example/abc'$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('P9 owner removes own device', $$delete from public.push_subscriptions where endpoint='https://push.example/abc'$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
insert into public.seller_contacts(user_id,whatsapp_number) values ('00000000-0000-0000-0000-0000000000a1','265991234567') on conflict (user_id) do update set whatsapp_number=excluded.whatsapp_number;
select pg_temp.try('R1 seller posts within the hourly limit', $t$do $b$ begin for i in 1..5 loop insert into public.listings(seller_id,title,price,kind,status) values ('00000000-0000-0000-0000-0000000000a1','r'||i,1,'sale','draft'); end loop; end $b$$t$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('R2 seller posting 9 more is stopped (limit 10/hour)', $t$do $b$ begin for i in 1..9 loop insert into public.listings(seller_id,title,price,kind,status) values ('00000000-0000-0000-0000-0000000000a1','q'||i,1,'sale','draft'); end loop; end $b$$t$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('R3 other seller is not affected', $$insert into public.listings(seller_id,title,price,kind,status) values ('00000000-0000-0000-0000-0000000000a2','mine',1,'sale','draft')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('R4 duplicate report on same listing is refused', $$insert into public.reports(listing_id,reporter_id,reason) values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a2','spam')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select set_config('request.jwt.claim.sub','',true);
set local session_replication_role = replica;
insert into public.listings(id,seller_id,title,price,kind,status)
  values ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-0000000000a1','Contact test',1,'sale','active');
insert into public.listings(id,seller_id,title,price,kind,status)
  select gen_random_uuid(),'00000000-0000-0000-0000-0000000000ad','x'||g,1,'sale','active' from generate_series(1,12) g;
set local session_replication_role = origin;
select pg_temp.try('R5 student sending 12 reports in a day is stopped (limit 10)', $t$do $b$ declare r record; begin for r in select id from public.listings where seller_id='00000000-0000-0000-0000-0000000000ad' loop insert into public.reports(listing_id,reporter_id,reason) values (r.id,'00000000-0000-0000-0000-0000000000a2','spam'); end loop; end $b$$t$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('R6 buyer looks up a seller contact', $$select public.get_listing_seller_whatsapp('33333333-3333-3333-3333-333333333333')$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('R7 31 contact lookups in an hour are stopped (limit 30)', $t$do $b$ begin for i in 1..31 loop perform public.get_listing_seller_whatsapp('33333333-3333-3333-3333-333333333333'); end loop; end $b$$t$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('R8 contact_lookups log is not readable by users', $$select * from public.contact_lookups$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
select pg_temp.try('L16 user calls request_account_deletion', $$select public.request_account_deletion()$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
rollback;
