"use client";

import Link from "next/link";
import { useState } from "react";
import { findKtpTopic, type Ktp } from "@/content/ktp";

const CUSTOM = "custom";
const fieldCls = "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-base font-normal text-ink placeholder:text-muted/70";

/**
 * Сабактын темасы: класстын КТП'си (мугалимдин өз планы же үлгү) болсо — тизмеден тандалат, болбосо (же «Башка тема») — колго жазылат.
 * `name` берилсе, форма үчүн жашыруун талаа кошулат.
 */
export function TopicPicker({
  grade,
  value,
  onChange,
  name,
  plans,
}: {
  plans: Record<number, Ktp>;
  grade: number | null;
  value: string;
  onChange: (topic: string) => void;
  name?: string;
}) {
  const ktp = grade ? plans[grade] : undefined;
  const found = findKtpTopic(ktp, value);
  const [custom, setCustom] = useState(!!value && !found);
  const showSelect = !!ktp && !(custom && !found);

  return (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <span>Тема</span>
      {name && <input type="hidden" name={name} value={value} />}
      {showSelect && (
        <select
          aria-label="КТП боюнча тема"
          className={fieldCls}
          value={found ? `${found.section}.${found.topic}` : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM) {
              setCustom(true);
              onChange("");
              return;
            }
            const [s, t] = v.split(".").map(Number);
            setCustom(false);
            onChange(v ? ktp.sections[s].topics[t].title : "");
          }}
        >
          <option value="">{"— КТП'ден тема тандаңыз —"}</option>
          {ktp.sections.map((sec, s) => (
            <optgroup key={s} label={`${s + 1}. ${sec.title} (${sec.hours} саат)`}>
              {sec.topics.map((t, i) =>
                !t.title.trim() ? null : (
                <option key={i} value={`${s}.${i}`}>
                  {t.hours ? `${t.title} · ${t.hours} саат` : t.title}
                </option>
                ),
              )}
            </optgroup>
          ))}
          <option value={CUSTOM}>Башка тема (өзүм жазам)</option>
        </select>
      )}
      {!showSelect && (
        <input
          aria-label="Тема"
          className={fieldCls}
          value={value}
          maxLength={200}
          placeholder="Мисалы: Циклдер"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <span className="text-xs font-normal text-muted">
        {ktp ? (
          <>
            {`${grade}-класстын КТП'си${ktp.year ? `, ${ktp.year} окуу жылы` : ""}. `}
            <Link href={`/teacher/ktp?grade=${grade}`} className="font-semibold text-accent hover:underline">
              {"КТП'ни түзөтүү"}
            </Link>
            {!showSelect && (
              <>
                {" "}
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setCustom(false)}>
                  {"КТП'ден тандоо"}
                </button>
              </>
            )}
          </>
        ) : grade ? (
          <>
            {`${grade}-класс үчүн КТП жок — теманы өзүңүз жазыңыз же `}
            <Link href={`/teacher/ktp?grade=${grade}`} className="font-semibold text-accent hover:underline">
              {"КТП түзүңүз"}
            </Link>
            .
          </>
        ) : (
          "Класс жазылса, ошол класстын КТП'синен тандасаңыз болот."
        )}
      </span>
    </div>
  );
}
