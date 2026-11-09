-- Оңдоо тарыхы: баштапкы answers/attempts жана сыйлыктар өзгөрбөйт.
begin;
create table public.answer_revisions (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null,
 block_id text not null,
 revision_no int not null check(revision_no>0),
 stage_index int not null check(stage_index between 1 and 3),
 prompt text not null,
 lesson_title text not null,
 rubric jsonb not null check(jsonb_typeof(rubric)='array' and jsonb_array_length(rubric) between 1 and 20),
 previous_response text not null,
 request_feedback text not null check(length(btrim(request_feedback)) between 1 and 2000),
 response text check(length(btrim(response)) between 1 and 5000),
 status text not null default 'requested' check(status in ('requested','submitted','reviewed')),
 criteria_met jsonb,
 feedback text check(length(btrim(feedback)) between 1 and 2000),
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 foreign key(attempt_id,block_id) references public.answers(attempt_id,block_id) on delete cascade,
 unique(attempt_id,block_id,revision_no),
 check ((status='requested' and response is null and submitted_at is null and reviewed_at is null and criteria_met is null and feedback is null)
 or (status='submitted' and response is not null and submitted_at is not null and reviewed_at is null and criteria_met is null and feedback is null)
 or (status='reviewed' and response is not null and submitted_at is not null and reviewed_at is not null and jsonb_typeof(criteria_met)='array' and feedback is not null))
);
create unique index one_active_answer_revision on public.answer_revisions(attempt_id,block_id) where status<>'reviewed';
create index answer_revisions_time on public.answer_revisions(created_at desc);
alter table public.answer_revisions enable row level security;
revoke all on public.answer_revisions from anon,authenticated;
grant select on public.answer_revisions to authenticated;
create policy "own_revision_history" on public.answer_revisions for select to authenticated using (
 exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and
 (t.student_id=(select auth.uid()) or public.is_teacher_of_class(a.class_id)))
);

create function public.request_answer_revision(p_attempt uuid,p_block text,p_feedback text) returns text
language plpgsql security definer set search_path='' as $$
declare answer_text text; content jsonb; title_text text; stage jsonb; block jsonb; stage_n int; last_row public.answer_revisions%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden'; end if;
 if p_feedback is null or length(btrim(p_feedback)) not between 1 and 2000 then return 'invalid'; end if;
 -- Укук текшерилгенден кийин гана жоопту кулпулоо: бир учурда эки өтүнүч ачылбайт.
 if not exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.classes c on c.id=a.class_id where t.id=p_attempt and c.teacher_id=auth.uid()) then return 'forbidden'; end if;
 select response->>'text' into answer_text from public.answers where attempt_id=p_attempt and block_id=p_block for update;
 if not found or answer_text is null or btrim(answer_text)='' then return 'unavailable'; end if;
 select l.content,l.title into content,title_text from public.attempts t join public.assignments a on a.id=t.assignment_id join public.lessons l on l.id=a.lesson_id where t.id=p_attempt;
 select s.value,(s.ordinality-1)::int,b.value into stage,stage_n,block from jsonb_array_elements(content->'stages') with ordinality s(value,ordinality) cross join lateral jsonb_array_elements(s.value->'blocks') b(value) where b.value->>'id'=p_block limit 1;
 if block is null or block->>'type'<>'open' or stage->>'key' in ('discover','exit') or stage_n not between 1 and 3 or coalesce((block->>'lockOnSubmit')::boolean,false) or jsonb_typeof(block->'rubric') is distinct from 'array' then return 'unavailable'; end if;
 if jsonb_array_length(block->'rubric') not between 1 and 20 then return 'unavailable'; end if;
 if not exists(select 1 from public.answer_reviews where attempt_id=p_attempt and block_id=p_block) then return 'review_first'; end if;
 select * into last_row from public.answer_revisions where attempt_id=p_attempt and block_id=p_block order by revision_no desc limit 1;
 if found and last_row.status<>'reviewed' then return 'pending'; end if;
 insert into public.answer_revisions(attempt_id,block_id,revision_no,stage_index,prompt,lesson_title,rubric,previous_response,request_feedback)
 values(p_attempt,p_block,coalesce(last_row.revision_no,0)+1,stage_n,block->>'prompt',title_text,block->'rubric',coalesce(last_row.response,answer_text),btrim(p_feedback));
 return 'ok';
end; $$;
revoke all on function public.request_answer_revision(uuid,text,text) from public,anon;
grant execute on function public.request_answer_revision(uuid,text,text) to authenticated;

create function public.submit_answer_revision(p_id uuid,p_text text) returns text
language plpgsql security definer set search_path='' as $$
declare r public.answer_revisions%rowtype; aid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then return 'forbidden'; end if;
 if p_text is null or length(btrim(p_text)) not between 1 and 5000 then return 'invalid'; end if;
 -- Башка окуучунун саптарын кулпулоого да жол берилбейт.
 select v.* into r from public.answer_revisions v join public.attempts t on t.id=v.attempt_id join public.assignments a on a.id=t.assignment_id join public.class_members m on m.class_id=a.class_id and m.student_id=t.student_id
 where v.id=p_id and t.student_id=auth.uid() for update of v;
 if not found then return 'forbidden'; end if;
 if r.status<>'requested' then return 'already_submitted'; end if;
 select assignment_id into aid from public.attempts where id=r.attempt_id;
 if exists(select 1 from public.lesson_sessions where assignment_id=aid and (paused or max_stage<r.stage_index)) then return 'paused'; end if;
 if btrim(p_text)=btrim(r.previous_response) then return 'unchanged'; end if;
 update public.answer_revisions set response=btrim(p_text),status='submitted',submitted_at=now() where id=p_id;
 return 'ok';
end; $$;
revoke all on function public.submit_answer_revision(uuid,text) from public,anon;
grant execute on function public.submit_answer_revision(uuid,text) to authenticated;

create function public.review_answer_revision(p_id uuid,p_criteria jsonb,p_feedback text) returns text
language plpgsql security definer set search_path='' as $$
declare r public.answer_revisions%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden'; end if;
 select v.* into r from public.answer_revisions v join public.attempts t on t.id=v.attempt_id join public.assignments a on a.id=t.assignment_id join public.classes c on c.id=a.class_id where v.id=p_id and c.teacher_id=auth.uid() for update of v;
 if not found then return 'forbidden'; end if;
 if r.status<>'submitted' then return 'unavailable'; end if;
 if p_feedback is null or length(btrim(p_feedback)) not between 1 and 2000 or jsonb_typeof(p_criteria) is distinct from 'array' then return 'invalid'; end if;
 if jsonb_array_length(p_criteria)<>jsonb_array_length(r.rubric) or exists(select 1 from jsonb_array_elements(p_criteria) x where jsonb_typeof(x)<>'boolean') then return 'invalid'; end if;
 update public.answer_revisions set criteria_met=p_criteria,feedback=btrim(p_feedback),status='reviewed',reviewed_at=now() where id=p_id;
 return 'ok';
end; $$;
revoke all on function public.review_answer_revision(uuid,jsonb,text) from public,anon;
grant execute on function public.review_answer_revision(uuid,jsonb,text) to authenticated;
commit;
