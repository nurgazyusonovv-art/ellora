-- Жандуу сабактын «Тактасы» (проектор): мугалим кайсы тапшырманын жыйынтыгын көрсөтүп жатканы.
-- Абал lesson_sessions'та — Realtime (0019) аркылуу такта жана окуучулар дароо билет. Укук мурункудай (0008):
-- өзгөртүүнү мугалим гана кылат, класс мүчөлөрү окуйт.
begin;

alter table public.lesson_sessions
  add column spotlight_block text check (char_length(spotlight_block) between 1 and 40),
  add column spotlight_reveal boolean not null default false,
  -- Тактадан жашырылган ачык жооптор (attempts.id).
  add column spotlight_hidden uuid[] not null default '{}' check (cardinality(spotlight_hidden) <= 200);

commit;
