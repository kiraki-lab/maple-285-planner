"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  advanceBurningBeyondExperience,
  growthPotionExperience,
  monsterParkExperiencePercent,
  paidMonsterParkExperience,
  paidMonsterParkMaplePoints,
  PAID_STRATEGY_PRIORITY,
} from "@/lib/calculator-core.mjs";

export const dynamic = "force-static";

type PullStrategy = "monsterPark" | "blue" | "mech" | "both";
type ViewTab = "calculator" | "pre280" | "efficiency" | "passes";
type ExperienceSourceId = "monsterPark" | "grandis" | "extreme" | "epic" | "mech" | "blue" | "sauna" | "adv" | "potion" | "specialSupply";
type CustomRewardType = "adv" | "mech" | "crimson" | "blue" | "sauna" | "potion279";
type ItemConversionInventory = Record<CustomRewardType, number>;
type ItemConversionResult = {
  startLevel: number;
  startExp: number;
  level: number;
  exp: number;
  totalRawExperience: number;
  used: ItemConversionInventory;
  remaining: ItemConversionInventory;
  reachedUpperLimit: boolean;
};
type CustomRewardOrigin = "owned" | "extra";
type CustomReward = { id: string; type: CustomRewardType; amount: number; useDate: string; origin: CustomRewardOrigin };
type Settings = {
  targetLevel: number;
  calcMode: "target" | "forecast";
  level: number;
  exp: number;
  start: string;
  pullWeeks: number;
  pullStrategy: PullStrategy;
  specialSundayCount: number;
  paidMonsterPark: boolean;
  specialSupply: boolean;
  specialSupplySaved: number;
  specialSupplyExpPerCharge: number;
  challengerPassLevel: number;
  momentumPass1Enabled: boolean;
  momentumPass2Enabled: boolean;
  momentumPass1Level: number;
  momentumPass2Level: number;
  preLevel: number;
  preExp: number;
  prePassLevel: number;
  preUnclaimed: boolean;
  preUseBlue: boolean;
  preUseSauna: boolean;
  preUseAdv: boolean;
  preUsePotion: boolean;
  preMonsterParkRuns: number;
  preSpecialSundayCount: number;
  preDailyQuests: boolean;
  preWeeklyContent: boolean;
  preTodayDaily: boolean;
  preWeeklyOpen: boolean;
  momentumMechLevel: number;
  mechHoldAuto: boolean;
  momentumMechDeadline: string;
  mayrinMesoGap: number;
  mayrinNormalFrag: number;
  fragPrice: number;
  mpPerEok: number;
  postReset: boolean;
  challengerUnclaimed: boolean;
  challengerExp: boolean;
  momentumPrime1: boolean;
  momentumPrime2: boolean;
  momentumPremium2: boolean;
  deferMomentumMech: boolean;
  dailyCore6Enabled: boolean;
  dailyCore6Date: string;
  mpCore6Enabled: boolean;
  mpCore6Date: string;
  epicCore6Enabled: boolean;
  epicCore6Date: string;
  shardEvent: boolean;
  ultima: boolean;
  shopMech: boolean;
  shopBlue: boolean;
  mpCore5: number;
  core20Date: string;
  core20Bonus: number;
  mpCore6: number;
  dailyCore5: number;
  dailyCore6: number;
  shardDate: string;
  shardAdv: number;
  ultimaCount: number;
  ultimaWeek: number;
  ultimaStart: boolean;
  grandis: boolean;
  weeklyOpen: boolean;
  todayDaily: boolean;
  extreme: boolean;
  epic: boolean;
  epicMult: number;
  epicCore5: number;
  core25Date: string;
  core25Bonus: number;
  epicArtifactDate: string;
  epicArtifact: number;
  epicCore6: number;
  epicCore6Artifact: number;
  ownedBlue: number;
  ownedMech: number;
  ownedCrimson: number;
  ownedSauna: number;
  ownedAdv: number;
  ownedPotion279: number;
  customRewards: CustomReward[];
  excludedExperienceSources: ExperienceSourceId[];
};

type ItemType = "blue" | "mech" | "crimson" | "sauna" | "adv" | "potion269" | "potion279" | "coupon3x" | "coupon4x";
type Leftovers = Record<ItemType, number>;
type Reward = Partial<Leftovers> & {
  label: string;
  sourceLabel?: string;
  attendanceReward?: boolean;
  attendanceCount?: number;
  deferMech?: boolean;
  optionalPurchase?: boolean;
  maplePoints?: number;
  purchased?: boolean;
  date?: string;
  remaining?: Leftovers;
};
type RowUsage = { blue: number; mech: number; crimson: number; sauna: number; adv: number; potion: number; runs: number };
type ExperienceContribution = { id: ExperienceSourceId; label: string; gain: number };
type Row = { date: Date; key: string; level: number; exp: number; progress: number; events: string[]; usage: RowUsage; contributions: ExperienceContribution[] };
type Simulation = {
  start: Date;
  startLevel: number;
  startExp: number;
  rows: Row[];
  reached: Date | null;
  reach285At: Date | null;
  leftoversAt285: Leftovers | null;
  leftoverSourcesAt285: string[];
  specialSupplySavedAt285: number | null;
  leftovers: Leftovers;
  leftoverSources: string[];
  shopMaplePoints: number;
  shopBluePurchased: number;
  shopMechPurchased: number;
  monsterParkMaplePoints: number;
  maplePoints: number;
  scheduleLabel: string;
  sevenUntil: Date;
  specialSundayCount: number;
  momentumMechLevel: number;
  mechHoldAuto: boolean;
  momentumMechDeadline: Date;
  dailyDaysApplied: number;
  ultimaCountAtReach: number;
  specialSupplySaved: number;
  specialSupplyUsed: number;
  horizonDays: number;
  finalLevel: number;
  finalExp: number;
  endReason: "reached" | "horizon" | "no-growth";
};
type PullPlan = { pullWeeks: number; targetClearWeeks: number; result: Simulation; feasible: boolean; strategy: PullStrategy; shopBlueCount: number; shopMechCount: number; scheduleIndex: number };
type StrategyCandidate = { result: Simulation; shopBlueCount: number; shopMechCount: number; scheduleIndex: number };
type Planning = {
  sunday: Simulation;
  free: Simulation;
  allSeven: Simulation;
  strategyPlans: Record<PullStrategy, PullPlan[]>;
  recommendedPlansByWeek: PullPlan[][];
  bestPlansByWeek: PullPlan[];
  basePlan: PullPlan;
  maxPullWeeks: number;
  deadline: Date;
};
type Pre280Inventory = { blue: number; sauna: number; adv: number; potion279: number };
type Pre280Row = { date: Date; label: string; beforeLevel: number; beforeExp: number; level: number; exp: number; used: Pre280Inventory };
type Pre280Simulation = {
  reached: Date | null;
  level: number;
  exp: number;
  passLevel: number;
  inventory: Pre280Inventory;
  used: Pre280Inventory;
  rows: Pre280Row[];
  monsterParkMaplePoints: number;
  dailyDays: number;
  monsterParkRuns: number;
  weeklyCount: number;
};

export const EXPERIENCE_SOURCE_LABELS: Record<ExperienceSourceId, string> = {
  monsterPark: "몬스터파크",
  grandis: "그란디스 일퀘",
  extreme: "익스트림 몬스터파크",
  epic: "악몽선경",
  mech: "메카베리",
  blue: "블루베리",
  sauna: "VIP 사우나",
  adv: "상급 EXP",
  potion: "성장의 비약",
  specialSupply: "특수 물자",
};
const experienceSourceIds = Object.keys(EXPERIENCE_SOURCE_LABELS) as ExperienceSourceId[];
export const normalizeExcludedExperienceSources = (value: unknown): ExperienceSourceId[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is ExperienceSourceId => typeof id === "string" && experienceSourceIds.includes(id as ExperienceSourceId)))];
};
export const toggleExcludedExperienceSource = (value: unknown, id: ExperienceSourceId): ExperienceSourceId[] => {
  const normalized = normalizeExcludedExperienceSources(value);
  return normalized.includes(id) ? normalized.filter(sourceId => sourceId !== id) : [...normalized, id];
};

export function roundContributionBreakdown(contributions: ExperienceContribution[], totalGain: number) {
  const rounded = contributions.map(contribution => ({
    ...contribution,
    cents: Math.floor(Math.max(0, contribution.gain) * 100 + 1e-9),
    fraction: Math.max(0, contribution.gain) * 100 % 1,
  }));
  let remaining = Math.max(0, Math.round(Math.max(0, totalGain) * 100) - rounded.reduce((sum, contribution) => sum + contribution.cents, 0));
  const byFraction = rounded.map((_, index) => index).sort((a, b) => rounded[b].fraction - rounded[a].fraction);
  for (let index = 0; remaining > 0 && byFraction.length; index = (index + 1) % byFraction.length) {
    rounded[byFraction[index]].cents += 1;
    remaining -= 1;
  }
  return rounded.map(contribution => ({ id: contribution.id, label: contribution.label, gain: contribution.gain, roundedGain: contribution.cents / 100 }));
}

const efficiency: Record<number, Record<string, number>> = {
  280: { grandis: 0.3857, mp7: 2.2302, extreme: 2.604, epic: 3.0885, adv100: 0.22977, sauna: 0.9313, blue: 6.4818, mech: 9.7053 },
  281: { grandis: 0.3507, mp7: 2.0272, extreme: 2.3996, epic: 2.8461, adv100: 0.21173, sauna: 0.8582, blue: 5.8925, mech: 8.9434 },
  282: { grandis: 0.3188, mp7: 1.8431, extreme: 2.2077, epic: 2.6183, adv100: 0.19479, sauna: 0.7896, blue: 5.3568, mech: 8.2281 },
  283: { grandis: 0.2898, mp7: 1.6758, extreme: 2.0339, epic: 2.412, adv100: 0.17946, sauna: 0.7274, blue: 4.8699, mech: 7.5803 },
  284: { grandis: 0.2635, mp7: 1.5232, extreme: 1.8708, epic: 2.2187, adv100: 0.16507, sauna: 0.6691, blue: 4.4271, mech: 6.9727 },
  285: { grandis: 0.176289, mp7: 1.097479, extreme: 1.041135, epic: 1.234826, adv100: 0.091865, sauna: 0.372361, blue: 2.1917, mech: 5.1738 },
  286: { grandis: 0.160261, mp7: 0.997699, extreme: 0.957506, epic: 1.135514, adv100: 0.084485, sauna: 0.342455, blue: 1.9924, mech: 4.758 },
  287: { grandis: 0.145693, mp7: 0.907005, extreme: 0.881783, epic: 1.045763, adv100: 0.077804, sauna: 0.315365, blue: 1.8113, mech: 4.382 },
  288: { grandis: 0.132448, mp7: 0.824550, extreme: 0.811982, epic: 0.962927, adv100: 0.071645, sauna: 0.290402, blue: 1.6466, mech: 4.035 },
  289: { grandis: 0.120408, mp7: 0.749593, extreme: 0.746554, epic: 0.885408, adv100: 0.065873, sauna: 0.266999, blue: 1.4969, mech: 3.710 },
};

const emptyLeftovers = (): Leftovers => ({ blue: 0, mech: 0, crimson: 0, sauna: 0, adv: 0, potion269: 0, potion279: 0, coupon3x: 0, coupon4x: 0 });
// 크림슨 메카베리 농장은 전 구간 동렙몹 1,478,400마리 고정이다 (하루1소재).
// 메카베리는 구간마다 마릿수가 달라 배율이 레벨에 따라 바뀐다: 280~284 1.5556 · 285~289 1.1667 · 290+ 1.0769.
export const CRIMSON_FARM_MOBS = 1_478_400;
export const mechFarmMobsForLevel = (level: number) => level >= 290 ? 1_372_800 : level >= 285 ? 1_267_200 : 950_400;
export const crimsonPercentForLevel = (mechPercent: number, level: number) =>
  mechPercent * CRIMSON_FARM_MOBS / mechFarmMobsForLevel(level);
const itemTypes = Object.keys(emptyLeftovers()) as ItemType[];
const SSR_DEFAULT_START = "2026-07-27";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const parseDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d) - KST_OFFSET_MS); };
const kstView = (date: Date) => new Date(date.getTime() + KST_OFFSET_MS);
const iso = (date: Date) => { const value = kstView(date); return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`; };
export const simulationDateKey = (date: Date) => iso(date);
const shortDate = (date: Date | null) => { if (!date) return "미도달"; const value = kstView(date); return `${value.getUTCMonth() + 1}/${value.getUTCDate()}`; };
const longDate = (date: Date | null) => { if (!date) return "계산 범위 내 미도달"; const value = kstView(date); return `${value.getUTCMonth() + 1}월 ${value.getUTCDate()}일`; };
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);
const dayOfWeek = (date: Date) => kstView(date).getUTCDay();
const customRewardTypes: CustomRewardType[] = ["adv", "mech", "blue", "sauna", "potion279"];
const CUSTOM_REWARD_META: Record<CustomRewardType, { label: string; unit: string; ownedField: "ownedAdv" | "ownedMech" | "ownedCrimson" | "ownedBlue" | "ownedSauna" | "ownedPotion279"; step: number; extraDefault: number }> = {
  adv: { label: "상급 EXP 쿠폰", unit: "장", ownedField: "ownedAdv", step: 1, extraDefault: 1000 },
  mech: { label: "메카베리", unit: "개", ownedField: "ownedMech", step: 1, extraDefault: 1 },
  crimson: { label: "크림슨 메카베리", unit: "개", ownedField: "ownedCrimson", step: 1, extraDefault: 1 },
  blue: { label: "블루베리", unit: "개", ownedField: "ownedBlue", step: 1, extraDefault: 1 },
  sauna: { label: "VIP 사우나", unit: "시간", ownedField: "ownedSauna", step: 0.5, extraDefault: 0.5 },
  potion279: { label: "성장의 비약", unit: "개", ownedField: "ownedPotion279", step: 1, extraDefault: 1 },
};
const validDateInput = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDate(value);
  return Number.isFinite(parsed.getTime()) && iso(parsed) === value;
};
export const normalizeCustomRewards = (value: unknown, fallbackDate = SSR_DEFAULT_START): CustomReward[] => {
  if (!Array.isArray(value)) return [];
  const safeFallbackDate = validDateInput(fallbackDate) ? fallbackDate : SSR_DEFAULT_START;
  const ids = new Set<string>();
  return value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const raw = candidate as Partial<CustomReward>;
    if (!customRewardTypes.includes(raw.type as CustomRewardType) || !Number.isFinite(Number(raw.amount)) || Number(raw.amount) <= 0) return [];
    const type = raw.type as CustomRewardType;
    const amount = type === "sauna" ? Number(raw.amount) : Math.floor(Number(raw.amount));
    if (amount <= 0) return [];
    const baseId = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `legacy-${index}`;
    if (ids.has(baseId)) return [];
    ids.add(baseId);
    return [{
      id: baseId,
      type,
      amount,
      useDate: validDateInput(raw.useDate) ? raw.useDate : safeFallbackDate,
      origin: raw.origin === "owned" ? "owned" : "extra",
    }];
  });
};
export const addCustomRewardToSettings = (settings: Settings, input: CustomReward): Settings => {
  const reward = normalizeCustomRewards([input], settings.start)[0];
  if (!reward) return settings;
  const currentRewards = normalizeCustomRewards(settings.customRewards, settings.start);
  if (currentRewards.some(candidate => candidate.id === reward.id)) return settings;
  if (reward.origin === "extra") return { ...settings, customRewards: [...currentRewards, reward] };
  const ownedField = CUSTOM_REWARD_META[reward.type].ownedField;
  const available = Math.max(0, Number(settings[ownedField] || 0));
  if (available + 1e-9 < reward.amount) return settings;
  return { ...settings, [ownedField]: Math.max(0, available - reward.amount), customRewards: [...currentRewards, reward] };
};
export const removeCustomRewardFromSettings = (settings: Settings, id: string): Settings => {
  const currentRewards = normalizeCustomRewards(settings.customRewards, settings.start);
  const removed = currentRewards.find(reward => reward.id === id);
  if (!removed) return settings;
  const next = { ...settings, customRewards: currentRewards.filter(reward => reward.id !== id) };
  if (removed.origin === "extra") return next;
  const ownedField = CUSTOM_REWARD_META[removed.type].ownedField;
  return { ...next, [ownedField]: Math.max(0, Number(settings[ownedField] || 0)) + removed.amount };
};
export const claimedRewardTotal = (settings: Settings, type: CustomRewardType) => {
  const ownedField = CUSTOM_REWARD_META[type].ownedField;
  const immediatelyOwned = Math.max(0, Number(settings[ownedField] || 0));
  const scheduledOwned = normalizeCustomRewards(settings.customRewards, settings.start)
    .filter(reward => reward.type === type && reward.origin === "owned")
    .reduce((sum, reward) => sum + reward.amount, 0);
  return immediatelyOwned + scheduledOwned;
};
export const claimedRewardToggleChecked = (settings: Settings, type: CustomRewardType) => claimedRewardTotal(settings, type) > 0;
export const setClaimedRewardToggle = (settings: Settings, type: CustomRewardType, checked: boolean, claimedAmount: number): Settings => {
  const ownedField = CUSTOM_REWARD_META[type].ownedField;
  const customRewards = normalizeCustomRewards(settings.customRewards, settings.start);
  if (checked) {
    // 즉시 보유분이나 예약 보유분이 하나라도 있으면 다시 더하지 않는다.
    if (claimedRewardTotal(settings, type) > 0) return settings;
    return { ...settings, [ownedField]: Math.max(0, Number(claimedAmount || 0)), customRewards };
  }
  // OFF는 이 패스 보상을 계산에서 완전히 뺀다. extra 일정은 별도 입력이므로 유지한다.
  return {
    ...settings,
    [ownedField]: 0,
    customRewards: customRewards.filter(reward => !(reward.type === type && reward.origin === "owned")),
  };
};
export const currentInventoryTotal = (settings: Settings, type: CustomRewardType) => {
  const ownedField = CUSTOM_REWARD_META[type].ownedField;
  const scheduled = normalizeCustomRewards(settings.customRewards, settings.start)
    .filter(reward => reward.type === type)
    .reduce((sum, reward) => sum + reward.amount, 0);
  return Math.max(0, Number(settings[ownedField] || 0)) + scheduled;
};
export const overwriteInventoryAmount = (settings: Settings, type: CustomRewardType, amount: number): Settings => {
  if (!Number.isFinite(amount) || amount < 0 || (type !== "sauna" && !Number.isInteger(amount))) return settings;
  const ownedField = CUSTOM_REWARD_META[type].ownedField;
  return {
    ...settings,
    [ownedField]: amount,
    // 수동 입력값이 이 종류의 단일 진실이 되도록 숨은 예약분까지 모두 대체한다.
    customRewards: normalizeCustomRewards(settings.customRewards, settings.start).filter(reward => reward.type !== type),
  };
};
export const REQUIRED_EXP: Record<number, bigint> = {
  280: 33_647_601_750_165n,
  281: 37_012_361_925_181n,
  282: 40_713_598_117_699n,
  283: 44_784_957_929_468n,
  284: 49_263_453_722_414n,
  285: 99_512_176_519_276n,
  286: 109_463_394_171_203n,
  287: 120_409_733_588_323n,
  288: 132_450_706_947_155n,
  289: 145_695_777_641_870n,
  290: 294_305_470_836_577n,
  291: 323_736_017_920_234n,
  292: 356_109_619_712_257n,
  293: 391_720_581_683_482n,
  294: 430_892_639_851_830n,
  295: 870_403_132_500_696n,
};
const LEVEL_280_REQUIRED_EXP = Number(REQUIRED_EXP[280]);
const req = (level: number) => Number(REQUIRED_EXP[level]) / LEVEL_280_REQUIRED_EXP;
const rawToNormalized = (raw: number) => raw / LEVEL_280_REQUIRED_EXP;
const GRANDIS_DAILY_BASE = 129_794_096_544;
const GRANDIS_DAILY_CARCION = 45_635_222_880;
const GRANDIS_DAILY_TALLAHART = 89_700_000_000;
const GRANDIS_DAILY_GEARDRAK = 105_300_000_000;
const ARTERIA_MONSTER_PARK_PER_RUN = 107_204_000_000;
const CARCION_MONSTER_PARK_PER_RUN = 156_017_856_000;
const TALLAHART_MONSTER_PARK_PER_RUN = 218_575_316_000;
const WEEKLY_CONTENT_RAW: Record<number, { extreme: number; epic: number; sauna: number; adv1000: number }> = {
  285: { extreme: 1_036_056_075_000, epic: 1_228_800_000_000, sauna: 370_542_408_480, adv1000: 914_168_000_000 },
  286: { extreme: 1_048_127_520_000, epic: 1_243_000_000_000, sauna: 374_859_725_040, adv1000: 924_819_000_000 },
  287: { extreme: 1_061_756_505_000, epic: 1_259_200_000_000, sauna: 379_734_091_200, adv1000: 936_844_000_000 },
  288: { extreme: 1_075_469_130_000, epic: 1_275_400_000_000, sauna: 384_638_371_200, adv1000: 948_944_000_000 },
  289: { extreme: 1_087_699_695_000, epic: 1_290_000_000_000, sauna: 389_012_597_280, adv1000: 959_736_000_000 },
  290: { extreme: 1_222_296_090_000, epic: 1_449_600_000_000, sauna: 437_150_602_080, adv1000: 1_078_497_000_000 },
};
export const monsterParkRawForLevel = (level: number, carcionActive = true, tallahartActive = true) =>
  level >= 290 && tallahartActive ? TALLAHART_MONSTER_PARK_PER_RUN : level >= 285 && carcionActive ? CARCION_MONSTER_PARK_PER_RUN : ARTERIA_MONSTER_PARK_PER_RUN;
export const grandisDailyRawForLevel = (level: number, carcionActive = true) => GRANDIS_DAILY_BASE
  + (level >= 285 && carcionActive ? GRANDIS_DAILY_CARCION : 0)
  + (level >= 290 ? GRANDIS_DAILY_TALLAHART : 0)
  + (level >= 295 ? GRANDIS_DAILY_GEARDRAK : 0);
export const contentUnlockedOn = (date: Date, unlockDate: string, level: number, minimumLevel: number) =>
  level >= minimumLevel && Boolean(unlockDate && date >= parseDate(unlockDate));
export const carcionContentActive = (date: Date, calculationStart: string, level: number) => contentUnlockedOn(date, calculationStart, level, 285);
[285, 286, 287, 288, 289].forEach(level => {
  const required = Number(REQUIRED_EXP[level]);
  Object.assign(efficiency[level], {
    grandis: grandisDailyRawForLevel(level) / required * 100,
    mp7: CARCION_MONSTER_PARK_PER_RUN * 7 / required * 100,
    extreme: WEEKLY_CONTENT_RAW[level].extreme / required * 100,
    epic: WEEKLY_CONTENT_RAW[level].epic / required * 100,
    adv100: WEEKLY_CONTENT_RAW[level].adv1000 / 10 / required * 100,
    sauna: WEEKLY_CONTENT_RAW[level].sauna / required * 100,
  });
});
efficiency[290] = {
  grandis: grandisDailyRawForLevel(290) / Number(REQUIRED_EXP[290]) * 100,
  mp7: TALLAHART_MONSTER_PARK_PER_RUN * 7 / Number(REQUIRED_EXP[290]) * 100,
  extreme: WEEKLY_CONTENT_RAW[290].extreme / Number(REQUIRED_EXP[290]) * 100,
  epic: WEEKLY_CONTENT_RAW[290].epic / Number(REQUIRED_EXP[290]) * 100,
  adv100: WEEKLY_CONTENT_RAW[290].adv1000 / 10 / Number(REQUIRED_EXP[290]) * 100,
  sauna: WEEKLY_CONTENT_RAW[290].sauna / Number(REQUIRED_EXP[290]) * 100,
  blue: 0.7411,
  mech: 2.2359,
};
export const POST_290_EFFICIENCY_RAW: Record<number, { sauna: number; adv100: number; blue: number; mech: number; epic: number; extreme: number; monsterParkPerRun: number }> = {
  291: { sauna: 442_047_471_120, adv100: 107_849_700_000, blue: 2_180_965_564_800, mech: 6_653_978_073_600, epic: 1_465_800_000_000, extreme: 1_236_000_000_000, monsterParkPerRun: 218_575_316_000 },
  292: { sauna: 447_592_430_880, adv100: 107_849_700_000, blue: 2_180_965_564_800, mech: 6_737_444_313_600, epic: 1_484_200_000_000, extreme: 1_251_400_000_000, monsterParkPerRun: 218_575_316_000 },
  293: { sauna: 453_170_678_400, adv100: 107_849_700_000, blue: 2_180_965_564_800, mech: 6_821_411_625_600, epic: 1_502_800_000_000, extreme: 1_267_200_000_000, monsterParkPerRun: 218_575_316_000 },
  294: { sauna: 458_142_355_440, adv100: 107_849_700_000, blue: 2_180_965_564_800, mech: 6_896_248_444_800, epic: 1_519_200_000_000, extreme: 1_281_100_000_000, monsterParkPerRun: 218_575_316_000 },
  295: { sauna: 514_661_664_000, adv100: 107_849_700_000, blue: 2_180_965_564_800, mech: 7_747_012_416_000, epic: 1_519_200_000_000, extreme: 1_281_100_000_000, monsterParkPerRun: 218_575_316_000 },
};
Object.entries(POST_290_EFFICIENCY_RAW).forEach(([levelValue, raw]) => {
  const level = Number(levelValue);
  const required = Number(REQUIRED_EXP[level]);
  efficiency[level] = {
    mp7: raw.monsterParkPerRun * 7 / required * 100,
    epic: raw.epic / required * 100,
    adv100: raw.adv100 / required * 100,
    sauna: raw.sauna / required * 100,
    blue: raw.blue / required * 100,
    mech: raw.mech / required * 100,
  };
});
const SPECIAL_SUPPLY_BATCH_SIZE = 5;
const SPECIAL_SUPPLY_START = "2026-07-23";
const SPECIAL_SUPPLY_END = "2026-08-19";
const MOMENTUM_PASS_1_START = "2026-07-23";
const MOMENTUM_PASS_1_END = "2026-08-19";
const MOMENTUM_PASS_2_START = "2026-08-20";
const MOMENTUM_PASS_2_END = "2026-09-16";
const MOMENTUM_WEEKLY_LEVELS = [2, 3, 3, 2];
const MOMENTUM_MAX_LEVEL = 10;
// 계산기는 풀 보상을 기준으로 잡고 못 받는 것만 빼는 방식이다.
// 그래서 그 날짜까지 열린 주차는 모두 클리어한 상태가 기본값이고, 밀린 사람이 레벨을 낮춰 소거한다.
export const momentumUnlockedLevelOn = (date: Date, passStart: string) => {
  const elapsedWeeks = Math.floor((date.getTime() - parseDate(passStart).getTime()) / (7 * 86400000));
  if (elapsedWeeks < 0) return 0;
  return Math.min(MOMENTUM_MAX_LEVEL, MOMENTUM_WEEKLY_LEVELS.slice(0, elapsedWeeks + 1).reduce((sum, levels) => sum + levels, 0));
};
const ULTIMA_ATTENDANCE_START = "2026-06-18";
const ULTIMA_ATTENDANCE_MAX = 60;
const SHOP_WEEK_STARTS = ["2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13"];
const SHOP_EVENT_END = "2026-08-19";
const SHOP_WEEKLY_ITEM_LIMIT = 2;
const SHOP_BLUE_UNIT_PRICE = 7_000;
const SHOP_MECH_UNIT_PRICE = 10_000;
export const distributeShopPurchaseCount = (requestedCount: number, availableWeekCount: number) => {
  let remaining = Math.max(0, Math.min(Math.floor(requestedCount), Math.max(0, Math.floor(availableWeekCount)) * SHOP_WEEKLY_ITEM_LIMIT));
  return Array.from({ length: Math.max(0, Math.floor(availableWeekCount)) }, () => {
    const count = Math.min(SHOP_WEEKLY_ITEM_LIMIT, remaining);
    remaining -= count;
    return count;
  });
};
const singleShopPurchaseLabel = (label: string, count: number) => {
  const distribution = distributeShopPurchaseCount(count, Math.ceil(Math.max(0, count) / SHOP_WEEKLY_ITEM_LIMIT)).filter(Boolean);
  return count > 0 ? `${label} ${count}개 · ${distribution.length}주(${distribution.join("+")})` : "";
};
export const shopPurchasePlanLabel = (shopBlueCount: number, shopMechCount: number) => {
  const blueCount = Math.max(0, Math.floor(shopBlueCount));
  const mechCount = Math.max(0, Math.floor(shopMechCount));
  if (blueCount === 1 && mechCount === 1) return "메카 1개 + 블루 1개";
  return [singleShopPurchaseLabel("메카", mechCount), singleShopPurchaseLabel("블루", blueCount)].filter(Boolean).join(" · ") || "메포샵 미구매";
};
export const shopPurchasePairsForAvailableCount = (availableShopItemCount: number): Record<PullStrategy, [number, number][]> => {
  const counts = Array.from({ length: Math.max(0, Math.floor(availableShopItemCount)) }, (_, index) => index + 1);
  return {
    monsterPark: [[0, 0]],
    blue: counts.map((count): [number, number] => [count, 0]),
    mech: counts.map((count): [number, number] => [0, count]),
    both: counts.flatMap(blueCount => counts.map((mechCount): [number, number] => [blueCount, mechCount])),
  };
};
const formatMP = (value: number) => `${Math.round(value).toLocaleString("ko-KR")} 메포`;
const formatSignedMP = (value: number) => `${value > 0 ? "+" : ""}${formatMP(value)}`;
const eok = (value: number) => `${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;
// 보상 한 개의 가치는 조 단위가 읽기 쉽다.
const jo = (value: number) => `${(value / 1000000000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}조`;
export function calculateMayrinRoi({
  selectedMaplePoints,
  baselineMaplePoints,
  previousMaplePoints,
  selectedHardWeeks,
  baselineHardWeeks,
  previousHardWeeks,
  hardValue,
  mpPerEok,
}: {
  selectedMaplePoints: number;
  baselineMaplePoints: number;
  previousMaplePoints: number;
  selectedHardWeeks: number;
  baselineHardWeeks: number;
  previousHardWeeks: number;
  hardValue: number;
  mpPerEok: number;
}) {
  const compare = (comparisonMaplePoints: number, comparisonHardWeeks: number) => {
    const maplePoints = selectedMaplePoints - comparisonMaplePoints;
    const hardWeeks = Math.max(0, selectedHardWeeks - comparisonHardWeeks);
    const costValue = maplePoints / Math.max(1, mpPerEok) * 100000000;
    const recoveredValue = hardWeeks * hardValue;
    return {
      maplePoints,
      hardWeeks,
      costValue,
      recoveredValue,
      netValue: recoveredValue - costValue,
      recoveryRate: costValue > 0 ? recoveredValue / costValue * 100 : 0,
    };
  };

  return {
    cumulative: compare(baselineMaplePoints, baselineHardWeeks),
    marginal: compare(previousMaplePoints, previousHardWeeks),
  };
}
const localDateInputValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const ultimaProgressBefore = (start: string) => {
  const target = parseDate(start);
  let date = parseDate(ULTIMA_ATTENDANCE_START);
  let count = 0;
  let week = 0;
  while (date < target) {
    if (dayOfWeek(date) === 4) week = 0;
    if (count < ULTIMA_ATTENDANCE_MAX && week < 5) { count += 1; week += 1; }
    date = addDays(date, 1);
  }
  if (dayOfWeek(target) === 4) week = 0;
  return { count, week };
};
const availableShopWeeksForStart = (start: Date) => {
  const weekStarts = SHOP_WEEK_STARTS.map(parseDate);
  const eventEnd = parseDate(SHOP_EVENT_END);
  return weekStarts
    .map((weekStart, index) => ({ weekStart, weekEnd: index + 1 < weekStarts.length ? addDays(weekStarts[index + 1], -1) : eventEnd, originalIndex: index }))
    .filter(({ weekEnd }) => weekEnd >= start);
};

const challengerBlueLevels = new Set([1, 3, 5, 6, 8, 10, 11, 13, 15, 16, 18, 20, 21, 23, 25, 26, 28]);
const challengerSaunaLevels = new Set([2, 7, 12, 17, 22, 27]);
const challengerExpLevels = new Set([4, 9, 14, 19, 24, 29]);
const challengerRewardForLevel = (level: number, expPass: boolean): Omit<Reward, "label"> => ({
  blue: expPass && challengerBlueLevels.has(level) ? 1 : 0,
  sauna: expPass && challengerSaunaLevels.has(level) ? 1 : 0,
  adv: (level === 22 || level === 27 ? 100 : level === 30 ? 2000 : 0) + (expPass && challengerExpLevels.has(level) ? 1000 : 0),
  potion279: expPass && level === 30 ? 1 : 0,
});

const momentumRewardForLevel = (level: number, prime: boolean, deferMech: boolean): Omit<Reward, "label"> => ({
  deferMech,
  mech: (level === 1 ? 1 : 0) + (prime ? (({ 2: 1, 5: 2, 8: 3, 10: 4 } as Record<number, number>)[level] || 0) : 0),
  sauna: [2, 5, 8].includes(level) ? 0.5 : 0,
  adv: (({ 4: 100, 7: 100, 10: 300 } as Record<number, number>)[level] || 0) + (prime && [3, 6, 9].includes(level) ? 3000 : 0),
  coupon4x: prime && [1, 4, 7].includes(level) ? 2 : 0,
});

// 이미 받은 패스 레벨의 보상은 아직 손에 들고 있는 것으로 본다. 특히 메카베리는
// 계산기 스스로 284까지 모아쓰라고 안내하므로, 수령했다고 사라지면 안 된다.
// 모멘텀 패스 PLUS (2차, 8/20~9/16). 테스트월드 1.2.205 공지의 레벨별 표를 그대로 옮겼다.
// 세 등급의 보상은 누적되며, 프라임은 프리미엄 선구매가 필수다.
const MOMENTUM_PLUS_FREE: Record<number, { crimson?: number; adv?: number; sauna?: number }> = {
  1: { crimson: 1 }, 2: { sauna: 0.5 }, 4: { adv: 100 }, 5: { sauna: 0.5 }, 7: { adv: 100 }, 8: { sauna: 0.5 }, 10: { adv: 300 },
};
const MOMENTUM_PLUS_PREMIUM: Record<number, { crimson?: number; adv?: number; coupon4x?: number }> = {
  2: { crimson: 1 }, 3: { coupon4x: 2 }, 4: { adv: 1500 }, 5: { crimson: 2 }, 6: { adv: 1500 }, 8: { crimson: 2 }, 9: { coupon4x: 2 }, 10: { adv: 1500 },
};
const MOMENTUM_PLUS_PRIME: Record<number, { crimson?: number; adv?: number; coupon4x?: number }> = {
  1: { coupon4x: 2 }, 2: { adv: 3000 }, 3: { crimson: 3 }, 4: { coupon4x: 2 }, 5: { adv: 3000 }, 6: { crimson: 4 }, 7: { coupon4x: 2 }, 8: { adv: 3000 }, 10: { crimson: 4 },
};
export type MomentumTier = "free" | "premium" | "prime";
export const MOMENTUM_PLUS_PREMIUM_CASH = 29_800;
export const MOMENTUM_PLUS_PRIME_CASH = 39_800;
// 750포인트마다 1레벨, 주간 최대 2,500포인트 → 3주차에 만렙.
const MOMENTUM_PLUS_POINTS_PER_LEVEL = 750;
const MOMENTUM_PLUS_WEEKLY_POINTS = 2_500;
export const momentumPlusUnlockedLevel = (elapsedWeeks: number) => elapsedWeeks < 0 ? 0
  : Math.min(MOMENTUM_MAX_LEVEL, Math.floor(MOMENTUM_PLUS_WEEKLY_POINTS * (elapsedWeeks + 1) / MOMENTUM_PLUS_POINTS_PER_LEVEL));
export const momentumPlusRewardForLevel = (level: number, tier: MomentumTier, deferMech: boolean): Omit<Reward, "label"> => {
  const tables = [MOMENTUM_PLUS_FREE as Record<number, Record<string, number>>];
  if (tier !== "free") tables.push(MOMENTUM_PLUS_PREMIUM as Record<number, Record<string, number>>);
  if (tier === "prime") tables.push(MOMENTUM_PLUS_PRIME as Record<number, Record<string, number>>);
  const total = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0 };
  tables.forEach(table => Object.entries(table[level] || {}).forEach(([key, value]) => { total[key as keyof typeof total] += value; }));
  return { deferMech, crimson: total.crimson, adv: total.adv, sauna: total.sauna, coupon4x: total.coupon4x };
};

// 챌린저스 EXP 패스에서 이미 받은 레벨의 보상. 다 쓴 사람이 많아 기본값은 0이고, 남아 있으면 토글로 켠다.
export const challengerClaimedRewards = (level: number, expPass: boolean) => {
  const claimed = { blue: 0, sauna: 0, adv: 0, potion279: 0 };
  for (let passLevel = 1; passLevel <= Math.max(0, Math.min(30, Math.floor(level))); passLevel += 1) {
    const reward = challengerRewardForLevel(passLevel, expPass);
    claimed.blue += Number(reward.blue || 0);
    claimed.sauna += Number(reward.sauna || 0);
    claimed.adv += Number(reward.adv || 0);
    claimed.potion279 += Number(reward.potion279 || 0);
  }
  return claimed;
};

// 모멘텀 패스 PLUS에서 이미 받은 레벨의 보상. 1차와 달리 크림슨 메카베리로 나온다.
export const momentumPlusClaimedRewards = (level: number, tier: MomentumTier) => {
  const claimed = { crimson: 0, adv: 0, sauna: 0 };
  for (let passLevel = 1; passLevel <= Math.max(0, Math.min(MOMENTUM_MAX_LEVEL, Math.floor(level))); passLevel += 1) {
    const reward = momentumPlusRewardForLevel(passLevel, tier, false);
    claimed.crimson += Number(reward.crimson || 0);
    claimed.adv += Number(reward.adv || 0);
    claimed.sauna += Number(reward.sauna || 0);
  }
  return claimed;
};

export const momentumClaimedRewards = (level: number, prime: boolean) => {
  const claimed = { mech: 0, sauna: 0, adv: 0 };
  for (let passLevel = 1; passLevel <= Math.max(0, Math.min(MOMENTUM_MAX_LEVEL, Math.floor(level))); passLevel += 1) {
    const reward = momentumRewardForLevel(passLevel, prime, false);
    claimed.mech += Number(reward.mech || 0);
    claimed.sauna += Number(reward.sauna || 0);
    claimed.adv += Number(reward.adv || 0);
  }
  return claimed;
};

// 메카베리는 동렙몹 마릿수가 285와 290에서 뛴다. 그 경계를 넘길 수 있을 때만 모아둘 값어치가 있다.
// 구간 안에서는 레벨당 1% 남짓이라, 기다리는 동안 진행이 굶어 오히려 도달일이 늦어진다.
export const MECH_TIER_BOUNDARIES = [285, 290];
export const mechHoldLevelForTarget = (targetLevel: number) => {
  const goal = Math.floor(targetLevel);
  const boundary = MECH_TIER_BOUNDARIES.filter(level => level < goal).pop();
  return boundary ?? 280;
};
// 남은 농장 입장권은 모멘텀 패스 PLUS 것뿐이다. 1차 메카베리는 8/20 오전 2시에 이미 소멸했다.
// PLUS 보상은 9/16 23:59 수령 · 9/17 오전 2시 사용 마감이라 계산 마지막 날인 9/16이 사용 한계다.
// 지난 날짜를 두면 모아쓰기가 즉시 풀리므로 기본값을 시즌 종료일에 고정한다.
export const MOMENTUM_MECH_DEADLINE = "2026-09-16";

const createDefaultSettings = (start = SSR_DEFAULT_START): Settings => {
  const ultimaProgress = ultimaProgressBefore(start);
  const momentumPass1Level = momentumUnlockedLevelOn(parseDate(start), MOMENTUM_PASS_1_START);
  const momentumPass2Level = momentumPlusUnlockedLevel(Math.floor((parseDate(start).getTime() - parseDate(MOMENTUM_PASS_2_START).getTime()) / (7 * 86400000)));
  // 이미 수령한 패스 보상은 아직 안 쓴 것으로 보고 보유 보상에 넣는다.
  // 1차 모멘텀 패스는 8/19 수령 마감, 8/20 오전 2시 사용 마감으로 완전히 끝났다.
  // 남아 있던 아이템도 소멸했으므로 보유 보상에 넣지 않는다. PLUS 수령분만 넘긴다.
  const claimed2 = momentumPlusClaimedRewards(momentumPass2Level, "prime");
  return ({
  targetLevel: 285, calcMode: "target", level: 280, exp: 87.39, start, pullWeeks: 0, pullStrategy: "monsterPark", specialSundayCount: 1, paidMonsterPark: true,
  specialSupply: false, specialSupplySaved: 0, specialSupplyExpPerCharge: 0,
  challengerPassLevel: 30, momentumPass1Enabled: false, momentumPass2Enabled: true,
  momentumPass1Level, momentumPass2Level,
  preLevel: 270, preExp: 0, prePassLevel: 30, preUnclaimed: false,
  preUseBlue: true, preUseSauna: true, preUseAdv: true, preUsePotion: true,
  preMonsterParkRuns: 2, preSpecialSundayCount: 1, preDailyQuests: true, preWeeklyContent: true,
  preTodayDaily: true, preWeeklyOpen: true,
  momentumMechLevel: mechHoldLevelForTarget(285), mechHoldAuto: true, momentumMechDeadline: MOMENTUM_MECH_DEADLINE, mayrinMesoGap: 3, mayrinNormalFrag: 30,
  fragPrice: 640, mpPerEok: 2500, postReset: true, challengerUnclaimed: false, challengerExp: true,
  momentumPrime1: true, momentumPrime2: true, momentumPremium2: true, deferMomentumMech: true,
  dailyCore6Enabled: true, dailyCore6Date: "2026-07-27", mpCore6Enabled: true, mpCore6Date: "2026-07-27", epicCore6Enabled: true, epicCore6Date: "2026-07-27",
  shardEvent: true, ultima: true, shopMech: true, shopBlue: true, mpCore5: 90,
  core20Date: "2026-07-23", core20Bonus: 5, mpCore6: 95,
  dailyCore5: 95, dailyCore6: 100, shardDate: "2026-07-30", shardAdv: 5000,
  ultimaCount: ultimaProgress.count, ultimaWeek: ultimaProgress.week, ultimaStart: true, grandis: true, weeklyOpen: true, todayDaily: true,
  extreme: true, epic: true, epicMult: 5, epicCore5: 30, core25Date: "2026-08-06",
  core25Bonus: 10, epicArtifactDate: "2026-08-13", epicArtifact: 180, epicCore6: 40,
  epicCore6Artifact: 190, ownedBlue: 0, ownedPotion279: 0,
  ownedMech: 0,
  ownedCrimson: claimed2.crimson,
  ownedSauna: claimed2.sauna,
  ownedAdv: claimed2.adv,
  customRewards: [],
  excludedExperienceSources: [],
  });
};
const defaults = createDefaultSettings();
export const core6MasterPatch = (enabled: boolean): Pick<Settings, "dailyCore6Enabled" | "mpCore6Enabled" | "epicCore6Enabled"> => ({
  dailyCore6Enabled: enabled,
  mpCore6Enabled: enabled,
  epicCore6Enabled: enabled,
});

const paidStrategyIds = PAID_STRATEGY_PRIORITY as readonly Exclude<PullStrategy, "both">[];
const paidStrategyCopy: Record<Exclude<PullStrategy, "both">, { label: string; caption: string }> = {
  monsterPark: { label: "평일 몬파", caption: "기본 2판 이후 유료 5판 우선" },
  mech: { label: "메카베리 구매", caption: "1개 10,000 메포 · 주당 최대 2개" },
  blue: { label: "블루베리 구매", caption: "1개 7,000 메포 · 주당 최대 2개" },
};
const pullStrategies: { id: PullStrategy; label: string; caption: string }[] = [
  ...paidStrategyIds.map(id => ({ id, ...paidStrategyCopy[id] })),
  { id: "both", label: "농장 둘 다", caption: "개별 구매 · 주당 각각 최대 2개" },
];

const viewTabs: { id: ViewTab; label: string; description: string }[] = [
  { id: "calculator", label: "285·290 계산", description: "달성일·몬파·메포" },
  { id: "pre280", label: "260→280", description: "버닝 비욘드" },
  { id: "efficiency", label: "경험치 효율", description: "레벨별 비교" },
  { id: "passes", label: "패스 보상", description: "전체 보상표" },
];

const pre280SettingKeys: (keyof Settings)[] = [
  "preLevel", "preExp", "prePassLevel", "preUnclaimed", "preUseBlue", "preUseSauna", "preUseAdv", "preUsePotion",
  "preMonsterParkRuns", "preSpecialSundayCount", "preDailyQuests", "preWeeklyContent", "preTodayDaily", "preWeeklyOpen",
  "challengerExp", "start", "mpCore5", "core20Date", "core20Bonus", "mpCore6Enabled", "mpCore6Date", "mpCore6",
  "dailyCore5", "dailyCore6Enabled", "dailyCore6Date", "dailyCore6", "epicCore5", "epicCore6Enabled", "epicCore6Date", "core25Date", "core25Bonus", "epicArtifactDate",
  "epicArtifact", "epicCore6", "epicCore6Artifact",
];
const selectedSettingsKey = (settings: Settings, keys: (keyof Settings)[]) => JSON.stringify(keys.map(key => settings[key]));

const nextThursdayAfter = (date: Date) => {
  const days = (4 - dayOfWeek(date) + 7) % 7;
  return addDays(date, days || 7);
};
const dateReached = (date: Date, value: string) => Boolean(value && date >= parseDate(value));
const core6Reached = (date: Date, enabled: boolean, value: string) => enabled && dateReached(date, value);
const eterionBonusesForDate = (s: Settings, date: Date) => {
  const dailyCore6 = core6Reached(date, s.dailyCore6Enabled, s.dailyCore6Date);
  const mpCore6 = core6Reached(date, s.mpCore6Enabled, s.mpCore6Date);
  const epicCore6 = core6Reached(date, s.epicCore6Enabled, s.epicCore6Date);
  const artifact = dateReached(date, s.epicArtifactDate);
  return {
    daily: dailyCore6 ? s.dailyCore6 : s.dailyCore5,
    mp: (mpCore6 ? s.mpCore6 : s.mpCore5) + (dateReached(date, s.core20Date) ? s.core20Bonus : 0),
    epic: (epicCore6 ? (artifact ? s.epicCore6Artifact : s.epicCore6) : (artifact ? s.epicArtifact : s.epicCore5))
      + (dateReached(date, s.core25Date) ? s.core25Bonus : 0),
  };
};

type EfficiencyBenchmark = {
  id: string;
  label: string;
  iconSrc: string;
  tone: string;
  base: number;
  minimumLevel?: number;
  costMultiplier?: (level: number) => number;
  raw?: (level: number) => number;
  monsterParkSundayBonus?: number;
};
export const EFFICIENCY_LEVEL_MIN = 260;
export const EFFICIENCY_LEVEL_MAX = 295;
export const TARGET_LEVEL_MIN = 285;
// 목표는 현재 레벨보다 항상 높아야 한다. 286에서 285를 목표로 두면 조언도 계산도 뜻이 없어진다.
export const clampTargetLevel = (targetLevel: number, currentLevel: number) =>
  Math.max(Math.min(TARGET_LEVEL_MAX, Math.floor(currentLevel) + 1), Math.min(TARGET_LEVEL_MAX, Math.max(TARGET_LEVEL_MIN, Math.floor(targetLevel))));
export const TARGET_LEVEL_MAX = 295;
export const epicDungeonEfficiencyCostMultiplier = (level: number) => level < 270 ? 5 / 3 : level < 280 ? 5 / 4 : 1;
export const epicDungeonIconForLevel = (level: number) => level < 270
  ? "/efficiency-icons/high-mountain.png"
  : level < 280
    ? "/efficiency-icons/angler-company.png"
    : "/efficiency-icons/nightmare-paradise.png";
const LEGACY_MONSTER_PARK_BONUS_PERCENT = 86;
export const adjustMonsterParkEfficiencyForBonus = (legacyScore: number, sundayBonus: number, monsterParkBonusPercent: number) =>
  legacyScore * (1 + monsterParkBonusPercent / 100 + sundayBonus) / (1 + LEGACY_MONSTER_PARK_BONUS_PERCENT / 100 + sundayBonus);
const momentumRaw = (level: number) => efficiency[level].mech * 11 + efficiency[level].sauna * 1.5 + efficiency[level].adv100 * 95;
const efficiencyBenchmarks: EfficiencyBenchmark[] = [
  { id: "extra50", label: "추가 경험치 50%", iconSrc: "/efficiency-icons/extra-exp-50.png", tone: "lime", base: 1139.8 },
  { id: "mpSpecial", label: "몬스터파크 · 스페셜 선데이 추가 5판", iconSrc: "/efficiency-icons/monster-park.png", tone: "gold", base: 820.1, raw: level => paidMonsterParkExperience(efficiency[level].mp7) * 4, monsterParkSundayBonus: 3 },
  { id: "momentum", label: "프라임 모멘텀 패스", iconSrc: "/efficiency-icons/prime-momentum-pass.png", tone: "violet", base: 566.5, minimumLevel: 280, raw: momentumRaw },
  { id: "epic01", label: "악몽선경 · 0→1단계", iconSrc: "/efficiency-icons/nightmare-paradise.png", tone: "indigo", base: 466.9, costMultiplier: epicDungeonEfficiencyCostMultiplier, raw: level => efficiency[level].epic * 4 },
  { id: "mpSunday", label: "몬스터파크 · 선데이 추가 5판", iconSrc: "/efficiency-icons/monster-park.png", tone: "pink", base: 398.2, raw: level => paidMonsterParkExperience(efficiency[level].mp7) * 1.5, monsterParkSundayBonus: 0.5 },
  { id: "mpNormal", label: "몬스터파크 · 일반 추가 5판", iconSrc: "/efficiency-icons/monster-park.png", tone: "blue", base: 313.9, raw: level => paidMonsterParkExperience(efficiency[level].mp7), monsterParkSundayBonus: 0 },
  { id: "mech", label: "메카베리 농장", iconSrc: "/efficiency-icons/mekaberry.png", tone: "amber", base: 312.6, minimumLevel: 280, raw: level => efficiency[level].mech },
  { id: "blue", label: "블루베리 농장", iconSrc: "/efficiency-icons/blueberry.png", tone: "cyan", base: 294.3, raw: level => efficiency[level].blue },
  { id: "smallExpPotion", label: "소경축비", iconSrc: "/efficiency-icons/small-exp-potion.png", tone: "mint", base: 175.4 },
  { id: "epic12", label: "악몽선경 · 1→2단계", iconSrc: "/efficiency-icons/nightmare-paradise.png", tone: "slate", base: 118.7, costMultiplier: epicDungeonEfficiencyCostMultiplier, raw: level => efficiency[level].epic },
  { id: "sauna", label: "VIP 사우나", iconSrc: "/efficiency-icons/vip-sauna.png", tone: "rose", base: 100, raw: level => efficiency[level].sauna },
];
export const epicDungeonLabelForLevel = (level: number, stage: "01" | "12") => {
  const dungeon = level < 270 ? "하이마운틴" : level < 280 ? "앵글러 컴퍼니" : "악몽선경";
  return `${dungeon} · ${stage === "01" ? "0→1단계" : "1→2단계"}`;
};
const efficiencyLabelForLevel = (source: EfficiencyBenchmark, level: number) => {
  if (source.id !== "epic01" && source.id !== "epic12") return source.label;
  return epicDungeonLabelForLevel(level, source.id === "epic01" ? "01" : "12");
};
const efficiencyIconForLevel = (source: EfficiencyBenchmark, level: number) => source.id === "epic01" || source.id === "epic12"
  ? epicDungeonIconForLevel(level)
  : source.iconSrc;
// GitHub Pages는 /maple-285-planner/ 하위에 배포된다. JSX에 문자열로 박은 절대 경로는
// 번들러가 base를 붙여주지 않아 루트에서 404가 나므로 렌더할 때 직접 붙인다.
const ASSET_BASE = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/+$/, "");
export const assetUrl = (path: string) => `${ASSET_BASE}${path}`;
export const availableEfficiencySourceIdsForLevel = (level: number) => efficiencyBenchmarks
  .filter(source => level >= (source.minimumLevel ?? EFFICIENCY_LEVEL_MIN))
  .map(source => source.id);
const relativeEfficiencyScore = (source: EfficiencyBenchmark, level: number, monsterParkBonusPercent = LEGACY_MONSTER_PARK_BONUS_PERCENT) => {
  if (!source.raw) return source.base;
  const sourceChange = source.raw(level) / source.raw(281);
  const saunaChange = efficiency[level].sauna / efficiency[281].sauna;
  const legacyScore = source.base * sourceChange / saunaChange * (source.costMultiplier?.(level) ?? 1);
  return source.monsterParkSundayBonus === undefined
    ? legacyScore
    : adjustMonsterParkEfficiencyForBonus(legacyScore, source.monsterParkSundayBonus, monsterParkBonusPercent);
};
export const efficiencyScoreById = (sourceId: string, level: number, monsterParkBonusPercent = LEGACY_MONSTER_PARK_BONUS_PERCENT) => relativeEfficiencyScore(efficiencyBenchmarks.find(source => source.id === sourceId)!, level, monsterParkBonusPercent);
export const rankedEfficiencySourceIdsForLevel = (level: number, monsterParkBonusPercent = LEGACY_MONSTER_PARK_BONUS_PERCENT) => efficiencyBenchmarks
  .filter(source => level >= (source.minimumLevel ?? EFFICIENCY_LEVEL_MIN))
  .sort((a, b) => relativeEfficiencyScore(b, level, monsterParkBonusPercent) - relativeEfficiencyScore(a, level, monsterParkBonusPercent))
  .map(source => source.id);
const paidEfficiencySourceId: Record<Exclude<PullStrategy, "both">, string> = { monsterPark: "mpNormal", mech: "mech", blue: "blue" };
export const paidEfficiencyScore = (strategy: Exclude<PullStrategy, "both">, level: number, monsterParkBonusPercent = LEGACY_MONSTER_PARK_BONUS_PERCENT) => efficiencyScoreById(paidEfficiencySourceId[strategy], level, monsterParkBonusPercent);

const pre280Data: Record<number, { required: number; adv1000: number; sauna: number; blue: number }> = {
  260: { required: 1_731_919_984_062, adv1000: 22.416, sauna: 9.086, blue: 47.343 },
  261: { required: 1_749_239_183_902, adv1000: 22.514, sauna: 9.125, blue: 47.549 },
  262: { required: 1_766_731_575_741, adv1000: 22.607, sauna: 9.164, blue: 47.747 },
  263: { required: 1_784_398_891_498, adv1000: 22.699, sauna: 9.201, blue: 47.941 },
  264: { required: 1_802_242_880_412, adv1000: 22.827, sauna: 9.252, blue: 48.210 },
  265: { required: 2_342_915_744_535, adv1000: 19.754, sauna: 8.007, blue: 41.720 },
  266: { required: 2_366_344_901_980, adv1000: 19.827, sauna: 8.037, blue: 41.875 },
  267: { required: 2_390_008_350_999, adv1000: 19.898, sauna: 8.065, blue: 42.024 },
  268: { required: 2_413_908_434_508, adv1000: 19.999, sauna: 8.106, blue: 42.238 },
  269: { required: 2_438_047_518_853, adv1000: 20.066, sauna: 8.133, blue: 42.379 },
  270: { required: 5_412_465_491_853, adv1000: 10.165, sauna: 4.120, blue: 32.203 },
  271: { required: 5_466_590_146_771, adv1000: 10.213, sauna: 4.140, blue: 32.355 },
  272: { required: 5_521_256_048_238, adv1000: 10.243, sauna: 4.152, blue: 32.451 },
  273: { required: 5_576_468_608_720, adv1000: 10.273, sauna: 4.164, blue: 32.546 },
  274: { required: 5_632_233_294_807, adv1000: 10.318, sauna: 4.182, blue: 32.689 },
  275: { required: 11_377_111_255_510, adv1000: 5.741, sauna: 2.327, blue: 18.188 },
  276: { required: 12_514_822_381_061, adv1000: 5.285, sauna: 2.142, blue: 16.743 },
  277: { required: 13_766_304_619_167, adv1000: 4.872, sauna: 1.975, blue: 15.435 },
  278: { required: 15_142_935_081_083, adv1000: 4.484, sauna: 1.818, blue: 14.206 },
  279: { required: 16_657_228_589_191, adv1000: 4.133, sauna: 1.675, blue: 13.093 },
  280: { required: 33_647_601_750_165, adv1000: 2.298, sauna: 0.931, blue: 6.482 },
};

type Pre280Content = { daily: number; extreme: number; epic: number; arcaneWeekly: number };
const pre280Content: Record<number, Pre280Content> = {
  260: { daily: 3.6049, extreme: 15.3125, epic: 15.0642, arcaneWeekly: 0.2709 },
  261: { daily: 3.5692, extreme: 15.2192, epic: 15.1323, arcaneWeekly: 0.2682 },
  262: { daily: 3.5338, extreme: 15.1262, epic: 15.1976, arcaneWeekly: 0.2656 },
  263: { daily: 3.4989, extreme: 15.0336, epic: 15.2544, arcaneWeekly: 0.2629 },
  264: { daily: 3.4643, extreme: 14.9414, epic: 15.3420, arcaneWeekly: 0.2603 },
  265: { daily: 3.4916, extreme: 14.9980, epic: 13.2741, arcaneWeekly: 0.2002 },
  266: { daily: 3.4570, extreme: 14.9055, epic: 13.3243, arcaneWeekly: 0.1983 },
  267: { daily: 3.4229, extreme: 14.8134, epic: 13.3723, arcaneWeekly: 0.1963 },
  268: { daily: 3.3889, extreme: 14.7217, epic: 13.4429, arcaneWeekly: 0.1944 },
  269: { daily: 3.3554, extreme: 14.6303, epic: 13.4862, arcaneWeekly: 0.1924 },
  270: { daily: 1.9409, extreme: 10.4758, epic: 10.2486, arcaneWeekly: 0.0867 },
  271: { daily: 1.9217, extreme: 10.4105, epic: 10.2953, arcaneWeekly: 0.0858 },
  272: { daily: 1.9026, extreme: 10.3455, epic: 10.3265, arcaneWeekly: 0.0850 },
  273: { daily: 1.8838, extreme: 10.2807, epic: 10.3560, arcaneWeekly: 0.0841 },
  274: { daily: 1.8651, extreme: 10.2162, epic: 10.4026, arcaneWeekly: 0.0833 },
  275: { daily: 1.2057, extreme: 6.5067, epic: 5.7879, arcaneWeekly: 0.0412 },
  276: { daily: 1.0961, extreme: 5.9897, epic: 5.3277, arcaneWeekly: 0.0375 },
  277: { daily: 0.9965, extreme: 5.5219, epic: 4.9120, arcaneWeekly: 0.0341 },
  278: { daily: 0.9059, extreme: 5.0822, epic: 4.5209, arcaneWeekly: 0.0310 },
  279: { daily: 0.8235, extreme: 4.6840, epic: 4.1667, arcaneWeekly: 0.0282 },
};

const pre280MonsterParkRawPerRun = (level: number) => {
  if (level >= 275) return 76_640_000_000;
  if (level >= 270) return 52_819_000_000;
  if (level >= 265) return 44_435_000_000;
  return 37_475_000_000;
};

Object.keys(pre280Content).map(Number).forEach(level => {
  const data = pre280Data[level];
  const content = pre280Content[level];
  efficiency[level] = {
    grandis: content.daily,
    mp7: pre280MonsterParkRawPerRun(level) * 7 / data.required * 100,
    extreme: content.extreme,
    epic: content.epic,
    adv100: data.adv1000 / 10,
    sauna: data.sauna,
    blue: data.blue,
    mech: 0,
  };
});

const ITEM_CONVERSION_LEVEL_MIN = 260;
const ITEM_CONVERSION_LEVEL_MAX = 295;
const ITEM_CONVERSION_UPPER_BOUND = ITEM_CONVERSION_LEVEL_MAX + 1;
const LEGENDARY_GROWTH_POTION_RAW = LEVEL_280_REQUIRED_EXP * 0.49505;
const itemConversionOrder: CustomRewardType[] = ["blue", "mech", "sauna", "potion279", "adv"];
const emptyItemConversionInventory = (): ItemConversionInventory => ({ adv: 0, mech: 0, blue: 0, sauna: 0, potion279: 0 });

export const itemConversionRequiredExperience = (level: number) => {
  if (level >= 280) return Number(REQUIRED_EXP[level] || 0n);
  return pre280Data[level]?.required || 0;
};

export const itemConversionRawExperience = (type: CustomRewardType, level: number) => {
  const required = itemConversionRequiredExperience(level);
  if (!required || !efficiency[level]) return 0;
  if (type === "potion279") return level < 280 ? required : LEGENDARY_GROWTH_POTION_RAW;
  if (type === "adv") return required * efficiency[level].adv100 / 10_000;
  if (type === "crimson") return level < 280 ? 0 : required * crimsonPercentForLevel(efficiency[level].mech, level) / 100;
  if (type === "mech" && level < 280) return 0;
  return required * efficiency[level][type] / 100;
};

// 보상 사용 조언. 같은 아이템도 레벨 구간에 따라 실제 획득 경험치가 달라진다.
// 메카베리는 285에서 동렙몹 마릿수가 33% 늘어 한 장 가치가 50% 뛰고, 블루베리는 280 이상이면 완전히 고정이다.
export const REWARD_ADVICE_ITEMS: { type: CustomRewardType; label: string; unit: string; perUnit: number }[] = [
  { type: "mech", label: "메카베리 농장", unit: "1장", perUnit: 1 },
  { type: "crimson", label: "크림슨 메카베리 농장", unit: "1장", perUnit: 1 },
  { type: "blue", label: "블루베리 농장", unit: "1장", perUnit: 1 },
  { type: "adv", label: "상급 EXP 교환권", unit: "1,000장", perUnit: 1000 },
  { type: "sauna", label: "VIP 사우나", unit: "1시간", perUnit: 1 },
];
export type RewardAdvice = { type: CustomRewardType; label: string; unit: string; nowRaw: number; bestLevel: number; bestRaw: number; gainPercent: number; blockedGainPercent: number; blockedLevel: number };
export const rewardUsageAdvice = (currentLevel: number, targetLevel: number): RewardAdvice[] => {
  const start = Math.max(EFFICIENCY_LEVEL_MIN, Math.min(EFFICIENCY_LEVEL_MAX, Math.floor(currentLevel)));
  const lastUsable = Math.max(start, Math.min(EFFICIENCY_LEVEL_MAX, targetLevel - 1));
  return REWARD_ADVICE_ITEMS.map(item => {
    const valueAt = (level: number) => itemConversionRawExperience(item.type, level) * item.perUnit;
    const nowRaw = valueAt(start);
    let bestLevel = start;
    let bestRaw = nowRaw;
    for (let level = start; level <= lastUsable; level += 1) {
      const value = valueAt(level);
      if (value > bestRaw * 1.0005) { bestRaw = value; bestLevel = level; }
    }
    // 목표를 넘겨야만 닿는 더 좋은 구간이 있으면 따로 알린다. 285를 목표로 하면 메카베리가 여기 걸린다.
    let blockedRaw = bestRaw;
    let blockedLevel = bestLevel;
    for (let level = lastUsable + 1; level <= EFFICIENCY_LEVEL_MAX; level += 1) {
      const value = valueAt(level);
      if (value > blockedRaw * 1.0005) { blockedRaw = value; blockedLevel = level; }
    }
    return {
      type: item.type, label: item.label, unit: item.unit, nowRaw, bestLevel, bestRaw,
      gainPercent: nowRaw > 0 ? (bestRaw / nowRaw - 1) * 100 : 0,
      blockedGainPercent: bestRaw > 0 ? (blockedRaw / bestRaw - 1) * 100 : 0,
      blockedLevel,
    };
  }).filter(advice => advice.nowRaw > 0);
};

export const itemConversionPercent = (type: CustomRewardType, level: number, amount = 1) => {
  const required = itemConversionRequiredExperience(level);
  return required ? itemConversionRawExperience(type, level) * Math.max(0, amount) / required * 100 : 0;
};

export function simulateItemInventoryConversion({ level, exp, inventory }: { level: number; exp: number; inventory: Partial<ItemConversionInventory> }): ItemConversionResult {
  const startLevel = Math.max(ITEM_CONVERSION_LEVEL_MIN, Math.min(ITEM_CONVERSION_LEVEL_MAX, Math.floor(level)));
  const startExp = Math.max(0, Math.min(99.999, Number(exp) || 0));
  let currentLevel = startLevel;
  let rawExperience = itemConversionRequiredExperience(currentLevel) * startExp / 100;
  let totalRawExperience = 0;
  const used = emptyItemConversionInventory();
  const remaining = emptyItemConversionInventory();
  itemConversionOrder.forEach(type => {
    const requested = Math.max(0, Number(inventory[type]) || 0);
    remaining[type] = type === "sauna" ? requested : Math.floor(requested);
  });

  const applyRawExperience = (amount: number) => {
    let rest = Math.max(0, amount);
    totalRawExperience += rest;
    while (rest > 1e-6 && currentLevel < ITEM_CONVERSION_UPPER_BOUND) {
      const required = itemConversionRequiredExperience(currentLevel);
      if (!required) break;
      const needed = Math.max(0, required - rawExperience);
      if (rest + 1e-6 < needed) {
        rawExperience += rest;
        rest = 0;
      } else {
        rest -= needed;
        currentLevel += 1;
        rawExperience = 0;
      }
    }
  };

  itemConversionOrder.forEach(type => {
    let quantity = remaining[type];
    let guard = 0;
    while (quantity > 1e-9 && currentLevel < ITEM_CONVERSION_UPPER_BOUND && guard < 64) {
      guard += 1;
      const rawPerUnit = itemConversionRawExperience(type, currentLevel);
      if (rawPerUnit <= 0) break;
      const required = itemConversionRequiredExperience(currentLevel);
      const needed = Math.max(0, required - rawExperience);
      if (type === "sauna") {
        const amount = Math.min(quantity, needed > 1e-6 ? needed / rawPerUnit : quantity);
        applyRawExperience(rawPerUnit * amount);
        quantity -= amount;
        used[type] += amount;
      } else {
        const count = Math.min(Math.floor(quantity), Math.max(1, Math.ceil(needed / rawPerUnit - 1e-12)));
        if (count <= 0) break;
        applyRawExperience(rawPerUnit * count);
        quantity -= count;
        used[type] += count;
      }
    }
    remaining[type] = Math.max(0, quantity);
  });

  const required = itemConversionRequiredExperience(currentLevel);
  return {
    startLevel,
    startExp,
    level: currentLevel,
    exp: required ? rawExperience / required * 100 : 0,
    totalRawExperience,
    used,
    remaining,
    reachedUpperLimit: currentLevel >= ITEM_CONVERSION_UPPER_BOUND,
  };
}

export const formatItemConversionExperience = (raw: number) => {
  if (raw >= 1_000_000_000_000) return `${(raw / 1_000_000_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}조 EXP`;
  return `${(raw / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억 EXP`;
};

function simulatePre280(s: Settings): Pre280Simulation {
  let level = Math.max(260, Math.min(279, Math.floor(s.preLevel)));
  let xp = pre280Data[level].required * Math.max(0, Math.min(99.999, s.preExp)) / 100;
  let passLevel = Math.max(0, Math.min(30, Math.floor(s.prePassLevel)));
  const inventory: Pre280Inventory = { blue: 0, sauna: 0, adv: 0, potion279: 0 };
  const used: Pre280Inventory = { blue: 0, sauna: 0, adv: 0, potion279: 0 };
  const rows: Pre280Row[] = [];
  const start = parseDate(s.start);
  let rewardDate = s.preUnclaimed ? start : nextThursdayAfter(start);
  const end = parseDate("2026-09-16");
  let reached: Date | null = null;
  let monsterParkMaplePoints = 0;
  let dailyDays = 0;
  let monsterParkRuns = 0;
  let weeklyCount = 0;
  let sundaysSeen = 0;
  const copyInventory = (value: Pre280Inventory): Pre280Inventory => ({ ...value });
  const rawFor = (type: keyof Pre280Inventory, unit: number) => {
    const data = pre280Data[Math.min(280, level)];
    if (type === "adv") return data.required * data.adv1000 / 100 / 1000 * unit;
    if (type === "sauna") return data.required * data.sauna / 100 * unit;
    if (type === "blue") return data.required * data.blue / 100 * unit;
    return growthPotionExperience(data.required);
  };
  const rawAt280 = (type: keyof Pre280Inventory, unit: number) => {
    const data = pre280Data[280];
    if (type === "adv") return data.required * data.adv1000 / 100 / 1000 * unit;
    if (type === "sauna") return data.required * data.sauna / 100 * unit;
    if (type === "blue") return data.required * data.blue / 100 * unit;
    return pre280Data[279].required;
  };
  const applyRaw = (initialRaw: number) => {
    const result = advanceBurningBeyondExperience({
      level,
      experience: xp,
      gainedExperience: initialRaw,
      requiredExperience: (targetLevel: number) => pre280Data[targetLevel].required,
    });
    level = result.level;
    xp = result.experience;
  };
  const applyCurrentPercent = (percent: number) => {
    if (level >= 280 || !pre280Data[level]) return;
    applyRaw(pre280Data[level].required * percent / 100);
  };
  const bonusesForDate = (date: Date) => {
    return eterionBonusesForDate(s, date);
  };
  const consumeAvailableRewards = () => {
    while (level < 280) {
      const candidates: { type: keyof Pre280Inventory; unit: number; ratio: number; priority: number }[] = [];
      if (s.preUsePotion && inventory.potion279 >= 1) candidates.push({ type: "potion279", unit: 1, ratio: 1, priority: 4 });
      if (s.preUseBlue && inventory.blue >= 1) candidates.push({ type: "blue", unit: 1, ratio: rawFor("blue", 1) / rawAt280("blue", 1), priority: 3 });
      if (s.preUseAdv && inventory.adv >= 1) {
        const perCoupon = rawFor("adv", 1);
        const toNextBurningLevel = Math.max(1, Math.ceil((pre280Data[level].required - xp) / perCoupon));
        const couponBatch = Math.min(inventory.adv, toNextBurningLevel);
        candidates.push({ type: "adv", unit: couponBatch, ratio: perCoupon / rawAt280("adv", 1), priority: 2 });
      }
      if (s.preUseSauna && inventory.sauna >= 0.5) candidates.push({ type: "sauna", unit: 0.5, ratio: rawFor("sauna", 0.5) / rawAt280("sauna", 0.5), priority: 1 });
      if (!candidates.length) break;
      candidates.sort((a, b) => b.ratio - a.ratio || b.priority - a.priority);
      const choice = candidates[0];
      const raw = rawFor(choice.type, choice.unit);
      inventory[choice.type] -= choice.unit;
      used[choice.type] += choice.unit;
      applyRaw(raw);
    }
  };
  let checkpointLevel = level;
  let checkpointExp = xp / pre280Data[level].required * 100;
  let checkpointUsed = copyInventory(used);
  let pendingDailyDays = 0;
  let pendingRuns = 0;

  for (let day = 0; day <= 90 && level < 280; day += 1) {
    const date = addDays(start, day);
    if (date > end) break;
    const events: string[] = [];

    if (passLevel < 30 && date.getTime() === rewardDate.getTime()) {
      const from = passLevel + 1;
      const to = Math.min(30, passLevel + 5);
      for (let current = from; current <= to; current += 1) {
        const reward = challengerRewardForLevel(current, s.challengerExp);
        inventory.blue += Number(reward.blue || 0);
        inventory.sauna += Number(reward.sauna || 0);
        inventory.adv += Number(reward.adv || 0);
        inventory.potion279 += Number(reward.potion279 || 0);
      }
      passLevel = to;
      consumeAvailableRewards();
      events.push(`챌섭 패스 ${from}~${to}레벨`);
      rewardDate = rewardDate.getTime() === start.getTime() ? nextThursdayAfter(start) : addDays(rewardDate, 7);
    }

    const weeklyDate = (day === 0 && s.preWeeklyOpen) || (day > 0 && dayOfWeek(date) === 4);
    if (s.preWeeklyContent && weeklyDate && level < 280) {
      const bonuses = bonusesForDate(date);
      applyCurrentPercent(pre280Content[level].extreme * (1 + bonuses.mp / 100));
      if (level < 280) applyCurrentPercent(pre280Content[level].epic * (1 + bonuses.epic / 100));
      if (level < 280) applyCurrentPercent(pre280Content[level].arcaneWeekly);
      weeklyCount += 1;
      events.push("익몬 · 최고 에픽던전 · 아케인 주간");
    }

    const dailyOpen = day > 0 || s.preTodayDaily;
    if (dailyOpen && level < 280) {
      const bonuses = bonusesForDate(date);
      const runs = Math.max(0, Math.min(7, Math.floor(s.preMonsterParkRuns)));
      if (runs > 0) {
        const isSunday = dayOfWeek(date) === 0;
        const isSpecialSunday = isSunday && sundaysSeen < Math.max(0, Math.floor(s.preSpecialSundayCount));
        if (isSunday) sundaysSeen += 1;
        const sundayBonus = isSpecialSunday ? 3 : isSunday ? 0.5 : 0;
        let completedRuns = 0;
        while (completedRuns < runs && level < 280) {
          applyRaw(pre280MonsterParkRawPerRun(level) * (1 + bonuses.mp / 100 + sundayBonus));
          completedRuns += 1;
        }
        monsterParkMaplePoints += paidMonsterParkMaplePoints(completedRuns);
        monsterParkRuns += completedRuns;
        pendingRuns += completedRuns;
      }
      if (s.preDailyQuests && level < 280) {
        applyCurrentPercent(pre280Content[level].daily * (1 + bonuses.daily / 100));
        dailyDays += 1;
        pendingDailyDays += 1;
      }
    }

    if (level >= 280) reached = date;
    const isLastDay = date.getTime() === end.getTime();
    if (events.length || reached || isLastDay) {
      const labels = [...events];
      if (pendingDailyDays) labels.push(`일퀘 ${pendingDailyDays}일`);
      if (pendingRuns) labels.push(`몬파 ${pendingRuns}판`);
      rows.push({
        date,
        label: labels.join(" · ") || "콘텐츠 누적",
        beforeLevel: checkpointLevel,
        beforeExp: checkpointExp,
        level,
        exp: xp / pre280Data[level].required * 100,
        used: {
          blue: used.blue - checkpointUsed.blue,
          sauna: used.sauna - checkpointUsed.sauna,
          adv: used.adv - checkpointUsed.adv,
          potion279: used.potion279 - checkpointUsed.potion279,
        },
      });
      checkpointLevel = level;
      checkpointExp = xp / pre280Data[level].required * 100;
      checkpointUsed = copyInventory(used);
      pendingDailyDays = 0;
      pendingRuns = 0;
    }
  }

  return {
    reached,
    level,
    exp: xp / pre280Data[level].required * 100,
    passLevel,
    inventory,
    used,
    rows,
    monsterParkMaplePoints,
    dailyDays,
    monsterParkRuns,
    weeklyCount,
  };
}

function simulate(s: Settings, schedule: { sevenUntil?: Date; fixedRuns?: number; deferMomentumMech?: boolean; shopBlueCount?: number; shopMechCount?: number } = {}): Simulation {
  const start = parseDate(s.start);
  const excludedExperienceSources = normalizeExcludedExperienceSources(s.excludedExperienceSources);
  const customRewards = normalizeCustomRewards(s.customRewards, s.start);
  const sourceEnabled = (id: ExperienceSourceId) => !excludedExperienceSources.includes(id);
  const forecastMode = s.calcMode === "forecast";
  const forecastEnd = parseDate("2026-09-16");
  const targetLevel = forecastMode ? 296 : clampTargetLevel(s.targetLevel, s.level);
  const horizonDays = forecastMode ? Math.max(0, Math.floor((forecastEnd.getTime() - start.getTime()) / 86400000) + 1) : 120;
  let level = Math.max(280, Math.min(targetLevel - 1, s.level));
  let xp = req(level) * Math.max(0, Math.min(99.999, s.exp)) / 100;
  const carcionActive = (date: Date, currentLevel = level) => carcionContentActive(date, s.start, currentLevel);
  const selectedCutoff = addDays(start, -1);
  const sevenUntil = schedule.sevenUntil ?? selectedCutoff;
  const requestedFixedRuns = schedule.fixedRuns == null ? null : Math.max(0, Math.min(7, schedule.fixedRuns));
  const fixedRuns = sourceEnabled("monsterPark") ? (s.paidMonsterPark ? requestedFixedRuns : 2) : 0;
  const specialSundayCount = Math.max(0, Math.min(12, Math.floor(s.specialSundayCount)));
  const specialSupplyStart = parseDate(SPECIAL_SUPPLY_START);
  const specialSupplyEnd = parseDate(SPECIAL_SUPPLY_END);
  let specialSupplySaved = s.specialSupply ? Math.max(0, Math.min(SPECIAL_SUPPLY_BATCH_SIZE, Math.floor(s.specialSupplySaved))) : 0;
  let specialSupplyUsed = 0;
  const runsForDate = (date: Date) => fixedRuns == null ? (dayOfWeek(date) === 0 ? 7 : date <= sevenUntil ? 7 : 2) : fixedRuns;
  const scheduleLabel = !sourceEnabled("monsterPark") ? "몬스터파크 제외" : !s.paidMonsterPark ? "매일 기본 2판" : fixedRuns == null
    ? sevenUntil < start ? "평일 2판 · 일요일 7판" : `${shortDate(sevenUntil)}까지 7판 · 이후 평일 2판`
    : `매일 ${fixedRuns}판`;
  const deferMomentumMech = schedule.deferMomentumMech ?? s.deferMomentumMech;
  const momentumMechLevel = Math.max(280, Math.min(targetLevel - 1, s.momentumMechLevel));
  const momentumMechDeadline = s.momentumMechDeadline ? parseDate(s.momentumMechDeadline) : parseDate(MOMENTUM_MECH_DEADLINE);
  const rows: Row[] = [];
  const rewardDays = new Map<string, Reward[]>();

  const addReward = (date: Date, reward: Reward) => {
    const key = iso(date);
    if (!rewardDays.has(key)) rewardDays.set(key, []);
    reward.remaining = emptyLeftovers();
    itemTypes.forEach(type => { reward.remaining![type] = Math.max(0, Number(reward[type] || 0)); });
    reward.date = key;
    reward.purchased = false;
    rewardDays.get(key)!.push(reward);
  };

  let challengerLevel = Math.max(0, Math.min(30, Math.floor(s.challengerPassLevel)));
  let challengerDate = s.challengerUnclaimed ? start : nextThursdayAfter(start);
  const challengerEnd = parseDate("2026-09-16");
  while (challengerLevel < 30 && challengerDate <= challengerEnd) {
    const from = challengerLevel + 1;
    const to = Math.min(30, challengerLevel + 5);
    const batch: Reward = { label: `챌섭 패스 ${from}~${to}레벨` };
    for (let passLevel = from; passLevel <= to; passLevel += 1) {
      const reward = challengerRewardForLevel(passLevel, s.challengerExp);
      batch.blue = Number(batch.blue || 0) + Number(reward.blue || 0);
      batch.sauna = Number(batch.sauna || 0) + Number(reward.sauna || 0);
      batch.adv = Number(batch.adv || 0) + Number(reward.adv || 0);
      batch.potion279 = Number(batch.potion279 || 0) + Number(reward.potion279 || 0);
    }
    addReward(challengerDate, batch);
    challengerLevel = to;
    challengerDate = challengerDate.getTime() === start.getTime() ? nextThursdayAfter(start) : addDays(challengerDate, 7);
  }

  const scheduleMomentumSeason = (season: 1 | 2, currentLevel: number, prime: boolean, startValue: string, endValue: string, plusTier: MomentumTier = "free") => {
    // 이번 주까지는 기존 모멘텀 패스, 8/20부터는 모멘텀 패스 PLUS 구조다.
    const isPlus = season === 2;
    let momentumLevel = Math.max(0, Math.min(10, Math.floor(currentLevel)));
    const momentumStart = parseDate(startValue);
    const momentumEnd = parseDate(endValue);
    let rewardDate = start <= momentumStart ? momentumStart : start;
    while (momentumLevel < MOMENTUM_MAX_LEVEL && rewardDate <= momentumEnd) {
      // 주차는 계산 시작일이 아니라 패스 시작일 기준으로 쌓인다.
      // 밀린 주차가 있으면 그때까지 열린 만큼 한 번에 따라잡는다.
      const elapsedWeeks = Math.floor((rewardDate.getTime() - momentumStart.getTime()) / (7 * 86400000));
      const unlocked = isPlus ? momentumPlusUnlockedLevel(elapsedWeeks) : momentumUnlockedLevelOn(rewardDate, startValue);
      if (unlocked > momentumLevel) {
        const from = momentumLevel + 1;
        const to = unlocked;
        const batch: Reward = { label: `${isPlus ? "모멘텀 PLUS" : `모멘텀 ${season}차`} ${from}~${to}레벨`, deferMech: deferMomentumMech };
        for (let passLevel = from; passLevel <= to; passLevel += 1) {
          const reward = isPlus
            ? momentumPlusRewardForLevel(passLevel, plusTier, deferMomentumMech)
            : momentumRewardForLevel(passLevel, prime, deferMomentumMech);
          batch.mech = Number(batch.mech || 0) + Number(reward.mech || 0);
          batch.crimson = Number(batch.crimson || 0) + Number(reward.crimson || 0);
          batch.sauna = Number(batch.sauna || 0) + Number(reward.sauna || 0);
          batch.adv = Number(batch.adv || 0) + Number(reward.adv || 0);
          batch.coupon4x = Number(batch.coupon4x || 0) + Number(reward.coupon4x || 0);
        }
        addReward(rewardDate, batch);
        momentumLevel = to;
      }
      rewardDate = rewardDate.getTime() === start.getTime() ? nextThursdayAfter(start) : addDays(rewardDate, 7);
    }
  };
  if (s.momentumPass1Enabled) scheduleMomentumSeason(1, s.momentumPass1Level, s.momentumPrime1, MOMENTUM_PASS_1_START, MOMENTUM_PASS_1_END);
  if (s.momentumPass2Enabled) scheduleMomentumSeason(2, s.momentumPass2Level, s.momentumPrime2, MOMENTUM_PASS_2_START, MOMENTUM_PASS_2_END, s.momentumPrime2 ? "prime" : s.momentumPremium2 ? "premium" : "free");
  if (s.shardEvent && s.shardDate) {
    const shardRewardDate = parseDate(s.shardDate);
    if (shardRewardDate >= start) addReward(shardRewardDate, { label: "울티마 스쿼드 상점 EXP 5,000장 (예상)", adv: s.shardAdv });
  }

  let ultimaLastScheduled = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    let weekUsed = Math.max(0, Math.min(5, Math.floor(s.ultimaWeek)));
    const ultimaEnd = parseDate("2026-09-16");
    const saunaMilestones = new Set([2, 7, 12, 17, 22, 27, 32, 37, 42, 51, 56]);
    for (let day = 0; day < 120 && ultimaLastScheduled < 60; day += 1) {
      const date = addDays(start, day);
      if (date > ultimaEnd) break;
      if (day > 0 && dayOfWeek(date) === 4) weekUsed = 0;
      if ((day === 0 && !s.ultimaStart) || weekUsed >= 5) continue;
      ultimaLastScheduled += 1;
      weekUsed += 1;
      const reward: Reward = { label: `울티마 ${ultimaLastScheduled}회`, sourceLabel: "울티마 작전 일지", attendanceReward: true, attendanceCount: ultimaLastScheduled, coupon3x: 3 };
      if (saunaMilestones.has(ultimaLastScheduled)) reward.sauna = 0.5;
      if (ultimaLastScheduled === 25 || ultimaLastScheduled === 45) reward.potion269 = 1;
      if ([47, 52, 57].includes(ultimaLastScheduled)) reward.adv = 2000;
      if (ultimaLastScheduled === 60) reward.potion279 = 1;
      addReward(date, reward);
    }
  }

  const availableShopWeeks = availableShopWeeksForStart(start);
  const availableShopItemCount = availableShopWeeks.length * SHOP_WEEKLY_ITEM_LIMIT;
  const shopBlueCount = Math.max(0, Math.min(availableShopItemCount, Math.floor(schedule.shopBlueCount ?? (s.shopBlue ? availableShopItemCount : 0))));
  const shopMechCount = Math.max(0, Math.min(availableShopItemCount, Math.floor(schedule.shopMechCount ?? (s.shopMech ? availableShopItemCount : 0))));
  const shopBlueDistribution = distributeShopPurchaseCount(shopBlueCount, availableShopWeeks.length);
  const shopMechDistribution = distributeShopPurchaseCount(shopMechCount, availableShopWeeks.length);
  if (shopBlueCount || shopMechCount) {
    availableShopWeeks.forEach(({ weekStart, originalIndex }, index) => {
      const buyBlueCount = shopBlueDistribution[index];
      const buyMechCount = shopMechDistribution[index];
      if (!buyBlueCount && !buyMechCount) return;
      const purchaseLabel = [buyMechCount ? `메카 ${buyMechCount}개` : "", buyBlueCount ? `블루 ${buyBlueCount}개` : ""].filter(Boolean).join(" · ");
      addReward(weekStart < start ? start : weekStart, {
        label: `메포샵 ${originalIndex + 1}주차 · ${purchaseLabel}`, blue: buyBlueCount, mech: buyMechCount,
        maplePoints: buyBlueCount * SHOP_BLUE_UNIT_PRICE + buyMechCount * SHOP_MECH_UNIT_PRICE, optionalPurchase: true,
      });
    });
  }
  customRewards.forEach(customReward => {
    const requestedDate = parseDate(customReward.useDate);
    const useDate = requestedDate < start ? start : requestedDate;
    const meta = CUSTOM_REWARD_META[customReward.type];
    const reward: Reward = {
      label: `직접 추가 · ${meta.label} ${customReward.amount.toLocaleString("ko-KR")}${meta.unit}`,
      sourceLabel: "직접 추가 보상",
    };
    reward[customReward.type] = customReward.amount;
    // 날짜를 직접 고른 메카베리는 전역 모아쓰기 규칙으로 다시 미루지 않는다.
    addReward(useDate, reward);
  });
  // 보유 메카베리도 모아쓰기를 따른다. 먼저 쓸 이유가 없다.
  addReward(start, { label: "현재 보유분", blue: s.ownedBlue, mech: s.ownedMech, crimson: s.ownedCrimson, sauna: s.ownedSauna, adv: s.ownedAdv, potion279: s.ownedPotion279, deferMech: deferMomentumMech });

  const forecastCapExp = () => req(295) * 0.99999;
  const atForecastCap = () => forecastMode && level >= 295 && xp >= forecastCapExp() - 1e-12;
  const applyRaw = (initialRaw: number) => {
    let raw = initialRaw;
    let guard = 0;
    while (raw > 0.000000000001 && level < targetLevel && !atForecastCap() && guard < 16) {
      guard += 1;
      if (forecastMode && level === 295) {
        xp = Math.min(forecastCapExp(), xp + raw);
        raw = 0;
        continue;
      }
      const remaining = req(level) - xp;
      if (remaining <= 0.000000000001) { level += 1; xp = 0; continue; }
      if (raw + 0.000000000001 < remaining) { xp += raw; raw = 0; } else { raw = Math.max(0, raw - remaining); level += 1; xp = 0; }
    }
  };
  const applyPercent = (percent: number) => { if (level < targetLevel && efficiency[level]) applyRaw(req(level) * percent / 100); };
  const applyItems = (type: "blue" | "mech" | "crimson" | "sauna" | "adv", count: number) => {
    let remaining = type === "sauna" ? Math.max(0, Number(count || 0)) : Math.max(0, Math.floor(count || 0));
    let used = 0;
    if (type === "sauna") {
      let guard = 0;
      while (remaining > 0.0000001 && level < targetLevel && !atForecastCap() && guard < 16) {
        guard += 1;
        const rawPerHour = level >= 291
          ? rawToNormalized(POST_290_EFFICIENCY_RAW[level].sauna)
          : level >= 285 ? rawToNormalized(WEEKLY_CONTENT_RAW[level].sauna) : req(level) * efficiency[level].sauna / 100;
        const required = req(level) - xp;
        if (required <= 0.000000000001) { level += 1; xp = 0; continue; }
        const hours = Math.min(remaining, required / rawPerHour);
        if (hours <= 0.000000000001) break;
        applyRaw(rawPerHour * hours); remaining -= hours; used += hours;
      }
      return used;
    }
    if (type === "adv") {
      let guard = 0;
      while (remaining > 0 && level < targetLevel && !atForecastCap() && guard < 16) {
        guard += 1;
        const rawPerCoupon = level >= 291
          ? rawToNormalized(POST_290_EFFICIENCY_RAW[level].adv100) / 100
          : level >= 285 ? rawToNormalized(WEEKLY_CONTENT_RAW[level].adv1000) / 1000 : req(level) * efficiency[level].adv100 / 10000;
        const required = Math.max(0, req(level) - xp);
        const couponBatch = Math.min(remaining, Math.max(1, Math.ceil(required / rawPerCoupon)));
        applyRaw(rawPerCoupon * couponBatch);
        remaining -= couponBatch;
        used += couponBatch;
      }
      return used;
    }
    while (remaining > 0 && level < targetLevel && !atForecastCap()) {
      const percent = type === "crimson" ? crimsonPercentForLevel(efficiency[level].mech, level) : efficiency[level][type];
      applyPercent(percent); remaining -= 1; used += 1;
    }
    return used;
  };
  const applyGrowthPotion = (type: "potion269" | "potion279", count: number) => {
    let remaining = Math.max(0, Math.floor(count || 0)); let used = 0;
    const raw = type === "potion279" ? 0.49505 : 0.072458;
    while (remaining > 0 && level < targetLevel && !atForecastCap()) { applyRaw(raw); remaining -= 1; used += 1; }
    return used;
  };

  let reached: Date | null = null;
  let reach285At: Date | null = null;
  let leftoversAt285: Leftovers | null = null;
  let leftoverSourcesAt285: string[] = [];
  let specialSupplySavedAt285: number | null = null;
  let shopMaplePoints = 0;
  let shopBluePurchased = 0;
  let shopMechPurchased = 0;
  let monsterParkMaplePoints = 0;
  let dailyDaysApplied = 0;
  let sundaysSeen = 0;
  const currentLeftovers = (cutoff: Date | null) => {
    const leftovers = emptyLeftovers();
    const sources: string[] = [];
    rewardDays.forEach(rewards => rewards.forEach(reward => {
      if (reward.optionalPurchase && !reward.purchased) return;
      if (reward.attendanceReward && cutoff && (reward.date || "") > iso(cutoff)) return;
      if (reward.remaining && itemTypes.some(type => reward.remaining![type] > 0)) sources.push(reward.sourceLabel || reward.label);
      if (reward.remaining) itemTypes.forEach(type => { leftovers[type] += reward.remaining![type] || 0; });
    }));
    return { leftovers, sources: [...new Set(sources)] };
  };
  const capture285 = (date: Date) => {
    if (reach285At || level < 285) return;
    reach285At = date;
    const snapshot = currentLeftovers(date);
    leftoversAt285 = snapshot.leftovers;
    leftoverSourcesAt285 = snapshot.sources;
    specialSupplySavedAt285 = specialSupplySaved;
  };
  capture285(start);
  const startingProgress = level + xp / req(level);
  for (let day = 0; day < horizonDays && (forecastMode || level < targetLevel); day += 1) {
    const date = addDays(start, day); const key = iso(date); const events: string[] = [];
    // 계산 근거 표시용. 그날 실제로 소비한 수량을 그대로 모은다.
    const usage: RowUsage = { blue: 0, mech: 0, crimson: 0, sauna: 0, adv: 0, potion: 0, runs: 0 };
    const contributions: ExperienceContribution[] = [];
    const currentProgress = () => level >= targetLevel ? targetLevel : level + xp / req(level);
    const recordContribution = (id: ExperienceSourceId, label: string, apply: () => void) => {
      if (!sourceEnabled(id)) return;
      const before = currentProgress();
      apply();
      const gain = (currentProgress() - before) * 100;
      if (gain <= 1e-10) return;
      const existing = contributions.find(contribution => contribution.id === id);
      if (existing) existing.gain += gain;
      else contributions.push({ id, label, gain });
    };
    (rewardDays.get(key) || []).forEach(reward => {
      if (reward.optionalPurchase && (level >= targetLevel || atForecastCap())) return;
      if (reward.optionalPurchase) {
        const blueCount = sourceEnabled("blue") ? Math.max(0, Math.floor(Number(reward.blue || 0))) : 0;
        const mechCount = sourceEnabled("mech") ? Math.max(0, Math.floor(Number(reward.mech || 0))) : 0;
        if (blueCount + mechCount === 0) return;
        reward.purchased = true;
        shopBluePurchased += blueCount;
        shopMechPurchased += mechCount;
        shopMaplePoints += blueCount * SHOP_BLUE_UNIT_PRICE + mechCount * SHOP_MECH_UNIT_PRICE;
        if (!sourceEnabled("blue")) reward.remaining!.blue = 0;
        if (!sourceEnabled("mech")) reward.remaining!.mech = 0;
      } else {
        shopMaplePoints += reward.maplePoints || 0;
      }
      const r = reward.remaining!;
      if (sourceEnabled("blue") && (reward.blue || 0) > 0) { let used = 0; recordContribution("blue", EXPERIENCE_SOURCE_LABELS.blue, () => { used = applyItems("blue", r.blue); }); r.blue -= used; usage.blue += used; }
      if (sourceEnabled("mech") && (reward.mech || 0) > 0 && (!reward.deferMech || level >= momentumMechLevel || date >= momentumMechDeadline)) { let used = 0; recordContribution("mech", EXPERIENCE_SOURCE_LABELS.mech, () => { used = applyItems("mech", r.mech); }); r.mech -= used; usage.mech += used; }
      if (sourceEnabled("mech") && (reward.crimson || 0) > 0 && (!reward.deferMech || level >= momentumMechLevel || date >= momentumMechDeadline)) { let used = 0; recordContribution("mech", EXPERIENCE_SOURCE_LABELS.mech, () => { used = applyItems("crimson", r.crimson); }); r.crimson -= used; usage.crimson += used; }
      if (sourceEnabled("sauna") && (reward.sauna || 0) > 0) { let used = 0; recordContribution("sauna", EXPERIENCE_SOURCE_LABELS.sauna, () => { used = applyItems("sauna", r.sauna); }); r.sauna -= used; usage.sauna += used; }
      if (sourceEnabled("potion") && (reward.potion269 || 0) > 0) { let used = 0; recordContribution("potion", EXPERIENCE_SOURCE_LABELS.potion, () => { used = applyGrowthPotion("potion269", r.potion269); }); r.potion269 -= used; usage.potion += used; }
      if (sourceEnabled("potion") && (reward.potion279 || 0) > 0) { let used = 0; recordContribution("potion", EXPERIENCE_SOURCE_LABELS.potion, () => { used = applyGrowthPotion("potion279", r.potion279); }); r.potion279 -= used; usage.potion += used; }
      if (sourceEnabled("adv") && (reward.adv || 0) > 0) { let used = 0; recordContribution("adv", EXPERIENCE_SOURCE_LABELS.adv, () => { used = applyItems("adv", r.adv); }); r.adv -= used; usage.adv += used; }
      capture285(date);
      const notableAttendance = reward.attendanceReward && (reward.sauna || reward.adv || reward.potion269 || reward.potion279);
      if ((!reward.attendanceReward && (reward.label !== "현재 보유분" || itemTypes.some(type => Number(reward[type] || 0) > 0))) || notableAttendance) events.push(reward.label);
    });

    if (s.specialSupply && date >= specialSupplyStart && date <= specialSupplyEnd) {
      // 시작일 보유 횟수에는 그날 충전분이 포함된 것으로 보고, 다음 날부터 하루 1회만 더합니다.
      if (date.getTime() !== start.getTime()) specialSupplySaved = Math.min(SPECIAL_SUPPLY_BATCH_SIZE, specialSupplySaved + 1);
      if (sourceEnabled("specialSupply") && specialSupplySaved >= SPECIAL_SUPPLY_BATCH_SIZE && level < targetLevel && !atForecastCap() && s.specialSupplyExpPerCharge > 0) {
        recordContribution("specialSupply", EXPERIENCE_SOURCE_LABELS.specialSupply, () => applyRaw(rawToNormalized(s.specialSupplyExpPerCharge * SPECIAL_SUPPLY_BATCH_SIZE)));
        specialSupplyUsed += SPECIAL_SUPPLY_BATCH_SIZE;
        specialSupplySaved = 0;
        events.push("특수 물자 5회 · 4배 쿠폰");
        capture285(date);
      }
    }

    const thursday = dayOfWeek(date) === 4;
    if ((thursday && day > 0) || (day === 0 && s.weeklyOpen)) {
      const eterion = eterionBonusesForDate(s, date);
      if (sourceEnabled("extreme") && s.extreme && level < targetLevel) {
        recordContribution("extreme", EXPERIENCE_SOURCE_LABELS.extreme, () => {
          if (level >= 285 && level <= 290) applyRaw(rawToNormalized(WEEKLY_CONTENT_RAW[level].extreme) * (1 + eterion.mp / 100));
          else if (level >= 291) applyRaw(rawToNormalized(POST_290_EFFICIENCY_RAW[level].extreme) * (1 + eterion.mp / 100));
          else if (level < 285) applyPercent(efficiency[level].extreme * (1 + eterion.mp / 100));
        });
      }
      if (sourceEnabled("epic") && s.epic && level < targetLevel) {
        recordContribution("epic", EXPERIENCE_SOURCE_LABELS.epic, () => {
          if (level >= 291) applyRaw(rawToNormalized(POST_290_EFFICIENCY_RAW[level].epic) * (s.epicMult + eterion.epic / 100));
          else if (level >= 285) applyRaw(rawToNormalized(WEEKLY_CONTENT_RAW[level].epic) * (s.epicMult + eterion.epic / 100));
          else applyPercent(efficiency[level].epic * (s.epicMult + eterion.epic / 100));
        });
      }
      capture285(date);
      const weeklyEvents = [sourceEnabled("extreme") && s.extreme ? "익몬" : "", sourceEnabled("epic") && s.epic ? "악몽선경" : ""].filter(Boolean);
      if (weeklyEvents.length) events.push(weeklyEvents.join(" · "));
    }

    if (level < targetLevel && !atForecastCap() && (day > 0 || s.todayDaily)) {
      dailyDaysApplied += 1;
      const dailyRuns = sourceEnabled("monsterPark") ? runsForDate(date) : 0;
      usage.runs += dailyRuns;
      monsterParkMaplePoints += paidMonsterParkMaplePoints(dailyRuns);
      const eterion = eterionBonusesForDate(s, date);
      const isSunday = dayOfWeek(date) === 0;
      const isSpecialSunday = isSunday && sundaysSeen < specialSundayCount;
      if (isSunday) sundaysSeen += 1;
      const sundayBonus = isSpecialSunday ? 3 : isSunday ? 0.5 : 0;
      if (dailyRuns > 0) recordContribution("monsterPark", EXPERIENCE_SOURCE_LABELS.monsterPark, () => {
        if (level >= 291) applyRaw(rawToNormalized(POST_290_EFFICIENCY_RAW[level].monsterParkPerRun * dailyRuns) * (1 + eterion.mp / 100 + sundayBonus));
        else if (level >= 285) applyRaw(rawToNormalized(monsterParkRawForLevel(level, carcionActive(date)) * dailyRuns) * (1 + eterion.mp / 100 + sundayBonus));
        else applyPercent(monsterParkExperiencePercent({
            baseSevenRunPercent: efficiency[level].mp7,
            runs: dailyRuns,
            contentBonusPercent: eterion.mp,
            sundayKind: isSpecialSunday ? "special" : isSunday ? "normal" : "none",
          }));
      });
      if (sourceEnabled("grandis") && s.grandis && level < targetLevel) {
        recordContribution("grandis", EXPERIENCE_SOURCE_LABELS.grandis, () => {
          if (level >= 285) applyRaw(rawToNormalized(grandisDailyRawForLevel(level, carcionActive(date))) * (1 + eterion.daily / 100));
          else applyPercent(efficiency[level].grandis * (1 + eterion.daily / 100));
        });
      }
      capture285(date);
    }

    if (sourceEnabled("mech") && deferMomentumMech && level < targetLevel && !atForecastCap() && (level >= momentumMechLevel || date >= momentumMechDeadline)) {
      rewardDays.forEach(rewards => rewards.forEach(reward => {
        if (!reward.deferMech || (reward.date || "") > key || !reward.remaining || (reward.remaining.mech <= 0 && reward.remaining.crimson <= 0) || level >= targetLevel) return;
        let usedMech = 0;
        let usedCrimson = 0;
        recordContribution("mech", EXPERIENCE_SOURCE_LABELS.mech, () => {
          usedCrimson = applyItems("crimson", reward.remaining!.crimson);
          usedMech = applyItems("mech", reward.remaining!.mech);
        });
        reward.remaining.crimson -= usedCrimson;
        reward.remaining.mech -= usedMech;
        usage.crimson += usedCrimson;
        usage.mech += usedMech;
        events.push(`${reward.label} ${usedCrimson > 0 ? "크림슨 메카베리" : "메카베리"} 사용`);
      }));
      capture285(date);
    }

    const progress = level >= targetLevel ? targetLevel : level + xp / req(level);
    rows.push({ date, key, level, exp: level >= targetLevel ? 0 : xp / req(level) * 100, progress, events, usage, contributions });
    capture285(date);
    if (!forecastMode && level >= targetLevel) reached = date;
  }

  const finalInventory = currentLeftovers(reached);
  const leftovers = finalInventory.leftovers;
  const leftoverSources = finalInventory.sources;
  let ultimaCountAtReach = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    const reachKey = reached ? iso(reached) : "9999-12-31";
    rewardDays.forEach(rewards => rewards.forEach(reward => { if (reward.attendanceReward && (reward.date || "") <= reachKey) ultimaCountAtReach = Math.max(ultimaCountAtReach, reward.attendanceCount || 0); }));
  }
  const finalProgress = rows[rows.length - 1]?.progress ?? startingProgress;
  const endReason: Simulation["endReason"] = reached ? "reached" : finalProgress <= startingProgress + 1e-12 ? "no-growth" : "horizon";
  const finalRow = rows[rows.length - 1];
  return { start, startLevel: s.level, startExp: s.exp, rows, reached, reach285At, leftoversAt285, leftoverSourcesAt285, specialSupplySavedAt285, leftovers, leftoverSources, shopMaplePoints, shopBluePurchased, shopMechPurchased, monsterParkMaplePoints, maplePoints: shopMaplePoints + monsterParkMaplePoints, scheduleLabel, sevenUntil, specialSundayCount, momentumMechLevel, momentumMechDeadline, dailyDaysApplied, ultimaCountAtReach, specialSupplySaved, specialSupplyUsed, horizonDays, finalLevel: finalRow?.level ?? level, finalExp: finalRow?.exp ?? (xp / req(level) * 100), endReason };
}

function weekStartThursday(date: Date) { return addDays(date, -((dayOfWeek(date) + 3) % 7)); }
function mayrinClearWeeks(reached: Date | null) {
  const end = parseDate("2026-09-16"); if (!reached || reached > end) return 0;
  return Math.floor((weekStartThursday(end).getTime() - weekStartThursday(reached).getTime()) / 604800000) + 1;
}

// 모아쓰기 시점은 두 힘의 줄다리기다. 레벨이 오르면 한 장 가치가 오르지만(레벨당 약 1.2%),
// 레벨을 일찍 올리면 그 뒤 매일 버는 경험치가 커진다. 285에서 몬파·일퀘가 카르시온으로,
// 290에서 탈라하트로 바뀌며 일일 수입이 크게 뛰기 때문에 경계가 앞에 있으면 즉시 쓰는 쪽이 이긴다.
// 공식으로 판단하지 않고 후보를 실제로 돌려 비교한다. 후보가 4개뿐이라 비용은 시뮬레이션 4회다.
export const MECH_HOLD_CANDIDATES = [280, 285, 290, 295];
export type MechHoldOption = { level: number; reached: Date | null; progress: number; best: boolean };
export type MechHoldAnalysis = { best: number; options: MechHoldOption[]; gainOverImmediate: number };
// 후보를 실제로 돌려 비교한다. 화면에도 같은 표를 보여줘야 판단 근거가 드러난다.
export const mechHoldAnalysis = (settings: Settings): MechHoldAnalysis => {
  const forecastMode = settings.calcMode === "forecast";
  // simulate 는 사용 레벨을 목표 바로 아래로 자른다. 선택기도 같은 상한을 봐야 고른 값이 그대로 쓰인다.
  const ceiling = forecastMode ? TARGET_LEVEL_MAX : clampTargetLevel(settings.targetLevel, settings.level) - 1;
  const candidates = MECH_HOLD_CANDIDATES.map(level => Math.min(level, ceiling)).filter((level, index, list) => list.indexOf(level) === index).filter(level => level === 280 || level > settings.level);
  const options = candidates.map(level => {
    const result = simulate({ ...settings, momentumMechLevel: level, shopMech: false, shopBlue: false }, { fixedRuns: 7 });
    const lastRow = result.rows[result.rows.length - 1];
    return { level, reached: forecastMode ? null : result.reached, progress: lastRow ? lastRow.progress : 0, best: false };
  });
  let best = options[0];
  for (const option of options) {
    // 목표 모드는 도달일이 우선, 같으면 진행도. 예측 모드는 9/16 도달 지점만 본다.
    const time = (item: MechHoldOption) => item.reached ? item.reached.getTime() : Infinity;
    if (!best || time(option) < time(best) || (time(option) === time(best) && option.progress > best.progress)) best = option;
  }
  if (best) best.best = true;
  const immediate = options.find(option => option.level === 280);
  return {
    best: best ? best.level : 280,
    options,
    gainOverImmediate: best && immediate ? (best.progress - immediate.progress) * 100 : 0,
  };
};
export const pickMechHoldLevel = (settings: Settings) => mechHoldAnalysis(settings).best;

function* buildPlanningSteps(settings: Settings): Generator<number, Planning, void> {
  const s = settings;
  const start = parseDate(s.start);
  const deadline = parseDate("2026-09-16");
  const mechHoldLevel = s.mechHoldAuto ? pickMechHoldLevel(s) : s.momentumMechLevel;
  const strategySettings = { ...s, shopMech: false, shopBlue: false, momentumMechLevel: mechHoldLevel };
  let completed = 0;
  const sunday = simulate(strategySettings, { sevenUntil: addDays(start, -1) }); yield ++completed;
  const free = simulate(strategySettings, { fixedRuns: 2 }); yield ++completed;
  const allSeven = simulate(strategySettings, { fixedRuns: 7 }); yield ++completed;
  if (s.calcMode === "forecast") {
    // 예측 모드도 자동 선택한 사용 레벨을 쓴다. 메포샵 설정은 예측 모드에서 그대로 살린다.
    const forecast = simulate({ ...s, momentumMechLevel: mechHoldLevel }, { fixedRuns: s.paidMonsterPark ? 7 : 2 }); yield ++completed;
    const makePlan = (strategy: PullStrategy, result: Simulation): PullPlan => ({
      pullWeeks: 0,
      targetClearWeeks: 0,
      result,
      feasible: true,
      strategy,
      shopBlueCount: result.shopBluePurchased,
      shopMechCount: result.shopMechPurchased,
      scheduleIndex: 0,
    });
    const basePlan = makePlan("monsterPark", forecast);
    const strategyPlans: Record<PullStrategy, PullPlan[]> = {
      monsterPark: [basePlan],
      blue: [{ ...basePlan, strategy: "blue" }],
      mech: [{ ...basePlan, strategy: "mech" }],
      both: [{ ...basePlan, strategy: "both" }],
    };
    const recommendedPlansByWeek = [[basePlan]];
    return { sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek: [basePlan], basePlan, maxPullWeeks: 0, deadline };
  }
  const availableShopWeekCount = availableShopWeeksForStart(start).length;
  const availableShopItemCount = availableShopWeekCount * SHOP_WEEKLY_ITEM_LIMIT;
  const pairsByStrategy = shopPurchasePairsForAvailableCount(availableShopItemCount);
  const candidateCache = new Map<string, StrategyCandidate>();
  candidateCache.set("0:0:0", { result: sunday, shopBlueCount: 0, shopMechCount: 0, scheduleIndex: 0 });
  candidateCache.set("0:0:64", { result: allSeven, shopBlueCount: 0, shopMechCount: 0, scheduleIndex: 64 });
  const candidateAt = function* (shopBlueCount: number, shopMechCount: number, scheduleIndex: number): Generator<number, StrategyCandidate, void> {
    const effectiveShopBlueCount = Math.min(shopBlueCount, availableShopItemCount);
    const effectiveShopMechCount = Math.min(shopMechCount, availableShopItemCount);
    const key = `${effectiveShopBlueCount}:${effectiveShopMechCount}:${scheduleIndex}`;
    const cached = candidateCache.get(key);
    if (cached) return cached;
    const schedule = scheduleIndex === 64 ? { fixedRuns: 7 } : { sevenUntil: addDays(start, scheduleIndex - 1) };
    const result = simulate(strategySettings, { ...schedule, shopBlueCount: effectiveShopBlueCount, shopMechCount: effectiveShopMechCount });
    const candidate = {
      result,
      shopBlueCount: result.shopBluePurchased,
      shopMechCount: result.shopMechPurchased,
      scheduleIndex,
    };
    candidateCache.set(key, candidate);
    yield ++completed;
    return candidate;
  };
  const meetsTarget = (candidate: StrategyCandidate, targetClearWeeks: number) => Boolean(
    candidate.result.reached && candidate.result.reached <= deadline && mayrinClearWeeks(candidate.result.reached) >= targetClearWeeks,
  );
  const leastCostCandidate = function* (shopBlueCount: number, shopMechCount: number, targetClearWeeks: number, minimumScheduleIndex = 0): Generator<number, StrategyCandidate | null, void> {
    if (!meetsTarget(yield* candidateAt(shopBlueCount, shopMechCount, 64), targetClearWeeks)) return null;
    let low = Math.max(0, Math.min(64, minimumScheduleIndex));
    let high = 64;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (meetsTarget(yield* candidateAt(shopBlueCount, shopMechCount, middle), targetClearWeeks)) high = middle;
      else low = middle + 1;
    }
    return yield* candidateAt(shopBlueCount, shopMechCount, low);
  };
  const baselineClearWeeks = Math.max(1, mayrinClearWeeks(sunday.reached));
  const maximumClearWeeks = mayrinClearWeeks((yield* candidateAt(availableShopItemCount, availableShopItemCount, 64)).result.reached);
  const maxPullWeeks = Math.max(0, maximumClearWeeks - baselineClearWeeks);
  const pickPlan = function* (strategy: PullStrategy, pullWeeks: number, monsterParkPlan?: PullPlan): Generator<number, PullPlan, void> {
    const targetClearWeeks = baselineClearWeeks + pullWeeks;
    const pairs = pullWeeks === 0 ? pairsByStrategy.monsterPark : pairsByStrategy[strategy];
    const minimumScheduleIndex = strategy === "monsterPark" ? 0 : monsterParkPlan?.scheduleIndex ?? 0;
    const eligible: StrategyCandidate[] = [];
    for (const [shopBlueCount, shopMechCount] of pairs) {
      const candidate = yield* leastCostCandidate(shopBlueCount, shopMechCount, targetClearWeeks, minimumScheduleIndex);
      if (!candidate) continue;
      if (strategy === "monsterPark" || !monsterParkPlan?.feasible) eligible.push(candidate);
    }
    eligible.sort((a, b) => a.result.maplePoints - b.result.maplePoints || a.result.shopMaplePoints - b.result.shopMaplePoints || a.result.monsterParkMaplePoints - b.result.monsterParkMaplePoints);
    const fallbacks: StrategyCandidate[] = [];
    for (const [shopBlueCount, shopMechCount] of pairs) fallbacks.push(yield* candidateAt(shopBlueCount, shopMechCount, 64));
    fallbacks.sort((a, b) => (a.result.reached?.getTime() ?? Infinity) - (b.result.reached?.getTime() ?? Infinity));
    const chosen = eligible[0] || fallbacks[0] || { result: allSeven, shopBlueCount: 0, shopMechCount: 0 };
    return {
      pullWeeks, targetClearWeeks, result: chosen.result, strategy,
      shopBlueCount: chosen.shopBlueCount, shopMechCount: chosen.shopMechCount,
      scheduleIndex: chosen.scheduleIndex,
      feasible: eligible.length > 0,
    };
  };
  const basePlan = yield* pickPlan("monsterPark", 0);
  const strategyPlans = {} as Record<PullStrategy, PullPlan[]>;
  const monsterParkPlans: PullPlan[] = [];
  for (let pullWeeks = 0; pullWeeks <= maxPullWeeks; pullWeeks += 1) monsterParkPlans.push(pullWeeks === 0 ? basePlan : yield* pickPlan("monsterPark", pullWeeks));
  strategyPlans.monsterPark = monsterParkPlans;
  for (const { id } of pullStrategies.filter(strategy => strategy.id !== "monsterPark")) {
    const plans: PullPlan[] = [];
    for (let pullWeeks = 0; pullWeeks <= maxPullWeeks; pullWeeks += 1) plans.push(pullWeeks === 0 ? { ...basePlan, strategy: id } : yield* pickPlan(id, pullWeeks, monsterParkPlans[pullWeeks]));
    strategyPlans[id] = plans;
  }
  const recommendedPlansByWeek = Array.from({ length: maxPullWeeks + 1 }, (_, pullWeeks) => {
    const feasible = pullStrategies.map(({ id }) => strategyPlans[id][pullWeeks]).filter(plan => plan.feasible);
    return feasible.filter((candidate, candidateIndex) => !feasible.some((other, otherIndex) => {
      const candidateTime = candidate.result.reached?.getTime() ?? Infinity;
      const otherTime = other.result.reached?.getTime() ?? Infinity;
      const noLater = otherTime <= candidateTime;
      const noMoreExpensive = other.result.maplePoints <= candidate.result.maplePoints;
      const strictlyBetter = otherTime < candidateTime || other.result.maplePoints < candidate.result.maplePoints || (otherTime === candidateTime && other.result.maplePoints === candidate.result.maplePoints && otherIndex < candidateIndex);
      return noLater && noMoreExpensive && strictlyBetter;
    })).sort((a, b) => {
      if (strategyPlans.monsterPark[pullWeeks]?.feasible) {
        if (a.strategy === "monsterPark") return -1;
        if (b.strategy === "monsterPark") return 1;
      }
      return a.result.maplePoints - b.result.maplePoints || (a.result.reached?.getTime() ?? Infinity) - (b.result.reached?.getTime() ?? Infinity);
    });
  });
  const bestPlansByWeek = recommendedPlansByWeek.map((plans, pullWeeks) => strategyPlans.monsterPark[pullWeeks]?.feasible ? strategyPlans.monsterPark[pullWeeks] : plans[0] || strategyPlans.monsterPark[pullWeeks]);
  return { sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, basePlan, maxPullWeeks, deadline };
}

function runPlanningImmediately(settings: Settings): Planning {
  const iterator = buildPlanningSteps(settings);
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}

const PLANNING_SLICE_MS = 8;
const PROGRESS_INTERVAL_MS = 100;
const nowMs = () => typeof performance === "object" && typeof performance.now === "function" ? performance.now() : Date.now();
// requestAnimationFrame은 슬라이스마다 한 프레임을 통째로 기다리고 배경 탭에서는 아예 멈춘다.
// scheduler.yield는 계속 실행을 일반 태스크보다 우선시켜 다른 작업을 굶긴다.
// React 스케줄러와 같이 MessageChannel 매크로태스크로 양보해 페인트와 입력을 그대로 통과시킨다.
const yieldToBrowser = () => new Promise<void>(resolve => {
  if (typeof MessageChannel !== "function") { setTimeout(resolve, 0); return; }
  const channel = new MessageChannel();
  channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
  channel.port2.postMessage(null);
});

async function runPlanningInChunks(settings: Settings, onProgress: (completed: number) => void, cancelled: () => boolean): Promise<Planning | null> {
  const iterator = buildPlanningSteps(settings);
  let step = iterator.next();
  let sliceStart = nowMs();
  let lastProgress = 0;
  while (!step.done) {
    if (cancelled()) return null;
    const current = nowMs();
    // 스텝 수가 아니라 경과 시간으로 끊는다. 대부분의 입력은 한 슬라이스에서 끝난다.
    if (current - lastProgress >= PROGRESS_INTERVAL_MS) { onProgress(step.value); lastProgress = current; }
    if (current - sliceStart >= PLANNING_SLICE_MS) {
      await yieldToBrowser();
      if (cancelled()) return null;
      sliceStart = nowMs();
    }
    step = iterator.next();
  }
  return cancelled() ? null : step.value;
}

const defaultPlanning = runPlanningImmediately(defaults);
export { createDefaultSettings, defaults, eterionBonusesForDate, localDateInputValue, momentumRewardForLevel, runPlanningImmediately, simulate, ultimaProgressBefore, WEEKLY_CONTENT_RAW };

export const selectedPlanForSettings = (planning: Planning, settings: Settings) => {
  const effectivePullWeeks = Math.min(Math.max(0, Math.floor(settings.pullWeeks)), planning.maxPullWeeks);
  if (settings.calcMode === "forecast") return planning.basePlan;
  const requestedPlan = planning.strategyPlans[settings.pullStrategy][effectivePullWeeks];
  const recommendedPlans = planning.recommendedPlansByWeek[effectivePullWeeks] || [];
  return requestedPlan?.feasible && recommendedPlans.some(plan => plan.strategy === requestedPlan.strategy)
    ? requestedPlan
    : planning.bestPlansByWeek[effectivePullWeeks] || planning.basePlan;
};

// 진행 숫자를 Home 상태에 두면 갱신마다 계산기 전체가 다시 그려져 입력이 밀린다.
// 외부 스토어로 빼서 아래 숫자 노드만 다시 그린다.
const calculationProgress = {
  value: 0,
  listeners: new Set<() => void>(),
  get: () => calculationProgress.value,
  set(next: number) {
    if (next === calculationProgress.value) return;
    calculationProgress.value = next;
    calculationProgress.listeners.forEach(listener => listener());
  },
  subscribe(listener: () => void) {
    calculationProgress.listeners.add(listener);
    return () => { calculationProgress.listeners.delete(listener); };
  },
};
const zeroProgress = () => 0;
function CalculationSteps() {
  const steps = useSyncExternalStore(calculationProgress.subscribe, calculationProgress.get, zeroProgress);
  return <>{steps.toLocaleString("ko-KR")}</>;
}

function InputField({ label, value, onChange, type = "number", min, max, step, disabled }: { label: string; value: string | number; onChange: (value: string) => void; type?: "number" | "date"; min?: number; max?: number; step?: number; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} disabled={disabled} /></label>;
}
function Toggle({ label, checked, onChange, disabled, accessibleLabel }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; accessibleLabel?: string }) {
  return <label className={`toggle-row ${disabled ? "is-disabled" : ""}`}><span>{label}</span><input type="checkbox" aria-label={accessibleLabel} checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} /><i aria-hidden="true" /></label>;
}
function QuickChoice({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={`quick-choice ${checked ? "active" : ""}`} aria-pressed={checked} onClick={() => onChange(!checked)}><span>{label}</span><b>{checked ? "ON" : "OFF"}</b></button>;
}
function Core6Choice({ title, before, after, checked, onChange }: { title: string; before: number; after: number; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className={`core6-choice ${checked ? "active" : ""}`}><div><b>{title}</b><small>{before}% <span>→</span> {after}%</small></div><Toggle label="6레벨" accessibleLabel={`${title} 코어 6레벨`} checked={checked} onChange={onChange} /></div>;
}

function ProgressChart({ selected, sunday, free, targetLevel }: { selected: Simulation; sunday: Simulation; free: Simulation; targetLevel: number }) {
  const width = 900, height = 340, margin = { left: 44, right: 28, top: 32, bottom: 42 };
  const count = Math.max(1, selected.rows.length - 1, sunday.rows.length - 1, free.rows.length - 1);
  const x = (index: number) => margin.left + index / count * (width - margin.left - margin.right);
  const y = (progress: number) => margin.top + (targetLevel - progress) / (targetLevel - 280) * (height - margin.top - margin.bottom);
  const path = (rows: Row[]) => rows.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row.progress).toFixed(1)}`).join(" ");
  const longest = [selected.rows, sunday.rows, free.rows].sort((a, b) => b.length - a.length)[0];
  const tickEvery = Math.max(1, Math.ceil(longest.length / 6));
  const series = [
    { key: "selected", title: "선택 경로", detail: selected.scheduleLabel, short: "선택", result: selected, labelOffset: 14 },
    { key: "sunday", title: "일요일만 7판 비교", detail: sunday.scheduleLabel, short: "일요일 7판", result: sunday, labelOffset: 32 },
    { key: "free", title: "매일 2판 비교", detail: free.scheduleLabel, short: "매일 2판", result: free, labelOffset: 50 },
  ] as const;
  return <div className="chart-wrap">
    <div className="chart-legend" aria-label="그래프 경로 설명">{series.map(item => <div className={`legend-card ${item.key}`} key={item.key}><span className="legend-line" aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.detail}</small></span></div>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`세 경로의 ${targetLevel}레벨 도달 진행 비교`}>
      {Array.from({ length: targetLevel - 279 }, (_, index) => index + 280).map(level => <g key={level}><line x1={margin.left} x2={width - margin.right} y1={y(level)} y2={y(level)} className="grid-line" /><text x={margin.left - 10} y={y(level) + 4} textAnchor="end" className="axis-label">{level}</text></g>)}
      {longest.map((row, index) => (index % tickEvery === 0 || index === longest.length - 1) ? <text key={row.key} x={x(index)} y={height - 12} textAnchor="middle" className="axis-label">{shortDate(row.date)}</text> : null)}
      {[...series].reverse().map(item => <g key={item.key}><title>{`${item.title}: ${item.detail}`}</title><path d={path(item.result.rows)} className={`chart-line ${item.key}`} /></g>)}
      {series.map(item => { const row = item.result.rows[item.result.rows.length - 1]; if (!row) return null; const endX = x(item.result.rows.length - 1); const endY = y(row.progress); const labelY = Math.max(margin.top + 12, Math.min(height - margin.bottom - 8, endY + item.labelOffset)); const alignEnd = endX > width - 170; const labelX = endX + (alignEnd ? -9 : 9); return <g key={item.key} className={`chart-end ${item.key}`}><circle cx={endX} cy={endY} r="5" className={`dot ${item.key}`} /><line x1={endX} y1={endY} x2={labelX} y2={labelY - 4} className="chart-end-guide" /><text x={labelX} y={labelY} textAnchor={alignEnd ? "end" : "start"} className="chart-end-label">{item.short}</text></g>; })}
    </svg>
  </div>;
}

export default function Home() {
  const [s, setS] = useState<Settings>(defaults);
  const [calculatedSettings, setCalculatedSettings] = useState<Settings>(defaults);
  const [isCalculating, setIsCalculating] = useState(false);
  const [planning, setPlanning] = useState<Planning>(defaultPlanning);
  const calculationJob = useRef(0);
  const localDefaultsApplied = useRef(false);
  const [preApplied, setPreApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("calculator");
  const [efficiencyLevel, setEfficiencyLevel] = useState(280);
  const [efficiencyLevelInput, setEfficiencyLevelInput] = useState("280");
  const [itemConversionExpInput, setItemConversionExpInput] = useState(String(defaults.exp));
  const [manualInventoryOpen, setManualInventoryOpen] = useState(false);
  const [manualInventoryType, setManualInventoryType] = useState<CustomRewardType>("adv");
  const [manualInventoryAmount, setManualInventoryAmount] = useState("0");
  const [manualInventoryError, setManualInventoryError] = useState("");
  useEffect(() => {
    if (localDefaultsApplied.current) return;
    localDefaultsApplied.current = true;
    const localDefaults = createDefaultSettings(localDateInputValue());
    setS(localDefaults);
    setCalculatedSettings(localDefaults);
    setPlanning(runPlanningImmediately(localDefaults));
  }, []);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (pre280SettingKeys.includes(key)) setPreApplied(false);
    setS(current => {
      const next = { ...current, [key]: value } as Settings;
      // 현재 레벨을 올리면 목표도 같이 밀어 올린다.
      if (key === "level" || key === "targetLevel") {
        next.targetLevel = clampTargetLevel(next.targetLevel, next.level);
        if (key === "targetLevel" || current.momentumMechLevel === mechHoldLevelForTarget(current.targetLevel)) {
          next.momentumMechLevel = mechHoldLevelForTarget(next.targetLevel);
        }
      }
      return next;
    });
  };
  const toggleTraceSource = (id: ExperienceSourceId) => {
    setS(current => ({
      ...current,
      excludedExperienceSources: toggleExcludedExperienceSource(current.excludedExperienceSources, id),
    }));
  };
  // 현재 패스 레벨까지 받은 보상. 보유 토글이 이 값을 기준으로 켜고 끈다.
  const claimedPassRewards = useMemo(() => {
    const second = momentumPlusClaimedRewards(s.momentumPass2Enabled ? s.momentumPass2Level : 0, s.momentumPrime2 ? "prime" : s.momentumPremium2 ? "premium" : "free");
    const pass = challengerClaimedRewards(s.challengerPassLevel, s.challengerExp);
    return { mech: 0, crimson: second.crimson, sauna: second.sauna + pass.sauna, adv: second.adv + pass.adv, blue: pass.blue, potion279: pass.potion279 };
  }, [s.momentumPass2Enabled, s.momentumPass2Level, s.momentumPrime2, s.momentumPremium2, s.challengerPassLevel, s.challengerExp]);
  const core6MasterEnabled = s.dailyCore6Enabled && s.mpCore6Enabled && s.epicCore6Enabled;
  const setCore6Master = (enabled: boolean) => setS(current => ({ ...current, ...core6MasterPatch(enabled) }));
  const manualInventoryMeta = CUSTOM_REWARD_META[manualInventoryType];
  const toggleManualInventoryForm = () => {
    if (!manualInventoryOpen) {
      setManualInventoryAmount(String(currentInventoryTotal(s, manualInventoryType)));
      setManualInventoryError("");
    }
    setManualInventoryOpen(open => !open);
  };
  const changeManualInventoryType = (type: CustomRewardType) => {
    setManualInventoryType(type);
    setManualInventoryAmount(String(currentInventoryTotal(s, type)));
    setManualInventoryError("");
  };
  const applyManualInventory = () => {
    const amount = Number(manualInventoryAmount);
    if (!Number.isFinite(amount) || amount < 0 || (manualInventoryType !== "sauna" && !Number.isInteger(amount))) {
      setManualInventoryError(manualInventoryType === "sauna" ? "보유량은 0 이상으로 입력해 주세요." : "보유량은 0 이상의 정수로 입력해 주세요.");
      return;
    }
    setS(current => overwriteInventoryAmount(current, manualInventoryType, amount));
    setManualInventoryOpen(false);
    setManualInventoryError("");
  };
  const updateEfficiencyLevelInput = (value: string) => {
    setEfficiencyLevelInput(value);
    const nextLevel = Number(value);
    if (Number.isInteger(nextLevel) && nextLevel >= EFFICIENCY_LEVEL_MIN && nextLevel <= EFFICIENCY_LEVEL_MAX) {
      setEfficiencyLevel(nextLevel);
    }
  };
  const normalizeEfficiencyLevelInput = () => {
    const parsed = Number(efficiencyLevelInput);
    const nextLevel = Number.isFinite(parsed)
      ? Math.max(EFFICIENCY_LEVEL_MIN, Math.min(EFFICIENCY_LEVEL_MAX, Math.round(parsed)))
      : efficiencyLevel;
    setEfficiencyLevel(nextLevel);
    setEfficiencyLevelInput(String(nextLevel));
  };
  const normalizeItemConversionExpInput = () => {
    const parsed = Number(itemConversionExpInput);
    const nextExp = Number.isFinite(parsed) ? Math.max(0, Math.min(99.999, parsed)) : 0;
    setItemConversionExpInput(String(nextExp));
  };
  const loadCalculatorProgressIntoConversion = () => {
    const nextLevel = Math.max(EFFICIENCY_LEVEL_MIN, Math.min(EFFICIENCY_LEVEL_MAX, Math.floor(s.level)));
    const nextExp = Math.max(0, Math.min(99.999, Number(s.exp) || 0));
    setEfficiencyLevel(nextLevel);
    setEfficiencyLevelInput(String(nextLevel));
    setItemConversionExpInput(String(nextExp));
  };
  const pre280Key = selectedSettingsKey(s, pre280SettingKeys);
  const pre280Settings = useMemo(() => s, [pre280Key]);
  const pre280 = useMemo(() => simulatePre280(pre280Settings), [pre280Settings]);
  const calc = useMemo(() => {
    const s = calculatedSettings;
    const { sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, basePlan, maxPullWeeks, deadline } = planning;
    const effectivePullWeeks = Math.min(Math.max(0, Math.floor(s.pullWeeks)), maxPullWeeks);
    const recommendedPlans = recommendedPlansByWeek[effectivePullWeeks] || [];
    const selectedPlan = selectedPlanForSettings(planning, s);
    const previousPlan = effectivePullWeeks > 1 ? strategyPlans[selectedPlan.strategy][effectivePullWeeks - 1] : basePlan;
    const selected = selectedPlan.result;
    const hardValue = Math.max(0, s.mayrinMesoGap) * 100000000 + Math.max(0, s.mayrinNormalFrag) * Math.max(0, s.fragPrice) * 10000;
    const reset = s.postReset ? 1 : 0;
    const selectedMayrinDate = selected.reach285At || selected.reached;
    const baseMayrinDate = basePlan.result.reach285At || basePlan.result.reached;
    const previousMayrinDate = previousPlan.result.reach285At || previousPlan.result.reached;
    const selectedHardWeeks = mayrinClearWeeks(selectedMayrinDate) + (selectedMayrinDate ? reset : 0);
    const baseHardWeeks = mayrinClearWeeks(baseMayrinDate) + (baseMayrinDate ? reset : 0);
    const previousHardWeeks = mayrinClearWeeks(previousMayrinDate) + (previousMayrinDate ? reset : 0);
    const roi = calculateMayrinRoi({
      selectedMaplePoints: selected.maplePoints,
      baselineMaplePoints: basePlan.result.maplePoints,
      previousMaplePoints: effectivePullWeeks > 0 ? previousPlan.result.maplePoints : free.maplePoints,
      selectedHardWeeks,
      baselineHardWeeks: baseHardWeeks,
      previousHardWeeks: effectivePullWeeks > 0 ? previousHardWeeks : selectedHardWeeks,
      hardValue,
      mpPerEok: s.mpPerEok,
    });
    const marginalGainedHardWeeks = roi.marginal.hardWeeks;
    const marginalMP = roi.marginal.maplePoints;
    const marginalMonsterParkMP = selected.monsterParkMaplePoints - previousPlan.result.monsterParkMaplePoints;
    const marginalShopMP = selected.shopMaplePoints - previousPlan.result.shopMaplePoints;
    const marginalCostValue = roi.marginal.costValue;
    const marginalRecoveredValue = roi.marginal.recoveredValue;
    const marginalNetValue = roi.marginal.netValue;
    const marginalRecoveryRate = roi.marginal.recoveryRate;
    const cumulativeGainedHardWeeks = roi.cumulative.hardWeeks;
    const cumulativeMP = roi.cumulative.maplePoints;
    const cumulativeCostValue = roi.cumulative.costValue;
    const cumulativeRecoveredValue = roi.cumulative.recoveredValue;
    const cumulativeNetValue = roi.cumulative.netValue;
    const cumulativeRecoveryRate = roi.cumulative.recoveryRate;
    const recommendedRoiPlans = recommendedPlansByWeek[effectivePullWeeks].map(plan => {
      const mayrinDate = plan.result.reach285At || plan.result.reached;
      const hardWeeks = mayrinClearWeeks(mayrinDate) + (mayrinDate ? reset : 0);
      const gainedHardWeeks = Math.max(0, hardWeeks - baseHardWeeks);
      const extraMaplePoints = plan.result.maplePoints - basePlan.result.maplePoints;
      const costValue = extraMaplePoints / Math.max(1, s.mpPerEok) * 100000000;
      return { strategy: plan.strategy, netValue: gainedHardWeeks * hardValue - costValue };
    });
    const roiWinner = [...recommendedRoiPlans].sort((a, b) => b.netValue - a.netValue || pullStrategies.findIndex(strategy => strategy.id === a.strategy) - pullStrategies.findIndex(strategy => strategy.id === b.strategy))[0]?.strategy || selectedPlan.strategy;
    const bestRoiStrategy = strategyPlans.monsterPark[effectivePullWeeks]?.feasible ? "monsterPark" : roiWinner;
    // 목표를 9/16까지 못 찍으면 그날 어디까지 가는지 따로 계산해 보여준다.
    const deadlineMissed = !selectedPlan.feasible;
    const deadlineSchedule = selectedPlan.scheduleIndex === 64
      ? { fixedRuns: 7 }
      : { sevenUntil: addDays(parseDate(s.start), selectedPlan.scheduleIndex - 1) };
    const deadlineForecast = deadlineMissed
      ? simulate({ ...s, calcMode: "forecast" }, { ...deadlineSchedule, shopBlueCount: selectedPlan.shopBlueCount, shopMechCount: selectedPlan.shopMechCount })
      : null;
    return {
      selected, sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, selectedPlan, basePlan, previousPlan,
      effectivePullWeeks, maxPullWeeks, hardValue, selectedHardWeeks, baseHardWeeks, marginalGainedHardWeeks,
      marginalMP, marginalMonsterParkMP, marginalShopMP, marginalCostValue, marginalRecoveredValue, marginalNetValue, marginalRecoveryRate,
      cumulativeGainedHardWeeks, cumulativeMP, cumulativeCostValue, cumulativeRecoveredValue, cumulativeNetValue, cumulativeRecoveryRate,
      bestRoiStrategy, deadline, deadlineMet: selectedPlan.feasible, deadlineMissed, deadlineForecast,
    };
  }, [planning, calculatedSettings]);
  const hasPendingChanges = JSON.stringify(s) !== JSON.stringify(calculatedSettings);
  const calculate = async () => {
    if (!hasPendingChanges || isCalculating) return;
    const nextSettings = { ...s };
    const job = calculationJob.current + 1;
    calculationJob.current = job;
    setIsCalculating(true);
    calculationProgress.set(0);
    const nextPlanning = await runPlanningInChunks(
      nextSettings,
      completed => { if (job === calculationJob.current) calculationProgress.set(completed); },
      () => job !== calculationJob.current,
    );
    if (!nextPlanning || job !== calculationJob.current) return;
    setPlanning(nextPlanning);
    setCalculatedSettings(nextSettings);
    calculationProgress.set(0);
    setIsCalculating(false);
  };
  const cancelCalculation = () => {
    calculationJob.current += 1;
    setIsCalculating(false);
    calculationProgress.set(0);
  };
  const selectCalculatedRoute = (patch: Partial<Pick<Settings, "pullWeeks" | "pullStrategy">>) => {
    setS(current => ({ ...current, ...patch }));
    setCalculatedSettings(current => ({ ...current, ...patch }));
  };
  const resetCalculator = () => {
    calculationJob.current += 1;
    const localDefaults = createDefaultSettings(localDateInputValue());
    setS(localDefaults);
    setCalculatedSettings(localDefaults);
    setPlanning(runPlanningImmediately(localDefaults));
    setIsCalculating(false);
    calculationProgress.set(0);
    setPreApplied(false);
  };
  const connectPre280 = () => {
    if (!pre280.reached) return;
    setS(current => ({
      ...current,
      level: 280,
      exp: pre280.exp,
      start: iso(pre280.reached!),
      challengerPassLevel: pre280.passLevel,
      challengerUnclaimed: false,
      ownedBlue: current.ownedBlue + pre280.inventory.blue,
      ownedSauna: current.ownedSauna + pre280.inventory.sauna,
      ownedAdv: current.ownedAdv + pre280.inventory.adv,
      ownedPotion279: current.ownedPotion279 + pre280.inventory.potion279,
    }));
    setPreApplied(true);
    setActiveTab("calculator");
  };
  const r = calc.selected;
  const targetLevel = calculatedSettings.targetLevel;
  const forecastMode = calculatedSettings.calcMode === "forecast";
  const pullDays = r.reached && calc.basePlan.result.reached ? Math.max(0, Math.round((calc.basePlan.result.reached.getTime() - r.reached.getTime()) / 86400000)) : 0;
  const recommendedPrefix = r.sevenUntil < r.start ? "평일 2판 · 일요일 7판" : `${shortDate(r.sevenUntil)}까지만 평일 7판`;
  const selectedStrategy = pullStrategies.find(strategy => strategy.id === calc.selectedPlan.strategy) || pullStrategies[0];
  const selectedRouteTitle = selectedStrategy.id === "monsterPark" ? r.scheduleLabel : `${selectedStrategy.label} · ${r.scheduleLabel}`;
  const primaryRoiNetValue = calc.effectivePullWeeks ? calc.cumulativeNetValue : calc.marginalNetValue;
  const primaryRoiHardWeeks = calc.effectivePullWeeks ? calc.cumulativeGainedHardWeeks : calc.marginalGainedHardWeeks;
  const primaryRoiRecoveredValue = calc.effectivePullWeeks ? calc.cumulativeRecoveredValue : calc.marginalRecoveredValue;
  const primaryRoiRecoveryRate = calc.effectivePullWeeks ? calc.cumulativeRecoveryRate : calc.marginalRecoveryRate;
  const momentumLeft = r.leftoverSources.some(source => source.includes("모멘텀 패스"));
  const leftoverRowsFor = (leftovers: Leftovers, specialSupplySaved: number): [string, string][] => [
    ["상급 EXP 교환권", `${leftovers.adv.toLocaleString("ko-KR")}장`], ["VIP 사우나", `${leftovers.sauna.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}시간`],
    ["블루베리 농장", `${leftovers.blue.toLocaleString("ko-KR")}장`], ["메카베리 농장", `${leftovers.mech.toLocaleString("ko-KR")}장`],
    ["크림슨 메카베리 농장", `${leftovers.crimson.toLocaleString("ko-KR")}장`],
    ["성장의 비약 200~269", `${leftovers.potion269.toLocaleString("ko-KR")}개`], ["성장의 비약 200~279", `${leftovers.potion279.toLocaleString("ko-KR")}개`],
    ["3배 쿠폰 · 30분", `${leftovers.coupon3x.toLocaleString("ko-KR")}개`], ["4배 쿠폰 · 30분", `${leftovers.coupon4x.toLocaleString("ko-KR")}개`],
    ["특수 물자 저장", calculatedSettings.specialSupply ? `${specialSupplySaved.toLocaleString("ko-KR")}회` : "계산 제외"],
  ];
  const leftoverRows = leftoverRowsFor(r.leftovers, r.specialSupplySaved);
  const milestoneLeftoverRows = r.leftoversAt285 ? leftoverRowsFor(r.leftoversAt285, r.specialSupplySavedAt285 || 0) : [];
  // 계산 근거: 실제로 무언가 일어난 날만 추려 앞뒤 레벨과 증가폭을 보여준다.
  const traceRows = useMemo(() => {
    const list: { key: string; date: Date; fromLevel: number; fromExp: number; level: number; exp: number; gain: number; labels: string[]; contributions: ReturnType<typeof roundContributionBreakdown> }[] = [];
    let previous = { level: r.startLevel, exp: r.startExp, progress: r.startLevel + r.startExp / 100 };
    for (const row of r.rows) {
      const labels = [...row.events];
      if (row.usage.runs) labels.push(`몬파 ${row.usage.runs}판`);
      if (row.usage.mech) labels.push(`메카베리 ${row.usage.mech}장`);
      if (row.usage.crimson) labels.push(`크림슨 메카베리 ${row.usage.crimson}장`);
      if (row.usage.blue) labels.push(`블루베리 ${row.usage.blue}장`);
      if (row.usage.sauna) labels.push(`사우나 ${row.usage.sauna.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}시간`);
      if (row.usage.adv) labels.push(`상급 EXP ${row.usage.adv.toLocaleString("ko-KR")}장`);
      if (row.usage.potion) labels.push(`성장의 비약 ${row.usage.potion}개`);
      const gain = (row.progress - previous.progress) * 100;
      const contributions = roundContributionBreakdown(row.contributions, gain);
      if (labels.length || contributions.length) list.push({ key: row.key, date: row.date, fromLevel: previous.level, fromExp: previous.exp, level: row.level, exp: row.exp, gain, labels, contributions });
      previous = { level: row.level, exp: row.exp, progress: row.progress };
    }
    return list;
  }, [r]);
  const traceTotals = useMemo(() => r.rows.reduce((total, row) => ({
    runs: total.runs + row.usage.runs, mech: total.mech + row.usage.mech, crimson: total.crimson + row.usage.crimson, blue: total.blue + row.usage.blue,
    sauna: total.sauna + row.usage.sauna, adv: total.adv + row.usage.adv, potion: total.potion + row.usage.potion,
  }), { runs: 0, mech: 0, crimson: 0, blue: 0, sauna: 0, adv: 0, potion: 0 }), [r]);
  // 같은 아이템도 레벨 구간에 따라 실제 획득 경험치가 달라진다. 언제 쓰는 게 이득인지 계산한다.
  const rewardAdvice = useMemo(() => rewardUsageAdvice(calculatedSettings.level, clampTargetLevel(calculatedSettings.targetLevel, calculatedSettings.level)), [calculatedSettings.level, calculatedSettings.targetLevel]);
  // 한 장 가치가 아니라 실제 도달 결과로 고른 시점이다.
  const holdAnalysis = useMemo(() => mechHoldAnalysis(calculatedSettings), [calculatedSettings]);
  const pickedMechHold = holdAnalysis.best;
  const pendingExcludedSources = normalizeExcludedExperienceSources(s.excludedExperienceSources);
  const calculatedExcludedSources = normalizeExcludedExperienceSources(calculatedSettings.excludedExperienceSources);
  const traceExclusionItems = experienceSourceIds.filter(id => pendingExcludedSources.includes(id) || calculatedExcludedSources.includes(id));
  const efficiencyStartDate = parseDate(s.start);
  const efficiencyMonsterParkBonus = eterionBonusesForDate(s, efficiencyStartDate).mp;
  const efficiencyCoreLevel = s.mpCore6Enabled && dateReached(efficiencyStartDate, s.mpCore6Date) ? 6 : 5;
  const efficiencyCore20Applied = dateReached(efficiencyStartDate, s.core20Date);
  const efficiencyLevelAvailable = Boolean(efficiency[efficiencyLevel]);
  const efficiencyRanking = efficiencyLevelAvailable
    ? efficiencyBenchmarks
      .filter(source => efficiencyLevel >= (source.minimumLevel ?? EFFICIENCY_LEVEL_MIN))
      .sort((a, b) => relativeEfficiencyScore(b, efficiencyLevel, efficiencyMonsterParkBonus) - relativeEfficiencyScore(a, efficiencyLevel, efficiencyMonsterParkBonus))
    : [];
  const itemConversionExp = Math.max(0, Math.min(99.999, Number(itemConversionExpInput) || 0));
  const itemConversionInventory: ItemConversionInventory = {
    adv: currentInventoryTotal(s, "adv"),
    mech: currentInventoryTotal(s, "mech"),
    blue: currentInventoryTotal(s, "blue"),
    sauna: currentInventoryTotal(s, "sauna"),
    potion279: currentInventoryTotal(s, "potion279"),
  };
  const itemConversionResult = simulateItemInventoryConversion({ level: efficiencyLevel, exp: itemConversionExp, inventory: itemConversionInventory });
  const itemConversionGain = (itemConversionResult.level - itemConversionResult.startLevel) * 100 + itemConversionResult.exp - itemConversionResult.startExp;
  const itemConversionRows = [
    { type: "mech" as const, mark: "ME", iconSrc: "/efficiency-icons/mekaberry.png", label: "메카베리 농장", amount: itemConversionInventory.mech, unit: "개", sampleAmount: 1, sampleUnit: "1개" },
    { type: "blue" as const, mark: "BL", iconSrc: "/efficiency-icons/blueberry.png", label: "블루베리 농장", amount: itemConversionInventory.blue, unit: "개", sampleAmount: 1, sampleUnit: "1개" },
    { type: "potion279" as const, mark: "비약", iconSrc: "", label: "전설 성장의 비약", amount: itemConversionInventory.potion279, unit: "개", sampleAmount: 1, sampleUnit: "1개" },
    { type: "sauna" as const, mark: "VIP", iconSrc: "/efficiency-icons/vip-sauna.png", label: "VIP 사우나", amount: itemConversionInventory.sauna, unit: "시간", sampleAmount: 1, sampleUnit: "1시간" },
    { type: "adv" as const, mark: "EXP", iconSrc: "", label: "상급 EXP 쿠폰", amount: itemConversionInventory.adv, unit: "장", sampleAmount: 1000, sampleUnit: "1,000장" },
  ];
  const itemConversionHasInventory = itemConversionRows.some(row => row.amount > 0);
  const preLevelData = pre280Data[Math.max(260, Math.min(279, Math.floor(s.preLevel)))];
  const preUsedLabel = (used: Pre280Inventory) => [
    used.blue ? `블루 ${used.blue}` : "",
    used.sauna ? `사우나 ${used.sauna}h` : "",
    used.adv ? `상급 ${used.adv.toLocaleString("ko-KR")}` : "",
    used.potion279 ? `비약 ${used.potion279}` : "",
  ].filter(Boolean).join(" · ") || "콘텐츠 누적";
  const forecastProgress = `Lv.${r.finalLevel} ${r.finalExp.toFixed(1)}%`;
  // 1차는 기존 프라임 49,800. 2차(모멘텀 패스 PLUS)는 프리미엄 29,800이 선행 조건이고 프라임이 39,800 추가다.
  const season1Prime = calculatedSettings.momentumPass1Enabled && calculatedSettings.momentumPrime1;
  const season2Prime = calculatedSettings.momentumPass2Enabled && calculatedSettings.momentumPrime2;
  const season2Premium = calculatedSettings.momentumPass2Enabled && (calculatedSettings.momentumPremium2 || season2Prime);
  const primeCount = Number(season1Prime) + Number(season2Prime);
  const primeCash = Number(season1Prime) * 49_800
    + (season2Premium ? MOMENTUM_PLUS_PREMIUM_CASH : 0)
    + (season2Prime ? MOMENTUM_PLUS_PRIME_CASH : 0);
  // 풀 보상이 기준이므로 켠 것을 나열하지 않고 뺀 것만 보여준다.
  const forecastExclusions = [
    !calculatedSettings.momentumPass2Enabled ? "모멘텀 PLUS 전체"
      : !calculatedSettings.momentumPremium2 && !calculatedSettings.momentumPrime2 ? "PLUS 프리미엄·프라임"
        : !calculatedSettings.momentumPrime2 ? "PLUS 프라임" : "",
    !calculatedSettings.paidMonsterPark ? "유료 몬파 5판" : "",
    !calculatedSettings.shopMech && !calculatedSettings.shopBlue ? "메포샵 농장"
      : !calculatedSettings.shopMech ? "메포샵 메카베리"
        : !calculatedSettings.shopBlue ? "메포샵 블루베리" : "",
    !calculatedSettings.challengerExp ? "챌섭 EXP 패스" : "",
    !calculatedSettings.ultima ? "울티마 작전 일지" : "",
  ].filter(Boolean);
  const forecastBasisLabel = forecastExclusions.length ? `뺀 것 ${forecastExclusions.length}개 · ${forecastExclusions.join(" · ")}` : "보상 전부 포함";
  const formatCash = (value: number) => `${value.toLocaleString("ko-KR")} 넥슨캐시`;
  const forecastCostSummary = `프라임 ${formatCash(primeCash)} · ${formatMP(r.maplePoints)}`;

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="285·290 계산기 홈"><span className="brand-mark">M</span><span>285·290 CALCULATOR</span></a><span className="topbar-status">CHALLENGERS WORLD</span></header>
    <section className="hero" id="top">
      <div className="eyebrow"><span /> CHALLENGERS {targetLevel} CALCULATOR</div>
      <h1>{forecastMode ? "9월 16일, 어디까지 갈까?" : `${targetLevel}, 언제 찍을까?`}</h1>
      <p>{forecastMode ? "받을 수 있는 보상을 전부 받는 것이 기준입니다. 안 받을 것만 끄면 그만큼 빠집니다." : `현재 레벨과 보유 보상을 입력하면 ${targetLevel} 달성일, 필요한 몬파 횟수와 메포를 계산합니다.`}</p>
      <div className="hero-grid">
        {forecastMode ? <>
          <article className="hero-card primary"><div className="card-label">9/16 시즌 종료 예상</div><strong>{forecastProgress}</strong><span>{forecastBasisLabel}</span><div className="card-meta"><b>{formatMP(r.maplePoints)}</b><em>몬파·메포샵 합계</em></div></article>
          <article className="hero-card"><div className="card-label">모멘텀 1차 · 종료</div><strong>보상 소멸</strong><span>8/19 수령 마감 · 8/20 사용 마감</span><div className="card-meta"><b>계산에서 제외</b><em>남은 아이템 없음</em></div></article>
          <article className="hero-card verdict"><div className="card-label">모멘텀 PLUS · 8/20~9/16</div><strong>{!calculatedSettings.momentumPass2Enabled ? "참여 OFF" : calculatedSettings.momentumPrime2 ? "프라임 ON" : calculatedSettings.momentumPremium2 ? "프리미엄 ON" : "무료 보상"}</strong><span>{calculatedSettings.momentumPass2Enabled ? `현재 Lv.${calculatedSettings.momentumPass2Level}` : "보상 계산 제외"}</span><div className="card-meta"><b>{calculatedSettings.momentumPass2Enabled && calculatedSettings.momentumPrime2 ? "69,600 넥슨캐시" : calculatedSettings.momentumPass2Enabled && calculatedSettings.momentumPremium2 ? "29,800 넥슨캐시" : "추가 결제 없음"}</b><em>프라임은 프리미엄 필수</em></div></article>
        </> : <>
          <article className="hero-card primary"><div className="card-label">{calc.deadlineMissed ? `${targetLevel} 달성 불가` : calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 당김 · ${selectedStrategy.label}` : "마감만 맞추기"}</div><strong>{calc.deadlineMissed ? (calc.deadlineForecast ? `Lv.${calc.deadlineForecast.finalLevel} ${calc.deadlineForecast.finalExp.toFixed(1)}%` : "미도달") : longDate(r.reached)}</strong><span>{calc.deadlineMissed ? "9월 16일 시즌 종료 시점" : r.scheduleLabel}</span><div className="card-meta"><b>{formatMP(r.maplePoints)}{primeCash > 0 ? ` + ${formatCash(primeCash)}` : ""}</b><em>몬파 {formatMP(r.monsterParkMaplePoints)} · 상점 {formatMP(r.shopMaplePoints)}{r.shopMaplePoints > 0 ? ` · ${shopPurchasePlanLabel(r.shopBluePurchased, r.shopMechPurchased)}` : ""}{primeCash > 0 ? ` · 프라임 ${primeCount}개` : " · 프라임 미구매"}</em></div></article>
          <article className="hero-card"><div className="card-label">0주 · 마감 기준</div><strong>{longDate(calc.basePlan.result.reached)}</strong><span>{calc.basePlan.result.scheduleLabel}</span><div className="card-meta"><b>{formatMP(calc.basePlan.result.maplePoints)}</b><em>{calc.deadlineMissed ? "9월 16일 이후 도달 예상일" : "상점 없이 9월 16일 달성"}</em></div></article>
          <article className="hero-card verdict"><div className="card-label">{calc.deadlineMissed ? "마감 내 달성 불가" : calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 총손익 · 0주 대비` : "마감 확보 손익"}</div><strong className={primaryRoiNetValue >= 0 ? "positive" : "negative"}>{primaryRoiNetValue >= 0 ? "+" : ""}{eok(primaryRoiNetValue)}</strong><span>{calc.effectivePullWeeks ? `누적 회수율 ${primaryRoiRecoveryRate.toFixed(1)}%` : "마감은 필수조건 · 손익과 분리"}</span><div className="card-meta"><b>{primaryRoiHardWeeks}회 추가</b><em>보상 {eok(primaryRoiRecoveredValue)}</em></div></article>
        </>}
      </div>
      {forecastMode
        ? <div className="hero-note"><span className="pulse" /><p><b>9/16 종료 예상</b> {forecastBasisLabel} · {forecastCostSummary}</p></div>
        : <div className={`hero-note ${calc.deadlineMet ? "" : "deadline-fail"}`}><span className="pulse" /><p><b>{calc.selectedPlan.strategy === calc.bestRoiStrategy ? "추천 · 순손익 최고" : calc.selectedPlan.strategy === calc.bestPlansByWeek[calc.effectivePullWeeks]?.strategy ? "메포 최저" : "더 빠른 선택"}</b> {selectedStrategy.id === "monsterPark" ? recommendedPrefix : `${selectedStrategy.label} · ${recommendedPrefix}`} → {shortDate(r.reached)} · 총 {formatMP(r.maplePoints)} · {calc.deadlineMissed ? "9월 16일 시즌 종료까지 목표 미달" : pullDays ? `마감 경로보다 ${pullDays}일 빠름` : "9월 16일 마감 기준"} · {forecastBasisLabel}</p></div>}
    </section>

    <nav className="view-tabs" role="tablist" aria-label="계산기 화면 선택">
      {viewTabs.map(tab => <button key={tab.id} id={`${tab.id}-tab`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`${tab.id}-panel`} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><b>{tab.label}</b><span>{tab.description}</span></button>)}
    </nav>

    {activeTab === "pre280" && <section className="pre280-section tab-panel" id="pre280-panel" role="tabpanel" aria-labelledby="pre280-tab">
      <div className="pre280-head">
        <div><span>BURNING BEYOND</span><h2>260→280 계산</h2></div>
        <a href="https://haru1sojae.kr/table" target="_blank" rel="noreferrer">경험치 기준표 ↗</a>
      </div>
      <div className="pre280-grid">
        <div className="pre280-controls">
          <div className="pre280-control-head"><span>입력</span><h3>현재 캐릭터</h3><p>경험치 100%마다 2레벨씩 상승하는 버닝 비욘드를 적용해 280 도달 주차를 계산합니다.</p></div>
          <div className="field-grid compact pre-fields">
            <label className="field"><span>현재 레벨</span><select value={s.preLevel} onChange={e => set("preLevel", Number(e.target.value))}>{Array.from({ length: 20 }, (_, index) => index + 260).map(level => <option key={level}>{level}</option>)}</select></label>
            <InputField label="현재 경험치 %" value={s.preExp} min={0} max={99.999} step={0.001} onChange={v => set("preExp", Number(v))} />
            <InputField label="계산 시작일" value={s.start} type="date" onChange={v => set("start", v)} />
            <InputField label="챌섭 패스 현재 레벨" value={s.prePassLevel} min={0} max={30} step={1} onChange={v => set("prePassLevel", Number(v))} />
            <label className="field"><span>매일 몬스터파크</span><select value={s.preMonsterParkRuns} onChange={e => set("preMonsterParkRuns", Number(e.target.value))}><option value={0}>안 함</option><option value={2}>2판 · 무료</option><option value={7}>7판 · 3,000 메포</option></select></label>
            <InputField label="스페셜 선데이 횟수" value={s.preSpecialSundayCount} min={0} max={12} step={1} onChange={v => set("preSpecialSundayCount", Number(v))} />
          </div>
          <div className="pre-toggles">
            <Toggle label="챌린저스 EXP 패스 보유" checked={s.challengerExp} onChange={v => set("challengerExp", v)} />
            <Toggle label="이번 주 5레벨 미완료" checked={s.preUnclaimed} onChange={v => set("preUnclaimed", v)} />
            <Toggle label="아케인·그란디스 일퀘" checked={s.preDailyQuests} onChange={v => set("preDailyQuests", v)} />
            <Toggle label="익몬·에픽던전·아케인 주간" checked={s.preWeeklyContent} onChange={v => set("preWeeklyContent", v)} />
            <Toggle label="오늘 일퀘·몬파 미완료" checked={s.preTodayDaily} onChange={v => set("preTodayDaily", v)} />
            <Toggle label="이번 주 주간 콘텐츠 미완료" checked={s.preWeeklyOpen} onChange={v => set("preWeeklyOpen", v)} />
          </div>
          <div className="pre-reward-toggles">
            <span>280 전에 사용할 보상</span>
            <Toggle label="블루베리" checked={s.preUseBlue} onChange={v => set("preUseBlue", v)} />
            <Toggle label="상급 EXP" checked={s.preUseAdv} onChange={v => set("preUseAdv", v)} />
            <Toggle label="VIP 사우나" checked={s.preUseSauna} onChange={v => set("preUseSauna", v)} />
            <Toggle label="200~279 비약" checked={s.preUsePotion} onChange={v => set("preUsePotion", v)} />
          </div>
          <div className="pre-lock"><b>Lv.280 이전 제한</b><p>모멘텀 패스와 메카베리는 280부터 계산합니다.</p></div>
        </div>

        <div className="pre280-results">
          <div className="pre-result-grid">
            <article className="pre-result-main"><span>280 예상 도달</span><strong>{pre280.reached ? longDate(pre280.reached) : "9/16까지 미도달"}</strong><p>{pre280.reached ? `챌섭 패스 ${pre280.passLevel}레벨 시점 · Lv.280 ${pre280.exp.toFixed(3)}%` : `9월 16일 기준 Lv.${pre280.level} ${pre280.exp.toFixed(3)}%`} · 일퀘 {pre280.dailyDays}일 · 몬파 {pre280.monsterParkRuns}판 · 주간 {pre280.weeklyCount}회 · {formatMP(pre280.monsterParkMaplePoints)}</p></article>
            <article><span>현재 레벨 블루베리</span><strong>{preLevelData.blue.toFixed(3)}%</strong><small>1장당 표시 경험치</small></article>
            <article><span>상급 EXP 1,000장</span><strong>{preLevelData.adv1000.toFixed(3)}%</strong><small>하루1소재 환산</small></article>
            <article><span>VIP 사우나 1시간</span><strong>{preLevelData.sauna.toFixed(3)}%</strong><small>하루1소재 환산</small></article>
          </div>

          <div className="pre-route-head"><div><span>결과</span><h3>주차별 예상 경로</h3></div><p>버닝 비욘드 <b>+2레벨</b> 적용</p></div>
          <div className="pre-timeline">
            {pre280.rows.length ? pre280.rows.map(row => <article className="pre-row" key={`${iso(row.date)}-${row.label}`}><time>{shortDate(row.date)}</time><div><b>{row.label}</b><span>Lv.{row.beforeLevel} {row.beforeExp.toFixed(1)}% → Lv.{row.level} {row.exp.toFixed(1)}%</span></div><em>{preUsedLabel(row.used)}</em></article>) : <div className="pre-empty">계산할 경험치 콘텐츠가 없습니다. 일퀘·몬파·주간 설정을 확인해 주세요.</div>}
          </div>
          <div className="pre-bottom">
            <div><span>280 도달 뒤 남는 보상</span><b>블루 {pre280.inventory.blue} · 사우나 {pre280.inventory.sauna.toFixed(1)}h · 상급 {pre280.inventory.adv.toLocaleString("ko-KR")} · 비약 {pre280.inventory.potion279}</b></div>
            <button onClick={connectPre280} disabled={!pre280.reached || preApplied}>{preApplied ? `280→${s.targetLevel} 연결 완료` : pre280.reached ? `280→${s.targetLevel} 계산기에 연결` : "9/16까지 280 미도달"}</button>
          </div>
          <p className="pre-disclaimer">일퀘·익몬·에픽던전은 메이플로드, 몬스터파크 지역별 경험치는 하루1소재 기준입니다. 레벨에 맞는 최고 입장 지역과 버닝 비욘드 +2레벨, 285 탭의 에테리온 콘텐츠 보정을 함께 적용합니다.</p>
        </div>
      </div>
    </section>}

    {activeTab === "calculator" && <><section className="calculator-shell main-calculator tab-panel" id="calculator-panel" role="tabpanel" aria-labelledby="calculator-tab">
      <aside className="controls">
        <div className="section-heading"><span>입력</span><div><p>현재 캐릭터</p><h2>{s.targetLevel} 계산 조건</h2></div></div>
        <div className="field-grid compact">
          <label className="field"><span>계산 모드</span><select value={s.calcMode} onChange={e => set("calcMode", e.target.value as "target" | "forecast")}><option value="target">목표 레벨 도달일</option><option value="forecast">9/16 종료 예상</option></select></label><label className="field"><span>목표 레벨</span><select value={clampTargetLevel(s.targetLevel, s.level)} disabled={s.calcMode === "forecast"} onChange={e => set("targetLevel", Number(e.target.value))}>{Array.from({ length: TARGET_LEVEL_MAX - TARGET_LEVEL_MIN + 1 }, (_, index) => index + TARGET_LEVEL_MIN).filter(level => level > s.level).map(level => <option key={level}>{level}</option>)}</select></label>
          <label className="field"><span>현재 레벨</span><select value={Math.min(s.level, TARGET_LEVEL_MAX - 1)} onChange={e => set("level", Number(e.target.value))}>{Array.from({ length: TARGET_LEVEL_MAX - 280 }, (_, index) => index + 280).map(level => <option key={level}>{level}</option>)}</select></label>
          <InputField label="현재 경험치 %" value={s.exp} min={0} max={99.999} step={0.001} onChange={v => set("exp", Number(v))} />
          <InputField label="계산 시작일" value={s.start} type="date" onChange={v => set("start", v)} />
          <InputField label="챌섭 EXP 패스 현재 레벨" value={s.challengerPassLevel} min={0} max={30} step={1} onChange={v => set("challengerPassLevel", Number(v))} />
        </div>
        <div className="quick-choice-grid" role="group" aria-label="빠른 계산 선택">
          <QuickChoice label="PLUS 패스" checked={s.momentumPass2Enabled} onChange={v => set("momentumPass2Enabled", v)} />
          <QuickChoice label="추가 몬파" checked={s.paidMonsterPark} onChange={v => set("paidMonsterPark", v)} />
          <QuickChoice label="코어 6레벨 일괄" checked={core6MasterEnabled} onChange={setCore6Master} />
        </div>
        <section className={`custom-reward-scheduler ${manualInventoryOpen ? "open" : ""}`} aria-labelledby="manual-inventory-title">
          <div className="custom-reward-head">
            <div><span>보유량 수정</span><b id="manual-inventory-title">현재 보상 수동 입력</b><small>상급 EXP처럼 실제로 남은 수량이 다르면 바로 고칩니다.</small></div>
            <button type="button" className="custom-reward-toggle" aria-expanded={manualInventoryOpen} aria-controls="manual-inventory-form" onClick={toggleManualInventoryForm}>{manualInventoryOpen ? "닫기" : "+ 수동 입력"}</button>
          </div>
          {manualInventoryOpen && <div className="custom-reward-form" id="manual-inventory-form">
            <div className="field-grid compact">
              <label className="field"><span>보상 종류</span><select value={manualInventoryType} onChange={event => changeManualInventoryType(event.target.value as CustomRewardType)}>{customRewardTypes.map(type => <option value={type} key={type}>{CUSTOM_REWARD_META[type].label}</option>)}</select></label>
              <InputField label={`현재 보유량 (${manualInventoryMeta.unit})`} value={manualInventoryAmount} min={0} step={manualInventoryMeta.step} onChange={setManualInventoryAmount} />
            </div>
            <div className="custom-reward-form-foot">
              <p><b>현재 보유량을 이 값으로 바꿉니다.</b> 더하는 값이 아니며, 같은 종류의 기존 예약분도 이 수량으로 대체합니다.</p>
              <button type="button" onClick={applyManualInventory}>보유량 적용</button>
            </div>
            {manualInventoryError && <p className="custom-reward-error" role="alert">{manualInventoryError}</p>}
            <small className="custom-reward-note">0을 입력하면 해당 보상을 계산에서 뺍니다. 적용 후 아래 계산하기 버튼을 눌러 결과를 갱신해 주세요.</small>
          </div>}
        </section>
        <details><summary>패스 · 이벤트 설정 <span>12</span></summary><div className="detail-body">
          <div className="quick-toggles"><Toggle label="오늘 일퀘·몬파 미완료" checked={s.todayDaily} onChange={v => set("todayDaily", v)} /><Toggle label="이번 주 챌섭 5레벨 미완료" checked={s.challengerUnclaimed} onChange={v => set("challengerUnclaimed", v)} /></div>
          <div className="field-grid compact inset"><InputField label="스페셜 선데이 몬파 횟수" value={s.specialSundayCount} min={0} max={12} step={1} disabled={!s.paidMonsterPark} onChange={v => set("specialSundayCount", Number(v))} /><InputField label="모멘텀 PLUS 현재 레벨" value={s.momentumPass2Level} min={0} max={10} step={1} disabled={!s.momentumPass2Enabled} onChange={v => set("momentumPass2Level", Number(v))} /></div>
          <Toggle label="챌린저스 EXP 패스" checked={s.challengerExp} onChange={v => set("challengerExp", v)} /><Toggle label="모멘텀 PLUS 프리미엄 · 29,800 넥슨캐시" checked={s.momentumPremium2 || s.momentumPrime2} disabled={!s.momentumPass2Enabled || s.momentumPrime2} onChange={v => set("momentumPremium2", v)} /><Toggle label="모멘텀 PLUS 프라임 · 39,800 넥슨캐시 (프리미엄 필수)" checked={s.momentumPrime2} disabled={!s.momentumPass2Enabled} onChange={v => { set("momentumPrime2", v); if (v) set("momentumPremium2", true); }} /><Toggle label="크림슨 메카베리 모아쓰기" checked={s.deferMomentumMech} onChange={v => set("deferMomentumMech", v)} />
          <div className="callout-mini">이미 받은 패스 보상 중 아직 안 쓴 것만 켜 둡니다. 끄면 그만큼 빠집니다.</div>
          <Toggle label={`받은 메카베리 ${claimedPassRewards.mech}장 보유·예약 중`} checked={claimedRewardToggleChecked(s, "mech")} onChange={v => setS(current => setClaimedRewardToggle(current, "mech", v, claimedPassRewards.mech))} />
          <Toggle label={`받은 크림슨 메카베리 ${claimedPassRewards.crimson}장 보유·예약 중`} checked={claimedRewardToggleChecked(s, "crimson")} onChange={v => setS(current => setClaimedRewardToggle(current, "crimson", v, claimedPassRewards.crimson))} />
          <Toggle label={`받은 상급 EXP ${claimedPassRewards.adv.toLocaleString("ko-KR")}장 보유·예약 중`} checked={claimedRewardToggleChecked(s, "adv")} onChange={v => setS(current => setClaimedRewardToggle(current, "adv", v, claimedPassRewards.adv))} />
          <Toggle label={`받은 VIP 사우나 ${claimedPassRewards.sauna}시간 보유·예약 중`} checked={claimedRewardToggleChecked(s, "sauna")} onChange={v => setS(current => setClaimedRewardToggle(current, "sauna", v, claimedPassRewards.sauna))} />
          <Toggle label={`챌섭 블루베리 ${claimedPassRewards.blue}장 보유·예약 중`} checked={claimedRewardToggleChecked(s, "blue")} onChange={v => setS(current => setClaimedRewardToggle(current, "blue", v, claimedPassRewards.blue))} />
          <Toggle label={`챌섭 성장의 비약 ${claimedPassRewards.potion279}개 보유·예약 중`} checked={claimedRewardToggleChecked(s, "potion279")} onChange={v => setS(current => setClaimedRewardToggle(current, "potion279", v, claimedPassRewards.potion279))} />
          {s.calcMode === "forecast" && <>
            <Toggle label="메포샵 메카베리 구매 · 1개 10,000 메포" checked={s.shopMech} onChange={v => set("shopMech", v)} />
            <Toggle label="메포샵 블루베리 구매 · 1개 7,000 메포" checked={s.shopBlue} onChange={v => set("shopBlue", v)} />
          </>}
          <div className="callout-mini">8월 19일까지는 기존 모멘텀 패스(1차), 8월 20일부터는 <b>모멘텀 패스 PLUS</b>입니다. PLUS는 무료·프리미엄(29,800)·프라임(39,800) 3단계이고 프라임은 프리미엄을 먼저 사야 합니다. 1차 프라임까지 모두 ON하면 총 119,400 넥슨캐시이며 메포 합계에는 섞지 않습니다.{s.targetLevel === 285 ? " 285 모드의 메포샵 농장은 계산기가 필요할 때만 알아서 넣습니다." : ""}</div>
          <div className="field-grid compact inset"><label className="field"><span>크림슨 사용 레벨</span><select value={s.mechHoldAuto ? "auto" : String(Math.min(s.momentumMechLevel, (s.calcMode === "forecast" ? 296 : s.targetLevel) - 1))} disabled={!s.deferMomentumMech} onChange={e => { if (e.target.value === "auto") { set("mechHoldAuto", true); return; } setS(current => ({ ...current, mechHoldAuto: false, momentumMechLevel: Number(e.target.value) })); }}><option value="auto">자동 (계산기가 비교)</option>{Array.from({ length: (s.calcMode === "forecast" ? 296 : s.targetLevel) - 280 }, (_, index) => index + 280).map(level => <option key={level}>{level}</option>)}</select></label><InputField label="최종 사용일 · PLUS 9/16" value={s.momentumMechDeadline} type="date" disabled={!s.deferMomentumMech} onChange={v => set("momentumMechDeadline", v)} /></div>
          <Toggle label="특수 물자 지원 · 4배 쿠폰 몰아쓰기" checked={s.specialSupply} onChange={v => set("specialSupply", v)} />
          <div className="field-grid compact inset supply-input"><InputField label="시작일 보유 · 당일 충전 포함" value={s.specialSupplySaved} min={0} max={5} step={1} disabled={!s.specialSupply} onChange={v => set("specialSupplySaved", Number(v))} /><InputField label="실측 1회 경험치" value={s.specialSupplyExpPerCharge} min={0} step={1} disabled={!s.specialSupply} onChange={v => set("specialSupplyExpPerCharge", Number(v))} /></div>
          <div className="supply-warning"><b>직접 입력</b><p>공식 고정 경험치가 없어 입력값이 없으면 0으로 계산합니다.</p><small>5회 저장 시 입력한 1회 경험치의 5배 적용 · 농장과 달리 임의 추정값을 자동 사용하지 않음</small></div>
          <Toggle label="울티마 스쿼드 상점 EXP 5,000장 (예상)" checked={s.shardEvent} onChange={v => set("shardEvent", v)} /><Toggle label="울티마 작전 일지" checked={s.ultima} onChange={v => set("ultima", v)} />
          <div className="callout-mini">계산기는 <b>받을 수 있는 보상을 전부 받는 것</b>을 기준으로 잡고, 못 받는 것만 빼는 방식입니다. 모멘텀 패스 레벨 기본값은 계산 시작일까지 열린 주차(1차 {momentumUnlockedLevelOn(parseDate(s.start), MOMENTUM_PASS_1_START)}레벨 · 2차 {momentumUnlockedLevelOn(parseDate(s.start), MOMENTUM_PASS_2_START)}레벨)를 모두 클리어한 상태입니다. 밀렸으면 그만큼 낮춰 입력하세요.</div>
          <div className="callout-mini">현재 패스 레벨까지 받은 보상은 현재 경험치에 포함된 것으로 보고 제외합니다. 챌섭은 최대 30레벨이며 주 5레벨씩 계산합니다. 모멘텀은 패스 시작일 기준 주차별 2→3→3→2레벨로 열리며, 밀린 주차는 다음 수령일에 한 번에 따라잡습니다.</div>
          <div className="callout-mini shop-priority">평일 몬파는 기본 2판 뒤 유료 추가 5판을 먼저 적용합니다. 농장은 몬파만으로 다음 하드 주차를 못 당길 때만 비교하며, 같은 도달 주차에서는 더 적은 메포 경로를 추천합니다.</div>
        </div></details>
        <details><summary>에테리온 · 콘텐츠 보정 <span>21</span></summary><div className="detail-body">
          <section className="core6-picker" aria-labelledby="core6-picker-title">
            <div className="core6-picker-head"><span>세부 선택</span><div><h3 id="core6-picker-title">에테리온 코어 6레벨</h3><p>일괄 선택 뒤 콘텐츠별로 다시 조정할 수 있습니다.</p></div></div>
            <div className="core6-picker-grid">
              <Core6Choice title="일일 퀘스트" before={s.dailyCore5} after={s.dailyCore6} checked={s.dailyCore6Enabled} onChange={v => set("dailyCore6Enabled", v)} />
              <Core6Choice title="몬스터파크" before={s.mpCore5} after={s.mpCore6} checked={s.mpCore6Enabled} onChange={v => set("mpCore6Enabled", v)} />
              <Core6Choice title="에픽 던전" before={s.epicCore5} after={s.epicCore6} checked={s.epicCore6Enabled} onChange={v => set("epicCore6Enabled", v)} />
            </div>
          </section>
          <div className="callout-mini">켠 콘텐츠만 해당 6레벨 달성일부터 적용합니다. 코어 총합 보너스는 각 코어 레벨과 별도로 더합니다.</div>
          <div className="field-grid compact"><InputField label="몬파 5레벨 %" value={s.mpCore5} onChange={v => set("mpCore5", Number(v))} /><InputField label="코어 총합 20 달성일" value={s.core20Date} type="date" onChange={v => set("core20Date", v)} /><InputField label="총합 20 몬파 추가 %" value={s.core20Bonus} onChange={v => set("core20Bonus", Number(v))} /><InputField label="몬파 6레벨 달성일" value={s.mpCore6Date} type="date" disabled={!s.mpCore6Enabled} onChange={v => set("mpCore6Date", v)} /><InputField label="몬파 6레벨 %" value={s.mpCore6} disabled={!s.mpCore6Enabled} onChange={v => set("mpCore6", Number(v))} /><InputField label="일퀘 5레벨 %" value={s.dailyCore5} onChange={v => set("dailyCore5", Number(v))} /><InputField label="일퀘 6레벨 달성일" value={s.dailyCore6Date} type="date" disabled={!s.dailyCore6Enabled} onChange={v => set("dailyCore6Date", v)} /><InputField label="일퀘 6레벨 %" value={s.dailyCore6} disabled={!s.dailyCore6Enabled} onChange={v => set("dailyCore6", Number(v))} /></div>
          <Toggle label="이번 주 익몬·악몽선경 미완료" checked={s.weeklyOpen} onChange={v => set("weeklyOpen", v)} /><Toggle label="그란디스 일퀘" checked={s.grandis} onChange={v => set("grandis", v)} /><Toggle label="익스트림 몬스터파크" checked={s.extreme} onChange={v => set("extreme", v)} /><Toggle label="악몽선경 1단계" checked={s.epic} onChange={v => set("epic", v)} />
          <div className="field-grid compact"><label className="field"><span>악몽선경 보상 배수</span><select value={s.epicMult} onChange={e => set("epicMult", Number(e.target.value))}><option value={1}>기본</option><option value={5}>4배 추가</option><option value={9}>8배 추가</option></select></label><InputField label="에픽 5레벨 %" value={s.epicCore5} onChange={v => set("epicCore5", Number(v))} /><InputField label="코어 총합 25 달성일" value={s.core25Date} type="date" onChange={v => set("core25Date", v)} /><InputField label="총합 25 에픽 추가 %" value={s.core25Bonus} onChange={v => set("core25Bonus", Number(v))} /><InputField label="에픽 아티팩트 활성일" value={s.epicArtifactDate} type="date" onChange={v => set("epicArtifactDate", v)} /><InputField label="아티팩트 후 5레벨 %" value={s.epicArtifact} onChange={v => set("epicArtifact", Number(v))} /><InputField label="에픽 6레벨 달성일" value={s.epicCore6Date} type="date" disabled={!s.epicCore6Enabled} onChange={v => set("epicCore6Date", v)} /><InputField label="6레벨 · 아티팩트 전 %" value={s.epicCore6} disabled={!s.epicCore6Enabled} onChange={v => set("epicCore6", Number(v))} /><InputField label="6레벨 · 아티팩트 후 %" value={s.epicCore6Artifact} disabled={!s.epicCore6Enabled} onChange={v => set("epicCore6Artifact", Number(v))} /></div>
          <div className="epic-artifact-check"><b>8/13 에픽 추가 경험치 적용 확인</b><p><strong>8/13은 9회차 오픈일입니다. 레벨 범위 몬스터 10,000마리를 처치한 뒤 ‘수집하기’를 눌러 9회차를 완료해야</strong> 아티팩트 +150%가 활성화됩니다. 에픽 코어 6레벨 +40% · 코어 총합 25 +10%까지 총 +200%이며, 악몽선경 1단계 4배 추가 선택은 기본 5배를 포함해 최종 7.0배로 계산합니다.</p><small>미완료자는 ‘에픽 아티팩트 활성일’을 실제 완료일로 바꾸고, 이번 주 보상을 이미 받았다면 ‘이번 주 익몬·악몽선경 미완료’를 꺼 주세요.</small></div>
        </div></details>
        <details><summary>보유 보상 · 울티마 <span>9</span></summary><div className="detail-body"><div className="field-grid compact"><InputField label="보유 블루베리" value={s.ownedBlue} min={0} onChange={v => set("ownedBlue", Number(v))} /><InputField label="보유 메카베리" value={s.ownedMech} min={0} onChange={v => set("ownedMech", Number(v))} /><InputField label="보유 크림슨 메카베리" value={s.ownedCrimson} min={0} onChange={v => set("ownedCrimson", Number(v))} /><InputField label="보유 사우나 시간" value={s.ownedSauna} min={0} onChange={v => set("ownedSauna", Number(v))} /><InputField label="보유 상급 EXP" value={s.ownedAdv} min={0} onChange={v => set("ownedAdv", Number(v))} /><InputField label="보유 200~279 비약" value={s.ownedPotion279} min={0} onChange={v => set("ownedPotion279", Number(v))} /><InputField label="EXP 5,000 예상 사용일" value={s.shardDate} type="date" disabled={!s.shardEvent} onChange={v => set("shardDate", v)} /><InputField label="상급 EXP 사용량" value={s.shardAdv} disabled={!s.shardEvent} onChange={v => set("shardAdv", Number(v))} /><InputField label="울티마 누적 출석" value={s.ultimaCount} disabled={!s.ultima} onChange={v => set("ultimaCount", Number(v))} /><InputField label="이번 주 이미 출석" value={s.ultimaWeek} disabled={!s.ultima} onChange={v => set("ultimaWeek", Number(v))} /></div><Toggle label="시작일 울티마 출석 예정" checked={s.ultimaStart} disabled={!s.ultima} onChange={v => set("ultimaStart", v)} /></div></details>
        <div className={`calculate-bar ${hasPendingChanges ? "pending" : ""} ${isCalculating ? "calculating" : ""}`}>
          <span>{isCalculating ? <>전략 비교 중 · <CalculationSteps />개 확인</> : hasPendingChanges ? "입력값이 변경되었습니다" : "현재 입력값으로 계산 완료"}</span>
          {isCalculating && <div className="calculation-progress" aria-hidden="true"><i /></div>}
          <div className="calculate-actions">
            <button type="button" onClick={calculate} disabled={!hasPendingChanges || isCalculating}>{isCalculating ? "계산 중…" : hasPendingChanges ? s.calcMode === "forecast" ? "9/16 예상 계산하기" : `${s.targetLevel} 도달일 계산하기` : "계산 완료"}</button>
            {isCalculating && <button type="button" className="cancel-calculation" onClick={cancelCalculation}>계산 취소</button>}
          </div>
          {isCalculating && <small>계산을 짧게 나눠 실행하므로 화면과 스크롤은 계속 사용할 수 있습니다.</small>}
        </div>
      </aside>

      <div className="results" aria-busy={isCalculating}>
        <div className="section-heading"><span>결과</span><div><p>선택한 조건</p><h2>{forecastMode ? "9/16 종료 예상" : `${targetLevel} 도달 경로`}</h2></div>{isCalculating ? <output className="calculation-status" aria-live="polite">계산 중 · 화면 사용 가능</output> : hasPendingChanges && <output className="calculation-status pending" aria-live="polite">입력값 변경됨</output>}<button className="reset" onClick={resetCalculator}>기본값 복원</button></div>
        {forecastMode ? <div className="pull-selector long-range-selector">
          <div className="pull-selector-head"><div><span>마감 예측</span><h3>{forecastExclusions.length ? "일부 빼면" : "보상 다 받으면"} {forecastProgress}</h3></div><b className="deadline-ok">2026년 9월 16일</b></div>
          <p>{forecastBasisLabel} · {forecastCostSummary}</p>
        </div> : <><div className="pull-selector">
          <div className="pull-selector-head"><div><span>목표 주차</span><h3>{targetLevel} 도달 시점</h3></div><b className={calc.deadlineMet ? "deadline-ok" : "deadline-bad"}>{calc.deadlineMet ? "9/16 이전 달성" : "9/16 달성 불가"}</b></div>
          <div className="pull-buttons" role="group" aria-label={`${targetLevel} 달성 주차 당기기`}>
            {calc.bestPlansByWeek.map((bestPlan) => <button key={bestPlan.pullWeeks} className={bestPlan.pullWeeks === calc.effectivePullWeeks ? "active" : ""} onClick={() => selectCalculatedRoute({ pullWeeks: bestPlan.pullWeeks, pullStrategy: bestPlan.strategy })} disabled={!bestPlan.feasible}><span>{bestPlan.pullWeeks ? `${bestPlan.pullWeeks}주 당김` : "마감만"}</span><strong>{shortDate(bestPlan.result.reached)}</strong><small>최저 {formatMP(bestPlan.result.maplePoints)}</small></button>)}
          </div>
          <p>주차를 선택하면 해당 날짜를 맞추는 최소 비용 경로를 계산합니다.</p>
        </div>
        <div className="strategy-choice">
          <div className="strategy-choice-head"><span>경로 선택</span><h3>{calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 당김 경로` : "마감 기준 경로"}</h3><p>같은 도달일에는 메포가 적은 경로만 표시합니다.</p></div>
          <div className="strategy-choice-grid">{calc.recommendedPlansByWeek[calc.effectivePullWeeks].map((plan, index) => { const strategy = pullStrategies.find(item => item.id === plan.strategy)!; const active = plan.strategy === calc.selectedPlan.strategy; const recommended = plan.strategy === calc.bestRoiStrategy; return <button key={strategy.id} className={`${active ? "active" : ""} ${recommended ? "recommended" : ""}`} onClick={() => selectCalculatedRoute({ pullStrategy: strategy.id })}><div><span>{recommended ? "추천 · 순손익 최고" : index === 0 ? "메포 최저" : "더 빠른 선택"}</span><i>{active ? "선택됨" : "선택"}</i></div><h4>{strategy.label}</h4><p>{strategy.caption}</p><strong>{shortDate(plan.result.reached)}</strong><dl><div><dt>총액</dt><dd>{formatMP(plan.result.maplePoints)}</dd></div><div><dt>몬파</dt><dd>{formatMP(plan.result.monsterParkMaplePoints)}</dd></div><div><dt>상점</dt><dd>{formatMP(plan.result.shopMaplePoints)}</dd></div></dl><small>{calc.effectivePullWeeks ? shopPurchasePlanLabel(plan.shopBlueCount, plan.shopMechCount) : "0주에서는 농장 미구매"}</small></button>; })}</div>
        </div></>}
        {targetLevel === 285 && <ProgressChart selected={r} sunday={calc.sunday} free={calc.free} targetLevel={targetLevel} />}
        {forecastMode ? <div className="route-grid">
          <article className="route-card chosen"><div><div className="route-card-label"><span>9/16 예상</span><i>계산 완료</i></div><h3>{calculatedSettings.paidMonsterPark ? "유료 몬파 추가 5판 ON" : "유료 몬파 추가 5판 OFF"}</h3><p>{calculatedSettings.paidMonsterPark ? "매일 7판 · 스페셜 선데이 적용" : "매일 기본 2판만 적용"}</p></div><strong>{forecastProgress}</strong><dl><div><dt>메포 합계</dt><dd>{formatMP(r.maplePoints)}</dd></div><div><dt>프라임</dt><dd>{formatCash(primeCash)}</dd></div></dl></article>
          <article className="route-card free-route"><div><div className="route-card-label"><span>모멘텀 PLUS</span><i>{!calculatedSettings.momentumPass2Enabled ? "참여 OFF" : calculatedSettings.momentumPrime2 ? "프라임 ON" : calculatedSettings.momentumPremium2 ? "프리미엄" : "무료"}</i></div><h3>8/20~9/16</h3><p>{calculatedSettings.momentumPass2Enabled ? `현재 패스 Lv.${calculatedSettings.momentumPass2Level}` : "보상 계산 제외"}</p></div><strong>{calculatedSettings.momentumPass2Enabled && calculatedSettings.momentumPrime2 ? "69,600 캐시" : calculatedSettings.momentumPass2Enabled && calculatedSettings.momentumPremium2 ? "29,800 캐시" : "무료"}</strong><dl><div><dt>일반 보상</dt><dd>{calculatedSettings.momentumPass2Enabled ? "반영" : "제외"}</dd></div><div><dt>프라임</dt><dd>{calculatedSettings.momentumPass2Enabled ? "추가 보상만" : "0"}</dd></div></dl></article>
        </div> : <div className={`route-grid ${calc.effectivePullWeeks === 0 ? "two" : ""}`}>
          <article className="route-card chosen"><div><div className="route-card-label"><span>선택 경로 · {calc.effectivePullWeeks}주</span><i>{calc.selectedPlan.strategy === calc.bestRoiStrategy ? "추천 · 순손익 최고" : "선택됨"}</i></div><h3>{selectedRouteTitle}</h3><p>{calc.effectivePullWeeks === 0 ? "9월 16일 마감 기준" : `${calc.effectivePullWeeks}주 당김 기준`}{r.shopMaplePoints > 0 ? ` · 상점 ${formatMP(r.shopMaplePoints)} · ${shopPurchasePlanLabel(r.shopBluePurchased, r.shopMechPurchased)}` : " · 메포샵 미구매"}</p></div><strong>{calc.deadlineMissed ? (calc.deadlineForecast ? `Lv.${calc.deadlineForecast.finalLevel}` : "미도달") : shortDate(r.reached)}</strong><dl><div><dt>총 비용</dt><dd>{formatMP(r.maplePoints)}</dd></div><div><dt>프라임</dt><dd>{formatCash(primeCash)}</dd></div><div><dt>메포샵</dt><dd>{formatMP(r.shopMaplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.selectedHardWeeks}회</dd></div></dl></article>
          {calc.effectivePullWeeks > 0 && <article className="route-card baseline"><div><div className="route-card-label"><span>0주 비교 기준</span><i>추가 당김 없음</i></div><h3>{calc.basePlan.result.scheduleLabel}</h3><p>선택 경로의 비용·하드 횟수를 비교하는 기준입니다.</p></div><strong>{shortDate(calc.basePlan.result.reached)}</strong><dl><div><dt>총 비용</dt><dd>{formatMP(calc.basePlan.result.maplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.baseHardWeeks}회</dd></div></dl></article>}
          <article className="route-card free-route"><div><div className="route-card-label"><span>추가 메포 0 비교</span><i>무료 기준</i></div><h3>매일 2판</h3><p>일요일 추가 5판도 하지 않는 비교 경로입니다.</p></div><strong>{shortDate(calc.free.reached)}</strong><dl><div><dt>추가 메포</dt><dd>0 메포</dd></div><div><dt>9/16 마감</dt><dd>{calc.free.reached && calc.free.reached <= calc.deadline ? "통과" : "실패"}</dd></div></dl></article>
        </div>}
        {targetLevel === 285 && <><div className="decision-card">
          <div className="decision-top"><div><span>HARD MAYRIN ROI · {calc.effectivePullWeeks ? `0주 대비 · ${selectedStrategy.label}` : "DEADLINE"}</span><h3>{calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 당김 총손익` : "9월 16일 마감 확보 비용"}</h3></div><strong className={primaryRoiNetValue >= 0 ? "positive" : "negative"}>{primaryRoiNetValue >= 0 ? "+" : ""}{eok(primaryRoiNetValue)} 메소</strong></div>
          <div className="roi-grid"><div><span>{calc.effectivePullWeeks ? "0주 대비 추가 메포" : "추가 메포 0 대비"}</span><b>{formatMP(calc.effectivePullWeeks ? calc.cumulativeMP : calc.marginalMP)}</b><small>{calc.effectivePullWeeks ? `0주 ${formatMP(calc.basePlan.result.maplePoints)} → ${calc.effectivePullWeeks}주 ${formatMP(r.maplePoints)}` : `몬파 ${formatSignedMP(calc.marginalMonsterParkMP)} · 상점 ${formatSignedMP(calc.marginalShopMP)}`}</small></div><div><span>{calc.effectivePullWeeks ? "0주 대비 하드 추가" : "하드 추가 횟수"}</span><b>{primaryRoiHardWeeks}회</b><small>노말→하드 가치 {eok(calc.hardValue)}</small></div><div><span>{calc.effectivePullWeeks ? "0주 대비 누적 회수" : "마감 경로 회수"}</span><b>{eok(primaryRoiRecoveredValue)}</b><small>비용 {eok(calc.effectivePullWeeks ? calc.cumulativeCostValue : calc.marginalCostValue)} · 회수율 {primaryRoiRecoveryRate.toFixed(1)}%</small></div></div>
          {calc.effectivePullWeeks > 0 && <div className="cumulative-roi"><span>직전 {calc.effectivePullWeeks - 1}주 경로 대비</span><b>{calc.marginalMP === 0 ? `직전 ${calc.effectivePullWeeks - 1}주 경로와 같은 비용` : `메포 ${formatSignedMP(calc.marginalMP)}`} · 하드 +{calc.marginalGainedHardWeeks}회 · 단계 손익 <em className={calc.marginalNetValue >= 0 ? "positive" : "negative"}>{calc.marginalNetValue >= 0 ? "+" : ""}{eok(calc.marginalNetValue)}</em></b></div>}
          <p>{calc.effectivePullWeeks ? `0주 비교 기준부터 선택한 ${calc.effectivePullWeeks}주 경로까지 누적한 비용과 하드 추가 횟수입니다. 직전 단계 증분은 위 보조 줄에서 따로 확인할 수 있습니다.` : `9월 16일 ${targetLevel} 목표를 기준으로 상점 구매 없이 마감을 맞추는 최소 몬파 비용을 표시합니다.`} 하드 메이린 횟수는 {forecastMode ? "중간 285 도달일" : "285 도달일"} 기준입니다.</p>
        </div>
        <details className="value-settings"><summary>메이린 가치·환율 수정</summary><div className="field-grid"><InputField label="노말→하드 결정석 차이 · 억" value={s.mayrinMesoGap} step={0.1} onChange={v => set("mayrinMesoGap", Number(v))} /><InputField label="노말 조각 예상량" value={s.mayrinNormalFrag} onChange={v => set("mayrinNormalFrag", Number(v))} /><InputField label="조각 1개 · 만 메소" value={s.fragPrice} step={10} onChange={v => set("fragPrice", Number(v))} /><InputField label="메소 1억당 메포" value={s.mpPerEok} step={100} onChange={v => set("mpPerEok", Number(v))} /></div><Toggle label="9/17 초기화 후 추가 1회 가정" checked={s.postReset} onChange={v => set("postReset", v)} /></details>
        </>}
        <section className="advice-panel">
          <div className="trace-head">
            <div><span>보상 사용 조언</span><h3>언제 쓰는 게 이득인가</h3></div>
            <p>같은 아이템도 레벨 구간마다 실제 획득 경험치가 다릅니다. 현재 Lv.{calculatedSettings.level} · 목표 {calculatedSettings.targetLevel} 기준입니다.</p>
          </div>
          <div className="advice-list">
            {rewardAdvice.map(item => <article key={item.type} className="advice-row">
              <div className="advice-name"><b>{item.label}</b><span>{item.unit}당 지금 {jo(item.nowRaw)}</span></div>
              <div className="advice-body">
                {item.gainPercent > 0.5
                  ? <b className="advice-gain">Lv.{item.bestLevel}까지 모았다 쓰면 +{item.gainPercent.toFixed(1)}%</b>
                  : <b className="advice-flat">지금 써도 손해 없음</b>}
                {item.blockedGainPercent > 0.5 && <span>목표를 넘기면 Lv.{item.blockedLevel}에서 +{item.blockedGainPercent.toFixed(1)}% 더 오릅니다</span>}
              </div>
            </article>)}
          </div>
          <div className="advice-verdict">
            <b>{pickedMechHold === 280 ? "크림슨은 지금 쓰는 것이 낫습니다" : `크림슨은 Lv.${pickedMechHold}까지 모았다 쓰는 것이 낫습니다`}</b>
            <span>후보 시점을 실제로 돌려 결과가 가장 좋은 쪽을 고릅니다. 위의 한 장 가치와 다를 수 있습니다.</span>
            <table className="hold-table">
              <thead><tr><th>사용 시점</th><th>{calculatedSettings.calcMode === "forecast" ? "9/16 도달 지점" : "목표 도달일"}</th><th>차이</th></tr></thead>
              <tbody>
                {holdAnalysis.options.map(option => {
                  const immediate = holdAnalysis.options.find(item => item.level === 280);
                  const diff = immediate ? (option.progress - immediate.progress) * 100 : 0;
                  return <tr key={option.level} className={option.best ? "best" : ""}>
                    <td>{option.level === 280 ? "지금 바로" : `Lv.${option.level}까지 모음`}</td>
                    <td>{calculatedSettings.calcMode === "forecast"
                      ? `Lv.${Math.floor(option.progress)} ${((option.progress % 1) * 100).toFixed(2)}%`
                      : option.reached ? shortDate(option.reached) : "미도달"}</td>
                    <td>{option.level === 280 ? "기준" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%p`}</td>
                  </tr>;
                })}
              </tbody>
            </table>
            <span>레벨이 오르면 한 장 가치가 오르지만(레벨당 약 1.2%), 레벨을 일찍 올리면 그 뒤 매일 버는 경험치가 커집니다. 285에서 몬파·일퀘가 카르시온으로, 290에서 탈라하트로 바뀌며 일일 수입이 크게 뜁니다. 그래서 경계가 앞에 있으면 지금 쓰는 쪽이, 경계 사이에 갇혀 있으면 모으는 쪽이 이깁니다.</span>
            {pickedMechHold !== 280 && Math.abs(holdAnalysis.gainOverImmediate) < 1.5 && <span className="hold-caution">모아서 얻는 값이 {holdAnalysis.gainOverImmediate.toFixed(2)}%p뿐입니다. PLUS 보상은 9월 17일 오전 2시에 사용 마감이라 접속을 놓치면 전량 소멸합니다. 이 정도 차이면 지금 쓰는 편이 안전합니다.</span>}
          </div>
          <p className="pre-disclaimer">위 수치는 한 장의 가치만 비교한 것입니다. 실제로는 레벨을 일찍 올릴수록 그 뒤 매일 버는 경험치가 커지고, 285에서 몬파·일퀘가 카르시온으로 290에서 탈라하트로 바뀌며 일일 수입이 크게 뜁니다. 그래서 경계가 앞에 있으면 모으는 것보다 지금 쓰는 편이 낫습니다. 블루베리는 280 이상이면 완전히 고정이라 미룰 이유가 없습니다.</p>
        </section>
        <section className="trace-panel">
          <div className="trace-head">
            <div><span>계산 근거</span><h3>날짜별 진행</h3></div>
            <p>선택 경로에서 그날 실제로 쓴 것과 원천별 경험치 기여량입니다. ×를 누른 원천은 계산 전체에서 빼며, 계산하기를 눌러 적용합니다.</p>
          </div>
          <div className="trace-totals">
            <div><span>몬스터파크</span><b>{traceTotals.runs.toLocaleString("ko-KR")}판</b></div>
            <div><span>메카베리</span><b>{traceTotals.mech.toLocaleString("ko-KR")}장</b></div>
            <div><span>크림슨 메카베리</span><b>{traceTotals.crimson.toLocaleString("ko-KR")}장</b></div>
            <div><span>블루베리</span><b>{traceTotals.blue.toLocaleString("ko-KR")}장</b></div>
            <div><span>상급 EXP</span><b>{traceTotals.adv.toLocaleString("ko-KR")}장</b></div>
            <div><span>VIP 사우나</span><b>{traceTotals.sauna.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}시간</b></div>
            <div><span>성장의 비약</span><b>{traceTotals.potion.toLocaleString("ko-KR")}개</b></div>
          </div>
          {traceExclusionItems.length > 0 && <div className="trace-exclusions" aria-live="polite">
            <span>계산에서 제외</span>
            <div>
              {traceExclusionItems.map(id => {
                const currentExcluded = pendingExcludedSources.includes(id);
                const calculatedExcluded = calculatedExcludedSources.includes(id);
                const state = calculatedExcluded
                  ? currentExcluded ? "복구" : "복구 예정 · 취소"
                  : "제외 예정 · 취소";
                const accessibleAction = calculatedExcluded
                  ? currentExcluded ? "계산에 다시 포함" : "복구 예정 취소"
                  : "계산 제외 취소";
                return <button
                  type="button"
                  key={id}
                  className={!currentExcluded && calculatedExcluded ? "restoring" : calculatedExcluded ? "excluded" : "pending"}
                  onClick={() => toggleTraceSource(id)}
                  aria-label={`${EXPERIENCE_SOURCE_LABELS[id]} ${accessibleAction}`}
                ><b>{EXPERIENCE_SOURCE_LABELS[id]}</b><span>{state}</span></button>;
              })}
            </div>
          </div>}
          <div className="pre-timeline trace-timeline">
            {traceRows.length ? traceRows.map(row => <article className="pre-row trace-row" key={row.key}>
              <time>{shortDate(row.date)}</time>
              <div>
                <b>{row.labels.join(" · ")}</b>
                <span>Lv.{row.fromLevel} {row.fromExp.toFixed(2)}% → Lv.{row.level} {row.exp.toFixed(2)}%</span>
                {row.contributions.length > 0 && <ul className="trace-breakdown" aria-label={`${shortDate(row.date)} 원천별 경험치 기여량`}>
                  {row.contributions.map(contribution => {
                    const pendingRemoval = pendingExcludedSources.includes(contribution.id);
                    return <li key={contribution.id} className={pendingRemoval ? "pending-removal" : ""}>
                      <span className="trace-source-label">{contribution.label}</span>
                      <b>+{contribution.roundedGain.toFixed(2)}%p</b>
                      {pendingRemoval && <em>제외 예정</em>}
                      <button
                        type="button"
                        className="trace-source-toggle"
                        onClick={() => toggleTraceSource(contribution.id)}
                        aria-pressed={pendingRemoval}
                        aria-label={`${contribution.label} ${pendingRemoval ? "계산 제외 취소" : "계산에서 제외"}`}
                        title={pendingRemoval ? "계산 제외 취소" : "계산에서 제외"}
                      ><span aria-hidden="true">{pendingRemoval ? "↶" : "×"}</span></button>
                    </li>;
                  })}
                </ul>}
              </div>
              <em className="trace-total"><span>전체</span><b>+{row.gain.toFixed(2)}%p</b></em>
            </article>) : <div className="pre-empty">표시할 진행 내역이 없습니다.</div>}
          </div>
          <p className="pre-disclaimer">원천별 표시값은 합계가 전체 증가폭과 맞도록 0.01%p 단위로 배분합니다. 레벨이 오르면 필요 경험치가 달라지므로 날짜별 수치를 그대로 더할 수는 없습니다.</p>
        </section>
      </div>
    </section>

    {forecastMode && <section className="rewards-section main-leftovers milestone-leftovers">
      <div className="section-heading light"><span>285</span><div><p>{shortDate(r.reach285At)} 마일스톤</p><h2>285 도달 시점 남는 보상</h2></div></div>
      <div className="leftover-grid">{milestoneLeftoverRows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="leftover-note">{r.startLevel >= 285 ? "이미 285 이상에서 시작해 계산 시작일 기준 보유·예정 보상을 표시합니다." : "9/16 예측 중 실제 285 도달일과 당시 패스·이벤트 잔여를 보존합니다."}</p>
    </section>}

    <section className={`rewards-section main-leftovers ${forecastMode ? "final-leftovers" : ""}`}>
      <div className="section-heading light"><span>잔여</span><div><p>{forecastMode ? "9/16 시즌 종료 기준" : r.reached ? `${shortDate(r.reached)} 기준` : `${r.horizonDays}일 계산 종료 기준`}</p><h2>{forecastMode ? "9/16에 남는 보상" : r.reached ? `${targetLevel} 달성 후 남는 보상` : "계산 종료 시점 남는 보상"}</h2></div></div>
      <div className="leftover-grid">{leftoverRows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="leftover-note">{momentumLeft ? `모멘텀 패스 4주차 보상은 ${targetLevel} 달성 후 수령합니다.` : "모멘텀 패스 4주차 보상까지 사용한 결과입니다."} {calculatedSettings.specialSupply ? calculatedSettings.specialSupplyExpPerCharge > 0 ? `특수 물자는 계산 중 ${r.specialSupplyUsed.toLocaleString("ko-KR")}회 사용했습니다.` : "특수 물자 실측값이 없어 경험치 0으로 계산했습니다." : "특수 물자는 계산에서 제외했습니다."}</p>
    </section>

    <section className="mech-summary" aria-label="메카베리 사용 시점"><span>메카베리 모아쓰기</span><strong>{calculatedSettings.deferMomentumMech ? `Lv.${r.momentumMechLevel} 또는 ${shortDate(r.momentumMechDeadline)}부터 사용` : "즉시 사용"}</strong></section>
    </>}

    {activeTab === "efficiency" && <section className="standalone-panel tab-panel efficiency-screen" id="efficiency-panel" role="tabpanel" aria-labelledby="efficiency-tab">
      <section className="priority-story" aria-labelledby="lv280-priority-title">
        <div className="priority-story-head">
          <div><span>LV.280 · 메포 사용 판단</span><h2 id="lv280-priority-title">먼저 몬파 7판, 농장은 필요할 때만</h2></div>
          <p>메포샵 메카베리·블루베리는 필수가 아닙니다. 몬파를 반영한 뒤에도 285 도착 주차가 당겨질 때만 고려합니다.<small>현재 입력: {s.start} · 에테리온 {efficiencyCoreLevel}레벨 · 코어 총합 20 {efficiencyCore20Applied ? "적용" : "미적용"} · 몬파 +{efficiencyMonsterParkBonus}%</small></p>
        </div>
        <style>{`.priority-story-head>p small{margin-top:8px;display:block;color:#b9f5d8;font-size:11px;font-weight:850;line-height:1.55}.priority-benchmark-note{margin-top:12px;padding:13px 16px;display:grid;grid-template-columns:auto 1fr 1fr;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.14);border-radius:15px;background:rgba(255,255,255,.055);font-size:12px}.priority-benchmark-note b{color:#b9f5d8}.priority-benchmark-note span{color:rgba(255,255,255,.82);font-weight:750}@media(max-width:760px){.priority-benchmark-note{grid-template-columns:1fr}}`}</style>
        <div className="priority-flow">
          <article className="priority-step first"><span>1 · 가장 먼저</span><h3>스페셜 선데이 몬파 7판</h3><strong>{efficiencyScoreById("mpSpecial", 280, efficiencyMonsterParkBonus).toFixed(1)}</strong><p>무료 2판 제외 · 유료 추가 5판분</p></article>
          <article className="priority-step second"><span>2 · 다음 판단</span><h3>평일 몬파 7판</h3><strong>{paidEfficiencyScore("monsterPark", 280, efficiencyMonsterParkBonus).toFixed(1)}</strong><p>유료 추가 5판 · 하루 3,000 메포</p></article>
          <article className="priority-step optional"><span>선택 · 메포샵</span><div><h3>메카베리 농장</h3><strong>{paidEfficiencyScore("mech", 280).toFixed(1)}</strong></div><div><h3>블루베리 농장</h3><strong>{paidEfficiencyScore("blue", 280).toFixed(1)}</strong></div><p>몬파 우선 경로로 다음 주차를 못 당길 때만 비교</p></article>
        </div>
        <div className="priority-benchmark-note"><b>7월 23일 이후 Lv.280 검산</b><span>5레벨+총합20 · 평일 333.6 · 스페셜 846.8</span><span>6레벨+총합20 · 평일 342.2 · 스페셜 855.4</span></div>
        <div className="priority-rule"><b>한 줄 결론</b><p>일요일 7판 → 평일 7판 검토 → 그래도 한 주가 당겨질 때만 농장 구매</p></div>
      </section>

      <section className="video-priority-asset" aria-labelledby="video-priority-title">
        <div className="video-priority-meta"><span>LIVE DATA · LV.280</span><h2 id="video-priority-title">현재 입력을 반영한 효율 비교</h2><p>이전 고정 이미지는 제거했습니다. 계산 시작일과 에테리온 5·6레벨 선택에 따라 몬스터파크 수치가 함께 바뀝니다.</p></div>
        <figure style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "center", background: "#11121a" }}>
          <div style={{ padding: 18, borderRadius: 14, background: "#7357ff", color: "white" }}><small>스페셜 선데이</small><strong style={{ marginTop: 8, display: "block", fontSize: 34 }}>{efficiencyScoreById("mpSpecial", 280, efficiencyMonsterParkBonus).toFixed(1)}</strong></div>
          <div style={{ padding: 18, borderRadius: 14, background: "#b9f5d8", color: "#11121a" }}><small>평일 몬파</small><strong style={{ marginTop: 8, display: "block", fontSize: 34 }}>{paidEfficiencyScore("monsterPark", 280, efficiencyMonsterParkBonus).toFixed(1)}</strong></div>
          <div style={{ padding: 18, borderRadius: 14, background: "#242633", color: "white" }}><small>메카베리</small><strong style={{ marginTop: 8, display: "block", fontSize: 28 }}>{paidEfficiencyScore("mech", 280).toFixed(1)}</strong></div>
          <div style={{ padding: 18, borderRadius: 14, background: "#242633", color: "white" }}><small>블루베리</small><strong style={{ marginTop: 8, display: "block", fontSize: 28 }}>{paidEfficiencyScore("blue", 280).toFixed(1)}</strong></div>
        </figure>
      </section>

      <section className="item-conversion-panel" aria-labelledby="item-conversion-title">
        <div className="item-conversion-head">
          <div><span>보유 보상 · 획득량 환산</span><h2 id="item-conversion-title">전부 쓰면 어디까지 오르나요?</h2><p>현재 계산기에 입력한 보유량을 선택 레벨부터 순서대로 사용합니다. 메포 효율 순위와는 별도 계산입니다.</p></div>
          <div className="item-conversion-inputs">
            <label className="efficiency-level-picker" htmlFor="efficiency-level-input">
              <span>현재 레벨</span>
              <div className="efficiency-level-control"><b>Lv.</b><input id="efficiency-level-input" type="number" min={EFFICIENCY_LEVEL_MIN} max={EFFICIENCY_LEVEL_MAX} step="1" list="efficiency-level-options" value={efficiencyLevelInput} inputMode="numeric" aria-describedby="efficiency-level-help" onChange={event => updateEfficiencyLevelInput(event.target.value)} onBlur={normalizeEfficiencyLevelInput} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div>
              <datalist id="efficiency-level-options">{Array.from({ length: EFFICIENCY_LEVEL_MAX - EFFICIENCY_LEVEL_MIN + 1 }, (_, index) => EFFICIENCY_LEVEL_MIN + index).map(level => <option value={level} key={level}>Lv.{level}</option>)}</datalist>
              <small id="efficiency-level-help">260~295 · 선택 또는 직접 입력</small>
            </label>
            <label className="item-conversion-exp" htmlFor="item-conversion-exp-input"><span>현재 경험치</span><div><input id="item-conversion-exp-input" type="number" min="0" max="99.999" step="0.001" inputMode="decimal" value={itemConversionExpInput} onChange={event => setItemConversionExpInput(event.target.value)} onBlur={normalizeItemConversionExpInput} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><b>%</b></div></label>
            <button type="button" className="item-conversion-sync" onClick={loadCalculatorProgressIntoConversion}>285·290 계산 탭 현재값 불러오기</button>
          </div>
        </div>
        <div className="item-conversion-result" aria-live="polite">
          <div className="item-conversion-route"><span>현재</span><b>Lv.{itemConversionResult.startLevel} {itemConversionResult.startExp.toFixed(3)}%</b><i aria-hidden="true">→</i><span>사용 후</span><strong>{itemConversionResult.reachedUpperLimit ? "Lv.296 이상" : `Lv.${itemConversionResult.level} ${itemConversionResult.exp.toFixed(3)}%`}</strong></div>
          <div className="item-conversion-totals"><span><small>레벨 진행도</small><b>+{Math.max(0, itemConversionGain).toFixed(2)}%p</b></span><span><small>사용 경험치</small><b>{formatItemConversionExperience(itemConversionResult.totalRawExperience)}</b></span></div>
        </div>
        <div className="item-conversion-list" aria-label={`Lv.${efficiencyLevel} 아이템별 경험치 환산`}>
          {itemConversionRows.map(row => {
            const available = row.type !== "mech" || efficiencyLevel >= 280;
            const raw = itemConversionRawExperience(row.type, efficiencyLevel) * row.sampleAmount;
            const percent = itemConversionPercent(row.type, efficiencyLevel, row.sampleAmount);
            return <article className={!available ? "unavailable" : ""} key={row.type}>
              <span className={`item-conversion-mark type-${row.type}`} aria-hidden="true">{row.iconSrc ? <i className="item-conversion-icon" style={{ backgroundImage: `url(${assetUrl(row.iconSrc)})` }} /> : row.mark}</span>
              <div className="item-conversion-name"><b>{row.label}</b><small>보유 {row.amount.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}{row.unit}</small></div>
              <div className="item-conversion-value"><small>{available ? row.sampleUnit : "사용 조건"}</small><b>{available ? formatItemConversionExperience(raw) : "Lv.280부터"}</b></div>
              <div className="item-conversion-percent"><small>획득량</small><b>{available ? `+${percent.toFixed(percent >= 1 ? 2 : 3)}%p` : "-"}</b></div>
            </article>;
          })}
        </div>
        {!itemConversionHasInventory && <div className="item-conversion-empty"><p>보유량이 0이라 결과가 그대로입니다. 285·290 계산 탭에서 실제 남은 수량을 입력해 주세요.</p><button type="button" onClick={() => setActiveTab("calculator")}>+ 수동 입력으로 이동</button></div>}
        <div className="item-conversion-notes">
          <p><b>구분:</b> 위 %p는 아이템으로 오르는 경험치입니다. 아래 VIP 사우나=100은 가격 대비 효율 지수라 서로 비교할 수 없습니다.</p>
          <p><b>보유량:</b> 285·290 계산 탭의 현재 입력값이며, 이전 날짜 예약 데이터가 남아 있으면 함께 합산합니다. + 수동 입력을 적용하면 같은 종류는 입력한 한 값으로 정리됩니다.</p>
          <p><b>사용 순서:</b> 블루베리 → 메카베리 → VIP 사우나 → 전설 성장의 비약 → 상급 EXP. 레벨이 오르면 다음 아이템은 새 레벨 값을 적용합니다.</p>
          {efficiencyLevel < 280 && <p><b>260~279:</b> 이 표는 아이템 자체 경험치 환산입니다. 챌린저스 월드의 2레벨 상승은 `260→280` 탭에서 계산합니다.</p>}
          {efficiencyLevel === 285 && <p><b>Lv.285 검산:</b> 상급 EXP 1,000장 = 914,168,000,000 EXP · +0.92%p. 일반 EXP 1,000장 = 76,572,000,000 EXP · +0.08%p는 현재 보유량 입력 대상이 아닙니다.</p>}
          <a href="https://maplescouter.com/ko/exp/item" target="_blank" rel="noreferrer">메이플스카우터 소비아이템 환산과 대조</a>
        </div>
      </section>

      <section className="efficiency-panel full-efficiency-table">
        <div className="efficiency-head">
          <div><span>LV.{efficiencyLevel} · VIP 사우나 100 기준 · 현재 몬파 +{efficiencyMonsterParkBonus}%</span><h3>Lv.260~295 경험치 효율표</h3></div>
          <div className="efficiency-metric-label"><b>메포 효율 지수</b><span>획득 경험치가 아닌 가격 대비 값</span></div>
        </div>
        <div className="efficiency-list">
          {efficiencyRanking.map((source, index) => <div className={`efficiency-row ${index < 3 ? "top" : ""}`} data-source={source.id} key={source.id}>
            <strong>{index + 1}</strong>
            <span className={`efficiency-icon tone-${source.tone}`} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(efficiencyIconForLevel(source, efficiencyLevel))} alt="" aria-hidden="true" />
            </span>
            <div className="efficiency-name"><b>{efficiencyLabelForLevel(source, efficiencyLevel)}</b>{index === 0 && <small>Lv.{efficiencyLevel} 최고 효율</small>}</div>
            <div className="efficiency-values"><span className="active"><small>효율 지수{efficiencyLevel >= 285 && (source.id === "blue" || source.id === "mech") ? " · 근사" : ""}</small><b>{relativeEfficiencyScore(source, efficiencyLevel, efficiencyMonsterParkBonus).toFixed(1)}%</b></span></div>
          </div>)}
          {!efficiencyLevelAvailable && <div className="efficiency-empty" role="status"><b>Lv.{efficiencyLevel} 수치를 확인 중입니다.</b><span>검증값이 없는 레벨은 앞뒤 레벨로 보간하지 않습니다.</span></div>}
        </div>
        <p>수치는 획득 경험치가 아니라 VIP 사우나를 100으로 둔 효율 비교 지수입니다. 몬스터파크는 계산 시작일과 에테리온 5·6레벨 선택, 코어 총합 20 적용일을 반영합니다. Lv.260~279는 해당 레벨의 하이마운틴·앵글러 컴퍼니와 몬파 구간값을 사용하며, 모멘텀 패스와 메카베리는 Lv.280부터 표시합니다. Lv.285~295 농장은 하루1소재 공개 퍼센트 기반 근사값입니다.</p>
      </section>
    </section>}

    {activeTab === "passes" && <section className="rewards-section passes-panel tab-panel" id="passes-panel" role="tabpanel" aria-labelledby="passes-tab">
      <div className="section-heading light"><span>표</span><div><p>현재 패스 레벨 입력 가능</p><h2>패스 보상표</h2></div></div>
      <div className="pass-grid"><article><div className="table-title"><span>CHALLENGERS · 현재 {s.challengerPassLevel}레벨</span><h3>챌린저스 EXP 패스</h3></div><table><thead><tr><th>레벨 구간</th><th>일반</th><th>EXP 패스 포함</th></tr></thead><tbody><tr><td>1~10</td><td>-</td><td>블루베리 6 · 사우나 2시간 · 상급 EXP 2,000</td></tr><tr><td>11~20</td><td>-</td><td>블루베리 6 · 사우나 2시간 · 상급 EXP 2,000</td></tr><tr><td>21~25</td><td>상급 EXP 100</td><td>블루베리 3 · 사우나 1시간 · 상급 EXP 1,100</td></tr><tr><td>26~30</td><td>상급 EXP 2,100</td><td>블루베리 2 · 사우나 1시간 · 상급 EXP 3,100 · 비약 1</td></tr><tr className="total"><td>1~30 합계</td><td>상급 EXP 2,200</td><td>블루베리 17 · 사우나 6시간 · 상급 EXP 8,200 · 비약 1</td></tr></tbody></table></article><article><div className="table-title"><span>MOMENTUM · 1차 소멸</span><h3>모멘텀 패스 1차 (종료)</h3></div><table><thead><tr><th>회차별 합계</th><th>보상</th></tr></thead><tbody><tr><td>상태</td><td>8/19 수령 마감 · 8/20 오전 2시 사용 마감 · 아이템까지 소멸해 계산에서 완전히 제외</td></tr><tr><td>일반</td><td>메카베리 1 · 사우나 1.5시간 · 상급 EXP 500</td></tr><tr><td>프라임 추가</td><td>메카베리 10 · 상급 EXP 9,000 · 4배 쿠폰 6</td></tr><tr className="total"><td>프라임 포함</td><td>메카베리 11 · 사우나 1.5시간 · 상급 EXP 9,500 · 4배 쿠폰 6</td></tr><tr><td>기간</td><td>7/23~8/19</td></tr><tr><td>가격</td><td>49,800 넥슨캐시</td></tr></tbody></table></article><article><div className="table-title"><span>MOMENTUM PLUS · 현재 {s.momentumPass2Enabled ? `Lv.${s.momentumPass2Level}` : "OFF"}</span><h3>모멘텀 패스 PLUS</h3></div><table><thead><tr><th>등급</th><th>누적 보상</th><th>누적 캐시</th></tr></thead><tbody><tr><td>무료</td><td>크림슨 1 · 사우나 1.5시간 · 상급 EXP 500</td><td>-</td></tr><tr><td>프리미엄</td><td>크림슨 6 · 사우나 1.5시간 · 상급 EXP 5,000 · 4배 쿠폰 4</td><td>29,800</td></tr><tr className="total"><td>프라임</td><td>크림슨 17 · 사우나 1.5시간 · 상급 EXP 14,000 · 4배 쿠폰 10</td><td>69,600</td></tr><tr><td>기간</td><td colSpan={2}>8/20~9/16 · 프라임은 프리미엄 선구매 필수</td></tr><tr><td>주차 해금</td><td colSpan={2}>750포인트당 1레벨 · 주 최대 2,500포인트 → 1주 Lv.3 · 2주 Lv.6 · 3주 Lv.10</td></tr><tr><td>밀린 주차</td><td colSpan={2}>전 주 미획득 포인트를 100당 1,000 메포로 구매 · 1레벨 7,500 메포</td></tr><tr><td>크림슨 경험치</td><td colSpan={2}>전 구간 동렙몹 1,478,400마리 고정 · 280~284 1.5556배 · 285~289 1.1667배 · 290+ 1.0769배 (하루1소재)</td></tr></tbody></table></article></div>
    </section>}

    <footer><div className="brand"><span className="brand-mark">M</span><span>285·290 CALCULATOR</span></div><p>경험치 기준 · 하루1소재 · 메이플로드 · 2026.08.03 확인</p><div className="source-links"><a href="https://haru1sojae.kr/table" target="_blank" rel="noreferrer">하루1소재</a><a href="https://mapleroad.kr/utils/exp_calculator" target="_blank" rel="noreferrer">메이플로드</a><a href="https://maplestory.nexon.com/testworld/news/all/188" target="_blank" rel="noreferrer">테스트월드</a></div></footer>
  </main>;
}
