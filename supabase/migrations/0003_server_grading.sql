-- ellora: жоопторду серверде баалоо
-- Мындан ары окуучу answers жана attempts таблицаларына түз жаза албайт — жоопту сервер баалайт
-- (src/app/actions/student.ts: submitAnswer, completeStage) жана service role менен жазат.
-- Supabase → SQL Editor'го толугу менен көчүрүп, Run басыңыз.

-- answers: окуучу өз жоопторун көрөт гана
drop policy if exists "окуучу өз жоопторун башкарат" on public.answers;
create policy "окуучу өз жоопторун көрөт" on public.answers
  for select using (exists (select 1 from public.attempts t where t.id = attempt_id and t.student_id = auth.uid()));

-- attempts: окуучу аракетти өзгөртө албайт (xp, бөлүк, натыйжа — серверде)
drop policy if exists "окуучу аракетин жаңылайт" on public.attempts;

-- attempts: жаңы аракет башталгыч маанилер менен гана түзүлөт
drop policy if exists "окуучу аракет баштайт" on public.attempts;
create policy "окуучу аракет баштайт" on public.attempts
  for insert with check (
    student_id = auth.uid()
    and public.can_see_assignment(assignment_id)
    and current_stage = 0
    and xp = 0
    and exit_score is null
    and exit_total is null
    and confidence is null
    and finished_at is null
  );
