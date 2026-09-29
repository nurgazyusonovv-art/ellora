import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata = { title: "Барак табылган жок" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <Logo />
      <span className="font-display text-6xl font-bold text-accent">404</span>
      <h1 className="font-display text-xl font-bold">Мындай барак табылган жок</h1>
      <p className="text-muted">
        Шилтеме ката болушу мүмкүн, же бул барак өчүрүлгөн. Мисалы, мугалим тапшырманы же сабакты өчүрсө, анын шилтемеси иштебей калат.
      </p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-5 font-semibold text-white hover:bg-accent-dark">
        Башкы бетке
      </Link>
    </main>
  );
}
