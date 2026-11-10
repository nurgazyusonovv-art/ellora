/**
 * Күнүмдүк кайталоо (геймификация, 3-этап, 0022): окуучу мурун көргөн тесттерди эстеп чечет.
 * Тандоо: адегенде жаңылган же биринчи аракетте таппаган суроолор, анан эскилери; акыркы 3 күндө берилгендер
 * мүмкүн болсо кайталанбайт. Окуучу+күн боюнча туруктуу (ошол күнү бир эле суроолор).
 */

export type ReviewCandidate = { assignmentId: string; blockId: string; weak: boolean; at: string };
export type ReviewItem = { a: string; b: string };

export const REVIEW_SIZE = 3;
export const REVIEW_GAP_DAYS = 3;

const keyOf = (c: { assignmentId: string; blockId: string } | ReviewItem) => ("a" in c ? `${c.a}:${c.b}` : `${c.assignmentId}:${c.blockId}`);
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7) >>> 0;

/** Бишкек убактысы боюнча күн (YYYY-MM-DD). */
export function bishkekDay(at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function addDays(day: string, k: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + k);
  return d.toISOString().slice(0, 10);
}

export function pickReview(candidates: ReviewCandidate[], recent: ReviewItem[], seed: string, n = REVIEW_SIZE): ReviewItem[] {
  const seen = new Set<string>();
  const unique = candidates.filter((c) => !seen.has(keyOf(c)) && seen.add(keyOf(c)));
  const recentKeys = new Set(recent.map(keyOf));
  const order = (list: ReviewCandidate[]) =>
    [...list].sort((x, y) => Number(y.weak) - Number(x.weak) || x.at.localeCompare(y.at) || hash(seed + keyOf(x)) - hash(seed + keyOf(y)));
  const fresh = order(unique.filter((c) => !recentKeys.has(keyOf(c))));
  const again = order(unique.filter((c) => recentKeys.has(keyOf(c))));
  // Алсыздар биринчи, бирок бир сабактан бардыгы эмес: ар сабактан кезек менен.
  const picked: ReviewCandidate[] = [];
  const pool = [...fresh, ...again];
  const used = new Set<string>();
  while (picked.length < n && pool.some((c) => !picked.includes(c))) {
    const next = pool.find((c) => !picked.includes(c) && !used.has(c.assignmentId)) ?? pool.find((c) => !picked.includes(c))!;
    picked.push(next);
    used.add(next.assignmentId);
    if (used.size >= new Set(pool.map((c) => c.assignmentId)).size) used.clear();
  }
  return picked.map((c) => ({ a: c.assignmentId, b: c.blockId }));
}

/** Серия: бүгүн (же бүгүн али аткарыла элек болсо — кечээ) аяктаган, катары менен аткарылган күндөр. */
export function reviewStreak(completedDays: string[], today: string) {
  const done = new Set(completedDays);
  let day = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** «Менин жолум»: окуучунун сабактары чейрек боюнча, эскилери биринчи. */
export type PathStop = { id: string; title: string; quarter: number | null; createdAt: string; stage: number | null; finished: boolean; stars: number | null };
export function pathGroups(stops: PathStop[]) {
  const sorted = [...stops].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const keys = [...new Set(sorted.map((s) => s.quarter))].sort((a, b) => (a ?? 99) - (b ?? 99));
  return keys.map((q) => ({ quarter: q, stops: sorted.filter((s) => s.quarter === q) }));
}
