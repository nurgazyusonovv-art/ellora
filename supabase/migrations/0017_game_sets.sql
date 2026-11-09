-- Оюндар: суроо топтому + класска дайындоо + машыгуу режиминин жооптору (1-этап).
-- Туура жооптор game_sets ичинде; окуучу аны түз окуй албайт — сервер баалайт (0003, 0004 сыяктуу).
begin;

create table public.game_sets (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 150),
 grade int check (grade between 5 and 9),
 topic text check (char_length(topic) <= 200),
 skills text[] not null default '{}' check (cardinality(skills) <= 5),
 questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 40 and octet_length(questions::text) <= 100000),
 source text check (char_length(source) <= 60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index game_sets_author on public.game_sets(author_id);

create table public.game_assignments (
 id uuid primary key default gen_random_uuid(),
 set_id uuid not null references public.game_sets(id) on delete cascade,
 class_id uuid not null references public.classes(id) on delete cascade,
 due_at timestamptz,
 created_at timestamptz not null default now()
);
create index game_assignments_class on public.game_assignments(class_id);
create index game_assignments_set on public.game_assignments(set_id);

-- Ар бир жооп: машыгуу раунду ичинде. Жазуу серверде гана (service role).
create table public.game_answers (
 id bigint generated always as identity primary key,
 assignment_id uuid not null references public.game_assignments(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 round_id uuid not null,
 question_id text not null check (char_length(question_id) between 1 and 40),
 is_correct boolean not null,
 response jsonb not null check (octet_length(response::text) <= 4000),
 created_at timestamptz not null default now()
);
create index game_answers_round on public.game_answers(assignment_id, student_id, round_id);

create table public.game_progress (
 assignment_id uuid not null references public.game_assignments(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 rounds int not null default 0 check (rounds >= 0),
 last_score int not null default 0 check (last_score between 0 and 100),
 best_score int not null default 0 check (best_score between 0 and 100),
 last_round uuid,
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key (assignment_id, student_id)
);

alter table public.game_sets enable row level security;
alter table public.game_assignments enable row level security;
alter table public.game_answers enable row level security;
alter table public.game_progress enable row level security;

revoke all on public.game_sets, public.game_assignments, public.game_answers, public.game_progress from anon, authenticated;
grant select, insert, update, delete on public.game_sets, public.game_assignments to authenticated;
grant select on public.game_answers, public.game_progress to authenticated;

-- Топтомду автор (мугалим) гана көрөт жана башкарат. Окуучуга туура жооптор жетпейт.
create policy "game_sets_author" on public.game_sets for all to authenticated
 using (author_id = (select auth.uid()))
 with check (author_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher'));

-- Дайындоо: өз классына жана өз топтомуна гана.
create policy "game_assignments_teacher" on public.game_assignments for all to authenticated
 using (public.is_teacher_of_class(class_id))
 with check (public.is_teacher_of_class(class_id) and exists (select 1 from public.game_sets s where s.id = set_id and s.author_id = (select auth.uid())));
create policy "game_assignments_student" on public.game_assignments for select to authenticated
 using (public.is_member_of_class(class_id));

create policy "game_answers_read" on public.game_answers for select to authenticated
 using (student_id = (select auth.uid()) or exists (select 1 from public.game_assignments a where a.id = assignment_id and public.is_teacher_of_class(a.class_id)));
create policy "game_progress_read" on public.game_progress for select to authenticated
 using (student_id = (select auth.uid()) or exists (select 1 from public.game_assignments a where a.id = assignment_id and public.is_teacher_of_class(a.class_id)));

commit;
