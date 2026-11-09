import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoinEntry, Equipment, ShopItem, Wallet } from "@/lib/coins";
/** Кадимки RLS клиент: ар бир окуучу өз капчыгын гана окуйт. */
export async function getCoinProfile(supabase: SupabaseClient, studentId: string) {
 const [wallet, equipment, titles] = await Promise.all([
  supabase.from("coin_wallets").select("balance,earned_total").eq("student_id",studentId).maybeSingle<Wallet>(),
  supabase.from("student_equipment").select("slot,item_id").eq("student_id",studentId).returns<Equipment[]>(),
  supabase.from("shop_items").select("id,kind,name,description,price,active").returns<ShopItem[]>(),
 ]);
 return { wallet: wallet.data ?? {balance:0,earned_total:0}, equipment: equipment.data ?? [], catalog: titles.data ?? [], available: !wallet.error && !equipment.error && !titles.error };
}
export async function getShop(supabase: SupabaseClient, studentId: string) {
 const [profile,owned,history]=await Promise.all([
  getCoinProfile(supabase,studentId),
  supabase.from("student_items").select("item_id").eq("student_id",studentId),
  supabase.from("coin_ledger").select("id,amount,reason,created_at").eq("student_id",studentId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(30).returns<CoinEntry[]>(),
 ]);
 return {...profile,available:profile.available&&!owned.error&&!history.error,owned:(owned.data??[]).map(x=>x.item_id as string),history:history.data??[]};
}
