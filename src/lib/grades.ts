/** Информатика окутулган класстар. 10–11-класстарда азыр информатика жок. Базада да ушундай чектелген (0005). */
export const GRADES = [5, 6, 7, 8, 9] as const;

export const isGrade = (g: unknown): g is number => typeof g === "number" && (GRADES as readonly number[]).includes(g);
