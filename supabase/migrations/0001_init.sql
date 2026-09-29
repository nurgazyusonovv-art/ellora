-- ellora: MVP схемасы
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз.


-- ─────────────────────────── Таблицалар ───────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('teacher', 'student')),
  full_name   text not null,
  username    text unique,                 -- окуучулар үчүн гана
  school      text,
  created_at  timestamptz not null default now()
);

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  join_code   text not null unique,
  created_at  timestamptz not null default now()
);

create table public.class_members (
  class_id    uuid not null references public.classes (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  grade       int,
  topic       text,
  content     jsonb not null,              -- 5 бөлүк жана блоктор (src/lib/lesson-types.ts)
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  opens_at    timestamptz not null default now(),
  due_at      timestamptz,
  created_at  timestamptz not null default now()
);

create table public.attempts (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  current_stage  int not null default 0,  -- 0..4, 5 = бүттү
  xp             int not null default 0,
  exit_score     int,
  exit_total     int,
  confidence     int check (confidence between 1 and 4),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  unique (assignment_id, student_id)
);

create table public.answers (
  attempt_id  uuid not null references public.attempts (id) on delete cascade,
  block_id    text not null,
  stage       int not null,
  response    jsonb,
  is_correct  boolean,
  tries       int not null default 1,
  updated_at  timestamptz not null default now(),
  primary key (attempt_id, block_id)
);

create index on public.classes (teacher_id);
create index on public.class_members (student_id);
create index on public.lessons (author_id);
create index on public.assignments (class_id);
create index on public.attempts (student_id);

-- ─────────────────────── Жардамчы функциялар ───────────────────────
-- security definer: RLS саясаттарынын ичинде рекурсия болбошу үчүн.

create or replace function public.is_teacher_of_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_member_of_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and student_id = auth.uid());
$$;

create or replace function public.can_see_assignment(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments a
    where a.id = aid
      and (public.is_teacher_of_class(a.class_id) or public.is_member_of_class(a.class_id))
  );
$$;

create or replace function public.teacher_sees_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members cm join classes c on c.id = cm.class_id
    where cm.student_id = sid and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.lesson_assigned_to_me(lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from assignments a join class_members cm on cm.class_id = a.class_id
    where a.lesson_id = lid and cm.student_id = auth.uid()
  );
$$;

-- Окуучу класс коду менен кошулат (класстын id'син билбесе да).
create or replace function public.join_class(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'student') then
    raise exception 'Окуучу гана класска кошула алат';
  end if;
  select id into cid from classes where join_code = upper(trim(p_code));
  if cid is null then
    raise exception 'Мындай коду бар класс табылган жок';
  end if;
  insert into class_members (class_id, student_id) values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end;
$$;

-- Жаңы колдонуучу катталганда профиль автоматтык түрдө түзүлөт.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name, username, school)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'teacher'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'school'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────── RLS ───────────────────────────────

alter table public.profiles      enable row level security;
alter table public.classes       enable row level security;
alter table public.class_members enable row level security;
alter table public.lessons       enable row level security;
alter table public.assignments   enable row level security;
alter table public.attempts      enable row level security;
alter table public.answers       enable row level security;

-- profiles
create policy "өз профилин көрөт" on public.profiles
  for select using (id = auth.uid() or public.teacher_sees_student(id));
-- Профилди оңдоо MVP'де жок (ролду өзгөртүп алуу коркунучу болбошу үчүн).

-- classes
create policy "мугалим өз класстарын башкарат" on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "окуучу өз класстарын көрөт" on public.classes
  for select using (public.is_member_of_class(id));

-- class_members
create policy "мугалим класс мүчөлөрүн көрөт" on public.class_members
  for select using (public.is_teacher_of_class(class_id));
create policy "мугалим окуучуну класстан чыгарат" on public.class_members
  for delete using (public.is_teacher_of_class(class_id));
create policy "окуучу өз мүчөлүгүн көрөт" on public.class_members
  for select using (student_id = auth.uid());

-- lessons
create policy "автор өз сабактарын башкарат" on public.lessons
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "окуучу дайындалган сабакты көрөт" on public.lessons
  for select using (public.lesson_assigned_to_me(id));

-- assignments
create policy "мугалим дайындамаларды башкарат" on public.assignments
  for all using (public.is_teacher_of_class(class_id)) with check (public.is_teacher_of_class(class_id));
create policy "окуучу өз класстын дайындамаларын көрөт" on public.assignments
  for select using (public.is_member_of_class(class_id));

-- attempts
create policy "окуучу өз аракетин көрөт" on public.attempts
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.is_teacher_of_class(a.class_id))
  );
create policy "окуучу аракет баштайт" on public.attempts
  for insert with check (student_id = auth.uid() and public.can_see_assignment(assignment_id));
create policy "окуучу аракетин жаңылайт" on public.attempts
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- answers
create policy "окуучу өз жоопторун башкарат" on public.answers
  for all
  using (exists (select 1 from public.attempts t where t.id = attempt_id and t.student_id = auth.uid()))
  with check (exists (select 1 from public.attempts t where t.id = attempt_id and t.student_id = auth.uid()));
create policy "мугалим жоопторду көрөт" on public.answers
  for select using (exists (
    select 1 from public.attempts t join public.assignments a on a.id = t.assignment_id
    where t.id = attempt_id and public.is_teacher_of_class(a.class_id)
  ));

grant execute on function public.join_class(text) to authenticated;
