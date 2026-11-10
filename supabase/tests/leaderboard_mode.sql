-- Өзүнчө локалдык тест базасында 0001–0023төн кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000c001','{"role":"teacher","full_name":"Board teacher"}'),
 ('00000000-0000-0000-0000-00000000c002','{"role":"student","full_name":"Board student"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c001','Mode class','MODETEST1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002');
select pg_temp.expect((select leaderboard_mode from classes where id='10000000-0000-0000-0000-00000000c001'),'weekly');
do $$begin
 update classes set leaderboard_mode='top' where id='10000000-0000-0000-0000-00000000c001';
 raise exception 'bad mode allowed';
exception when check_violation then null;end$$;

set local role authenticated;
-- Мугалим өзгөртөт, окуучу көрөт бирок өзгөртө албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000c001';
update classes set leaderboard_mode='xp' where id='10000000-0000-0000-0000-00000000c001';
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000c002';
select pg_temp.expect((select leaderboard_mode from classes where id='10000000-0000-0000-0000-00000000c001'),'xp');
update classes set leaderboard_mode='off' where id='10000000-0000-0000-0000-00000000c001';
reset role;
select pg_temp.expect((select leaderboard_mode from classes where id='10000000-0000-0000-0000-00000000c001'),'xp');
rollback;
