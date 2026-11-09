-- Сабакты өтүү ыкмасы: 'class' — мугалим баштайт жана бөлүктөрдү башкарат; 'self' — өз алдынча (мурунку жүрүм).
-- Мурунку дайындамалар 'self' бойдон калат. Жаңы дайындаманын ыкмасын сервер ачык жазат.
begin;

alter table public.assignments
  add column delivery text not null default 'self' check (delivery in ('class', 'self'));

-- Жандуу сабактын башталган жана бүткөн убактысы (lesson_sessions 0008/0015).
alter table public.lesson_sessions
  add column started_at timestamptz,
  add column ended_at timestamptz;

-- Мугалимдин башкы бетиндеги «Жүрүп жаткан сабак» сурамы үчүн.
create index lesson_sessions_open on public.lesson_sessions(assignment_id) where not ended;

commit;
