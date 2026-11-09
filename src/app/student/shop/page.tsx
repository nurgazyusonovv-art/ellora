import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getShop } from "@/lib/coin-data";
import { SHOP_SLOTS,STAGE_COINS,type ShopSlot } from "@/lib/coins";
import { CoinProfile,CoinIcon,ItemArt } from "@/components/coin-profile";
import { BuyItemForm,EquipItemForm } from "@/components/shop-forms";
import { FIVE_E_META,STAGE_KEYS } from "@/lib/lesson-types";
export const metadata={title:"Монета дүкөнү"};
export default async function ShopPage(){
 const {supabase,profile}=await requireRole("student");
 const shop=await getShop(supabase,profile.id);
 return <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
  <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Сабактарыма кайтуу</Link>
  <div><p className="text-sm font-semibold text-accent">Сабак өт · монета топто · профилиңди кооздо</p><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Монета дүкөнү</h1></div>
  {!shop.available?<p role="alert" className="rounded-2xl bg-amber-soft p-5 text-amber border border-amber/25">Дүкөн азырынча жеткиликтүү эмес. Кийин кайра кир.</p>:<>
   <CoinProfile {...shop} name={profile.full_name} shopLink={false}/>
   <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"><h2 className="font-semibold">Монета кантип топтолот?</h2><p className="text-sm text-muted">Ар бир бөлүктү биринчи жолу бүтүргөндө сыйлык аласың. Бир сабактан 55 монетага чейин. Ошол сабакты башка класстан же кайра ачсаң, сыйлык кайталанбайт.</p><div className="grid gap-2 sm:grid-cols-5">{STAGE_KEYS.map((k,i)=><div key={k} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-xs sm:flex-col border border-line"><span>{FIVE_E_META[k].label}</span><b className="flex items-center gap-1 text-amber"><CoinIcon className="size-4"/>+{STAGE_COINS[i]}</b></div>)}</div></section>
   {(Object.keys(SHOP_SLOTS) as ShopSlot[]).map(slot=><section key={slot} className="flex flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{SHOP_SLOTS[slot]}</h2>{shop.equipment.some(e=>e.slot===slot&&e.item_id)&&<EquipItemForm slot={slot}/>}</div><div className="grid gap-4 sm:grid-cols-2">{shop.catalog.filter(i=>i.kind===slot&&(i.active||shop.owned.includes(i.id))).map(item=>{
    const owned=shop.owned.includes(item.id);const selected=shop.equipment.some(e=>e.item_id===item.id);
    return <article key={item.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5"><div className="flex items-center gap-4"><ItemArt item={item}/><div className="min-w-0"><h3 className="font-semibold break-words">{item.name}</h3><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber"><CoinIcon className="size-4"/>{owned?"Сенде бар":`${item.price} монета`}</p></div></div><p className="flex-1 text-sm text-muted">{item.description}</p>{owned?<EquipItemForm slot={slot} itemId={item.id} selected={selected}/>:<BuyItemForm itemId={item.id} price={item.price} balance={shop.wallet.balance}/>}</article>;
   })}</div></section>)}
   <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"><h2 className="font-semibold">Акыркы монета тарыхы</h2>{!shop.history.length?<p className="text-sm text-muted">Алгачкы сыйлыгыңды сабактын бөлүгүн бүтүргөндө аласың.</p>:<ul className="divide-y divide-line">{shop.history.map(e=><li key={e.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm break-words">{e.reason}</p><time className="text-xs text-muted" dateTime={e.created_at}>{new Date(e.created_at).toLocaleDateString("ru-RU",{timeZone:"Asia/Bishkek"})}</time></div><b className={e.amount>0?"shrink-0 font-mono text-good":"shrink-0 font-mono text-amber"}>{e.amount>0?"+":""}{e.amount}</b></li>)}</ul>}</section>
  </>}
 </main>;
}
