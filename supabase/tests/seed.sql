grant all on all tables in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to public, anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to public;
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','seller@kuhes.ac.mw'),
 ('00000000-0000-0000-0000-0000000000a2','buyer@kuhes.ac.mw'),
 ('00000000-0000-0000-0000-0000000000ad','admin@kuhes.ac.mw') on conflict do nothing;
insert into public.profiles(id,display_name,email,phone,is_admin) values
 ('00000000-0000-0000-0000-0000000000a1','Seller','seller@kuhes.ac.mw','+265111',false),
 ('00000000-0000-0000-0000-0000000000a2','Buyer','buyer@kuhes.ac.mw','+265222',false),
 ('00000000-0000-0000-0000-0000000000ad','Admin','admin@kuhes.ac.mw','+265999',true) on conflict do nothing;
insert into public.listings(id,seller_id,title,price,kind,status) values
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','Pending sale',1000,'sale','pending_payment'),
 ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a1','Active sale',2000,'sale','active') on conflict do nothing;
insert into public.payments(user_id,listing_id,payment_type,amount,operator,phone_number,charge_id,status) values
 ('00000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111','listing',200,'airtel','0999','chg_listing','pending'),
 ('00000000-0000-0000-0000-0000000000a1','22222222-2222-2222-2222-222222222222','boost',500,'airtel','0999','chg_boost','pending') on conflict do nothing;
