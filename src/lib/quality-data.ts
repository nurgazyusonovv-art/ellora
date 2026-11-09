import "server-only";
type Query<T>={range:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown;count:number|null}>;abortSignal?:(signal:AbortSignal)=>Query<T>};
/** RLS сурамы толук окулат; тармак кечиксе жарым пайыз же чексиз күтүү жок. */
export async function qualityRows<T>(query:Query<T>,timeoutMs=12000) {
 const rows:T[]=[];let total:number|null=null;const started=Date.now();
 for(let page=0;page<40;page++) {
  const remaining=Math.min(timeoutMs,25000-(Date.now()-started));
  if(remaining<=0)throw Error("Маалымат жүктөлүшү созулду.");
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error("Маалымат жүктөлүшү созулду."));},remaining);});
   const request=query.abortSignal?.(controller.signal)??query;
   const result=await Promise.race([Promise.resolve(request.range(rows.length,rows.length+499)),timeout]);
   if(result.error || !result.data || result.count===null)throw Error("Маалымат толук жүктөлгөн жок.");
   if(total!==null&&total!==result.count)throw Error("Маалымат өзгөрдү. Баракты жаңыртыңыз.");total=result.count;
   rows.push(...result.data);if(rows.length===total)return rows;
   if(!result.data.length || rows.length>total)break;
  }finally{if(timer)clearTimeout(timer);}
 }
 throw Error("Маалыматтын көлөмү чоң же толук жүктөлгөн жок.");
}
