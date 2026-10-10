"use client";

import { useMemo, useState } from "react";
import {
  addDay,
  analyzeMain,
  ATTENDANCE_REWARDS,
  bossEntry,
  bossCommunityPreset,
  bossLabel,
  bossListWeeklyRaw,
  bossPreset,
  bossRaw,
  buildMissionTable,
  COINS_PER_STEP,
  compareAlloc,
  epicBonusStage1Info,
  eventWeek,
  compareDesignation,
  compareTiers,
  couponRawForLevel,
  diffDays,
  FLAME_STOCK_CAP,
  FLAME_WEEKLY_ADD,
  flameModelRaw,
  MAIN_SCHEDULE,
  huntFieldLevelFor,
  MISSION_STEPS,
  mobBaseExp,
  plusLevelSchedule,
  simulateMain,
} from "@/lib/main-planner.mjs";
import { BOSS_COMMUNITY_PRESETS, HUNTING_FIELDS, PERSONAL_BOSS_TABLE, PERSONAL_COUPON_MULTIPLE, PERSONAL_FLAME_MULTIPLE, WEEKLY_BOSS_LIMIT } from "@/lib/personal-data.mjs";
import type { MainInput, MainInputState } from "./use-main-input";

// 경험치 표 어댑터가 돌려주는 모양. lib/exp-tables.ts 의 createMainContext 와 같다.
export type MainContext = {
  levelCap: number;
  reqRaw: (level: number) => number;
  routineRaw: (args: { level: number; runs: number; sundayKind: "none" | "normal" | "special"; grandis: boolean }) => { monsterPark: number; grandis: number };
  weeklyRaw: (args: { level: number; epicMult: number }) => { extreme: number; epic: number };
  itemRaw: (type: string, level: number) => number;
  plusReward: (level: number, tier: "free" | "premium" | "prime") => { crimson: number; adv: number; sauna: number };
};

const TRILLION = 1e12;

type Tier = "free" | "premium" | "prime";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = any;

const md = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
const fmtJo = (raw: number, digits = 1) => `${(raw / TRILLION).toFixed(digits)}조`;
const fmtEok = (raw: number) => `${(raw / 1e8).toFixed(raw >= 1e10 ? 0 : 1)}억`;
const fmtInt = (value: number) => Math.round(value).toLocaleString("ko-KR");
const place = (level: number, exp: number) => `Lv.${level} ${exp.toFixed(1)}%`;
const dow = (key: string) => "일월화수목금토"[new Date(`${key}T00:00:00Z`).getUTCDay()];

// 보스 상한 고르기용: 솔로 경험치가 큰 순서.
const BOSS_LADDER = [...PERSONAL_BOSS_TABLE].sort((a, b) => b.unitExp - a.unitExp);
type BossRow = (typeof PERSONAL_BOSS_TABLE)[number];
// 보스 이름별로 묶고(난이도는 쉬운 순), 가장 쉬운 난이도의 경험치가 낮은 보스부터 늘어놓는다.
const BOSS_GROUPS: { boss: string; entries: BossRow[] }[] = (() => {
  const map = new Map<string, BossRow[]>();
  [...PERSONAL_BOSS_TABLE].sort((a, b) => a.unitExp - b.unitExp).forEach(entry => { map.set(entry.boss, [...(map.get(entry.boss) || []), entry]); });
  return [...map.entries()].map(([boss, entries]) => ({ boss, entries }));
})();
// 코인샵에서 흔히 노리는 묶음(공식 가격표): 블랙 큐브 100개 8,500 + 화이트 에디셔널 큐브 100개 13,000 = 21,500, 솔 에르다 조각 300개 4,500을 더하면 26,000, 전 품목 36,500.
const SHOP_GOALS = [{ label: "큐브 2종", coins: 21_500 }, { label: "큐브 2종 + 조각 300개", coins: 26_000 }, { label: "전 품목", coins: 36_500 }];
const DIFFICULTY_CLASS: Record<string, string> = { 이지: "easy", 노멀: "normal", 하드: "hard", 카오스: "chaos", 익스트림: "extreme" };
// 사냥터 고르기용 몬스터 목록(지역 → 몬스터).
const FIELD_OPTIONS = HUNTING_FIELDS.map((field, index) => ({ key: `${index}`, region: field.region, label: `${field.monster} · Lv.${field.level} · ${field.maps.slice(0, 2).join(", ")}${field.maps.length > 2 ? " 외" : ""}`, level: field.level }));
const FIELD_REGIONS = [...new Set(HUNTING_FIELDS.map(field => field.region))];

function NumField({ label, value, onChange, step, min, max, hint, disabled }: { label: string; value: number; onChange: (value: number) => void; step?: number; min?: number; max?: number; hint?: string; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // 입력 중에는 사용자가 친 문자열을 그대로 두고, 포커스가 빠지면 저장된 값을 보여 준다.
  const shown = focused ? text : String(value);
  return <label className="field"><span>{label}</span>
    <input type="number" inputMode="decimal" value={shown} step={step} min={min} max={max} disabled={disabled}
      onFocus={() => { setText(String(value)); setFocused(true); }} onBlur={() => setFocused(false)}
      onChange={event => { setText(event.target.value); const parsed = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(parsed)) onChange(parsed); }} />
    {hint && <small className="pb-hint">{hint}</small>}
  </label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="pb-check"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}

// 버튼 줄에서 좌우 방향키로 옆 버튼으로 옮겨 가며 고른다.
const tabKeys = (event: { key: string; currentTarget: HTMLElement; preventDefault: () => void }) => {
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
  const tabs = [...(event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
  const at = tabs.indexOf(event.currentTarget);
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (at + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault();
  tabs[next]?.focus();
  tabs[next]?.click();
};

export default function PersonalPlanner({ ctx, state }: { ctx: MainContext; state: MainInputState }) {
  const { input, upd, reset, today } = state;
  const [crimsonPlan, setCrimsonPlan] = useState<"auto" | number>("auto");
  const [couponPlan, setCouponPlan] = useState<"auto" | "now" | "end">("auto");
  const [sec, setSec] = useState("s0");
  const [resPick, setResPick] = useState("r2");
  const setResTab = setResPick;
  const [bossCutoff, setBossCutoff] = useState("");
  const [bossParty, setBossParty] = useState<"solo" | "max">("solo");

  const analysis = useMemo(() => analyzeMain(input, ctx), [input, ctx]);
  const chosen = useMemo(() => {
    if (crimsonPlan === "auto" && couponPlan === "auto") return analysis.best;
    const crimsonHold = crimsonPlan === "auto" ? analysis.best.crimsonHold : crimsonPlan;
    const policy = couponPlan === "auto" ? analysis.best.couponPolicy : couponPlan;
    const result = simulateMain({ ...input, crimsonHold, personal: { ...input.personal, couponPolicy: policy } }, ctx);
    return { crimsonHold, couponPolicy: policy, result, summary: { level: result.level, exp: result.exp, progress: result.progress, stepsCleared: result.mission.stepsCleared, coins: result.mission.coins }, best: false };
  }, [analysis, crimsonPlan, couponPlan, input, ctx]);

  const r: Result = chosen.result;
  const plusAvailable = input.plus.enabled && diffDays(MAIN_SCHEDULE.plusLastUseDay, input.start) >= 0;
  const plusPlan = useMemo(() => plusLevelSchedule(input.plus, input.start), [input.plus, input.start]);
  const tiers = useMemo(() => (plusAvailable ? compareTiers(input, ctx) : []), [plusAvailable, input, ctx]);
  const designations = useMemo(() => compareDesignation(input, ctx), [input, ctx]);
  const allocRows = useMemo(() => compareAlloc(input, ctx), [input, ctx]);
  const eventOver = diffDays(input.start, MAIN_SCHEDULE.personalEnd) > 0;
  const startLevel = Math.max(280, Math.min(ctx.levelCap - 1, Math.floor(input.level)));
  const days = r.rows.length;

  const flame = input.personal.flame;
  const flameFieldLevel = huntFieldLevelFor(flame, startLevel);
  const flameRaw = flame.expPerKill > 0 ? flame.expPerKill : flameModelRaw(flameFieldLevel);
  const couponAtStart = couponRawForLevel(startLevel);
  const weeklyFlameRaw = Math.min(flame.killsPerWeek, FLAME_WEEKLY_ADD) * flameRaw;
  const weeklyCoupons = Math.min(flame.killsPerWeek, FLAME_WEEKLY_ADD) * flame.alloc.exp / 100;
  const weeklyCouponRaw = weeklyCoupons * couponAtStart;
  const weekInfo = eventWeek(input.start);
  // EXP 보너스 1단계가 더해 주는 양(기본 보상의 4배)을 교환권 장수로 바꿔 보여 준다.
  const epicStage1 = epicBonusStage1Info(startLevel);
  const epicStage1AddRaw = ctx.weeklyRaw({ level: startLevel, epicMult: 5 }).epic - ctx.weeklyRaw({ level: startLevel, epicMult: 1 }).epic;
  const epicStage1Coupons = epicStage1AddRaw / couponAtStart;
  const couponsPerPointWeek = FLAME_WEEKLY_ADD / 100;
  const flameOwnRaw = flameModelRaw(startLevel);
  const flameTopLevel = huntFieldLevelFor({ fieldLevel: 0, fieldKey: "" }, startLevel);
  const flameTopRaw = flameModelRaw(flameTopLevel);
  const bosses = input.personal.bosses as { id: string; party: number; doneThisWeek: boolean }[];
  const weeklyBossRaw = bossListWeeklyRaw(bosses.slice(0, WEEKLY_BOSS_LIMIT));

  // 기준일 입력에는 그날 충전분이 들어 있으므로 다음 충전은 기준일 다음 목요일이다.
  const nextRefill = (() => { let day = addDay(input.start, 1); for (let i = 0; i < 8; i += 1) { if (dow(day) === "목") break; day = addDay(day, 1); } return diffDays(day, MAIN_SCHEDULE.personalEnd) <= 0 ? day : ""; })();
  const reachDate = (level: number) => r.rows.find((row: { level: number }) => row.level >= level)?.date as string | undefined;
  const nextLevels = Array.from({ length: startLevel >= 295 ? ctx.levelCap - startLevel : 3 }, (_, index) => startLevel + index + 1).filter(level => level <= ctx.levelCap);
  const clearedDates = new Map<number, string>();
  r.mission.newlyCleared.forEach((step: { index: number; date: string }) => clearedDates.set(step.index, step.date));

  const shortfall = r.mission.shortfall as { index: number; level: number; exp: number; remainingRaw: number } | null;
  const allocTotal = flame.alloc.shard + flame.alloc.exp + flame.alloc.erda;
  const sourceRows = (Object.entries(r.sourceRaw) as [string, number][])
    .map(([id, raw]) => ({ id, raw }))
    .filter(row => row.raw > 0)
    .sort((a, b) => b.raw - a.raw);
  const sourceLabels: Record<string, string> = {
    monsterPark: "몬스터파크", grandis: "그란디스 일퀘", extreme: "익스트림 몬파(주간)", epic: "에픽 던전(주간)", routine: "일과(직접 입력)", weekly: "주간 컨텐츠(직접 입력)",
    flame: "퍼스널 플레임", coupon: "퍼스널 EXP 교환권", boss: "퍼스널 보스 미션", missionReward: "성장 미션 단계 보상",
    crimson: "크림슨 메카베리", adv: "상급 EXP 교환권", sauna: "VIP 사우나", blue: "블루베리", mech: "메카베리", potion: "성장의 비약",
    hunt: "사냥", coupon4x: "경험치 4배 쿠폰(PLUS)", booster: "VIP 부스터(PLUS)",
    attendanceAdv: "상급 EXP(출석·보유)", attendanceSauna: "VIP 사우나(출석·보유)", attendanceBooster: "VIP 부스터(출석·보유)", attendancePotion269: "성장의 비약(200~269)", attendancePotion279: "성장의 비약(200~279)",
  };
  const totalRaw = sourceRows.reduce((sum, row) => sum + row.raw, 0) || 1;

  const advices: { tone: "warn" | "info"; text: string }[] = [];
  if (r.flame.overflowLost > 0) {
    advices.push({ tone: "warn", text: `플레임 보유 한도 36,000마리에 막혀 ${fmtInt(r.flame.overflowLost)}마리가 소실됩니다. 매주 목요일 0시에 24,000마리가 더해지니, 그 전에 보유량을 12,000마리 이하로 줄이세요. 못 받은 만큼은 메이플포인트 10당 1마리로 충전할 수 있습니다.` });
  }
  if (shortfall && days > 0) {
    const perDay = shortfall.remainingRaw / days;
    advices.push({
      tone: "warn",
      text: `마감까지 ${shortfall.index}단계(${shortfall.level}레벨 ${shortfall.exp.toFixed(1)}%)부터 못 넘습니다. 부족한 경험치는 ${fmtJo(shortfall.remainingRaw)}입니다. 하루 ${fmtJo(perDay, 2)}씩 더 얻거나, 퍼스널 EXP 교환권 약 ${fmtInt(shortfall.remainingRaw / Math.max(1, couponRawForLevel(r.level)))}장, 플레임 약 ${fmtInt(shortfall.remainingRaw / Math.max(1, flameRaw))}마리에 해당합니다. 단계마다 코인 ${fmtInt(COINS_PER_STEP)}개도 같이 놓칩니다.`,
    });
  }
  const expiredPlus = r.items.expired.crimson + r.items.expired.adv + r.items.expired.sauna;
  if (expiredPlus > 0) advices.push({ tone: "warn", text: `PLUS 아이템이 10/22 02:00에 소멸합니다. 크림슨 ${fmtInt(r.items.expired.crimson)}장, 상급 EXP ${fmtInt(r.items.expired.adv)}장, 사우나 ${r.items.expired.sauna.toFixed(1)}시간이 남습니다. 300레벨에 닿으면 더 쓸 수 없습니다.` });
  if (Object.values(r.attendance.expired).some(value => Number(value) > 0)) advices.push({ tone: "warn", text: `출석·보유 보상을 마감까지 다 쓰지 못합니다. 비약(269) ${fmtInt(r.attendance.expired.potion269)}개 · 비약(279) ${fmtInt(r.attendance.expired.potion279)}개 · 상급 EXP ${fmtInt(r.attendance.expired.adv)}장 · 부스터 ${r.attendance.expired.booster.toFixed(1)}개 · 사우나 ${r.attendance.expired.sauna.toFixed(1)}시간. 사용 기한은 11/19 02:00입니다.` });
  const unusedHuntItems = (r.items.expired.coupon4x || 0) + (r.items.expired.booster || 0);
  if (unusedHuntItems > 0.01) advices.push({ tone: "warn", text: `PLUS로 받은 경험치 4배 쿠폰 ${(r.items.expired.coupon4x || 0).toFixed(1)}장, VIP 부스터 ${(r.items.expired.booster || 0).toFixed(1)}개를 10/21까지 다 쓰지 못합니다. 둘 다 사냥하는 동안에만 쓸 수 있으니 「주간 사냥 시간」을 늘려야 합니다(쿠폰은 30분에 1장).` });
  if (r.coupons.expired > 0) advices.push({ tone: "warn", text: `교환권 ${fmtInt(r.coupons.expired)}장을 마감까지 쓰지 못합니다. 11/19 02:00에 소멸합니다.` });
  if (allocTotal > 3 + 1e-9) advices.push({ tone: "warn", text: "커스텀 포인트 합계가 3을 넘습니다. 게임에서는 3개를 나눠 씁니다." });
  if (allocTotal < 3 - 1e-9) advices.push({ tone: "info", text: "커스텀 포인트를 모두 쓰지 않으면 플레임을 소환할 수 없습니다. 합계를 3으로 맞추세요." });
  r.warnings.forEach((text: string) => advices.push({ tone: text.startsWith("다음 단계 목표(") ? "warn" : "info", text }));
  if (r.atCap) advices.push({ tone: "info", text: "300레벨에 닿았습니다." });

  const stale = input.start < today;
  const crimsonOptions: { label: string; value: "auto" | number }[] = [
    { label: "자동 (가장 좋은 방식)", value: "auto" }, { label: "받는 즉시", value: 0 },
    ...[285, 290, 295].filter(level => level > startLevel).map(level => ({ label: `Lv.${level}까지 모음`, value: level })),
    { label: "10/21까지 모음", value: 999 },
  ];

  const holdLabel = (hold: number) => (hold === 0 ? "받는 즉시" : hold >= 999 ? "10/21까지 모음" : `Lv.${hold}까지 모음`);
  const couponLabel = (policy: string) => (policy === "now" ? "받는 즉시" : "마감 직전에 몰아서");
  const bestOf = (predicate: (option: typeof analysis.options[number]) => boolean) => {
    const matching = analysis.options.filter(predicate);
    return matching.reduce((best: typeof matching[number], option: typeof matching[number]) => (option.summary.stepsCleared !== best.summary.stepsCleared ? (option.summary.stepsCleared > best.summary.stepsCleared ? option : best) : (option.summary.progress > best.summary.progress ? option : best)), matching[0]);
  };
  // 30단계와의 코인 차이, 그리고 사용 시점에 따라 코인을 얼마나 먼저 받는지(패스 보상 마감일 기준).
  const totalCoins = r.mission.stepsCleared * COINS_PER_STEP;
  const coinGap = (MISSION_STEPS - r.mission.stepsCleared) * COINS_PER_STEP;
  // 모아 쓰는 쪽은 마감일(10/21)에 한꺼번에 쓰므로, 그 전날까지 받은 코인으로 비교해야 차이가 보인다.
  const refDay = addDay(MAIN_SCHEDULE.plusLastUseDay, -1);
  const showRefCoins = diffDays(refDay, input.start) > 0 && diffDays(MAIN_SCHEDULE.personalEnd, refDay) > 0;
  const coinsBy = (option: { result?: { mission: { stepsAtStart: number; newlyCleared: { date: string }[] } } }) => {
    const mission = option.result?.mission;
    if (!mission) return "-";
    return `${fmtInt((mission.newlyCleared.filter(step => diffDays(step.date, refDay) <= 0).length) * COINS_PER_STEP)}`;
  };
  const coinsByNumber = (option: { result?: { mission: { newlyCleared: { date: string }[] } } }) => (option.result?.mission.newlyCleared.filter(step => diffDays(step.date, refDay) <= 0).length ?? 0) * COINS_PER_STEP;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${fmtInt(value)}`;
  const crimsonRows = [...new Set(analysis.options.map((option: { crimsonHold: number }) => option.crimsonHold))].map(hold => bestOf(option => option.crimsonHold === hold));
  const couponRows = ["now", "end"].map(policy => bestOf(option => option.couponPolicy === policy));
  const hasCrimson = analysis.options.some((option: { result: Result }) => option.result.items.crimsonUsed > 0);

  const applyCommunityPreset = (presetId: string) => upd((draft: MainInput) => { draft.personal.bosses = bossCommunityPreset(presetId, bossParty); });
  const applyBossPreset = () => { if (bossCutoff) upd((draft: MainInput) => { draft.personal.bosses = bossPreset({ cutoffId: bossCutoff, partyMode: bossParty }); }); };
  // 보스마다 한 줄: 난이도를 누르면 고르고, 같은 난이도를 다시 누르면 뺀다. 같은 보스는 난이도 하나만.
  const toggleBoss = (entry: BossRow) => upd((draft: MainInput) => {
    const list = draft.personal.bosses as { id: string; party: number; doneThisWeek: boolean }[];
    const index = list.findIndex(boss => bossEntry(boss.id)?.boss === entry.boss);
    if (index >= 0 && list[index].id === entry.id) list.splice(index, 1);
    else if (index >= 0) { list[index].id = entry.id; list[index].party = Math.min(list[index].party, entry.maxParty); }
    else if (list.length < WEEKLY_BOSS_LIMIT) list.push({ id: entry.id, party: bossParty === "max" ? entry.maxParty : 1, doneThisWeek: false });
  });
  const setAllParty = (mode: "solo" | "max") => { setBossParty(mode); upd((draft: MainInput) => { draft.personal.bosses.forEach((boss: { id: string; party: number }) => { boss.party = mode === "max" ? (bossEntry(boss.id)?.maxParty ?? 1) : 1; }); }); };
  const bossIdSet = new Set(bosses.map(boss => boss.id));
  const activePreset = BOSS_COMMUNITY_PRESETS.find(preset => preset.ids.length === bossIdSet.size && preset.ids.every((id: string) => bossIdSet.has(id)));
  const bossFull = bosses.length >= WEEKLY_BOSS_LIMIT;

  const resTab = ((resPick === "r1" && !(tiers.length > 1)) || (resPick === "r2" && !(allocRows.length > 0)) || (resPick === "r3" && !(designations.length > 0))) ? "r4" : resPick;
  return <section className="calculator-shell pb-shell tab-panel" id="personal-panel" role="tabpanel" aria-labelledby="personal-tab">
    <aside className="controls pb-controls">
      <div className="section-heading"><span>입력</span><div><p>본섭 · 9/17~11/18</p><h2>퍼스널 버닝 계산</h2></div>
        <button type="button" className="reset" onClick={reset}>기본값 복원</button></div>
      {stale && <div className="callout-mini" role="status">입력 기준일이 {md(input.start)}입니다. 오늘({md(today)}) 값으로 레벨·경험치·남은 플레임을 다시 넣고 기준일을 오늘로 맞추면 정확합니다. <button type="button" className="pb-link" onClick={() => upd((draft: MainInput) => { draft.start = today; })}>기준일을 오늘로</button></div>}

      <div className="pb-tabs" role="tablist" aria-label="입력 묶음">
        <button type="button" role="tab" id="pb-tab-s0" aria-controls="pb-pane-s0" tabIndex={sec === "s0" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s0"} className={sec === "s0" ? "on" : ""} onClick={() => setSec("s0")}><b>캐릭터</b><small>{`Lv.${startLevel} ${input.exp}%`}</small></button>
        <button type="button" role="tab" id="pb-tab-s1" aria-controls="pb-pane-s1" tabIndex={sec === "s1" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s1"} className={sec === "s1" ? "on" : ""} onClick={() => setSec("s1")}><b>성장 미션</b><small>{input.personal.designated ? `${input.personal.mission.stepsDone}/30단계 통과` : "지정 전"}</small></button>
        <button type="button" role="tab" id="pb-tab-s2" aria-controls="pb-pane-s2" tabIndex={sec === "s2" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s2"} className={sec === "s2" ? "on" : ""} onClick={() => setSec("s2")}><b>패스</b><small>{input.plus.enabled ? ({ free: "무료", premium: "프리미엄", prime: "프라임" } as Record<string, string>)[input.plus.tier] : "참여 안 함"}</small></button>
        <button type="button" role="tab" id="pb-tab-s3" aria-controls="pb-pane-s3" tabIndex={sec === "s3" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s3"} className={sec === "s3" ? "on" : ""} onClick={() => setSec("s3")}><b>보유 보상</b><small>11/18까지 사용</small></button>
        <button type="button" role="tab" id="pb-tab-s4" aria-controls="pb-pane-s4" tabIndex={sec === "s4" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s4"} className={sec === "s4" ? "on" : ""} onClick={() => setSec("s4")}><b>보스</b><small>{`${Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}/${WEEKLY_BOSS_LIMIT}마리 · 주 ${fmtJo(weeklyBossRaw, 2)}`}</small></button>
        <button type="button" role="tab" id="pb-tab-s5" aria-controls="pb-pane-s5" tabIndex={sec === "s5" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s5"} className={sec === "s5" ? "on" : ""} onClick={() => setSec("s5")}><b>일과·사냥</b><small>{`몬파 ${input.routine.runsPerDay}판 · 에픽 ${input.routine.epic ? input.routine.epicMult : 0}배 · 사냥 주 ${input.routine.huntHoursPerWeek}시간`}</small></button>
        <button type="button" role="tab" id="pb-tab-s6" aria-controls="pb-pane-s6" tabIndex={sec === "s6" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s6"} className={sec === "s6" ? "on" : ""} onClick={() => setSec("s6")}><b>플레임</b><small>{`조각 ${flame.alloc.shard} · EXP ${flame.alloc.exp}${flame.alloc.erda ? ` · 솔 에르다 ${flame.alloc.erda}` : ""}`}</small></button>
        <button type="button" role="tab" id="pb-tab-s7" aria-controls="pb-pane-s7" tabIndex={sec === "s7" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s7"} className={sec === "s7" ? "on" : ""} onClick={() => setSec("s7")}><b>사용 시점</b><small>{"바꿀 때만"}</small></button>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s0" aria-labelledby="pb-tab-s0" hidden={sec !== "s0"}>
      <div className="field-grid compact">
        <label className="field"><span>기준일</span><input type="date" value={input.start} min={MAIN_SCHEDULE.personalStart} max={MAIN_SCHEDULE.personalEnd} onChange={event => event.target.value && upd((draft: MainInput) => { draft.start = event.target.value; })} /></label>
        <label className="field"><span>현재 레벨</span><select value={startLevel} onChange={event => upd((draft: MainInput) => { draft.level = Number(event.target.value); })}>{Array.from({ length: ctx.levelCap - 280 }, (_, index) => index + 280).map(level => <option key={level}>{level}</option>)}</select></label>
        <NumField label="현재 경험치 %" value={input.exp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.exp = value; })} />
      </div>
      {weekInfo.week > 0 && <p className="pb-note">기준일은 이벤트 <b>{weekInfo.week}주차</b>(전체 {weekInfo.total}주)입니다. 마감 11/18까지 {weekInfo.daysLeft}일, 플레임 충전은 {weekInfo.refillsLeft}번 남았습니다.</p>}
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s1" aria-labelledby="pb-tab-s1" hidden={sec !== "s1"}>
      <div className="pb-choice" role="group" aria-label="지정 여부">
        <button type="button" className={input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = true; })}>이미 지정했어요</button>
        <button type="button" className={!input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = false; })}>아직 안 했어요</button>
      </div>
      {input.personal.designated ? <>
        <div className="pb-choice" role="group" aria-label="단계표 입력 방식">
          <button type="button" className={input.personal.mission.mode === "screen" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "screen"; })}>다음 목표 직접 입력</button>
          <button type="button" className={input.personal.mission.mode === "model" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "model"; })}>지정할 때의 레벨로 입력</button>
        </div>
        {input.personal.mission.mode === "screen" ? <><div className="field-grid compact">
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={30} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} hint="남은 단계 개수만 정합니다. 목표 위치는 아래 다음 목표로 정해집니다" />
          <NumField label="다음 단계 보상 %" value={input.personal.mission.nextTarget.level >= ctx.levelCap ? 0 : input.personal.mission.nextRewardPct} disabled={input.personal.mission.nextTarget.level >= ctx.levelCap} min={0} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextRewardPct = value; })} hint="화면의 경험치 보상 %" />
          <NumField label="다음 단계 목표 레벨" value={input.personal.mission.nextTarget.level} min={280} max={ctx.levelCap} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.level = value; if (value >= ctx.levelCap) { draft.personal.mission.nextTarget.exp = 0; draft.personal.mission.nextRewardPct = 0; } })} />
          <NumField label="다음 단계 목표 %" value={input.personal.mission.nextTarget.level >= ctx.levelCap ? 0 : input.personal.mission.nextTarget.exp} disabled={input.personal.mission.nextTarget.level >= ctx.levelCap} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.exp = value; })} />
        </div>
        {input.personal.mission.stepsDone < 29 && <details className="pb-more"><summary>그다음 목표도 넣기</summary>
          <Check label="두 목표의 간격으로 계산" checked={Boolean(input.personal.mission.intervalEnabled)} onChange={value => upd((draft: MainInput) => {
            if (value && !draft.personal.mission.secondTarget) {
              const second = buildMissionTable({ ...draft.personal.mission, intervalEnabled: false }, ctx).steps[1];
              if (second) draft.personal.mission.secondTarget = { level: second.level, exp: second.exp };
            }
            draft.personal.mission.intervalEnabled = value;
          })} />
          <div className="field-grid compact">
            <NumField label="그다음 목표 레벨" value={input.personal.mission.secondTarget?.level ?? input.personal.mission.nextTarget.level} min={280} max={ctx.levelCap} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.secondTarget = { level: value, exp: value >= ctx.levelCap ? 0 : draft.personal.mission.secondTarget?.exp ?? 0 }; })} />
            <NumField label="그다음 목표 %" value={(input.personal.mission.secondTarget?.level ?? input.personal.mission.nextTarget.level) >= ctx.levelCap ? 0 : input.personal.mission.secondTarget?.exp ?? 0} disabled={(input.personal.mission.secondTarget?.level ?? input.personal.mission.nextTarget.level) >= ctx.levelCap} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.secondTarget = { level: draft.personal.mission.secondTarget?.level ?? draft.personal.mission.nextTarget.level, exp: value }; })} />
          </div>
          <p className="pb-note">두 목표 사이의 경험치를 마지막 단계까지 반복합니다.</p>
        </details>}</> : <div className="field-grid compact">
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={30} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} />
          <NumField label="지정 당시 레벨" value={input.personal.mission.designLevel} min={280} max={ctx.levelCap - 1} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designLevel = value; })} />
          <NumField label="지정 당시 경험치 %" value={input.personal.mission.designExp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designExp = value; })} />
        </div>}
      </> : <div className="field-grid compact">
        <label className="field"><span>지정 예정일</span><input type="date" value={input.personal.designDate} min={input.start} max={MAIN_SCHEDULE.personalEnd} onChange={event => event.target.value && upd((draft: MainInput) => { draft.personal.designDate = event.target.value; })} /></label>
      </div>}
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s2" aria-labelledby="pb-tab-s2" hidden={sec !== "s2"}>
      <div className="pb-checks"><Check label="PLUS 참여 중 (10/21까지)" checked={input.plus.enabled} onChange={value => upd((draft: MainInput) => { draft.plus.enabled = value; })} /></div>
      <div className="field-grid compact">
        <label className="field"><span>보유 등급</span><select value={input.plus.tier} disabled={!input.plus.enabled} onChange={event => upd((draft: MainInput) => { draft.plus.tier = event.target.value as Tier; })}><option value="free">무료</option><option value="premium">프리미엄</option><option value="prime">프라임</option></select></label>
        <NumField label="지금 PLUS 레벨" value={input.plus.currentLevel} min={0} max={10} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.currentLevel = Math.max(0, Math.min(10, Math.floor(value))); draft.plus.claimedLevel = Math.min(draft.plus.claimedLevel, draft.plus.currentLevel); draft.plus.levelPoints = 0; })} hint="게임의 패스 화면에 표시된 레벨" />
        <NumField label="그중 이미 받은 보상 레벨" value={input.plus.claimedLevel} min={0} max={input.plus.currentLevel} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.claimedLevel = value; })} hint="받은 보상 중 남은 것만 아래에 넣어 주세요" />
        <NumField label="주간 획득 포인트" value={input.plus.weeklyPoints} min={0} max={2500} step={100} onChange={value => upd((draft: MainInput) => { draft.plus.weeklyPoints = value; })} hint="다음 목요일부터 매주 받을 포인트 · 최대 2,500" />
      </div>
      <details className="pb-more"><summary>레벨 안의 포인트 · 이번 주 남은 포인트</summary><div className="field-grid compact">
        <NumField label="지금 레벨 안에 쌓인 포인트" value={input.plus.levelPoints} min={0} max={749} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.levelPoints = value; })} hint="패스 화면의 포인트 · 750을 채우면 다음 레벨" />
        <NumField label="이번 주 더 받을 포인트" value={input.plus.thisWeekRemaining} min={0} max={2500} step={100} onChange={value => upd((draft: MainInput) => { draft.plus.thisWeekRemaining = value; })} hint="이 수량은 이번 수요일에 더해요" />
      </div></details>
      {plusAvailable && <p className="pb-note">10/21 예상 PLUS Lv.{plusPlan.at(-1)?.level ?? input.plus.currentLevel}</p>}
      <div className="field-grid compact">
        <NumField label="크림슨 메카베리 농장" value={input.items.crimson} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.crimson = value; })} hint="장" />
        <NumField label="상급 EXP 교환권" value={input.items.adv} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.items.adv = value; })} hint="장" />
        <NumField label="VIP 사우나" value={input.items.sauna} min={0} step={0.5} onChange={value => upd((draft: MainInput) => { draft.items.sauna = value; })} hint="시간" />
        <NumField label="메카베리 농장" value={input.items.mech} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.mech = value; })} hint="장" />
        <NumField label="블루베리 농장" value={input.items.blue} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.blue = value; })} hint="장" />
        <NumField label="PLUS VIP 부스터" value={input.items.booster || 0} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.booster = value; })} hint="개 · 10/21까지 사냥할 때 사용" />
        <NumField label="PLUS 경험치 4배 쿠폰" value={input.items.coupon4x || 0} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.coupon4x = value; })} hint="장 · 10/21까지 사냥할 때 사용" />
      </div>
      <p className="pb-note">아직 안 받은 보상은 레벨에 맞춰 더해요. 이미 받은 보상은 아래 남은 수량만 계산해요.</p>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s3" aria-labelledby="pb-tab-s3" hidden={sec !== "s3"}>
        <p className="pb-note">이 캐릭터에 쓸 남은 것만 넣어 주세요. 출석 보상은 명의 내 지정한 메이플ID 한 곳에서만 받습니다. 이미 쓴 보상이나 다른 캐릭터에 줄 보상은 빼 주세요.</p>
        <button type="button" className="pb-add" onClick={() => upd((draft: MainInput) => { draft.attendance = { ...ATTENDANCE_REWARDS }; })}>출석 보상 전부 넣기</button>
        <p className="pb-note">40일 전체 수량으로 바꿉니다. 아직 못 받은 것도 있으니, 이 캐릭터에 남아 있는 양으로 다시 맞춰 주세요. 사용 기한은 모두 11/19 02:00입니다.</p>
        <div className="field-grid compact">
          <NumField label="성장의 비약 (200~269)" value={input.attendance.potion269} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.attendance.potion269 = value; })} hint="개" />
          <NumField label="성장의 비약 (200~279)" value={input.attendance.potion279} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.attendance.potion279 = value; })} hint="개" />
          <NumField label="상급 EXP 교환권" value={input.attendance.adv} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.attendance.adv = value; })} hint="장" />
          <NumField label="VIP 부스터" value={input.attendance.booster} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.attendance.booster = value; })} hint="개 · 사냥할 때만 사용" />
          <NumField label="VIP 사우나" value={input.attendance.sauna} min={0} step={0.5} onChange={value => upd((draft: MainInput) => { draft.attendance.sauna = value; })} hint="시간 · 이용권 1개 = 0.5시간" />
        </div>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s4" aria-labelledby="pb-tab-s4" hidden={sec !== "s4"}>
      <div className="pb-chips" role="group" aria-label="자주 쓰는 보스 구성">
        {BOSS_COMMUNITY_PRESETS.map(preset => <button type="button" key={preset.id} className={activePreset?.id === preset.id ? "on" : ""} title={preset.detail} onClick={() => applyCommunityPreset(preset.id)}>{preset.label}</button>)}
        <button type="button" className="clear" onClick={() => upd((draft: MainInput) => { draft.personal.bosses = []; })}>전부 빼기</button>
      </div>
      <div className="pb-choice" role="group" aria-label="파티원">
        <button type="button" className={bossParty === "solo" ? "on" : ""} onClick={() => setAllParty("solo")}>전부 솔로</button>
        <button type="button" className={bossParty === "max" ? "on" : ""} onClick={() => setAllParty("max")}>보스별 최대 인원</button>
      </div>
      <div className="pb-bossgrid">
        {BOSS_GROUPS.map(group => {
          const index = bosses.findIndex(boss => bossEntry(boss.id)?.boss === group.boss);
          const picked = index >= 0 ? bosses[index] : null;
          const pickedEntry = picked ? bossEntry(picked.id) : null;
          return <div className={`pb-bossrow${picked ? " on" : ""}`} key={group.boss}>
            <b className="pb-bossrow-name">{group.boss}</b>
            <div className="pb-diffs">{group.entries.map(entry => <button type="button" key={entry.id} className={`pb-diff ${DIFFICULTY_CLASS[entry.difficulty] || ""}${picked?.id === entry.id ? " on" : ""}`} aria-pressed={picked?.id === entry.id} disabled={!picked && bossFull} title={`솔로 ${fmtJo(entry.unitExp * 10_000, 3)}`} onClick={() => toggleBoss(entry)}>{entry.difficulty}</button>)}</div>
            {picked && pickedEntry ? <div className="pb-bossrow-detail">
              <select aria-label={`${group.boss} 파티원`} value={picked.party} onChange={event => upd((draft: MainInput) => { draft.personal.bosses[index].party = Number(event.target.value); })}>{Array.from({ length: pickedEntry.maxParty }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}인</option>)}</select>
              <span className="pb-bossrow-exp">{fmtJo(bossRaw(picked.id, picked.party), 3)}</span>
              <label className="pb-bossrow-done" title="이번 주에 이미 잡았으면 체크"><input type="checkbox" checked={picked.doneThisWeek} onChange={event => upd((draft: MainInput) => { draft.personal.bosses[index].doneThisWeek = event.target.checked; })} />잡음</label>
            </div> : null}
          </div>;
        })}
      </div>
      <p className="pb-note pb-bosssum"><b>주간 합계 {fmtJo(weeklyBossRaw, 2)}</b> · Lv.{startLevel} 기준 {(weeklyBossRaw / ctx.reqRaw(startLevel) * 100).toFixed(2)}%p · {Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}/{WEEKLY_BOSS_LIMIT}마리{bossFull ? " · 12마리를 다 채웠습니다. 바꾸려면 하나를 먼저 빼세요." : ""}</p>
      <details className="pb-more">
        <summary>가장 센 보스만 골라 한 번에 채우기</summary>
        <div className="field-grid compact">
          <label className="field"><span>가장 센 보스 (여기까지 잡음)</span>
            <select value={bossCutoff} onChange={event => setBossCutoff(event.target.value)}>
              <option value="">선택 안 함</option>
              {BOSS_LADDER.map(entry => <option key={entry.id} value={entry.id}>{entry.boss} {entry.difficulty} · {fmtJo(entry.unitExp * 10_000, 2)}</option>)}
            </select></label>
        </div>
        <button type="button" className="pb-add" disabled={!bossCutoff} onClick={applyBossPreset}>{bossCutoff ? `${bossLabel(bossCutoff)} 이하로 채우기` : "가장 센 보스를 고르면 채울 수 있어요"}</button>
        <p className="pb-note">고른 보스 이하에서 보스마다 가장 센 난이도를 경험치 높은 순으로 {WEEKLY_BOSS_LIMIT}마리까지 채웁니다.</p>
      </details>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s5" aria-labelledby="pb-tab-s5" hidden={sec !== "s5"}>
      <div className="field-grid compact">
        <NumField label="몬스터파크 하루 판수" value={input.routine.runsPerDay} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.runsPerDay = value; })} hint="무료 2판. 이용권·메이플포인트로 하루 7판까지" />
        <NumField label="일요일 판수" value={input.routine.sundayRuns} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.sundayRuns = value; })} hint="일요일은 경험치 1.5배. 일요일만 7판 돌면 7" />
        <label className="field"><span>에픽 던전 보상 배수</span><select value={input.routine.epicMult} onChange={event => upd((draft: MainInput) => { draft.routine.epicMult = Number(event.target.value); })}><option value={1}>보너스 없음 (1배 · 0 메이플포인트)</option><option value={5}>EXP 1단계 (합 5배, 흔히 4배 · {fmtInt(epicStage1.maplePoint)} 메이플포인트)</option><option value={9}>EXP 2단계 (합 9배, 흔히 8배 · {fmtInt(epicStage1.maplePoint * 4)} 메이플포인트)</option></select></label>
        <NumField label="주간 사냥 시간" value={input.routine.huntHoursPerWeek} min={0} max={168} step={0.5} onChange={value => upd((draft: MainInput) => { draft.routine.huntHoursPerWeek = value; })} hint="시간. 위에서 고른 사냥터 기준. 0이면 사냥 없음" />
        <label className="field"><span>평소 사냥터 몬스터</span><select value={input.routine.huntFieldKey} onChange={event => upd((draft: MainInput) => { draft.routine.huntFieldKey = event.target.value; if (event.target.value === "direct" && !draft.routine.huntFieldLevel) draft.routine.huntFieldLevel = startLevel; })}><option value="flame">플레임과 같게</option><option value="same">내 레벨 몬스터 (레벨업하면 따라감)</option><option value="direct">몬스터 레벨 직접 입력</option></select></label>
        {input.routine.huntFieldKey === "direct" && <NumField label="평소 사냥터 몬스터 레벨" value={input.routine.huntFieldLevel || startLevel} min={260} max={299} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.huntFieldLevel = value; })} hint="260~299 · 플레임 사냥터는 바뀌지 않음" />}
        <NumField label="사냥 추가 경험치 %" value={input.routine.huntBonusPct} min={0} max={3000} step={10} onChange={value => upd((draft: MainInput) => { draft.routine.huntBonusPct = value; })} hint="룬·경험치 쿠폰·버프·가호 합계. 0이면 순수 경험치" />
      </div>
      <details className="pb-more"><summary>가호 추가 경험치 · 내 수치 직접 넣기</summary>
      <div className="field-grid compact">
        <NumField label="몬스터파크 추가 경험치 %" value={input.routine.argoMonsterPark} min={0} max={50} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.argoMonsterPark = value; })} hint="아르고호의 가호 Lv1~6 = 5·10·20·30·40·50%. 익스트림 몬파에도 붙음" />
        <NumField label="그란디스 일퀘 추가 경험치 %" value={input.routine.argoGrandis} min={0} max={50} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.argoGrandis = value; })} hint="아르고호의 가호. Lv2 = 10%, 최대 50%" />
        <NumField label="에픽 던전 추가 경험치 %" value={input.routine.epicBonus} min={0} max={200} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.epicBonus = value; })} hint="따로 받는 추가 경험치가 있을 때만. 없으면 0" />
        <NumField label="하루 일과 직접 입력 %" value={input.routine.measuredPercentPerDay} min={0} step={0.01} onChange={value => upd((draft: MainInput) => { draft.routine.measuredPercentPerDay = value; })} hint="몬파·그란디스 대신 쓸 하루 값. 0이면 자동 계산" />
        <NumField label="주간 컨텐츠 직접 입력 %" value={input.routine.weeklyMeasuredPercent} min={0} step={0.01} onChange={value => upd((draft: MainInput) => { draft.routine.weeklyMeasuredPercent = value; })} hint="익몬·에픽 던전 대신 쓸 주간 값. 0이면 자동 계산" />
      </div>
      </details>
      <details className="pb-more"><summary>실제로 얻은 사냥 경험치로 계산</summary>
        <NumField label="30분 사냥으로 실제 얻은 경험치(억)" value={input.routine.huntMeasuredEokPer30Min} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.huntMeasuredEokPer30Min = value; })} hint="0이면 사냥터와 추가 경험치로 계산. 4배 쿠폰·부스터를 빼고 측정한 값. 사냥 추가 경험치 %를 다시 곱하지 않음" />
      </details>
      <div className="pb-checks">
        <Check label="그란디스 일퀘" checked={input.routine.grandis} onChange={value => upd((draft: MainInput) => { draft.routine.grandis = value; })} />
        <Check label="익스트림 몬파(주간)" checked={input.routine.extreme} onChange={value => upd((draft: MainInput) => { draft.routine.extreme = value; })} />
        <Check label="에픽 던전(주간)" checked={input.routine.epic} onChange={value => upd((draft: MainInput) => { draft.routine.epic = value; })} />
        <Check label="오늘 일과 아직 안 함" checked={input.routine.todayPending} onChange={value => upd((draft: MainInput) => { draft.routine.todayPending = value; })} />
        <Check label="이번 주 주간 컨텐츠 아직 안 함" checked={input.routine.weeklyPending} onChange={value => upd((draft: MainInput) => { draft.routine.weeklyPending = value; })} />
      </div>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s6" aria-labelledby="pb-tab-s6" hidden={sec !== "s6"}>
      <div className="field-grid compact">
        <NumField label="남은 플레임 수" value={flame.stock} min={0} max={FLAME_STOCK_CAP} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.stock = value; })} hint="오늘 충전분 포함" />
        <NumField label="주간 사냥 가능 마릿수" value={flame.killsPerWeek} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.personal.flame.killsPerWeek = value; })} hint={`전부 잡으면 ${fmtInt(FLAME_WEEKLY_ADD)}`} />
      </div>
      <label className="field pb-wide"><span>사냥터 (몬스터 레벨이 경험치를 정합니다)</span>
        <select value={flame.fieldKey || ""} onChange={event => { const option = FIELD_OPTIONS.find(item => item.key === event.target.value); upd((draft: MainInput) => { draft.personal.flame.fieldKey = event.target.value; draft.personal.flame.fieldLevel = option ? option.level : 0; }); }}>
          <option value="">추천: 갈 수 있는 지역의 가장 높은 몬스터 (지금 Lv.{huntFieldLevelFor({ fieldLevel: 0, fieldKey: "" }, startLevel)}, 레벨업하면 따라감)</option>
          <option value="same">내 레벨과 같은 몬스터 (지금 Lv.{startLevel}, 레벨업하면 따라감)</option>
          {FIELD_REGIONS.map(region => <optgroup key={region} label={region}>{FIELD_OPTIONS.filter(option => option.region === region).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}</optgroup>)}
        </select></label>
      <div className="field-grid compact">
        <NumField label="몬스터 레벨 직접 입력" value={flame.fieldLevel} min={0} max={299} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.fieldLevel = value; draft.personal.flame.fieldKey = ""; })} hint="260~299. 0이면 위 선택" />
        <NumField label="플레임 1마리 경험치" value={flame.expPerKill} min={0} step={1000} onChange={value => upd((draft: MainInput) => { draft.personal.flame.expPerKill = value; })} hint="경험치 로그 숫자. 0이면 자동 계산" />
        <NumField label="커스텀 · 조각" value={flame.alloc.shard} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.shard = value; })} />
        <NumField label="커스텀 · EXP" value={flame.alloc.exp} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.exp = value; })} />
        <NumField label="커스텀 · 솔 에르다" value={flame.alloc.erda} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.erda = value; })} />
        <NumField label="보유 EXP 교환권" value={flame.couponsOwned} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.couponsOwned = value; })} />
        <NumField label="보유 퍼스널 EXP 포인트" value={flame.expPointsOwned} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.personal.flame.expPointsOwned = value; })} hint="아직 교환 안 한 포인트. 100P = 교환권 1장" />
      </div>
      <div className="pb-formula" aria-label="플레임과 교환권 계산">
        {flame.expPerKill > 0
          ? <p><b>플레임 1마리</b> = 직접 넣은 값 <b>{fmtInt(flame.expPerKill)} EXP</b> (표 계산 대신 이 값을 씁니다)</p>
          : <p><b>플레임 1마리</b> = 몬스터 Lv.{flameFieldLevel} 기본 경험치 {fmtInt(mobBaseExp(flameFieldLevel))} × {PERSONAL_FLAME_MULTIPLE} = <b>{fmtEok(flameRaw)}</b></p>}
        <p><b>교환권 1장</b> = Lv.{startLevel} 기본 경험치 {fmtInt(mobBaseExp(startLevel))} × {PERSONAL_COUPON_MULTIPLE} = <b>{fmtEok(couponAtStart)}</b> ({(couponAtStart / ctx.reqRaw(startLevel) * 100).toFixed(4)}%)</p>
        {!(flame.expPerKill > 0) && flameTopLevel > startLevel && <p><b>사냥터 차이</b> = 주 24,000마리를 Lv.{flameTopLevel} 몬스터로 잡으면 {(FLAME_WEEKLY_ADD * flameTopRaw / ctx.reqRaw(startLevel) * 100).toFixed(2)}%, 내 레벨(Lv.{startLevel}) 몬스터로 잡으면 {(FLAME_WEEKLY_ADD * flameOwnRaw / ctx.reqRaw(startLevel) * 100).toFixed(2)}%. 차이 <b>{(FLAME_WEEKLY_ADD * (flameTopRaw - flameOwnRaw) / ctx.reqRaw(startLevel) * 100).toFixed(2)}%p</b>/주</p>}
        <p><b>주 24,000마리</b> = {fmtJo(weeklyFlameRaw, 2)} + 교환권 {fmtInt(weeklyCoupons)}장 {fmtJo(weeklyCouponRaw, 2)} = <b>{(((weeklyFlameRaw + weeklyCouponRaw) / ctx.reqRaw(startLevel)) * 100).toFixed(1)}%p</b>/주 (Lv.{startLevel} 기준)</p>
      </div>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s7" aria-labelledby="pb-tab-s7" hidden={sec !== "s7"}>
      <div className="field-grid compact">
        <label className="field"><span>크림슨 사용</span><select value={String(crimsonPlan)} onChange={event => setCrimsonPlan(event.target.value === "auto" ? "auto" : Number(event.target.value))}>{crimsonOptions.map(option => <option key={option.label} value={String(option.value)}>{option.label}</option>)}</select></label>
        <label className="field"><span>EXP 교환권 사용</span><select value={couponPlan} onChange={event => setCouponPlan(event.target.value as "auto" | "now" | "end")}><option value="auto">자동 (가장 좋은 방식)</option><option value="now">받는 즉시</option><option value="end">마감 직전에 몰아서</option></select></label>
      </div>
      </div>
    </aside>

    {!eventOver && <a className="pb-sticky" href="#pb-result" aria-label="계산 결과로 이동">
      <span>11/18 마감</span><b>{place(r.level, r.exp)}</b><b>{r.mission.stepsCleared}/{MISSION_STEPS}단계</b><i>결과 보기</i>
    </a>}
    <div className="results pb-results" id="pb-result">
      <div className="section-heading"><span>결과</span><div><p>{md(input.start)} → 11/18 마감</p><h2>퍼스널 버닝 시점 계산</h2></div></div>
      {eventOver && <div className="callout-mini" role="status">퍼스널 버닝은 11/18에 끝났습니다. 기준일을 이벤트 기간으로 바꿔 주세요.</div>}
      {!eventOver && <>
        <p className="pb-cond">계산 조건 · PLUS {input.plus.enabled ? ({ free: "무료", premium: "프리미엄", prime: "프라임" } as Record<string, string>)[input.plus.tier] : "참여 안 함"} · 보스 {Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}마리 주 {fmtJo(weeklyBossRaw, 2)} · 몬파 하루 {input.routine.runsPerDay}판 · 에픽 던전 {!input.routine.epic ? "안 함" : input.routine.epicMult > 1 ? `${input.routine.epicMult}배(주 ${fmtInt(epicStage1.maplePoint * (input.routine.epicMult >= 9 ? 4 : 1))} 메이플포인트 사용)` : "보너스 없음"} · 사냥 주 {input.routine.huntHoursPerWeek}시간 · 커스텀 조각 {flame.alloc.shard}·EXP {flame.alloc.exp}</p>
        <div className="pb-cards">
          <article className="pb-card primary"><span>11/18 마감 위치</span><strong>{place(r.level, r.exp)}</strong><em>시작 {place(startLevel, input.exp)} · +{(r.progress - r.startPosition).toFixed(2)}레벨</em></article>
          <article className="pb-card"><span>성장 미션</span><strong>{r.mission.stepsCleared}/{MISSION_STEPS}단계</strong><em>{coinGap > 0 ? `30단계보다 ${fmtInt(coinGap)}코인 적음` : "30,000코인 전부"} · 앞으로 받을 코인 {fmtInt(r.mission.coins)}개</em></article>
          <article className="pb-card"><span>플레임에서 받을 조각</span><strong>{Math.floor(r.flame.shardFragments + 1e-9).toLocaleString("ko-KR")}개</strong><em>플레임 {fmtInt(r.flame.killed)}마리 · 교환권 {fmtInt(r.coupons.used)}장 · 코인샵 조각은 별도</em></article>
        </div>

        {advices.length > 0 && <div className="pb-advice" aria-label="확인할 것">{advices.map((advice, index) => <p key={index} className={advice.tone}>{advice.text}</p>)}</div>}

        <p className="pb-cond pb-shop">코인샵 · 모을 코인 {fmtInt(totalCoins)}개{SHOP_GOALS.map(goal => <span key={goal.label} className={totalCoins >= goal.coins ? "ok" : "no"}>{goal.label} {fmtInt(goal.coins)}코인 {totalCoins >= goal.coins ? "가능" : `${fmtInt(goal.coins - totalCoins)}코인 부족`}</span>)}</p>
        <div className="pb-dates">
          {nextLevels.map(level => { const date = reachDate(level); return <span key={level}><b>Lv.{level}</b>{date ? `${md(date)}(${dow(date)}) 도달` : "마감까지 못 닿음"}</span>; })}
        </div>

        <div className="pb-tabs pb-rtabs" role="tablist" aria-label="자세히 보기">
          {allocRows.length > 0 && <button type="button" role="tab" id="pb-tab-r2" aria-controls="pb-pane-r2" tabIndex={resTab === "r2" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r2"} className={resTab === "r2" ? "on" : ""} onClick={() => setResTab("r2")}><b>포인트 배분</b></button>}
          <button type="button" role="tab" id="pb-tab-r4" aria-controls="pb-pane-r4" tabIndex={resTab === "r4" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r4"} className={resTab === "r4" ? "on" : ""} onClick={() => setResTab("r4")}><b>주차별</b></button>
          <button type="button" role="tab" id="pb-tab-r5" aria-controls="pb-pane-r5" tabIndex={resTab === "r5" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r5"} className={resTab === "r5" ? "on" : ""} onClick={() => setResTab("r5")}><b>단계표</b></button>
          {tiers.length > 1 && <button type="button" role="tab" id="pb-tab-r1" aria-controls="pb-pane-r1" tabIndex={resTab === "r1" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r1"} className={resTab === "r1" ? "on" : ""} onClick={() => setResTab("r1")}><b>패스 등급 비교</b></button>}
          <button type="button" role="tab" id="pb-tab-r0" aria-controls="pb-pane-r0" tabIndex={resTab === "r0" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r0"} className={resTab === "r0" ? "on" : ""} onClick={() => setResTab("r0")}><b>사용 시점 비교</b></button>
          {designations.length > 0 && <button type="button" role="tab" id="pb-tab-r3" aria-controls="pb-pane-r3" tabIndex={resTab === "r3" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r3"} className={resTab === "r3" ? "on" : ""} onClick={() => setResTab("r3")}><b>지정 시점</b></button>}
          <button type="button" role="tab" id="pb-tab-r6" aria-controls="pb-pane-r6" tabIndex={resTab === "r6" ? 0 : -1} onKeyDown={tabKeys} aria-selected={resTab === "r6"} className={resTab === "r6" ? "on" : ""} onClick={() => setResTab("r6")}><b>경험치 내역</b></button>
        </div>
        <div className="pb-result-section" role="tabpanel" id="pb-pane-r0" aria-labelledby="pb-tab-r0" tabIndex={0} hidden={resTab !== "r0"}>
        <p className="pb-note">크림슨 농장 사용 시점과 교환권 사용 시점을 모두 돌려 통과 단계, 마감 위치 순으로 골랐습니다. 선택은 왼쪽 「사용 시점」에서 바꿉니다.</p>
        {hasCrimson && <div className="pb-table-wrap"><table className="hold-table pb-table">
          <thead><tr><th>크림슨 사용</th><th>마감 위치</th><th>단계</th><th>차이</th>{showRefCoins && <th>{md(refDay)}까지 받는 코인</th>}</tr></thead>
          <tbody>{crimsonRows.map((row: { crimsonHold: number; summary: { level: number; exp: number; progress: number; stepsCleared: number }; best: boolean }) => <tr key={row.crimsonHold} className={row.crimsonHold === chosen.crimsonHold ? "best" : ""}>
            <td>{holdLabel(row.crimsonHold)}{row.crimsonHold === analysis.best.crimsonHold ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
            <td>{row.crimsonHold === 0 ? "기준" : `${((row.summary.progress - bestOf(option => option.crimsonHold === 0).summary.progress) * 100).toFixed(2)}%p`}</td>
            {showRefCoins && <td>{coinsBy(row)}개{row.crimsonHold === 0 ? "" : ` (${signed(coinsByNumber(row) - coinsByNumber(bestOf(option => option.crimsonHold === 0)))})`}</td>}</tr>)}</tbody>
        </table></div>}
        {!hasCrimson && <p className="pb-note">보유한 크림슨 농장이 없어 크림슨 사용 시점에 따른 차이가 없습니다.</p>}
        <div className="pb-table-wrap"><table className="hold-table pb-table">
          <thead><tr><th>EXP 교환권 사용</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
          <tbody>{couponRows.map((row: { couponPolicy: string; summary: { level: number; exp: number; progress: number; stepsCleared: number } }) => <tr key={row.couponPolicy} className={row.couponPolicy === chosen.couponPolicy ? "best" : ""}>
            <td>{couponLabel(row.couponPolicy)}{row.couponPolicy === analysis.best.couponPolicy ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
            <td>{row.couponPolicy === "now" ? "기준" : `${((row.summary.progress - bestOf(option => option.couponPolicy === "now").summary.progress) * 100).toFixed(2)}%p`}</td></tr>)}</tbody>
        </table></div>
        <p className="pb-note">교환권 한 장은 쓰는 시점의 레벨에 따라 경험치가 달라집니다(레벨의 몬스터 기본 경험치 × 480). 마감일(11/18) 안에 쓰면 소멸하지 않으므로 먼저 쓸지 몰아 쓸지는 이 표의 차이로 고르세요.</p>

        </div>
        {tiers.length > 1 && <div className="pb-result-section" role="tabpanel" id="pb-pane-r1" aria-labelledby="pb-tab-r1" tabIndex={0} hidden={resTab !== "r1"}>
          <p className="pb-note">지금 {input.plus.tier === "free" ? "무료" : input.plus.tier === "premium" ? "프리미엄" : "프라임"} 등급에서 올릴 때입니다. 이미 받은 레벨의 위 등급 보상도 구매하면 받을 수 있다고 봤습니다. 구매 전에 인게임 표기를 확인하세요.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>등급</th><th>캐시</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
            <tbody>{(tiers as unknown as { tier: Tier; cash: number; summary: { level: number; exp: number; stepsCleared: number }; gainProgress: number; gainSteps: number }[]).map(row => <tr key={row.tier} className={row.tier === input.plus.tier ? "best" : ""}>
              <td>{row.tier === "free" ? "무료" : row.tier === "premium" ? "프리미엄" : "프라임"}{row.tier === input.plus.tier ? " · 현재" : ""}</td>
              <td>{row.cash ? `${fmtInt(row.cash)}` : "-"}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
              <td>{row.tier === input.plus.tier ? "기준" : `+${row.gainProgress.toFixed(2)}%p${row.gainSteps ? ` · +${row.gainSteps}단계` : ""}${row.cash && row.gainProgress > 0 ? ` · 1%p당 ${fmtInt(row.cash / row.gainProgress)}캐시` : ""}`}</td></tr>)}</tbody>
          </table></div>
        </div>}

        {allocRows.length > 0 && <div className="pb-result-section" role="tabpanel" id="pb-pane-r2" aria-labelledby="pb-tab-r2" tabIndex={0} hidden={resTab !== "r2"}>
          <p className="pb-note">플레임 한 마리마다 리워드 포인트 3개를 어디에 줄지 고릅니다. 30단계를 어차피 넘으면 솔 에르다 조각에 다 주고, 못 넘으면 넘는 데 필요한 만큼만 퍼스널 EXP에 주는 쪽을 추천합니다. 나머지는 조각으로 계산했습니다.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>배분</th><th>마감 위치</th><th>단계</th><th>교환권</th><th>조각</th><th></th></tr></thead>
            <tbody>{allocRows.map((row: { alloc: { shard: number; exp: number; erda: number }; summary: { level: number; exp: number; stepsCleared: number }; couponsMade: number; shardFragments: number; recommended: boolean }) => {
              const current = flame.alloc.exp === row.alloc.exp && flame.alloc.shard === row.alloc.shard && flame.alloc.erda === 0;
              return <tr key={row.alloc.exp} className={row.recommended ? "best" : ""}>
                <td>EXP {row.alloc.exp} · 조각 {row.alloc.shard}{row.recommended ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td><td>{fmtInt(row.couponsMade)}장</td><td>{fmtInt(row.shardFragments)}개</td>
                <td>{current ? "지금 설정" : <button type="button" className="pb-link" onClick={() => upd((draft: MainInput) => { draft.personal.flame.alloc = { ...row.alloc }; })}>이 배분으로</button>}</td></tr>;
            })}</tbody>
          </table></div>
          {epicStage1AddRaw > 0 && <div className="pb-formula" aria-label="교환권과 에픽 던전 비교">
            <p><b>EXP에 1개</b> 줄 때마다 주 {fmtInt(couponsPerPointWeek)}장 = Lv.{startLevel}에서 <b>{(couponsPerPointWeek * couponAtStart / ctx.reqRaw(startLevel) * 100).toFixed(2)}%</b>, 대신 조각 {fmtInt(FLAME_WEEKLY_ADD / 1500)}개를 덜 받습니다.</p>
            <p><b>{epicStage1.name} EXP 1단계</b>({fmtInt(epicStage1.maplePoint)} 메이플포인트, 주 1회)가 더해 주는 경험치 = {fmtJo(epicStage1AddRaw, 2)} = <b>{(epicStage1AddRaw / ctx.reqRaw(startLevel) * 100).toFixed(2)}%</b> = 교환권 <b>{fmtInt(epicStage1Coupons)}장</b>어치</p>
            <p>EXP 3으로 한 주에 받는 {fmtInt(couponsPerPointWeek * 3)}장은 {epicStage1.name} 1단계 한 번의 <b>{(couponsPerPointWeek * 3 / epicStage1Coupons * 100).toFixed(0)}%</b>입니다. 1단계 한 번과 같아지려면 EXP 3으로 {(epicStage1Coupons / (couponsPerPointWeek * 3)).toFixed(1)}주, 조각으로는 {fmtInt(epicStage1Coupons / 15)}개를 포기해야 합니다.</p>
          </div>}
          <p className="pb-note">게임에서는 배분을 초기화해 다시 정할 수 있지만, 여기서는 마감까지 같은 배분으로 계산합니다. 솔 에르다에 주는 경우는 표에 넣지 않았습니다(위 입력칸에서 직접 넣을 수 있습니다).</p>
        </div>}

        {designations.length > 0 && <div className="pb-result-section" role="tabpanel" id="pb-pane-r3" aria-labelledby="pb-tab-r3" tabIndex={0} hidden={resTab !== "r3"}>
          <p className="pb-note">지정 전에는 플레임·미션·보스가 돌지 않습니다. 지정하면 되돌릴 수 없고 명의당 1캐릭터입니다.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>지정일</th><th>마감 위치</th><th>단계</th><th>플레임</th></tr></thead>
            <tbody>{designations.map((row: { designDate: string; summary: { level: number; exp: number; stepsCleared: number }; flameKilled: number }) => <tr key={row.designDate} className={row.designDate === input.personal.designDate ? "best" : ""}>
              <td>{md(row.designDate)}({dow(row.designDate)}){row.designDate === input.personal.designDate ? " · 선택" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td><td>{fmtInt(row.flameKilled)}마리</td></tr>)}</tbody>
          </table></div>
        </div>}

        <div className="pb-result-section" role="tabpanel" id="pb-pane-r4" aria-labelledby="pb-tab-r4" tabIndex={0} hidden={resTab !== "r4"}>
        <div className="pb-table-wrap"><table className="hold-table pb-table pb-weeks">
          <thead><tr><th>시작</th><th>플레임</th><th>보스</th><th>교환권</th><th>주말 위치</th><th>누적 단계</th></tr></thead>
          <tbody>{r.weeks.map((week: { start: string; kills: number; overflow: number; bosses: number; couponsUsed: number; levelEnd: number; expEnd: number; steps: number }) => <tr key={week.start}>
            <td>{md(week.start)}({dow(week.start)})</td><td>{fmtInt(week.kills)}{week.overflow > 0 ? ` · 소실 ${fmtInt(week.overflow)}` : ""}</td><td>{week.bosses}</td><td>{week.couponsUsed ? fmtInt(week.couponsUsed) : "-"}</td>
            <td>{place(week.levelEnd, week.expEnd)}</td><td>{week.steps}</td></tr>)}</tbody>
        </table></div>
        <p className="pb-note">마감: PLUS 수령 10/21 23:59 · 사용 10/22 02:00 / 퍼스널 단계·코인샵 11/18 23:59 · 보상 사용 11/19 02:00. {nextRefill ? `남은 플레임 추가는 ${md(nextRefill)}(목)부터 매주 목요일 0시입니다.` : "기준일 이후에는 플레임 추가가 없습니다."}</p>

        </div>
        <div className="pb-result-section" role="tabpanel" id="pb-pane-r5" aria-labelledby="pb-tab-r5" tabIndex={0} hidden={resTab !== "r5"}>
        <div className="pb-steps">
          {r.mission.steps.map((step: { index: number; level: number; exp: number; rewardRaw: number }) => {
            const date = clearedDates.get(step.index);
            const alreadyDone = Boolean((step as { done?: boolean }).done);
            return <div key={step.index} className={`pb-step ${date || alreadyDone ? "ok" : "miss"}`}>
              <b>{step.index}</b><span>{place(step.level, step.exp)}</span><em>+{fmtJo(step.rewardRaw, 2)}</em><i>{alreadyDone ? "이미 완료" : date ? `${md(date)} 통과` : "마감 못 넘음"}</i>
            </div>;
          })}
          {r.mission.stepsAtStart > 0 && <p className="pb-note">1~{r.mission.stepsAtStart}단계는 이미 통과한 단계라 표에서 뺐습니다.</p>}
        </div>

        </div>
        <div className="pb-result-section" role="tabpanel" id="pb-pane-r6" aria-labelledby="pb-tab-r6" tabIndex={0} hidden={resTab !== "r6"}>
        <div className="pb-sources">{sourceRows.map(row => <div key={row.id} className="pb-source"><span>{sourceLabels[row.id] || row.id}</span>
          <i style={{ width: `${Math.max(2, row.raw / totalRaw * 100)}%` }} /><b>{fmtJo(row.raw)} · {(row.raw / ctx.reqRaw(startLevel) * 100).toFixed(1)}%p</b></div>)}</div>
        <p className="pb-note">%p는 시작 레벨({startLevel}) 필요 경험치 기준이라 레벨이 오른 뒤 얻은 경험치는 실제 표시 %보다 크게 보일 수 있습니다.</p>

        </div>
      </>}
    </div>
  </section>;
}
