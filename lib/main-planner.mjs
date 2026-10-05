// 본섭 퍼스널 버닝 + 모멘텀 PLUS 시점 계산 엔진. 순수 함수만 둔다.
// 경험치 표는 ctx 로 받는다. 이 파일은 화면과 데이터 표를 모른다.
//
// 근거 정리 (모두 2026-10-03 기준)
// - 일정·제도: 공식 update-813 (9/24 08:55 수정본)
// - 성장 미션 단계 크기와 보상 비율: 본섭 287레벨·20.162% 사례(9/17 지정)와 9/11 테섭 표본 10개를 경험치 표로 환산한 분석
// - 플레임·교환권: 공식 교환 비율, 게시자 로그와 표 (본섭 실측 아님)
// 값이 불확실한 곳은 입력으로 받아 보정하게 했고, 기본값은 모두 입력으로 덮을 수 있다.

import { BOSS_COMMUNITY_PRESETS, BOSS_EXP_UNIT, DEFAULT_BOSS_PRESET_ID, MOB_BASE_EXP, PERSONAL_BOSS_TABLE, PERSONAL_COUPON_MULTIPLE, PERSONAL_FLAME_MULTIPLE, WEEKLY_BOSS_LIMIT } from "./personal-data.mjs";

export const MAIN_SCHEDULE = Object.freeze({
  personalStart: "2026-09-17",
  bossStart: "2026-09-24",
  plusStart: "2026-09-17",
  // PLUS 보상은 10/21 23:59 수령, 10/22 02:00 사용 마감이다. 일 단위 모형이라 계산에 포함하는 마지막 날을 10/21로 둔다(다음 날 00:00~02:00은 뺀다).
  plusLastUseDay: "2026-10-21",
  // 퍼스널 단계·코인샵은 11/18 23:59 종료, 보상 사용은 11/19 02:00까지다. 계산에 포함하는 마지막 날을 11/18로 둔다.
  personalEnd: "2026-11-18",
});

export const FLAME_WEEKLY_ADD = 24_000;
export const FLAME_STOCK_CAP = 36_000;
export const FLAME_POINTS_PER_KILL = 3;
export const COUPON_POINTS = 100;
export const MISSION_STEPS = 30;
export const COINS_PER_STEP = 1_000;
export const LEVEL_CAP = 296;

const TRILLION = 1e12;

// 퍼스널 EXP 교환권 1장 = 캐릭터 레벨의 몬스터 기본 경험치 × 480. 하루1소재 교환권 표와 레벨 260~299 전부 일치한다.
export const mobBaseExp = level => MOB_BASE_EXP[Math.max(260, Math.min(299, Math.floor(level)))];
export const couponRawForLevel = level => PERSONAL_COUPON_MULTIPLE * mobBaseExp(level);

// 성장 미션 단계 보상 = 그 레벨의 몬스터 기본 경험치 × 502,828.8.
// 본섭 286·287·288·289레벨 화면의 보상(2,066,779,207,004 / 2,093,653,887,402 / 2,120,693,506,122 / 2,144,810,694,332)을
// 몬스터 기본 경험치로 나누면 네 값이 모두 502,828.79~502,828.80으로 같다. 커뮤니티의 296레벨 계산(보상 0.300%)도 같은 배수다.
export const STEP_REWARD_MOB_MULTIPLE = 502_828.8;
export const stepRewardRawForLevel = level => STEP_REWARD_MOB_MULTIPLE * mobBaseExp(level);

// 한 레벨 안에서 단계 간격(경험치)은 일정하다. 간격도 몬스터 기본 경험치의 배수로 본다.
// 286~289는 본섭 화면 실측(간격 %가 두 캐릭터에서 같음). 그 밖은 표본에서 구한 구간별 배수다:
//  - 285: 9/11 표본 285·71.5% → 288·65.61%
//  - 280~284: 9/11 표본 280·11% → 286·3% 하나뿐이라 오차를 확인하지 못했다
//  - 290~294: 9/11 표본 3개(290·6.3%, 291·0%, 293·8.4% 시작)에서 구한 배수 3,063,939~3,072,090의 평균
//  - 295~: 커뮤니티 296레벨 계산의 간격 1.861%에서 구한 배수. 294·0% → 295·4.01% 표본과는 0.13%p 차이
const STEP_MEASURED = Object.freeze({
  286: 11.3940 * TRILLION,
  287: 11.5349 * TRILLION,
  288: 11.6764 * TRILLION,
  289: 11.8027 * TRILLION,
});
const STEP_MOB_MULTIPLE = Object.freeze({ below285: 2_730_206, at285: 2_779_473, from290: 3_068_366, from295: 3_119_741 });

export function stepRawForLevel(level) {
  const l = Math.floor(level);
  if (STEP_MEASURED[l]) return STEP_MEASURED[l];
  const multiple = l >= 295 ? STEP_MOB_MULTIPLE.from295 : l >= 290 ? STEP_MOB_MULTIPLE.from290 : l === 285 ? STEP_MOB_MULTIPLE.at285 : STEP_MOB_MULTIPLE.below285;
  return multiple * mobBaseExp(l);
}


// 퍼스널 플레임 1마리 경험치 = 사냥터 몬스터의 기본 경험치 × 72. 캐릭터 레벨이 아니라 몬스터 레벨 기준이다(공식 9/24 수정).
// 본섭 9/23 로그 3건(273·275·276레벨 몬스터 183,322,728 / 209,017,728 / 211,652,352)과 정확히 일치한다.
export const flameModelRaw = fieldLevel => PERSONAL_FLAME_MULTIPLE * mobBaseExp(fieldLevel);

// 퍼스널 보스 미션: 한 번 처치 경험치 = 표 값 × 10,000 ÷ 파티원 수. 레벨과 무관한 고정값이다(하루1소재).
const BOSS_BY_ID = new Map(PERSONAL_BOSS_TABLE.map(entry => [entry.id, entry]));
export const bossEntry = id => BOSS_BY_ID.get(id) || null;
export const bossRaw = (id, party = 1) => {
  const entry = BOSS_BY_ID.get(id);
  if (!entry) return 0;
  const members = Math.max(1, Math.min(entry.maxParty, Math.floor(Number(party) || 1)));
  return Math.floor(BOSS_EXP_UNIT * entry.unitExp / members);
};
export const bossLabel = id => { const entry = BOSS_BY_ID.get(id); return entry ? `${entry.boss} ${entry.difficulty}` : String(id); };

/**
 * 보스 구간 프리셋. 선택한 보스(난이도)까지 잡는다고 보고, 보스마다 그 경험치 이하에서 가장 센 난이도 하나만 골라
 * 경험치가 큰 순서로 최대 12개를 담는다(주간 보스 제한 12, 보스당 난이도 1개).
 * partyMode "solo" 는 1인, "max" 는 보스별 최대 파티원이다.
 */
export function bossPreset({ cutoffId, partyMode = "solo", limit = WEEKLY_BOSS_LIMIT }) {
  const cutoff = BOSS_BY_ID.get(cutoffId);
  if (!cutoff) return [];
  const best = new Map();
  PERSONAL_BOSS_TABLE.forEach(entry => {
    if (entry.unitExp > cutoff.unitExp) return;
    const current = best.get(entry.boss);
    if (!current || entry.unitExp > current.unitExp) best.set(entry.boss, entry);
  });
  return [...best.values()]
    .sort((a, b) => b.unitExp - a.unitExp)
    .slice(0, Math.max(0, Math.min(WEEKLY_BOSS_LIMIT, Math.floor(Number(limit)) || 0)))
    .map(entry => ({ id: entry.id, party: partyMode === "max" ? entry.maxParty : 1, doneThisWeek: false }));
}
/** 커뮤니티 구성(검밑솔·노세이칼 등)으로 채운다. partyMode 는 bossPreset 과 같다. */
export function bossCommunityPreset(presetId, partyMode = "solo") {
  const preset = BOSS_COMMUNITY_PRESETS.find(item => item.id === presetId);
  if (!preset) return [];
  return preset.ids.map(id => ({ id, party: partyMode === "max" ? BOSS_BY_ID.get(id).maxParty : 1, doneThisWeek: false }));
}
export const bossListWeeklyRaw = bosses => bosses.reduce((sum, boss) => sum + bossRaw(boss.id, boss.party), 0);

// 날짜는 KST 달력 날짜 문자열("YYYY-MM-DD")로만 다룬다.
const DAY_MS = 86_400_000;
export const parseDay = key => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
export const dayKey = ms => new Date(ms).toISOString().slice(0, 10);
export const addDay = (key, n) => dayKey(parseDay(key) + n * DAY_MS);
export const diffDays = (a, b) => Math.round((parseDay(a) - parseDay(b)) / DAY_MS);
export const weekday = key => new Date(parseDay(key)).getUTCDay();
export const isValidDay = key => typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(parseDay(key)) && dayKey(parseDay(key)) === key;

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(value) ? value : lo));
// 화면은 숫자 문자열을 넘길 수 있다. 숫자와 숫자 문자열만 받고 나머지는 기본값으로 돌린다.
const toNumber = (value, fallback) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  return fallback;
};
const num = (value, fallback, lo, hi) => Math.max(lo, Math.min(hi, toNumber(value, fallback)));
const whole = (value, fallback, lo, hi) => Math.floor(num(value, fallback, lo, hi));
const flag = (value, fallback) => (typeof value === "boolean" ? value : value == null ? fallback : Boolean(value));

// ── 성장 미션 단계표 ──────────────────────────────────────────────

// 한 칸(단계 1개)만큼 위치를 올린다. 레벨마다 한 칸의 크기가 달라서 "칸 단위"로 환산해 가며 넘는다.
function advanceOneStep(position, stepRaw, ctx) {
  let { level, xp } = position;
  let need = 1;
  let guard = 0;
  while (need > 1e-12 && level < ctx.levelCap && guard < 64) {
    guard += 1;
    const size = stepRaw(level);
    const available = (ctx.reqRaw(level) - xp) / size;
    if (need <= available) { xp += need * size; need = 0; } else { need -= available; level += 1; xp = 0; }
  }
  return { level, xp, capped: level >= ctx.levelCap };
}

const coordinate = (level, xp, ctx) => (level >= ctx.levelCap ? level : level + xp / ctx.reqRaw(level));

/**
 * 30단계 목표표를 만든다.
 * mode "screen": 미션 화면의 "다음 단계 목표"에서 시작해 이후 단계를 레벨별 단계 간격으로 잇는다. 본섭 두 캐릭터(286·287레벨 지정)의 30단계 목표를 0.01%p 안쪽으로 재현한다.
 * mode "model": 지정 당시 레벨·경험치에서 같은 간격으로 만든다. 285 이상 표본 6개를 0.007레벨 안쪽으로 재현하고, 285 미만은 표본 1개로만 맞췄다.
 * 보상은 레벨의 몬스터 기본 경험치 × 502,828.8이다. 입력한 보상 %가 이 값과 2% 넘게 다르면 입력값 쪽으로 이후 보상을 맞추고 알린다.
 * 반환 steps[i]: { index(1~30), level, exp(%), coordinate, rewardRaw, done }
 */
export function buildMissionTable(mission, ctx) {
  const stepsDone = whole(mission.stepsDone, 0, 0, MISSION_STEPS);
  const steps = [];
  const warnings = [];
  const markDone = () => { for (let i = 0; i < Math.min(stepsDone, steps.length); i += 1) steps[i].done = true; };
  let scale = 1;
  const rawStep = stepRawForLevel;

  if (mission.mode === "screen") {
    if (stepsDone >= MISSION_STEPS) return { steps: [], scale, warnings, stepsDone };
    const targetLevel = whole(mission.nextTarget?.level, 288, 280, ctx.levelCap - 1);
    const targetPct = num(mission.nextTarget?.exp, 0, 0, 99.999);
    const rewardPct = num(mission.nextRewardPct, 0, 0, 100);
    const firstReward = ctx.reqRaw(targetLevel) * rewardPct / 100;
    if (firstReward > 0) {
      // 화면의 보상 %는 소수 셋째 자리까지라 0.1% 안쪽의 차이는 반올림이다. 2% 넘게 다를 때만 입력값을 따른다.
      const ratio = firstReward / stepRewardRawForLevel(targetLevel);
      if (Math.abs(ratio - 1) > 0.02) { scale = ratio; warnings.push(`입력한 단계 보상이 표(${(stepRewardRawForLevel(targetLevel) / ctx.reqRaw(targetLevel) * 100).toFixed(3)}%)와 달라 이후 단계 보상을 입력값 비율로 맞췄습니다. 목표 위치는 표의 간격을 그대로 씁니다.`); }
    }
    let position = { level: targetLevel, xp: ctx.reqRaw(targetLevel) * targetPct / 100 };
    for (let index = stepsDone + 1; index <= MISSION_STEPS; index += 1) {
      if (index > stepsDone + 1) position = advanceOneStep(position, rawStep, ctx);
      if (position.capped) { warnings.push(`${index}단계부터 목표가 ${ctx.levelCap}레벨을 넘어 계산하지 않습니다.`); break; }
      steps.push({
        index, level: position.level, exp: position.xp / ctx.reqRaw(position.level) * 100,
        coordinate: coordinate(position.level, position.xp, ctx),
        rewardRaw: (index === stepsDone + 1 && firstReward > 0) ? firstReward : stepRewardRawForLevel(position.level) * scale,
        done: false,
      });
    }
    return { steps, scale, warnings, stepsDone };
  }

  const designLevel = whole(mission.designLevel, 287, 280, ctx.levelCap - 1);
  const designExp = num(mission.designExp, 0, 0, 99.999);
  if (designLevel < 285) warnings.push("285 미만은 단계 크기 모형을 표본 1개로만 맞췄습니다. 미션 화면의 값을 입력하는 편이 정확합니다.");
  let position = { level: designLevel, xp: ctx.reqRaw(designLevel) * designExp / 100 };
  for (let index = 1; index <= MISSION_STEPS; index += 1) {
    position = advanceOneStep(position, rawStep, ctx);
    if (position.capped) { warnings.push(`${index}단계부터 목표가 ${ctx.levelCap}레벨을 넘어 계산하지 않습니다.`); break; }
    steps.push({
      index, level: position.level, exp: position.xp / ctx.reqRaw(position.level) * 100,
      coordinate: coordinate(position.level, position.xp, ctx),
      rewardRaw: stepRewardRawForLevel(position.level),
      done: false,
    });
  }
  markDone();
  return { steps, scale, warnings, stepsDone };
}

// ── PLUS ────────────────────────────────────────────────────────

const PLUS_WEEKLY_POINTS = 2_500;
const PLUS_POINTS_PER_LEVEL = 750;
const PLUS_MAX_LEVEL = 10;
export const plusUnlockedLevel = weeksElapsed => (weeksElapsed < 0 ? 0
  : Math.min(PLUS_MAX_LEVEL, Math.floor(PLUS_WEEKLY_POINTS * (weeksElapsed + 1) / PLUS_POINTS_PER_LEVEL)));

// ── 입력 정리 ───────────────────────────────────────────────────

export function defaultMainInput(start) {
  return {
    start,
    level: 288,
    exp: 45,
    routine: { runsPerDay: 2, argoMonsterPark: 50, argoGrandis: 10, epicBonus: 0, huntHoursPerWeek: 4, huntBonusPct: 300, grandis: true, extreme: true, epic: true, epicMult: 5, specialSundays: 0, todayPending: true, weeklyPending: false, measuredPercentPerDay: 0, weeklyMeasuredPercent: 0 },
    personal: {
      enabled: true,
      designated: true,
      designDate: start,
      mission: {
        mode: "screen", stepsDone: 13, nextTarget: { level: 288, exp: 49.948 }, nextRewardPct: 1.601,
        designLevel: 287, designExp: 20.162,
      },
      flame: { stock: 24_000, expPerKill: 0, killsPerWeek: 24_000, alloc: { shard: 0, exp: 3, erda: 0 }, couponsOwned: 0, fieldLevel: 0, fieldKey: "" },
      bosses: bossCommunityPreset(DEFAULT_BOSS_PRESET_ID, "solo"),
      couponPolicy: "end",
    },
    // 기본은 프라임 구매 + 몰아쓰기: 열린 보상은 아직 쓰지 않고 모아 둔 것으로 본다(수령 0 = 기준일에 전부 보유).
    // 시작 주차가 아니어도 같다. 이미 써 버렸다면 수령 레벨을 올리거나 보유 아이템을 직접 넣는다.
    plus: { enabled: true, tier: "prime", claimedLevel: 0 },
    items: { crimson: 0, mech: 0, blue: 0, sauna: 0, adv: 0, potion279: 0 },
    crimsonHold: 0,
  };
}

/**
 * 입력을 계산에 쓸 수 있는 모양으로 바로잡는다. 숫자 문자열은 숫자로, 범위 밖은 끝값으로, 깨진 값은 기본값으로 돌리고
 * 바로잡은 내용 중 사용자가 알아야 할 것은 inputWarnings 에 남긴다. 엔진은 시계를 모르므로 날짜가 깨지면 이벤트 시작일을 쓴다.
 */
export function normalizeInput(raw, ctx) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = defaultMainInput(MAIN_SCHEDULE.personalStart);
  // 다른 함수가 정규화한 입력을 다시 넘겨도 앞서 만든 경고가 이어진다.
  const inputWarnings = Array.isArray(r.inputWarnings) ? r.inputWarnings.filter(text => typeof text === "string") : [];
  const start = isValidDay(r.start) ? r.start : MAIN_SCHEDULE.personalStart;
  if (r.start != null && !isValidDay(r.start) && !inputWarnings.some(text => text.startsWith("기준일이"))) inputWarnings.push("기준일이 올바른 날짜가 아니라 이벤트 시작일(9/17)로 계산했습니다.");
  const end = isValidDay(r.end) ? r.end : MAIN_SCHEDULE.personalEnd;

  const levelRaw = toNumber(r.level, d.level);
  const level = whole(r.level, d.level, 280, ctx.levelCap - 1);
  const levelWarning = `레벨은 280~${ctx.levelCap - 1}만 계산합니다. ${level}레벨로 계산했습니다.`;
  if (r.level != null && Math.floor(levelRaw) !== level && !inputWarnings.includes(levelWarning)) inputWarnings.push(levelWarning);

  const rt = r.routine || {};
  const routine = {
    runsPerDay: whole(rt.runsPerDay, d.routine.runsPerDay, 0, 7),
    grandis: flag(rt.grandis, d.routine.grandis), extreme: flag(rt.extreme, d.routine.extreme), epic: flag(rt.epic, d.routine.epic),
    epicMult: num(rt.epicMult, d.routine.epicMult, 0, 20),
    specialSundays: whole(rt.specialSundays, d.routine.specialSundays, 0, 12),
    // 아르고호의 가호(전술 마법) 몬스터파크·그란디스 일퀘 경험치 증가 %. 최대 +50%.
    argoMonsterPark: num(rt.argoMonsterPark, d.routine.argoMonsterPark, 0, 50),
    argoGrandis: num(rt.argoGrandis, d.routine.argoGrandis, 0, 50),
    // 에픽 던전 추가 경험치 %(하루1소재의 에픽 던전 「보약」). 사냥은 주간 시간과 추가 경험치 합계 %.
    epicBonus: num(rt.epicBonus, d.routine.epicBonus, 0, 200),
    huntHoursPerWeek: num(rt.huntHoursPerWeek, d.routine.huntHoursPerWeek, 0, 168),
    huntBonusPct: num(rt.huntBonusPct, d.routine.huntBonusPct, 0, 3000),
    todayPending: flag(rt.todayPending, d.routine.todayPending), weeklyPending: flag(rt.weeklyPending, d.routine.weeklyPending),
    measuredPercentPerDay: num(rt.measuredPercentPerDay, 0, 0, 1000),
    weeklyMeasuredPercent: num(rt.weeklyMeasuredPercent, 0, 0, 1000),
  };

  const pl = r.plus || {};
  const plus = {
    enabled: flag(pl.enabled, d.plus.enabled),
    tier: PLUS_TIERS.includes(pl.tier) ? pl.tier : "free",
    claimedLevel: whole(pl.claimedLevel, d.plus.claimedLevel, 0, PLUS_MAX_LEVEL),
  };

  const it = r.items || {};
  const items = {
    crimson: whole(it.crimson, 0, 0, 1e9), mech: whole(it.mech, 0, 0, 1e9), blue: whole(it.blue, 0, 0, 1e9),
    sauna: num(it.sauna, 0, 0, 1e9), adv: whole(it.adv, 0, 0, 1e9), potion279: whole(it.potion279, 0, 0, 1e9),
  };

  const ps = r.personal || {};
  const ms = ps.mission || {};
  const fl = ps.flame || {};
  const al = fl.alloc || {};
  const mission = {
    mode: ms.mode === "model" ? "model" : "screen",
    stepsDone: whole(ms.stepsDone, d.personal.mission.stepsDone, 0, MISSION_STEPS),
    nextTarget: { level: whole(ms.nextTarget?.level, d.personal.mission.nextTarget.level, 280, ctx.levelCap - 1), exp: num(ms.nextTarget?.exp, d.personal.mission.nextTarget.exp, 0, 99.999) },
    nextRewardPct: num(ms.nextRewardPct, d.personal.mission.nextRewardPct, 0, 100),
    designLevel: whole(ms.designLevel, d.personal.mission.designLevel, 280, ctx.levelCap - 1),
    designExp: num(ms.designExp, d.personal.mission.designExp, 0, 99.999),
  };
  const flame = {
    stock: Math.floor(num(fl.stock, d.personal.flame.stock, 0, FLAME_STOCK_CAP)),
    expPerKill: num(fl.expPerKill, 0, 0, 1e13),
    killsPerWeek: num(fl.killsPerWeek, d.personal.flame.killsPerWeek, 0, 1e6),
    alloc: { shard: num(al.shard, 0, 0, 99), exp: num(al.exp, d.personal.flame.alloc.exp, 0, 99), erda: num(al.erda, 0, 0, 99) },
    couponsOwned: whole(fl.couponsOwned, 0, 0, 1e9),
    fieldLevel: whole(fl.fieldLevel, 0, 0, 299),
    fieldKey: typeof fl.fieldKey === "string" ? fl.fieldKey : "",
  };
  const bosses = normalizeBosses(ps.bosses, inputWarnings);

  return {
    start, end, level,
    exp: num(r.exp, d.exp, 0, 99.999),
    routine, plus, items,
    personal: {
      enabled: flag(ps.enabled, d.personal.enabled),
      designated: flag(ps.designated, d.personal.designated),
      designDate: isValidDay(ps.designDate) ? ps.designDate : start,
      mission, flame, bosses,
      couponPolicy: ps.couponPolicy === "now" ? "now" : "end",
    },
    crimsonHold: num(r.crimsonHold, 0, 0, 999),
    inputWarnings,
  };
}

// 알려진 보스만 받고, 같은 보스는 먼저 적은 난이도 하나만 두고, 12개를 넘으면 앞의 12개만 쓴다.
function normalizeBosses(list, warnings) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  let dropped = 0;
  list.forEach(item => {
    const entry = item && typeof item === "object" ? BOSS_BY_ID.get(item.id) : null;
    if (!entry || seen.has(entry.boss)) { dropped += 1; return; }
    seen.add(entry.boss);
    out.push({ id: entry.id, party: whole(item.party, 1, 1, entry.maxParty), doneThisWeek: flag(item.doneThisWeek, false) });
  });
  if (dropped) warnings.push(`알 수 없거나 같은 보스가 겹친 보스 ${dropped}개를 뺐습니다. 보스는 난이도 하나씩만 셉니다.`);
  if (out.length > WEEKLY_BOSS_LIMIT) { warnings.push(`주간 보스는 ${WEEKLY_BOSS_LIMIT}개까지라 앞의 ${WEEKLY_BOSS_LIMIT}개만 계산합니다.`); out.length = WEEKLY_BOSS_LIMIT; }
  return out;
}

// ── 시뮬레이션 ──────────────────────────────────────────────────

/**
 * ctx
 *   reqRaw(level): 해당 레벨의 필요 경험치(실제 경험치 수치)
 *   levelCap: 이 레벨에 닿으면 멈춘다 (296)
 *   routineRaw({ level, runs, sundayKind, grandis, monsterParkBonusPct }) -> { monsterPark, grandis }
 *   huntRaw({ level, fieldLevel }): (선택) 사냥 30분의 순수 경험치. 없으면 사냥·부스터·4배 쿠폰을 계산하지 않는다
 *   boosterRaw(fieldLevel), huntKillsPer30Min, boosterKills: (선택) VIP 부스터 계산용
 *   weeklyRaw({ level, epicMult }) -> { extreme, epic }
 *   itemRaw(type, level): 아이템 1개(사우나는 1시간)의 경험치
 *   plusReward(level, tier) -> { crimson, adv, sauna, coupon4x, booster }
 *   flameModelRaw(level): (선택) 플레임 1마리 경험치 모형. 없으면 이 파일의 기본 모형을 쓴다
 */
export function simulateMain(rawInput, ctx) {
  const o = normalizeInput(rawInput, ctx);
  const start = o.start;
  const end = o.end;
  const days = Math.max(0, diffDays(end, start) + 1);
  const levelCap = ctx.levelCap;
  const personal = o.personal;
  const warnings = [...new Set([...(Array.isArray(rawInput?.inputWarnings) ? rawInput.inputWarnings : []), ...o.inputWarnings])];

  let level = o.level;
  let xp = ctx.reqRaw(level) * o.exp / 100;
  const position = () => (level >= levelCap ? levelCap : level + xp / ctx.reqRaw(level));
  const startPosition = position();

  const sourceRaw = {};
  const addSource = (id, raw) => { sourceRaw[id] = (sourceRaw[id] || 0) + raw; };

  // 미션 상태
  let table = null;
  let nextStepIndex = 0;
  // 지정 예정이면 아직 통과한 단계가 없다. 이미 지정했으면 입력한 단계 수에서 시작한다.
  let stepsCleared = personal.designated && personal.mission.stepsDone ? Math.min(MISSION_STEPS, Math.floor(personal.mission.stepsDone)) : 0;
  const stepsAtStart = stepsCleared;
  let missionActive = false;
  const clearedSteps = [];
  let missionRewardRaw = 0;
  let coinsEarned = 0;
  let currentDay = start;
  // 성장 미션 단계·코인은 공식 종료일(11/18 23:59)까지만 지급한다. 계산 종료일을 늘려도 이어지지 않는다.
  const missionOpen = () => missionActive && diffDays(currentDay, MAIN_SCHEDULE.personalEnd) <= 0;

  const buildTableFor = (mission, designDay) => {
    const built = buildMissionTable(mission, ctx);
    warnings.push(...built.warnings.map(w => (designDay ? `${designDay} 지정: ${w}` : w)));
    table = built;
    nextStepIndex = 0;
    // 이미 끝낸 단계와, 현재 위치가 이미 넘은 단계는 건너뛴다. 게임은 목표를 넘는 순간 자동 지급하므로
    // 넘었는데 남아 있다는 것은 모형 오차다.
    while (nextStepIndex < table.steps.length && (table.steps[nextStepIndex].done || table.steps[nextStepIndex].coordinate <= position() + 1e-9)) {
      if (!table.steps[nextStepIndex].done && table.steps[nextStepIndex].index > stepsAtStart && personal.designated) {
        warnings.push(`${table.steps[nextStepIndex].index}단계 목표가 현재 위치보다 낮아 이미 통과한 것으로 봅니다. 입력한 통과 단계 수와 단계표가 어긋납니다.`);
      }
      nextStepIndex += 1;
    }
  };

  // 경험치 적용. 레벨 상한(296)이면 남는 경험치는 버린다.
  const applyRawCore = initial => {
    let raw = initial;
    let applied = 0;
    let guard = 0;
    while (raw > 1e-6 && level < levelCap && guard < 32) {
      guard += 1;
      const remaining = ctx.reqRaw(level) - xp;
      if (raw + 1e-6 < remaining) { xp += raw; applied += raw; raw = 0; } else { applied += remaining; raw -= remaining; level += 1; xp = 0; }
    }
    return applied;
  };
  const checkSteps = date => {
    if (!table) return;
    let guard = 0;
    while (missionOpen() && nextStepIndex < table.steps.length && guard < MISSION_STEPS + 2) {
      guard += 1;
      const step = table.steps[nextStepIndex];
      if (position() + 1e-12 < step.coordinate) break;
      const applied = applyRawCore(step.rewardRaw);
      missionRewardRaw += applied;
      addSource("missionReward", applied);
      coinsEarned += COINS_PER_STEP;
      stepsCleared = Math.max(stepsCleared, step.index);
      clearedSteps.push({ index: step.index, date, level: step.level, exp: step.exp });
      events.push(`${step.index}단계 통과 (+${(step.rewardRaw / TRILLION).toFixed(2)}조)`);
      nextStepIndex += 1;
    }
  };
  let events = [];
  const apply = (raw, source, date) => {
    if (!(raw > 0) || level >= levelCap) return 0;
    const applied = applyRawCore(raw);
    addSource(source, applied);
    checkSteps(date);
    return applied;
  };

  // 지금 위치에서 다음 미션 목표까지 남은 경험치. 열려 있는 미션이 없으면 Infinity.
  const rawToNextTarget = () => {
    if (!table || !missionOpen() || nextStepIndex >= table.steps.length) return Infinity;
    const step = table.steps[nextStepIndex];
    if (step.level < level) return 0;
    let raw = step.level === level ? ctx.reqRaw(level) * step.exp / 100 - xp : ctx.reqRaw(level) - xp;
    for (let l = level + 1; l < step.level; l += 1) raw += ctx.reqRaw(l);
    if (step.level > level) raw += ctx.reqRaw(step.level) * step.exp / 100;
    return Math.max(0, raw);
  };

  // 아이템 사용. 단위 경험치가 레벨마다 달라서 레벨이 바뀌면 다시 계산한다.
  // 한 번에 쓰는 묶음은 레벨업 직전과 다음 미션 목표 직전에서 끊는다. 목표를 넘으면 보상이 바로 들어와
  // 레벨이 오를 수 있고, 그 뒤 아이템은 새 레벨 값으로 써야 한다.
  const consumeItems = (type, count, source, date) => {
    let remaining = type === "sauna" ? Math.max(0, count) : Math.floor(Math.max(0, count));
    let used = 0;
    let guard = 0;
    while (remaining > 1e-9 && level < levelCap && guard < 4096) {
      guard += 1;
      const unit = ctx.itemRaw(type, level);
      if (!(unit > 0)) break;
      const needed = ctx.reqRaw(level) - xp;
      const toTarget = rawToNextTarget();
      const stop = Math.min(needed, Number.isFinite(toTarget) ? Math.max(toTarget, 1e-6) : Infinity);
      const batch = type === "sauna"
        ? Math.min(remaining, stop / unit + 1e-9)
        : Math.min(remaining, Math.max(1, Math.ceil(stop / unit - 1e-9)));
      apply(unit * batch, source, date);
      remaining -= batch;
      used += batch;
    }
    return used;
  };

  // 인벤토리: PLUS 기원 아이템은 10/21까지만 쓸 수 있다.
  const inv = { crimson: Math.max(0, o.items.crimson), mech: Math.max(0, o.items.mech), blue: Math.max(0, o.items.blue), sauna: Math.max(0, o.items.sauna), adv: Math.max(0, o.items.adv), potion279: Math.max(0, o.items.potion279), coupon4x: 0, booster: 0 };
  const plusTypes = new Set(["crimson", "adv", "sauna"]);
  const expired = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0, booster: 0 };
  let crimsonUsed = 0;
  let plusItemsReceived = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0, booster: 0 };
  const huntItemsUsed = { coupon4x: 0, booster: 0 };

  // PLUS 아이템은 10/22 02:00에 사라진다. 그 뒤 날짜로 계산하면 보유분도 이미 없다.
  if (diffDays(start, MAIN_SCHEDULE.plusLastUseDay) > 0) { inv.crimson = 0; inv.adv = 0; inv.sauna = 0; }

  // PLUS 수령 일정
  const plusBatches = new Map();
  if (o.plus.enabled && diffDays(MAIN_SCHEDULE.plusLastUseDay, start) >= 0) {
    let claimed = Math.floor(clamp(o.plus.claimedLevel, 0, PLUS_MAX_LEVEL));
    const scheduleClaim = (date, unlocked) => {
      if (unlocked <= claimed) return;
      const batch = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0, booster: 0 };
      for (let l = claimed + 1; l <= unlocked; l += 1) {
        const reward = ctx.plusReward(l, o.plus.tier);
        batch.crimson += reward.crimson || 0; batch.adv += reward.adv || 0; batch.sauna += reward.sauna || 0;
        batch.coupon4x += reward.coupon4x || 0; batch.booster += reward.booster || 0;
      }
      plusBatches.set(date, batch);
      claimed = unlocked;
    };
    scheduleClaim(start, plusUnlockedLevel(Math.floor(diffDays(start, MAIN_SCHEDULE.plusStart) / 7)));
    for (let d = start; diffDays(d, MAIN_SCHEDULE.plusLastUseDay) <= 0; d = addDay(d, 1)) {
      if (d !== start && weekday(d) === 4) scheduleClaim(d, plusUnlockedLevel(Math.floor(diffDays(d, MAIN_SCHEDULE.plusStart) / 7)));
    }
  }

  // 플레임·교환권·보스 상태
  const flame = personal.flame;
  let flameStock = Math.max(0, Math.min(FLAME_STOCK_CAP, flame.stock));
  let flameKilled = 0;
  let flameOverflow = 0;
  const alloc = flame.alloc;
  // 포인트 3개를 모두 나눠 써야 플레임이 소환된다(공식). 합이 3이 아니면 사냥을 계산하지 않는다.
  const flameSummonable = Number.isInteger(alloc.shard) && Number.isInteger(alloc.exp) && Number.isInteger(alloc.erda) && alloc.shard + alloc.exp + alloc.erda === 3;
  if (personal.enabled && !flameSummonable) warnings.push("커스텀 포인트가 정수 3개로 나뉘어 있지 않아(합계가 3이 아니거나 소수) 플레임이 소환되지 않습니다. 플레임 사냥과 교환권은 계산에서 뺐습니다. 조각·EXP·솔 에르다에 정확히 3개를 나눠 주세요.");
  let expPoints = 0;
  let coupons = Math.max(0, Math.floor(flame.couponsOwned));
  let couponsMade = 0;
  let couponsExpiredByDeadline = 0;
  let couponsUsed = 0;
  const couponRawAt = lv => couponRawForLevel(lv);
  const bossState = personal.bosses.map(b => ({ ...b, name: bossLabel(b.id), raw: bossRaw(b.id, b.party), done: Boolean(b.doneThisWeek) }));
  let bossClears = 0;
  const weeks = [];
  let week = null;
  const openWeek = date => { week = { start: date, kills: 0, overflow: 0, bosses: 0, couponsUsed: 0, stockEnd: flameStock, levelEnd: level, expEnd: 0, steps: stepsCleared }; weeks.push(week); };

  // 사냥터는 정해져 있으므로 모형값은 시작 레벨(또는 입력한 사냥터 몬스터 레벨) 기준으로 고정한다.
  const flameFieldLevel = flame.fieldLevel > 0 ? flame.fieldLevel : o.level;
  const flameRawPerKill = () => (flame.expPerKill > 0 ? flame.expPerKill : (ctx.flameModelRaw || flameModelRaw)(flameFieldLevel));
  const consumeCoupons = (date, count) => {
    let remaining = Math.max(0, Math.floor(count));
    let used = 0;
    let guard = 0;
    while (remaining > 0 && level < levelCap && guard < 4096) {
      guard += 1;
      const unit = couponRawAt(level);
      if (!(unit > 0)) break;
      const needed = ctx.reqRaw(level) - xp;
      const toTarget = rawToNextTarget();
      const stop = Math.min(needed, Number.isFinite(toTarget) ? Math.max(toTarget, 1e-6) : Infinity);
      const n = Math.min(remaining, Math.max(1, Math.ceil(stop / unit - 1e-9)));
      apply(unit * n, "coupon", date);
      remaining -= n; used += n;
    }
    couponsUsed += used; coupons -= used;
    if (week) week.couponsUsed += used;
    return used;
  };

  // 설계 시점 이전에는 퍼스널 원천이 없다.
  const designDay = personal.designated ? start : personal.designDate;
  let personalOn = false;
  let personalBlocked = false;
  let personalEverOn = false;
  let flameJustStarted = false;
  // 교환권을 마감 직전에 쓰는 날: 계산 종료일과 공식 종료일(11/18) 중 빠른 날. 그 날이 지나면 남은 교환권은 소멸한다.
  const couponDeadline = diffDays(end, MAIN_SCHEDULE.personalEnd) > 0 ? MAIN_SCHEDULE.personalEnd : end;

  const rows = [];
  let weeklyPendingUsed = false;
  let sundaysSeen = 0;
  let todayPendingUsed = false;
  const crimsonHoldLevel = o.crimsonHold > 0 ? o.crimsonHold : 0;
  const releaseCrimson = date => {
    if (inv.crimson <= 0) return;
    const deadline = diffDays(date, MAIN_SCHEDULE.plusLastUseDay) >= 0;
    if (!(level >= crimsonHoldLevel || deadline || date === end)) return;
    const used = consumeItems("crimson", inv.crimson, "crimson", date);
    if (used > 0) { inv.crimson -= used; crimsonUsed += used; events.push(`크림슨 ${used}장 사용`); }
  };

  for (let d = 0; d < days; d += 1) {
    const date = addDay(start, d);
    currentDay = date;
    events = [];
    const thursday = weekday(date) === 4;
    if (d === 0 || thursday) openWeek(date);

    // 퍼스널은 공식 종료일(11/18)까지만 돈다. 그 뒤에는 플레임·보스·미션·교환권이 모두 멈춘다.
    const personalPast = diffDays(date, MAIN_SCHEDULE.personalEnd) > 0;
    if (personalPast && personalOn) { personalOn = false; missionActive = false; }

    // 퍼스널 활성화 (이미 지정이면 첫날부터, 지정 예정이면 그날 단계표를 만든다)
    if (personal.enabled && !personalOn && !personalBlocked && !personalPast && diffDays(date, designDay) >= 0 && diffDays(date, MAIN_SCHEDULE.personalStart) >= 0) {
      if (level >= levelCap) {
        // 상한(296)에서는 필요 경험치 표가 없어 지정 당시 상태를 만들 수 없다.
        personalBlocked = true;
        warnings.push("296레벨에 닿은 뒤라 퍼스널 지정과 성장 미션을 계산하지 않습니다.");
      } else {
        personalOn = true;
        personalEverOn = true;
        missionActive = true;
        if (personal.designated) buildTableFor(personal.mission, "");
        else buildTableFor({ mode: "model", designLevel: level, designExp: xp / ctx.reqRaw(level) * 100, stepsDone: 0 }, date);
        flameJustStarted = !personal.designated;
        if (flameJustStarted) flameStock = Math.max(0, Math.min(FLAME_STOCK_CAP, flame.stock));
        events.push(personal.designated ? "퍼스널 진행 중" : "퍼스널 지정");
      }
    }

    // 목요일 0시: 플레임 추가, 보스 초기화
    if (thursday && d > 0) {
      if (personalOn && !flameJustStarted) {
        const room = FLAME_STOCK_CAP - flameStock;
        const added = Math.min(FLAME_WEEKLY_ADD, Math.max(0, room));
        flameOverflow += FLAME_WEEKLY_ADD - added;
        if (week) week.overflow += FLAME_WEEKLY_ADD - added;
        flameStock += added;
      }
      bossState.forEach(b => { b.done = false; });
    }
    flameJustStarted = false;

    // PLUS 수령과 즉시 사용 아이템
    const batch = plusBatches.get(date);
    if (batch) {
      inv.crimson += batch.crimson; inv.adv += batch.adv; inv.sauna += batch.sauna; inv.coupon4x += batch.coupon4x; inv.booster += batch.booster;
      plusItemsReceived = { crimson: plusItemsReceived.crimson + batch.crimson, adv: plusItemsReceived.adv + batch.adv, sauna: plusItemsReceived.sauna + batch.sauna, coupon4x: plusItemsReceived.coupon4x + batch.coupon4x, booster: plusItemsReceived.booster + batch.booster };
      events.push("PLUS 보상 수령");
    }
    const plusOpen = diffDays(date, MAIN_SCHEDULE.plusLastUseDay) <= 0;
    if (inv.adv > 0 && (plusOpen || !plusTypes.has("adv"))) { const used = consumeItems("adv", inv.adv, "adv", date); inv.adv -= used; if (used) events.push(`상급 EXP ${used.toLocaleString("en-US")}장`); }
    if (inv.sauna > 0 && plusOpen) { const used = consumeItems("sauna", inv.sauna, "sauna", date); inv.sauna -= used; if (used > 0.0001) events.push(`사우나 ${used.toFixed(1)}시간`); }
    if (inv.blue > 0) { const used = consumeItems("blue", inv.blue, "blue", date); inv.blue -= used; if (used) events.push(`블루베리 ${used}장`); }
    if (inv.mech > 0) { const used = consumeItems("mech", inv.mech, "mech", date); inv.mech -= used; if (used) events.push(`메카베리 ${used}장`); }
    if (inv.potion279 > 0) { const used = consumeItems("potion279", inv.potion279, "potion", date); inv.potion279 -= used; if (used) events.push(`성장의 비약 ${used}개`); }

    // 주간 컨텐츠 (목요일, 또는 시작일에 이번 주 분이 남았을 때)
    const weeklyDue = (thursday && d > 0) || (d === 0 && o.routine.weeklyPending && !weeklyPendingUsed);
    if (weeklyDue && level < levelCap) {
      weeklyPendingUsed = true;
      const names = [];
      if (o.routine.weeklyMeasuredPercent > 0) {
        apply(ctx.reqRaw(o.level) * o.routine.weeklyMeasuredPercent / 100, "weekly", date);
        names.push("주간 컨텐츠(직접 입력)");
      } else {
        const wk = ctx.weeklyRaw({ level, epicMult: o.routine.epicMult });
        // 익스트림 몬스터파크에도 몬스터파크 추가 경험치가 붙는다(메이플로드 계산기, 커뮤니티 계산과 일치).
        if (o.routine.extreme) { apply(wk.extreme * (1 + o.routine.argoMonsterPark / 100), "extreme", date); names.push("익몬"); }
        if (o.routine.epic) { apply(wk.epic * (1 + o.routine.epicBonus / 100), "epic", date); names.push("에픽 던전"); }
      }
      if (names.length) events.push(names.join(" · "));
    }

    // 일과
    const dailyDue = d > 0 || (o.routine.todayPending && !todayPendingUsed);
    if (dailyDue && level < levelCap) {
      todayPendingUsed = true;
      if (o.routine.measuredPercentPerDay > 0) {
        apply(ctx.reqRaw(o.level) * o.routine.measuredPercentPerDay / 100, "routine", date);
      } else {
        const sunday = weekday(date) === 0;
        const sundayKind = sunday ? (sundaysSeen < o.routine.specialSundays ? "special" : "normal") : "none";
        if (sunday) sundaysSeen += 1;
        const r = ctx.routineRaw({ level, runs: clamp(o.routine.runsPerDay, 0, 7), sundayKind, grandis: o.routine.grandis, monsterParkBonusPct: o.routine.argoMonsterPark });
        apply(r.monsterPark, "monsterPark", date);
        apply(r.grandis * (1 + o.routine.argoGrandis / 100), "grandis", date);
      }
    }

    // 사냥: 주간 시간을 하루에 고르게 나눈다(시작일은 일과와 같이 「오늘 일과 남음」일 때만). 30분 한 번 = ctx.huntRaw. 추가 경험치 합계 %는 순수 경험치에 곱한다.
    // PLUS의 4배 쿠폰(30분, 순수 경험치의 3배가 더 붙음)과 VIP 부스터(1,710마리)는 사냥하는 동안에만 쓸 수 있다.
    if (dailyDue && ctx.huntRaw && o.routine.huntHoursPerWeek > 0 && level < levelCap) {
      const sessions = o.routine.huntHoursPerWeek * 2 / 7;
      const huntFieldLevel = flame.fieldLevel > 0 ? flame.fieldLevel : o.level;
      const perSession = ctx.huntRaw({ level, fieldLevel: huntFieldLevel });
      if (perSession > 0) {
        apply(perSession * sessions * (1 + o.routine.huntBonusPct / 100), "hunt", date);
        if (diffDays(date, MAIN_SCHEDULE.plusLastUseDay) <= 0) {
          const couponsNow = Math.min(inv.coupon4x, sessions);
          if (couponsNow > 0) { inv.coupon4x -= couponsNow; huntItemsUsed.coupon4x += couponsNow; apply(3 * perSession * couponsNow, "coupon4x", date); }
          const boosterRoom = ctx.boosterRaw && ctx.boosterKills > 0 ? sessions * (ctx.huntKillsPer30Min || 0) / ctx.boosterKills : 0;
          const boostersNow = Math.min(inv.booster, boosterRoom);
          if (boostersNow > 0) { inv.booster -= boostersNow; huntItemsUsed.booster += boostersNow; apply(ctx.boosterRaw(huntFieldLevel) * boostersNow, "booster", date); }
        }
      }
    }

    // 퍼스널 플레임 사냥 → 경험치, 포인트
    if (personalOn && flameSummonable && level < levelCap && flameStock > 0) {
      const perDay = Math.max(0, flame.killsPerWeek) / 7;
      const kills = Math.min(flameStock, perDay);
      if (kills > 0) {
        flameStock -= kills; flameKilled += kills;
        if (week) week.kills += kills;
        apply(kills * flameRawPerKill(), "flame", date);
        expPoints += kills * alloc.exp;
        const made = Math.floor(expPoints / COUPON_POINTS);
        if (made > 0) { expPoints -= made * COUPON_POINTS; coupons += made; couponsMade += made; }
      }
    }

    // 퍼스널 보스 미션 (9/24부터, 목요일 초기화 후 아직 안 한 것을 그날 처치)
    if (personalOn && diffDays(date, MAIN_SCHEDULE.bossStart) >= 0) {
      bossState.forEach(b => {
        if (b.done || !(b.raw > 0)) return;
        b.done = true; bossClears += 1;
        if (week) week.bosses += 1;
        apply(b.raw, "boss", date);
        events.push(`보스 미션 ${b.name || b.id || ""}`.trim());
      });
    }

    // 교환권 사용 정책
    if (personalOn && coupons > 0) {
      if (personal.couponPolicy === "now" || date === couponDeadline) { const used = consumeCoupons(date, coupons); if (used > 0) events.push(`교환권 ${used}장`); }
    }
    // 공식 종료일이 지나면 남은 교환권은 사라진다(11/19 02:00 사용 마감을 계산 마지막 날 11/18로 단순화).
    if (date === MAIN_SCHEDULE.personalEnd && coupons > 0) { couponsExpiredByDeadline += coupons; coupons = 0; }

    // 크림슨 모아쓰기
    releaseCrimson(date);

    // PLUS 마감 직후 소멸 집계 (마지막 사용일이 끝난 날)
    if (date === MAIN_SCHEDULE.plusLastUseDay) { expired.crimson += inv.crimson; expired.adv += inv.adv; expired.sauna += inv.sauna; expired.coupon4x += inv.coupon4x; expired.booster += inv.booster; inv.crimson = 0; inv.adv = 0; inv.sauna = 0; inv.coupon4x = 0; inv.booster = 0; }

    if (week) { week.stockEnd = flameStock; week.levelEnd = level; week.expEnd = level >= levelCap ? 0 : xp / ctx.reqRaw(level) * 100; week.steps = stepsCleared; }
    rows.push({
      date, level, exp: level >= levelCap ? 0 : xp / ctx.reqRaw(level) * 100, progress: position(), steps: stepsCleared,
      flameStock, events,
    });
  }

  // 마감 후 남은 것
  const couponsExpired = Math.max(0, coupons) + couponsExpiredByDeadline;
  const finalPosition = position();
  const nextStep = table && nextStepIndex < table.steps.length ? table.steps[nextStepIndex] : null;
  let shortfall = null;
  if (nextStep) {
    const remainingRaw = nextStep.level === level ? ctx.reqRaw(level) * (nextStep.exp / 100) - xp
      : (ctx.reqRaw(level) - xp) + (() => { let sum = 0; for (let l = level + 1; l < nextStep.level; l += 1) sum += ctx.reqRaw(l); return sum + ctx.reqRaw(nextStep.level) * nextStep.exp / 100; })();
    shortfall = { index: nextStep.index, level: nextStep.level, exp: nextStep.exp, remainingRaw: Math.max(0, remainingRaw), remainingStepsCount: MISSION_STEPS - stepsCleared };
  }
  if (!personalEverOn && !personalBlocked && personal.enabled) warnings.push("퍼스널이 이 기간에 시작하지 않아 계산에서 제외됐습니다.");

  return {
    start, end, rows, weeks,
    level, exp: level >= levelCap ? 0 : xp / ctx.reqRaw(level) * 100,
    progress: finalPosition, startPosition, atCap: level >= levelCap,
    mission: { steps: table ? table.steps : [], stepsCleared, stepsAtStart, newlyCleared: clearedSteps, coins: coinsEarned, totalCoins: stepsCleared * COINS_PER_STEP, rewardRaw: missionRewardRaw, nextStep, shortfall, scale: table ? table.scale : 1 },
    flame: {
      killed: flameKilled, overflowLost: flameOverflow, endStock: flameStock, expPoints,
      // 같은 사냥으로 받는 다른 보상. 조각·솔 에르다 기운은 공식 교환 비율(1,500p)로 환산했다.
      shardFragments: flameKilled * alloc.shard / 1500, erdaEnergy: flameKilled * alloc.erda / 1500 * 6,
    },
    coupons: { made: couponsMade, used: couponsUsed, expired: couponsExpired },
    boss: { clears: bossClears },
    items: { crimsonUsed, expired, plusReceived: plusItemsReceived, huntItemsUsed, leftover: { ...inv } },
    sourceRaw,
    warnings,
  };
}

// ── 시점 비교 ───────────────────────────────────────────────────

export const CRIMSON_HOLD_CANDIDATES = Object.freeze([285, 290, 295]);

function summarize(result) {
  return { level: result.level, exp: result.exp, progress: result.progress, stepsCleared: result.mission.stepsCleared, coins: result.mission.coins };
}

/**
 * 크림슨 사용 시점(즉시 / 285 / 290 / 295까지 모음 / 10/21까지 모음) × 교환권 사용 시점(바로 / 마감 직전)을 모두 돌려
 * 통과 단계 수, 마감 위치 순으로 가장 좋은 조합을 고른다. 후보는 최대 10개라 계산이 가볍다.
 */
export function analyzeMain(rawInput, ctx) {
  const o = normalizeInput(rawInput, ctx);
  const holdLevels = [0, ...CRIMSON_HOLD_CANDIDATES.filter(l => l > o.level && l < ctx.levelCap), 999];
  const options = [];
  for (const crimsonHold of holdLevels) {
    for (const couponPolicy of ["now", "end"]) {
      const input = { ...o, crimsonHold, personal: { ...o.personal, couponPolicy } };
      const result = simulateMain(input, ctx);
      options.push({ crimsonHold, couponPolicy, result, summary: summarize(result), best: false });
    }
  }
  // 단계 수가 같고 마감 위치 차이가 0.05%p 안쪽이면 모아 쓰는 쪽(크림슨은 늦게, 교환권은 마감 직전)을 고른다.
  // 차이가 이 정도면 계산 오차 안이고, 모아 두면 쓸 곳을 나중에 바꿀 수 있어 몰아쓰기를 기본으로 본다(대표 지시 2026-10-04).
  const TIE = 0.0005;
  const better = (a, b) => {
    if (a.summary.stepsCleared !== b.summary.stepsCleared) return a.summary.stepsCleared > b.summary.stepsCleared;
    const gap = a.summary.progress - b.summary.progress;
    if (Math.abs(gap) <= TIE) {
      if (a.crimsonHold !== b.crimsonHold) return a.crimsonHold > b.crimsonHold;
      return a.couponPolicy === "end" && b.couponPolicy !== "end";
    }
    return gap > 0;
  };
  let best = options[0];
  options.forEach(option => { if (better(option, best)) best = option; });
  best.best = true;
  const immediate = options.find(option => option.crimsonHold === 0 && option.couponPolicy === "now") || options[0];
  return {
    best, options, immediate,
    gainProgress: (best.summary.progress - immediate.summary.progress) * 100,
    gainSteps: best.summary.stepsCleared - immediate.summary.stepsCleared,
  };
}

// ── 패스 등급과 지정 시점 비교 ────────────────────────────────────

export const PLUS_TIERS = Object.freeze(["free", "premium", "prime"]);
export const PLUS_PREMIUM_CASH = 29_800;
export const PLUS_PRIME_CASH = 39_800;
// 프라임은 프리미엄을 먼저 사야 해서 프라임까지 가려면 두 상품을 모두 산다.
export const plusTierCash = (tier, ownedTier = "free") => {
  const rank = tier => PLUS_TIERS.indexOf(tier);
  let cash = 0;
  if (rank(tier) >= 1 && rank(ownedTier) < 1) cash += PLUS_PREMIUM_CASH;
  if (rank(tier) >= 2 && rank(ownedTier) < 2) cash += PLUS_PRIME_CASH;
  return cash;
};

/**
 * 지금 등급에서 한 단계 이상 올릴 때의 결과를 비교한다.
 * 이미 받은 레벨의 위 등급 보상은 구매하는 순간 받을 수 있다고 본다(공식 문구는 효과 적용 기간만 밝힌다).
 */
export function compareTiers(rawInput, ctx) {
  const o = normalizeInput(rawInput, ctx);
  const owned = PLUS_TIERS.includes(o.plus.tier) ? o.plus.tier : "free";
  const claimed = Math.floor(clamp(o.plus.claimedLevel, 0, PLUS_MAX_LEVEL));
  const rows = [];
  for (const tier of PLUS_TIERS) {
    if (PLUS_TIERS.indexOf(tier) < PLUS_TIERS.indexOf(owned)) continue;
    const extra = { crimson: 0, adv: 0, sauna: 0 };
    if (o.plus.enabled && diffDays(MAIN_SCHEDULE.plusLastUseDay, o.start) >= 0) {
      for (let l = 1; l <= claimed; l += 1) {
        const have = ctx.plusReward(l, owned);
        const want = ctx.plusReward(l, tier);
        extra.crimson += Math.max(0, (want.crimson || 0) - (have.crimson || 0));
        extra.adv += Math.max(0, (want.adv || 0) - (have.adv || 0));
        extra.sauna += Math.max(0, (want.sauna || 0) - (have.sauna || 0));
      }
    }
    const input = { ...o, plus: { ...o.plus, tier }, items: { ...o.items, crimson: o.items.crimson + extra.crimson, adv: o.items.adv + extra.adv, sauna: o.items.sauna + extra.sauna } };
    const analysis = analyzeMain(input, ctx);
    rows.push({ tier, cash: plusTierCash(tier, owned), extra, summary: analysis.best.summary, analysis });
  }
  const base = rows[0];
  rows.forEach(row => {
    row.gainProgress = (row.summary.progress - base.summary.progress) * 100;
    row.gainSteps = row.summary.stepsCleared - base.summary.stepsCleared;
  });
  return rows;
}

/** 아직 지정하지 않은 사용자의 지정일 후보 비교: 오늘, 다음 목요일, 그다음 목요일. */
export function compareDesignation(rawInput, ctx) {
  const o = normalizeInput(rawInput, ctx);
  if (o.personal.designated) return [];
  const first = diffDays(o.start, MAIN_SCHEDULE.personalStart) < 0 ? MAIN_SCHEDULE.personalStart : o.start;
  const dates = [first];
  let d = addDay(first, 1);
  while (dates.length < 3 && diffDays(d, o.end) <= 0) {
    if (weekday(d) === 4) dates.push(d);
    d = addDay(d, 1);
  }
  return dates.map(designDate => {
    const input = { ...o, personal: { ...o.personal, designDate } };
    const result = simulateMain(input, ctx);
    return { designDate, summary: summarize(result), flameKilled: result.flame.killed, result };
  });
}
