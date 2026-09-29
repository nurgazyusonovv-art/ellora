import { createBrowserClient } from "@supabase/ssr";

/** Браузерде колдонулуучу клиент (сабак ойноткучу жоопторду ушул аркылуу сактайт). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
