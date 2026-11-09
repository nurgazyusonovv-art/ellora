-- Өзүнчө локалдык тест базасында гана. 0001–0013 схемасы; бардык жазуулар rollback болот.
begin;
create function pg_temp.expect(actual text, expected text) returns void language plpgsql as $$
begin if actual is distinct from expected then raise exception 'Expected %, got %', expected, actual; end if; end $$;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000008001','{"role":"teacher","full_name":"Save teacher"}'),
 ('00000000-0000-0000-0000-000000008002','{"role":"teacher","full_name":"Other teacher"}'),
 ('00000000-0000-0000-0000-000000008003','{"role":"student","full_name":"Save student"}');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008001';
insert into public.lessons(id,author_id,title,status,content) values
 ('20000000-0000-0000-0000-000000008001','00000000-0000-0000-0000-000000008001','Save test','draft',
 '{"version":1,"model":"5e","stages":[{"key":"discover","blocks":[]},{"key":"learning","blocks":[{"id":"l1","type":"investigation","prompt":"Божомолдо","procedure":"Сынап көр","simulation":"condition"}]},{"key":"practice","blocks":[]},{"key":"reinforce","blocks":[]},{"key":"exit","blocks":[]}]}');
select pg_temp.expect((select content#>>'{stages,1,blocks,0,simulation}' from public.lessons where id='20000000-0000-0000-0000-000000008001'),'condition');
update public.lessons set content=jsonb_set(content,'{stages,1,blocks,0,simulation}','"loop"'),updated_at=now()
 where id='20000000-0000-0000-0000-000000008001' and author_id=auth.uid() and status='draft';
select pg_temp.expect((select content#>>'{stages,1,blocks,0,simulation}' from public.lessons where id='20000000-0000-0000-0000-000000008001'),'loop');
-- Окуп текшергенден кийин жарыяланган сабакка эски draft update өтпөйт.
update public.lessons set status='published' where id='20000000-0000-0000-0000-000000008001';
with changed as (
 update public.lessons set content='{}',title='STALE UPDATE'
 where id='20000000-0000-0000-0000-000000008001' and author_id=auth.uid() and status='draft' returning id
) select pg_temp.expect(count(*)::text,'0') from changed;
select pg_temp.expect((select content#>>'{stages,1,blocks,0,simulation}' from public.lessons where id='20000000-0000-0000-0000-000000008001'),'loop');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008002';
select pg_temp.expect((select count(*)::text from public.lessons where id='20000000-0000-0000-0000-000000008001'),'0');
with changed as (update public.lessons set title='OTHER TEACHER' where id='20000000-0000-0000-0000-000000008001' returning id)
 select pg_temp.expect(count(*)::text,'0') from changed;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000008003';
select pg_temp.expect((select count(*)::text from public.lessons where id='20000000-0000-0000-0000-000000008001'),'0');
with changed as (update public.lessons set title='STUDENT' where id='20000000-0000-0000-0000-000000008001' returning id)
 select pg_temp.expect(count(*)::text,'0') from changed;
reset role;
select pg_temp.expect((select title from public.lessons where id='20000000-0000-0000-0000-000000008001'),'Save test');
select pg_temp.expect((select relrowsecurity::text from pg_class where oid='public.lessons'::regclass),'true');
rollback;
