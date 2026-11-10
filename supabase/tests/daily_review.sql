-- Өзүнчө локалдык тест базасында 0001–0022ден кийин гана.
begin;
create function pg_temp.expect(actual text,expected text) returns void language plpgsql as $$begin if actual is distinct from expected then raise exception 'Expected %, got %',expected,actual;end if;end$$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000b001','{"role":"teacher","full_name":"Review teacher"}'),
 ('00000000-0000-0000-0000-00000000b002','{"role":"student","full_name":"Review student"}'),
 ('00000000-0000-0000-0000-00000000b003','{"role":"student","full_name":"Other student"}'),
 ('00000000-0000-0000-0000-00000000b004','{"role":"teacher","full_name":"Other teacher"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-00000000b001','00000000-0000-0000-0000-00000000b001','Review class','REVIEWTS1');
insert into class_members(class_id,student_id) values('10000000-0000-0000-0000-00000000b001','00000000-0000-0000-0000-00000000b002');
-- Сервер (service role) жазат.
insert into review_days(student_id,day,items,answers,score,completed_at) values
 ('00000000-0000-0000-0000-00000000b002','2026-11-10','[{"a":"x","b":"r1"}]','{"0":{"picked":1,"correct":true}}',1,now()),
 ('00000000-0000-0000-0000-00000000b003','2026-11-10','[{"a":"x","b":"r1"}]','{}',0,null);
do $$begin
 insert into review_days(student_id,day,items) values('00000000-0000-0000-0000-00000000b002','2026-11-11','[]');
 raise exception 'empty items allowed';
exception when check_violation then null;end$$;

set local role authenticated;
-- Окуучу өзүнүкүн гана көрөт жана жаза албайт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000b002';
select pg_temp.expect((select count(*)::text from review_days),'1');
do $$begin
 insert into review_days(student_id,day,items) values('00000000-0000-0000-0000-00000000b002','2026-11-12','[{"a":"x","b":"y"}]');
 raise exception 'student insert allowed';
exception when insufficient_privilege then null;end$$;
do $$begin
 update review_days set score=5;
 raise exception 'student update allowed';
exception when insufficient_privilege then null;end$$;
-- Мугалим өз окуучусунукун көрөт, башка мугалим көрбөйт.
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000b001';
select pg_temp.expect((select count(*)::text from review_days),'1');
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000b004';
select pg_temp.expect((select count(*)::text from review_days),'0');
rollback;
