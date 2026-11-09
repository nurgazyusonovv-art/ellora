begin;
alter table public.lesson_sessions add column timed boolean not null default false,
 add column auto_advance boolean not null default true,
 add column deadline timestamptz,
 add column remaining_seconds integer not null default 0 check(remaining_seconds between 0 and 86400),
 add column durations integer[] not null default array[300,600,480,720,300],
 add column ended boolean not null default false,
 add column clock_version integer not null default 0;
alter table public.lesson_sessions enable row level security;

-- Талап боюнча синхрондолот: фондук иш/окуучунун түзмөк сааты керек эмес.
create function private.tick_lesson_clock(aid uuid) returns public.lesson_sessions
language plpgsql security definer set search_path='' as $$
declare s public.lesson_sessions%rowtype;n timestamptz:=clock_timestamp();changed boolean:=false;
begin
 select * into s from public.lesson_sessions where assignment_id=aid for update;
 if not found then return null;end if;
 while s.timed and s.auto_advance and not s.paused and not s.ended and s.deadline<=n loop
  changed:=true;s.clock_version:=s.clock_version+1;
  if s.max_stage=4 then s.ended:=true;s.deadline:=null;s.remaining_seconds:=0;
  else s.max_stage:=s.max_stage+1;s.deadline:=s.deadline+make_interval(secs=>s.durations[s.max_stage+1]);end if;
 end loop;
 if changed then update public.lesson_sessions set max_stage=s.max_stage,deadline=s.deadline,ended=s.ended,remaining_seconds=s.remaining_seconds,clock_version=s.clock_version,updated_at=n where assignment_id=aid;end if;
 return s;
end;$$;
revoke all on function private.tick_lesson_clock(uuid) from public,anon,authenticated;

create function public.lesson_clock_state(p_assignment uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.lesson_sessions%rowtype;
begin
 if auth.uid() is null or not public.can_see_assignment(p_assignment) then return jsonb_build_object('error','forbidden');end if;
 s:=private.tick_lesson_clock(p_assignment);
 if s.assignment_id is null then return null;end if;
 return to_jsonb(s)||jsonb_build_object('server_now',clock_timestamp());
end;$$;
revoke all on function public.lesson_clock_state(uuid) from public,anon;
grant execute on function public.lesson_clock_state(uuid) to authenticated;

create function public.control_lesson_clock(p_assignment uuid,p_command text,p_version integer,p_seconds integer default 120,p_auto boolean default true) returns text
language plpgsql security definer set search_path='' as $$
declare s public.lesson_sessions%rowtype;dur integer[];content jsonb;n timestamptz:=clock_timestamp();
begin
 if auth.uid() is null or not exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id join public.profiles p on p.id=auth.uid() where a.id=p_assignment and c.teacher_id=auth.uid() and p.role='teacher') then return 'forbidden';end if;
 -- Бир дайындамадагы биринчи эки start да иреттелет.
 perform 1 from public.assignments where id=p_assignment for update;
 s:=private.tick_lesson_clock(p_assignment);
 if coalesce(s.clock_version,-1)<>p_version then return 'version';end if;
 if p_command='start' then
  if s.timed then return 'already';end if;
  select l.content into content from public.assignments a join public.lessons l on l.id=a.lesson_id where a.id=p_assignment;
  if jsonb_array_length(content->'stages')<>5 then return 'invalid';end if;
  select array_agg((v->>'minutes')::integer*60 order by ord) into dur from jsonb_array_elements(content->'stages') with ordinality x(v,ord);
  if array_length(dur,1)<>5 or exists(select 1 from unnest(dur) d where d is null or d<60 or d>10800) then return 'invalid';end if;
  insert into public.lesson_sessions(assignment_id,max_stage,paused,timed,auto_advance,deadline,remaining_seconds,durations,ended,clock_version,updated_at)
  values(p_assignment,0,false,true,p_auto,n+make_interval(secs=>dur[1]),dur[1],dur,false,coalesce(s.clock_version,0)+1,n)
  on conflict(assignment_id) do update set max_stage=0,paused=false,timed=true,auto_advance=p_auto,deadline=excluded.deadline,remaining_seconds=excluded.remaining_seconds,durations=dur,ended=false,clock_version=public.lesson_sessions.clock_version+1,updated_at=n;
  return 'ok';
 end if;
 if s.assignment_id is null or not s.timed then return 'missing';end if;
 if p_command='stop' then delete from public.lesson_sessions where assignment_id=p_assignment;return 'ok';end if;
 if p_command='pause' and not s.ended and not s.paused then s.remaining_seconds:=greatest(0,ceil(extract(epoch from s.deadline-n))::integer);s.paused:=true;s.deadline:=null;
 elsif p_command='resume' and s.paused and not s.ended then s.paused:=false;s.deadline:=n+make_interval(secs=>s.remaining_seconds);
 elsif p_command='add' and not s.ended and p_seconds between 60 and 1800 then
  if s.paused then s.remaining_seconds:=least(86400,s.remaining_seconds+p_seconds);else s.deadline:=least(n+interval '24 hours',greatest(s.deadline,n)+make_interval(secs=>p_seconds));end if;
 elsif p_command in ('next','back') then
  if p_command='next' and s.max_stage=4 then s.ended:=true;s.deadline:=null;
  else s.max_stage:=greatest(0,least(4,s.max_stage+case when p_command='next' then 1 else -1 end));s.ended:=false;s.remaining_seconds:=s.durations[s.max_stage+1];s.deadline:=case when s.paused then null else n+make_interval(secs=>s.remaining_seconds) end;end if;
 elsif p_command='auto' then s.auto_advance:=p_auto;if p_auto and s.deadline<n then s.deadline:=n;end if;
 else return 'invalid';end if;
 update public.lesson_sessions set max_stage=s.max_stage,paused=s.paused,auto_advance=s.auto_advance,deadline=s.deadline,remaining_seconds=s.remaining_seconds,ended=s.ended,clock_version=clock_version+1,updated_at=n where assignment_id=p_assignment;
 return 'ok';
exception when invalid_text_representation or numeric_value_out_of_range then return 'invalid';
end;$$;
revoke all on function public.control_lesson_clock(uuid,text,integer,integer,boolean) from public,anon;
grant execute on function public.control_lesson_clock(uuid,text,integer,integer,boolean) to authenticated;

create function private.clock_allows(aid uuid,stage_n integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare s public.lesson_sessions%rowtype;
begin
 s:=private.tick_lesson_clock(aid);
 return s.assignment_id is null or (not s.paused and case when s.timed then not s.ended and s.max_stage=stage_n else s.max_stage>=stage_n end);
end;$$;
revoke all on function private.clock_allows(uuid,integer) from public,anon,authenticated;
-- Сервер текшерүүсүнөн кийин мугалим бөлүктү алмаштырса да эски жооп жазылбайт.
create function private.guard_clock_answer() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid;s public.lesson_sessions%rowtype;
begin
 select assignment_id into aid from public.attempts where id=new.attempt_id;
 s:=private.tick_lesson_clock(aid);
 if s.timed and not private.clock_allows(aid,new.stage) then raise exception 'clock_closed';end if;
 return new;
end;$$;
revoke all on function private.guard_clock_answer() from public,anon,authenticated;
create trigger clock_answer_guard before insert or update on public.answers for each row execute function private.guard_clock_answer();

-- Ишенимдүү сервер гана бааланган жоопту атомдук сактайт. Кардар баа/XP бере албайт.
create function public.save_clock_answer(p_attempt uuid,p_student uuid,p_block text,p_stage integer,p_response jsonb,p_correct boolean,p_tries integer,p_xp integer,p_next integer,p_snapshot jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare t public.attempts%rowtype;snapshot jsonb;
begin
 select * into t from public.attempts where id=p_attempt and student_id=p_student for update;
 if not found or t.finished_at is not null or not exists(select 1 from public.assignments a join public.class_members m on m.class_id=a.class_id where a.id=t.assignment_id and m.student_id=p_student) then return 'forbidden';end if;
 perform 1 from public.lesson_sessions where assignment_id=t.assignment_id and timed for update;
 if not found or not private.clock_allows(t.assignment_id,p_stage) then return 'closed';end if;
 select coalesce(jsonb_object_agg(block_id,jsonb_build_object('response',response,'is_correct',is_correct,'tries',tries)),'{}') into snapshot from public.answers where attempt_id=p_attempt;
 if snapshot<>p_snapshot then return 'version';end if;
 if p_next<t.current_stage or p_next>greatest(t.current_stage,p_stage+1) or p_next>4 then return 'invalid';end if;
 insert into public.answers(attempt_id,block_id,stage,response,is_correct,tries,updated_at) values(p_attempt,p_block,p_stage,p_response,p_correct,p_tries,clock_timestamp()) on conflict(attempt_id,block_id) do update set response=p_response,is_correct=p_correct,tries=p_tries,updated_at=excluded.updated_at;
 update public.attempts set xp=p_xp,current_stage=p_next where id=p_attempt;
 return 'ok';
end;$$;
revoke all on function public.save_clock_answer(uuid,uuid,text,integer,jsonb,boolean,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_clock_answer(uuid,uuid,text,integer,jsonb,boolean,integer,integer,integer,jsonb) to service_role;

create function public.finish_clock_attempt(p_attempt uuid,p_student uuid,p_snapshot jsonb,p_xp integer,p_score integer,p_total integer,p_confidence integer) returns text
language plpgsql security definer set search_path='' as $$
declare t public.attempts%rowtype;snapshot jsonb;
begin
 select * into t from public.attempts where id=p_attempt and student_id=p_student for update;
 if not found or t.finished_at is not null or not exists(select 1 from public.assignments a join public.class_members m on m.class_id=a.class_id where a.id=t.assignment_id and m.student_id=p_student) then return 'forbidden';end if;
 perform 1 from public.lesson_sessions where assignment_id=t.assignment_id and timed for update;
 if not found or not private.clock_allows(t.assignment_id,4) then return 'closed';end if;
 select coalesce(jsonb_object_agg(block_id,jsonb_build_object('response',response,'is_correct',is_correct,'tries',tries)),'{}') into snapshot from public.answers where attempt_id=p_attempt;
 if snapshot<>p_snapshot then return 'version';end if;
 update public.attempts set current_stage=5,xp=p_xp,exit_score=p_score,exit_total=p_total,confidence=p_confidence,finished_at=clock_timestamp() where id=p_attempt;
 return 'ok';
end;$$;
revoke all on function public.finish_clock_attempt(uuid,uuid,jsonb,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_clock_attempt(uuid,uuid,jsonb,integer,integer,integer,integer) to service_role;

create function private.guard_clock_aux() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid;stage_n integer;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return new;end if;
 if tg_table_name='pathway_work' then select assignment_id,3 into aid,stage_n from public.pathway_plans where id=new.plan_id;
 elsif tg_table_name='answer_revisions' then select assignment_id,new.stage_index into aid,stage_n from public.attempts where id=new.attempt_id;
 elsif tg_table_name='team_spaces' then aid:=new.assignment_id;stage_n:=new.stage;
 elsif tg_table_name='team_notes' then select assignment_id,stage into aid,stage_n from public.team_spaces where id=new.team_id;
 end if;
 if exists(select 1 from public.lesson_sessions where assignment_id=aid and timed) and not private.clock_allows(aid,stage_n) then raise exception 'clock_closed';end if;
 return new;
end;$$;
revoke all on function private.guard_clock_aux() from public,anon,authenticated;
create trigger clock_pathway_guard before insert or update on public.pathway_work for each row execute function private.guard_clock_aux();
create trigger clock_revision_guard before insert or update on public.answer_revisions for each row execute function private.guard_clock_aux();
create trigger clock_team_guard before update on public.team_spaces for each row execute function private.guard_clock_aux();
create trigger clock_note_guard before insert or update on public.team_notes for each row execute function private.guard_clock_aux();

commit;
