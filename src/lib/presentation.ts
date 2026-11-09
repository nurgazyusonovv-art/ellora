import type { LessonSlide } from "./lesson-types";
export const SLIDE_ICONS = {idea:"Идея",computer:"Компьютер",table:"Таблица",check:"Текшерүү"} as const;
export function validSlides(value: unknown): value is LessonSlide[] {
 return Array.isArray(value) && value.length>=5 && value.length<=6 && value.every(s=>s && typeof s.title==="string" && s.title.length<=150 && typeof s.body==="string" && s.body.length<=600 && (s.image === undefined || validSlideImage(s.image)) && Object.hasOwn(SLIDE_ICONS,s.icon) && typeof s.question==="string" && s.question.length<=300 && Array.isArray(s.diagram) && s.diagram.length>=2 && s.diagram.length<=4 && s.diagram.every((v:unknown)=>typeof v==="string" && v.length<=80));
}

/** Чакан растр гана; тышкы URL/SVG/HTML кабыл алынбайт. */
export const MAX_SLIDE_IMAGE_BYTES=100*1024;
export function validSlideImage(value: unknown): value is import("./lesson-types").SlideImage {
 if(!value || typeof value!=="object") return false;
 const image=value as Record<string,unknown>;
 if(typeof image.src!=="string" || image.src.length>Math.ceil(MAX_SLIDE_IMAGE_BYTES/3)*4+40) return false;
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.src);
 if(!match || match[2].length%4!==0) return false;
 const bytes=match[2].length*3/4-(match[2].endsWith("==")?2:match[2].endsWith("=")?1:0);
 const magic=match[1]==="png"?"iVBORw0KGgo":match[1]==="jpeg"?"/9j/":"UklGR";
 return bytes<=MAX_SLIDE_IMAGE_BYTES && match[2].startsWith(magic) && typeof image.alt==="string" && image.alt.length<=300 && typeof image.caption==="string" && image.caption.length<=300 && typeof image.credit==="string" && image.credit.length<=300;
}
