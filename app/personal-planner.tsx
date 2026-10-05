"use client";

import { useMemo, useState } from "react";
import {
  addDay,
  analyzeMain,
  bossEntry,
  bossCommunityPreset,
  bossLabel,
  bossListWeeklyRaw,
  bossPreset,
  bossRaw,
  COINS_PER_STEP,
  compareAlloc,
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
// 사냥터 고르기용 몬스터 목록(지역 → 몬스터).
const FIELD_OPTIONS = HUNTING_FIELDS.map((field, index) => ({ key: `${index}`, region: field.region, label: `${field.monster} · Lv.${field.level} · ${field.maps.slice(0, 2).join(", ")}${field.maps.length > 2 ? " 외" : ""}`, level: field.level }));
const FIELD_REGIONS = [...new Set(HUNTING_FIELDS.map(field => field.region))];

function NumField({ label, value, onChange, step, min, max, hint }: { label: string; value: number; onChange: (value: number) => void; step?: number; min?: number; max?: number; hint?: string }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // 입력 중에는 사용자가 친 문자열을 그대로 두고, 포커스가 빠지면 저장된 값을 보여 준다.
  const shown = focused ? text : String(value);
  return <label className="field"><span>{label}</span>
    <input type="number" inputMode="decimal" value={shown} step={step} min={min} max={max}
      onFocus={() => { setText(String(value)); setFocused(true); }} onBlur={() => setFocused(false)}
      onChange={event => { setText(event.target.value); const parsed = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(parsed)) onChange(parsed); }} />
    {hint && <small className="pb-hint">{hint}</small>}
  </label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="pb-check"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}

export default function PersonalPlanner({ ctx, state }: { ctx: MainContext; state: MainInputState }) {
  const { input, upd, reset, today } = state;
  const [crimsonPlan, setCrimsonPlan] = useState<"auto" | number>("auto");
  const [couponPlan, setCouponPlan] = useState<"auto" | "now" | "end">("auto");
  const [bossCutoff, setBossCutoff] = useState("");
  const [bossParty, setBossParty] = useState<"solo" | "max">("solo");
  const [bossAdd, setBossAdd] = useState(BOSS_LADDER[0].id);
  const [communityPreset, setCommunityPreset] = useState("minimum");

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
  const tiers = useMemo(() => (plusAvailable ? compareTiers(input, ctx) : []), [plusAvailable, input, ctx]);
  const designations = useMemo(() => compareDesignation(input, ctx), [input, ctx]);
  const allocRows = useMemo(() => compareAlloc(input, ctx), [input, ctx]);
  const eventOver = diffDays(input.start, MAIN_SCHEDULE.personalEnd) > 0;
  const startLevel = Math.max(280, Math.min(295, Math.floor(input.level)));
  const days = r.rows.length;

  const flame = input.personal.flame;
  const flameFieldLevel = huntFieldLevelFor(flame, startLevel);
  const flameRaw = flame.expPerKill > 0 ? flame.expPerKill : flameModelRaw(flameFieldLevel);
  const couponAtStart = couponRawForLevel(startLevel);
  const weeklyFlameRaw = Math.min(flame.killsPerWeek, FLAME_WEEKLY_ADD) * flameRaw;
  const weeklyCoupons = Math.min(flame.killsPerWeek, FLAME_WEEKLY_ADD) * flame.alloc.exp / 100;
  const weeklyCouponRaw = weeklyCoupons * couponAtStart;
  const bosses = input.personal.bosses as { id: string; party: number; doneThisWeek: boolean }[];
  const weeklyBossRaw = bossListWeeklyRaw(bosses.slice(0, WEEKLY_BOSS_LIMIT));

  // 기준일 입력에는 그날 충전분이 들어 있으므로 다음 충전은 기준일 다음 목요일이다.
  const nextRefill = (() => { let day = addDay(input.start, 1); for (let i = 0; i < 8; i += 1) { if (dow(day) === "목") break; day = addDay(day, 1); } return diffDays(day, MAIN_SCHEDULE.personalEnd) <= 0 ? day : ""; })();
  const reachDate = (level: number) => r.rows.find((row: { level: number }) => row.level >= level)?.date as string | undefined;
  const nextLevels = [1, 2, 3].map(offset => startLevel + offset).filter(level => level <= 295);
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
  if (expiredPlus > 0) advices.push({ tone: "warn", text: `PLUS 아이템이 10/22 02:00에 소멸합니다. 크림슨 ${fmtInt(r.items.expired.crimson)}장, 상급 EXP ${fmtInt(r.items.expired.adv)}장, 사우나 ${r.items.expired.sauna.toFixed(1)}시간이 남습니다. 레벨 상한(296)에 닿아 쓸 수 없는 경우만 해당합니다.` });
  const unusedHuntItems = (r.items.expired.coupon4x || 0) + (r.items.expired.booster || 0);
  if (unusedHuntItems > 0.01) advices.push({ tone: "warn", text: `PLUS로 받은 경험치 4배 쿠폰 ${(r.items.expired.coupon4x || 0).toFixed(1)}장, VIP 부스터 ${(r.items.expired.booster || 0).toFixed(1)}개를 10/21까지 다 쓰지 못합니다. 둘 다 사냥하는 동안에만 쓸 수 있으니 「주간 사냥 시간」을 늘려야 합니다(쿠폰은 30분에 1장).` });
  if (r.coupons.expired > 0) advices.push({ tone: "warn", text: `교환권 ${fmtInt(r.coupons.expired)}장을 마감까지 쓰지 못합니다. 11/19 02:00에 소멸합니다.` });
  if (allocTotal > 3 + 1e-9) advices.push({ tone: "warn", text: "커스텀 포인트 합계가 3을 넘습니다. 게임에서는 3개를 나눠 씁니다." });
  if (allocTotal < 3 - 1e-9) advices.push({ tone: "info", text: "커스텀 포인트를 모두 쓰지 않으면 플레임을 소환할 수 없습니다. 합계를 3으로 맞추세요." });
  r.warnings.forEach((text: string) => advices.push({ tone: text.startsWith("다음 단계 목표(") ? "warn" : "info", text }));
  if (r.atCap) advices.push({ tone: "info", text: "296레벨에 닿았습니다. 이후 경험치는 계산하지 않습니다." });

  const assumed: string[] = [];
  if (!input.personal.designated) assumed.push("지정 예정이라 성장 미션 단계표를 지정일의 레벨·경험치에서 만들었습니다. 단계 간격은 본섭 286~289레벨 화면 값이고, 그 밖의 레벨은 9/11 테섭 표본과 커뮤니티 계산에서 구한 추정입니다.");
  else if (input.personal.mission.mode === "screen") assumed.push("성장 미션은 입력한 다음 단계 목표에서 시작해 레벨별 단계 간격으로 이었습니다. 본섭 두 캐릭터(286·287레벨 지정)의 30단계 목표가 0.01%p 안쪽으로 맞습니다. 285 미만과 290 이상의 간격은 표본에서 구한 추정입니다.");
  else assumed.push("성장 미션 단계표를 지정 당시 레벨·경험치에서 만들었습니다. 미션 화면의 다음 목표를 직접 넣으면 지정 당시 값을 몰라도 됩니다.");
  assumed.push("단계 보상은 레벨의 몬스터 기본 경험치 × 502,828.8로 계산했습니다. 본섭 286~289레벨 화면의 보상 네 값에서 구한 배수이고, 네 값과의 차이는 약 3.2만 EXP(2조가 넘는 보상의 0.000002%) 안쪽입니다.");
  if (!(flame.fieldLevel > 0)) assumed.push(flame.fieldKey === "same" ? "사냥터는 내 레벨과 같은 몬스터로, 레벨이 오르면 몬스터 레벨도 따라 오른다고 봤습니다." : "사냥터는 지금 레벨에서 갈 수 있는 지역의 가장 높은 몬스터(285~289레벨은 289, 290~294는 294, 295부터는 299)로 봤고, 레벨이 올라 다음 지역이 열리면 그쪽으로 옮긴다고 계산했습니다. 어센틱포스가 모자라 그 사냥터를 못 가면 사냥터를 직접 고르세요.");
  if (!(flame.expPerKill > 0)) assumed.push("플레임 1마리 경험치는 사냥터 몬스터 기본 경험치(하루1소재 표) × 72로 계산했습니다. ×72는 본섭 9/23 로그 3건으로 확인한 값이고 하루1소재에 플레임 계산식은 없습니다. 9/24 공지 수정 이후 같은 조건의 재측정은 하지 못했습니다.");
  if (input.plus.enabled) assumed.push("모멘텀 PLUS는 이벤트 시작부터 주 2,500포인트를 모두 채웠다고 보고, 해금된 레벨의 보상을 시작일에 바로 받는 것으로 계산합니다(1주 Lv.3, 2주 Lv.6, 3주 Lv.10). 실제 수령 레벨이 다르면 「수령한 PLUS 레벨」에 넣으세요.");
  if (input.routine.huntHoursPerWeek > 0) assumed.push("사냥은 하루1소재 사냥 식을 썼습니다: 30분에 7.5초 리젠 240번 × 40마리 × 몬스터 기본 경험치 × 레벨 차 보정. 여기에 입력한 「사냥 추가 경험치 %」(룬·쿠폰·버프·가호 합계)를 곱합니다. 사냥터 마릿수와 원킬 여부에 따라 실제는 다릅니다. 주간 사냥 시간은 매일 같은 양으로 나눠 계산합니다.");
  else assumed.push("주간 사냥 시간이 0이라 사냥 경험치와 PLUS의 경험치 4배 쿠폰·VIP 부스터는 계산에 넣지 않았습니다.");
  if (input.plus.enabled && input.plus.tier !== "free" && input.routine.huntHoursPerWeek > 0) assumed.push("PLUS의 경험치 4배 쿠폰(30분, 순수 사냥 경험치의 3배가 더 붙음)과 VIP 부스터(1,710마리에 기본 경험치 10배)는 사냥하는 동안 10/21까지 쓰는 것으로 계산했습니다. 값은 하루1소재 식이고 다른 추가 경험치와 겹치는 효과는 넣지 않았습니다. 하루 사냥량에 맞춰 조금씩 쓰는 평균 계산이라 실제로 쓰는 날짜·개수와는 다릅니다.");
  assumed.push("마감 다음 날 00:00~02:00(10/22, 11/19)에 쓸 수 있는 시간은 빼고 10/21·11/18을 마지막 날로 봅니다.");
  assumed.push("퍼스널 EXP 교환권은 레벨의 몬스터 기본 경험치 × 480으로 계산했습니다(하루1소재·메이플로드 교환권 표와 같음). 본섭에서 한 장씩 써서 확인한 값은 아닙니다.");
  assumed.push("보스 미션 경험치는 하루1소재 표(보스별 고정 경험치, 경험치를 받는 파티원 수로 나눔)입니다. 공식 공지에는 보스별 수치가 없습니다. 본섭 9/27 보스 미션 화면의 5개 값(세렌 노멀·하드, 칼로스 이지, 대적자 이지, 카링 이지)은 표와 정확히 일치했고, 나머지 30개는 화면과 대조하지 못했습니다.");
  if (bosses.length === 0) assumed.push("보스 미션을 넣지 않았습니다. 위에서 보스 상한을 고르면 한 번에 채워집니다.");
  if (input.routine.argoMonsterPark > 0 || input.routine.argoGrandis > 0) assumed.push("아르고호의 가호는 입력한 %를 기준일부터 11/25까지 그대로 적용합니다. 포인트를 모아 레벨을 올려 가는 과정은 계산하지 않으니, 아직 올리는 중이면 지금 레벨의 %를 넣으세요. 가호는 몬스터파크·익스트림 몬스터파크·그란디스 일퀘에만 붙고 에픽 던전에는 붙지 않습니다.");
  if (!(input.routine.measuredPercentPerDay > 0)) assumed.push("하루 일과(몬스터파크·그란디스)는 하루1소재·메이플로드 표에 아르고호의 가호 전술 마법(입력값)만 더했고, 챌섭 에테리온 보너스는 넣지 않았습니다. 본섭 실측이 아닙니다.");
  if (!(input.routine.weeklyMeasuredPercent > 0) && (input.routine.extreme || input.routine.epic)) assumed.push("주간 컨텐츠(익스트림 몬파·에픽 던전)는 하루1소재·메이플로드 표를 그대로 썼습니다. 에픽 던전은 289레벨까지 악몽선경, 290레벨부터 아우룸 레기스(악몽선경의 1.5배)이고 보상 배수는 입력값입니다. 본섭 실측이 아닙니다.");

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
  const crimsonRows = [...new Set(analysis.options.map((option: { crimsonHold: number }) => option.crimsonHold))].map(hold => bestOf(option => option.crimsonHold === hold));
  const couponRows = ["now", "end"].map(policy => bestOf(option => option.couponPolicy === policy));
  const hasCrimson = analysis.options.some((option: { result: Result }) => option.result.items.crimsonUsed > 0);

  const applyCommunityPreset = () => { if (communityPreset) upd((draft: MainInput) => { draft.personal.bosses = bossCommunityPreset(communityPreset, bossParty); }); };
  const applyBossPreset = () => { if (bossCutoff) upd((draft: MainInput) => { draft.personal.bosses = bossPreset({ cutoffId: bossCutoff, partyMode: bossParty }); }); };
  const addBoss = () => upd((draft: MainInput) => {
    const entry = bossEntry(bossAdd);
    if (!entry) return;
    // 같은 보스는 난이도 하나만 둔다.
    draft.personal.bosses = draft.personal.bosses.filter((boss: { id: string }) => bossEntry(boss.id)?.boss !== entry.boss);
    draft.personal.bosses.push({ id: entry.id, party: 1, doneThisWeek: false });
  });

  return <section className="calculator-shell pb-shell tab-panel" id="personal-panel" role="tabpanel" aria-labelledby="personal-tab">
    <aside className="controls pb-controls">
      <div className="section-heading"><span>입력</span><div><p>본섭 · 9/17~11/18</p><h2>퍼스널 버닝 계산</h2></div>
        <button type="button" className="reset" onClick={reset}>기본값 복원</button></div>
      <p className="pb-note">처음에는 본섭 287레벨 사례의 예시값이 들어 있습니다. 내 값으로 바꾸면 이 브라우저에 저장됩니다.</p>
      {stale && <div className="callout-mini" role="status">입력 기준일이 {md(input.start)}입니다. 오늘({md(today)}) 값으로 레벨·경험치·남은 플레임을 다시 넣고 기준일을 오늘로 맞추면 정확합니다. <button type="button" className="pb-link" onClick={() => upd((draft: MainInput) => { draft.start = today; })}>기준일을 오늘로</button></div>}

      <h3 className="pb-group">내 캐릭터</h3>
      <div className="field-grid compact">
        <label className="field"><span>기준일</span><input type="date" value={input.start} min={MAIN_SCHEDULE.personalStart} max={MAIN_SCHEDULE.personalEnd} onChange={event => event.target.value && upd((draft: MainInput) => { draft.start = event.target.value; })} /></label>
        <label className="field"><span>현재 레벨</span><select value={startLevel} onChange={event => upd((draft: MainInput) => { draft.level = Number(event.target.value); })}>{Array.from({ length: 16 }, (_, index) => index + 280).map(level => <option key={level}>{level}</option>)}</select></label>
        <NumField label="현재 경험치 %" value={input.exp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.exp = value; })} />
      </div>

      <h3 className="pb-group">퍼스널 성장 미션</h3>
      <div className="pb-choice" role="group" aria-label="지정 여부">
        <button type="button" className={input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = true; })}>이미 지정했어요</button>
        <button type="button" className={!input.personal.designated ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.designated = false; })}>아직 안 했어요</button>
      </div>
      {input.personal.designated ? <>
        <div className="pb-choice" role="group" aria-label="단계표 입력 방식">
          <button type="button" className={input.personal.mission.mode === "screen" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "screen"; })}>다음 목표 직접 입력</button>
          <button type="button" className={input.personal.mission.mode === "model" ? "on" : ""} onClick={() => upd((draft: MainInput) => { draft.personal.mission.mode = "model"; })}>지정 당시 상태로 추정</button>
        </div>
        {input.personal.mission.mode === "screen" ? <div className="field-grid compact">
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={30} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} hint="남은 단계 개수만 정합니다. 목표 위치는 아래 다음 목표로 정해집니다" />
          <NumField label="다음 단계 보상 %" value={input.personal.mission.nextRewardPct} min={0} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextRewardPct = value; })} hint="화면의 경험치 보상 %" />
          <NumField label="다음 단계 목표 레벨" value={input.personal.mission.nextTarget.level} min={280} max={295} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.level = value; })} />
          <NumField label="다음 단계 목표 %" value={input.personal.mission.nextTarget.exp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.nextTarget.exp = value; })} />
        </div> : <div className="field-grid compact">
          <NumField label="통과한 단계 수" value={input.personal.mission.stepsDone} min={0} max={30} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.stepsDone = value; })} />
          <NumField label="지정 당시 레벨" value={input.personal.mission.designLevel} min={280} max={295} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designLevel = value; })} />
          <NumField label="지정 당시 경험치 %" value={input.personal.mission.designExp} min={0} max={99.999} step={0.001} onChange={value => upd((draft: MainInput) => { draft.personal.mission.designExp = value; })} />
        </div>}
      </> : <div className="field-grid compact">
        <label className="field"><span>지정 예정일</span><input type="date" value={input.personal.designDate} min={input.start} max={MAIN_SCHEDULE.personalEnd} onChange={event => event.target.value && upd((draft: MainInput) => { draft.personal.designDate = event.target.value; })} /></label>
      </div>}

      <h3 className="pb-group">플레임</h3>
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
        <NumField label="몬스터 레벨 직접 입력" value={flame.fieldLevel} min={0} max={299} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.fieldLevel = value; draft.personal.flame.fieldKey = ""; })} hint="아케인 지역 등. 0이면 위 선택" />
        <NumField label="플레임 1마리 경험치" value={flame.expPerKill} min={0} step={1000} onChange={value => upd((draft: MainInput) => { draft.personal.flame.expPerKill = value; })} hint="경험치 로그 숫자. 0이면 표" />
        <NumField label="커스텀 · 조각" value={flame.alloc.shard} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.shard = value; })} />
        <NumField label="커스텀 · EXP" value={flame.alloc.exp} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.exp = value; })} />
        <NumField label="커스텀 · 솔 에르다" value={flame.alloc.erda} min={0} max={3} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.alloc.erda = value; })} />
        <NumField label="보유 EXP 교환권" value={flame.couponsOwned} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.personal.flame.couponsOwned = value; })} />
        <NumField label="보유 퍼스널 EXP 포인트" value={flame.expPointsOwned} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.personal.flame.expPointsOwned = value; })} hint="아직 교환 안 한 포인트. 100P = 교환권 1장" />
      </div>
      <div className="pb-formula" aria-label="플레임과 교환권 계산">
        <p><b>플레임 1마리</b> = 몬스터 Lv.{flameFieldLevel} 기본 경험치 {fmtInt(mobBaseExp(flameFieldLevel))} × {PERSONAL_FLAME_MULTIPLE} = <b>{fmtEok(flameRaw)}</b></p>
        <p><b>교환권 1장</b> = Lv.{startLevel} 기본 경험치 {fmtInt(mobBaseExp(startLevel))} × {PERSONAL_COUPON_MULTIPLE} = <b>{fmtEok(couponAtStart)}</b> ({(couponAtStart / ctx.reqRaw(startLevel) * 100).toFixed(4)}%)</p>
        <p><b>주 24,000마리</b> = {fmtJo(weeklyFlameRaw, 2)} + 교환권 {fmtInt(weeklyCoupons)}장 {fmtJo(weeklyCouponRaw, 2)} = <b>{(((weeklyFlameRaw + weeklyCouponRaw) / ctx.reqRaw(startLevel)) * 100).toFixed(1)}%p</b>/주 (Lv.{startLevel} 기준)</p>
      </div>

      <h3 className="pb-group">퍼스널 보스 미션</h3>
      <p className="pb-note">9/24부터 주 1회, 최대 {WEEKLY_BOSS_LIMIT}개. 경험치는 보스마다 고정이고 파티원 수로 나뉩니다. 내가 잡는 가장 센 보스를 고르면 그 이하에서 보스별 가장 센 난이도를 경험치 순으로 채웁니다.</p>
      <div className="field-grid compact">
        <label className="field"><span>보스 상한 (여기까지 잡음)</span>
          <select value={bossCutoff} onChange={event => setBossCutoff(event.target.value)}>
            <option value="">선택 안 함</option>
            {BOSS_LADDER.map(entry => <option key={entry.id} value={entry.id}>{entry.boss} {entry.difficulty} · {fmtJo(entry.unitExp * 10_000, 2)}</option>)}
          </select></label>
        <label className="field"><span>파티원 (경험치 받는 인원)</span>
          <select value={bossParty} onChange={event => setBossParty(event.target.value as "solo" | "max")}><option value="solo">전부 솔로</option><option value="max">보스별 최대 인원</option></select></label>
      </div>
      <button type="button" className="pb-add" disabled={!bossCutoff} onClick={applyBossPreset}>{bossCutoff ? `${bossLabel(bossCutoff)} 이하로 채우기` : "보스 상한을 고르면 채울 수 있어요"}</button>
      <div className="pb-boss-add">
        <select aria-label="자주 쓰는 보스 구성" value={communityPreset} onChange={event => setCommunityPreset(event.target.value)}>
          <option value="">자주 쓰는 구성 (검밑솔·노세이칼…)</option>
          {BOSS_COMMUNITY_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label} {preset.ids.length}종</option>)}
        </select>
        <button type="button" className="pb-add" disabled={!communityPreset} onClick={applyCommunityPreset}>채우기</button>
      </div>
      {communityPreset ? <p className="pb-note">{BOSS_COMMUNITY_PRESETS.find(preset => preset.id === communityPreset)?.detail}</p> : null}
      {bosses.map((boss, index) => {
        const entry = bossEntry(boss.id);
        return <div className="pb-boss" key={boss.id}>
          <div className="pb-boss-name"><b>{bossLabel(boss.id)}</b><small>{fmtJo(bossRaw(boss.id, boss.party), 2)} · Lv.{startLevel} {(bossRaw(boss.id, boss.party) / ctx.reqRaw(startLevel) * 100).toFixed(2)}%</small></div>
          <label className="field"><span>파티원</span>
            <select value={boss.party} onChange={event => upd((draft: MainInput) => { draft.personal.bosses[index].party = Number(event.target.value); })}>{Array.from({ length: entry ? entry.maxParty : 1 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}인</option>)}</select></label>
          <Check label="이번 주 처치함" checked={boss.doneThisWeek} onChange={value => upd((draft: MainInput) => { draft.personal.bosses[index].doneThisWeek = value; })} />
          <button type="button" className="pb-remove" aria-label={`${bossLabel(boss.id)} 삭제`} onClick={() => upd((draft: MainInput) => { draft.personal.bosses.splice(index, 1); })}>삭제</button>
        </div>;
      })}
      <div className="pb-boss-add">
        <select aria-label="보스 직접 추가" value={bossAdd} onChange={event => setBossAdd(event.target.value)}>{BOSS_LADDER.map(entry => <option key={entry.id} value={entry.id}>{entry.boss} {entry.difficulty}</option>)}</select>
        <button type="button" className="pb-add" onClick={addBoss}>+ 보스 추가</button>
      </div>
      <p className="pb-note">주간 합계 {fmtJo(weeklyBossRaw, 2)} · Lv.{startLevel} 기준 {(weeklyBossRaw / ctx.reqRaw(startLevel) * 100).toFixed(1)}%p · {Math.min(bosses.length, WEEKLY_BOSS_LIMIT)}/{WEEKLY_BOSS_LIMIT}개</p>

      <h3 className="pb-group">일과</h3>
      <div className="field-grid compact">
        <NumField label="몬스터파크 하루 판수" value={input.routine.runsPerDay} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.runsPerDay = value; })} hint="무료 2판. 이용권·메이플포인트로 하루 7판까지" />
        <NumField label="일요일 판수" value={input.routine.sundayRuns} min={0} max={7} step={1} onChange={value => upd((draft: MainInput) => { draft.routine.sundayRuns = value; })} hint="일요일은 경험치 1.5배. 일요일만 7판 돌면 7" />
        <label className="field"><span>에픽 던전 보상 배수</span><select value={input.routine.epicMult} onChange={event => upd((draft: MainInput) => { draft.routine.epicMult = Number(event.target.value); })}><option value={1}>1배 (보너스 없음)</option><option value={5}>5배 (EXP 1단계 · 흔히 4배, 기본 + 400% 추가)</option><option value={9}>9배 (EXP 2단계 · 흔히 8배)</option></select></label>
        <NumField label="몬스터파크 추가 경험치 %" value={input.routine.argoMonsterPark} min={0} max={50} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.argoMonsterPark = value; })} hint="아르고호의 가호 Lv1~6 = 5·10·20·30·40·50%. 익스트림 몬파에도 붙음" />
        <NumField label="그란디스 일퀘 추가 경험치 %" value={input.routine.argoGrandis} min={0} max={50} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.argoGrandis = value; })} hint="아르고호의 가호. Lv2 = 10%, 최대 50%" />
        <NumField label="에픽 던전 추가 경험치 %" value={input.routine.epicBonus} min={0} max={200} step={5} onChange={value => upd((draft: MainInput) => { draft.routine.epicBonus = value; })} hint="따로 받는 추가 경험치가 있을 때만. 없으면 0" />
        <NumField label="주간 사냥 시간" value={input.routine.huntHoursPerWeek} min={0} max={168} step={0.5} onChange={value => upd((draft: MainInput) => { draft.routine.huntHoursPerWeek = value; })} hint="시간. 위에서 고른 사냥터 기준. 0이면 사냥 없음" />
        <NumField label="사냥 추가 경험치 %" value={input.routine.huntBonusPct} min={0} max={3000} step={10} onChange={value => upd((draft: MainInput) => { draft.routine.huntBonusPct = value; })} hint="룬·경험치 쿠폰·버프·가호 합계. 0이면 순수 경험치" />
        <NumField label="하루 일과 직접 입력 %" value={input.routine.measuredPercentPerDay} min={0} step={0.01} onChange={value => upd((draft: MainInput) => { draft.routine.measuredPercentPerDay = value; })} hint="몬파·그란디스 대신 쓸 하루 값. 0이면 표" />
        <NumField label="주간 컨텐츠 직접 입력 %" value={input.routine.weeklyMeasuredPercent} min={0} step={0.01} onChange={value => upd((draft: MainInput) => { draft.routine.weeklyMeasuredPercent = value; })} hint="익몬·에픽 던전 대신 쓸 주간 값. 0이면 표" />
      </div>
      <div className="pb-checks">
        <Check label="그란디스 일퀘" checked={input.routine.grandis} onChange={value => upd((draft: MainInput) => { draft.routine.grandis = value; })} />
        <Check label="익스트림 몬파(주간)" checked={input.routine.extreme} onChange={value => upd((draft: MainInput) => { draft.routine.extreme = value; })} />
        <Check label="에픽 던전(주간)" checked={input.routine.epic} onChange={value => upd((draft: MainInput) => { draft.routine.epic = value; })} />
        <Check label="오늘 일과 아직 안 함" checked={input.routine.todayPending} onChange={value => upd((draft: MainInput) => { draft.routine.todayPending = value; })} />
        <Check label="이번 주 주간 컨텐츠 아직 안 함" checked={input.routine.weeklyPending} onChange={value => upd((draft: MainInput) => { draft.routine.weeklyPending = value; })} />
      </div>

      <h3 className="pb-group">모멘텀 패스 PLUS · 보유 아이템</h3>
      <div className="pb-checks"><Check label="PLUS 참여 중 (10/21까지)" checked={input.plus.enabled} onChange={value => upd((draft: MainInput) => { draft.plus.enabled = value; })} /></div>
      <div className="field-grid compact">
        <label className="field"><span>보유 등급</span><select value={input.plus.tier} disabled={!input.plus.enabled} onChange={event => upd((draft: MainInput) => { draft.plus.tier = event.target.value as Tier; })}><option value="free">무료</option><option value="premium">프리미엄</option><option value="prime">프라임</option></select></label>
        <NumField label="수령한 PLUS 레벨" value={input.plus.claimedLevel} min={0} max={10} step={1} onChange={value => upd((draft: MainInput) => { draft.plus.claimedLevel = value; })} hint="0 = 아직 못 받음·모아 둠(기본) · 10 = 전부 받아 씀" />
        <NumField label="크림슨 메카베리 농장" value={input.items.crimson} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.crimson = value; })} hint="장" />
        <NumField label="상급 EXP 교환권" value={input.items.adv} min={0} step={100} onChange={value => upd((draft: MainInput) => { draft.items.adv = value; })} hint="장" />
        <NumField label="VIP 사우나" value={input.items.sauna} min={0} step={0.5} onChange={value => upd((draft: MainInput) => { draft.items.sauna = value; })} hint="시간" />
        <NumField label="메카베리 농장" value={input.items.mech} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.mech = value; })} hint="장" />
        <NumField label="블루베리 농장" value={input.items.blue} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.blue = value; })} hint="장" />
        <NumField label="전설 성장의 비약" value={input.items.potion279} min={0} step={1} onChange={value => upd((draft: MainInput) => { draft.items.potion279 = value; })} hint="개" />
      </div>

      <h3 className="pb-group">사용 시점</h3>
      <div className="field-grid compact">
        <label className="field"><span>크림슨 사용</span><select value={String(crimsonPlan)} onChange={event => setCrimsonPlan(event.target.value === "auto" ? "auto" : Number(event.target.value))}>{crimsonOptions.map(option => <option key={option.label} value={String(option.value)}>{option.label}</option>)}</select></label>
        <label className="field"><span>EXP 교환권 사용</span><select value={couponPlan} onChange={event => setCouponPlan(event.target.value as "auto" | "now" | "end")}><option value="auto">자동 (가장 좋은 방식)</option><option value="now">받는 즉시</option><option value="end">마감 직전에 몰아서</option></select></label>
      </div>
    </aside>

    <div className="results pb-results">
      <div className="section-heading"><span>결과</span><div><p>{md(input.start)} → 11/18 마감</p><h2>퍼스널 버닝 시점 계산</h2></div></div>
      {eventOver && <div className="callout-mini" role="status">퍼스널 버닝은 11/18에 끝났습니다. 기준일을 이벤트 기간으로 바꿔 주세요.</div>}
      {!eventOver && <>
        <div className="pb-cards">
          <article className="pb-card primary"><span>11/18 마감 위치</span><strong>{place(r.level, r.exp)}</strong><em>시작 {place(startLevel, input.exp)} · +{(r.progress - r.startPosition).toFixed(2)}레벨</em></article>
          <article className="pb-card"><span>성장 미션</span><strong>{r.mission.stepsCleared}/{MISSION_STEPS}단계</strong><em>{r.mission.newlyCleared.length ? `이번에 +${r.mission.newlyCleared.length}단계 · 코인 +${fmtInt(r.mission.coins)}` : "새로 넘는 단계 없음"}</em></article>
          <article className="pb-card"><span>플레임 · 교환권 · 보스</span><strong>{fmtInt(r.flame.killed)}마리</strong><em>{r.flame.overflowLost > 0 ? `소실 ${fmtInt(r.flame.overflowLost)}마리 · ` : ""}교환권 {fmtInt(r.coupons.used)}장 · 보스 {fmtInt(r.boss.clears)}회</em></article>
        </div>

        {advices.length > 0 && <div className="pb-advice" aria-label="확인할 것">{advices.map((advice, index) => <p key={index} className={advice.tone}>{advice.text}</p>)}</div>}

        <div className="pb-dates">
          {nextLevels.map(level => { const date = reachDate(level); return <span key={level}><b>Lv.{level}</b>{date ? `${md(date)}(${dow(date)}) 도달` : "마감까지 못 닿음"}</span>; })}
        </div>

        <h3 className="pb-title">시점 비교</h3>
        <p className="pb-note">크림슨 농장 사용 시점과 교환권 사용 시점을 모두 돌려 통과 단계, 마감 위치 순으로 골랐습니다. 선택은 왼쪽 「사용 시점」에서 바꿉니다.</p>
        {hasCrimson && <div className="pb-table-wrap"><table className="hold-table pb-table">
          <thead><tr><th>크림슨 사용</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
          <tbody>{crimsonRows.map((row: { crimsonHold: number; summary: { level: number; exp: number; progress: number; stepsCleared: number }; best: boolean }) => <tr key={row.crimsonHold} className={row.crimsonHold === chosen.crimsonHold ? "best" : ""}>
            <td>{holdLabel(row.crimsonHold)}{row.crimsonHold === analysis.best.crimsonHold ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
            <td>{row.crimsonHold === 0 ? "기준" : `${((row.summary.progress - bestOf(option => option.crimsonHold === 0).summary.progress) * 100).toFixed(2)}%p`}</td></tr>)}</tbody>
        </table></div>}
        {!hasCrimson && <p className="pb-note">보유한 크림슨 농장이 없어 크림슨 사용 시점에 따른 차이가 없습니다.</p>}
        <div className="pb-table-wrap"><table className="hold-table pb-table">
          <thead><tr><th>EXP 교환권 사용</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
          <tbody>{couponRows.map((row: { couponPolicy: string; summary: { level: number; exp: number; progress: number; stepsCleared: number } }) => <tr key={row.couponPolicy} className={row.couponPolicy === chosen.couponPolicy ? "best" : ""}>
            <td>{couponLabel(row.couponPolicy)}{row.couponPolicy === analysis.best.couponPolicy ? " · 추천" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
            <td>{row.couponPolicy === "now" ? "기준" : `${((row.summary.progress - bestOf(option => option.couponPolicy === "now").summary.progress) * 100).toFixed(2)}%p`}</td></tr>)}</tbody>
        </table></div>
        <p className="pb-note">교환권 한 장은 쓰는 시점의 레벨에 따라 경험치가 달라집니다(레벨의 몬스터 기본 경험치 × 480). 마감일(11/18) 안에 쓰면 소멸하지 않으므로 먼저 쓸지 몰아 쓸지는 이 표의 차이로 고르세요.</p>

        {tiers.length > 1 && <>
          <h3 className="pb-title">PLUS 등급 비교</h3>
          <p className="pb-note">지금 {input.plus.tier === "free" ? "무료" : input.plus.tier === "premium" ? "프리미엄" : "프라임"} 등급에서 올릴 때입니다. 이미 받은 레벨의 위 등급 보상도 구매하면 받을 수 있다고 봤습니다. 구매 전에 인게임 표기를 확인하세요.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>등급</th><th>캐시</th><th>마감 위치</th><th>단계</th><th>차이</th></tr></thead>
            <tbody>{(tiers as unknown as { tier: Tier; cash: number; summary: { level: number; exp: number; stepsCleared: number }; gainProgress: number; gainSteps: number }[]).map(row => <tr key={row.tier} className={row.tier === input.plus.tier ? "best" : ""}>
              <td>{row.tier === "free" ? "무료" : row.tier === "premium" ? "프리미엄" : "프라임"}{row.tier === input.plus.tier ? " · 현재" : ""}</td>
              <td>{row.cash ? `${fmtInt(row.cash)}` : "-"}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td>
              <td>{row.tier === input.plus.tier ? "기준" : `+${row.gainProgress.toFixed(2)}%p${row.gainSteps ? ` · +${row.gainSteps}단계` : ""}${row.cash && row.gainProgress > 0 ? ` · 1%p당 ${fmtInt(row.cash / row.gainProgress)}캐시` : ""}`}</td></tr>)}</tbody>
          </table></div>
        </>}

        {allocRows.length > 0 && <>
          <h3 className="pb-title">커스텀 포인트 배분</h3>
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
          <p className="pb-note">게임에서는 배분을 초기화해 다시 정할 수 있지만, 여기서는 마감까지 같은 배분으로 계산합니다. 솔 에르다에 주는 경우는 표에 넣지 않았습니다(위 입력칸에서 직접 넣을 수 있습니다).</p>
        </>}

        {designations.length > 0 && <>
          <h3 className="pb-title">지정 시점 비교</h3>
          <p className="pb-note">지정 전에는 플레임·미션·보스가 돌지 않습니다. 지정하면 되돌릴 수 없고 명의당 1캐릭터입니다.</p>
          <div className="pb-table-wrap"><table className="hold-table pb-table">
            <thead><tr><th>지정일</th><th>마감 위치</th><th>단계</th><th>플레임</th></tr></thead>
            <tbody>{designations.map((row: { designDate: string; summary: { level: number; exp: number; stepsCleared: number }; flameKilled: number }) => <tr key={row.designDate} className={row.designDate === input.personal.designDate ? "best" : ""}>
              <td>{md(row.designDate)}({dow(row.designDate)}){row.designDate === input.personal.designDate ? " · 선택" : ""}</td><td>{place(row.summary.level, row.summary.exp)}</td><td>{row.summary.stepsCleared}</td><td>{fmtInt(row.flameKilled)}마리</td></tr>)}</tbody>
          </table></div>
        </>}

        <h3 className="pb-title">주차별 진행</h3>
        <div className="pb-table-wrap"><table className="hold-table pb-table pb-weeks">
          <thead><tr><th>시작</th><th>플레임</th><th>보스</th><th>교환권</th><th>주말 위치</th><th>누적 단계</th></tr></thead>
          <tbody>{r.weeks.map((week: { start: string; kills: number; overflow: number; bosses: number; couponsUsed: number; levelEnd: number; expEnd: number; steps: number }) => <tr key={week.start}>
            <td>{md(week.start)}({dow(week.start)})</td><td>{fmtInt(week.kills)}{week.overflow > 0 ? ` · 소실 ${fmtInt(week.overflow)}` : ""}</td><td>{week.bosses}</td><td>{week.couponsUsed ? fmtInt(week.couponsUsed) : "-"}</td>
            <td>{place(week.levelEnd, week.expEnd)}</td><td>{week.steps}</td></tr>)}</tbody>
        </table></div>
        <p className="pb-note">마감: PLUS 수령 10/21 23:59 · 사용 10/22 02:00 / 퍼스널 단계·코인샵 11/18 23:59 · 보상 사용 11/19 02:00. {nextRefill ? `남은 플레임 추가는 ${md(nextRefill)}(목)부터 매주 목요일 0시입니다.` : "기준일 이후에는 플레임 추가가 없습니다."}</p>

        <h3 className="pb-title">성장 미션 단계표</h3>
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

        <h3 className="pb-title">경험치가 어디서 오나</h3>
        <div className="pb-sources">{sourceRows.map(row => <div key={row.id} className="pb-source"><span>{sourceLabels[row.id] || row.id}</span>
          <i style={{ width: `${Math.max(2, row.raw / totalRaw * 100)}%` }} /><b>{fmtJo(row.raw)} · {(row.raw / ctx.reqRaw(startLevel) * 100).toFixed(1)}%p</b></div>)}</div>
        <p className="pb-note">%p는 시작 레벨({startLevel}) 필요 경험치 기준이라 레벨이 오른 뒤 얻은 경험치는 실제 표시 %보다 크게 보일 수 있습니다.</p>

        {assumed.length > 0 && <div className="pb-assume"><h3>이 계산이 기대는 가정</h3><ul>{assumed.map(text => <li key={text}>{text}</li>)}</ul></div>}
      </>}
    </div>
  </section>;
}
