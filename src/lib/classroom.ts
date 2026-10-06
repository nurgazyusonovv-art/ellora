export type LiveSession = { max_stage: number; paused: boolean };
export type Review = { block_id: string; criteria_met: boolean[]; feedback: string };

export function liveAllows(session: LiveSession | null, stageIdx: number) {
  return !session || (!session.paused && stageIdx <= session.max_stage);
}

export function reviewCriteria(value: FormDataEntryValue | null, count: number): boolean[] | null {
  if (typeof value !== "string") return null;
  try {
    const checked: unknown = JSON.parse(value);
    return Array.isArray(checked) && checked.length === count && checked.every(x => typeof x === "boolean") ? checked : null;
  } catch { return null; }
}
