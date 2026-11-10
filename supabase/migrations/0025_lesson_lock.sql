-- Окуучулар жооп берген сабактын мазмуну тоңдурулат (0025).
-- Себеби: мазмун өзгөрсө, мурунку жооптор жаңы суроо/туура жооп менен салыштырылып, баа байкалбай өзгөрөт.
-- Мугалим мындай сабакты өзгөртүү үчүн көчүрмө түзөт (аталыш, класс, тема өзгөрө берет — мазмун гана бекитилет).
begin;

create schema if not exists private;

create or replace function private.guard_lesson_content() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.content is distinct from old.content and exists (
    select 1
    from public.assignments a
    join public.attempts t on t.assignment_id = a.id
    join public.answers r on r.attempt_id = t.id
    where a.lesson_id = old.id
  ) then
    raise exception 'lesson_locked' using errcode = 'P0001', hint = 'Окуучулар жооп берген сабактын мазмунун өзгөртүүгө болбойт. Көчүрмө түзүңүз.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_lesson_content() from public, anon, authenticated;

drop trigger if exists lessons_content_lock on public.lessons;
create trigger lessons_content_lock
  before update of content on public.lessons
  for each row execute function private.guard_lesson_content();

commit;
