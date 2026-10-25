"use client";

import { useMemo, useState } from "react";
import DailyExperience from "./daily-experience";
import { SourceIcon, percent } from "./experience-source";
import { normalizeMarket, maplePointMeso, MARKET_DATE } from '@/lib/market.mjs';
import { EXPERIENCE_SOURCE_LABELS, dailyExperienceBreakdown } from "@/lib/experience-breakdown.mjs";
import {
  addDay,
  analyzeMain, normalizeInput,
  ATTENDANCE_REWARDS,
  bossEntry,
  bossCommunityPreset,
  bossCutoffFor,
  replaceBossSelection,
  bossListWeeklyRaw,
  bossPreset,
  bossRaw,
  buildMissionTable,
  COINS_PER_STEP,
  COIN_MISSION_STEPS,
  compareAlloc,
  epicBonusStage1Info,
  eventWeek,
  compareDesignation,
  compareTiers,
  couponRawForLevel,
  diffDays,
  detectiveDailyPlan,
  DAILY_HUNT_LABEL,
  dailyHuntDescription,
  dailyHuntStatus,
  FLAME_STOCK_CAP,
  FLAME_WEEKLY_ADD,
  flameModelRaw,
  MAIN_SCHEDULE,
  huntFieldLevelFor,
  MISSION_STEPS,
  missionCoinsThroughDay,
  mobBaseExp,
  plusLevelSchedule,
  plusClaimedLevels,
  octoberPlusTierOptions,
  octoberPlusRewardLines,
} from "@/lib/main-planner.mjs";
import { BOSS_CUT_ORDER, BOSS_COMMUNITY_PRESETS, HUNTING_FIELDS, PERSONAL_BOSS_TABLE, PERSONAL_COUPON_MULTIPLE, PERSONAL_FLAME_MULTIPLE, WEEKLY_BOSS_LIMIT } from "@/lib/personal-data.mjs";
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

// 환산 공통 목록의 낮은 쪽부터. 경험치 순으로 난이도를 판단하지 않는다.
const BOSS_LADDER = BOSS_CUT_ORDER.map(id => PERSONAL_BOSS_TABLE.find(entry => entry.id === id)!);
type BossRow = (typeof PERSONAL_BOSS_TABLE)[number];
// 보스 이름별로 묶고, 환산 공통 목록에서 처음 나타나는 순서로 늘어놓는다.
const BOSS_GROUPS: { boss: string; entries: BossRow[] }[] = (() => {
  const map = new Map<string, BossRow[]>();
  BOSS_LADDER.forEach(entry => { map.set(entry.boss, [...(map.get(entry.boss) || []), entry]); });
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

function Check({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className="pb-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
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
  // 사용 시점도 캐릭터 입력과 함께 저장한다. 접힌 패널이나 새로고침으로 초기화하지 않는다.
  const { crimsonPlan, couponPlan, rewardHold } = normalizeInput(input, ctx);
  const [sec, setSec] = useState("s0");
  const [resPick, setResPick] = useState("r6");
  const setResTab = setResPick;
  const [bossCutoff, setBossCutoff] = useState("");
  const [bossPickMode, setBossPickMode] = useState<"single" | "cutoff">("single");
  const [bossPartyChoice, setBossParty] = useState<"solo" | "max">("solo");

  const analysis = useMemo(() => analyzeMain(input, ctx), [input, ctx]);
  const chosen = analysis.chosen;

  const r: Result = chosen.result;
  const octoberPeriod = input.start >= MAIN_SCHEDULE.plusOctoberStart;
  const activePass = octoberPeriod ? input.plusOctober : input.plus;
  const activePassTier = octoberPeriod && !octoberPlusTierOptions(input.plus).includes(activePass.tier) ? "free" : activePass.tier;
  const detective = detectiveDailyPlan(input, ctx);
  const plusAvailable = input.plus.enabled && diffDays(MAIN_SCHEDULE.plusLastUseDay, input.start) >= 0;
  const plusPlan = useMemo(() => plusLevelSchedule(input.plus, input.start), [input.plus, input.start]);
  const tiers = useMemo(() => (plusAvailable ? compareTiers(input, ctx) : []), [plusAvailable, input, ctx]);
  const designations = useMemo(() => compareDesignation(input, ctx), [input, ctx]);
  const allocRows = useMemo(() => compareAlloc(input, ctx), [input, ctx]);
  const eventOver = diffDays(input.start, MAIN_SCHEDULE.personalEnd) > 0;
  const last30Input = input.personal.mission.stepsDone === 30 && input.personal.mission.targetKind === "last30";
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
  const market = normalizeMarket(input.market);
  const epicSelectedMP = input.routine.epic ? epicStage1.maplePoint * (input.routine.epicMult >= 9 ? 4 : input.routine.epicMult > 1 ? 1 : 0) : 0;
  const epicStage1AddRaw = ctx.weeklyRaw({ level: startLevel, epicMult: 5 }).epic - ctx.weeklyRaw({ level: startLevel, epicMult: 1 }).epic;
  const epicStage1Coupons = epicStage1AddRaw / couponAtStart;
  const couponsPerPointWeek = FLAME_WEEKLY_ADD / 100;
  const flameOwnRaw = flameModelRaw(startLevel);
  const flameTopLevel = huntFieldLevelFor({ fieldLevel: 0, fieldKey: "" }, startLevel);
  const flameTopRaw = flameModelRaw(flameTopLevel);
  const bosses = input.personal.bosses as { id: string; party: number; doneThisWeek: boolean }[];
  const allSolo = bosses.length > 0 && bosses.every(boss => boss.party === 1);
  const allMax = bosses.length > 0 && bosses.every(boss => boss.party === bossEntry(boss.id)?.maxParty);
  const bossParty = allSolo ? "solo" : allMax ? "max" : bossPartyChoice;
  const weeklyBossRaw = bossListWeeklyRaw(bosses.slice(0, WEEKLY_BOSS_LIMIT));

  // 기준일 입력에는 그날 충전분이 들어 있으므로 다음 충전은 기준일 다음 목요일이다.
  const nextRefill = (() => { let day = addDay(input.start, 1); for (let i = 0; i < 8; i += 1) { if (dow(day) === "목") break; day = addDay(day, 1); } return diffDays(day, MAIN_SCHEDULE.personalEnd) <= 0 ? day : ""; })();
  const reachDate = (level: number) => r.rows.find((row: { level: number }) => row.level >= level)?.date as string | undefined;
  const nextLevels = Array.from({ length: startLevel >= 295 ? ctx.levelCap - startLevel : 3 }, (_, index) => startLevel + index + 1).filter(level => level <= ctx.levelCap);
  const clearedDates = new Map<number, string>();
  r.mission.newlyCleared.forEach((step: { index: number; date: string }) => clearedDates.set(step.index, step.date));

  const shortfall = r.mission.shortfall as { index: number; level: number; exp: number; remainingRaw: number } | null;
  const allocTotal = flame.alloc.shard + flame.alloc.exp + flame.alloc.erda;
  const breakdown = dailyExperienceBreakdown(r.rows, r.sourceRaw, ctx.reqRaw);
  const periodSources = breakdown.period;
  const sourceRows = periodSources.entries;
  const sourceLabels: Record<string, string> = EXPERIENCE_SOURCE_LABELS;
  const totalPercent = periodSources.percent || 1;

  const advices: { tone: "warn" | "info"; text: string }[] = [];
  if (r.flame.overflowLost > 0) {
    advices.push({ tone: "warn", text: `플레임 보유 한도 36,000마리에 막혀 ${fmtInt(r.flame.overflowLost)}마리가 소실됩니다. 매주 목요일 0시에 24,000마리가 더해지니, 그 전에 보유량을 12,000마리 이하로 줄이세요. 못 받은 만큼은 메이플포인트 10당 1마리로 충전할 수 있습니다.` });
  }
  if (shortfall && days > 0) {
    const perDay = shortfall.remainingRaw / days;
    advices.push({
      tone: "warn",
      text: `마감까지 ${shortfall.index}단계(${shortfall.level}레벨 ${shortfall.exp.toFixed(1)}%)부터 못 넘습니다. 부족한 경험치는 ${fmtJo(shortfall.remainingRaw)}입니다. 하루 ${fmtJo(perDay, 2)}씩 더 얻거나, 퍼스널 EXP 교환권 약 ${fmtInt(shortfall.remainingRaw / Math.max(1, couponRawForLevel(r.level)))}장, 플레임 약 ${fmtInt(shortfall.remainingRaw / Math.max(1, flameRaw))}마리에 해당합니다. 1~30단계는 단계마다 코인 ${fmtInt(COINS_PER_STEP)}개를 받습니다.`,
    });
  }
  for (const [name, deadline, expired] of [["9월 PLUS", "10/22 02:00", r.items.expired], ["10월 PLUS", "11/19 02:00", r.items.octoberExpired]] as [string, string, Record<string, number>][]) {
    if (Object.values(expired).some(value => value > 0.01)) advices.push({ tone: "warn", text: `${name} 보상을 다 쓰지 못합니다. 크림슨 ${fmtInt(expired.crimson)}장 · 상급 EXP ${fmtInt(expired.adv)}장 · 사우나 ${expired.sauna.toFixed(1)}시간 · 4배 쿠폰 ${expired.coupon4x.toFixed(1)}장 · VIP 부스터 ${expired.booster.toFixed(1)}개가 남습니다. 사용 기한은 ${deadline}입니다. 쿠폰과 부스터는 사냥할 때 쓸 수 있습니다.` });
  }
  if (Object.values(r.attendance.expired).some(value => Number(value) > 0)) advices.push({ tone: "warn", text: `출석·보유 보상을 마감까지 다 쓰지 못합니다. 비약(269) ${fmtInt(r.attendance.expired.potion269)}개 · 비약(279) ${fmtInt(r.attendance.expired.potion279)}개 · 상급 EXP ${fmtInt(r.attendance.expired.adv)}장 · 부스터 ${r.attendance.expired.booster.toFixed(1)}개 · 사우나 ${r.attendance.expired.sauna.toFixed(1)}시간. 사용 기한은 11/19 02:00입니다.` });
  if (Object.values(r.compensation.expired).some(value => Number(value) > 0)) advices.push({ tone: "warn", text: `사과 보상을 10/21까지 다 쓰지 못합니다. 상급 EXP ${fmtInt(r.compensation.expired.adv)}장 · VIP 부스터 ${r.compensation.expired.booster.toFixed(1)}개가 남습니다. 사용 기한은 10/22 02:00입니다.` });
  if (r.coupons.expired > 0) advices.push({ tone: "warn", text: `교환권 ${fmtInt(r.coupons.expired)}장을 마감까지 쓰지 못합니다. 11/19 02:00에 소멸합니다.` });
  if (allocTotal > 3 + 1e-9) advices.push({ tone: "warn", text: "커스텀 포인트 합계가 3을 넘습니다. 게임에서는 3개를 나눠 씁니다." });
  if (allocTotal < 3 - 1e-9) advices.push({ tone: "info", text: "커스텀 포인트를 모두 쓰지 않으면 플레임을 소환할 수 없습니다. 합계를 3으로 맞추세요." });
  r.warnings.forEach((text: string) => advices.push({ tone: text.startsWith("다음 단계 목표(") ? "warn" : "info", text }));
  if (r.atCap) advices.push({ tone: "info", text: "300레벨에 닿았습니다." });

  const stale = input.start < today;
  const crimsonOptions: { label: string; value: "auto" | number }[] = [
    { label: "자동 추천", value: "auto" }, { label: "받는 즉시", value: 0 },
    ...[285, 290, 295].filter(level => level > startLevel || level === crimsonPlan).map(level => ({ label: `Lv.${level}까지 모음`, value: level })),
    { label: "각 회차 마지막 날까지 모음", value: 999 },
  ];

  const holdLabel = (hold: number) => (hold === 0 ? "받는 즉시" : hold >= 999 ? "각 회차 마지막 날까지 모음" : `Lv.${hold}까지 모음`);
  const couponLabel = (policy: string) => (policy === "now" ? "받는 즉시" : policy === "end" ? "마감 직전에 몰아서" : `Lv.${policy.slice(5)}에 닿은 뒤`);
  const bestOf = (predicate: (option: typeof analysis.options[number]) => boolean) => {
    const matching = analysis.options.filter(predicate);
    return matching.reduce((best: typeof matching[number], option: typeof matching[number]) => (option.summary.stepsCleared !== best.summary.stepsCleared ? (option.summary.stepsCleared > best.summary.stepsCleared ? option : best) : (option.summary.progress > best.summary.progress ? option : best)), matching[0]);
  };
  // 30단계와의 코인 차이, 그리고 사용 시점에 따라 코인을 얼마나 먼저 받는지(패스 보상 마감일 기준).
  const totalCoins = Math.min(COIN_MISSION_STEPS, r.mission.stepsCleared) * COINS_PER_STEP;
  const coinGap = Math.max(0, COIN_MISSION_STEPS - r.mission.stepsCleared) * COINS_PER_STEP;
  // 현재 회차 마감 전날까지 받은 코인으로 사용 시점의 차이를 비교한다.
  const refDay = addDay(octoberPeriod ? MAIN_SCHEDULE.plusOctoberLastUseDay : MAIN_SCHEDULE.plusLastUseDay, -1);
  const showRefCoins = diffDays(refDay, input.start) > 0 && diffDays(MAIN_SCHEDULE.personalEnd, refDay) > 0;
  const coinsByNumber = (option: { result?: { mission: { newlyCleared: { date: string; index: number }[] } } }) => missionCoinsThroughDay(option.result?.mission.newlyCleared ?? [], refDay);
  const coinsBy = (option: Parameters<typeof coinsByNumber>[0]) => option.result ? fmtInt(coinsByNumber(option)) : "-";
  const signed = (value: number) => `${value > 0 ? "+" : ""}${fmtInt(value)}`;
  const crimsonRows = [...new Set(analysis.options.map((option: { crimsonHold: number }) => option.crimsonHold))].map(hold => bestOf(option => option.crimsonHold === hold));
  const couponRows = [...new Set(analysis.options.map(option => option.couponPolicy))].map(policy => bestOf(option => option.couponPolicy === policy));
  const hasCrimson = analysis.options.some((option: { result: Result }) => option.result.items.crimsonUsed > 0);

  const applyCommunityPreset = (presetId: string) => { setBossCutoff(BOSS_COMMUNITY_PRESETS.find(preset => preset.id === presetId)?.cutoffId || ""); upd((draft: MainInput) => { draft.personal.bosses = replaceBossSelection(draft.personal.bosses, bossCommunityPreset(presetId, bossParty)); }); };
  const applyBossPreset = (cutoffId: string) => { setBossCutoff(cutoffId); if (cutoffId) upd((draft: MainInput) => { draft.personal.bosses = replaceBossSelection(draft.personal.bosses, bossPreset({ cutoffId, partyMode: bossParty })); }); };
  // 보스마다 한 줄: 난이도를 누르면 고르고, 같은 난이도를 다시 누르면 뺀다. 같은 보스는 난이도 하나만.
  const toggleBoss = (entry: BossRow) => { if (bossPickMode === "cutoff") { applyBossPreset(entry.id); return; } setBossCutoff(""); upd((draft: MainInput) => {
    const list = draft.personal.bosses as { id: string; party: number; doneThisWeek: boolean }[];
    const index = list.findIndex(boss => bossEntry(boss.id)?.boss === entry.boss);
    if (index >= 0 && list[index].id === entry.id) list.splice(index, 1);
    else if (index >= 0) { list[index].id = entry.id; list[index].party = Math.min(list[index].party, entry.maxParty); }
    else if (list.length < WEEKLY_BOSS_LIMIT) list.push({ id: entry.id, party: bossParty === "max" ? entry.maxParty : 1, doneThisWeek: false });
  }); };
  const setAllParty = (mode: "solo" | "max") => { setBossParty(mode); upd((draft: MainInput) => { draft.personal.bosses.forEach((boss: { id: string; party: number }) => { boss.party = mode === "max" ? (bossEntry(boss.id)?.maxParty ?? 1) : 1; }); }); };
  const bossIdSet = new Set(bosses.map(boss => boss.id));
  const activePreset = BOSS_COMMUNITY_PRESETS.find(preset => ["solo", "max"].some(mode => { const picked = bossCommunityPreset(preset.id, mode); return picked.length === bossIdSet.size && picked.every(boss => bossIdSet.has(boss.id)); }));
  const selectedCutoff = bossCutoff && ["solo", "max"].some(mode => { const picked = bossPreset({ cutoffId: bossCutoff, partyMode: mode }); return picked.length === bossIdSet.size && picked.every(boss => bossIdSet.has(boss.id)); }) ? bossCutoff : activePreset?.cutoffId || bossCutoffFor(bosses);
  const bossFull = bosses.length >= WEEKLY_BOSS_LIMIT;

  const resTab = ((resPick === "r1" && !(tiers.length > 1)) || (resPick === "r2" && !(allocRows.length > 0)) || (resPick === "r3" && !(designations.length > 0))) ? "r4" : resPick;
  return <section className="calculator-shell pb-shell tab-panel" id="personal-panel" role="tabpanel" aria-labelledby="personal-tab">
    <aside className="controls pb-controls">
      <div className="section-heading"><span>입력</span><div><p>본섭 · 9/17~11/18</p><h2>퍼스널 버닝 계산</h2></div>
        <button type="button" className="reset" onClick={reset}>기본값 복원</button></div>
      {stale && <div className="callout-mini" role="status">입력 기준일이 {md(input.start)}입니다. 오늘({md(today)}) 값으로 레벨·경험치·남은 플레임을 다시 넣고 기준일을 오늘로 맞추면 정확합니다. <button type="button" className="pb-link" onClick={() => upd((draft: MainInput) => { draft.start = today; })}>기준일을 오늘로</button></div>}

      <div className="pb-tabs" role="tablist" aria-label="입력 묶음">
        <button type="button" role="tab" id="pb-tab-s0" aria-controls="pb-pane-s0" tabIndex={sec === "s0" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s0"} className={sec === "s0" ? "on" : ""} onClick={() => setSec("s0")}><b>캐릭터</b><small>{`Lv.${startLevel} ${input.exp}%`}</small></button>
        <button type="button" role="tab" id="pb-tab-s1" aria-controls="pb-pane-s1" tabIndex={sec === "s1" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s1"} className={sec === "s1" ? "on" : ""} onClick={() => setSec("s1")}><b>성장 미션</b><small>{input.personal.designated ? `${input.personal.mission.stepsDone}/${MISSION_STEPS}단계 통과` : "지정 전"}</small></button>
        <button type="button" role="tab" id="pb-tab-s2" aria-controls="pb-pane-s2" tabIndex={sec === "s2" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s2"} className={sec === "s2" ? "on" : ""} onClick={() => setSec("s2")}><b>패스</b><small>{octoberPeriod ? "10월" : "9월"} · {activePass.enabled ? ({ free: "무료", premium: "프리미엄", prime: "프라임" } as Record<string, string>)[activePassTier] : "참여 안 함"}</small></button>
        <button type="button" role="tab" id="pb-tab-s3" aria-controls="pb-pane-s3" tabIndex={sec === "s3" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s3"} className={sec === "s3" ? "on" : ""} onClick={() => setSec("s3")}><b>보유 보상</b><small>출석 · 사과 보상</small></button>
        <button type="button" role="tab" id="pb-tab-s4" aria-controls="pb-pane-s4" tabIndex={sec === "s4" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s4"} className={sec === "s4" ? "on" : ""} onClick={() => setSec("s4")}><b>보스</b><small>{`${Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}/${WEEKLY_BOSS_LIMIT}마리 · 주 ${fmtJo(weeklyBossRaw, 2)}`}</small></button>
        <button type="button" role="tab" id="pb-tab-s5" aria-controls="pb-pane-s5" tabIndex={sec === "s5" ? 0 : -1} onKeyDown={tabKeys} aria-selected={sec === "s5"} className={sec === "s5" ? "on" : ""} onClick={() => setSec("s5")}><b>일과·사냥</b><small>{`몬파 ${input.routine.runsPerDay}판 · 에픽 ${input.routine.epic ? input.routine.epicMult : 0}배 · 사냥 하루30분 × ${(input.routine.huntHoursPerWeek * 2 / 7).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}회`}</small></button>
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
      <p className="pb-note light">31~45단계 경험치는 본섭 공개 화면과 대조한 추정치이며, 정수 단위와 일부 레벨 경계에는 차이가 남아 있습니다. 280~284 구간은 게임에 표시된 다음 목표와 그다음 목표를 함께 넣는 것을 권합니다.</p>
      <div className="pb-choice" role="group" aria-label="지정 여부">
        <button type="button" className={input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = true; })}>이미 지정했어요</button>
        <button type="button" className={!input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = false; })}>아직 안 했어요</button>
      </div>
      {input.personal.designated ? <>
        <div className="pb-choice" role="group" aria-label="단계표 입력 방식">
          <button type="button" className={input.personal.mission.mode === "screen" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "screen"; })}>다음 목표 직접 입력</button>
          <button type="button" className={input.personal.mission.mode === "model" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "model"; })}>지정할 때의 레벨로 입력</button>
        </div>
        {input.personal.mission.mode === "screen" ? <>
        {input.personal.mission.stepsDone === 30 && <div className="pb-choice" role="group" aria-label="30단계 완료 후 목표 입력"><button type="button" className={!last30Input ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.targetKind="next"; })}>다음 단계 목표</button><button type="button" className={last30Input ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.targetKind="last30"; })}>30단계 마지막 목표</button></div>}
        {last30Input && <p className="pb-note">완료한 30단계의 목표 레벨과 경험치 %를 넣어 주세요.</p>}
        <div className="field-grid compact">
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={MISSION_STEPS} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} hint="남은 단계 개수만 정합니다. 목표 위치는 아래 다음 목표로 정해집니다" />
          {!last30Input && <NumField label="다음 단계 보상 %" value={input.personal.mission.nextTarget.level >= ctx.levelCap ? 0 : input.personal.mission.nextRewardPct} disabled={input.personal.mission.nextTarget.level >= ctx.levelCap} min={0} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextRewardPct = value; })} hint="화면의 경험치 보상 %" />}
          <NumField label={last30Input ? "30단계 목표 레벨" : "다음 단계 목표 레벨"} value={input.personal.mission.nextTarget.level} min={280} max={ctx.levelCap} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.level = value; if (value >= ctx.levelCap) { draft.personal.mission.nextTarget.exp = 0; draft.personal.mission.nextRewardPct = 0; } })} />
          <NumField label={last30Input ? "30단계 목표 %" : "다음 단계 목표 %"} value={input.personal.mission.nextTarget.level >= ctx.levelCap ? 0 : input.personal.mission.nextTarget.exp} disabled={input.personal.mission.nextTarget.level >= ctx.levelCap} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.exp = value; })} />
        </div>
        {!last30Input && input.personal.mission.stepsDone < MISSION_STEPS - 1 && <details className="pb-more"><summary>그다음 목표도 넣기</summary>
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
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={MISSION_STEPS} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} />
          <NumField label="지정 당시 레벨" value={input.personal.mission.designLevel} min={280} max={ctx.levelCap - 1} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designLevel = value; })} />
          <NumField label="지정 당시 경험치 %" value={input.personal.mission.designExp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designExp = value; })} />
        </div>}
      </> : <div className="field-grid compact">
        <label className="field"><span>지정 예정일</span><input type="date" value={input.personal.designDate} min={input.start} max={MAIN_SCHEDULE.personalEnd} onChange={event => event.target.value && upd((draft: MainInput) => { draft.personal.designDate = event.target.value; })} /></label>
      </div>}
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s2" aria-labelledby="pb-tab-s2" hidden={sec !== "s2"}>
      <div className="pb-checks"><Check label="9월 PLUS 참여" checked={input.plus.enabled} onChange={value => upd((draft: MainInput) => { draft.plus.enabled = value; })} /></div>
      <div className="field-grid compact">
        <label className="field"><span>9월 구매 기록</span><select value={input.plus.tier} disabled={!input.plus.enabled} onChange={event => upd((draft: MainInput) => { draft.plus.claimedLevels = plusClaimedLevels(draft.plus); draft.plus.tier = event.target.value as Tier; })}><option value="free">구매 안 함</option><option value="premium">프리미엄만</option><option value="prime">프라임까지</option></select></label>
      </div>
      <p className="pb-note">9월 참여·구매 기록으로 10월에 살 수 있는 등급을 확인합니다. 같은 명의의 9월 구매 기록을 넣어 주세요.</p>
      <details className="pb-more" open={input.start <= MAIN_SCHEDULE.plusLastUseDay}><summary>9월 패스 진행도·남은 보상 · 10/21까지</summary>
      <div className="field-grid compact">
        <NumField label="9월 PLUS 레벨" value={input.plus.currentLevel} min={0} max={10} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.currentLevel = Math.max(0, Math.min(10, Math.floor(value))); draft.plus.claimedLevel = Math.min(draft.plus.claimedLevel, draft.plus.currentLevel); if (draft.plus.claimedLevels) Object.keys(draft.plus.claimedLevels).forEach(key => { draft.plus.claimedLevels[key] = Math.min(draft.plus.claimedLevels[key], draft.plus.currentLevel); }); draft.plus.levelPoints = 0; })} hint="9월 패스에서 달성한 레벨" />
        {(["free", "premium", "prime"] as Tier[]).filter(tier => ["free", "premium", "prime"].indexOf(tier) <= ["free", "premium", "prime"].indexOf(input.plus.tier)).map(tier => <NumField key={tier} label={(tier === "free" ? "무료" : tier === "premium" ? "프리미엄" : "프라임") + " 이미 받은 보상 레벨"} value={plusClaimedLevels(input.plus)[tier]} min={0} max={input.plus.currentLevel} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.claimedLevels = { ...plusClaimedLevels(draft.plus), [tier]: value }; })} hint="받은 보상 중 남은 것만 아래에 넣어 주세요" />)}
        <NumField label="주간 획득 포인트" value={input.plus.weeklyPoints} min={0} max={2500} step={100} onChange={value => upd((draft: MainInput) => { draft.plus.weeklyPoints = value; })} hint="다음 목요일부터 매주 받을 포인트 · 최대 2,500" />
      </div>
      <button type="button" className="pb-link" onClick={() => upd((draft: MainInput) => { draft.plus.claimedLevels = { free: draft.plus.currentLevel, premium: 0, prime: 0 }; })}>무료 보상만 받았어요</button>
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
      <p className="pb-note">9월 보상은 10/21까지의 계산에만 포함합니다. 아직 안 받은 보상은 레벨에 맞춰 더하고, 받은 보상은 입력한 남은 수량만 계산합니다.</p>
      </details>
      <details className="pb-more" open={input.start >= "2026-10-22"}><summary>10월 모멘텀 패스 PLUS · 11/18까지</summary>
        <Check label="10월 PLUS 참여" checked={input.plusOctober.enabled} onChange={value => upd((draft: MainInput) => { draft.plusOctober.enabled = value; })} />
        <p className="pb-note">9월 프리미엄만 샀다면 10월에는 무료·프라임 보상을 받을 수 있습니다. 9월 프라임 구매자는 무료 보상만 받습니다.</p>
        <p className="pb-note">9월 프리미엄만 활성화했다면 같은 캐릭터로 참여해야 합니다. 둘 다 활성화했거나 둘 다 활성화하지 않았다면 같은 메이플ID의 다른 캐릭터도 참여할 수 있습니다. 이 계산에는 현재 캐릭터가 받을 보상만 넣어 주세요.</p>
        <div className="field-grid compact">
          <label className="field"><span>10월 구매 등급</span><select value={octoberPlusTierOptions(input.plus).includes(input.plusOctober.tier) ? input.plusOctober.tier : "free"} onChange={event => upd((draft: MainInput) => { draft.plusOctober.claimedLevels = plusClaimedLevels(draft.plusOctober); draft.plusOctober.tier = event.target.value; })}>{octoberPlusTierOptions(input.plus).map(tier => <option key={tier} value={tier}>{({free:"무료",premium:"프리미엄",prime:"프라임"})[tier]}</option>)}</select></label>
          <label className="field"><span>10월 패스 구매일</span><input type="date" min="2026-10-22" max="2026-11-18" value={input.plusOctober.purchaseDate} onChange={event => upd((draft: MainInput) => { draft.plusOctober.purchaseDate = event.target.value; })} /><small className="pb-hint">그날까지 오른 레벨의 유료 보상도 받습니다</small></label>
          <NumField label="10월 지금 PLUS 레벨" value={input.plusOctober.currentLevel} min={0} max={10} step={1} onChange={value => upd((draft: MainInput) => { draft.plusOctober.currentLevel=value; draft.plusOctober.claimedLevel=Math.min(value,draft.plusOctober.claimedLevel); if(draft.plusOctober.claimedLevels) Object.keys(draft.plusOctober.claimedLevels).forEach(key=>{draft.plusOctober.claimedLevels[key]=Math.min(value,draft.plusOctober.claimedLevels[key]);}); })} hint="10월 패스 화면의 레벨 · 새로 시작하면 0" />
          {(octoberPlusRewardLines(input.plus, input.plusOctober.tier) as Tier[]).map(tier => <NumField key={tier} label={"10월 " + ({free:"무료",premium:"프리미엄",prime:"프라임"}[tier]) + " 이미 받은 레벨"} value={plusClaimedLevels(input.plusOctober)[tier]} min={0} max={input.plusOctober.currentLevel} step={1} onChange={value => upd((draft: MainInput) => { draft.plusOctober.claimedLevels={...plusClaimedLevels(draft.plusOctober),[tier]:value}; })} />)}
          <NumField label="10월 주간 획득 포인트" value={input.plusOctober.weeklyPoints} min={0} max={2500} step={100} onChange={value => upd((draft: MainInput) => { draft.plusOctober.weeklyPoints=value; })} />
          <NumField label="10월 이번 주 더 받을 포인트" value={input.plusOctober.thisWeekRemaining} min={0} max={2500} step={100} onChange={value => upd((draft: MainInput) => { draft.plusOctober.thisWeekRemaining=value; })} hint="이번 수요일에 더합니다" />
          <NumField label="10월 레벨 안의 포인트" value={input.plusOctober.levelPoints} min={0} max={749} step={1} onChange={value => upd((draft: MainInput) => { draft.plusOctober.levelPoints=value; })} />
          {(["crimson","adv","sauna","coupon4x","booster"] as const).map(key => <NumField key={key} label={"10월 남은 " + ({crimson:"크림슨",adv:"상급 EXP",sauna:"사우나 시간",coupon4x:"4배 쿠폰",booster:"VIP 부스터"}[key])} value={input.plusOctober.items[key]} min={0} onChange={value => upd((draft: MainInput) => { draft.plusOctober.items[key]=value; })} />)}
        </div>
      </details>
      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s3" aria-labelledby="pb-tab-s3" hidden={sec !== "s3"}>
        <h3>운영자 사과 보상</h3>
        <p className="pb-note">10/8 리워드 드롭 보상 중 이 캐릭터에 쓸 남은 것만 넣어 주세요. Green 메이플ID당 한 번 받으며, 10/21까지 받고 10/22 02:00까지 씁니다.</p>
        <button type="button" className="pb-add" onClick={() => upd((draft: MainInput) => { draft.compensation = { adv: 2000, booster: 10 }; })}>사과 보상 넣기</button>
        <div className="field-grid compact">
          <NumField label="사과 보상 상급 EXP 교환권" value={input.compensation.adv} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.compensation.adv = value; })} hint="장" />
          <NumField label="사과 보상 VIP 부스터" value={input.compensation.booster} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.compensation.booster = value; })} hint="개 · 사냥할 때만 사용" />
        </div>
        <p className="pb-note">솔 에르다/조각 선택권 4개는 경험치에 넣지 않습니다. 조각으로 받으면 120개이며, 위 플레임 조각 수와는 별도입니다.</p>
        <h3>출석·보유 보상</h3>
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
        {BOSS_COMMUNITY_PRESETS.map(preset => <button type="button" key={preset.id} className={activePreset?.id === preset.id ? "on" : ""} aria-pressed={activePreset?.id === preset.id} title={preset.detail} onClick={() => applyCommunityPreset(preset.id)}>{preset.label}</button>)}
        <button type="button" className="clear" onClick={() => { setBossCutoff(""); upd((draft: MainInput) => { draft.personal.bosses = []; }); }}>전부 빼기</button>
      </div>
      <div className="pb-choice" role="group" aria-label="파티원">
        <button type="button" className={allSolo ? "on" : ""} aria-pressed={allSolo} onClick={() => setAllParty("solo")}>전부 솔로</button>
        <button type="button" className={allMax ? "on" : ""} aria-pressed={allMax} onClick={() => setAllParty("max")}>보스별 최대 인원</button>
      </div>
      <div className="pb-choice" role="group" aria-label="보스 고르는 방법">
        <button type="button" className={bossPickMode === "single" ? "on" : ""} aria-pressed={bossPickMode === "single"} onClick={() => setBossPickMode("single")}>하나씩 고르기</button>
        <button type="button" className={bossPickMode === "cutoff" ? "on" : ""} aria-pressed={bossPickMode === "cutoff"} onClick={() => setBossPickMode("cutoff")}>여기까지 한 번에</button>
      </div>
      {bossPickMode === "cutoff" ? <label className="field pb-wide"><span>어디까지 잡나요?</span>
        <select value={selectedCutoff} onChange={event => applyBossPreset(event.target.value)}><option value="">보스 고르기</option>{BOSS_LADDER.map(entry => <option key={entry.id} value={entry.id}>{entry.boss} {entry.difficulty}</option>)}</select>
        <small>아래 난이도를 눌러도 한 번에 골라요. 받을 경험치가 큰 12마리만 남아요.</small>
      </label> : null}
      {activePreset?.id === "geommitsol" && <p className="pb-note">검밑솔에서 퍼스널 경험치를 주는 보스는 이 8종입니다. 나머지 결정석 보스는 퍼스널 경험치에 들어가지 않습니다.</p>}
      <div className="pb-bossgrid">
        {BOSS_GROUPS.map(group => {
          const index = bosses.findIndex(boss => bossEntry(boss.id)?.boss === group.boss);
          const picked = index >= 0 ? bosses[index] : null;
          const pickedEntry = picked ? bossEntry(picked.id) : null;
          return <div className={`pb-bossrow${picked ? " on" : ""}`} key={group.boss}>
            <b className="pb-bossrow-name">{group.boss}</b>
            <div className="pb-diffs">{group.entries.map(entry => <button type="button" key={entry.id} className={`pb-diff ${DIFFICULTY_CLASS[entry.difficulty] || ""}${picked?.id === entry.id ? " on" : ""}`} aria-pressed={picked?.id === entry.id} aria-label={group.boss + " " + entry.difficulty + (bossPickMode === "cutoff" ? "까지 잡기" : "")} disabled={bossPickMode === "single" && !picked && bossFull} title={`솔로 ${fmtJo(entry.unitExp * 10_000, 3)}`} onClick={() => toggleBoss(entry)}>{entry.difficulty}</button>)}</div>
            {picked && pickedEntry ? <div className="pb-bossrow-detail">
              <div className="pb-party" role="group" aria-label={group.boss + " 파티원"}>
                <button type="button" aria-label={group.boss + " 파티원 줄이기"} disabled={picked.party <= 1} onClick={() => upd((draft: MainInput) => { draft.personal.bosses[index].party = Math.max(1, draft.personal.bosses[index].party - 1); })}>−</button>
                <span aria-live="polite">{picked.party}인</span>
                <button type="button" aria-label={group.boss + " 파티원 늘리기"} disabled={picked.party >= pickedEntry.maxParty} onClick={() => upd((draft: MainInput) => { draft.personal.bosses[index].party = Math.min(pickedEntry.maxParty, draft.personal.bosses[index].party + 1); })}>+</button>
              </div>
              <span className="pb-bossrow-exp">{fmtJo(bossRaw(picked.id, picked.party), 3)}</span>
              <label className="pb-bossrow-done" title="이번 주에 이미 잡았으면 체크"><input type="checkbox" checked={picked.doneThisWeek} onChange={event => upd((draft: MainInput) => { draft.personal.bosses[index].doneThisWeek = event.target.checked; })} />잡음</label>
            </div> : null}
          </div>;
        })}
      </div>
      <p className="pb-note pb-bosssum"><b>주간 합계 {fmtJo(weeklyBossRaw, 2)}</b> · Lv.{startLevel} 기준 {(weeklyBossRaw / ctx.reqRaw(startLevel) * 100).toFixed(2)}%p · {Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}/{WEEKLY_BOSS_LIMIT}마리{bossFull ? (bossPickMode === "cutoff" ? " · 다른 난이도를 누르면 한 번에 바뀝니다." : " · 12마리를 다 채웠습니다. 바꾸려면 하나를 먼저 빼세요.") : ""}</p>

      </div>
      <div className="pb-pane" role="tabpanel" id="pb-pane-s5" aria-labelledby="pb-tab-s5" hidden={sec !== "s5"}>
      <div className="pb-daily-hunt">
        <Check label={DAILY_HUNT_LABEL} checked={input.routine.dailyTenThousand} onChange={value => upd((draft: MainInput) => { draft.routine.dailyTenThousand = value; })} />
        <p className="pb-note">{dailyHuntDescription(input, ctx)}</p>
        <p className="pb-note" role="status" aria-live="polite">{dailyHuntStatus(input, ctx)}</p>
      </div>
      <div className="field-grid compact">
        <NumField label="몬스터파크 하루 판수" value={input.routine.runsPerDay} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.runsPerDay = value; })} hint="무료 2판. 이용권·메이플포인트로 하루 7판까지" />
        <NumField label="일요일 판수" value={input.routine.sundayRuns} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.sundayRuns = value; })} hint="일요일은 경험치 1.5배. 일요일만 7판 돌면 7" />
        <label className="field"><span>에픽 던전 보상 배수</span><select value={input.routine.epicMult} onChange={event => upd((draft: MainInput) => { draft.routine.epicMult = Number(event.target.value); })}><option value={1}>보너스 없음 (1배 · 0 메이플포인트)</option><option value={5}>EXP 1단계 (합 5배, 흔히 4배 · {fmtInt(epicStage1.maplePoint)} 메이플포인트)</option><option value={9}>EXP 2단계 (합 9배, 흔히 8배 · {fmtInt(epicStage1.maplePoint * 4)} 메이플포인트)</option></select></label>
        <NumField label="1억 메소 = 메이플포인트" value={market.maplePoints} min={1} step={1} onChange={value=>upd((draft:MainInput)=>{draft.market={...market,maplePoints:value};})} hint={`${MARKET_DATE} · 메소마켓 수수료 1% · 상품 효율과 같은 시세`} />
        <NumField label="하루 사냥 30분 × 횟수" value={input.routine.huntHoursPerWeek * 2 / 7} min={0} max={48} step={0.25} onChange={value => upd((draft: MainInput) => { draft.routine.huntHoursPerWeek = value * 7 * 0.5; })} hint="기본 하루 1회 · 소수 입력 가능. 0이면 일반 사냥 없음" />
        <label className="field"><span>평소 사냥터 몬스터</span><select value={input.routine.huntFieldKey} onChange={event => upd((draft: MainInput) => { draft.routine.huntFieldKey = event.target.value; if (event.target.value === "direct" && !draft.routine.huntFieldLevel) draft.routine.huntFieldLevel = startLevel; })}><option value="flame">플레임과 같게</option><option value="same">내 레벨 몬스터 (레벨업하면 따라감)</option><option value="direct">몬스터 레벨 직접 입력</option></select></label>
        {input.routine.huntFieldKey === "direct" && <NumField label="평소 사냥터 몬스터 레벨" value={input.routine.huntFieldLevel || startLevel} min={260} max={299} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.huntFieldLevel = value; })} hint="260~299 · 플레임 사냥터는 바뀌지 않음" />}
        <NumField label="사냥 추가 경험치 %" value={input.routine.huntBonusPct} min={0} max={9999} step={10} onChange={value => upd((draft: MainInput) => { draft.routine.huntBonusPct = value; })} hint="평소 버프 합계. 보유 보상에 넣은 4배 쿠폰은 빼세요. 0이면 순수 경험치" />
      </div>
      <p className="pb-note" data-planner-epic-cost={maplePointMeso(epicSelectedMP, market.maplePoints)}>에픽 던전 주 {fmtInt(epicSelectedMP)} 메이플포인트 ≈ {fmtInt(maplePointMeso(epicSelectedMP, market.maplePoints))} 메소 · 수수료 포함, 주화 판매 전</p>
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
      <details className="pb-more"><summary>탐정예티와 수상한 돋보기 · 10/22~11/18</summary>
      <p className="pb-note light">돋보기는 위 사냥 시간 외에 1개당 100초씩 추가로 사용한다고 계산합니다. 게임에서는 VIP·HEXA 부스터와 동시에 사용할 수 없습니다. 같은 사냥 시간 안에 사용할 계획이라면 돋보기의 주간 사용 시간을 위 사냥 시간에서 빼 주세요.</p>
        <p className="pb-note">위 「매일 1만 마리 사냥」 선택을 켜면 사냥과 일일 퀘스트로 조건을 채운다고 보고 무료 1개를 써요. 끄면 무료분은 없어요.</p>
        <p className="pb-note" role="status" aria-live="polite">{dailyHuntStatus(input, ctx)}</p>
      <div className="field-grid compact">
        <NumField label="탐정예티 돋보기 하루 구매 개수" value={Math.min(input.magnifiers.detectiveBoughtPerDay,detective.boughtMax)} min={0} max={detective.boughtMax} step={1} onChange={value => upd((draft: MainInput) => { draft.magnifiers.detectiveBoughtPerDay=value; })} hint={"무료·구매 합쳐 하루 최대 3개 · 구매는 최대 " + detective.boughtMax + "개"} />
        <NumField label="수상한 돋보기 하루 사용 횟수" value={input.magnifiers.ordinaryPerDay} min={0} max={10} step={1} onChange={value => upd((draft: MainInput) => { draft.magnifiers.ordinaryPerDay=value; })} hint="보유한 만큼 넣어 주세요 · 하루 최대 10개" />
        <NumField label="한 번에 잡는 유령 수" value={input.magnifiers.killsPerUse} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.magnifiers.killsPerUse=value; })} hint="190마리·탐정 800배·일반 10배는 본섭 실측 대조 전 추정값입니다. 마릿수는 실제 기록으로 바꿀 수 있습니다" />
        <NumField label="수상한 돋보기 추가 경험치 %" value={input.magnifiers.bonusPct} min={0} max={3000} onChange={value => upd((draft: MainInput) => { draft.magnifiers.bonusPct=value; })} hint="탐정예티 돋보기에는 붙지 않습니다" />
        <label className="field"><span>돋보기 사냥터 몬스터</span><select value={input.magnifiers.fieldKey} onChange={event => upd((draft: MainInput) => { draft.magnifiers.fieldKey=event.target.value; if(event.target.value === "direct" && !draft.magnifiers.fieldLevel) draft.magnifiers.fieldLevel=draft.level; })}><option value="flame">플레임과 같게</option><option value="same">내 레벨 몬스터</option><option value="direct">몬스터 레벨 직접 입력</option></select></label>
        {input.magnifiers.fieldKey === "direct" && <NumField label="돋보기 몬스터 레벨" value={input.magnifiers.fieldLevel || startLevel} min={260} max={299} step={1} onChange={value => upd((draft: MainInput) => { draft.magnifiers.fieldLevel=value; })} />}
      </div></details>
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
        <label className="field"><span>크림슨 사용</span><select value={String(crimsonPlan)} onChange={event => upd((draft: MainInput) => { draft.crimsonPlan = event.target.value === "auto" ? "auto" : Number(event.target.value); })}>{crimsonOptions.map(option => <option key={option.label} value={String(option.value)}>{option.label}</option>)}</select></label>
        <label className="field"><span>EXP 교환권 사용</span><select value={couponPlan} onChange={event => upd((draft: MainInput) => { draft.couponPlan = event.target.value; })}><option value="auto">자동 추천</option><option value="now">받는 즉시</option>{[290, 295].filter(level => level > startLevel || couponPlan === `level${level}`).map(level => <option key={level} value={`level${level}`}>Lv.{level}에 닿은 뒤</option>)}<option value="end">마감 직전에 몰아서</option></select></label>
        <label className="field"><span>상급 EXP · 사우나 · 비약 사용</span><select value={rewardHold} onChange={event => upd((draft: MainInput) => { draft.rewardHold = Number(event.target.value); })}><option value="0">받는 즉시</option>{[290, 295].filter(level => level > startLevel || rewardHold === level).map(level => <option key={level} value={level}>Lv.{level}에 닿은 뒤</option>)}<option value="999">각 보상의 마지막 날</option></select></label>
      </div>
      <p className="pb-note">고른 레벨에 못 닿으면 마지막 사용일에 씁니다. 9월 PLUS·사과 보상은 10/21, 10월 PLUS·출석 보상과 퍼스널 교환권은 11/18입니다. 부스터와 4배 쿠폰은 사냥할 때 씁니다.</p>
      </div>
    </aside>

    {!eventOver && !r.mission.requiresTargetInput && <a className="pb-sticky" href="#pb-result" aria-label="계산 결과로 이동">
      <span>11/18 마감</span><b>{place(r.level, r.exp)}</b><b>{r.mission.stepsCleared}/{MISSION_STEPS}단계</b><i>결과 보기</i>
    </a>}
    <div className="results pb-results" id="pb-result">
      <div className="section-heading"><span>결과</span><div><p>{md(input.start)} → 11/18 마감</p><h2>퍼스널 버닝 시점 계산</h2></div></div>
      {eventOver && <div className="callout-mini" role="status">퍼스널 버닝은 11/18에 끝났습니다. 기준일을 이벤트 기간으로 바꿔 주세요.</div>}
      {!eventOver && r.mission.requiresTargetInput && <div className="callout-mini" role="status"><p>{r.warnings.find((text: string) => text.includes("게임 화면에서 다시 넣어"))}</p>{input.personal.mission.stepsDone === 30 && <p>{input.start < MAIN_SCHEDULE.expansionStart ? "10/22 전에는 완료한 30단계의 마지막 목표로 입력할 수 있습니다." : "업데이트 후 게임 화면에 표시된 다음 목표와 보상 %를 넣어 주세요."}</p>}<button type="button" className="pb-add" onClick={() => setSec("s1")}>성장 미션 입력하기</button></div>}
      {!eventOver && !r.mission.requiresTargetInput && <>
        <p className="pb-cond">계산 조건 · 9월 PLUS {input.plus.enabled ? ({ free: "무료", premium: "프리미엄", prime: "프라임" } as Record<string, string>)[input.plus.tier] : "참여 안 함"} · 10월 PLUS {input.plusOctober.enabled ? ({free:"무료",premium:"프리미엄",prime:"프라임"} as Record<string,string>)[octoberPlusTierOptions(input.plus).includes(input.plusOctober.tier) ? input.plusOctober.tier : "free"] : "참여 안 함"} · 보스 {Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}마리 주 {fmtJo(weeklyBossRaw, 2)} · 몬파 하루 {input.routine.runsPerDay}판 · 에픽 던전 {!input.routine.epic ? "안 함" : input.routine.epicMult > 1 ? `${input.routine.epicMult}배(주 ${fmtInt(epicStage1.maplePoint * (input.routine.epicMult >= 9 ? 4 : 1))} 메이플포인트 사용)` : "보너스 없음"} · 사냥 하루 30분 × {(input.routine.huntHoursPerWeek * 2 / 7).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}회 · 커스텀 조각 {flame.alloc.shard}·EXP {flame.alloc.exp}</p>
        <div className="pb-cards">
          <article className="pb-card primary"><span>11/18 마감 위치</span><strong>{place(r.level, r.exp)}</strong><em>시작 {place(startLevel, input.exp)} · +{(r.progress - r.startPosition).toFixed(2)}레벨</em></article>
          <article className="pb-card"><span>성장 미션</span><strong>{r.mission.stepsCleared}/{MISSION_STEPS}단계</strong><em>{coinGap > 0 ? `30단계보다 ${fmtInt(coinGap)}코인 적음` : "30,000코인 전부"} · 앞으로 받을 코인 {fmtInt(r.mission.coins)}개</em></article>
          <article className="pb-card"><span>플레임에서 받을 조각</span><strong>{Math.floor(r.flame.shardFragments + 1e-9).toLocaleString("ko-KR")}개</strong><em>플레임 {fmtInt(r.flame.killed)}마리 · 교환권 {fmtInt(r.coupons.used)}장 · 코인샵 조각은 별도</em></article>
        </div>

        <p className="pb-note pb-detective-total" role="status">탐정 돋보기 무료 {fmtInt(r.magnifiers.free)}개(기간 합계) · 경험치 {fmtJo(r.magnifiers.freeRaw, 3)} ({fmtEok(r.magnifiers.freeRaw)} EXP){r.hunting.extraHours > 0 ? ` · 추가 일반 사냥 ${r.hunting.extraHours.toFixed(2)}시간` : ""}</p>

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
        <p className="pb-note">크림슨 농장과 교환권을 언제 쓰는지 비교합니다. 단계 수가 같고 마감 경험치가 거의 같으면 늦게 쓰는 쪽을 추천합니다. 선택은 왼쪽 「사용 시점」에서 바꿉니다.</p>
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
          <p className="pb-note">지금 {input.plus.tier === "free" ? "무료" : input.plus.tier === "premium" ? "프리미엄" : "프라임"} 등급에서 올릴 때입니다. 등급을 올리면 지금 PLUS 레벨까지의 추가 보상을 받습니다.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>등급</th><th>캐시</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
            <tbody>{(tiers as unknown as { tier: Tier; cash: number; summary: { level: number; exp: number; stepsCleared: number }; gainProgress: number; gainSteps: number }[]).map(row => <tr key={row.tier} className={row.tier === input.plus.tier ? "best" : ""}>
              <td>{row.tier === "free" ? "무료" : row.tier === "premium" ? "프리미엄" : "프라임"}{row.tier === input.plus.tier ? " · 현재" : ""}</td>
              <td>{row.cash ? `${fmtInt(row.cash)}` : "-"}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
              <td>{row.tier === input.plus.tier ? "기준" : `+${row.gainProgress.toFixed(2)}%p${row.gainSteps ? ` · +${row.gainSteps}단계` : ""}${row.cash && row.gainProgress > 0 ? ` · 1%p당 ${fmtInt(row.cash / row.gainProgress)}캐시` : ""}`}</td></tr>)}</tbody>
          </table></div>
        </div>}

        {allocRows.length > 0 && <div className="pb-result-section" role="tabpanel" id="pb-pane-r2" aria-labelledby="pb-tab-r2" tabIndex={0} hidden={resTab !== "r2"}>
          <p className="pb-note">플레임 한 마리마다 리워드 포인트 3개를 어디에 줄지 고릅니다. 45단계를 어차피 넘으면 솔 에르다 조각에 다 주고, 못 넘으면 넘는 데 필요한 만큼만 퍼스널 EXP에 주는 쪽을 추천합니다. 나머지는 조각으로 계산했습니다.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>배분</th><th>마감 위치</th><th>단계</th><th>교환권</th><th>조각</th><th></th></tr></thead>
            <tbody>{allocRows.map((row: { alloc: { shard: number; exp: number; erda: number }; summary: { level: number; exp: number; stepsCleared: number }; couponsMade: number; shardFragments: number; recommended: boolean }) => {
              const current = flame.alloc.exp === row.alloc.exp && flame.alloc.shard === row.alloc.shard && flame.alloc.erda === 0;
              return <tr key={row.alloc.exp} className={row.recommended ? "best" : ""}>
                <td>EXP {row.alloc.exp} · 조각 {row.alloc.shard}{row.recommended ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td><td>{fmtInt(row.couponsMade)}장</td><td>{Math.floor(row.shardFragments + 1e-9).toLocaleString("ko-KR")}개</td>
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
        <p className="pb-note">마감: 9월 PLUS 수령 10/21 23:59 · 사용 10/22 02:00 / 10월 PLUS 수령 11/18 23:59 · 사용 11/19 02:00 / 퍼스널 단계·코인샵 11/18 23:59 · 보상 사용 11/19 02:00. {nextRefill ? `남은 플레임 추가는 ${md(nextRefill)}(목)부터 매주 목요일 0시입니다.` : "기준일 이후에는 플레임 추가가 없습니다."}</p>

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
        <div className="pb-exp-section-title"><h3>출처별 기간 합계</h3><strong>+{(periodSources.percent / 100).toFixed(2)}레벨</strong></div>
        <p className="pb-note">획득 당시 레벨에서 오른 %를 더했어요. 100%는 1레벨이에요.</p>
        <div className="pb-exp-period">{sourceRows.map(row => <div key={row.id} className="pb-exp-period-source" title={`${fmtInt(row.shown)} EXP`}>
          <SourceIcon id={row.id} level={r.rows.find((day: {sourceLevels:Record<string,number>})=>day.sourceLevels[row.id]!==undefined)?.sourceLevels[row.id]} /><div className="pb-gain-source-body"><div className="pb-gain-source-title"><span>{sourceLabels[row.id] || row.id}</span><b>+{percent(row.shownPercent)}%</b></div><div className="pb-gain-bar" aria-hidden="true"><i style={{ width: `${row.percent / totalPercent * 100}%` }} /></div></div>
        </div>)}</div>
        <details className="pb-gain-raw"><summary>기간 전체 EXP 숫자 보기</summary><p className="pb-note pb-period-total">기간 전체 {fmtInt(periodSources.total)} EXP</p></details>
        <DailyExperience rows={r.rows} displayDays={breakdown.days} />
        </div>
      </>}
    </div>
  </section>;
}
