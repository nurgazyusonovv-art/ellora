-- Өзүнчө локалдык тест базасында 0001–0017ден кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000007001','{"role":"teacher","full_name":"Game teacher"}'),
 ('00000000-0000-0000-0000-000000007002','{"role":"student","full_name":"Game student"}'),
 ('00000000-0000-0000-0000-000000007003','{"role":"student","full_name":"Other student"}'),
 ('00000000-0000-0000-0000-000000007004','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values
 ('10000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007001','Game class','GAMETEST1'),
 ('10000000-0000-0000-0000-000000007002','00000000-0000-0000-0000-000000007004','Other class','GAMETEST2');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007002');

set local role authenticated;
-- Мугалим өз топтомун түзөт жана өз классына дайындайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007001';
insert into game_sets(id,author_id,title,questions) values('50000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007001','Set','[{"id":"q1","type":"choice","prompt":"P","options":["A","B"],"correct":1}]');
insert into game_assignments(id,set_id,class_id) values('60000000-0000-0000-0000-000000007001','50000000-0000-0000-0000-000000007001','10000000-0000-0000-0000-000000007001');
-- Башка мугалимдин классына дайындай албайт.
do $$begin
 insert into game_assignments(set_id,class_id) values('50000000-0000-0000-0000-000000007001','10000000-0000-0000-0000-000000007002');
 raise exception 'foreign class allowed';
exception when insufficient_privilege then null;end$$;
-- Башка автордун атынан топтом түзө албайт.
do $$begin
 insert into game_sets(author_id,title,questions) values('00000000-0000-0000-0000-000000007004','X','[{"id":"q"}]');
 raise exception 'foreign author allowed';
exception when insufficient_privilege then null;end$$;

-- Башка мугалим топтомду көрбөйт жана өз классына дайындай албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007004';
select pg_temp.expect((select count(*)::text from game_sets),'0');
select pg_temp.expect((select count(*)::text from game_assignments),'0');
do $$begin
 insert into game_assignments(set_id,class_id) values('50000000-0000-0000-0000-000000007001','10000000-0000-0000-0000-000000007002');
 raise exception 'foreign set allowed';
exception when insufficient_privilege then null;end$$;

-- Окуучу дайындаманы көрөт, бирок туура жооптуу топтомду көрбөйт жана жооп жаза албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007002';
select pg_temp.expect((select count(*)::text from game_assignments),'1');
select pg_temp.expect((select count(*)::text from game_sets),'0');
do $$begin
 insert into game_answers(assignment_id,student_id,round_id,question_id,is_correct,response) values('60000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007002',gen_random_uuid(),'q1',true,'{}');
 raise exception 'student answer insert allowed';
exception when insufficient_privilege then null;end$$;
do $$begin
 insert into game_progress(assignment_id,student_id,best_score) values('60000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007002',100);
 raise exception 'student progress insert allowed';
exception when insufficient_privilege then null;end$$;
do $$begin
 update game_assignments set due_at=now();
 if found then raise exception 'student assignment update allowed';end if;
end$$;

-- Классташ эмес окуучу дайындаманы көрбөйт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007003';
select pg_temp.expect((select count(*)::text from game_assignments),'0');

-- Сервер (service role) жазган жооптор: окуучу өзүнүкүн, мугалим өз классыныкын көрөт.
reset role;
insert into game_answers(assignment_id,student_id,round_id,question_id,is_correct,response) values('60000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007002','70000000-0000-0000-0000-000000007001','q1',false,'{"pick":0}');
insert into game_progress(assignment_id,student_id,rounds,last_score,best_score) values('60000000-0000-0000-0000-000000007001','00000000-0000-0000-0000-000000007002',1,50,50);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007002';
select pg_temp.expect((select count(*)::text from game_answers),'1');
select pg_temp.expect((select best_score::text from game_progress),'50');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007003';
select pg_temp.expect((select count(*)::text from game_answers),'0');
select pg_temp.expect((select count(*)::text from game_progress),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007004';
select pg_temp.expect((select count(*)::text from game_answers),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000007001';
select pg_temp.expect((select count(*)::text from game_answers),'1');
select pg_temp.expect((select count(*)::text from game_progress),'1');

-- Аноним эч нерсе көрбөйт.
reset role;
set local role anon;
do $$begin
 perform 1 from game_assignments;
 raise exception 'anon read allowed';
exception when insufficient_privilege then null;end$$;

-- Топтом өчсө дайындама, жооп жана прогресс кошо өчөт.
reset role;
delete from game_sets where id='50000000-0000-0000-0000-000000007001';
select pg_temp.expect((select count(*)::text from game_assignments),'0');
select pg_temp.expect((select count(*)::text from game_answers),'0');
select pg_temp.expect((select count(*)::text from game_progress),'0');
rollback;
