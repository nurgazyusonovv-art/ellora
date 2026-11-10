-- Өзүнчө локалдык тест базасында 0001–0020дан кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000009001','{"role":"teacher","full_name":"Board teacher"}'),
 ('00000000-0000-0000-0000-000000009002','{"role":"student","full_name":"Board student"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009001','Board class','BOARDTST1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009002');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009001','Board','{}');
insert into assignments(id,lesson_id,class_id,delivery) values('30000000-0000-0000-0000-000000009001','20000000-0000-0000-0000-000000009001','10000000-0000-0000-0000-000000009001','class');
insert into lesson_sessions(assignment_id,max_stage,paused) values('30000000-0000-0000-0000-000000009001',1,false);

select pg_temp.expect((select spotlight_reveal::text||'/'||cardinality(spotlight_hidden) from lesson_sessions),'false/0');
do $$begin
 update lesson_sessions set spotlight_block='' ;
 raise exception 'empty spotlight allowed';
exception when check_violation then null;end$$;

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
update lesson_sessions set spotlight_block='p1', spotlight_reveal=true, spotlight_hidden=array['40000000-0000-0000-0000-000000009001'::uuid];
select pg_temp.expect((select spotlight_block from lesson_sessions),'p1');

-- Окуучу тактанын абалын көрөт, бирок өзгөртө албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009002';
select pg_temp.expect((select spotlight_block from lesson_sessions),'p1');
update lesson_sessions set spotlight_block=null, spotlight_hidden='{}';
reset role;
select pg_temp.expect((select spotlight_block||'/'||cardinality(spotlight_hidden) from lesson_sessions),'p1/1');
rollback;
