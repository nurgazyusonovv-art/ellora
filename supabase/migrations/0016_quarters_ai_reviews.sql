-- Чейректик эсеп, мугалим бекиткен тарых жана ЖИнин сунуштары.
begin;
alter table public.assignments add column academic_year int check(academic_year between 2000 and 2100), add column quarter int check(quarter between 1 and 4), add column work_kind text not null default 'daily' check(work_kind in ('daily','quarterly','game'));
alter table public.assignments add constraint assignment_term_pair check((academic_year is null)=(quarter is null));
create index assignments_term on public.assignments(class_id,academic_year,quarter);
alter table public.answer_reviews add column source_snapshot jsonb;
create function public.check_review_snapshot() returns trigger language plpgsql set search_path='' as $$
declare current_snapshot jsonb;
begin
 if new.source_snapshot is null then return new; end if;
 select jsonb_build_object('prompt',b->'prompt','rubric',b->'rubric','response',r.response) into current_snapshot
 from public.answers r join public.attempts t on t.id=r.attempt_id join public.assignments a on a.id=t.assignment_id join public.lessons l on l.id=a.lesson_id,
 lateral jsonb_array_elements(l.content->'stages') s,lateral jsonb_array_elements(s->'blocks') b
 where r.attempt_id=new.attempt_id and r.block_id=new.block_id and b->>'id'=new.block_id;
 if current_snapshot is null or current_snapshot<>new.source_snapshot then raise exception 'review_source_changed'; end if;
 return new;
end; $$;
create trigger review_snapshot before insert or update on public.answer_reviews for each row execute function public.check_review_snapshot();

create table public.quarter_settings(
 class_id uuid not null references public.classes(id) on delete cascade, academic_year int not null check(academic_year between 2000 and 2100), quarter int not null check(quarter between 1 and 4),
 daily_weight int not null default 60 check(daily_weight between 0 and 100), grade3_min int not null default 50, grade4_min int not null default 70,grade5_min int not null default 85,
 updated_at timestamptz not null default now(),primary key(class_id,academic_year,quarter),check(grade3_min>=0 and grade3_min<grade4_min and grade4_min<grade5_min and grade5_min<=100)
);
alter table public.quarter_settings enable row level security;
revoke all on public.quarter_settings from anon,authenticated;
grant select,insert,update on public.quarter_settings to authenticated;
create policy "мугалим чейрек эрежесин башкарат" on public.quarter_settings for all to authenticated using(public.is_teacher_of_class(class_id)) with check(public.is_teacher_of_class(class_id));

-- Жаңы бекитүү жаңы сап: мурдагы баа/негиздеме өзгөртүлбөйт.
create table public.quarter_grades(
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes(id) on delete cascade,student_id uuid not null references public.profiles(id) on delete cascade,academic_year int not null check(academic_year between 2000 and 2100),quarter int not null check(quarter between 1 and 4),
 teacher_id uuid not null references public.profiles(id),grade int not null check(grade between 2 and 5),percentage numeric check(percentage between 0 and 100),note text not null check(length(note)<=2000),
 basis_hash text not null check(length(basis_hash)=64),snapshot jsonb not null,approved_at timestamptz not null default now()
);
create index quarter_grades_lookup on public.quarter_grades(class_id,academic_year,quarter,approved_at desc);
alter table public.quarter_grades enable row level security;
revoke all on public.quarter_grades from anon,authenticated;
grant select,insert on public.quarter_grades to authenticated;
create policy "чейрек баасын мугалим жана өз окуучусу көрөт" on public.quarter_grades for select to authenticated using(student_id=auth.uid() or public.is_teacher_of_class(class_id));
create policy "чейрек баасын мугалим бекитет" on public.quarter_grades for insert to authenticated with check(teacher_id=auth.uid() and public.is_teacher_of_class(class_id) and exists(select 1 from public.class_members m where m.class_id=quarter_grades.class_id and m.student_id=quarter_grades.student_id));

create table public.ai_review_usage(id bigint generated always as identity primary key,teacher_id uuid not null references public.profiles(id) on delete cascade,requested_at timestamptz not null default now());
create index ai_review_usage_time on public.ai_review_usage(teacher_id,requested_at desc);
alter table public.ai_review_usage enable row level security;
revoke all on public.ai_review_usage from anon,authenticated;
create function public.reserve_review_request(p_attempt uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='teacher') or not exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id join public.classes c on c.id=a.class_id where t.id=p_attempt and c.teacher_id=uid) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1616));
 if exists(select 1 from public.ai_review_usage where teacher_id=uid and requested_at>now()-interval '2 seconds') or (select count(*) from public.ai_review_usage where teacher_id=uid and requested_at>now()-interval '24 hours')>=200 then return false;end if;
 delete from public.ai_review_usage where teacher_id=uid and requested_at<now()-interval '24 hours';
 insert into public.ai_review_usage(teacher_id)values(uid);return true;
end; $$;
revoke all on function public.reserve_review_request(uuid) from public,anon;
grant execute on function public.reserve_review_request(uuid) to authenticated;
create table public.ai_review_suggestions(
 teacher_id uuid not null references public.profiles(id) on delete cascade,attempt_id uuid not null,block_id text not null,source_hash text not null check(length(source_hash)=64),result jsonb not null,created_at timestamptz not null default now(),
 primary key(teacher_id,attempt_id,block_id,source_hash),foreign key(attempt_id,block_id) references public.answers(attempt_id,block_id) on delete cascade
);
alter table public.ai_review_suggestions enable row level security;
revoke all on public.ai_review_suggestions from anon,authenticated;
grant select on public.ai_review_suggestions to authenticated;
create policy "мугалим өз ЖИ сунушун көрөт" on public.ai_review_suggestions for select to authenticated using(teacher_id=auth.uid() and exists(select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and public.is_teacher_of_class(a.class_id)));
commit;
