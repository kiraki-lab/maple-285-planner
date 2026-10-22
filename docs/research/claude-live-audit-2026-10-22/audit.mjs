// 독립 검산 스크립트. 저장소의 lib는 읽기만 하고 고치지 않는다.
// 실행: node --experimental-strip-types docs/research/claude-live-audit-2026-10-22/audit.mjs > docs/research/claude-live-audit-2026-10-22/audit-output.json
import { readFileSync } from "node:fs";
import { createMainContext, itemConversionRequiredExperience as req } from "../../../lib/exp-tables.ts";
import { MOB_BASE_EXP, PERSONAL_BOSS_TABLE } from "../../../lib/personal-data.mjs";
import {
  bossRaw, buildMissionTable, defaultMainInput, MAIN_SCHEDULE, octoberPlusRewardLines, octoberPlusTierOptions,
  plusLevelSchedule, simulateMain, stepRawForLevel, stepRewardRawForLevel,
} from "../../../lib/main-planner.mjs";

const here = new URL(".", import.meta.url);
const live = JSON.parse(readFileSync(new URL("live-samples.json", here), "utf8"));
const out = {};
const mob = l => MOB_BASE_EXP[l];

// 한 단계 전진. 레벨 경계를 넘으면 남은 비율을 다음 레벨 간격으로 잇는다(엔진과 같은 가정을 별도로 구현).
function advance(level, pct, step = stepRawForLevel) {
  let xp = req(level) * pct / 100, need = 1;
  while (need > 1e-12) {
    const size = step(level), avail = (req(level) - xp) / size;
    if (need <= avail) { xp += need * size; need = 0; if (xp >= req(level)) { level += 1; xp = 0; } }
    else { need -= avail; level += 1; xp = 0; }
  }
  return [level, xp / req(level) * 100];
}
const coord = (l, p) => l + p / 100;

// 1. 본섭 화면 연속 목표 재현: 각 화면의 첫 목표에서 이어 다음 목표들을 만든다.
out.missionChains = live.missionScreens.map(s => {
  const t = [...s.targets].sort((a, b) => a[0] - b[0]);
  const [s0, l0, p0] = t[0];
  let cur = [l0, p0], idx = s0;
  const rows = [];
  for (const [stage, l, p] of t.slice(1)) {
    while (idx < stage) { cur = advance(cur[0], cur[1]); idx += 1; }
    const errPctPoint = cur[0] === l ? cur[1] - p : (coord(...cur) - coord(l, p)) * 100;
    rows.push({ stage, screen: `${l}·${p}`, engine: `${cur[0]}·${cur[1].toFixed(4)}`, errPctPoint: +errPctPoint.toFixed(4), stepsFromStart: stage - s0 });
  }
  return { id: s.id, post: s.post, start: `${s0}단계 ${l0}·${p0}`, rows, maxAbsErr: Math.max(...rows.map(r => Math.abs(r.errPctPoint))) };
});

// 2. 같은 레벨 안 간격: 화면 실측 vs 엔진. 반올림 허용폭 = 0.001 / (단계 수).
const intervals = {};
for (const s of live.missionScreens) {
  const byLevel = {};
  for (const [stage, l, p] of s.targets) (byLevel[l] ||= []).push([stage, p]);
  for (const [l, arr] of Object.entries(byLevel)) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => a[0] - b[0]);
    const [a, b] = [arr[0], arr.at(-1)];
    const n = b[0] - a[0];
    (intervals[l] ||= []).push({ id: s.id, steps: n, screen: +((b[1] - a[1]) / n).toFixed(6), tolerance: +(0.001 / n).toFixed(6) });
  }
}
out.intervals = Object.fromEntries(Object.entries(intervals).map(([l, rows]) => {
  const engine = stepRawForLevel(+l) / req(+l) * 100;
  return [l, { engine: +engine.toFixed(6), samples: rows.map(r => ({ ...r, diff: +(r.screen - engine).toFixed(6), withinRounding: Math.abs(r.screen - engine) <= r.tolerance })),
    impliedMobMultiple: rows.map(r => Math.round(r.screen / 100 * req(+l) / mob(+l))), engineMobMultiple: Math.round(stepRawForLevel(+l) / mob(+l)) }];
}));

// 3. 31~45단계 보상: 엔진 % 와 화면 % (반올림 3자리) 비교.
out.rewards = [];
for (const s of live.missionScreens) {
  for (const [stage, l, pct, digits] of s.rewards || []) {
    const raw = stepRewardRawForLevel(l, stage);
    const enginePct = raw / req(l) * 100;
    out.rewards.push({ id: s.id, stage, level: l, screenPct: pct, digits: digits || null, enginePct: +enginePct.toFixed(5), roundsTo: +enginePct.toFixed(3), match: +enginePct.toFixed(3) === pct });
  }
  for (const [stage, l, exact, pct] of s.rewardsExact || []) {
    const raw = stepRewardRawForLevel(l, stage);
    out.rewards.push({ id: s.id, stage, level: l, screenExact: exact, engineRaw: raw, diffWon: Math.round(raw - exact), impliedMultiple: +(exact / mob(l)).toFixed(4), screenPct: pct });
  }
}
// 37단계(294·99.991%) 0.131% 이상값 검토: 같은 화면 294 보상은 0.117%, 295는 0.065%.
out.rewardAnomalyA37 = {
  screenPctOf294: 0.131,
  rangeRaw: [0.1305 / 100 * req(294), 0.1315 / 100 * req(294)].map(Math.round),
  reward294: stepRewardRawForLevel(294, 37), reward295: stepRewardRawForLevel(295, 37),
  reward295AsPctOf294: +(stepRewardRawForLevel(295, 37) / req(294) * 100).toFixed(5),
};
const j = live.missionPayout[0];
out.payout290 = { screenPrefix: `${j.prefixEok}억 ${j.prefixMan}만`, engineRaw: stepRewardRawForLevel(290, 34), engineEokMan: `${Math.floor(stepRewardRawForLevel(290, 34) / 1e8)}억 ${Math.floor(stepRewardRawForLevel(290, 34) % 1e8 / 1e4)}만` };

// 4. 299 보정 문턱: 지정 경험치 x% 에서 n단계 목표가 300을 넘기 시작하는 x.
const thr = (n, intervalPct) => 100 - n * intervalPct;
const live299 = out.intervals["299"]?.samples?.[0]?.screen;
const eng299 = stepRawForLevel(299) / req(299) * 100;
out.threshold299 = { officialSeptember30: "약 68%", officialOctober45: "약 52%", engine: { step30: +thr(30, eng299).toFixed(4), step45: +thr(45, eng299).toFixed(4) }, liveInterval: live299, live: live299 ? { step30: +thr(30, live299).toFixed(4), step45: +thr(45, live299).toFixed(4) } : null };

// 5. 280 표본 충돌: 단계 좌표 τ(위치)=∫dx/간격 은 30단계 후 정확히 30 늘어난다(레벨별 간격 고정 가정).
//    280·0% → 285·99.818%(방송) 와 280·11% → 286·3%(9/11 테섭) 가 둘 다 성립하면 τ 차이가 같아야 한다.
const tauGapStart = s280 => 0.11 * req(280) / s280;
const tauGapEnd = 0.00182 * req(285) / stepRawForLevel(285) + 0.03 * req(286) / stepRawForLevel(286);
out.conflict280 = {
  tauGapEndSteps: +tauGapEnd.toFixed(5),
  requiredStep280PctOfLevel: +(0.11 / tauGapEnd * 100).toFixed(3),
  slideStep280Pct: 28.055,
  engineStep280Pct: +(stepRawForLevel(280) / req(280) * 100).toFixed(3),
  conclusion: "두 표본이 모두 맞으려면 280 간격이 약 36%여야 하지만 슬라이드 1단계는 28.055%다. 285·286 간격은 본섭 실측값이므로 281~284 값과 무관하게 셋 중 하나 이상이 틀렸다.",
};
// 슬라이드 36단계(286·62.287%)를 거꾸로 이으면 30단계가 285·99.82% 근처인지(같은 방송 자료의 내부 정합성).
{
  const d286 = stepRawForLevel(286) / req(286) * 100;
  const p30in286 = 62.287 - 6 * d286; // 음수면 285로 넘어간다
  const over = -p30in286 / 100 * req(286); // 286 앞부분이 모자란 만큼
  // 286 간격 단계 중 일부가 285에 걸치면 285 간격으로 환산
  const frac = over / stepRawForLevel(286);
  const p30 = 100 - frac * stepRawForLevel(285) / req(285) * 100;
  out.conflict280.slideStep30Backtrack = { step36: "286·62.287", step30: `285·${p30.toFixed(3)}`, broadcastStep30: "285·99.818" };
}

// 5b. 슬라이드(280·0%) 맞춤: 280 배수는 1단계 28.055%에서, 281~284는 한 값으로 두고 30단계 285·99.818%에 맞춘다.
//     36·39·40·45단계와 280·11% 표본은 맞춤에 쓰지 않은 검사점이다.
{
  const run = (step, l, p, n) => { let cur = [l, p]; for (let i = 0; i < n; i += 1) cur = advance(cur[0], cur[1], step); return cur; };
  const m280 = 0.28055 * req(280) / mob(280);
  const mk = m => l => (l === 280 ? m280 * mob(l) : l >= 281 && l <= 284 ? m * mob(l) : stepRawForLevel(l));
  let lo = 2.5e6, hi = 3.0e6;
  for (let k = 0; k < 100; k += 1) { const mid = (lo + hi) / 2; const v = run(mk(mid), 280, 0, 30); if (coord(...v) > 285.99818) hi = mid; else lo = mid; }
  const m = (lo + hi) / 2, st = mk(m);
  const fmt = v => `${v[0]}·${v[1].toFixed(4)}`;
  const slide = { 1: "280·28.055", 30: "285·99.818", 36: "286·62.287", 39: "286·93.514", 40: "287·3.610", 45: "287·51.509" };
  out.slideFit280 = {
    m280: Math.round(m280), m281to284Uniform: Math.round(m), engineBelow285: Math.round(stepRawForLevel(281) / mob(281)),
    checkpoints: Object.entries(slide).map(([n, s]) => ({ stage: +n, slide: s, slideFit: fmt(run(st, 280, 0, +n)), engine: fmt(run(stepRawForLevel, 280, 0, +n)), usedForFit: n === "1" || n === "30" })),
    eunsul280_11: { posted: "286·3%", slideFit: fmt(run(st, 280, 11, 30)), engine: fmt(run(stepRawForLevel, 280, 11, 30)) },
    eunsulPrecisionNote: "같은 글의 260·0% → 283·23% 는 공식 1389 일러스트의 283·23.118% 를 소수점 아래 버린 값이다.",
  };
}

// 6. 보스: 정수 나눗셈과 시작일.
out.bosses = ["limbo-extreme", "baldrix-extreme"].map(id => {
  const e = PERSONAL_BOSS_TABLE.find(x => x.id === id);
  return { id, unitExp: e.unitExp, hex: "0x" + e.unitExp.toString(16), maxParty: e.maxParty, availableFrom: e.availableFrom, solo: bossRaw(id, 1), party2: bossRaw(id, 2), party3: bossRaw(id, 3), floorCheck3: Math.floor(1e4 * e.unitExp / 3) };
});
{
  const ctx = createMainContext();
  const x = defaultMainInput("2026-10-04");
  Object.assign(x, { start: "2026-10-22", end: "2026-10-22", level: 290, exp: 0 });
  Object.assign(x.routine, { runsPerDay: 0, grandis: false, extreme: false, epic: false, todayPending: false, sundayRuns: 0, weeklyPending: false, huntHoursPerWeek: 0 });
  x.plus.enabled = false; x.plusOctober.enabled = false; x.magnifiers.detectivePerDay = 0;
  x.personal.mission.stepsDone = 45; x.personal.flame.killsPerWeek = 0;
  x.personal.bosses = [{ id: "limbo-extreme", party: 1 }, { id: "baldrix-extreme", party: 1 }];
  const r1022 = simulateMain(x, ctx);
  x.start = x.end = "2026-10-23";
  const r1023 = simulateMain(x, ctx);
  out.bossStartDay = { official815: "익스트림 림보 10/23(금) 19시, 익스트림 발드릭스 10/23(금) 20시 이후 입장", engineAvailableFrom: PERSONAL_BOSS_TABLE.find(e => e.id === "limbo-extreme").availableFrom,
    simulate1022Only: { bossRaw: r1022.sourceRaw.boss || 0, clears: r1022.boss.clears }, simulate1023Only: { bossRaw: r1023.sourceRaw.boss || 0, clears: r1023.boss.clears } };
}

// 7. 31단계 이후 자동 지급 시점: 30단계 완료 + 이미 45단계 목표를 넘은 캐릭터.
{
  const ctx = createMainContext();
  const mk = date => {
    const x = defaultMainInput("2026-10-04");
    Object.assign(x, { start: date, end: date, level: 293, exp: 50 });
    Object.assign(x.routine, { runsPerDay: 0, grandis: false, extreme: false, epic: false, todayPending: false, sundayRuns: 0, weeklyPending: false, huntHoursPerWeek: 0 });
    x.plus.enabled = false; x.plusOctober.enabled = false; x.magnifiers.detectivePerDay = 0;
    x.personal.flame.killsPerWeek = 0; x.personal.bosses = [];
    x.personal.mission = { mode: "model", designLevel: 290, designExp: 6.3, stepsDone: 30 };
    return simulateMain(x, ctx);
  };
  const a = mk("2026-10-21"), b = mk("2026-10-22");
  const table = buildMissionTable({ mode: "model", designLevel: 290, designExp: 6.3, stepsDone: 30 }, ctx);
  out.autoClear = { input: "지정 290·6.3%, 30단계 완료, 현재 293·50%", step45Target: `${table.steps[44].level}·${table.steps[44].exp.toFixed(3)}`,
    on1021: { stepsCleared: a.mission.stepsCleared, rewardRaw: a.mission.rewardRaw }, on1022: { stepsCleared: b.mission.stepsCleared, rewardRaw: b.mission.rewardRaw, newly: b.mission.newlyCleared.length } };
}

// 8. 탐정 돋보기 본섭 1회(283레벨 5.523→6.707%). 사냥터 레벨을 모르므로 280~284 각각에서 필요한 처치 수를 본다.
{
  const m = live.detectiveMagnifier[0];
  const lo = (m.after - m.before - 0.001) / 100 * req(283), hi = (m.after - m.before + 0.001) / 100 * req(283);
  out.detective283 = { gainPctShown: +(m.after - m.before).toFixed(3), perField: [276, 277, 278, 279, 280, 281, 282, 283, 284, 285].map(f => {
    const per = 800 * mob(f);
    return { field: f, pctFor190: +(190 * per / req(283) * 100).toFixed(4), killsRange: [+(lo / per).toFixed(2), +(hi / per).toFixed(2)], integer190Fits: lo <= 190 * per && 190 * per <= hi };
  }) };
}

// 9. 돋보기 엔진 식: 288 캐릭터, 288 몬스터, 추가 경험치 300%.
{
  const ctx = createMainContext();
  out.magnifierFormula = {
    detectivePerUse288: 800 * 190 * mob(288), detectivePctOf288: +(800 * 190 * mob(288) / req(288) * 100).toFixed(5),
    ordinaryEngine288_bonus300: 10 * 190 * mob(288) * 4 * ctx.huntLevelFactor(0),
    ordinaryHaru1sojae288_bonus300: 10 * 190 * mob(288) * 4,
    levelFactorAtGap0: ctx.huntLevelFactor(0),
  };
}

// 10. 10월 PLUS 규칙과 815 대조.
{
  const cases = [
    ["9월 미참여", { enabled: false, tier: "prime" }],
    ["9월 무료", { enabled: true, tier: "free" }],
    ["9월 프리미엄만", { enabled: true, tier: "premium" }],
    ["9월 프라임까지", { enabled: true, tier: "prime" }],
  ];
  out.plusOctober = cases.map(([name, sept]) => ({ name, options: octoberPlusTierOptions(sept), linesIfPrime: octoberPlusRewardLines(sept, "prime"), linesIfPremium: octoberPlusRewardLines(sept, "premium") }));
  const period = { plusStart: MAIN_SCHEDULE.plusOctoberStart, plusLastUseDay: MAIN_SCHEDULE.plusOctoberLastUseDay };
  out.plusOctoberSchedule = plusLevelSchedule({ enabled: true, currentLevel: 0, levelPoints: 0, weeklyPoints: 2500, thisWeekRemaining: 2500 }, "2026-10-22", period);
  // 815 표 텍스트와 lib 표 대조
  const ctx = createMainContext();
  out.plusTableLib = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, free: ctx.plusReward(i + 1, "free"), premium: ctx.plusReward(i + 1, "premium"), prime: ctx.plusReward(i + 1, "prime") }));
}

console.log(JSON.stringify(out, null, 2));
