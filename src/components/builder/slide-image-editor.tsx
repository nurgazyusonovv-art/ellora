"use client";
import Image from "next/image";
import {useState} from "react";
import type {SlideImage} from "@/lib/lesson-types";
import {MAX_SLIDE_IMAGE_BYTES,validSlideImage} from "@/lib/presentation";
const cls="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm";
export function SlideImageEditor({image,onChange}:{image?:SlideImage;onChange:(image:SlideImage|undefined)=>void}) {
 const [error,setError]=useState("");const [pending,setPending]=useState<string>();const [loading,setLoading]=useState(false);
 return <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-surface-2 p-3 border border-line"><label className="text-sm font-semibold">Сүрөт кошуу (PNG/JPEG/WebP, 100 КБга чейин)<input className={cls} type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={async e=>{
 const file=e.currentTarget.files?.[0];e.currentTarget.value="";setError("");setPending(undefined);if(!file)return;
 if(file.size>MAX_SLIDE_IMAGE_BYTES){setError("Сүрөт 100 КБдан ашпасын. Кичирээк сүрөт тандаңыз.");return;}
 setLoading(true);
 try {const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});
 if(!validSlideImage({src,alt:"",caption:"",credit:""}))throw Error();
 const loaded=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new window.Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
 if(loaded.naturalWidth>4096 || loaded.naturalHeight>4096) {setError("Сүрөттүн туурасы жана бийиктиги 4096дан ашпасын.");return;}setPending(src);
 }catch{setError("Сүрөт ачылган жок. Башка PNG, JPEG же WebP тандаңыз.");}finally{setLoading(false);}
 }}/></label>
 {loading && <p role="status" className="text-sm text-muted">Сүрөт текшерилүүдө…</p>}
 {pending && <><Image unoptimized width={640} height={400} src={pending} alt="Тандалган сүрөттүн алдын ала көрүнүшү" className="h-auto max-h-40 w-auto max-w-full object-contain"/><button type="button" className="min-h-11 rounded-xl px-3 font-semibold text-accent" onClick={()=>{onChange({src:pending,alt:image?.alt??"",caption:image?.caption??"",credit:image?.credit??""});setPending(undefined);}}>Слайдга колдонуу</button></>}
 {image && <><Image unoptimized width={640} height={400} src={image.src} alt={image.alt} className="h-auto max-h-40 w-auto max-w-full object-contain"/>{([['alt','Сүрөттө эмне көрсөтүлгөн? (милдеттүү)'],['caption','Сүрөттүн түшүндүрмөсү'],['credit','Булак же автор']] as const).map(([field,label])=><label key={field} className="text-sm">{label}<input className={cls} maxLength={300} value={image[field]} onChange={e=>onChange({...image,[field]:e.target.value})}/></label>)}<button type="button" className="min-h-11 self-start px-3 text-sm text-bad" onClick={()=>onChange(undefined)}>Сүрөттү алып салуу</button></>}
 <p className="text-xs text-muted">Өзүңүзгө таандык же колдонууга уруксат берилген сүрөттү тандаңыз. Сүрөт сабак менен сакталат жана сабакты көргөндөргө жеткиликтүү болот.</p>{error && <p role="alert" className="text-sm text-bad">{error}</p>}
 </div>;
}
