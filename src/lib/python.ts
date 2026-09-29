"use client";

export type RunResult = { output: string; error?: string };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<string, (r: RunResult) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker("/pyodide-worker.js", { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: string } & RunResult>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb({ output: e.data.output, error: e.data.error });
      }
    };
  }
  return worker;
}

/** Python'ду алдын ала жүктөп коюу (биринчи иштетүү тезирээк болот). */
export function warmUpPython() {
  if (typeof window !== "undefined") getWorker();
}

/** Кодду иштетет. Чексиз цикл болсо `timeoutMs`тан кийин токтотот. Биринчи жүктөө 5–15 секунд алышы мүмкүн. */
export function runPython(code: string, stdin = "", timeoutMs = 20000): Promise<RunResult> {
  const w = getWorker();
  const id = String(++seq);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      w.terminate();
      worker = null;
      resolve({ output: "", error: "Программа өтө узак иштеди. Чексиз цикл жок экенин текшер." });
    }, timeoutMs);
    pending.set(id, (r) => {
      clearTimeout(timer);
      resolve(r);
    });
    w.postMessage({ id, code, stdin });
  });
}

/** Python катасын окуучуга түшүнүктүү кылып которот. */
export function explainError(err: string) {
  const known: [RegExp, string][] = [
    [/IndentationError/, "Боштук (отступ) катасы: блоктун ичиндеги саптар 4 боштук ичкери болушу керек."],
    [/SyntaxError: expected ':'/, "Синтаксис катасы: шарттан кийин эки чекит `:` жок."],
    [/SyntaxError/, "Синтаксис катасы: код Python эрежелерине туура келбейт."],
    [/NameError: name '(.+)' is not defined/, "Мындай өзгөрмө жок: $1. Атын туура жаздыңбы?"],
    [/ValueError: invalid literal for int/, "Санды күткөн жерге сан эмес маани келди."],
    [/TypeError/, "Түр катасы: мисалы, сан менен текстти салыштырып же кошуп жатасың."],
    [/ZeroDivisionError/, "Нөлгө бөлүүгө болбойт."],
  ];
  for (const [re, text] of known) {
    const m = err.match(re);
    if (m) return text.replace("$1", m[1] ?? "");
  }
  return err;
}

/** Программанын чыгышы күтүлгөн жоопко дал келеби (input() сурамы ошол эле сапта болсо да). */
export function outputMatches(output: string, expected: string) {
  const norm = (s: string) => s.replace(/\r/g, "").trim();
  const out = norm(output);
  const exp = norm(expected);
  if (out === exp) return true;
  const lines = out.split("\n").filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  return last.trim() === exp || last.trimEnd().endsWith(exp);
}
