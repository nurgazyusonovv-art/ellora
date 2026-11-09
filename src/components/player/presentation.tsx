"use client";
import Image from "next/image";
import { useState } from "react";
import type { PresentationBlock } from "@/lib/lesson-types";
import { Button, RichText } from "@/components/ui";
const paths={idea:"M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0l-1 2H9z",computer:"M3 3h18v14H3zM8 21h8M12 17v4",table:"M3 3h18v18H3zM3 9h18M9 3v18M3 15h18",check:"M4 12l5 5L20 6"};
export function Presentation({block}:{block:PresentationBlock}) {
 const [index,setIndex]=useState(0);const slide=block.slides[Math.min(index,block.slides.length-1)];
 if(!slide) return null;
 return <section aria-label={block.title} className="min-w-0" onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==="ArrowRight"){e.preventDefault();setIndex(i=>Math.min(i+1,block.slides.length-1));}if(e.key==="ArrowLeft"){e.preventDefault();setIndex(i=>Math.max(0,i-1));}}} tabIndex={0}>
  <p className="mb-3 text-sm text-muted">{block.title} · {index+1}/{block.slides.length}</p>
  <div aria-live="polite" className="flex min-h-80 min-w-0 flex-col gap-5 rounded-2xl bg-accent-soft p-5 sm:p-8 border border-accent/20">
   <svg className="size-12 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={paths[slide.icon]} /></svg>
   <h3 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">{slide.title}</h3><RichText text={slide.body} />
   {slide.image && <figure className="min-w-0"><Image unoptimized width={640} height={400} src={slide.image.src} alt={slide.image.alt} className="mx-auto h-auto max-h-80 w-auto max-w-full rounded-xl object-contain"/>{(slide.image.caption || slide.image.credit) && <figcaption className="mt-2 break-words text-sm text-muted">{slide.image.caption}{slide.image.credit && <span className="block">Булак: {slide.image.credit}</span>}</figcaption>}</figure>}
   <ol aria-label="Түшүндүрмө схема" className="flex flex-col gap-3 sm:flex-row">{slide.diagram.map((label,i)=><li key={i} className="flex min-w-0 flex-1 items-center gap-2"><span aria-hidden="true" className="text-accent">{i+1} →</span><span className="min-w-0 flex-1 break-words rounded-xl border border-line bg-surface p-3 text-sm font-semibold">{label}</span></li>)}</ol>
   {slide.question && <p className="break-words border-t border-line pt-4 font-semibold">Ойлонуп көр: {slide.question}</p>}
  </div>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="ghost" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Мурунку</Button><Button type="button" disabled={index>=block.slides.length-1} onClick={()=>setIndex(i=>Math.min(i+1,block.slides.length-1))}>Кийинки →</Button></div>
 </section>;
}
