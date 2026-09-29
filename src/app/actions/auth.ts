"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeUsername, studentEmail } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function teacherSignUp(_: FormState, fd: FormData): Promise<FormState> {
  const full_name = str(fd, "full_name");
  const school = str(fd, "school");
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!full_name || !email) return { error: "Аты-жөнүңүздү жана email'иңизди жазыңыз." };
  if (password.length < 8) return { error: "Сырсөз кеминде 8 белгиден турушу керек." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: "teacher", full_name, school } },
  });
  if (error) return { error: error.message.includes("registered") ? "Бул email менен аккаунт мурун түзүлгөн." : error.message };
  if (!data.session) redirect("/login?check_email=1");
  redirect("/teacher");
}

export async function teacherSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: str(fd, "email"),
    password: String(fd.get("password") ?? ""),
  });
  if (error || !auth.user) return { error: "Email же сырсөз туура эмес." };
  const { data } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  redirect(data?.role === "student" ? "/student" : "/teacher");
}

export async function studentSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const username = str(fd, "username").toLowerCase();
  if (!username) return { error: "Логиниңизди жазыңыз." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: studentEmail(username),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: "Логин же сырсөз туура эмес. Унутуп калсаңыз, мугалимиңизге кайрылыңыз." };
  redirect("/student");
}

/** Жаңы окуучу класс коду менен катталат: аккаунт түзүлөт, класска кошулат жана кирет. */
export async function studentJoin(_: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, "code").toUpperCase();
  const full_name = str(fd, "full_name");
  const password = String(fd.get("password") ?? "");
  if (!code || !full_name) return { error: "Класс кодун жана аты-жөнүңдү жаз." };
  if (full_name.split(/\s+/).length < 2) return { error: "Атыңды жана фамилияңды толук жаз." };
  if (password.length < 6) return { error: "Сырсөз кеминде 6 белгиден турушу керек." };

  const admin = createAdminClient();
  const { data: cls } = await admin.from("classes").select("id").eq("join_code", code).maybeSingle();
  if (!cls) return { error: "Мындай коду бар класс табылган жок. Кодду мугалимиңден текшер." };

  // Окуучу /join'га кайра кирсе, экинчи аккаунт түзүлбөсүн — логини менен кирсин.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  const { data: members } = await admin
    .from("class_members")
    .select("profiles(full_name, username)")
    .eq("class_id", cls.id);
  const same = members
    ?.flatMap((m) => m.profiles ?? [])
    .find((p) => norm(p.full_name) === norm(full_name));
  if (same)
    return {
      error: `Бул класста «${same.full_name}» мурунтан бар, логини: ${same.username}. «Кирүү» баскычын басып, ошол логин менен кир. Сырсөздү унутсаң, мугалимиңе кайрыл. Эгер сен башка окуучу болсоң, атыңа атаңдын атынын биринчи тамгасын кош.`,
    };

  let username = "";
  let userId = "";
  for (let i = 0; i < 5 && !userId; i++) {
    username = makeUsername(full_name);
    const { data, error } = await admin.auth.admin.createUser({
      email: studentEmail(username),
      password,
      email_confirm: true,
      user_metadata: { role: "student", full_name, username },
    });
    if (data.user) userId = data.user.id;
    else if (error && !/already|exists|registered/i.test(error.message)) return { error: error.message };
  }
  if (!userId) return { error: "Аккаунт түзүлгөн жок. Кайра аракет кылып көр." };

  await admin.from("class_members").insert({ class_id: cls.id, student_id: userId });

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: studentEmail(username), password });
  redirect(`/student?welcome=${encodeURIComponent(username)}`);
}

/** Кирген окуучу дагы бир класска кошулат. */
export async function joinAnotherClass(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_class", { p_code: str(fd, "code") });
  if (error) return { error: error.message.includes("табылган жок") ? "Мындай коду бар класс табылган жок." : error.message };
  redirect("/student");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
