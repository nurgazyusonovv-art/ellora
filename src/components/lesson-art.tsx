/** Сабак карточкалары үчүн адаптивдүү компьютер иллюстрациясы. */
export function LessonArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 170" fill="none" aria-hidden="true" className={className}>
      <circle cx="36" cy="29" r="7" fill="currentColor" opacity=".6" />
      <circle cx="22" cy="61" r="8" stroke="currentColor" strokeWidth="2" opacity=".5" />
      <circle cx="207" cy="50" r="4" fill="currentColor" opacity=".5" />
      <circle cx="222" cy="106" r="3" fill="currentColor" opacity=".5" />
      <ellipse cx="122" cy="150" rx="100" ry="6" fill="currentColor" opacity=".1" />
      <rect x="56" y="48" width="106" height="78" rx="5" fill="var(--color-ink)" />
      <rect x="61" y="53" width="96" height="61" rx="2" fill="currentColor" opacity=".85" />
      <rect x="74" y="64" width="70" height="40" rx="3" fill="var(--color-surface)" />
      <path d="M81 73h28M81 82h52M81 91h39" stroke="currentColor" strokeWidth="4" opacity=".35" />
      <path d="M100 126v19h-15v4h50v-4h-15v-19" fill="var(--color-ink)" />
      <rect x="143" y="96" width="66" height="47" rx="3" fill="var(--color-ink)" />
      <rect x="148" y="101" width="56" height="36" rx="1" fill="currentColor" />
      <rect x="163" y="107" width="32" height="23" rx="2" fill="var(--color-surface)" />
      <path d="m170 114-4 4 4 4m17-8 4 4-4 4" stroke="currentColor" strokeWidth="2" />
      <path d="M138 144h76l-4 5h-68z" fill="var(--color-muted)" />
      <rect x="41" y="98" width="23" height="49" rx="4" fill="var(--color-surface)" stroke="var(--color-muted)" strokeWidth="2" />
      <rect x="45" y="105" width="15" height="29" rx="1" fill="currentColor" opacity=".25" />
      <path d="M50 140h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
