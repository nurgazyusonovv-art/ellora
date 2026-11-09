import type {SpreadsheetBlock} from "./lesson-types";
export type Cells=Record<string,string>;
export const sheetAddress=(row:number,col:number)=>`${String.fromCharCode(65+col)}${row+1}`;
export function sheetCoord(address:string,rows:number,columns:number){const m=/^([A-H])([1-9]|1[0-2])$/.exec(address);if(!m)return null;const r=Number(m[2])-1,c=m[1].charCodeAt(0)-65;return r<rows&&c<columns?[r,c] as const:null;}
export function validCells(value:unknown,rows:number,columns:number):value is Cells {return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length<=rows*columns&&Object.entries(value).every(([k,v])=>sheetCoord(k,rows,columns)&&typeof v==="string"&&v.length<=200);}
export function sheetError(b:SpreadsheetBlock):string|null {
 if(typeof b.prompt!=="string"||b.prompt.length>3000||!Number.isInteger(b.rows)||b.rows<3||b.rows>12||!Number.isInteger(b.columns)||b.columns<3||b.columns>8||!validCells(b.initialCells,b.rows,b.columns)||!Array.isArray(b.locked)||new Set(b.locked).size!==b.locked.length||b.locked.some(k=>!sheetCoord(k,b.rows,b.columns))||!Array.isArray(b.checks)||b.checks.length<1||b.checks.length>8||b.checks.some(c=>!c||!sheetCoord(c.cell,b.rows,b.columns)||typeof c.expected!=="string"||!c.expected.trim()||c.expected.length>200||typeof c.formula!=="boolean"||c.formula&&!c.expected.trim().startsWith("=")||b.locked.includes(c.cell))||new Set(b.checks.map(c=>c.cell)).size!==b.checks.length||b.xp!==undefined&&(!Number.isInteger(b.xp)||b.xp<0||b.xp>100))return "Таблица: 3–12 сап, 3–8 мамыча, 1–8 кайталанбаган текшерүү уячасы керек. Текшерилчү уяча бекитилбесин.";
 const expected={...b.initialCells,...Object.fromEntries(b.checks.map(c=>[c.cell,c.expected]))};
 if(b.checks.some(c=>String(sheetValue(expected,c.cell,b.rows,b.columns)).startsWith("#")))return "Мугалимдин күтүлгөн формуласы эсептелбейт. Шилтемени, функцияны жана айлампаны текшериңиз.";
 return null;
}
class SheetFault extends Error {}
type Value=number|string;
const numberText=(s:string)=>/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s);
/** Өз грамматикасы: eval/Function/тармак/сырткы файл жок. */
export function sheetValue(cells:Cells,address:string,rows:number,columns:number):Value {
 let budget=2000;const stack=new Set<string>();
 const read=(key:string):Value=>{
  if(--budget<0||stack.size>32)throw new SheetFault("#Чек");
  if(!sheetCoord(key,rows,columns))throw new SheetFault("#Уяча");
  if(stack.has(key))throw new SheetFault("#Айлампа");
  const raw=(cells[key]??"").trim();if(!raw)return 0;
  if(!raw.startsWith("="))return numberText(raw)?Number(raw):raw;
  stack.add(key);try{return expression(raw.slice(1));}finally{stack.delete(key);}
 };
 const expression=(source:string):Value=>{
  if(source.length>200)throw new SheetFault("#Чек");
  const tokens:string[]=[];let rest=source.trim();
  while(rest){const m=/^(?:\d+(?:\.\d*)?|\.\d+|\$?[A-Za-z]+\$?\d*|[+\-*/():,;])/.exec(rest);if(!m)throw new SheetFault("#Формула");tokens.push(m[0].toUpperCase());rest=rest.slice(m[0].length).trimStart();}
  let pos=0;const pop=()=>tokens[pos++];const peek=()=>tokens[pos];
  const numeric=(v:Value)=>{if(typeof v!=="number"||!Number.isFinite(v))throw new SheetFault("#Сан эмес");return v;};
  const primary=():Value=>{
   if(--budget<0)throw new SheetFault("#Чек");
   const t=pop();if(!t)throw new SheetFault("#Формула");
   if(t==="+"||t==="-")return (t==="-"?-1:1)*numeric(primary());
   if(t==="("){const v=sum();if(pop()!==")")throw new SheetFault("#Формула");return v;}
   if(numberText(t))return Number(t);
   if(["SUM","AVERAGE","MIN","MAX"].includes(t)){
    if(pop()!=="(")throw new SheetFault("#Формула");const values:Value[]=[];
    if(peek()===")")throw new SheetFault("#Формула");
    do {
     const first=peek()?.replace(/\$/g,"");
     if(first&&tokens[pos+1]===":") {pos+=2;const end=pop()?.replace(/\$/g,"");const a=sheetCoord(first,rows,columns),b=end?sheetCoord(end,rows,columns):null;if(!a||!b||a[0]>b[0]||a[1]>b[1])throw new SheetFault("#Уяча");for(let r=a[0];r<=b[0];r++)for(let c=a[1];c<=b[1];c++)values.push(read(sheetAddress(r,c)));}
     else values.push(sum());
     if(peek()!==","&&peek()!==";")break;pop();
    }while(true);
    if(pop()!==")")throw new SheetFault("#Формула");
    const ns=values.filter((v):v is number=>typeof v==="number");if(!ns.length){if(t==="SUM")return 0;throw new SheetFault("#Сан жок");}
    return t==="SUM"?ns.reduce((a,b)=>a+b,0):t==="AVERAGE"?ns.reduce((a,b)=>a+b,0)/ns.length:t==="MIN"?Math.min(...ns):Math.max(...ns);
   }
   const key=t.replace(/\$/g,"");if(sheetCoord(key,rows,columns))return read(key);throw new SheetFault("#Уяча");
  };
  const product=():Value=>{let v=primary();while(peek()==="*"||peek()==="/"){const op=pop(),right=numeric(primary());if(op==="/"&&right===0)throw new SheetFault("#Нөлгө бөлүү");v=op==="*"?numeric(v)*right:numeric(v)/right;}return v;};
  const sum=():Value=>{let v=product();while(peek()==="+"||peek()==="-"){const op=pop(),right=numeric(product());v=op==="+"?numeric(v)+right:numeric(v)-right;}return v;};
  const result=sum();if(pos!==tokens.length||typeof result==="number"&&!Number.isFinite(result))throw new SheetFault("#Формула");return result;
 };
 try{return read(address);}catch(e){return e instanceof SheetFault?e.message:"#Формула";}
}
const equal=(a:Value,b:Value)=>typeof a==="number"&&typeof b==="number"?Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)):typeof a==="string"&&typeof b==="string"&&!a.startsWith("#")&&a.trim()===b.trim();
export function checkSheet(block:SpreadsheetBlock,raw:unknown):{cells:Cells;positions:boolean[]}|{error:string} {
 if(!validCells(raw,block.rows,block.columns))return {error:"Уячалардын форматы туура эмес. Бир уячага 200 белгиге чейин жазыңыз."};
 const cells:Cells={...block.initialCells,...raw};
 if(block.locked.some(k=>(cells[k]??"")!==(block.initialCells[k]??"")))return {error:"Мугалим бекиткен уячаларды өзгөртүүгө болбойт."};
 const expected:Cells={...block.initialCells,...Object.fromEntries(block.checks.map(c=>[c.cell,c.expected]))};
 const inputs=Object.entries(expected).filter(([k,v])=>!block.checks.some(c=>c.cell===k&&c.formula)&&numberText(v.trim()));
 const positions=block.checks.map(c=>{
  if(!equal(sheetValue(cells,c.cell,block.rows,block.columns),sheetValue(expected,c.cell,block.rows,block.columns)))return false;
  if(!c.formula)return true;
  if(!(cells[c.cell]??"").trim().startsWith("="))return false;
  // Башка кириш мааниде да текшеребиз: даяр сан же =370 формула көндүмү катары өтпөйт.
  return inputs.every(([key,value])=>[Number(value)+3,Number(value)*2+1].every(v=>equal(sheetValue({...cells,[key]:String(v)},c.cell,block.rows,block.columns),sheetValue({...expected,[key]:String(v)},c.cell,block.rows,block.columns))));
 });return {cells,positions};
}
export function defaultSheet(id:string):SpreadsheetBlock {return {id,type:"spreadsheet",prompt:"D2 жана D3 уячаларында саны × баасы менен чыгымды эсепте. D4тө жалпы чыгымды SUM менен чыгар.",rows:6,columns:4,initialCells:{A1:"Товар",B1:"Саны",C1:"Баасы",D1:"Чыгым",A2:"Дептер",B2:"4",C2:"80",A3:"Калем",B3:"2",C3:"25",A4:"Жалпы"},locked:["A1","B1","C1","D1","A2","B2","C2","A3","B3","C3","A4"],checks:[{cell:"D2",expected:"=B2*C2",formula:true},{cell:"D3",expected:"=B3*C3",formula:true},{cell:"D4",expected:"=SUM(D2:D3)",formula:true}],xp:10};}
