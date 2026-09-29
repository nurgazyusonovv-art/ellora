import type { Block } from "@/lib/lesson-types";

/** Ар бир блокко туура жооп. */
export function correctResponse(b: Block): Record<string, unknown> | null {
  switch (b.type) {
    case "mcq":
      return { picked: b.correct };
    case "parsons":
      return { order: b.lines.map((_, i) => i) };
    case "bug_hunt":
      return { found: b.bugs.map((x) => x.line) };
    case "code_task":
      return { code: "print(1)", passed: b.tests.length };
    case "open":
      return { text: "Менин жообум" };
    case "confidence":
      return { value: 3 };
    default:
      return null;
  }
}
