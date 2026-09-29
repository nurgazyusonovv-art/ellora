-- ellora: мугалимдин календардык-тематикалык пландары (КТП)
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз.

create table public.ktp_plans (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  grade       int  not null check (grade between 1 and 11),
  year        text,                          -- мисалы: 2026–2027
  source      text,                          -- кайсы КТП'ден көчүрүлгөн (шилтеме)
  sections    jsonb not null default '[]',   -- [{ title, hours, topics: [{ title, hours? }] }] — src/content/ktp
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (teacher_id, grade)
);

create index on public.ktp_plans (teacher_id);

alter table public.ktp_plans enable row level security;

-- Мугалим өз пландарын гана көрөт жана өзгөртөт. Окуучу план түзө албайт.
create policy "мугалим өз КТП'син көрөт" on public.ktp_plans
  for select using (teacher_id = auth.uid());
create policy "мугалим КТП түзөт" on public.ktp_plans
  for insert with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  );
create policy "мугалим өз КТП'син өзгөртөт" on public.ktp_plans
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "мугалим өз КТП'син өчүрөт" on public.ktp_plans
  for delete using (teacher_id = auth.uid());
