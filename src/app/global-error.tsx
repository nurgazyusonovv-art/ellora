"use client";

/** Түпкү layout'тун өзүндө ката болсо (сейрек). Стилдер жүктөлбөшү мүмкүн — жөнөкөй HTML. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ky">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32, textAlign: "center", color: "#15242a", background: "#f2f5f3" }}>
        <h1>Бир нерсе туура эмес болуп кетти</h1>
        <p>Баракты жаңыртып, кайра аракет кылыңыз.</p>
        <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 10, border: 0, background: "#0c7563", color: "#fff", fontSize: 16 }}>
          Кайра аракет кылуу
        </button>
      </body>
    </html>
  );
}
