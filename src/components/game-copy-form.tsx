"use client";
import {useActionState} from "react";
import {createGame} from "@/app/actions/games";
import type {FormState} from "@/app/actions/auth";
import {Button,FormError} from "./ui";
export function GameCopyForm({slug}:{slug:string}){
 const [state,action,pending]=useActionState<FormState,FormData>(createGame,{});
 return <form action={action}><input type="hidden" name="slug" value={slug}/><Button disabled={pending}>{pending?"Оюн даярдалууда…":"Оюнду көчүрүп, класска жөнөтүү"}</Button><FormError message={state?.error}/></form>;
}
