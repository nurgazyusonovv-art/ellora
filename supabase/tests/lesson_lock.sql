-- Өзүнчө локалдык тест базасында 0001–0025тен кийин гана.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000e001','{"role":"teacher","full_name":"Lock teacher"}'),
 ('00000000-0000-0000-0000-00000000e002','{"role":"student","full_name":"Lock student"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e001','Lock class','LOCKTEST1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e002');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e001','L','{"v":1}');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-00000000e001','20000000-0000-0000-0000-00000000e001','10000000-0000-0000-0000-00000000e001');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000e001';
-- Жооп жок: мазмун өзгөрөт.
update lessons set content='{"v":2}' where id='20000000-0000-0000-0000-00000000e001';
reset role;

insert into attempts(id,assignment_id,student_id) values('40000000-0000-0000-0000-00000000e001','30000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000e002');
insert into answers(attempt_id,block_id,stage,response,is_correct) values('40000000-0000-0000-0000-00000000e001','b1',0,'{}',true);

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000e001';
-- Жооп бар: мазмун бекитилген, аталыш өзгөрө берет.
do $$begin
 update lessons set content='{"v":3}' where id='20000000-0000-0000-0000-00000000e001';
 raise exception 'locked content changed';
exception when others then if sqlerrm<>'lesson_locked' then raise; end if;end$$;
update lessons set title='L2', content='{"v":2}' where id='20000000-0000-0000-0000-00000000e001';
do $$begin if (select title from lessons where id='20000000-0000-0000-0000-00000000e001')<>'L2' then raise exception 'title not updated'; end if;end$$;
rollback;
