"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isShopSlot } from "@/lib/coins";
export type ShopState = {error?:string;success?:string};
const ERRORS: Record<string,string> = {forbidden:"Бул аракет окуучу үчүн гана жеткиликтүү.",unavailable:"Бул буюм азыр жеткиликтүү эмес.",not_enough:"Монетаң жетишсиз. Сабактын бөлүктөрүн бүтүрүп топтой аласың.",already_owned:"Бул буюм сенде бар. Аны кайра сатып алуунун кереги жок.",not_owned:"Бул буюмду адегенде сатып ал."};
function refreshShop(){revalidatePath("/student/shop");revalidatePath("/student");}
export async function buyItem(_:ShopState,fd:FormData):Promise<ShopState>{
 const {supabase}=await requireRole("student");
 const item=String(fd.get("itemId")??"");
 if(!/^[a-z][a-z0-9-]{1,60}$/.test(item))return {error:"Буюмду туура танда."};
 // Баа, баланс жана окуучу id'си браузерден алынбайт. RPC бир бүтүмдө иштейт.
 const {data,error}=await supabase.rpc("buy_shop_item",{p_item:item});
 if(error)return {error:"Сатып алуу аяктаган жок. Балансыңды текшерип, кайра аракет кыл."};
 if(data!=="ok")return {error:ERRORS[String(data)]??"Сатып алуу аяктаган жок."};
 refreshShop();return {success:"Буюм сеники болду! Эми аны профилиңе танда."};
}
export async function equipItem(_:ShopState,fd:FormData):Promise<ShopState>{
 const {supabase}=await requireRole("student");
 const slot=String(fd.get("slot")??"");const item=String(fd.get("itemId")??"");
 if(!isShopSlot(slot)||(item&&!/^[a-z][a-z0-9-]{1,60}$/.test(item)))return {error:"Буюмду туура танда."};
 const {data,error}=await supabase.rpc("equip_shop_item",{p_slot:slot,p_item:item||null});
 if(error)return {error:"Профилиң жаңырган жок. Кайра аракет кыл."};
 if(data!=="ok")return {error:ERRORS[String(data)]??"Профилиң жаңырган жок."};
 refreshShop();return {success:item?"Буюм профилиңе тандалды.":"Кадимки көрүнүш тандалды."};
}
