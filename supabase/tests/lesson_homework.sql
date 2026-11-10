-- Өзүнчө локалдык тест базасында 0001–0021ден кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000a001','{"role":"teacher","full_name":"Home teacher"}'),
 ('00000000-0000-0000-0000-00000000a002','{"role":"student","full_name":"Home student"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a001','Home class','HOMETEST1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a002');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000a001','Home','{}');
insert into assignments(id,lesson_id,class_id,delivery) values('30000000-0000-0000-0000-00000000a001','20000000-0000-0000-0000-00000000a001','10000000-0000-0000-0000-00000000a001','class');
insert into lesson_sessions(assignment_id,max_stage,paused,started_at) values('30000000-0000-0000-0000-00000000a001',2,false,now()-interval '40 minutes');
select pg_temp.expect((select homework::text from lesson_sessions),'false');

-- Мугалим сабакты бүтүрүп, үйдө бүтүрүүгө ачат; башталган убакыт сакталат.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000a001';
update lesson_sessions set ended=true, homework=true, ended_at=now();
select pg_temp.expect((select (homework and ended and started_at is not null)::text from lesson_sessions),'true');

-- Окуучу белгини өзгөртө албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000a002';
select pg_temp.expect((select homework::text from lesson_sessions),'true');
update lesson_sessions set homework=false;
reset role;
select pg_temp.expect((select homework::text from lesson_sessions),'true');
rollback;
