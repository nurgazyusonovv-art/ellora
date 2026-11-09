export type LiveSession = { max_stage: number; paused: boolean; timed?:boolean; ended?:boolean; auto_advance?:boolean; deadline?:string|null; remaining_seconds?:number; durations?:number[]; clock_version?:number; server_now?:string };
export type Review = { block_id: string; criteria_met: boolean[]; feedback: string };

export function liveAllows(session: LiveSession | null, stageIdx: number) {
  return !session || (!session.paused && !session.ended && (session.timed ? stageIdx === session.max_stage : stageIdx <= session.max_stage));
}

export function reviewCriteria(value: FormDataEntryValue | null, count: number): boolean[] | null {
  if (typeof value !== "string") return null;
  try {
    const checked: unknown = JSON.parse(value);
    return Array.isArray(checked) && checked.length === count && checked.every(x => typeof x === "boolean") ? checked : null;
  } catch { return null; }
}

export type LessonClock = LiveSession & {timed?:boolean;auto_advance?:boolean;deadline?:string|null;remaining_seconds?:number;durations?:number[];ended?:boolean;clock_version?:number;server_now?:string};
export const CLOCK_COLUMNS="max_stage,paused,timed,auto_advance,deadline,remaining_seconds,durations,ended,clock_version";
export function clockRemaining(session:LessonClock,elapsedMs=0) {
 if(session.ended)return 0;
 if(session.paused)return session.remaining_seconds??0;
 if(!session.deadline||!session.server_now)return 0;
 return Math.max(0,Math.ceil((Date.parse(session.deadline)-Date.parse(session.server_now)-elapsedMs)/1000));
}
