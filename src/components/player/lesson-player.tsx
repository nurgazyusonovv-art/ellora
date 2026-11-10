"use client";
import {Classification} from "./classification";
import {Spreadsheet} from "./spreadsheet";
import {missionAllows,missionChallenge,missionStudentBlock} from "@/lib/missions";
import {MissionProgress} from "./mission-progress";
import {ClockDisplay} from "@/components/lesson-clock";
import {DraftScope} from "./lesson-draft";
import {pollLessonClock} from "@/app/actions/lesson-clock";
import {POLL_CONNECTED,useLessonChannel} from "@/lib/use-lesson-channel";
import { explanationView } from "@/lib/explanation-view";
import { Presentation } from "./presentation";
import { GoalCard, GoalCheck } from "./goal-card";
import { GOAL_CHECK_ID, lessonGoal, readGoalCheck } from "@/lib/goal-check";
import { LessonGame, type GameCtx } from "./lesson-game";

import { ENGAGEMENT_LEVELS } from "@/lib/lesson-types";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { KnowledgeCardView } from "@/components/knowledge-card";
import { LEVELS, STATIONS } from "@/lib/quest";
import { CoinIcon } from "@/components/coin-profile";
import { STAGE_COINS } from "@/lib/coins";
import { AutoRefresh } from "@/components/auto-refresh";
import { liveAllows, liveBlockedMessage, type ClassGoal, type LiveSession, type Review } from "@/lib/classroom";
import { TeamworkCard } from "@/components/player/teamwork-card";
import { AiTutor } from "@/components/player/ai-tutor";
import { useEffect, useRef, useState } from "react";
import { completeStage, submitAnswer, type Progress } from "@/app/actions/student";
import {
  InteractiveTask,
  Investigation,
  BugHunt,
  CodeExample,
  CodeTask,
  Confidence,
  Mcq,
  Open,
  Parsons,
  type AnswerFn,
  type SavedAnswer,
} from "@/components/player/blocks";
import { Button, cx, Progress as ProgressBar, RichText } from "@/components/ui";
import { attemptXp, EXIT_BONUS_XP, exitResult, lessonGrowth, lessonStars, stageDone } from "@/lib/grading";
import { isGraded, isInteractive, stageMeta, type Block, type LessonContent } from "@/lib/lesson-types";
import { warmUpPython } from "@/lib/python";

type Attempt = { id: string; current_stage: number; xp: number; exit_score: number | null; exit_total: number | null };

/** Серверге жөнөтүлө турган иш (интернет жок болсо кезекте сакталат). */
type Job = { kind: "answer"; blockId: string; response: Record<string, unknown> } | { kind: "complete"; stageIdx: number };

type Props = {
  title: string;
  content: LessonContent;
  backHref: string;
  /** Окуучу режими: жооптор базага сакталат. Жок болсо — мугалимдин алдын ала көрүүсү. */
  attempt?: Attempt;
  /** Окуучу режиминде: Realtime каналы жана presence үчүн (0019). */
  assignmentId?: string;
  viewerId?: string;
  initialAnswers?: Record<string, SavedAnswer>;
  liveSession?: LiveSession | null;
  reviews?: Review[];
  initialCoinBalance?: number | null;
};

export function LessonPlayer({ title, content, backHref, attempt, assignmentId, viewerId, initialAnswers = {}, liveSession: initialLiveSession = null, reviews = [], initialCoinBalance = null }: Props) {
  const preview = !attempt;
  const clockAttemptId=attempt?.id;
  const [liveSession,setLiveSession]=useState(initialLiveSession);
  const [goal,setGoal]=useState<ClassGoal|null>(null);
  useEffect(()=>{setLiveSession(initialLiveSession);},[initialLiveSession]);
  // Realtime (0019): мугалим бөлүктү которсо дароо сурайбыз. Туташса запас сурам сейрек; таймер режиминде ар 3 сек
  // (автоматтык өтүү сервердеги сурам учурунда эсептелет).
  const syncRef=useRef<()=>Promise<void>>(async()=>{});
  const {connected,notify}=useLessonChannel({assignmentId:attempt?assignmentId:null,presenceKey:viewerId,onSession:()=>void syncRef.current()});
  const timedNow=!!liveSession?.timed;
  useEffect(()=>{
    if(!clockAttemptId)return;
    let active=true,busy=false;
    const sync=async()=>{if(busy)return;busy=true;try{const r=await pollLessonClock(clockAttemptId);if(active){if(r.error)setSaveError(r.error);else{if(r.session!==undefined)setLiveSession(r.session);if(r.goal!==undefined)setGoal(r.goal);}}}catch{if(active)setSaveError("Жалпы саат жаңырган жок. Байланышты текшериңиз.");}finally{busy=false;}};
    syncRef.current=sync;
    // Класстын максаты дароо көрүнсүн (биринчи сурам күтпөй).
    if(document.visibilityState==="visible")void sync();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void sync();},connected&&!timedNow?POLL_CONNECTED:3000);
    const visible=()=>{if(document.visibilityState==="visible")void sync();};document.addEventListener("visibilitychange",visible);
    return()=>{active=false;syncRef.current=async()=>{};clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[clockAttemptId,connected,timedNow]);
  const wasTimed=useRef(!!initialLiveSession?.timed);
  useEffect(()=>{if(liveSession?.timed)setView(liveSession.max_stage);else if(wasTimed.current)setView(Math.min(unlockedRef.current,4));wasTimed.current=!!liveSession?.timed;},[liveSession?.timed,liveSession?.max_stage]);
  // Мугалим башкарган (таймерсиз) сабак: мугалим жаңы бөлүк ачканда окуучу ошол бөлүккө өтөт (жеткен болсо).
  const lastLiveStage=useRef(initialLiveSession&&!initialLiveSession.timed?initialLiveSession.max_stage:null);
  useEffect(()=>{
    if(!liveSession||liveSession.timed||liveSession.waiting){lastLiveStage.current=null;return;}
    const next=liveSession.max_stage,prev=lastLiveStage.current;lastLiveStage.current=next;
    if(prev!==null&&next>prev&&next<=unlockedRef.current)go(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[liveSession?.max_stage,liveSession?.timed,liveSession?.waiting]);
  const [presentationOpened,setPresentationOpened]=useState<Record<string,boolean>>({});
  const [coins,setCoins]=useState(initialCoinBalance);
  const coinRef=useRef(initialCoinBalance);
  const [coinNotice,setCoinNotice]=useState<{amount:number;id:number}|null>(null);
  useEffect(()=>{coinRef.current=initialCoinBalance;setCoins(initialCoinBalance);},[initialCoinBalance]);
  // Окуучу режиминде блоктор жооптон кийин серверден жаңыланат (туура жооп ачылат).
  const [stages, setStages] = useState(content.stages);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>(initialAnswers);
  const [unlocked, setUnlocked] = useState(attempt?.current_stage ?? 0); // 5 = бүттү
  const [xp, setXp] = useState(attempt?.xp ?? 0);
  const [view, setView] = useState(initialLiveSession?.timed ? initialLiveSession.max_stage : Math.min(attempt?.current_stage ?? 0, initialLiveSession?.max_stage ?? 4, stages.length - 1));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState<{ score: number; total: number } | null>(
    attempt && attempt.current_stage >= stages.length ? { score: attempt.exit_score ?? 0, total: attempt.exit_total ?? 0 } : null,
  );
  const topRef = useRef<HTMLDivElement>(null);
  const stageNavRef = useRef<HTMLOListElement>(null);
  useEffect(()=>{
    const nav=stageNavRef.current;if(!nav)return;
    const reveal=()=>{
      const active=nav.querySelector<HTMLElement>('[aria-current="step"]');
      if(!active||nav.scrollWidth<=nav.clientWidth)return;
      nav.scrollTo({left:Math.max(0,active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.clientWidth)/2),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    };
    reveal();const observer=new ResizeObserver(reveal);observer.observe(nav);
    return ()=>observer.disconnect();
  },[view]);
  /** Серверге жооптор ирети менен жөнөтүлөт — XP жана бөлүк туура эсептелсин. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const unlockedRef = useRef(unlocked);

  useEffect(() => {
    if (content.stages.some((s) => s.blocks.some((b) => b.type === "code_task" || (b.type === "code_example" && b.runnable)))) {
      const t = setTimeout(warmUpPython, 1500);
      return () => clearTimeout(t);
    }
  }, [content.stages]);

  const go = (i: number) => {
    setView(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ───── Серверге жөнөтүү. Интернет жок болсо — кезекке (localStorage), байланыш келгенде жөнөтүлөт ───── */
  const jobsKey = attempt ? `ellora:queue:${attempt.id}` : "";
  const readJobs = (): Job[] => {
    try {
      return JSON.parse(localStorage.getItem(jobsKey) ?? "[]") as Job[];
    } catch {
      return [];
    }
  };
  const writeJobs = (jobs: Job[]) => {
    try {
      if (jobs.length) localStorage.setItem(jobsKey, JSON.stringify(jobs));
      else localStorage.removeItem(jobsKey);
    } catch {
      /* localStorage жок — кезек ушул барак ачык турганда гана сакталат */
      memJobs.current = jobs;
    }
  };
  const memJobs = useRef<Job[]>([]);
  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);

  const exec = (job: Job) =>
    job.kind === "answer" ? submitAnswer(attempt!.id, job.blockId, job.response) : completeStage(attempt!.id, job.stageIdx);

  /** Сервердин жообу — чечүүчү: XP, ачылган бөлүк жана натыйжа ушундан алынат. */
  const apply = (job: Job, r: Progress) => {
    const blockId = job.kind === "answer" ? job.blockId : null;
    if (r.error) {
      if (blockId) setFailed((f) => ({ ...f, [blockId]: (f[blockId] ?? 0) + 1 }));
      return setSaveError(r.error);
    }
    setSaveError(null);
    // Мугалимдин жандуу экранына «жаңырт» деген белги (мазмунсуз).
    if (blockId) notify("activity");
    if (r.coinBalance !== undefined) {
      const earned = coinRef.current === null ? 0 : r.coinBalance - coinRef.current;
      coinRef.current=r.coinBalance;setCoins(r.coinBalance);
      if(earned>0)setCoinNotice({amount:earned,id:Date.now()});
    }
    if (blockId && r.answer) setAnswers((a) => ({ ...a, [blockId]: r.answer! }));
    // Чечилгенде сервер блоктун ачык көрүнүшүн жиберет (туура жооп, түшүндүрмө…).
    if (r.block) {
      const nb = r.block;
      setStages((all) => all.map((st) => ({ ...st, blocks: st.blocks.map((b) => (b.id === nb.id ? nb : b)) })));
    }
    if (r.xp !== undefined) setXp(r.xp);
    if (r.finished) setFinished(r.finished);
    if (r.current_stage !== undefined) {
      const next = r.current_stage;
      if (!liveSession?.timed && next > unlockedRef.current && next < stages.length && liveAllows(liveSession, next)) setTimeout(() => go(next), 900);
      unlockedRef.current = next;
      setUnlocked(next);
    }
  };

  /** Жооптор ирети менен жөнөтүлөт. Тармак катасы — кезекке; сервердин катасы — көрсөтүлөт. */
  const send = (job: Job) => {
    queue.current = queue.current.then(async () => {
      if (offlineRef.current) return writeJobs([...readJobs(), job]);
      let r: Progress;
      try {
        r = await exec(job);
      } catch {
        offlineRef.current = true;
        setOffline(true);
        return writeJobs([...readJobs(), job]);
      }
      apply(job, r);
    });
  };

  const flush = () => {
    const jobs = readJobs().length ? readJobs() : memJobs.current;
    memJobs.current = [];
    writeJobs([]);
    offlineRef.current = false;
    setOffline(false);
    jobs.forEach(send);
  };

  useEffect(() => {
    if (!attempt) return;
    // Мурунку жолу интернетсиз калган жооптор — жөнөтөбүз.
    if (readJobs().length) flush();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    // «online» окуясы дайыма эле келбейт (тармак бар, бирок сервер жеткиликсиз) — ошондуктан мезгил-мезгили менен да.
    const t = setInterval(() => offlineRef.current && flush(), 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
    // бир жолу, аракет ачылганда
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id]);

  /* ───── Алдын ала көрүү: баары браузерде, эч нерсе сакталбайт ───── */
  const previewAdvance = (stageIdx: number, all: Record<string, SavedAnswer>, currentXp: number) => {
    const newStage = stageIdx + 1;
    setUnlocked(newStage);
    if (newStage >= stages.length) {
      const r = exitResult({ ...content, stages }, all);
      setXp(currentXp + EXIT_BONUS_XP);
      setFinished({ score: r.score, total: r.total });
    } else if (newStage > view) setTimeout(() => go(newStage), 900);
  };

  const onAnswer = (stageIdx: number, block: Block): AnswerFn => (response, isCorrect) => {
    const prev = answers[block.id];
    const all = { ...answers, [block.id]: { response, is_correct: isCorrect, tries: (prev?.tries ?? 0) + 1 } };

    if (attempt) {
      // Туура жообу жашырылган блокто сервердин чечимин күтөбүз; калгандарын дароо көрсөтөбүз.
      if (!liveSession?.timed && !(isGraded(block) && isCorrect === null)) setAnswers(all);
      return send({ kind: "answer", blockId: block.id, response });
    }
    setAnswers(all);

    const gained = isCorrect && !prev?.is_correct && isGraded(block) && "xp" in block && block.xp && stages[stageIdx].key !== "exit" ? attemptXp(block.xp, all[block.id].tries) : 0;
    const newXp = xp + gained;
    if (gained) setXp(newXp);
    if (stages[stageIdx].key !== "exit" && !(content.model === "5e" && stages[stageIdx].key === "practice") && stageIdx === unlocked && stageDone(stages[stageIdx], all)) previewAdvance(stageIdx, all, newXp);
  };

  /** Оюн: окуучуда сервердин жообу колдонулат, алдын ала көрүүдө — браузердеги натыйжа. */
  const gameCtx = (stageIdx: number, block: Block): GameCtx => ({
    attemptId: attempt?.id,
    onServer: (r) => apply({ kind: "answer", blockId: block.id, response: {} }, r),
    onLocal: (answer) => {
      const all = { ...answers, [block.id]: answer };
      setAnswers(all);
      if (stages[stageIdx].key !== "exit" && stageIdx === unlocked && stageDone(stages[stageIdx], all)) previewAdvance(stageIdx, all, xp);
    },
  });

  /** Интерактивдүү блогу жок бөлүк же exit ticket'ти тапшыруу баскычы үчүн. */
  const manualComplete = () => {
    if (attempt) return send({ kind: "complete", stageIdx: view });
    previewAdvance(view, answers, xp);
  };

  const goalInfo = lessonGoal(content);
  const st = stages[view];
  const canNext = !liveSession?.timed && view < stages.length - 1 && (preview || (unlocked > view && liveAllows(liveSession, view + 1)));
  const isExit = st.key === "exit";
  const explanation = explanationView(st,content.model,answers,preview,!!presentationOpened[st.key]);
  const explainReady = explanation.ready;

  return (
    <div className="lesson-player mx-auto flex min-w-0 w-full max-w-3xl flex-col gap-5 px-4 pt-4 pb-16 sm:px-6" ref={topRef}>
      {attempt && !liveSession?.timed && <AutoRefresh />}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">
          ← Артка
        </Link>
        <div className="flex items-center gap-2">
          {preview && <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">Алдын ала көрүү · жооптор сакталбайт</span>}
          {coins !== null && <Link href="/student/shop" className="flex min-h-11 items-center gap-1.5 rounded-full border border-amber/25 bg-amber-soft px-3 text-sm font-medium text-amber lg:min-h-9" aria-label={`Дүкөн: ${coins} монета`}><CoinIcon/>{coins}</Link>}
          <b className="rounded-full border border-amber/25 bg-amber-soft px-2.5 py-0.5 font-mono text-sm font-medium whitespace-nowrap text-amber">{xp} XP</b>
        </div>
      </header>
      <h1 className="text-xl font-medium sm:text-2xl">{title}</h1>
      {content.quest && (
        <details open={view === 0} className="group rounded-lg border border-accent/25 bg-accent-soft/60 p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
            <Icon name="target" size={18} className="shrink-0 text-accent" />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-accent-dark">Миссия</span>
              <span className="block font-medium break-words">{content.quest.title}</span>
            </span>
            <span className="text-xs text-muted group-open:hidden">Окуяны ачуу</span>
          </summary>
          <div className="mt-3 flex flex-col gap-2 border-t border-accent/20 pt-3 text-[15px]">
            <RichText text={content.quest.story} />
            <p className="text-sm"><b className="font-medium">Максат:</b> {content.quest.goal}</p>
          </div>
        </details>
      )}

      {view === 0 && goalInfo && <GoalCard objectives={goalInfo.objectives} criteria={goalInfo.criteria} />}
      <nav aria-label="Сабактын бөлүктөрү" className="lesson-stage-nav sticky top-0 z-10 -mx-4 border-b border-line bg-surface-2/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <ol ref={stageNavRef} className="flex gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-5">
          {stages.map((s, i) => {
            const locked = !preview && ((!liveSession?.timed && i > unlocked) || !liveAllows(liveSession, i));
            const done = preview || liveSession?.timed ? false : i < unlocked;
            return (
              <li key={s.key} className="min-w-28 flex-1 sm:min-w-0">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => go(i)}
                  aria-current={i === view ? "step" : undefined}
                  className={cx(
                    "flex min-h-11 w-full flex-col items-start gap-0.5 overflow-hidden rounded-md border bg-surface px-2 py-1.5 text-left sm:px-2.5 sm:py-2",
                    i === view ? "border-accent bg-accent-soft/60 ring-1 ring-accent/20" : "border-line hover:border-line-strong",
                    locked && "opacity-45",
                  )}
                >
                  <span className="font-mono text-[11px] text-muted">
                    {i + 1}/5 {done && <span className="font-bold text-good">✓</span>}
                  </span>
                  <span title={stageMeta(content, s.key).label} className="w-full truncate text-xs font-medium sm:text-sm">{content.quest ? STATIONS[s.key] : stageMeta(content, s.key).label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(Math.min(unlocked, stages.length) / stages.length) * 100}%` }} />
        </div>
      </nav>

      {offline && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-amber-soft px-4 py-2.5 text-sm text-amber border border-amber/25">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.5 5.2A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 3.2-2M13 10.1a10 10 0 0 1 6 2.8M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
          </svg>
          Интернет жок. Жоопторуң сакталып турат — байланыш калыбына келгенде өзү жөнөтүлөт.
        </p>
      )}
      {saveError && !offline && (
        <p role="alert" className="rounded-md bg-bad-soft px-4 py-2.5 text-sm text-bad border border-bad/25">
          {saveError}
        </p>
      )}

      {attempt && reviews.length > 0 && <Link href="/student/revisions" className="flex min-h-11 items-center rounded-xl bg-accent-soft px-4 font-semibold text-accent border border-accent/20">Мугалимдин пикири бар: кайра иштөө тапшырмаларын көрүү →</Link>}
      {coinNotice && <div key={coinNotice.id} role="status" className="coin-reward flex items-center justify-between gap-3 rounded-2xl bg-amber-soft p-4 text-amber border border-amber/25"><span className="flex items-center gap-2 font-semibold"><CoinIcon/>+{coinNotice.amount} монета кошулду!</span><button type="button" className="min-h-11 px-2 text-sm font-semibold" onClick={()=>setCoinNotice(null)}>Жабуу</button></div>}
      {liveSession?.timed && <div className="rounded-xl bg-accent-soft p-4 border border-accent/20"><p className="text-sm font-semibold">Мугалим башкарган жалпы сабак · {liveSession.max_stage+1}/5</p><ClockDisplay session={liveSession}/><p className="mt-2 text-sm">Кийинки бөлүккө жалпы таймер же мугалим өткөрөт. Терип жаткан текст бул түзмөктө черновик болуп сакталат; ал жөнөтүлгөн жооп эмес.</p>{liveSession.ended&&<p className="mt-2 text-sm">Жалпы убакыт бүттү. Аяктай элек иш туура эмес деп автоматтык бааланбайт. Улантуу үчүн мугалим менен такта.</p>}</div>}
      {goal && liveSession && !liveSession.timed && !liveSession.ended && (
        <div role="status" className={cx("flex flex-col gap-2 rounded-md border p-3.5", goal.reached ? "border-good/30 bg-good-soft" : "border-line bg-surface")}>
          <p className={cx("flex items-center gap-2 text-sm font-medium", goal.reached ? "text-good" : "text-ink")}>
            <Icon name={goal.reached ? "trophy" : "users"} size={16} className={goal.reached ? "" : "text-accent"} />
            {goal.reached ? "Класс максатка жетти! Баарыңар бирге жасадыңар." : `Класстын максаты: ${goal.target} окуучу бул бөлүктү бүтүрсүн`}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1"><ProgressBar value={Math.min(100, (goal.done / goal.target) * 100)} tone="good" /></div>
            <span className="font-mono text-xs text-muted tabular-nums">{goal.done}/{goal.target}</span>
          </div>
          {!goal.reached && <p className="text-xs text-muted">Бүтүрсөң — жанындагы досуңа жардам бер. Аттар көрсөтүлбөйт.</p>}
        </div>
      )}
      {liveSession && !liveSession.timed && <p role="status" className={cx("rounded-md border p-4 text-sm", liveSession.paused || liveSession.ended ? "border-amber/25 bg-amber-soft text-amber" : "border-accent/20 bg-accent-soft text-accent-dark")}>{liveSession.ended ? "Сабак аяктады. Жоопторуң сакталды." : liveSession.paused ? "Мугалим сабакты талкуу үчүн токтотту. Тактага кара, азыр жооп жибербе." : liveSession.spotlight_block ? "Мугалим класстын жоопторун тактада көрсөтүп жатат — тактага кара. Аттар көрүнбөйт." : unlocked < liveSession.max_stage ? `Мугалим ${liveSession.max_stage + 1}-бөлүккө өттү. Адегенде ${unlocked + 1}-бөлүктү бүтүр — анан кийинкиси ачылат.` : `Мугалим башкарган сабак: ${stageMeta(content, stages[liveSession.max_stage].key).label} бөлүгү ачык.`}</p>}
      {!liveAllows(liveSession, view) ? <p className="rounded-lg border border-line bg-surface p-5">{liveBlockedMessage(liveSession)}</p> : (
        <section className="flex flex-col gap-4">
          {finished && isExit && <FinishCard score={finished.score} total={finished.total} xp={xp} backHref={backHref} preview={preview} growth={lessonGrowth({ ...content, stages }, answers)} />}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {view + 1}-бөлүк · {content.quest ? `${STATIONS[st.key]} (${stageMeta(content, st.key).label})` : stageMeta(content, st.key).label} · ~{st.minutes} мүн
              {attempt && coins !== null && <span className="ml-2 normal-case text-amber">Биринчи жолу бүтүргөндө +{STAGE_COINS[view]} монета</span>}
            </span>
            <h2 className="text-xl font-medium">{st.title}</h2>
            {st.intro && <p className="text-muted">{st.intro}</p>}
          </div>

          <MissionProgress stage={st} answers={answers}/>
          {!explainReady && <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4 text-sm border border-accent/20"><p>Адегенде байкооңду өз сөзүң менен түшүндүрүп көр. Жообуңду жөнөткөндөн кийин толук түшүндүрмө ачылат.</p>{explanation.hasPresentation && <><p>Бул бөлүктө слайддык презентация бар. Аны көрүп, андан кийин да өз жообуңду жаза аласың.</p>{!presentationOpened[st.key] && <Button type="button" className="self-start" onClick={()=>setPresentationOpened(all=>({...all,[st.key]:true}))}>Презентацияны көрүү</Button>}</>}</div>}
          {explanation.blocks.map(b=>missionStudentBlock(st,b)).map((b) => (
            <div key={b.id} id={`block-${b.id}`} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5">
              {b.level && <span className={cx("self-start rounded-full border px-2 py-0.5 font-mono text-[11px]", b.level === 3 ? "border-lilac/30 bg-lilac-soft text-lilac" : b.level === 2 ? "border-accent/25 bg-accent-soft text-accent-dark" : "border-good/25 bg-good-soft text-good")}>{LEVELS[b.level]}</span>}
              {st.key === "discover" && b.type === "open" && b.engagement && <p className="text-sm font-semibold text-accent">{b.engagement.level}. {ENGAGEMENT_LEVELS[b.engagement.level]} · {b.engagement.kind === "activity" ? "Кызыктуу тапшырма" : "Суроо"}</p>}
              {st.mission&&isInteractive(b)&&<p className="text-sm font-semibold text-accent">{missionChallenge(st,b.id)?"Жеке иш · ЖИ жана кеңешсиз, бир жолу тапшырылат":"Миссиянын машыгуусу"}</p>}
              {!missionAllows(st,b.id,answers)&&<p className="rounded-xl bg-surface-2 p-3 text-sm border border-line">Адегенде миссиянын мурунку тапшырмасын бүтүр. Андан кийин бул кадам ачылат.</p>}
              <TeamworkCard block={b} />
              <DraftScope.Provider value={attempt?.id??null}><fieldset disabled={!missionAllows(st,b.id,answers)||!!finished && b.type !== "presentation"} className="flex min-w-0 flex-col gap-3">{renderBlock(b, answers[b.id], onAnswer(view, b), isExit, failed[b.id], b.type === "open" && b.compareTo ? answers[b.compareTo]?.response.text as string : undefined, gameCtx(view, b))}</fieldset></DraftScope.Provider>
              {attempt && !isExit && !finished && isInteractive(b) && b.type !== "game" && missionAllows(st,b.id,answers) && !missionChallenge(st,b.id) && <AiTutor key={`${attempt.id}:${b.id}`} attemptId={attempt.id} blockId={b.id} />}
              {reviews.filter(r => r.block_id === b.id).map(r => <div key={r.block_id} className="rounded-xl bg-good-soft p-4 border border-good/25"><p className="font-semibold">Мугалимдин баалоосу: {r.criteria_met.filter(Boolean).length}/{r.criteria_met.length} критерий</p>{b.type === "open" && b.rubric?.map((x,i) => <p key={i} className="mt-1 text-sm">{r.criteria_met[i] ? "Аткарылды" : "Дагы иштөө керек"}: {x}</p>)}<p className="mt-3 whitespace-pre-wrap">{r.feedback}</p></div>)}
              {b.support && missionAllows(st,b.id,answers) && <details className="rounded-xl bg-accent-soft p-3 border border-accent/20"><summary className="min-h-11 cursor-pointer font-semibold">Жардам керекпи?</summary><RichText text={b.support} /></details>}
              {b.extension && answers[b.id] && <details className="rounded-xl bg-surface-2 p-3 border border-line"><summary className="min-h-11 cursor-pointer font-semibold">Тереңдетип көр</summary><RichText text={b.extension} /></details>}
            </div>
          ))}

          {isExit && goalInfo && goalInfo.criteria.length > 0 && (preview || finished || unlocked >= view || !!liveSession?.timed) && (
            <GoalCheck criteria={goalInfo.criteria} attemptId={attempt?.id} initial={readGoalCheck(answers[GOAL_CHECK_ID]?.response, goalInfo.criteria.length)} />
          )}

          {(!liveSession?.timed ? view === unlocked : isExit && !liveSession.ended) && (isExit || (content.model === "5e" && st.key === "practice") || !st.blocks.some(isInteractive)) && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={manualComplete} disabled={!stageDone(st, answers) || (!!liveSession?.timed && !stages.every(s=>stageDone(s,answers)))}>
                {isExit ? "Билетти тапшыруу" : "Окуп чыктым, улантуу"}
              </Button>
              {isExit && liveSession?.timed && !stages.every(s=>stageDone(s,answers)) && <p className="text-sm text-muted">Аяктай элек иштер бар. Мугалим менен улантуу жолун такта.</p>}
              {isExit && !stageDone(st, answers) && <span className="text-sm text-muted">Бардык суроолорго жооп бер.</span>}
            </div>
          )}
          {/* Түшүндүрүү бүткөндө билим карталары ачылат (2-этап). */}
          {st.key === "practice" && !!content.cards?.length && (unlocked > view ? (
            <div className="flex flex-col gap-3" role="status">
              <p className="flex items-center gap-2 text-sm font-medium text-accent-dark"><Icon name="star" size={16} className="fill-current text-amber" /> Жаңы билим {content.cards.length > 1 ? "карталары ачылды" : "картасы ачылды"}{attempt ? " — Билим китебиңе кошулду" : ""}</p>
              <div className="grid gap-3 sm:grid-cols-2">{content.cards.map((k) => <KnowledgeCardView key={k.id} card={k} />)}</div>
              {attempt && <Link href="/student/cards" className="self-start text-sm font-medium text-accent hover:underline">Билим китебин ачуу →</Link>}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-accent/30 bg-surface p-3 text-sm text-muted">Бул бөлүктү бүтүргөндө {content.cards.length} билим картасы ачылат.</p>
          ))}
        </section>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="secondary" disabled={view === 0 || !!liveSession?.timed} onClick={() => go(view - 1)}>
          ← Мурунку
        </Button>
        {view < stages.length - 1 && (
          <Button disabled={!canNext} onClick={() => go(view + 1)}>
            {liveSession?.timed?"Жалпы өтүүнү күт":canNext ? "Кийинки бөлүк →" : "Тапшырмаларды бүтүр"}
          </Button>
        )}
      </div>
    </div>
  );
}

function renderBlock(b: Block, saved: SavedAnswer | undefined, onAnswer: AnswerFn, exitMode: boolean, failed?: number, comparison?: string, game?: GameCtx) {
  switch (b.type) {
    case "game":
      return game ? <LessonGame key={b.id} block={b} saved={saved} {...game} /> : null;
    case "classification":return <Classification key={b.id} block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode} failed={failed}/>;
    case "spreadsheet":return <Spreadsheet key={b.id} block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode} failed={failed}/>;
    case "matching":
    case "ordering":
      return <InteractiveTask key={b.id} block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode} failed={failed}/>;
    case "presentation":
      return <Presentation key={b.id} block={b} />;
    case "investigation":
      return <Investigation block={b} saved={saved} onAnswer={onAnswer} />;
    case "text":
      return (
        <>
          {b.title && <h3 className="font-semibold">{b.title}</h3>}
          <RichText text={b.body} />
        </>
      );
    case "code_example":
      return <CodeExample block={b} />;
    case "mcq":
      return <Mcq block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode || !!b.precheck} failed={failed} />;
    case "code_task":
      return <CodeTask block={b} saved={saved} onAnswer={onAnswer} />;
    case "parsons":
      return <Parsons block={b} saved={saved} onAnswer={onAnswer} failed={failed} />;
    case "bug_hunt":
      return <BugHunt block={b} saved={saved} onAnswer={onAnswer} failed={failed} />;
    case "open":
      return <Open block={b} saved={saved} onAnswer={onAnswer} comparison={comparison} />;
    case "confidence":
      return <Confidence block={b} saved={saved} onAnswer={onAnswer} />;
  }
}

function FinishCard({ score, total, xp, backHref, preview, growth }: { score: number; total: number; xp: number; backHref: string; preview: boolean; growth: ReturnType<typeof lessonGrowth> }) {
  const stars = lessonStars(score, total);
  const msg = score === total ? "Мыкты! Баалоодогу бардык тапшырмалар туура." : score >= total / 2 ? "Жакшы натыйжа." : "Бул теманы дагы бир кайталап алалы.";
  return (
    <section className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface p-6 shadow-xs">
      <div className="flex items-center gap-1" role="img" aria-label={`${stars} жылдыз 3төн`}>
        {[1, 2, 3].map((k) => (
          <Icon key={k} name="star" size={30} className={k <= stars ? "fill-current text-amber" : "text-line-strong"} />
        ))}
      </div>
      <span className="font-mono text-5xl font-medium tracking-tight text-accent tabular-nums">
        {score}/{total}
      </span>
      {growth && (
        <p className="rounded-md border border-good/25 bg-good-soft px-3 py-2 text-sm text-good">
          Сабактын башында: <b>{growth.before}/{growth.beforeTotal}</b> → аягында: <b>{growth.after}/{growth.afterTotal}</b>
          {growth.afterTotal && growth.beforeTotal && growth.after / growth.afterTotal > growth.before / growth.beforeTotal ? ". Сен өстүң!" : "."}
        </p>
      )}
      <h2 className="text-xl font-medium">{msg}</h2>
      <p className="text-muted">
        {preview ? "Алдын ала көрүү: окуучу ушул экранды көрөт." : `Жоопторуң мугалимге жөнөтүлдү. Бул сабактан ${xp} XP топтодуң.`}
      </p>
      {!preview && <Link href="/student/shop" className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-soft px-4 py-2 font-semibold text-amber border border-amber/25"><CoinIcon/>Монета капчыгым жана дүкөн →</Link>}
      <Link href={backHref} className="font-semibold text-accent">
        {preview ? "Сабакка кайтуу →" : "Сабактарыма кайтуу →"}
      </Link>
    </section>
  );
}
