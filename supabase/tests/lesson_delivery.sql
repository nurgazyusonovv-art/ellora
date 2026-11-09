-- Өзүнчө локалдык тест базасында 0001–0018ден кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000008001','{"role":"teacher","full_name":"Live teacher"}'),
 ('00000000-0000-0000-0000-000000008002','{"role":"student","full_name":"Live student"}'),
 ('00000000-0000-0000-0000-000000008004','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000008001','00000000-0000-0000-0000-000000008001','Live class','LIVETEST1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-000000008001','00000000-0000-0000-0000-000000008002');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000008001','00000000-0000-0000-0000-000000008001','Live','{}');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-000000008001','20000000-0000-0000-0000-000000008001','10000000-0000-0000-0000-000000008001');

-- Мурунку дайындамалар өз алдынча бойдон калат; туура эмес маани кабыл алынбайт.
select pg_temp.expect((select delivery from assignments where id='30000000-0000-0000-0000-000000008001'),'self');
do $$begin
 update assignments set delivery='live' where id='30000000-0000-0000-0000-000000008001';
 raise exception 'bad delivery allowed';
exception when check_violation then null;end$$;

set local role authenticated;
-- Мугалим ыкманы өзгөртүп, сабакты баштайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008001';
update assignments set delivery='class' where id='30000000-0000-0000-0000-000000008001';
insert into lesson_sessions(assignment_id,max_stage,paused,started_at) values('30000000-0000-0000-0000-000000008001',0,false,now());
select pg_temp.expect((select delivery from assignments where id='30000000-0000-0000-0000-000000008001'),'class');

-- Окуучу ыкманы да, сессияны да өзгөртө албайт, бирок көрөт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008002';
select pg_temp.expect((select delivery from assignments where id='30000000-0000-0000-0000-000000008001'),'class');
select pg_temp.expect((select max_stage::text from lesson_sessions),'0');
update assignments set delivery='self' where id='30000000-0000-0000-0000-000000008001';
update lesson_sessions set max_stage=4;
reset role;
select pg_temp.expect((select delivery from assignments where id='30000000-0000-0000-0000-000000008001'),'class');
select pg_temp.expect((select max_stage::text from lesson_sessions),'0');

-- Башка мугалим көрбөйт жана өзгөртө албайт.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008004';
select pg_temp.expect((select count(*)::text from lesson_sessions),'0');
update assignments set delivery='self' where id='30000000-0000-0000-0000-000000008001';
update lesson_sessions set ended=true;
reset role;
select pg_temp.expect((select delivery from assignments where id='30000000-0000-0000-0000-000000008001'),'class');
select pg_temp.expect((select ended::text from lesson_sessions),'false');
rollback;
