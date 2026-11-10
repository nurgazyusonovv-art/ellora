-- Жандуу оюн (квиз-шоу): мугалим проектордо ойнотот, окуучулар PIN менен телефондон кошулат.
-- Суроолор game_sets (0017) ичинде. Абалды мугалим гана өзгөртөт; оюнчулар жана жооптор серверде (service role)
-- текшерилип жазылат — окуучу упайды же тууралыкты өзү жаза албайт.
begin;

create table public.game_lives (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.game_sets(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{6}$'),
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'ended')),
  q_index int not null default -1 check (q_index >= -1 and q_index < 40),
  q_started_at timestamptz,
  speed_bonus boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
-- Бир учурда бир PIN бир гана бүтө элек оюнда.
create unique index game_lives_open_pin on public.game_lives(pin) where status <> 'ended';
create index game_lives_class on public.game_lives(class_id);

create table public.game_live_players (
  live_id uuid not null references public.game_lives(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score int not null default 0 check (score >= 0),
  streak int not null default 0 check (streak >= 0),
  joined_at timestamptz not null default now(),
  primary key (live_id, student_id)
);

create table public.game_live_answers (
  live_id uuid not null references public.game_lives(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  q_index int not null check (q_index >= 0 and q_index < 40),
  picked int not null check (picked between 0 and 4),
  correct boolean not null,
  points int not null default 0 check (points between 0 and 2000),
  answered_at timestamptz not null default now(),
  primary key (live_id, student_id, q_index)
);

alter table public.game_lives enable row level security;
alter table public.game_live_players enable row level security;
alter table public.game_live_answers enable row level security;

revoke all on public.game_lives, public.game_live_players, public.game_live_answers from anon, authenticated;
grant select, insert, update, delete on public.game_lives to authenticated;
grant select on public.game_live_players, public.game_live_answers to authenticated;

-- Мугалим: өз классында, өз топтому менен гана.
create policy "game_lives_teacher" on public.game_lives for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and public.is_teacher_of_class(class_id)
    and exists (select 1 from public.game_sets s where s.id = set_id and s.author_id = (select auth.uid()))
  );
-- Окуучу: өз классынын оюнунун абалын гана көрөт (суроолор/жооптор game_sets'те, ага кирүү жок).
create policy "game_lives_student" on public.game_lives for select to authenticated
  using (public.is_member_of_class(class_id));

create policy "game_live_players_read" on public.game_live_players for select to authenticated
  using (student_id = (select auth.uid()) or exists (select 1 from public.game_lives g where g.id = live_id and g.teacher_id = (select auth.uid())));
create policy "game_live_answers_read" on public.game_live_answers for select to authenticated
  using (student_id = (select auth.uid()) or exists (select 1 from public.game_lives g where g.id = live_id and g.teacher_id = (select auth.uid())));

commit;

-- Realtime: оюндун абалы (суроо башталды, жооп ачылды) окуучуларга дароо жетсин. Жарыялоо жок базада эч нерсе кылбайт.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_lives') then
    alter publication supabase_realtime add table public.game_lives;
  end if;
end
$$;
