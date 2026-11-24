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
select set_config('request.jwt.claim.sub','',true);
insert into public.listings(id,seller_id,title,kind,status) values
 ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-0000000000a2','iPhone 11 128GB','wanted','active'),
 ('44444444-4444-4444-4444-444444444445','00000000-0000-0000-0000-0000000000ad','Samsung Galaxy A14','wanted','active');
update public.notification_preferences set wanted_matches=false where user_id='00000000-0000-0000-0000-0000000000ad';
insert into public.listings(id,seller_id,title,price,kind,status) values
 ('55555555-5555-5555-5555-555555555555','00000000-0000-0000-0000-0000000000a1','iPhone 11 128GB blue',900000,'sale','draft'),
 ('66666666-6666-6666-6666-666666666666','00000000-0000-0000-0000-0000000000a1','Mathematics textbook',5000,'sale','draft'),
 ('77777777-7777-7777-7777-777777777777','00000000-0000-0000-0000-0000000000a1','Samsung Galaxy A14 64GB',150000,'sale','draft');
update public.listings set status='active' where id in ('55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666','77777777-7777-7777-7777-777777777777');
select pg_temp.try('M1 matching sale notifies the person who wanted it', $$with x as (select 1 from public.notifications where user_id='00000000-0000-0000-0000-0000000000a2' and type='wanted_match' and listing_id='55555555-5555-5555-5555-555555555555') select * from x$$, 'postgres', null);
select pg_temp.try('M2 unrelated sale notifies nobody', $$with x as (select 1 from public.notifications where type='wanted_match' and listing_id='66666666-6666-6666-6666-666666666666') select * from x$$, 'postgres', null);
select pg_temp.try('M3 wanter who turned matches off is not notified', $$with x as (select 1 from public.notifications where user_id='00000000-0000-0000-0000-0000000000ad' and type='wanted_match') select * from x$$, 'postgres', null);
select pg_temp.try('M4 seller is never notified about own listing', $$with x as (select 1 from public.notifications where user_id='00000000-0000-0000-0000-0000000000a1' and type='wanted_match') select * from x$$, 'postgres', null);
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d1','old@kuhes.ac.mw'),('00000000-0000-0000-0000-0000000000d2','recent@kuhes.ac.mw'),('00000000-0000-0000-0000-0000000000d3','noprofile@kuhes.ac.mw') on conflict do nothing;
insert into public.profiles(id,display_name,email,phone) values ('00000000-0000-0000-0000-0000000000d1','Old','old@kuhes.ac.mw','+2653'),('00000000-0000-0000-0000-0000000000d2','Recent','recent@kuhes.ac.mw','+2654') on conflict do nothing;
update public.profiles set deletion_requested_at = now() - interval '31 days' where id='00000000-0000-0000-0000-0000000000d1';
update public.profiles set deletion_requested_at = now() - interval '5 days' where id='00000000-0000-0000-0000-0000000000d2';
insert into public.listings(id,seller_id,title,price,kind,status) values ('88888888-8888-8888-8888-888888888888','00000000-0000-0000-0000-0000000000d1','Old account listing',1,'sale','draft');
select public.hard_delete_expired_accounts();
select pg_temp.try('H1 account due for deletion is fully removed', $$with x as (select 1 where not exists (select 1 from public.profiles where id='00000000-0000-0000-0000-0000000000d1') and not exists (select 1 from auth.users where id='00000000-0000-0000-0000-0000000000d1') and not exists (select 1 from public.listings where seller_id='00000000-0000-0000-0000-0000000000d1')) select * from x$$, 'postgres', null);
select pg_temp.try('H2 account requested only 5 days ago is kept', $$with x as (select 1 from public.profiles where id='00000000-0000-0000-0000-0000000000d2') select * from x$$, 'postgres', null);
select pg_temp.try('H3 login without a profile is NOT deleted', $$with x as (select 1 from auth.users where id='00000000-0000-0000-0000-0000000000d3') select * from x$$, 'postgres', null);
select pg_temp.try('H4 normal users cannot run the purge', $$select public.hard_delete_expired_accounts()$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
-- Image cleanup queue
set local session_replication_role = replica;
insert into public.listings(id,seller_id,title,price,kind,status,expires_at) values
 ('99999999-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Expired long ago',1,'sale','expired', now() - interval '6 days'),
 ('99999999-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Expired recently',1,'sale','expired', now() - interval '2 days');
set local session_replication_role = origin;
insert into public.listing_photos(listing_id,image_url) values
 ('99999999-0000-0000-0000-000000000001','https://res.cloudinary.com/demo/image/upload/v1/cf/old.jpg'),
 ('99999999-0000-0000-0000-000000000002','https://res.cloudinary.com/demo/image/upload/v1/cf/recent.jpg'),
 ('99999999-0000-0000-0000-000000000002','https://example.com/not-cloudinary.jpg');
delete from public.image_delete_queue;
delete from public.listing_photos where image_url like '%not-cloudinary%';
delete from public.listing_photos where image_url like '%recent.jpg';
select pg_temp.try('I1 deleting a Cloudinary photo queues it', $$with x as (select 1 from public.image_delete_queue where image_url like '%recent.jpg') select * from x$$, 'postgres', null);
insert into public.listing_photos(listing_id,image_url) values ('99999999-0000-0000-0000-000000000002','https://example.com/other.jpg');
delete from public.listing_photos where image_url like '%other.jpg';
select pg_temp.try('I2 a photo that is not on Cloudinary is never queued', $$with x as (select 1 where not exists (select 1 from public.image_delete_queue where image_url like '%example.com%')) select * from x$$, 'postgres', null);
delete from public.image_delete_queue;
select public.purge_expired_listing_photos();
select pg_temp.try('I3 listing expired more than 5 days ago is removed and its photo queued', $$with x as (select 1 where exists (select 1 from public.listings where id='99999999-0000-0000-0000-000000000001' and status='removed') and not exists (select 1 from public.listing_photos where listing_id='99999999-0000-0000-0000-000000000001') and exists (select 1 from public.image_delete_queue where image_url like '%old.jpg')) select * from x$$, 'postgres', null);
select pg_temp.try('I4 listing expired 2 days ago is left alone', $$with x as (select 1 from public.listings where id='99999999-0000-0000-0000-000000000002' and status='expired') select * from x$$, 'postgres', null);
update public.profiles set avatar_url='https://res.cloudinary.com/demo/image/upload/v1/cf/av1.jpg' where id='00000000-0000-0000-0000-0000000000a2';
delete from public.image_delete_queue;
update public.profiles set avatar_url='https://res.cloudinary.com/demo/image/upload/v1/cf/av2.jpg' where id='00000000-0000-0000-0000-0000000000a2';
select pg_temp.try('I5 replacing an avatar queues the old one', $$with x as (select 1 from public.image_delete_queue where image_url like '%av1.jpg') select * from x$$, 'postgres', null);
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d4','gone@kuhes.ac.mw') on conflict do nothing;
insert into public.profiles(id,display_name,email,phone,avatar_url) values ('00000000-0000-0000-0000-0000000000d4','Gone','gone@kuhes.ac.mw','+2655','https://res.cloudinary.com/demo/image/upload/v1/cf/gone-av.jpg') on conflict do nothing;
update public.profiles set deletion_requested_at = now() - interval '31 days' where id='00000000-0000-0000-0000-0000000000d4';
set local session_replication_role = replica;
insert into public.listings(id,seller_id,title,price,kind,status) values ('99999999-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000d4','Gone listing',1,'sale','draft');
set local session_replication_role = origin;
insert into public.listing_photos(listing_id,image_url) values ('99999999-0000-0000-0000-000000000004','https://res.cloudinary.com/demo/image/upload/v1/cf/gone-photo.jpg');
select public.hard_delete_expired_accounts();
select pg_temp.try('I6 deleted account has its avatar and listing photos queued', $$with x as (select 1 where exists (select 1 from public.image_delete_queue where image_url like '%gone-av.jpg') and exists (select 1 from public.image_delete_queue where image_url like '%gone-photo.jpg')) select * from x$$, 'postgres', null);
select pg_temp.try('I7 normal users cannot read the delete queue', $$select * from public.image_delete_queue$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('I8 normal users cannot run the photo purge', $$select public.purge_expired_listing_photos()$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
-- Welcome bonus is once per email, even after deleting the account
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000e1','again@kuhes.ac.mw', now()) on conflict do nothing;
insert into public.profiles(id,display_name,email,phone) values ('00000000-0000-0000-0000-0000000000e1','Again','again@kuhes.ac.mw','+2656') on conflict do nothing;
select pg_temp.try('B1 first claim for an email works', $$with x as (select public.claim_welcome_bonus() r) select 1 from x where r->>'success'='true'$$, 'authenticated','00000000-0000-0000-0000-0000000000e1');
select set_config('request.jwt.claim.sub','',true);
delete from public.profiles where id='00000000-0000-0000-0000-0000000000e1';
delete from auth.users where id='00000000-0000-0000-0000-0000000000e1';
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000e2','Again@kuhes.ac.mw', now());
insert into public.profiles(id,display_name,email,phone) values ('00000000-0000-0000-0000-0000000000e2','Again2','Again@kuhes.ac.mw','+2657');
select pg_temp.try('B2 same email after delete and re-signup is refused', $$with x as (select public.claim_welcome_bonus() r) select 1 from x where r->>'reason'='already_claimed'$$, 'authenticated','00000000-0000-0000-0000-0000000000e2');
select pg_temp.try('B3 re-signup got no credits', $$with x as (select 1 from public.profiles where id='00000000-0000-0000-0000-0000000000e2' and referral_credits=0) select * from x$$, 'postgres', null);
select pg_temp.try('B4 normal users cannot read the claims list', $$select * from public.welcome_bonus_claims$$, 'authenticated','00000000-0000-0000-0000-0000000000a1');
select pg_temp.try('L16 user calls request_account_deletion', $$select public.request_account_deletion()$$, 'authenticated','00000000-0000-0000-0000-0000000000a2');
rollback;
