import { describe, expect, it } from "vitest";
import { checkKtpSections, findKtpTopic, KTP_TEMPLATES, planHours, sectionHours } from "@/content/ktp";

describe.each(Object.values(KTP_TEMPLATES))("КТП үлгүсү: $grade-класс", (k) => {
  it("жылына 68 саат", () => expect(planHours(k)).toBe(68));
  it("темалар кайталанбайт жана бош эмес", () => {
    const titles = k.sections.flatMap((s) => s.topics.map((t) => t.title));
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.every((t) => t.trim().length > 0)).toBe(true);
  });
  it("темалардын сааттары жазылса — бөлүмдүн саатына дал келет", () => {
    for (const s of k.sections) if (sectionHours(s) > 0) expect(sectionHours(s), s.title).toBe(s.hours);
  });
  it("форматы туура", () => expect(checkKtpSections(k.sections)).toBeNull());
});

describe("findKtpTopic / checkKtpSections", () => {
  it("теманы табат", () => {
    const k = KTP_TEMPLATES[7];
    const t = k.sections[6].topics[4].title;
    expect(findKtpTopic(k, t)).toEqual({ section: 6, topic: 4 });
    expect(findKtpTopic(k, "жок тема")).toBeUndefined();
  });
  it("бузук форматты кабыл албайт", () => {
    expect(checkKtpSections("x")).not.toBeNull();
    expect(checkKtpSections([{ title: "a", hours: "1", topics: [] }])).not.toBeNull();
    expect(checkKtpSections([{ title: "a", hours: 1, topics: [{ title: 1 }] }])).not.toBeNull();
  });
});

describe("КТП сабактардын сериясы", () => {
  const plan = () => [{title:"Таблица",hours:6,topics:[{id:"topic",title:"Формула",hours:6,sessions:Array.from({length:6},(_,i)=>({id:`lesson-${i}`,title:`${i+1}-сабак`,objective:"Эсептөө",product:"Таблица"}))}]}];
  it("алты сабактуу план сактоого жарактуу", () => expect(checkKtpSections(plan())).toBeNull());
  it("кайталанган белгилерди четке кагат", () => {
    const p=plan();p[0].topics[0].sessions[1].id="lesson-0";expect(checkKtpSections(p)).not.toBeNull();
  });
  it("бузук жана өтө узун мазмунду четке кагат", () => {
    const p=plan();p[0].topics[0].sessions[0].objective="x".repeat(2001);expect(checkKtpSections(p)).not.toBeNull();
    expect(checkKtpSections([{title:"Тема",hours:1,topics:[{title:"Тема",sessions:[]}]}])).not.toBeNull();
  });
});
