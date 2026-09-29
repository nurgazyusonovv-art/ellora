import { describe, expect, it } from "vitest";
import { LIBRARY } from "@/content";
import { findKtpTopic, KTP_TEMPLATES } from "@/content/ktp";
import { computeXp, gradeAnswer, stageDone, type Answers } from "@/lib/grading";
import { checkStructure, validateLesson } from "@/lib/lesson-edit";
import { correctResponse } from "@/test/helpers";

describe.each(LIBRARY)("китепкана: $slug", (l) => {
  it("формат жана жарыялоо алдындагы текшерүү", () => {
    expect(checkStructure(l.content)).toBeNull();
    expect(validateLesson(l.title, l.content)).toEqual([]);
  });

  it("убакыт узактыкка дал келет", () => {
    const sum = l.content.stages.reduce((s, st) => s + st.minutes, 0);
    expect(sum).toBe(l.content.duration ?? 45);
  });

  it("тема КТП'де так ушундай жазылган (КТП'си бар класс болсо)", () => {
    const ktp = KTP_TEMPLATES[l.grade];
    if (!ktp || l.slug === "python-if") return; // python-if — эски мисал, 8-класстын КТП'синде башкача аталат
    expect(findKtpTopic(ktp, l.topic), l.topic).toBeDefined();
  });

  it("ар бир блокко туура жооп берсе — 5 бөлүк бүтөт, exit ticket толук", () => {
    const answers: Answers = {};
    for (const st of l.content.stages) {
      for (const b of st.blocks) {
        const r = correctResponse(b);
        if (!r) continue;
        const g = gradeAnswer(b, r, undefined, st.key === "exit");
        if ("error" in g) throw new Error(`${b.id}: ${g.error}`);
        answers[b.id] = { ...g, tries: 1 };
      }
      expect(stageDone(st, answers), st.key).toBe(true);
    }
    expect(computeXp(l.content, answers, true)).toBeGreaterThan(0);
  });

  it("mcq'да туура эмес варианттар бар жана варианттар кайталанбайт", () => {
    for (const b of l.content.stages.flatMap((s) => s.blocks))
      if (b.type === "mcq") {
        expect(b.options.length, b.id).toBeGreaterThanOrEqual(2);
        expect(new Set(b.options).size, b.id).toBe(b.options.length);
      }
  });
});

it("slug'дар кайталанбайт", () => {
  expect(new Set(LIBRARY.map((l) => l.slug)).size).toBe(LIBRARY.length);
});
