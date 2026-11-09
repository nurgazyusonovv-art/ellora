"use client";
import { useActionState } from "react";
import { buyItem,equipItem,type ShopState } from "@/app/actions/shop";
import { Button,FormError } from "@/components/ui";
import {SHOP_SLOTS,type ShopSlot} from "@/lib/coins";
export function BuyItemForm({itemId,price,balance}:{itemId:string;price:number;balance:number}){
 const [state,action,pending]=useActionState<ShopState,FormData>(buyItem,{});
 const missing=Math.max(0,price-balance);
 return <form action={action} className="flex flex-col gap-2"><input type="hidden" name="itemId" value={itemId}/><Button disabled={pending||missing>0} className="w-full">{pending?"Сатып алынууда…":missing?`Дагы ${missing} монета керек`:`${price} монетага сатып алуу`}</Button><FormError message={state.error}/>{state.success&&<p role="status" className="text-sm text-good">{state.success}</p>}</form>;
}
export function EquipItemForm({slot,itemId,selected=false}:{slot:ShopSlot;itemId?:string;selected?:boolean}){
 const [state,action,pending]=useActionState<ShopState,FormData>(equipItem,{});
 return <form action={action} className="flex flex-col gap-2"><input type="hidden" name="slot" value={slot}/><input type="hidden" name="itemId" value={itemId??""}/><Button aria-label={`${SHOP_SLOTS[slot]}: ${selected?"тандалды":itemId?"профилге тандоо":"кадимки көрүнүш"}`} variant="secondary" disabled={pending||selected} className="w-full">{pending?"Сакталууда…":selected?"Тандалды":itemId?"Профилге тандоо":"Кадимки көрүнүш"}</Button><FormError message={state.error}/>{state.success&&<p role="status" className="text-sm text-good">{state.success}</p>}</form>;
}
