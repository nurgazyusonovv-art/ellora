-- ellora: класстык рейтингди окуучуларга көрсөтүү (мугалим өчүрө алат)
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз. Кайра иштетсе да болот.

alter table public.classes add column if not exists show_leaderboard boolean not null default true;
