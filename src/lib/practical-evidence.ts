import type {Block} from "./lesson-types";
import {shufflePerm,parsonsSeed} from "./student-view";
import {sheetCoord,sheetValue,type Cells} from "./sheet";
export type PracticalSnapshot={version:1;type:"matching"|"ordering"|"classification";items:string[];choices:string[]}|{version:1;type:"spreadsheet";rows:number;columns:number;targets:{cell:string;formula:boolean}[]};
export type PracticalEvidence={title:string;rows:{label:string;answer:string;reference?:string}[];note:string};
type Answer={attempt_id:string;response:unknown};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
/** Окуучуга ачык болгон гана мазмун; туура категория/жуп/формула бул көчүрмөгө кирбейт. */
export function practicalSnapshot(b:Block,attemptId:string):PracticalSnapshot|undefined {
 if(b.type==="spreadsheet")return {version:1,type:b.type,rows:b.rows,columns:b.columns,targets:b.checks.map(c=>({cell:c.cell,formula:c.formula}))};
 if(b.type==="classification"){const perm=shufflePerm(b.items.length,parsonsSeed(b.id,attemptId));return {version:1,type:b.type,items:perm.map(i=>b.items[i].text),choices:[...b.categories]};}
 if(b.type==="matching"){const perm=shufflePerm(b.pairs.length,parsonsSeed(b.id,attemptId));return {version:1,type:b.type,items:b.pairs.map(p=>p.left),choices:perm.map(i=>b.pairs[i].right)};}
 if(b.type==="ordering"){const perm=shufflePerm(b.steps.length,parsonsSeed(b.id,attemptId));return {version:1,type:b.type,items:perm.map(i=>b.steps[i]),choices:[]};}
}
function readSnapshot(raw:unknown,b:Block):PracticalSnapshot|undefined {
 const s=object(raw),texts=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&Array.from(v).every(x=>typeof x==="string"&&x.length<=500);
 if(s.version!==1||s.type!==b.type)return;
 if(s.type==="spreadsheet"){
  if(!Number.isInteger(s.rows)||!Number.isInteger(s.columns)||(s.rows as number)<3||(s.rows as number)>12||(s.columns as number)<3||(s.columns as number)>8||!Array.isArray(s.targets)||s.targets.length>8||s.targets.some(t=>!t||typeof t!=="object"||typeof t.cell!=="string"||!sheetCoord(t.cell,s.rows as number,s.columns as number)||typeof t.formula!=="boolean"))return;
  return s as unknown as PracticalSnapshot;
 }
 if(!["matching","ordering","classification"].includes(String(s.type))||!texts(s.items,12)||!(s.items as string[]).length||!texts(s.choices,12))return;
 return s as unknown as PracticalSnapshot;
}
const pick=(xs:string[],value:unknown)=>typeof value==="number"&&Number.isInteger(value)&&value>=0&&value<xs.length?xs[value]:"Белгисиз же берилбеген тандоо";
export function practicalEvidence(b:Block,a:Answer):PracticalEvidence|undefined {
 const current=practicalSnapshot(b,a.attempt_id);if(!current)return;
 const response=object(a.response),stored=readSnapshot(response.task,b),snapshot=stored??current;
 const comparable=JSON.stringify(snapshot)===JSON.stringify(current);
 const note=(!stored?"Бул эски жоопто мурунку объекттердин аттары сакталган эмес; аттар учурдагы сабак боюнча чечмеленди. ":!comparable?"Тапшырманын көрүнгөн мазмуну өзгөргөн; азыркы эталон көрсөтүлгөн жок. ":"Объекттер жооп тапшырылгандагы көрүнүш боюнча көрсөтүлдү. ")+"Эталон азыркы сабактан алынат. Бул көрүнүш сакталган бааны же аракет санын өзгөртпөйт.";
 if(snapshot.type==="classification"&&b.type==="classification"){
  const values=Array.isArray(response.groups)?response.groups:[],perm=shufflePerm(b.items.length,parsonsSeed(b.id,a.attempt_id));
  return {title:"Объект → тандалган категория",rows:snapshot.items.map((label,i)=>({label,answer:pick(snapshot.choices,values[i]),...(comparable?{reference:b.categories[b.items[perm[i]].category]}:{})})),note};
 }
 if(snapshot.type==="matching"&&b.type==="matching"){
  const values=Array.isArray(response.picks)?response.picks:[];
  return {title:"Окуучу түзгөн байланыштар",rows:snapshot.items.map((label,i)=>({label,answer:pick(snapshot.choices,values[i]),...(comparable?{reference:b.pairs[i].right}:{})})),note};
 }
 if(snapshot.type==="ordering"&&b.type==="ordering"){
  const values=Array.isArray(response.order)?response.order:[];
  return {title:"Окуучу тандаган кадамдар",rows:snapshot.items.map((_,i)=>({label:`${i+1}-орун`,answer:pick(snapshot.items,values[i]),...(comparable?{reference:b.steps[i]}:{})})),note};
 }
 if(snapshot.type==="spreadsheet"&&b.type==="spreadsheet"){
  const raw=object(response.cells),cells:Cells=Object.fromEntries(Object.entries(raw).filter(([key,v])=>sheetCoord(key,snapshot.rows,snapshot.columns)&&typeof v==="string"&&v.length<=200)) as Cells;
  const keys=[...new Set([...Object.keys(cells).filter(k=>cells[k].trim()),...snapshot.targets.map(t=>t.cell)])].sort((a,b)=>{const x=sheetCoord(a,snapshot.rows,snapshot.columns)!,y=sheetCoord(b,snapshot.rows,snapshot.columns)!;return x[0]-y[0]||x[1]-y[1];});
  return {title:"Сакталган уячалар жана формулалар",rows:keys.map(key=>{const text=cells[key]??"",value=sheetValue(cells,key,snapshot.rows,snapshot.columns),reference=comparable?b.checks.find(c=>c.cell===key)?.expected:undefined;return {label:key,answer:text?text.trim().startsWith("=")?`${text}\nЭсептелген жыйынтык: ${value}`:text:"Жооп берилген эмес",...(reference?{reference}:{})};}),note:note+" Эсептөө сакталган уячалардан жүргүзүлөт; формулалардын эквиваленттүүлүгү бул отчетто кайра бааланбайт."};
 }
}
export function practicalText(e:PracticalEvidence){return e.rows.map(r=>`${r.label} → ${r.answer}${r.reference!==undefined?`\nУчурдагы эталон: ${r.reference}`:""}`).join("\n\n");}
