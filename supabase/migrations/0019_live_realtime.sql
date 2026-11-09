-- Жандуу сабак: lesson_sessions өзгөрүүлөрү Supabase Realtime (Postgres Changes) аркылуу жөнөтүлөт.
-- Окуучу/мугалим өзгөрүүнү RLS боюнча гана алат ("класстын сессиясын көрүү", 0008) — башка класстыкын көрбөйт.
-- Realtime жок база (локалдык тест) үчүн коопсуз: жарыялоо жок болсо эч нерсе кылбайт.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lesson_sessions'
     ) then
    alter publication supabase_realtime add table public.lesson_sessions;
  end if;
end
$$;
