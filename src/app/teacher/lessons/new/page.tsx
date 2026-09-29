import { Card, PageTitle } from "@/components/ui";
import { NewLessonForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";
import { getPickerPlans } from "@/lib/ktp";

export const metadata = { title: "Жаңы сабак" };

export default async function NewLessonPage() {
  const { supabase } = await requireRole("teacher");
  const plans = await getPickerPlans(supabase);
  return (
    <>
      <PageTitle eyebrow="Сабак конструктору" title="Жаңы сабак" />
      <Card className="flex max-w-xl flex-col gap-4">
        <p className="text-muted">
          Сабак 5 бөлүктөн турат: Discover, Learning, Practice, Бышыктоо жана Exit ticket. Класс жана КТП боюнча теманы тандаңыз, блокторду
          кийинки бетте кошосуз.
        </p>
        <NewLessonForm plans={plans} />
      </Card>
    </>
  );
}
