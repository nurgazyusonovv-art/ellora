import type { Block } from "@/lib/lesson-types";
import { RichText } from "@/components/ui";
export function TeamworkCard({block}:{block:Block}) {
 if (!block.collaboration || block.collaboration==="individual") return null;
 const t=block.teamwork;
 return <section className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4 border border-accent/20" aria-label="Бирге иштөө көрсөтмөсү">
  <h3 className="font-semibold text-accent">{block.collaboration==="pair"?"Жуптук тапшырма · 2 окуучу":`Топтук тапшырма${t?` · ${t.size} окуучу`:""}`}</h3>
  {t && <><RichText text={t.instructions} /><div><p className="font-semibold">Ролдорду бөлүштүргүлө</p><ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{t.roles.map((r,i)=><li key={i}>{r}</li>)}</ol></div><div><p className="font-semibold">Жалпы жыйынтык</p><RichText text={t.outcome} /></div></>}
  <p className="text-sm text-muted">Бирге талкуулап, чечим чыгаргыла. Ар бириң өз жообуңарда чечимди түшүндүрүп, кайсы ишке салым кошконуңарды жазгыла.</p>
 </section>;
}
