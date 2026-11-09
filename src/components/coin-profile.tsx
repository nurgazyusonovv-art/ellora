import Link from "next/link";
import { cx, Progress } from "@/components/ui";
import { coinLevel, type Equipment, type ShopItem, type Wallet } from "@/lib/coins";

export function CoinIcon({className="size-5"}:{className?:string}) {
 return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M13.5 8.5h-2a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-2M12 7v2m0 7v1"/></svg>;
}
export function AvatarArt({id="",frame="",className="size-20"}:{id?:string;frame?:string;className?:string}){
 return <span className={cx("grid shrink-0 place-items-center rounded-2xl border-2 bg-surface p-3 text-accent",frame==="frame-amber"?"border-amber ring-4 ring-amber-soft":frame==="frame-lilac"?"border-lilac ring-4 ring-lilac-soft":"border-line",className)}>
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-full" aria-hidden>
   {id==="avatar-fox"?<><path d="m12 29-2-18 17 12h10l17-12-2 18-8 18-12 8-12-8Z"/><path d="m12 29 14 8 6 15 6-15 14-8M24 32h1m14 0h1M29 43h6l-3 4Z"/></>:id==="avatar-robot"?<><rect x="12" y="18" width="40" height="34" rx="9"/><path d="M32 18v-7M7 30v12m50-12v12M24 42h16"/><circle cx="32" cy="8" r="3"/><circle cx="23" cy="31" r="3"/><circle cx="41" cy="31" r="3"/></>:<><path d="M12 15h15a7 7 0 0 1 5 3 7 7 0 0 1 5-3h15v34H37a7 7 0 0 0-5 3 7 7 0 0 0-5-3H12ZM32 18v34M19 25h7m-7 8h7m12-8h7m-7 8h7"/></>}
  </svg>
 </span>;
}
export function ItemArt({item}:{item:ShopItem}){
 if(item.kind==="avatar")return <AvatarArt id={item.id}/>;
 if(item.kind==="frame")return <AvatarArt frame={item.id}/>;
 return <span className="flex min-h-20 items-center justify-center rounded-2xl bg-accent-soft px-4 text-center text-sm font-semibold text-accent border border-accent/20">{item.name}</span>;
}
export function CoinProfile({wallet,equipment,catalog,name,shopLink=true}:{wallet:Wallet;equipment:Equipment[];catalog:ShopItem[];name:string;shopLink?:boolean}){
 const equipped=(slot:string)=>equipment.find(e=>e.slot===slot)?.item_id??"";
 const title=catalog.find(i=>i.id===equipped("title"))?.name;
 const level=coinLevel(wallet.earned_total);
 return <section aria-label="Монета капчыгы" className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
  <div className="flex items-center gap-4"><AvatarArt id={equipped("avatar")} frame={equipped("frame")}/><div className="flex min-w-0 flex-1 flex-col gap-1"><p className="text-sm text-muted">Сенин оюн профилиң</p><h2 className="font-display text-lg font-semibold tracking-tight break-words">{name}</h2>{title&&<p className="text-sm font-semibold text-accent">{title}</p>}<span className="text-sm text-muted">{level.level}-деңгээл</span></div></div>
  <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-amber-soft p-4 text-amber border border-amber/25"><p className="text-xs font-semibold">Капчыкта</p><p className="mt-1 flex items-center gap-2 font-mono text-2xl font-medium tracking-tight"><CoinIcon/>{wallet.balance}</p><p className="text-xs">монета</p></div><div className="rounded-2xl bg-surface-2 p-4 border border-line"><p className="text-xs font-semibold text-muted">Жалпы топтодуң</p><p className="mt-1 font-mono text-2xl font-medium tracking-tight">{wallet.earned_total}</p><p className="text-xs text-muted">монета · коротсоң азайбайт</p></div></div>
  <div className="flex flex-col gap-2"><div className="flex justify-between gap-2 text-xs text-muted"><span>Кийинки деңгээлге {level.remaining} монета</span><span>{level.progress}/100</span></div><Progress value={level.progress}/></div>
  {shopLink&&<Link href="/student/shop" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white"><CoinIcon/>Дүкөнгө кирүү →</Link>}
  <p className="text-xs leading-relaxed text-muted">Монета — сабакты аткарганың үчүн сыйлык. Бааңа таасир этпейт.</p>
 </section>;
}
