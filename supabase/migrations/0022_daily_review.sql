-- Күнүмдүк кайталоо (геймификация, 3-этап): күн сайын окуучу мурун көргөн 3 тестти эстеп чечет.
-- Суроолор ошол күнгө бекитилет (items), жооптор серверде бааланат жана ушул жерге жазылат (service role гана).
-- Окуучу өзүнүкүн, мугалим өз окуучусунукун окуйт (teacher_sees_student, 0001).
begin;

create table public.review_days (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  -- [{ "a": assignment_id, "b": block_id }]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 5),
  -- { "0": { "picked": 1, "correct": true }, ... }
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 4000),
  score int not null default 0 check (score between 0 and 5),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (student_id, day)
);

alter table public.review_days enable row level security;
revoke all on public.review_days from anon, authenticated;
grant select on public.review_days to authenticated;

create policy "review_days_read" on public.review_days for select to authenticated
  using (student_id = (select auth.uid()) or public.teacher_sees_student(student_id));

commit;
