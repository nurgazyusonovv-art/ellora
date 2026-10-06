-- 5E: мугалимдин критерий менен баалоосу, жандуу сабак жана AI сурам лимити.
begin;
create table public.answer_reviews (
  attempt_id uuid not null,
  block_id text not null,
  teacher_id uuid not null references public.profiles(id),
  criteria_met boolean[] not null,
  feedback text not null check (length(feedback) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, block_id),
  foreign key (attempt_id, block_id) references public.answers(attempt_id, block_id) on delete cascade
);
alter table public.answer_reviews enable row level security;
grant select, insert, update on public.answer_reviews to authenticated;
create policy "окуучу өз пикирин көрөт" on public.answer_reviews for select to authenticated
using (exists (select 1 from public.attempts t where t.id = attempt_id and t.student_id = auth.uid()));
create policy "мугалим өз классынын жоопторун баалайт" on public.answer_reviews for all to authenticated
using (exists (select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and public.is_teacher_of_class(a.class_id)))
with check (teacher_id=auth.uid() and exists (select 1 from public.attempts t join public.assignments a on a.id=t.assignment_id where t.id=attempt_id and public.is_teacher_of_class(a.class_id)));

create table public.lesson_sessions (
  assignment_id uuid primary key references public.assignments(id) on delete cascade,
  max_stage int not null default 0 check (max_stage between 0 and 4),
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.lesson_sessions enable row level security;
grant select, insert, update, delete on public.lesson_sessions to authenticated;
create policy "класстын сессиясын көрүү" on public.lesson_sessions for select to authenticated using (public.can_see_assignment(assignment_id));
create policy "мугалим сессияны башкарат" on public.lesson_sessions for all to authenticated
using (exists (select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)))
with check (exists (select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)));

create table public.ai_usage (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now()
);
create index ai_usage_student_time on public.ai_usage(student_id, requested_at desc);
alter table public.ai_usage enable row level security;
-- Клиенттер бул таблицага түз жаза албайт. Сурамдын мазмуну сакталбайт.
revoke all on public.ai_usage from anon, authenticated;
create function public.reserve_ai_request() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists(select 1 from public.profiles where id=uid and role='student') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if exists(select 1 from public.ai_usage where student_id=uid and requested_at > now()-interval '10 seconds')
    or (select count(*) from public.ai_usage where student_id=uid and requested_at > now()-interval '24 hours') >= 30 then return false; end if;
  delete from public.ai_usage where student_id=uid and requested_at < now()-interval '24 hours';
  insert into public.ai_usage(student_id) values(uid);
  return true;
end; $$;
revoke all on function public.reserve_ai_request() from public, anon;
grant execute on function public.reserve_ai_request() to authenticated;
commit;
