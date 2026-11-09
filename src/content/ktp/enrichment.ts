import type {Ktp,KtpSection,KtpTopic} from "./index";
import type {SkillId} from "@/lib/skills";
// Ар сап түпнускадагы бир тема. Аталыш/ирет өзгөрсө картаны кайра кароо талап кылынат.
const skills7:SkillId[][][]=[
 [["logic"],["algorithm","logic"],["logic","conditions"],["logic","modeling"]],
 [["logic"],["logic","explanation"],["logic","algorithm"],["logic","modeling"],["logic","testing"]],
 [["modeling","information"],["modeling","spreadsheets"],["modeling","algorithm"],["modeling","testing"]],
 [["computing","information"],["computing","safety"],["computing","safety"]],
 [["computing"],["computing"],["computing","networks"],["computing","logic"],["computing","testing"]],
 [["ai_literacy"],["ai_literacy","explanation"],["ai_literacy","safety"],["ai_literacy","testing"],["ai_literacy","explanation"]],
 [["algorithm","debugging"],["variables"],["variables"],["variables","testing"],["conditions","testing"],["loops","testing"],["algorithm","debugging","testing"]],
 [["multimedia"],["multimedia"],["multimedia","explanation"]],
 [["multimedia"],["multimedia","safety"],["multimedia"],["multimedia","explanation"]],
 [["spreadsheets"],["spreadsheets","explanation"],["information","spreadsheets"],["spreadsheets","testing"]],
 [["networks","safety"],["information","networks"],["networks","safety"]],
 [["networks","information"],["networks","information"],["networks","safety"],["networks","information","safety"]],
 [["networks","safety"],["safety"],["safety"],["safety","explanation"]],
];
const skills8:SkillId[][][]=[
 [["number_systems"],["number_systems","algorithm"],["number_systems","testing"],["number_systems","computing"],["number_systems","testing"]],
 [["logic","modeling"],["logic","algorithm"],["logic","testing"]],
 [["modeling"],["modeling","computing"],["modeling","testing"],["modeling","information"]],
 [["networks"],["networks","computing"],["networks","algorithm"],["networks","information"],["information","safety","explanation"]],
 [["computing","information"],["computing","explanation"],["computing","safety"]],
 [["ai_literacy","explanation"],["ai_literacy","information"],["safety","multimedia"],["ai_literacy","safety"]],
 [["conditions","logic"],["variables","information"],["loops","testing"],["algorithm","variables"],["variables","testing"],["algorithm","multimedia"],["algorithm","debugging","testing"]],
 [["databases","information"],["databases","computing"],["databases","information"],["databases","logic"],["databases","testing"]],
 [["web","information"],["web","multimedia"],["web","computing"],["web","testing","safety"]],
 [["safety"],["safety"],["safety","explanation"],["safety","networks"],["safety","testing"]],
];
// Практикалык иш катары түпнускада аталган темалар гана; «практикалык маселелер» өзүнчө сабак түрү эмес.
const practical7:Record<string,string>={
 "0:3":"Венн диаграммасы жана чечимдин түшүндүрмөсү", "1:4":"Чындык таблицасы жана текшерилген логикалык чечим", "2:3":"Объекттин модели жана сынактын жыйынтыгы", "3:2":"Программаны коопсуз орнотуу/колдонуу кадамдары", "4:4":"Компьютер менен мобилдик түзмөктүн салыштыруу схемасы", "5:4":"ЖИ жообун башка булак менен салыштыруу жана чектөөсүн түшүндүрүү", "6:6":"Сыноодон өткөн программа жана текшерүү мисалдары", "7:2":"Монтаждалган кыска видео жана колдонулган булактардын тизмеси", "8:3":"Мультимедиалык долбоор жана чечимдеринин негиздемеси", "9:3":"Формула/диаграммасы бар таблица жана маалыматтан жыйынтык", "11:3":"Булуттагы документ жана бөлүшүү укуктарынын түшүндүрмөсү", "12:3":"Коркунучтарды талдоо жана коргонуу кадамдары",
};
const practical8:Record<string,string>={"0:4":"Сан системаларын которуу жана кайра текшерүү", "1:2":"Чындык таблицасы жана логикалык схема", "2:3":"Маалыматтык модель жана божомолду сыноо", "3:4":"Издөө сурамдары жана булактардын ишенимдүүлүгүн салыштыруу", "6:6":"Маалымат түзүмдөрүн колдонгон, текшерилген графикалык программа", "7:4":"Маалымат базасы жана текшерилген SQL суроо-талаптары", "8:3":"Мобилдик көрүнүшү текшерилген веб-баракча жана булактар"};
export function enrichKtp(plan:Ktp):Ktp {
 if(plan.grade!==7&&plan.grade!==8)throw Error("Бул класстын көндүм картасы карала элек.");
 const titles=plan.sections.flatMap(s=>s.topics.map(t=>t.title)).join("\n");let fingerprint=0;for(let i=0;i<titles.length;i++)fingerprint=(Math.imul(fingerprint,31)+titles.charCodeAt(i))>>>0;
 if(fingerprint!==(plan.grade===7?1278248147:1117947439))throw Error("КТП темалары өзгөргөн: көндүм картасын кайра караңыз.");
 const map=plan.grade===7?skills7:skills8,practice=plan.grade===7?practical7:practical8;
 if(map.length!==plan.sections.length||plan.sections.some((s,i)=>s.topics.length!==map[i].length))throw Error("КТП темаларынын көндүм картасын жаңыртыңыз.");
 return {...plan,sections:plan.sections.map((s,si)=>({...s,topics:s.topics.map((t,ti)=>({...t,skills:[...map[si][ti]],kind:practice[`${si}:${ti}`]?"practical":"lesson",...(practice[`${si}:${ti}`]?{product:practice[`${si}:${ti}`]}:{})}))}))};
}
const quarterSuggestions:Record<number,{focus:string;skills:SkillId[];product:string}[]>={
 7:[{focus:"Логика жана моделдөө",skills:["logic","modeling","explanation"],product:"Жаңы кырдаалга логикалык модель түзүп, чечимин негиздөө"},{focus:"Алгоритм жана программа",skills:["algorithm","conditions","testing"],product:"Жаңы маселе үчүн программа түзүү жана чек маанилерин текшерүү"},{focus:"Цикл жана мультимедиа",skills:["loops","multimedia","explanation"],product:"Өтүлгөн мазмунга ылайык программа же мультимедиалык продукт жана жеке түшүндүрмө"},{focus:"Таблица жана санариптик коопсуздук",skills:["spreadsheets","safety","explanation"],product:"Башка маалымат менен формулалуу таблица жана коопсуз иштөө чечиминин негиздемеси"}],
 8:[{focus:"Сан системалары жана логика",skills:["number_systems","logic","testing"],product:"Сандарды которуу жана логикалык чечимди башка мисалда текшерүү"},{focus:"Моделдөө жана тармак",skills:["modeling","networks","explanation"],product:"Процесстин модели жана тармак боюнча чечимдин далили"},{focus:"Программа жана маалымат түзүмдөрү",skills:["algorithm","variables","testing"],product:"Жаңы маалыматты иштеткен программа жана сыноолор"},{focus:"Маалымат базасы жана веб",skills:["databases","web","safety"],product:"Маалыматка суроо-талап жана веб-баракча, коопсуздук чечимдери"}],
};
export function quarterlyTopics(grade:number):KtpTopic[]{return (quarterSuggestions[grade]??Array.from({length:4},()=>({focus:"Өтүлгөн темалар",skills:["explanation"] as SkillId[],product:"Өтүлгөн максаттарга ылайык жеке практикалык иш жана түшүндүрмө"}))).map((s,i)=>({title:`${i+1}-чейректик иш: ${s.focus}`,kind:"quarterly",quarter:i+1,skills:[...s.skills],product:s.product}));}
/** Учурдагы пландын ордун/саатын өзгөртпөйт; мугалим сунушту өзү жайгаштырат. */
export function addQuarterlyWorks(sections:KtpSection[],grade:number):KtpSection[]{const topics=quarterlyTopics(grade).filter(t=>!sections.some(s=>s.topics.some(x=>x.kind==="quarterly"&&x.quarter===t.quarter||x.title===t.title)));return topics.length?[...sections,{title:"Чейректик иштер — ылайыктоо үчүн сунуштар",hours:0,topics}]:sections;}
export function suggestMissingSkills(sections:KtpSection[],template:Ktp|undefined):KtpSection[]{const topics=template?.sections.flatMap(s=>s.topics)??[];return sections.map(s=>({...s,topics:s.topics.map(t=>{const matches=topics.filter(x=>x.title===t.title);return t.skills===undefined&&matches.length===1?{...t,skills:[...(matches[0].skills??[])]}:t;})}));}

/** Биринчи серия кошулганда React сабын кайра түзбөш үчүн, редактордо гана жетишпеген IDлер берилет. */
export function ensureKtpIds(sections:KtpSection[],newId:()=>string=()=>crypto.randomUUID()):KtpSection[]{
 const used=new Set(sections.flatMap(s=>s.topics.flatMap(t=>[...(t.id?[t.id]:[]),...(t.sessions??[]).map(x=>x.id)])));
 return sections.map(s=>({...s,topics:s.topics.map(t=>{if(t.id)return t;let id=newId();while(used.has(id))id=newId();used.add(id);return {...t,id};})}));
}
