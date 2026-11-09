export const STAGE_COINS = [5, 15, 10, 15, 10] as const;
export const LESSON_COINS = STAGE_COINS.reduce((a,b)=>a+b,0);
export type ShopSlot = "avatar" | "frame" | "title";
export type Wallet = { balance: number; earned_total: number };
export type ShopItem = { id: string; kind: ShopSlot; name: string; description: string; price: number; active: boolean };
export type Equipment = { slot: ShopSlot; item_id: string | null };
export type CoinEntry = { id: number; amount: number; reason: string; created_at: string };
export const SHOP_SLOTS: Record<ShopSlot,string> = { avatar: "Аватар", frame: "Алкак", title: "Аталыш" };
export const isShopSlot = (v: string): v is ShopSlot => v === "avatar" || v === "frame" || v === "title";
export function coinLevel(earned: number) {
 const total = Math.max(0,earned);
 return { level: Math.floor(total/100)+1, progress: total%100, remaining: 100-total%100 };
}
