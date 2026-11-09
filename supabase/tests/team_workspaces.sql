-- Локалдык тест базасы гана; 0001–0014 керек. Бардыгы rollback.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000009001','{"role":"teacher","full_name":"Team teacher"}'),
 ('00000000-0000-0000-0000-000000009002','{"role":"student","full_name":"First"}'),
 ('00000000-0000-0000-0000-000000009003','{"role":"student","full_name":"Second"}'),
 ('00000000-0000-0000-0000-000000009004','{"role":"student","full_name":"Third"}'),
 ('00000000-0000-0000-0000-000000009005','{"role":"student","full_name":"Outsider"}'),
 ('00000000-0000-0000-0000-000000009006','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009001','Team test','TEAMTEST');
insert into class_members(class_id,student_id) select '10000000-0000-0000-0000-000000009001',id from profiles where id in ('00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003','00000000-0000-0000-0000-000000009004');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009001','Team test','{}');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-000000009001','20000000-0000-0000-0000-000000009001','10000000-0000-0000-0000-000000009001');
insert into attempts(id,assignment_id,student_id,current_stage,xp) values
 ('40000000-0000-0000-0000-000000009002','30000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009002',0,0),
 ('40000000-0000-0000-0000-000000009003','30000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009003',0,0);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009006';
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Team','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003']::uuid[],array['Жазуучу','Текшерүүчү']),'forbidden');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Team','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009002']::uuid[],array['A','B']),'invalid');
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Team','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009005']::uuid[],array['A','B']),'invalid_members');
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Team','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003']::uuid[],array['A']),'invalid');
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Team','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003']::uuid[],array['Жазуучу','Текшерүүчү']),'ok');
select id as tid from team_spaces where assignment_id='30000000-0000-0000-0000-000000009001' \gset
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009001','Again','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009004']::uuid[],array['A','B']),'already_member');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009002';
select pg_temp.expect(my_team_spaces()::text,'[]');
select pg_temp.expect((select count(*)::text from team_spaces),'0');
select pg_temp.expect(change_team_space(:'tid',0,'save','Fake'),'unavailable');
reset role;
update attempts set current_stage=1 where assignment_id='30000000-0000-0000-0000-000000009001';
create temporary table team_coin_before as select coalesce(sum(balance),0) as total from coin_wallets where student_id in ('00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009002';
select pg_temp.expect(my_team_spaces()->0->>'writerId','00000000-0000-0000-0000-000000009002');
select pg_temp.expect(submit_team_note(:'tid','Own explanation','Own contribution'),'not_submitted');
select pg_temp.expect(change_team_space(:'tid',0,'save','First response'),'ok');
select pg_temp.expect(change_team_space(:'tid',0,'save','Stale overwrite'),'changed');
select pg_temp.expect(my_team_spaces()->0->>'response','First response');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(change_team_space(:'tid',1,'save','Not writer'),'not_writer');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect(change_team_space(:'tid',1,'rotate'),'ok');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(my_team_spaces()->0->>'writerId','00000000-0000-0000-0000-000000009003');
select pg_temp.expect(my_team_spaces()->0->'members'->1->>'role','Жазуучу');
select pg_temp.expect(change_team_space(:'tid',1,'save','Stale rotation'),'changed');
select pg_temp.expect(change_team_space(:'tid',2,'save','Shared final product'),'ok');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect(change_team_space(:'tid',3,'pause'),'ok');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(my_team_spaces()::text,'[]');
select pg_temp.expect(change_team_space(:'tid',4,'submit'),'unavailable');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect(change_team_space(:'tid',4,'resume'),'ok');
reset role;
insert into lesson_sessions(assignment_id,max_stage,paused) values('30000000-0000-0000-0000-000000009001',4,true);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(my_team_spaces()::text,'[]');
select pg_temp.expect(change_team_space(:'tid',5,'save','Paused'),'unavailable');
reset role;
update lesson_sessions set paused=false,max_stage=0 where assignment_id='30000000-0000-0000-0000-000000009001';
set local role authenticated;
select pg_temp.expect(my_team_spaces()::text,'[]');
reset role;
update lesson_sessions set max_stage=4 where assignment_id='30000000-0000-0000-0000-000000009001';
set local role authenticated;
select pg_temp.expect(change_team_space(:'tid',5,'submit'),'ok');
select pg_temp.expect(change_team_space(:'tid',6,'save','After final'),'locked');
select pg_temp.expect(my_team_spaces()->0->>'response','Shared final product');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009002';
select pg_temp.expect(submit_team_note(:'tid','PRIVATE EXPLANATION','My contribution'),'ok');
select pg_temp.expect(submit_team_note(:'tid','Overwrite','Again'),'locked');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(((my_team_spaces()->0->>'ownNote') is null)::text,'true');
select pg_temp.expect((my_team_spaces()::text like '%PRIVATE EXPLANATION%')::text,'false');
select pg_temp.expect((select count(*)::text from team_notes),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009005';
select pg_temp.expect(my_team_spaces()::text,'[]');
select pg_temp.expect(submit_team_note(:'tid','Outsider','Fake'),'unavailable');
reset role;
delete from class_members where student_id='00000000-0000-0000-0000-000000009003';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect(my_team_spaces()::text,'[]');
select pg_temp.expect(submit_team_note(:'tid','Removed','Fake'),'unavailable');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect((select count(*)::text from team_notes where team_id=:'tid'),'1');
select pg_temp.expect((select count(*)::text from team_versions where team_id=:'tid'),'7');
reset role;
select pg_temp.expect((select sum(xp)::text from attempts where assignment_id='30000000-0000-0000-0000-000000009001'),'0');
select pg_temp.expect((select count(*)::text from answers where attempt_id in ('40000000-0000-0000-0000-000000009002','40000000-0000-0000-0000-000000009003')),'0');
select pg_temp.expect(has_function_privilege('anon','public.change_team_space(uuid,integer,text,text)','execute')::text,'false');
select pg_temp.expect(has_table_privilege('authenticated','public.team_spaces','update')::text,'false');
select pg_temp.expect(coalesce((select sum(balance)::text from coin_wallets where student_id in ('00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003')),'0'),(select total::text from team_coin_before));
select pg_temp.expect(has_function_privilege('authenticated','private.team_writer(uuid)','execute')::text,'false');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009006';
select pg_temp.expect((select count(*)::text from team_spaces where id=:'tid'),'0');
select pg_temp.expect(change_team_space(:'tid',6,'pause'),'forbidden');
reset role;
-- Үч катышуучулуу топто да жазуучу жана ролдор бирге айланат.
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-000000009003');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-000000009002','20000000-0000-0000-0000-000000009001','10000000-0000-0000-0000-000000009001');
insert into attempts(assignment_id,student_id,current_stage,xp) select '30000000-0000-0000-0000-000000009002',student_id,1,0 from class_members where class_id='10000000-0000-0000-0000-000000009001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009001';
select pg_temp.expect(create_team_space('30000000-0000-0000-0000-000000009002','Three members','Prompt',1,array['00000000-0000-0000-0000-000000009002','00000000-0000-0000-0000-000000009003','00000000-0000-0000-0000-000000009004']::uuid[],array['Жазуучу','Текшерүүчү','Баяндамачы']),'ok');
select id as group_id from team_spaces where assignment_id='30000000-0000-0000-0000-000000009002' \gset
select pg_temp.expect(change_team_space(:'group_id',0,'rotate'),'ok');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000009003';
select pg_temp.expect((select value->>'writerId' from jsonb_array_elements(my_team_spaces()) where value->>'name'='Three members'),'00000000-0000-0000-0000-000000009003');
select pg_temp.expect((select value->'members'->1->>'role' from jsonb_array_elements(my_team_spaces()) where value->>'name'='Three members'),'Жазуучу');
rollback;
