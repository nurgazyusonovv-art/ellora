import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Серверде (Server Components, Server Actions, Route Handlers) колдонулуучу клиент. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component ичинде cookie жазууга болбойт — middleware сессияны жаңылайт.
          }
        },
      },
    },
  );
}
