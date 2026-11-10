-- Өзүнчө локалдык тест базасында 0001–0024төн кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000d001','{"role":"teacher","full_name":"Quiz teacher"}'),
 ('00000000-0000-0000-0000-00000000d002','{"role":"student","full_name":"Quiz student"}'),
 ('00000000-0000-0000-0000-00000000d003','{"role":"student","full_name":"Outsider"}'),
 ('00000000-0000-0000-0000-00000000d004','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values
 ('10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','Quiz class','QUIZTEST1'),
 ('10000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-00000000d004','Other class','QUIZTEST2');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002');
insert into game_sets(id,author_id,title,questions) values
 ('50000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','Quiz','[{"id":"q1","type":"choice","prompt":"P","options":["A","B"],"correct":1}]'),
 ('50000000-0000-0000-0000-00000000d004','00000000-0000-0000-0000-00000000d004','Other','[{"id":"q1","type":"choice","prompt":"P","options":["A","B"],"correct":1}]');

set local role authenticated;
-- Мугалим өз классында өз топтому менен баштайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d001';
insert into game_lives(id,set_id,class_id,teacher_id,pin) values('60000000-0000-0000-0000-00000000d001','50000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','123456');
update game_lives set status='question', q_index=0, q_started_at=now();
do $$begin
 insert into game_lives(set_id,class_id,teacher_id,pin) values('50000000-0000-0000-0000-00000000d004','10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','234567');
 raise exception 'foreign set allowed';
exception when insufficient_privilege then null;end$$;
do $$begin
 insert into game_lives(set_id,class_id,teacher_id,pin) values('50000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-00000000d001','345678');
 raise exception 'foreign class allowed';
exception when insufficient_privilege then null;end$$;

-- Окуучу оюндун абалын көрөт, бирок өзгөртө жана өзү жаза албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d002';
select pg_temp.expect((select status from game_lives),'question');
update game_lives set status='ended';
do $$begin
 insert into game_live_players(live_id,student_id,score) values('60000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',9999);
 raise exception 'student player insert allowed';
exception when insufficient_privilege then null;end$$;
do $$begin
 insert into game_live_answers(live_id,student_id,q_index,picked,correct,points) values('60000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',0,1,true,1000);
 raise exception 'student answer insert allowed';
exception when insufficient_privilege then null;end$$;
reset role;
select pg_temp.expect((select status from game_lives),'question');

-- Класстан тышкаркы окуучу жана башка мугалим көрбөйт.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d003';
select pg_temp.expect((select count(*)::text from game_lives),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d004';
select pg_temp.expect((select count(*)::text from game_lives),'0');

-- Сервер жазган оюнчу/жооп: окуучу өзүнүкүн, мугалим өз оюнунукун көрөт.
reset role;
insert into game_live_players(live_id,student_id,score) values('60000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',800);
insert into game_live_answers(live_id,student_id,q_index,picked,correct,points) values('60000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',0,1,true,800);
do $$begin
 insert into game_live_answers(live_id,student_id,q_index,picked,correct,points) values('60000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d002',0,0,false,0);
 raise exception 'double answer allowed';
exception when unique_violation then null;end$$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d002';
select pg_temp.expect((select score::text from game_live_players),'800');
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d001';
select pg_temp.expect((select count(*)::text from game_live_answers),'1');
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000d004';
select pg_temp.expect((select count(*)::text from game_live_players),'0');

-- Бүтө элек оюндарда PIN кайталанбайт; бүткөндөн кийин кайра колдонулат.
reset role;
do $$begin
 insert into game_lives(set_id,class_id,teacher_id,pin) values('50000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','123456');
 raise exception 'duplicate open pin allowed';
exception when unique_violation then null;end$$;
update game_lives set status='ended' where id='60000000-0000-0000-0000-00000000d001';
insert into game_lives(set_id,class_id,teacher_id,pin) values('50000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','123456');
do $$begin
 insert into game_lives(set_id,class_id,teacher_id,pin) values('50000000-0000-0000-0000-00000000d001','10000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000d001','12ab56');
 raise exception 'bad pin allowed';
exception when check_violation then null;end$$;
rollback;
