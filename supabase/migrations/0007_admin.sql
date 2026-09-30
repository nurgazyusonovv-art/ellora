-- ellora: платформанын админи
-- Админ — мугалим бойдон калат, ага кошумча /admin панели ачылат.
-- Белгини колдонуучу өзү коё албайт: profiles таблицасында update саясаты жок (сервер гана, service role менен).
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз. Кайра иштетсе да болот.

alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Биринчи админди дайындоо (email'иңизди жазып, өзүнчө иштетиңиз — бул сапты репого сактабаңыз):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'сиздин@email');
