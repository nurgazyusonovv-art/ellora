import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service role менен иштеген клиент. RLS'ти айланып өтөт, ошондуктан
 * серверде гана жана өтө чектелген иштер үчүн колдонулат (окуучу аккаунтун түзүү).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY коюлган эмес");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
