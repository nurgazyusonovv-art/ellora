-- Мугалим бекиткен, жооптору өзүнчө корголгон аралык кайталоо.
begin;
create table public.spaced_review_plans (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null unique references public.assignments(id) on delete cascade,
 title text not null,
 rounds jsonb not null check(jsonb_typeof(rounds)='array' and jsonb_array_length(rounds)=3),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.spaced_review_runs (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.spaced_review_plans(id) on delete cascade,
 attempt_id uuid not null references public.attempts(id) on delete cascade,
 round_index int not null check(round_index between 0 and 2),
 picked jsonb not null,
 results jsonb not null,
 submitted_at timestamptz not null default now(),
 unique(plan_id,attempt_id,round_index)
);
create index spaced_review_runs_attempt on public.spaced_review_runs(attempt_id);
alter table public.spaced_review_plans enable row level security;
alter table public.spaced_review_runs enable row level security;
revoke all on public.spaced_review_plans,public.spaced_review_runs from anon,authenticated;
grant select on public.spaced_review_plans,public.spaced_review_runs to authenticated;
-- correct/explain бар план окуучуга түз жеткиликсиз.
create policy "teacher_repeat_plan" on public.spaced_review_plans for select to authenticated using(exists(select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)));
create policy "own_repeat_results" on public.spaced_review_runs for select to authenticated using(exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and (t.student_id=(select auth.uid()) or public.is_teacher_of_class(a.class_id))));

create function public.create_spaced_review(p_assignment uuid,p_rounds jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare r jsonb;q jsonb;o jsonb;d int;prev int:=0;seen text[]:=array[]::text[];key text;title_text text;cnt int;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') or not exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=p_assignment and c.teacher_id=auth.uid()) then return 'forbidden';end if;
 if jsonb_typeof(p_rounds) is distinct from 'array' then return 'invalid';end if;
 if jsonb_array_length(p_rounds)<>3 or octet_length(p_rounds::text)>40000 then return 'invalid';end if;
 for r in select value from jsonb_array_elements(p_rounds) loop
  if jsonb_typeof(r->'days') is distinct from 'number' or (r->>'days') !~ '^[0-9]{1,2}$' then return 'invalid';end if;
  d:=(r->>'days')::int;if d<=prev or d>90 then return 'invalid';end if;prev:=d;
  if jsonb_typeof(r->'questions') is distinct from 'array' then return 'invalid';end if;
  if jsonb_array_length(r->'questions')<>3 then return 'invalid';end if;
  for q in select value from jsonb_array_elements(r->'questions') loop
   if jsonb_typeof(q->'prompt') is distinct from 'string' or length(btrim(q->>'prompt')) not between 1 and 1000 or jsonb_typeof(q->'explain') is distinct from 'string' or length(btrim(q->>'explain')) not between 1 and 2000 or jsonb_typeof(q->'options') is distinct from 'array' then return 'invalid';end if;
   key:=lower(btrim(q->>'prompt'));if key=any(seen) then return 'invalid';end if;seen:=array_append(seen,key);
   cnt:=jsonb_array_length(q->'options');if cnt not between 2 and 4 then return 'invalid';end if;
   for o in select value from jsonb_array_elements(q->'options') loop
    if jsonb_typeof(o)<>'string' or length(btrim(o#>>'{}')) not between 1 and 500 then return 'invalid';end if;
   end loop;
   if (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(q->'options'))<>cnt then return 'invalid';end if;
   if jsonb_typeof(q->'correct') is distinct from 'number' or (q->>'correct') !~ '^[0-3]$' then return 'invalid';end if;
   if (q->>'correct')::int>=cnt then return 'invalid';end if;
  end loop;
 end loop;
 select l.title into title_text from public.assignments a join public.lessons l on l.id=a.lesson_id where a.id=p_assignment;
 insert into public.spaced_review_plans(assignment_id,title,rounds) values(p_assignment,title_text,p_rounds) on conflict(assignment_id) do nothing;
 if not found then return 'exists';end if;
 return 'ok';
end;$$;
revoke all on function public.create_spaced_review(uuid,jsonb) from public,anon;
grant execute on function public.create_spaced_review(uuid,jsonb) to authenticated;

create function public.set_spaced_review_active(p_plan uuid,p_active boolean) returns text
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or p_active is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden';end if;
 update public.spaced_review_plans p set active=p_active from public.assignments a join public.classes c on c.id=a.class_id where p.id=p_plan and a.id=p.assignment_id and c.teacher_id=auth.uid();
 return case when found then 'ok' else 'forbidden' end;
end;$$;
revoke all on function public.set_spaced_review_active(uuid,boolean) from public,anon;
grant execute on function public.set_spaced_review_active(uuid,boolean) to authenticated;

create function private.spaced_review_due(p_attempt uuid,p_plan uuid,p_round int) returns timestamptz
language plpgsql set search_path='' as $$
declare finish timestamptz;prev_time timestamptz;rs jsonb;d int;prev_d int;
begin
 if p_round not between 0 and 2 then return null;end if;
 select finished_at into finish from public.attempts where id=p_attempt;
 select rounds into rs from public.spaced_review_plans where id=p_plan;
 if finish is null or rs is null then return null;end if;
 d:=(rs->p_round->>'days')::int;
 if p_round=0 then return finish+make_interval(days=>d);end if;
 select submitted_at into prev_time from public.spaced_review_runs where attempt_id=p_attempt and plan_id=p_plan and round_index=p_round-1;
 if prev_time is null then return null;end if;
 prev_d:=(rs->(p_round-1)->>'days')::int;
 return greatest(finish+make_interval(days=>d),prev_time+make_interval(days=>d-prev_d));
end;$$;
revoke all on function private.spaced_review_due(uuid,uuid,int) from public,anon,authenticated;

create function public.spaced_review_tasks() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]';r record;i int;due timestamptz;run public.spaced_review_runs%rowtype;qs jsonb;state text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return result;end if;
 for r in select p.*,t.id as tid from public.spaced_review_plans p join public.attempts t on t.assignment_id=p.assignment_id join public.assignments a on a.id=p.assignment_id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where p.active and t.student_id=auth.uid() and t.finished_at is not null order by p.created_at desc limit 50 loop
  for i in 0..2 loop
   due:=private.spaced_review_due(r.tid,r.id,i);
   select * into run from public.spaced_review_runs where attempt_id=r.tid and plan_id=r.id and round_index=i;
   state:=case when found then 'done' when due is null then 'waiting' when due>now() then 'scheduled' else 'due' end;
   -- Даяр жоопторго чейин күтүү; келечектеги суроолор да алдын ала ачылбайт.
   qs:='[]';
   if state in ('done','due') then
    select jsonb_agg(case when state='done' then jsonb_build_object('prompt',q->>'prompt','options',q->'options','correct',q->'correct','explain',q->>'explain') else jsonb_build_object('prompt',q->>'prompt','options',q->'options') end order by n) into qs from jsonb_array_elements(r.rounds->i->'questions') with ordinality x(q,n);
   end if;
   result:=result||jsonb_build_array(jsonb_build_object('planId',r.id,'attemptId',r.tid,'assignmentId',r.assignment_id,'title',r.title,'round',i,'days',(r.rounds->i->>'days')::int,'dueAt',due,'status',state,'questions',qs,'picked',run.picked,'results',run.results));
  end loop;
 end loop;
 return result;
end;$$;
revoke all on function public.spaced_review_tasks() from public,anon;
grant execute on function public.spaced_review_tasks() to authenticated;

create function public.submit_spaced_review(p_plan uuid,p_attempt uuid,p_round int,p_picked jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare p public.spaced_review_plans%rowtype;due timestamptz;qs jsonb;results jsonb:='[]';idx int;choice jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return 'forbidden';end if;
 -- attempt кулпусу параллелдүү тапшырууну жана иретти сериалдаштырат; прогресске жазбайт.
 perform 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where t.id=p_attempt and t.student_id=auth.uid() for update of t;
 if not found then return 'forbidden';end if;
 select v.* into p from public.spaced_review_plans v join public.attempts t on t.assignment_id=v.assignment_id where v.id=p_plan and t.id=p_attempt for share of v;
 if not found then return 'forbidden';end if;
 if not p.active then return 'inactive';end if;
 if p_round is null or p_round not between 0 and 2 then return 'invalid';end if;
 if exists(select 1 from public.spaced_review_runs where plan_id=p_plan and attempt_id=p_attempt and round_index=p_round) then return 'already_submitted';end if;
 due:=private.spaced_review_due(p_attempt,p_plan,p_round);
 if due is null or due>now() then return 'not_due';end if;
 if jsonb_typeof(p_picked) is distinct from 'array' then return 'invalid';end if;
 if jsonb_array_length(p_picked)<>3 then return 'invalid';end if;
 qs:=p.rounds->p_round->'questions';
 for idx in 0..2 loop
  choice:=p_picked->idx;
  if jsonb_typeof(choice) is distinct from 'number' or (choice#>>'{}') !~ '^[0-3]$' then return 'invalid';end if;
  if (choice#>>'{}')::int>=jsonb_array_length(qs->idx->'options') then return 'invalid';end if;
  results:=results||jsonb_build_array((choice#>>'{}')::int=(qs->idx->>'correct')::int);
 end loop;
 insert into public.spaced_review_runs(plan_id,attempt_id,round_index,picked,results) values(p_plan,p_attempt,p_round,p_picked,results);
 return 'ok';
end;$$;
revoke all on function public.submit_spaced_review(uuid,uuid,int,jsonb) from public,anon;
grant execute on function public.submit_spaced_review(uuid,uuid,int,jsonb) to authenticated;
commit;
