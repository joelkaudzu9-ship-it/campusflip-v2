\pset format unaligned
\pset tuples_only on
begin;
update public.profiles set referral_credits=1 where id='00000000-0000-0000-0000-0000000000a1';
insert into public.listings(id,seller_id,title,price,kind,status) values
 ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-0000000000a1','Second pending',900,'sale','pending_payment'),
 ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-0000000000a1','Removed by admin',900,'sale','removed');
insert into public.payments(user_id,listing_id,payment_type,amount,operator,phone_number,charge_id,status,provider,credits_used) values
 ('00000000-0000-0000-0000-0000000000a1','11111111-1111-1111-1111-111111111111','listing',0,'airtel','0999','cr1','pending','referral_credit',1),
 ('00000000-0000-0000-0000-0000000000a1','33333333-3333-3333-3333-333333333333','listing',0,'airtel','0999','cr2','pending','referral_credit',1),
 ('00000000-0000-0000-0000-0000000000a1','44444444-4444-4444-4444-444444444444','listing',200,'airtel','0999','paid_removed','pending','paychangu',0);
set local role service_role;
select 'credit payment 1 success=' || ((public.finalize_campusflip_payment('cr1','x'))->>'success');
do $$ begin
  begin perform public.finalize_campusflip_payment('cr2','x'); raise notice 'credit payment 2: ALLOWED (BAD)';
  exception when others then raise notice 'credit payment 2: BLOCKED (%)', sqlerrm; end;
end $$;
select public.finalize_campusflip_payment('paid_removed','x') is not null as finalize_ran;
select 'removed listing status now: ' || status from public.listings where id='44444444-4444-4444-4444-444444444444';
reset role;
select 'credits left: ' || referral_credits from public.profiles where id='00000000-0000-0000-0000-0000000000a1';
rollback;
