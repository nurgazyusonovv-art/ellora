"use client";
import {useEffect,useMemo,useState} from "react";
import type {SpreadsheetBlock} from "@/lib/lesson-types";
import {checkSheet,sheetAddress,sheetValue,validCells,type Cells} from "@/lib/sheet";
import type {SavedAnswer} from "@/lib/grading";
import type {AnswerFn} from "./blocks";
import {useLessonDraft} from "./lesson-draft";
import {Button,RichText} from "@/components/ui";
export function Spreadsheet({block,saved,onAnswer,exitMode,failed}:{block:SpreadsheetBlock;saved?:SavedAnswer;onAnswer:AnswerFn;exitMode?:boolean;failed?:number}){
 const initial=validCells(saved?.response.cells,block.rows,block.columns)?saved!.response.cells as Cells:block.initialCells;
 const [draft,setDraft]=useLessonDraft(block.id,"cells",JSON.stringify(initial));
 const immutable=!!saved&&(saved.is_correct===true||!!exitMode);
 const cells=useMemo(()=>{
  try {
   const raw=immutable?saved?.response.cells:JSON.parse(draft);
   if(!validCells(raw,block.rows,block.columns))return block.initialCells;
   if(immutable)return raw;
   const fixed=Object.fromEntries(block.locked.map(k=>[k,block.initialCells[k]??""]));
   return {...block.initialCells,...raw,...fixed};
  } catch {return block.initialCells;}
 },[draft,block,saved,immutable]);
 const [selected,setSelected]=useState(block.checks[0]?.cell??"A1");const [pending,setPending]=useState(false);const [edited,setEdited]=useState(false);
 useEffect(()=>setPending(false),[saved,failed]);
 const locked=!!pending||saved?.is_correct===true||!!exitMode&&!!saved;
 const readOnly=locked||block.locked.includes(selected);
 const positions=!edited?saved?.response.positions as boolean[]|undefined:undefined;
 const submit=()=>{if(locked)return;setPending(true);setEdited(false);if(block.checksHidden)return onAnswer({cells},null);const r=checkSheet(block,cells);if("error" in r){setPending(false);return;}onAnswer({cells:r.cells,...(!exitMode?{positions:r.positions}:{})},r.positions.every(Boolean));};
 return <div className="flex min-w-0 flex-col gap-4"><RichText text={block.prompt} className="font-semibold"/><p className="text-sm text-muted">Уячаны басып, маанисин төмөнкү талаадан өзгөрт. Формула = менен башталат. + − * /, кашаа, SUM, AVERAGE, MIN, MAX жана A1:B3 диапазону иштейт. Ондук бөлүккө чекит колдон. Бош уяча эсептөөдө 0 болот.</p>
  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">{selected} · {block.locked.includes(selected)?"Мугалим бекиткен уяча":"Маани же формула"}<input aria-label={`${selected} мааниси же формуласы`} className="shadow-xs min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-bg px-3 py-2 font-mono text-sm" value={cells[selected]??""} maxLength={200} readOnly={readOnly} onChange={e=>{setDraft(JSON.stringify({...cells,[selected]:e.target.value}));setEdited(true);}}/></label>
  <div role="region" aria-label="Электрондук таблица, туурасынан жылдырса болот" tabIndex={0} className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-line"><table className="border-collapse text-sm"><caption className="sr-only">Уячаларды тандоо үчүн баскычтар. Тандалган уяча жогорудагы талаадан оңдолот.</caption><thead><tr><th className="min-w-10 border border-line bg-surface-2 p-2">№</th>{Array.from({length:block.columns},(_,c)=><th key={c} scope="col" className="min-w-24 border border-line bg-surface-2 p-2">{String.fromCharCode(65+c)}</th>)}</tr></thead><tbody>{Array.from({length:block.rows},(_,r)=><tr key={r}><th scope="row" className="border border-line bg-surface-2 p-2">{r+1}</th>{Array.from({length:block.columns},(_,c)=>{const key=sheetAddress(r,c),value=sheetValue(cells,key,block.rows,block.columns),raw=cells[key]??"",display=raw===""?"":typeof value==="number"?String(Number(value.toPrecision(10))):value;return <td key={key} className="border border-line p-0"><button type="button" aria-label={`Уяча ${key}: ${display||"бош"}`} aria-pressed={selected===key} className={`min-h-11 w-24 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2 text-left ${selected===key?"bg-accent-soft font-semibold text-accent":block.locked.includes(key)?"bg-surface-2":"bg-surface"}`} onClick={()=>setSelected(key)} title={`${key}: ${display}`}>{display||" "}</button></td>;})}</tr>)}</tbody></table></div>
  <p className="text-xs text-muted">#Айлампа — формула өзү аркылуу кайра кайрылды; #Уяча — туура эмес дарек; #Формула — жазылышын текшер; #Нөлгө бөлүү — бөлүүчүнү кара. Формула жыйынтыгы өзгөргөндө кайра эсептелет.</p>
  <div className="flex flex-col gap-1 text-sm">{block.checks.map((c,i)=><p key={c.cell}>{c.cell}: {c.formula?"формула жаз":"маани киргиз"}{!exitMode&&positions?positions[i]?" · ✓ Текшерүүдөн өттү":" · ↻ Маанини, шилтемени жана эсептөө ыкмасын текшер":""}</p>)}</div>
  <Button type="button" disabled={locked} onClick={submit}>{pending?"Сакталууда…":exitMode&&saved?"Таблица тапшырылды":saved?.is_correct?"Аткарылды":"Таблицаны тапшыруу"}</Button>
  {saved&&!edited&&<p role="status" className="text-sm">{exitMode?"Таблица тапшырылды. Бул бөлүктө кайра өзгөртүлбөйт.":saved.is_correct?"Таблица текшерүүдөн өттү. Формулалар башка кириш маанилерде да сыналды.":"Ишиң сакталды. Белгиленген уячаларды оңдоп, кайра тапшыр."}</p>}
 </div>;
}
