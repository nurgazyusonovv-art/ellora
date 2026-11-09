-- Бир максат, үч вариант, бирдей өз алдынча текшерүү. Негизги баа/монета өзгөрбөйт.
begin;
create table public.pathway_plans (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null unique references public.assignments(id) on delete cascade,
 title text not null,
 goal text not null,
 variants jsonb not null,
 check_prompt text not null,
 rubric jsonb not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.pathway_work (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.pathway_plans(id) on delete cascade,
 attempt_id uuid not null references public.attempts(id) on delete cascade,
 pathway text not null default 'core' check(pathway in ('support','core','challenge')),
 support_requested boolean not null default false,
 response text check(length(btrim(response)) between 1 and 5000),
 check_response text check(length(btrim(check_response)) between 1 and 5000),
 submitted_at timestamptz,
 criteria_met jsonb,
 feedback text check(length(btrim(feedback)) between 1 and 2000),
 reviewed_at timestamptz,
 unique(plan_id,attempt_id),
 check((submitted_at is null and response is null and check_response is null and reviewed_at is null and criteria_met is null and feedback is null)
 or (submitted_at is not null and response is not null and check_response is not null and ((reviewed_at is null and criteria_met is null and feedback is null) or (reviewed_at is not null and criteria_met is not null and feedback is not null))))
);
create index pathway_work_attempt on public.pathway_work(attempt_id);
alter table public.pathway_plans enable row level security;
alter table public.pathway_work enable row level security;
revoke all on public.pathway_plans,public.pathway_work from anon,authenticated;
grant select on public.pathway_plans,public.pathway_work to authenticated;
create policy "teacher_pathway_plan" on public.pathway_plans for select to authenticated using(exists(select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)));
create policy "own_pathway_work" on public.pathway_work for select to authenticated using(exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and (t.student_id=(select auth.uid()) or public.is_teacher_of_class(a.class_id))));

create function public.create_pathway_plan(p_assignment uuid,p_plan jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare key text;v jsonb;seen text[]:=array[]::text[];title_text text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') or not exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id where a.id=p_assignment and c.teacher_id=auth.uid()) then return 'forbidden';end if;
 if jsonb_typeof(p_plan) is distinct from 'object' or octet_length(p_plan::text)>50000 then return 'invalid';end if;
 if jsonb_typeof(p_plan->'goal') is distinct from 'string' or length(btrim(p_plan->>'goal')) not between 1 and 2000 or jsonb_typeof(p_plan->'check_prompt') is distinct from 'string' or length(btrim(p_plan->>'check_prompt')) not between 1 and 2000 or jsonb_typeof(p_plan->'variants') is distinct from 'object' or jsonb_typeof(p_plan->'rubric') is distinct from 'array' then return 'invalid';end if;
 if (select count(*) from jsonb_object_keys(p_plan->'variants'))<>3 then return 'invalid';end if;
 foreach key in array array['support','core','challenge'] loop
  if jsonb_typeof(p_plan->'variants'->key) is distinct from 'string' or length(btrim(p_plan->'variants'->>key)) not between 1 and 5000 then return 'invalid';end if;
  if lower(btrim(p_plan->'variants'->>key))=any(seen) then return 'invalid';end if;seen:=array_append(seen,lower(btrim(p_plan->'variants'->>key)));
 end loop;
 if jsonb_array_length(p_plan->'rubric') not between 2 and 5 then return 'invalid';end if;
 for v in select value from jsonb_array_elements(p_plan->'rubric') loop
  if jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}')) not between 1 and 1000 then return 'invalid';end if;
 end loop;
 select l.title into title_text from public.assignments a join public.lessons l on l.id=a.lesson_id where a.id=p_assignment;
 insert into public.pathway_plans(assignment_id,title,goal,variants,check_prompt,rubric) values(p_assignment,title_text,p_plan->>'goal',p_plan->'variants',p_plan->>'check_prompt',p_plan->'rubric') on conflict(assignment_id) do nothing;
 return case when found then 'ok' else 'exists' end;
end;$$;
revoke all on function public.create_pathway_plan(uuid,jsonb) from public,anon;
grant execute on function public.create_pathway_plan(uuid,jsonb) to authenticated;

create function public.set_pathway_plan_active(p_plan uuid,p_active boolean) returns text
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or p_active is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden';end if;
 update public.pathway_plans p set active=p_active from public.assignments a join public.classes c on c.id=a.class_id where p.id=p_plan and a.id=p.assignment_id and c.teacher_id=auth.uid();
 return case when found then 'ok' else 'forbidden' end;
end;$$;
revoke all on function public.set_pathway_plan_active(uuid,boolean) from public,anon;
grant execute on function public.set_pathway_plan_active(uuid,boolean) to authenticated;

create function public.assign_learning_pathway(p_plan uuid,p_attempt uuid,p_path text) returns text
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden';end if;
 if p_path is null or p_path not in ('support','core','challenge') then return 'invalid';end if;
 perform 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.classes c on c.id=a.class_id join public.pathway_plans p on p.assignment_id=a.id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where t.id=p_attempt and p.id=p_plan and c.teacher_id=auth.uid() for update of t;
 if not found then return 'forbidden';end if;
 if exists(select 1 from public.pathway_work where plan_id=p_plan and attempt_id=p_attempt and submitted_at is not null) then return 'locked';end if;
 insert into public.pathway_work(plan_id,attempt_id,pathway) values(p_plan,p_attempt,p_path) on conflict(plan_id,attempt_id) do update set pathway=excluded.pathway,support_requested=false;
 return 'ok';
end;$$;
revoke all on function public.assign_learning_pathway(uuid,uuid,text) from public,anon;
grant execute on function public.assign_learning_pathway(uuid,uuid,text) to authenticated;

create function public.learning_pathway_tasks() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb:='[]';r record;w public.pathway_work%rowtype;path text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return result;end if;
 for r in select p.*,t.id as tid from public.pathway_plans p join public.attempts t on t.assignment_id=p.assignment_id join public.assignments a on a.id=p.assignment_id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where t.student_id=auth.uid() and p.active and t.current_stage>=3 and not exists(select 1 from public.lesson_sessions s where s.assignment_id=a.id and (s.paused or s.max_stage<3)) order by p.created_at desc limit 50 loop
  select * into w from public.pathway_work where plan_id=r.id and attempt_id=r.tid;
  path:=coalesce(w.pathway,'core');
  result:=result||jsonb_build_array(jsonb_build_object('planId',r.id,'attemptId',r.tid,'title',r.title,'goal',r.goal,'pathway',path,'prompt',r.variants->>path,'checkPrompt',r.check_prompt,'rubric',r.rubric,'work',case when w.id is null then null else to_jsonb(w) end));
 end loop;
 return result;
end;$$;
revoke all on function public.learning_pathway_tasks() from public,anon;
grant execute on function public.learning_pathway_tasks() to authenticated;

create function public.request_pathway_support(p_plan uuid,p_attempt uuid) returns text
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return 'forbidden';end if;
 perform 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.pathway_plans p on p.assignment_id=a.id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where t.id=p_attempt and t.student_id=auth.uid() and p.id=p_plan for update of t;
 if not found then return 'forbidden';end if;
 if not exists(select 1 from public.attempts where id=p_attempt and current_stage>=3) or exists(select 1 from public.lesson_sessions s join public.attempts t on t.assignment_id=s.assignment_id where t.id=p_attempt and (s.paused or s.max_stage<3)) then return 'not_ready';end if;
 if not exists(select 1 from public.pathway_plans where id=p_plan and active) then return 'inactive';end if;
 if exists(select 1 from public.pathway_work where plan_id=p_plan and attempt_id=p_attempt and submitted_at is not null) then return 'locked';end if;
 insert into public.pathway_work(plan_id,attempt_id,support_requested) values(p_plan,p_attempt,true) on conflict(plan_id,attempt_id) do update set support_requested=true;
 return 'ok';
end;$$;
revoke all on function public.request_pathway_support(uuid,uuid) from public,anon;
grant execute on function public.request_pathway_support(uuid,uuid) to authenticated;

create function public.submit_pathway_work(p_plan uuid,p_attempt uuid,p_path text,p_text text,p_check text) returns text
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return 'forbidden';end if;
 if p_text is null or length(btrim(p_text)) not between 1 and 5000 or p_check is null or length(btrim(p_check)) not between 1 and 5000 then return 'invalid';end if;
 perform 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.pathway_plans p on p.assignment_id=a.id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id where t.id=p_attempt and t.student_id=auth.uid() and p.id=p_plan for update of t;
 if not found then return 'forbidden';end if;
 if not exists(select 1 from public.attempts where id=p_attempt and current_stage>=3) or exists(select 1 from public.lesson_sessions s join public.attempts t on t.assignment_id=s.assignment_id where t.id=p_attempt and (s.paused or s.max_stage<3)) then return 'not_ready';end if;
 perform 1 from public.pathway_plans where id=p_plan and active for share;
 if not found then return 'inactive';end if;
 if exists(select 1 from public.pathway_work where plan_id=p_plan and attempt_id=p_attempt and submitted_at is not null) then return 'locked';end if;
 select pathway into path from public.pathway_work where plan_id=p_plan and attempt_id=p_attempt;
 path:=coalesce(path,'core');
 if p_path is distinct from path then return 'changed';end if;
 insert into public.pathway_work(plan_id,attempt_id,pathway,response,check_response,submitted_at) values(p_plan,p_attempt,path,btrim(p_text),btrim(p_check),now()) on conflict(plan_id,attempt_id) do update set response=excluded.response,check_response=excluded.check_response,submitted_at=excluded.submitted_at,support_requested=false;
 return 'ok';
end;$$;
revoke all on function public.submit_pathway_work(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.submit_pathway_work(uuid,uuid,text,text,text) to authenticated;

create function public.review_pathway_work(p_work uuid,p_criteria jsonb,p_feedback text) returns text
language plpgsql security definer set search_path='' as $$
declare w public.pathway_work%rowtype;rub jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden';end if;
 select v.* into w from public.pathway_work v join public.attempts t on t.id=v.attempt_id join public.assignments a on a.id=t.assignment_id join public.classes c on c.id=a.class_id where v.id=p_work and c.teacher_id=auth.uid() for update of v;
 if not found then return 'forbidden';end if;
 if w.submitted_at is null then return 'not_submitted';end if;
 if w.reviewed_at is not null then return 'locked';end if;
 if p_feedback is null or length(btrim(p_feedback)) not between 1 and 2000 or jsonb_typeof(p_criteria) is distinct from 'array' then return 'invalid';end if;
 select rubric into rub from public.pathway_plans where id=w.plan_id;
 if jsonb_array_length(p_criteria)<>jsonb_array_length(rub) or exists(select 1 from jsonb_array_elements(p_criteria) x where jsonb_typeof(x)<>'boolean') then return 'invalid';end if;
 update public.pathway_work set criteria_met=p_criteria,feedback=btrim(p_feedback),reviewed_at=now() where id=p_work;
 return 'ok';
end;$$;
revoke all on function public.review_pathway_work(uuid,jsonb,text) from public,anon;
grant execute on function public.review_pathway_work(uuid,jsonb,text) to authenticated;
commit;
