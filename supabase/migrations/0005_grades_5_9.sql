-- ellora: информатика 5–9-класстарда гана окутулат (10–11-класстарда азыр жок)
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз. Кайра иштетсе да болот.

-- 10–11-класстын КТП'лери болсо — өчүрүлөт; сабактардын классы тазаланат (сабактын өзү калат).
delete from public.ktp_plans where grade not between 5 and 9;
update public.lessons set grade = null where grade is not null and grade not between 5 and 9;

alter table public.ktp_plans drop constraint if exists ktp_plans_grade_check;
alter table public.ktp_plans add constraint ktp_plans_grade_check check (grade between 5 and 9);

alter table public.lessons drop constraint if exists lessons_grade_check;
alter table public.lessons add constraint lessons_grade_check check (grade is null or grade between 5 and 9);
