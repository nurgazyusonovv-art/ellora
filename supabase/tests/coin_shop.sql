-- Атайын локалдык тест базасында гана, 0001–0010 миграцияларынан кийин иштетиңиз.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/coin_shop.sql
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000001001','{"role":"teacher","full_name":"Test teacher"}'),
 ('00000000-0000-0000-0000-000000001002','{"role":"student","full_name":"Test student"}'),
 ('00000000-0000-0000-0000-000000001003','{"role":"student","full_name":"Other student"}');
insert into public.classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000001001','Test','COINTEST');
insert into public.class_members(class_id,student_id) values('10000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000001002');
insert into public.lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000001001','Test','{}');
insert into public.assignments(id,lesson_id,class_id) values
 ('30000000-0000-0000-0000-000000001001','20000000-0000-0000-0000-000000001001','10000000-0000-0000-0000-000000001001'),
 ('30000000-0000-0000-0000-000000001002','20000000-0000-0000-0000-000000001001','10000000-0000-0000-0000-000000001001');
insert into public.attempts(id,assignment_id,student_id) values('40000000-0000-0000-0000-000000001001','30000000-0000-0000-0000-000000001001','00000000-0000-0000-0000-000000001002');
-- Жооп жазуу өзү сыйлык бербейт: бөлүк бүтүүгө тийиш.
insert into public.answers(attempt_id,block_id,stage,response) values('40000000-0000-0000-0000-000000001001','l1',1,'{"prediction":"test"}');
do $$begin if exists(select 1 from public.coin_wallets where student_id='00000000-0000-0000-0000-000000001002') then raise exception 'Partial answer rewarded'; end if; end$$;
update public.attempts set current_stage=1 where id='40000000-0000-0000-0000-000000001001';
do $$begin if (select balance from public.coin_wallets where student_id='00000000-0000-0000-0000-000000001002')<>5 then raise exception 'First reward wrong'; end if; end$$;
update public.attempts set current_stage=4 where id='40000000-0000-0000-0000-000000001001';
update public.attempts set current_stage=3 where id='40000000-0000-0000-0000-000000001001';
update public.attempts set current_stage=4 where id='40000000-0000-0000-0000-000000001001';
do $$begin if (select balance from public.coin_wallets where student_id='00000000-0000-0000-0000-000000001002')<>45 then raise exception 'Repeat reward or wrong total'; end if; end$$;
update public.attempts set current_stage=5,finished_at=now(),exit_score=0,exit_total=3 where id='40000000-0000-0000-0000-000000001001';
insert into public.attempts(id,assignment_id,student_id) values('40000000-0000-0000-0000-000000001002','30000000-0000-0000-0000-000000001002','00000000-0000-0000-0000-000000001002');
update public.attempts set current_stage=5,finished_at=now() where id='40000000-0000-0000-0000-000000001002';
do $$begin if (select balance from public.coin_wallets where student_id='00000000-0000-0000-0000-000000001002')<>55 then raise exception 'Duplicate lesson farming'; end if; end$$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000001002';
do $$begin
 begin update public.coin_wallets set balance=9999;raise exception 'Wallet writable';exception when insufficient_privilege then null;end;
 begin insert into public.coin_ledger(student_id,source_key,amount,reason) values(auth.uid(),'forged',999,'fake');raise exception 'Ledger writable';exception when insufficient_privilege then null;end;
 begin update public.attempts set current_stage=5; if found then raise exception 'Progress writable';end if;end;
 begin perform private.credit_stage_coins(auth.uid(),'20000000-0000-0000-0000-000000001001',0);raise exception 'Private reward callable';exception when insufficient_privilege then null;end;
 if public.buy_shop_item('missing')<>'unavailable' then raise exception 'Unknown item allowed';end if;
 if public.buy_shop_item('avatar-fox')<>'ok' then raise exception 'Purchase failed';end if;
 if public.buy_shop_item('avatar-fox')<>'already_owned' then raise exception 'Duplicate purchase';end if;
 if public.buy_shop_item('avatar-robot')<>'not_enough' then raise exception 'Overspending allowed';end if;
 if public.equip_shop_item('avatar','avatar-robot')<>'not_owned' then raise exception 'Unowned equip';end if;
 if public.equip_shop_item('frame','avatar-fox')<>'not_owned' then raise exception 'Wrong slot allowed';end if;
 if public.equip_shop_item('avatar','avatar-fox')<>'ok' then raise exception 'Equip failed';end if;
 if public.equip_shop_item('avatar',null)<>'ok' then raise exception 'Reset failed';end if;
 if public.buy_shop_item('frame-lilac')<>'ok' then raise exception 'Exact balance failed';end if;
 if (select balance from public.coin_wallets)<>0 or (select earned_total from public.coin_wallets)<>55 then raise exception 'Balance/lifetime wrong';end if;
 if (select count(*) from public.student_items)<>2 or (select sum(amount) from public.coin_ledger)<>0 then raise exception 'Ledger inconsistent';end if;
end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000001003';
do $$begin if exists(select 1 from public.coin_wallets) or exists(select 1 from public.coin_ledger) or exists(select 1 from public.student_items) or exists(select 1 from public.student_equipment) then raise exception 'Other student data exposed';end if;end$$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000001001';
do $$begin if public.buy_shop_item('avatar-fox')<>'forbidden' or public.equip_shop_item('avatar','avatar-fox')<>'forbidden' then raise exception 'Teacher can spend';end if;end$$;
reset role;
do $$begin if (select exit_score from public.attempts where id='40000000-0000-0000-0000-000000001001')<>0 then raise exception 'Grade changed';end if;end$$;
-- Дайындама өчсө да капчык, сатып алуулар жана сыйлык тарыхы сакталат.
delete from public.assignments where class_id='10000000-0000-0000-0000-000000001001';
do $$begin if (select earned_total from public.coin_wallets where student_id='00000000-0000-0000-0000-000000001002')<>55 then raise exception 'History lost';end if;end$$;
select 'Coin rewards, RLS, shop and equipment passed' as result;
rollback;
