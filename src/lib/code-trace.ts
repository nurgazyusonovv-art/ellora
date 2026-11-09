/** Чектелген окуу мисалдары. Python интерпретатору эмес; каалаган код аткарылбайт. */
export type TraceConfig =
  | { kind: "condition"; age: number; strict: boolean }
  | { kind: "loop"; count: number };

export type TraceFrame = {
  line: number;
  variables: Record<string, number>;
  output: string[];
  note: string;
};

export function createTrace(config: TraceConfig): { code: string[]; frames: TraceFrame[] } {
  const value = config.kind === "condition" ? config.age : config.count;
  const max = config.kind === "condition" ? 25 : 8;
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error("Мисалдын мааниси жараксыз.");

  if (config.kind === "condition") {
    const operator = config.strict ? ">" : ">=";
    const passed = config.strict ? value > 18 : value >= 18;
    const result = passed ? "Кирүүгө болот" : "Азырынча болбойт";
    return {
      code: [`age = ${value}`, `if age ${operator} 18:`, '    print("Кирүүгө болот")', "else:", '    print("Азырынча болбойт")'],
      frames: [
        { line: 1, variables: { age: value }, output: [], note: `age өзгөрмөсүнө ${value} жазылды.` },
        { line: 2, variables: { age: value }, output: [], note: `${value} ${operator} 18 шарты ${passed ? "аткарылды" : "аткарылган жок"}. ${passed ? "Биринчи" : "Экинчи"} бутак тандалды.` },
        { line: passed ? 3 : 5, variables: { age: value }, output: [result], note: "Тандалган бутактын print буйругу аткарылды. Башка бутак аткарылбайт." },
      ],
    };
  }

  const frames: TraceFrame[] = [
    { line: 1, variables: { n: value }, output: [], note: `n = ${value}.` },
    { line: 2, variables: { n: value, total: 0 }, output: [], note: "Жыйынды башында нөлгө барабар." },
  ];
  let total = 0;
  for (let i = 1; i <= value; i++) {
    frames.push({ line: 3, variables: { n: value, total, i }, output: [], note: `Циклдин кезектеги мааниси: i = ${i}. range акыркы ${value + 1} маанисин камтыбайт.` });
    const before = total;
    total += i;
    frames.push({ line: 4, variables: { n: value, total, i }, output: [], note: `total = ${before} + ${i} = ${total}. Экранга азырынча эч нерсе чыккан жок.` });
  }
  const variables: Record<string, number> = { n: value, total };
  if (value > 0) variables.i = value;
  frames.push({ line: 3, variables: { ...variables }, output: [], note: value === 0 ? "range(1, 1) бош. Циклдин денеси бир да жолу аткарылган жок." : "Кезектеги сан калган жок. Цикл бүттү." });
  frames.push({ line: 5, variables: { ...variables }, output: [String(total)], note: `Циклден тышкары турган print жалпы ${total} жыйынтыгын бир жолу чыгарды.` });
  return { code: [`n = ${value}`, "total = 0", "for i in range(1, n + 1):", "    total = total + i", "print(total)"], frames };
}
