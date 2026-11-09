-- Локалдык тест базасында 0001–0011 миграцияларынан кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000004001','{"role":"teacher","full_name":"Revision teacher"}'),
 ('00000000-0000-0000-0000-000000004002','{"role":"student","full_name":"Revision student"}'),
 ('00000000-0000-0000-0000-000000004003','{"role":"student","full_name":"Other student"}'),
 ('00000000-0000-0000-0000-000000004004','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000004001','00000000-0000-0000-0000-000000004001','Revision test','REVTEST');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-000000004001','00000000-0000-0000-0000-000000004002');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000004001','00000000-0000-0000-0000-000000004001','Revision test','{"version":1,"stages":[{"key":"discover","blocks":[{"id":"d1","type":"open","prompt":"Initial","rubric":["A"],"lockOnSubmit":true}]},{"key":"learning","blocks":[]},{"key":"practice","blocks":[{"id":"p1","type":"open","prompt":"Explain","rubric":["A","B"]}]},{"key":"reinforce","blocks":[]},{"key":"exit","blocks":[{"id":"e1","type":"open","prompt":"Exit","rubric":["A"]}]}]}');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-000000004001','20000000-0000-0000-0000-000000004001','10000000-0000-0000-0000-000000004001');
insert into attempts(id,assignment_id,student_id,current_stage,xp,finished_at,exit_score,exit_total) values('40000000-0000-0000-0000-000000004001','30000000-0000-0000-0000-000000004001','00000000-0000-0000-0000-000000004002',5,10,now(),0,1);
insert into answers(attempt_id,block_id,stage,response) values
 ('40000000-0000-0000-0000-000000004001','p1',2,'{"text":"Original"}'),
 ('40000000-0000-0000-0000-000000004001','d1',0,'{"text":"Initial"}'),
 ('40000000-0000-0000-0000-000000004001','e1',4,'{"text":"Exit"}');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004001';
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Improve'),'review_first');
reset role;
insert into answer_reviews(attempt_id,block_id,teacher_id,criteria_met,feedback) select attempt_id,block_id,'00000000-0000-0000-0000-000000004001',array[true,false],'Improve' from answers where attempt_id='40000000-0000-0000-0000-000000004001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004001';
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','d1','Improve'),'unavailable');
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','e1','Improve'),'unavailable');
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Improve'),'ok');
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Duplicate'),'pending');
select id as revision_id from answer_revisions where attempt_id='40000000-0000-0000-0000-000000004001' \gset
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004004';
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Fake'),'forbidden');
select pg_temp.expect(review_answer_revision(:'revision_id','[true,true]','Fake'),'forbidden');
select pg_temp.expect((select count(*)::text from answer_revisions),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004003';
select pg_temp.expect(submit_answer_revision(:'revision_id','Fake'),'forbidden');
select pg_temp.expect((select count(*)::text from answer_revisions),'0');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004002';
select pg_temp.expect((select count(*)::text from answer_revisions),'1');
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Fake'),'forbidden');
select pg_temp.expect(submit_answer_revision(:'revision_id','Original'),'unchanged');
select pg_temp.expect(submit_answer_revision(:'revision_id','  '),'invalid');
do $$begin begin update answer_revisions set previous_response='Forged';raise exception 'Writable table';exception when insufficient_privilege then null;end;end$$;
reset role;
insert into lesson_sessions(assignment_id,max_stage,paused) values('30000000-0000-0000-0000-000000004001',4,true);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004002';
select pg_temp.expect(submit_answer_revision(:'revision_id','Improved'),'paused');
reset role;
update lesson_sessions set paused=false where assignment_id='30000000-0000-0000-0000-000000004001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004002';
select pg_temp.expect(submit_answer_revision(:'revision_id','Improved'),'ok');
select pg_temp.expect(submit_answer_revision(:'revision_id','Rewrite'),'already_submitted');
select pg_temp.expect(review_answer_revision(:'revision_id','[true,true]','Self-grade'),'forbidden');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000004001';
select pg_temp.expect(review_answer_revision(:'revision_id','[true]','Short'),'invalid');
select pg_temp.expect(review_answer_revision(:'revision_id','[true,"true"]','Wrong type'),'invalid');
select pg_temp.expect(review_answer_revision(:'revision_id','[true,false]','Better, explain more'),'ok');
select pg_temp.expect(review_answer_revision(:'revision_id','[true,true]','Overwrite'),'unavailable');
select pg_temp.expect(request_answer_revision('40000000-0000-0000-0000-000000004001','p1','Explain more'),'ok');
select pg_temp.expect((select previous_response from answer_revisions where revision_no=2 and attempt_id='40000000-0000-0000-0000-000000004001'),'Improved');
reset role;
select pg_temp.expect((select response->>'text' from answers where attempt_id='40000000-0000-0000-0000-000000004001' and block_id='p1'),'Original');
select pg_temp.expect((select xp::text||':'||exit_score::text from attempts where id='40000000-0000-0000-0000-000000004001'),'10:0');
select pg_temp.expect((select count(*)::text from coin_ledger where student_id='00000000-0000-0000-0000-000000004002'),'0');
set local role anon;
do $$begin begin perform * from public.answer_revisions;raise exception 'Anon readable';exception when insufficient_privilege then null;end;begin perform public.submit_answer_revision(gen_random_uuid(),'Fake');raise exception 'Anon RPC';exception when insufficient_privilege then null;end;end$$;
reset role;
select 'Revision snapshots, RLS, workflow, immutable answers and rewards passed' as result;
rollback;
