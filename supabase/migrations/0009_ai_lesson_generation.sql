-- Мугалимдин ЖИ сабак долбоорлору жана атомдук сурам лимити.
begin;
create table public.ai_lesson_generations (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid references public.lessons(id) on delete set null,
 input jsonb not null,
 model text not null,
 status text not null default 'pending' check(status in ('pending','ready','failed')),
 result text,
 error text,
 input_tokens int check(input_tokens >= 0),
 output_tokens int check(output_tokens >= 0),
 created_at timestamptz not null default now()
);
create index ai_lesson_generations_teacher_time on public.ai_lesson_generations(teacher_id,created_at desc);
alter table public.ai_lesson_generations enable row level security;
revoke all on public.ai_lesson_generations from anon,authenticated;
grant select on public.ai_lesson_generations to authenticated;
create policy "мугалим өз ЖИ долбоорлорун көрөт" on public.ai_lesson_generations for select to authenticated using(teacher_id=(select auth.uid()));
create function public.reserve_lesson_generation(p_input jsonb,p_model text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); gid uuid;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='teacher') then return null; end if;
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>12000 or p_model is null or length(p_model)>100 then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended('lesson-generation:'||uid::text,0));
 if exists(select 1 from public.ai_lesson_generations where teacher_id=uid and created_at>now()-interval '30 seconds')
 or (select count(*) from public.ai_lesson_generations where teacher_id=uid and created_at>now()-interval '24 hours')>=10 then return null; end if;
 insert into public.ai_lesson_generations(teacher_id,input,model) values(uid,p_input,p_model) returning id into gid;
 return gid;
end; $$;
revoke all on function public.reserve_lesson_generation(jsonb,text) from public,anon;
grant execute on function public.reserve_lesson_generation(jsonb,text) to authenticated;
commit;
