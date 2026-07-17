"use client";

import { useMemo, useRef, useState } from "react";
import {
  advanceBurningBeyondExperience,
  growthPotionExperience,
  monsterParkExperiencePercent,
  paidMonsterParkMaplePoints,
} from "@/lib/calculator-core.mjs";

type PullStrategy = "monsterPark" | "blue" | "mech" | "both";
type ViewTab = "calculator" | "pre280" | "efficiency" | "passes";
type Settings = {
  level: number;
  exp: number;
  start: string;
  pullWeeks: number;
  pullStrategy: PullStrategy;
  specialSundayCount: number;
  challengerPassLevel: number;
  momentumPassLevel: number;
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
  momentumMechDeadline: string;
  mayrinMesoGap: number;
  mayrinNormalFrag: number;
  fragPrice: number;
  mpPerEok: number;
  postReset: boolean;
  challengerUnclaimed: boolean;
  challengerExp: boolean;
  momentumPrime: boolean;
  deferMomentumMech: boolean;
  core6Enabled: boolean;
  apology: boolean;
  specter: boolean;
  shardEvent: boolean;
  ultima: boolean;
  shopMech: boolean;
  shopBlue: boolean;
  mpNow: number;
  mpPatch: number;
  core20Date: string;
  core20Bonus: number;
  core6Date: string;
  mpCore6: number;
  dailyNow: number;
  dailyPatch: number;
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
  epicNow: number;
  epicPatch: number;
  core25Date: string;
  core25Bonus: number;
  epicArtifactDate: string;
  epicArtifact: number;
  epicCore6: number;
  epicCore6Artifact: number;
  ownedBlue: number;
  ownedMech: number;
  ownedSauna: number;
  ownedAdv: number;
  ownedPotion279: number;
};

type ItemType = "blue" | "mech" | "sauna" | "adv" | "potion269" | "potion279" | "coupon3x" | "coupon4x";
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
type Row = { date: Date; key: string; level: number; exp: number; progress: number; events: string[] };
type Simulation = {
  start: Date;
  startLevel: number;
  startExp: number;
  rows: Row[];
  reached: Date | null;
  leftovers: Leftovers;
  leftoverSources: string[];
  shopMaplePoints: number;
  monsterParkMaplePoints: number;
  maplePoints: number;
  scheduleLabel: string;
  sevenUntil: Date;
  specialSundayCount: number;
  momentumMechLevel: number;
  momentumMechDeadline: Date;
  dailyDaysApplied: number;
  ultimaCountAtReach: number;
};
type PullPlan = { pullWeeks: number; targetClearWeeks: number; result: Simulation; feasible: boolean; strategy: PullStrategy; shopBlueWeeks: number; shopMechWeeks: number };
type StrategyCandidate = { result: Simulation; shopBlueWeeks: number; shopMechWeeks: number };
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

const efficiency: Record<number, Record<string, number>> = {
  280: { grandis: 0.3857, mp7: 2.2302, extreme: 2.604, epic: 3.0885, adv100: 0.22977, sauna: 0.9313, blue: 6.4818, mech: 9.7053 },
  281: { grandis: 0.3507, mp7: 2.0272, extreme: 2.3996, epic: 2.8461, adv100: 0.21173, sauna: 0.8582, blue: 5.8925, mech: 8.9434 },
  282: { grandis: 0.3188, mp7: 1.8431, extreme: 2.2077, epic: 2.6183, adv100: 0.19479, sauna: 0.7896, blue: 5.3568, mech: 8.2281 },
  283: { grandis: 0.2898, mp7: 1.6758, extreme: 2.0339, epic: 2.412, adv100: 0.17946, sauna: 0.7274, blue: 4.8699, mech: 7.5803 },
  284: { grandis: 0.2635, mp7: 1.5232, extreme: 1.8708, epic: 2.2187, adv100: 0.16507, sauna: 0.6691, blue: 4.4271, mech: 6.9727 },
};

const emptyLeftovers = (): Leftovers => ({ blue: 0, mech: 0, sauna: 0, adv: 0, potion269: 0, potion279: 0, coupon3x: 0, coupon4x: 0 });
const itemTypes = Object.keys(emptyLeftovers()) as ItemType[];
const parseDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDate = (date: Date | null) => date ? `${date.getMonth() + 1}/${date.getDate()}` : "미도달";
const longDate = (date: Date | null) => date ? `${date.getMonth() + 1}월 ${date.getDate()}일` : "120일 이후";
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const req = (level: number) => Math.pow(1.1, level - 280);
const formatMP = (value: number) => `${Math.round(value).toLocaleString("ko-KR")} 메포`;
const formatSignedMP = (value: number) => `${value > 0 ? "+" : ""}${formatMP(value)}`;
const eok = (value: number) => `${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;

const defaults: Settings = {
  level: 280, exp: 87.39, start: "2026-07-17", pullWeeks: 0, pullStrategy: "monsterPark", specialSundayCount: 1,
  challengerPassLevel: 20, momentumPassLevel: 0,
  preLevel: 270, preExp: 0, prePassLevel: 0, preUnclaimed: true,
  preUseBlue: true, preUseSauna: true, preUseAdv: true, preUsePotion: true,
  preMonsterParkRuns: 2, preSpecialSundayCount: 1, preDailyQuests: true, preWeeklyContent: true,
  preTodayDaily: true, preWeeklyOpen: true,
  momentumMechLevel: 284, momentumMechDeadline: "2026-08-12", mayrinMesoGap: 3, mayrinNormalFrag: 30,
  fragPrice: 640, mpPerEok: 2500, postReset: true, challengerUnclaimed: true, challengerExp: true,
  momentumPrime: true, deferMomentumMech: true, core6Enabled: false, apology: true, specter: true,
  shardEvent: true, ultima: true, shopMech: false, shopBlue: false, mpNow: 86, mpPatch: 90,
  core20Date: "2026-07-23", core20Bonus: 5, core6Date: "2026-07-23", mpCore6: 95,
  dailyNow: 76, dailyPatch: 95, dailyCore6: 100, shardDate: "2026-07-23", shardAdv: 5000,
  ultimaCount: 21, ultimaWeek: 1, ultimaStart: true, grandis: true, weeklyOpen: true, todayDaily: true,
  extreme: true, epic: true, epicMult: 5, epicNow: 30, epicPatch: 30, core25Date: "2026-08-06",
  core25Bonus: 10, epicArtifactDate: "2026-08-13", epicArtifact: 180, epicCore6: 40,
  epicCore6Artifact: 190, ownedBlue: 0, ownedMech: 0, ownedSauna: 0, ownedAdv: 0, ownedPotion279: 0,
};

const pullStrategies: { id: PullStrategy; label: string; caption: string }[] = [
  { id: "monsterPark", label: "평일 몬파", caption: "추가 5판으로만 당기기" },
  { id: "blue", label: "블루베리 구매", caption: "주당 2장 · 7,000 메포" },
  { id: "mech", label: "메카베리 구매", caption: "주당 2장 · 10,000 메포" },
  { id: "both", label: "농장 둘 다", caption: "주당 4장 · 17,000 메포" },
];

const viewTabs: { id: ViewTab; label: string; description: string }[] = [
  { id: "calculator", label: "285 계산", description: "달성일·몬파·메포" },
  { id: "pre280", label: "260→280", description: "버닝 비욘드" },
  { id: "efficiency", label: "경험치 효율", description: "레벨별 비교" },
  { id: "passes", label: "패스 보상", description: "전체 보상표" },
];

const pre280SettingKeys: (keyof Settings)[] = [
  "preLevel", "preExp", "prePassLevel", "preUnclaimed", "preUseBlue", "preUseSauna", "preUseAdv", "preUsePotion",
  "preMonsterParkRuns", "preSpecialSundayCount", "preDailyQuests", "preWeeklyContent", "preTodayDaily", "preWeeklyOpen",
  "challengerExp", "start", "mpNow", "mpPatch", "core20Date", "core20Bonus", "core6Enabled", "core6Date", "mpCore6",
  "dailyNow", "dailyPatch", "dailyCore6", "epicNow", "epicPatch", "core25Date", "core25Bonus", "epicArtifactDate",
  "epicArtifact", "epicCore6", "epicCore6Artifact",
];
const selectedSettingsKey = (settings: Settings, keys: (keyof Settings)[]) => JSON.stringify(keys.map(key => settings[key]));

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

const nextThursdayAfter = (date: Date) => {
  const days = (4 - date.getDay() + 7) % 7;
  return addDays(date, days || 7);
};
const challengerPassCapForDate = (date: Date) => date < parseDate("2026-07-23") ? 25 : 30;

type EfficiencyBenchmark = { id: string; label: string; base: number; raw?: (level: number) => number };
const momentumRaw = (level: number) => efficiency[level].mech * 11 + efficiency[level].sauna * 1.5 + efficiency[level].adv100 * 95;
const efficiencyBenchmarks: EfficiencyBenchmark[] = [
  { id: "extra50", label: "추가 경험치 50%", base: 1139.8 },
  { id: "mpSpecial", label: "몬스터파크 · 스페셜 선데이", base: 820.1, raw: level => efficiency[level].mp7 * 4 },
  { id: "momentum", label: "프라임 모멘텀 패스", base: 566.5, raw: momentumRaw },
  { id: "epic01", label: "악몽선경 · 0→1단계", base: 466.9, raw: level => efficiency[level].epic * 4 },
  { id: "mpSunday", label: "몬스터파크 · 선데이", base: 398.2, raw: level => efficiency[level].mp7 * 1.5 },
  { id: "mpNormal", label: "몬스터파크 · 일반", base: 313.9, raw: level => efficiency[level].mp7 },
  { id: "mech", label: "메카베리 농장", base: 312.6, raw: level => efficiency[level].mech },
  { id: "blue", label: "블루베리 농장", base: 294.3, raw: level => efficiency[level].blue },
  { id: "smallExpPotion", label: "소경축비", base: 175.4 },
  { id: "epic12", label: "악몽선경 · 1→2단계", base: 118.7, raw: level => efficiency[level].epic },
  { id: "sauna", label: "VIP 사우나", base: 100, raw: level => efficiency[level].sauna },
];
const relativeEfficiencyScore = (source: EfficiencyBenchmark, level: number) => {
  if (!source.raw) return source.base;
  const sourceChange = source.raw(level) / source.raw(281);
  const saunaChange = efficiency[level].sauna / efficiency[281].sauna;
  return source.base * sourceChange / saunaChange;
};

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
  const patchDate = parseDate("2026-07-23");
  const core20Date = s.core20Date ? parseDate(s.core20Date) : null;
  const core25Date = s.core25Date ? parseDate(s.core25Date) : null;
  const epicArtifactDate = s.epicArtifactDate ? parseDate(s.epicArtifactDate) : null;
  const requestedCore6Date = s.core6Enabled && s.core6Date ? parseDate(s.core6Date) : null;
  const core6Date = requestedCore6Date && requestedCore6Date >= patchDate ? requestedCore6Date : requestedCore6Date ? patchDate : null;
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
    const afterPatch = date >= patchDate;
    const afterCore6 = Boolean(core6Date && date >= core6Date);
    const afterCore20 = Boolean(core20Date && date >= core20Date);
    const afterCore25 = Boolean(core25Date && date >= core25Date);
    const afterArtifact = Boolean(epicArtifactDate && date >= epicArtifactDate);
    const mpBase = afterCore6 ? s.mpCore6 : afterPatch ? s.mpPatch : s.mpNow;
    const epicBase = afterCore6
      ? (afterArtifact ? s.epicCore6Artifact : s.epicCore6)
      : (afterArtifact ? s.epicArtifact : afterPatch ? s.epicPatch : s.epicNow);
    return {
      mp: mpBase + (afterPatch && afterCore20 ? s.core20Bonus : 0),
      daily: afterCore6 ? s.dailyCore6 : afterPatch ? s.dailyPatch : s.dailyNow,
      epic: epicBase + (afterPatch && afterCore25 ? s.core25Bonus : 0),
    };
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
      const to = Math.min(challengerPassCapForDate(rewardDate), passLevel + 5);
      if (to >= from) {
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
      }
      rewardDate = rewardDate.getTime() === start.getTime() ? nextThursdayAfter(start) : addDays(rewardDate, 7);
    }

    const weeklyDate = (day === 0 && s.preWeeklyOpen) || (day > 0 && date.getDay() === 4);
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
        const isSunday = date.getDay() === 0;
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

function simulate(s: Settings, schedule: { sevenUntil?: Date; fixedRuns?: number; deferMomentumMech?: boolean; shopBlueWeeks?: number; shopMechWeeks?: number } = {}): Simulation {
  const start = parseDate(s.start);
  const patchDate = parseDate("2026-07-23");
  const core20Date = s.core20Date ? parseDate(s.core20Date) : null;
  const core25Date = s.core25Date ? parseDate(s.core25Date) : null;
  const epicArtifactDate = s.epicArtifactDate ? parseDate(s.epicArtifactDate) : null;
  const requestedCore6Date = s.core6Enabled && s.core6Date ? parseDate(s.core6Date) : null;
  const core6Date = requestedCore6Date && requestedCore6Date >= patchDate ? requestedCore6Date : requestedCore6Date ? patchDate : null;
  let level = Math.max(280, Math.min(284, s.level));
  let xp = req(level) * Math.max(0, Math.min(99.999, s.exp)) / 100;
  const selectedCutoff = addDays(start, -1);
  const sevenUntil = schedule.sevenUntil ?? selectedCutoff;
  const fixedRuns = schedule.fixedRuns == null ? null : Math.max(0, Math.min(7, schedule.fixedRuns));
  const specialSundayCount = Math.max(0, Math.min(12, Math.floor(s.specialSundayCount)));
  const runsForDate = (date: Date) => fixedRuns == null ? (date.getDay() === 0 ? 7 : date <= sevenUntil ? 7 : 2) : fixedRuns;
  const scheduleLabel = fixedRuns == null
    ? sevenUntil < start ? "평일 2판 · 일요일 7판" : `${shortDate(sevenUntil)}까지 7판 · 이후 평일 2판`
    : `매일 ${fixedRuns}판`;
  const deferMomentumMech = schedule.deferMomentumMech ?? s.deferMomentumMech;
  const momentumMechLevel = Math.max(280, Math.min(284, s.momentumMechLevel));
  const momentumMechDeadline = s.momentumMechDeadline ? parseDate(s.momentumMechDeadline) : parseDate("2026-08-12");
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
    const to = Math.min(challengerPassCapForDate(challengerDate), challengerLevel + 5);
    if (to < from) {
      challengerDate = nextThursdayAfter(challengerDate);
      continue;
    }
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

  let momentumLevel = Math.max(0, Math.min(10, Math.floor(s.momentumPassLevel)));
  let momentumDate = start <= patchDate ? patchDate : start;
  const momentumEnd = parseDate("2026-08-19");
  const momentumWeeklyLevels = [2, 3, 3, 2];
  let momentumWeekIndex = 0;
  while (momentumLevel < 10 && momentumDate <= momentumEnd) {
    const from = momentumLevel + 1;
    const to = Math.min(10, momentumLevel + momentumWeeklyLevels[Math.min(momentumWeekIndex, momentumWeeklyLevels.length - 1)]);
    const batch: Reward = { label: `모멘텀 패스 ${from}~${to}레벨`, deferMech: deferMomentumMech };
    for (let passLevel = from; passLevel <= to; passLevel += 1) {
      const reward = momentumRewardForLevel(passLevel, s.momentumPrime, deferMomentumMech);
      batch.mech = Number(batch.mech || 0) + Number(reward.mech || 0);
      batch.sauna = Number(batch.sauna || 0) + Number(reward.sauna || 0);
      batch.adv = Number(batch.adv || 0) + Number(reward.adv || 0);
      batch.coupon4x = Number(batch.coupon4x || 0) + Number(reward.coupon4x || 0);
    }
    addReward(momentumDate, batch);
    momentumLevel = to;
    momentumDate = momentumDate.getTime() === start.getTime() ? nextThursdayAfter(start) : addDays(momentumDate, 7);
    momentumWeekIndex += 1;
  }
  if (s.apology) addReward(start, { label: "7월 NOW 보상", mech: 1, sauna: 2, coupon4x: 4 });
  if (s.specter) addReward(start, { label: "스펙터 블래스트", adv: 3000 });
  if (s.shardEvent && s.shardDate) addReward(parseDate(s.shardDate), { label: "울티마 스쿼드 EXP", adv: s.shardAdv });

  let ultimaLastScheduled = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    let weekUsed = Math.max(0, Math.min(5, Math.floor(s.ultimaWeek)));
    const ultimaEnd = parseDate("2026-09-16");
    const saunaMilestones = new Set([2, 7, 12, 17, 22, 27, 32, 37, 42, 51, 56]);
    for (let day = 0; day < 120 && ultimaLastScheduled < 60; day += 1) {
      const date = addDays(start, day);
      if (date > ultimaEnd) break;
      if (day > 0 && date.getDay() === 4) weekUsed = 0;
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

  const shopBlueWeeks = Math.max(0, Math.min(4, Math.floor(schedule.shopBlueWeeks ?? (s.shopBlue ? 4 : 0))));
  const shopMechWeeks = Math.max(0, Math.min(4, Math.floor(schedule.shopMechWeeks ?? (s.shopMech ? 4 : 0))));
  if (shopBlueWeeks || shopMechWeeks) {
    ["2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13"].forEach((date, index) => {
      const buyBlue = index < shopBlueWeeks;
      const buyMech = index < shopMechWeeks;
      if (!buyBlue && !buyMech) return;
      addReward(parseDate(date), {
        label: `메포샵 ${index + 1}주차`, blue: buyBlue ? 2 : 0, mech: buyMech ? 2 : 0,
        maplePoints: (buyBlue ? 7000 : 0) + (buyMech ? 10000 : 0), optionalPurchase: true,
      });
    });
  }
  addReward(start, { label: "현재 보유분", blue: s.ownedBlue, mech: s.ownedMech, sauna: s.ownedSauna, adv: s.ownedAdv, potion279: s.ownedPotion279 });

  const applyRaw = (initialRaw: number) => {
    let raw = initialRaw;
    let guard = 0;
    while (raw > 0.000000000001 && level < 285 && guard < 8) {
      guard += 1;
      const remaining = req(level) - xp;
      if (remaining <= 0.000000000001) { level += 1; xp = 0; continue; }
      if (raw + 0.000000000001 < remaining) { xp += raw; raw = 0; } else { raw = Math.max(0, raw - remaining); level += 1; xp = 0; }
    }
  };
  const applyPercent = (percent: number) => { if (level < 285 && efficiency[level]) applyRaw(req(level) * percent / 100); };
  const applyItems = (type: "blue" | "mech" | "sauna" | "adv", count: number) => {
    let remaining = type === "sauna" ? Math.max(0, Number(count || 0)) : Math.max(0, Math.floor(count || 0));
    let used = 0;
    if (type === "sauna") {
      let guard = 0;
      while (remaining > 0.0000001 && level < 285 && guard < 8) {
        guard += 1;
        const rawPerHour = req(level) * efficiency[level].sauna / 100;
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
      while (remaining > 0 && level < 285 && guard < 8) {
        guard += 1;
        const rawPerCoupon = req(level) * efficiency[level].adv100 / 10000;
        const required = Math.max(0, req(level) - xp);
        const couponBatch = Math.min(remaining, Math.max(1, Math.ceil(required / rawPerCoupon)));
        applyRaw(rawPerCoupon * couponBatch);
        remaining -= couponBatch;
        used += couponBatch;
      }
      return used;
    }
    while (remaining > 0 && level < 285) {
      const percent = type === "adv" ? efficiency[level].adv100 / 100 : efficiency[level][type];
      applyPercent(percent); remaining -= 1; used += 1;
    }
    return used;
  };
  const applyGrowthPotion = (type: "potion269" | "potion279", count: number) => {
    let remaining = Math.max(0, Math.floor(count || 0)); let used = 0;
    const raw = type === "potion279" ? 0.49505 : 0.072458;
    while (remaining > 0 && level < 285) { applyRaw(raw); remaining -= 1; used += 1; }
    return used;
  };

  let reached: Date | null = null;
  let shopMaplePoints = 0;
  let monsterParkMaplePoints = 0;
  let dailyDaysApplied = 0;
  let sundaysSeen = 0;
  for (let day = 0; day < 120 && level < 285; day += 1) {
    const date = addDays(start, day); const key = iso(date); const events: string[] = [];
    (rewardDays.get(key) || []).forEach(reward => {
      if (reward.optionalPurchase && level >= 285) return;
      if (reward.optionalPurchase) reward.purchased = true;
      shopMaplePoints += reward.maplePoints || 0;
      const r = reward.remaining!;
      if ((reward.blue || 0) > 0) r.blue -= applyItems("blue", r.blue);
      if ((reward.mech || 0) > 0 && (!reward.deferMech || level >= momentumMechLevel || date >= momentumMechDeadline)) r.mech -= applyItems("mech", r.mech);
      if ((reward.sauna || 0) > 0) r.sauna -= applyItems("sauna", r.sauna);
      if ((reward.potion269 || 0) > 0) r.potion269 -= applyGrowthPotion("potion269", r.potion269);
      if ((reward.potion279 || 0) > 0) r.potion279 -= applyGrowthPotion("potion279", r.potion279);
      if ((reward.adv || 0) > 0) r.adv -= applyItems("adv", r.adv);
      const notableAttendance = reward.attendanceReward && (reward.sauna || reward.adv || reward.potion269 || reward.potion279);
      if ((!reward.attendanceReward && (reward.label !== "현재 보유분" || itemTypes.some(type => Number(reward[type] || 0) > 0))) || notableAttendance) events.push(reward.label);
    });

    const thursday = date.getDay() === 4;
    if ((thursday && day > 0) || (day === 0 && s.weeklyOpen)) {
      const afterPatch = date >= patchDate; const afterCore6 = Boolean(core6Date && date >= core6Date);
      const afterCore20 = Boolean(core20Date && date >= core20Date); const afterCore25 = Boolean(core25Date && date >= core25Date);
      const mpBase = afterCore6 ? s.mpCore6 : afterPatch ? s.mpPatch : s.mpNow;
      const mpBonus = mpBase + (afterPatch && afterCore20 ? s.core20Bonus : 0);
      if (s.extreme && level < 285) applyPercent(efficiency[level].extreme * (1 + mpBonus / 100));
      if (s.epic && level < 285) {
        const afterArtifact = Boolean(epicArtifactDate && date >= epicArtifactDate);
        const epicBase = afterCore6 ? (afterArtifact ? s.epicCore6Artifact : s.epicCore6) : (afterArtifact ? s.epicArtifact : afterPatch ? s.epicPatch : s.epicNow);
        const eterion = epicBase + (afterPatch && afterCore25 ? s.core25Bonus : 0);
        applyPercent(efficiency[level].epic * (s.epicMult + eterion / 100));
      }
      events.push("익몬 · 악몽선경");
    }

    if (level < 285 && (day > 0 || s.todayDaily)) {
      dailyDaysApplied += 1;
      const dailyRuns = runsForDate(date);
      monsterParkMaplePoints += paidMonsterParkMaplePoints(dailyRuns);
      const afterPatch = date >= patchDate; const afterCore6 = Boolean(core6Date && date >= core6Date); const afterCore20 = Boolean(core20Date && date >= core20Date);
      const mpBase = afterCore6 ? s.mpCore6 : afterPatch ? s.mpPatch : s.mpNow;
      const mpBonus = mpBase + (afterPatch && afterCore20 ? s.core20Bonus : 0);
      const dailyBonus = afterCore6 ? s.dailyCore6 : afterPatch ? s.dailyPatch : s.dailyNow;
      const isSunday = date.getDay() === 0;
      const isSpecialSunday = isSunday && sundaysSeen < specialSundayCount;
      if (isSunday) sundaysSeen += 1;
      applyPercent(monsterParkExperiencePercent({
        baseSevenRunPercent: efficiency[level].mp7,
        runs: dailyRuns,
        contentBonusPercent: mpBonus,
        sundayKind: isSpecialSunday ? "special" : isSunday ? "normal" : "none",
      }));
      if (s.grandis && level < 285) applyPercent(efficiency[level].grandis * (1 + dailyBonus / 100));
    }

    if (deferMomentumMech && level < 285 && (level >= momentumMechLevel || date >= momentumMechDeadline)) {
      rewardDays.forEach(rewards => rewards.forEach(reward => {
        if (!reward.deferMech || (reward.date || "") > key || !reward.remaining || reward.remaining.mech <= 0 || level >= 285) return;
        reward.remaining.mech -= applyItems("mech", reward.remaining.mech);
        events.push(`${reward.label} 메카베리 사용`);
      }));
    }

    const progress = level >= 285 ? 285 : level + xp / req(level);
    rows.push({ date, key, level, exp: level >= 285 ? 0 : xp / req(level) * 100, progress, events });
    if (level >= 285) reached = date;
  }

  const leftovers = emptyLeftovers(); const leftoverSources: string[] = [];
  rewardDays.forEach(rewards => rewards.forEach(reward => {
    if (reward.optionalPurchase && !reward.purchased) return;
    if (reward.attendanceReward && reached && (reward.date || "") > iso(reached)) return;
    if (reward.remaining && itemTypes.some(type => reward.remaining![type] > 0)) leftoverSources.push(reward.sourceLabel || reward.label);
    if (reward.remaining) itemTypes.forEach(type => { leftovers[type] += reward.remaining![type] || 0; });
  }));
  let ultimaCountAtReach = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    const reachKey = reached ? iso(reached) : "9999-12-31";
    rewardDays.forEach(rewards => rewards.forEach(reward => { if (reward.attendanceReward && (reward.date || "") <= reachKey) ultimaCountAtReach = Math.max(ultimaCountAtReach, reward.attendanceCount || 0); }));
  }
  return { start, startLevel: s.level, startExp: s.exp, rows, reached, leftovers, leftoverSources: [...new Set(leftoverSources)], shopMaplePoints, monsterParkMaplePoints, maplePoints: shopMaplePoints + monsterParkMaplePoints, scheduleLabel, sevenUntil, specialSundayCount, momentumMechLevel, momentumMechDeadline, dailyDaysApplied, ultimaCountAtReach };
}

function weekStartThursday(date: Date) { const result = new Date(date); result.setDate(result.getDate() - ((result.getDay() + 3) % 7)); result.setHours(0, 0, 0, 0); return result; }
function mayrinClearWeeks(reached: Date | null) {
  const end = parseDate("2026-09-16"); if (!reached || reached > end) return 0;
  return Math.floor((weekStartThursday(end).getTime() - weekStartThursday(reached).getTime()) / 604800000) + 1;
}

function* buildPlanningSteps(settings: Settings): Generator<number, Planning, void> {
  const s = settings;
  const start = parseDate(s.start);
  const deadline = parseDate("2026-09-16");
  const strategySettings = { ...s, shopMech: false, shopBlue: false };
  let completed = 0;
  const sunday = simulate(strategySettings, { sevenUntil: addDays(start, -1) }); yield ++completed;
  const free = simulate(strategySettings, { fixedRuns: 2 }); yield ++completed;
  const allSeven = simulate(strategySettings, { fixedRuns: 7 }); yield ++completed;
  const pairsByStrategy: Record<PullStrategy, [number, number][]> = {
    monsterPark: [[0, 0]],
    blue: [1, 2, 3, 4].map((weeks): [number, number] => [weeks, 0]),
    mech: [1, 2, 3, 4].map((weeks): [number, number] => [0, weeks]),
    both: [1, 2, 3, 4].map((weeks): [number, number] => [weeks, weeks]),
  };
  const candidateCache = new Map<string, StrategyCandidate>();
  candidateCache.set("0:0:0", { result: sunday, shopBlueWeeks: 0, shopMechWeeks: 0 });
  candidateCache.set("0:0:64", { result: allSeven, shopBlueWeeks: 0, shopMechWeeks: 0 });
  const candidateAt = function* (shopBlueWeeks: number, shopMechWeeks: number, scheduleIndex: number): Generator<number, StrategyCandidate, void> {
    const key = `${shopBlueWeeks}:${shopMechWeeks}:${scheduleIndex}`;
    const cached = candidateCache.get(key);
    if (cached) return cached;
    const schedule = scheduleIndex === 64 ? { fixedRuns: 7 } : { sevenUntil: addDays(start, scheduleIndex - 1) };
    const candidate = {
      result: simulate(strategySettings, { ...schedule, shopBlueWeeks, shopMechWeeks }),
      shopBlueWeeks,
      shopMechWeeks,
    };
    candidateCache.set(key, candidate);
    yield ++completed;
    return candidate;
  };
  const meetsTarget = (candidate: StrategyCandidate, targetClearWeeks: number) => Boolean(
    candidate.result.reached && candidate.result.reached <= deadline && mayrinClearWeeks(candidate.result.reached) >= targetClearWeeks,
  );
  const leastCostCandidate = function* (shopBlueWeeks: number, shopMechWeeks: number, targetClearWeeks: number): Generator<number, StrategyCandidate | null, void> {
    if (!meetsTarget(yield* candidateAt(shopBlueWeeks, shopMechWeeks, 64), targetClearWeeks)) return null;
    let low = 0;
    let high = 64;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (meetsTarget(yield* candidateAt(shopBlueWeeks, shopMechWeeks, middle), targetClearWeeks)) high = middle;
      else low = middle + 1;
    }
    return yield* candidateAt(shopBlueWeeks, shopMechWeeks, low);
  };
  const baselineClearWeeks = Math.max(1, mayrinClearWeeks(sunday.reached));
  const maximumClearWeeks = mayrinClearWeeks((yield* candidateAt(4, 4, 64)).result.reached);
  const maxPullWeeks = Math.max(0, maximumClearWeeks - baselineClearWeeks);
  const pickPlan = function* (strategy: PullStrategy, pullWeeks: number): Generator<number, PullPlan, void> {
    const targetClearWeeks = baselineClearWeeks + pullWeeks;
    const pairs = pullWeeks === 0 ? pairsByStrategy.monsterPark : pairsByStrategy[strategy];
    const eligible: StrategyCandidate[] = [];
    for (const [shopBlueWeeks, shopMechWeeks] of pairs) {
      const candidate = yield* leastCostCandidate(shopBlueWeeks, shopMechWeeks, targetClearWeeks);
      if (candidate) eligible.push(candidate);
    }
    eligible.sort((a, b) => a.result.maplePoints - b.result.maplePoints || a.result.shopMaplePoints - b.result.shopMaplePoints || a.result.monsterParkMaplePoints - b.result.monsterParkMaplePoints);
    const fallbacks: StrategyCandidate[] = [];
    for (const [shopBlueWeeks, shopMechWeeks] of pairs) fallbacks.push(yield* candidateAt(shopBlueWeeks, shopMechWeeks, 64));
    fallbacks.sort((a, b) => (a.result.reached?.getTime() ?? Infinity) - (b.result.reached?.getTime() ?? Infinity));
    const chosen = eligible[0] || fallbacks[0] || { result: allSeven, shopBlueWeeks: 0, shopMechWeeks: 0 };
    return {
      pullWeeks, targetClearWeeks, result: chosen.result, strategy,
      shopBlueWeeks: chosen.shopBlueWeeks, shopMechWeeks: chosen.shopMechWeeks,
      feasible: Boolean(chosen.result.reached && chosen.result.reached <= deadline && mayrinClearWeeks(chosen.result.reached) >= targetClearWeeks),
    };
  };
  const basePlan = yield* pickPlan("monsterPark", 0);
  const strategyPlans = {} as Record<PullStrategy, PullPlan[]>;
  for (const { id } of pullStrategies) {
    const plans: PullPlan[] = [];
    for (let pullWeeks = 0; pullWeeks <= maxPullWeeks; pullWeeks += 1) plans.push(pullWeeks === 0 ? { ...basePlan, strategy: id } : yield* pickPlan(id, pullWeeks));
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
    })).sort((a, b) => a.result.maplePoints - b.result.maplePoints || (a.result.reached?.getTime() ?? Infinity) - (b.result.reached?.getTime() ?? Infinity));
  });
  const bestPlansByWeek = recommendedPlansByWeek.map((plans, pullWeeks) => plans[0] || strategyPlans.monsterPark[pullWeeks]);
  return { sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, basePlan, maxPullWeeks, deadline };
}

function runPlanningImmediately(settings: Settings): Planning {
  const iterator = buildPlanningSteps(settings);
  let step = iterator.next();
  while (!step.done) step = iterator.next();
  return step.value;
}

async function runPlanningInChunks(settings: Settings, onProgress: (completed: number) => void, cancelled: () => boolean): Promise<Planning | null> {
  const iterator = buildPlanningSteps(settings);
  let step = iterator.next();
  let chunk = 0;
  while (!step.done) {
    if (cancelled()) return null;
    onProgress(step.value);
    chunk += 1;
    if (chunk >= 3) {
      chunk = 0;
      await new Promise<void>(resolve => {
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 0);
      });
    }
    step = iterator.next();
  }
  return cancelled() ? null : step.value;
}

const defaultPlanning = runPlanningImmediately(defaults);

function InputField({ label, value, onChange, type = "number", min, max, step, disabled }: { label: string; value: string | number; onChange: (value: string) => void; type?: "number" | "date"; min?: number; max?: number; step?: number; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} disabled={disabled} /></label>;
}
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`toggle-row ${disabled ? "is-disabled" : ""}`}><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} /><i aria-hidden="true" /></label>;
}

function ProgressChart({ selected, sunday, free }: { selected: Simulation; sunday: Simulation; free: Simulation }) {
  const width = 900, height = 340, margin = { left: 44, right: 28, top: 32, bottom: 42 };
  const count = Math.max(1, selected.rows.length - 1, sunday.rows.length - 1, free.rows.length - 1);
  const x = (index: number) => margin.left + index / count * (width - margin.left - margin.right);
  const y = (progress: number) => margin.top + (285 - progress) / 5 * (height - margin.top - margin.bottom);
  const path = (rows: Row[]) => rows.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row.progress).toFixed(1)}`).join(" ");
  const longest = [selected.rows, sunday.rows, free.rows].sort((a, b) => b.length - a.length)[0];
  const tickEvery = Math.max(1, Math.ceil(longest.length / 6));
  return <div className="chart-wrap">
    <div className="chart-legend"><span className="legend selected">선택 경로</span><span className="legend sunday">일요일 7판</span><span className="legend free">매일 2판</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="세 경로의 285레벨 도달 진행 비교">
      {[280, 281, 282, 283, 284, 285].map(level => <g key={level}><line x1={margin.left} x2={width - margin.right} y1={y(level)} y2={y(level)} className="grid-line" /><text x={margin.left - 10} y={y(level) + 4} textAnchor="end" className="axis-label">{level}</text></g>)}
      {longest.map((row, index) => (index % tickEvery === 0 || index === longest.length - 1) ? <text key={row.key} x={x(index)} y={height - 12} textAnchor="middle" className="axis-label">{shortDate(row.date)}</text> : null)}
      <path d={path(free.rows)} className="chart-line free" /><path d={path(sunday.rows)} className="chart-line sunday" /><path d={path(selected.rows)} className="chart-line selected" />
      {[selected, sunday, free].map((result, index) => { const row = result.rows[result.rows.length - 1]; return row ? <circle key={index} cx={x(result.rows.length - 1)} cy={y(row.progress)} r="5" className={["dot selected", "dot sunday", "dot free"][index]} /> : null; })}
    </svg>
  </div>;
}

export default function Home() {
  const [s, setS] = useState<Settings>(defaults);
  const [calculatedSettings, setCalculatedSettings] = useState<Settings>(defaults);
  const [isCalculating, setIsCalculating] = useState(false);
  const [planning, setPlanning] = useState<Planning>(defaultPlanning);
  const [calculationSteps, setCalculationSteps] = useState(0);
  const calculationJob = useRef(0);
  const [preApplied, setPreApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("calculator");
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (pre280SettingKeys.includes(key)) setPreApplied(false);
    setS(current => ({ ...current, [key]: value }));
  };
  const pre280Key = selectedSettingsKey(s, pre280SettingKeys);
  const pre280Settings = useMemo(() => s, [pre280Key]);
  const pre280 = useMemo(() => simulatePre280(pre280Settings), [pre280Settings]);
  const calc = useMemo(() => {
    const s = calculatedSettings;
    const { sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, basePlan, maxPullWeeks, deadline } = planning;
    const effectivePullWeeks = Math.min(Math.max(0, Math.floor(s.pullWeeks)), maxPullWeeks);
    const requestedPlan = strategyPlans[s.pullStrategy][effectivePullWeeks];
    const recommendedPlans = recommendedPlansByWeek[effectivePullWeeks] || [];
    const selectedPlan = requestedPlan?.feasible && recommendedPlans.some(plan => plan.strategy === requestedPlan.strategy) ? requestedPlan : bestPlansByWeek[effectivePullWeeks] || basePlan;
    const previousPlan = effectivePullWeeks > 1 ? strategyPlans[selectedPlan.strategy][effectivePullWeeks - 1] : basePlan;
    const selected = selectedPlan.result;
    const hardValue = Math.max(0, s.mayrinMesoGap) * 100000000 + Math.max(0, s.mayrinNormalFrag) * Math.max(0, s.fragPrice) * 10000;
    const reset = s.postReset ? 1 : 0;
    const selectedHardWeeks = mayrinClearWeeks(selected.reached) + (selected.reached ? reset : 0);
    const baseHardWeeks = mayrinClearWeeks(basePlan.result.reached) + (basePlan.result.reached ? reset : 0);
    const previousHardWeeks = mayrinClearWeeks(previousPlan.result.reached) + (previousPlan.result.reached ? reset : 0);
    const marginalGainedHardWeeks = effectivePullWeeks > 0 ? Math.max(0, selectedHardWeeks - previousHardWeeks) : 0;
    const marginalMP = effectivePullWeeks > 0 ? selected.maplePoints - previousPlan.result.maplePoints : selected.maplePoints - free.maplePoints;
    const marginalMonsterParkMP = selected.monsterParkMaplePoints - previousPlan.result.monsterParkMaplePoints;
    const marginalShopMP = selected.shopMaplePoints - previousPlan.result.shopMaplePoints;
    const marginalCostValue = marginalMP / Math.max(1, s.mpPerEok) * 100000000;
    const marginalRecoveredValue = marginalGainedHardWeeks * hardValue;
    const marginalNetValue = marginalRecoveredValue - marginalCostValue;
    const marginalRecoveryRate = marginalCostValue > 0 ? marginalRecoveredValue / marginalCostValue * 100 : 0;
    const cumulativeGainedHardWeeks = Math.max(0, selectedHardWeeks - baseHardWeeks);
    const cumulativeMP = selected.maplePoints - basePlan.result.maplePoints;
    const cumulativeCostValue = cumulativeMP / Math.max(1, s.mpPerEok) * 100000000;
    const cumulativeRecoveredValue = cumulativeGainedHardWeeks * hardValue;
    const cumulativeNetValue = cumulativeRecoveredValue - cumulativeCostValue;
    const recommendedRoiPlans = recommendedPlansByWeek[effectivePullWeeks].map(plan => {
      const hardWeeks = mayrinClearWeeks(plan.result.reached) + (plan.result.reached ? reset : 0);
      const gainedHardWeeks = Math.max(0, hardWeeks - baseHardWeeks);
      const extraMaplePoints = plan.result.maplePoints - basePlan.result.maplePoints;
      const costValue = extraMaplePoints / Math.max(1, s.mpPerEok) * 100000000;
      return { strategy: plan.strategy, netValue: gainedHardWeeks * hardValue - costValue };
    });
    const bestRoiStrategy = [...recommendedRoiPlans].sort((a, b) => b.netValue - a.netValue || pullStrategies.findIndex(strategy => strategy.id === a.strategy) - pullStrategies.findIndex(strategy => strategy.id === b.strategy))[0]?.strategy || selectedPlan.strategy;
    return {
      selected, sunday, free, allSeven, strategyPlans, recommendedPlansByWeek, bestPlansByWeek, selectedPlan, basePlan, previousPlan,
      effectivePullWeeks, maxPullWeeks, hardValue, selectedHardWeeks, baseHardWeeks, marginalGainedHardWeeks,
      marginalMP, marginalMonsterParkMP, marginalShopMP, marginalCostValue, marginalRecoveredValue, marginalNetValue, marginalRecoveryRate,
      cumulativeGainedHardWeeks, cumulativeMP, cumulativeCostValue, cumulativeRecoveredValue, cumulativeNetValue,
      bestRoiStrategy, deadline, deadlineMet: selectedPlan.feasible,
    };
  }, [planning, calculatedSettings]);
  const hasPendingChanges = JSON.stringify(s) !== JSON.stringify(calculatedSettings);
  const calculate = async () => {
    if (!hasPendingChanges || isCalculating) return;
    const nextSettings = { ...s };
    const job = calculationJob.current + 1;
    calculationJob.current = job;
    setIsCalculating(true);
    setCalculationSteps(0);
    const nextPlanning = await runPlanningInChunks(
      nextSettings,
      completed => {
        if (job === calculationJob.current && (completed < 4 || completed % 8 === 0)) setCalculationSteps(completed);
      },
      () => job !== calculationJob.current,
    );
    if (!nextPlanning || job !== calculationJob.current) return;
    setPlanning(nextPlanning);
    setCalculatedSettings(nextSettings);
    setCalculationSteps(0);
    setIsCalculating(false);
  };
  const cancelCalculation = () => {
    calculationJob.current += 1;
    setIsCalculating(false);
    setCalculationSteps(0);
  };
  const selectCalculatedRoute = (patch: Partial<Pick<Settings, "pullWeeks" | "pullStrategy">>) => {
    setS(current => ({ ...current, ...patch }));
    setCalculatedSettings(current => ({ ...current, ...patch }));
  };
  const resetCalculator = () => {
    calculationJob.current += 1;
    setS(defaults);
    setCalculatedSettings(defaults);
    setPlanning(defaultPlanning);
    setIsCalculating(false);
    setCalculationSteps(0);
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
  const pullDays = r.reached && calc.basePlan.result.reached ? Math.max(0, Math.round((calc.basePlan.result.reached.getTime() - r.reached.getTime()) / 86400000)) : 0;
  const recommendedPrefix = r.sevenUntil < r.start ? "평일 2판 · 일요일 7판" : `${shortDate(r.sevenUntil)}까지만 평일 7판`;
  const selectedStrategy = pullStrategies.find(strategy => strategy.id === calc.selectedPlan.strategy) || pullStrategies[0];
  const selectedRouteTitle = selectedStrategy.id === "monsterPark" ? r.scheduleLabel : `${selectedStrategy.label} · ${r.scheduleLabel}`;
  const momentumLeft = r.leftoverSources.some(source => source.includes("모멘텀 패스"));
  const leftoverRows: [string, string][] = [
    ["상급 EXP 교환권", `${r.leftovers.adv.toLocaleString("ko-KR")}장`], ["VIP 사우나", `${r.leftovers.sauna.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}시간`],
    ["블루베리 농장", `${r.leftovers.blue.toLocaleString("ko-KR")}장`], ["메카베리 농장", `${r.leftovers.mech.toLocaleString("ko-KR")}장`],
    ["성장의 비약 200~269", `${r.leftovers.potion269.toLocaleString("ko-KR")}개`], ["성장의 비약 200~279", `${r.leftovers.potion279.toLocaleString("ko-KR")}개`],
    ["3배 쿠폰 · 30분", `${r.leftovers.coupon3x.toLocaleString("ko-KR")}개`], ["4배 쿠폰 · 30분", `${r.leftovers.coupon4x.toLocaleString("ko-KR")}개`],
  ];
  const efficiencyLevels = [280, 281, 282, 283, 284];
  const efficiencyRanking = [...efficiencyBenchmarks].sort((a, b) => relativeEfficiencyScore(b, s.level) - relativeEfficiencyScore(a, s.level));
  const preLevelData = pre280Data[Math.max(260, Math.min(279, Math.floor(s.preLevel)))];
  const preUsedLabel = (used: Pre280Inventory) => [
    used.blue ? `블루 ${used.blue}` : "",
    used.sauna ? `사우나 ${used.sauna}h` : "",
    used.adv ? `상급 ${used.adv.toLocaleString("ko-KR")}` : "",
    used.potion279 ? `비약 ${used.potion279}` : "",
  ].filter(Boolean).join(" · ") || "콘텐츠 누적";

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="285 계산기 홈"><span className="brand-mark">M</span><span>285 CALCULATOR</span></a><span className="topbar-status">CHALLENGERS WORLD</span></header>
    <section className="hero" id="top">
      <div className="eyebrow"><span /> CHALLENGERS 285 CALCULATOR</div>
      <h1>285, 언제 찍을까?</h1>
      <p>현재 레벨과 보유 보상을 입력하면 285 달성일, 필요한 몬파 횟수와 메포를 계산합니다.</p>
      <div className="hero-grid">
        <article className="hero-card primary"><div className="card-label">{calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 당김 · ${selectedStrategy.label}` : "마감만 맞추기"}</div><strong>{longDate(r.reached)}</strong><span>{r.scheduleLabel}</span><div className="card-meta"><b>{formatMP(r.maplePoints)}</b><em>몬파 {formatMP(r.monsterParkMaplePoints)} · 상점 {formatMP(r.shopMaplePoints)}</em></div></article>
        <article className="hero-card"><div className="card-label">0주 · 마감 기준</div><strong>{longDate(calc.basePlan.result.reached)}</strong><span>{calc.basePlan.result.scheduleLabel}</span><div className="card-meta"><b>{formatMP(calc.basePlan.result.maplePoints)}</b><em>상점 없이 9월 16일 달성</em></div></article>
        <article className="hero-card verdict"><div className="card-label">이번 한 주 손익</div><strong className={calc.marginalNetValue >= 0 ? "positive" : "negative"}>{calc.marginalNetValue >= 0 ? "+" : ""}{eok(calc.marginalNetValue)}</strong><span>{calc.effectivePullWeeks ? `직전 단계 대비 회수율 ${calc.marginalRecoveryRate.toFixed(1)}%` : "마감은 필수조건 · 손익과 분리"}</span><div className="card-meta"><b>{calc.marginalGainedHardWeeks}회 추가</b><em>보상 {eok(calc.marginalRecoveredValue)}</em></div></article>
      </div>
      <div className={`hero-note ${calc.deadlineMet ? "" : "deadline-fail"}`}><span className="pulse" /><p><b>{calc.selectedPlan.strategy === calc.bestRoiStrategy ? "추천 · 순손익 최고" : calc.selectedPlan.strategy === calc.bestPlansByWeek[calc.effectivePullWeeks]?.strategy ? "메포 최저" : "더 빠른 선택"}</b> {selectedStrategy.id === "monsterPark" ? recommendedPrefix : `${selectedStrategy.label} · ${recommendedPrefix}`} → {shortDate(r.reached)} · 총 {formatMP(r.maplePoints)} · {pullDays ? `마감 경로보다 ${pullDays}일 빠름` : "9월 16일 마감 기준"}</p></div>
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
            <button onClick={connectPre280} disabled={!pre280.reached || preApplied}>{preApplied ? "280→285 연결 완료" : pre280.reached ? "280→285 계산기에 연결" : "9/16까지 280 미도달"}</button>
          </div>
          <p className="pre-disclaimer">일퀘·익몬·에픽던전은 메이플로드, 몬스터파크 지역별 경험치는 하루1소재 기준입니다. 레벨에 맞는 최고 입장 지역과 버닝 비욘드 +2레벨, 285 탭의 에테리온 콘텐츠 보정을 함께 적용합니다.</p>
        </div>
      </div>
    </section>}

    {activeTab === "calculator" && <><section className="calculator-shell main-calculator tab-panel" id="calculator-panel" role="tabpanel" aria-labelledby="calculator-tab">
      <aside className="controls">
        <div className="section-heading"><span>입력</span><div><p>현재 캐릭터</p><h2>285 계산 조건</h2></div></div>
        <div className="field-grid compact">
          <label className="field"><span>현재 레벨</span><select value={s.level} onChange={e => set("level", Number(e.target.value))}>{[280, 281, 282, 283, 284].map(level => <option key={level}>{level}</option>)}</select></label>
          <InputField label="현재 경험치 %" value={s.exp} min={0} max={99.999} step={0.001} onChange={v => set("exp", Number(v))} />
          <InputField label="계산 시작일" value={s.start} type="date" onChange={v => set("start", v)} />
          <InputField label="스페셜 선데이 몬파 횟수" value={s.specialSundayCount} min={0} max={12} step={1} onChange={v => set("specialSundayCount", Number(v))} />
          <InputField label="챌섭 EXP 패스 현재 레벨" value={s.challengerPassLevel} min={0} max={30} step={1} onChange={v => set("challengerPassLevel", Number(v))} />
          <InputField label="모멘텀 패스 현재 레벨" value={s.momentumPassLevel} min={0} max={10} step={1} onChange={v => set("momentumPassLevel", Number(v))} />
        </div>
        <div className="callout-mini">스페셜 선데이는 입력한 횟수만큼 가까운 일요일부터 기본 몬파 경험치 +300%(총 4배)로 적용합니다.</div>
        <div className="quick-toggles"><Toggle label="오늘 일퀘·몬파 미완료" checked={s.todayDaily} onChange={v => set("todayDaily", v)} /><Toggle label="이번 주 스펙터 블래스트 미완료" checked={s.specter} onChange={v => set("specter", v)} /><Toggle label="이번 주 챌섭 5레벨 미완료" checked={s.challengerUnclaimed} onChange={v => set("challengerUnclaimed", v)} /></div>
        <details><summary>패스 · 이벤트 설정 <span>10</span></summary><div className="detail-body">
          <Toggle label="챌린저스 EXP 패스" checked={s.challengerExp} onChange={v => set("challengerExp", v)} /><Toggle label="프라임 모멘텀 패스" checked={s.momentumPrime} onChange={v => set("momentumPrime", v)} /><Toggle label="모멘텀 메카베리 모아쓰기" checked={s.deferMomentumMech} onChange={v => set("deferMomentumMech", v)} />
          <div className="field-grid compact inset"><label className="field"><span>메카베리 사용 레벨</span><select value={s.momentumMechLevel} disabled={!s.deferMomentumMech} onChange={e => set("momentumMechLevel", Number(e.target.value))}>{[280, 281, 282, 283, 284].map(level => <option key={level}>{level}</option>)}</select></label><InputField label="최종 사용일" value={s.momentumMechDeadline} type="date" disabled={!s.deferMomentumMech} onChange={v => set("momentumMechDeadline", v)} /></div>
          <Toggle label="7월 NOW 보상" checked={s.apology} onChange={v => set("apology", v)} /><Toggle label="울티마 스쿼드 EXP 5,000장" checked={s.shardEvent} onChange={v => set("shardEvent", v)} /><Toggle label="울티마 작전 일지" checked={s.ultima} onChange={v => set("ultima", v)} />
          <div className="callout-mini">현재 패스 레벨까지 받은 보상은 현재 경험치에 포함된 것으로 보고 제외합니다. 챌섭은 7/22까지 최대 25레벨, 7/23부터 최대 30레벨이며 주 5레벨씩 계산합니다. 모멘텀은 주차별 2→3→3→2레벨로 진행합니다.</div>
          <div className="callout-mini shop-priority">같거나 더 늦은 날짜에 더 많은 메포를 쓰는 전략은 추천에서 제외합니다. 남은 선택지 중 순손익이 가장 좋은 경로에 추천 표시를 붙입니다.</div>
        </div></details>
        <details><summary>에테리온 · 콘텐츠 보정 <span>18</span></summary><div className="detail-body">
          <Toggle label="코어 6레벨 적용" checked={s.core6Enabled} onChange={v => set("core6Enabled", v)} /><div className="callout-mini">이번 주는 변경 전 5레벨. 7/23부터 5레벨 기본, 6레벨은 선택 시 적용합니다.</div>
          <div className="field-grid compact"><InputField label="5레벨 몬파 · 7/22까지 %" value={s.mpNow} onChange={v => set("mpNow", Number(v))} /><InputField label="5레벨 몬파 · 7/23부터 %" value={s.mpPatch} onChange={v => set("mpPatch", Number(v))} /><InputField label="코어 총합 20 달성일" value={s.core20Date} type="date" onChange={v => set("core20Date", v)} /><InputField label="총합 20 몬파 추가 %" value={s.core20Bonus} onChange={v => set("core20Bonus", Number(v))} /><InputField label="6레벨 달성일" value={s.core6Date} type="date" disabled={!s.core6Enabled} onChange={v => set("core6Date", v)} /><InputField label="6레벨 몬파 %" value={s.mpCore6} disabled={!s.core6Enabled} onChange={v => set("mpCore6", Number(v))} /><InputField label="5레벨 일퀘 · 현재 %" value={s.dailyNow} onChange={v => set("dailyNow", Number(v))} /><InputField label="5레벨 일퀘 · 패치 후 %" value={s.dailyPatch} onChange={v => set("dailyPatch", Number(v))} /><InputField label="6레벨 일퀘 %" value={s.dailyCore6} disabled={!s.core6Enabled} onChange={v => set("dailyCore6", Number(v))} /></div>
          <Toggle label="이번 주 익몬·악몽선경 미완료" checked={s.weeklyOpen} onChange={v => set("weeklyOpen", v)} /><Toggle label="그란디스 일퀘" checked={s.grandis} onChange={v => set("grandis", v)} /><Toggle label="익스트림 몬스터파크" checked={s.extreme} onChange={v => set("extreme", v)} /><Toggle label="악몽선경 1단계" checked={s.epic} onChange={v => set("epic", v)} />
          <div className="field-grid compact"><label className="field"><span>악몽선경 보상 배수</span><select value={s.epicMult} onChange={e => set("epicMult", Number(e.target.value))}><option value={1}>기본</option><option value={5}>4배 추가</option><option value={9}>8배 추가</option></select></label><InputField label="5레벨 에픽 · 현재 %" value={s.epicNow} onChange={v => set("epicNow", Number(v))} /><InputField label="5레벨 에픽 · 패치 후 %" value={s.epicPatch} onChange={v => set("epicPatch", Number(v))} /><InputField label="코어 총합 25 달성일" value={s.core25Date} type="date" onChange={v => set("core25Date", v)} /><InputField label="총합 25 에픽 추가 %" value={s.core25Bonus} onChange={v => set("core25Bonus", Number(v))} /><InputField label="에픽 아티팩트 활성일" value={s.epicArtifactDate} type="date" onChange={v => set("epicArtifactDate", v)} /><InputField label="아티팩트 후 5레벨 %" value={s.epicArtifact} onChange={v => set("epicArtifact", Number(v))} /><InputField label="6레벨 · 아티팩트 전 %" value={s.epicCore6} disabled={!s.core6Enabled} onChange={v => set("epicCore6", Number(v))} /><InputField label="6레벨 · 아티팩트 후 %" value={s.epicCore6Artifact} disabled={!s.core6Enabled} onChange={v => set("epicCore6Artifact", Number(v))} /></div>
        </div></details>
        <details><summary>보유 보상 · 울티마 <span>9</span></summary><div className="detail-body"><div className="field-grid compact"><InputField label="보유 블루베리" value={s.ownedBlue} min={0} onChange={v => set("ownedBlue", Number(v))} /><InputField label="보유 메카베리" value={s.ownedMech} min={0} onChange={v => set("ownedMech", Number(v))} /><InputField label="보유 사우나 시간" value={s.ownedSauna} min={0} onChange={v => set("ownedSauna", Number(v))} /><InputField label="보유 상급 EXP" value={s.ownedAdv} min={0} onChange={v => set("ownedAdv", Number(v))} /><InputField label="보유 200~279 비약" value={s.ownedPotion279} min={0} onChange={v => set("ownedPotion279", Number(v))} /><InputField label="EXP 5,000 사용일" value={s.shardDate} type="date" disabled={!s.shardEvent} onChange={v => set("shardDate", v)} /><InputField label="상급 EXP 사용량" value={s.shardAdv} disabled={!s.shardEvent} onChange={v => set("shardAdv", Number(v))} /><InputField label="울티마 누적 출석" value={s.ultimaCount} disabled={!s.ultima} onChange={v => set("ultimaCount", Number(v))} /><InputField label="이번 주 이미 출석" value={s.ultimaWeek} disabled={!s.ultima} onChange={v => set("ultimaWeek", Number(v))} /></div><Toggle label="시작일 울티마 출석 예정" checked={s.ultimaStart} disabled={!s.ultima} onChange={v => set("ultimaStart", v)} /></div></details>
        <div className={`calculate-bar ${hasPendingChanges ? "pending" : ""} ${isCalculating ? "calculating" : ""}`}>
          <span>{isCalculating ? `전략 비교 중 · ${calculationSteps.toLocaleString("ko-KR")}개 확인` : hasPendingChanges ? "입력값이 변경되었습니다" : "현재 입력값으로 계산 완료"}</span>
          {isCalculating && <div className="calculation-progress" aria-hidden="true"><i /></div>}
          <div className="calculate-actions">
            <button type="button" onClick={calculate} disabled={!hasPendingChanges || isCalculating}>{isCalculating ? "계산 중…" : hasPendingChanges ? "285 도달일 계산하기" : "계산 완료"}</button>
            {isCalculating && <button type="button" className="cancel-calculation" onClick={cancelCalculation}>계산 취소</button>}
          </div>
          {isCalculating && <small>계산을 짧게 나눠 실행하므로 화면과 스크롤은 계속 사용할 수 있습니다.</small>}
        </div>
      </aside>

      <div className="results" aria-busy={isCalculating}>
        <div className="section-heading"><span>결과</span><div><p>선택한 조건</p><h2>285 도달 경로</h2></div>{isCalculating ? <output className="calculation-status" aria-live="polite">계산 중 · 화면 사용 가능</output> : hasPendingChanges && <output className="calculation-status pending" aria-live="polite">입력값 변경됨</output>}<button className="reset" onClick={resetCalculator}>기본값 복원</button></div>
        <div className="pull-selector">
          <div className="pull-selector-head"><div><span>목표 주차</span><h3>285 도달 시점</h3></div><b className={calc.deadlineMet ? "deadline-ok" : "deadline-bad"}>{calc.deadlineMet ? "9/16 이전 달성" : "9/16 달성 불가"}</b></div>
          <div className="pull-buttons" role="group" aria-label="285 달성 주차 당기기">
            {calc.bestPlansByWeek.map((bestPlan) => <button key={bestPlan.pullWeeks} className={bestPlan.pullWeeks === calc.effectivePullWeeks ? "active" : ""} onClick={() => selectCalculatedRoute({ pullWeeks: bestPlan.pullWeeks, pullStrategy: bestPlan.strategy })} disabled={!bestPlan.feasible}><span>{bestPlan.pullWeeks ? `${bestPlan.pullWeeks}주 당김` : "마감만"}</span><strong>{shortDate(bestPlan.result.reached)}</strong><small>최저 {formatMP(bestPlan.result.maplePoints)}</small></button>)}
          </div>
          <p>주차를 선택하면 해당 날짜를 맞추는 최소 비용 경로를 계산합니다.</p>
        </div>
        <div className="strategy-choice">
          <div className="strategy-choice-head"><span>경로 선택</span><h3>{calc.effectivePullWeeks ? `${calc.effectivePullWeeks}주 당김 경로` : "마감 기준 경로"}</h3><p>같은 도달일에는 메포가 적은 경로만 표시합니다.</p></div>
          <div className="strategy-choice-grid">{calc.recommendedPlansByWeek[calc.effectivePullWeeks].map((plan, index) => { const strategy = pullStrategies.find(item => item.id === plan.strategy)!; const active = plan.strategy === calc.selectedPlan.strategy; const recommended = plan.strategy === calc.bestRoiStrategy; return <button key={strategy.id} className={`${active ? "active" : ""} ${recommended ? "recommended" : ""}`} onClick={() => selectCalculatedRoute({ pullStrategy: strategy.id })}><div><span>{recommended ? "추천 · 순손익 최고" : index === 0 ? "메포 최저" : "더 빠른 선택"}</span><i>{active ? "선택됨" : "선택"}</i></div><h4>{strategy.label}</h4><p>{strategy.caption}</p><strong>{shortDate(plan.result.reached)}</strong><dl><div><dt>총액</dt><dd>{formatMP(plan.result.maplePoints)}</dd></div><div><dt>몬파</dt><dd>{formatMP(plan.result.monsterParkMaplePoints)}</dd></div><div><dt>상점</dt><dd>{formatMP(plan.result.shopMaplePoints)}</dd></div></dl><small>{calc.effectivePullWeeks ? `블루 ${plan.shopBlueWeeks}주 · 메카 ${plan.shopMechWeeks}주 구매 계획` : "0주에서는 농장 미구매"}</small></button>; })}</div>
        </div>
        <ProgressChart selected={r} sunday={calc.sunday} free={calc.free} />
        <div className={`route-grid ${calc.effectivePullWeeks === 0 ? "two" : ""}`}>
          <article className="route-card chosen"><div><div className="route-card-label"><span>선택 경로 · {calc.effectivePullWeeks}주</span><i>{calc.selectedPlan.strategy === calc.bestRoiStrategy ? "추천 · 순손익 최고" : "선택됨"}</i></div><h3>{selectedRouteTitle}</h3><p>{calc.effectivePullWeeks === 0 ? "9월 16일 마감 기준" : `${calc.effectivePullWeeks}주 당김 기준`}</p></div><strong>{shortDate(r.reached)}</strong><dl><div><dt>총 비용</dt><dd>{formatMP(r.maplePoints)}</dd></div><div><dt>메포샵</dt><dd>{formatMP(r.shopMaplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.selectedHardWeeks}회</dd></div></dl></article>
          {calc.effectivePullWeeks > 0 && <article className="route-card baseline"><div><div className="route-card-label"><span>0주 비교 기준</span><i>추가 당김 없음</i></div><h3>{calc.basePlan.result.scheduleLabel}</h3><p>선택 경로의 비용·하드 횟수를 비교하는 기준입니다.</p></div><strong>{shortDate(calc.basePlan.result.reached)}</strong><dl><div><dt>총 비용</dt><dd>{formatMP(calc.basePlan.result.maplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.baseHardWeeks}회</dd></div></dl></article>}
          <article className="route-card free-route"><div><div className="route-card-label"><span>추가 메포 0 비교</span><i>무료 기준</i></div><h3>매일 2판</h3><p>일요일 추가 5판도 하지 않는 비교 경로입니다.</p></div><strong>{shortDate(calc.free.reached)}</strong><dl><div><dt>추가 메포</dt><dd>0 메포</dd></div><div><dt>9/16 마감</dt><dd>{calc.free.reached && calc.free.reached <= calc.deadline ? "통과" : "실패"}</dd></div></dl></article>
        </div>
        <div className="decision-card">
          <div className="decision-top"><div><span>HARD MAYRIN ROI · {calc.effectivePullWeeks ? `${calc.effectivePullWeeks - 1}→${calc.effectivePullWeeks}주 · ${selectedStrategy.label}` : "DEADLINE"}</span><h3>{calc.effectivePullWeeks ? "이번 한 주를 더 당기는 가격" : "9월 16일 마감 확보 비용"}</h3></div><strong className={calc.marginalNetValue >= 0 ? "positive" : "negative"}>{calc.marginalNetValue >= 0 ? "+" : ""}{eok(calc.marginalNetValue)} 메소</strong></div>
          <div className="roi-grid"><div><span>직전 단계 대비 총 메포</span><b>{formatMP(calc.marginalMP)}</b><small>몬파 {formatSignedMP(calc.marginalMonsterParkMP)} · 상점 {formatSignedMP(calc.marginalShopMP)}</small></div><div><span>하드 추가 횟수</span><b>{calc.marginalGainedHardWeeks}회</b><small>노말→하드 가치 {eok(calc.hardValue)}</small></div><div><span>이번 단계 회수</span><b>{eok(calc.marginalRecoveredValue)}</b><small>비용 {eok(calc.marginalCostValue)} · 회수율 {calc.marginalRecoveryRate.toFixed(1)}%</small></div></div>
          <div className="cumulative-roi"><span>0주 대비 누적</span><b>추가 {formatMP(calc.cumulativeMP)} · 하드 +{calc.cumulativeGainedHardWeeks}회 · 순손익 <em className={calc.cumulativeNetValue >= 0 ? "positive" : "negative"}>{calc.cumulativeNetValue >= 0 ? "+" : ""}{eok(calc.cumulativeNetValue)}</em></b></div>
          <p>{calc.effectivePullWeeks ? `${selectedStrategy.label} 기준으로 바로 앞 단계와 비교했습니다. 2주 당김이라면 같은 전략으로 두 번째 한 주를 추가할 때 드는 몬파·상점 메포만 표시합니다.` : "9월 16일 285는 필수조건으로 보고, 0주에서는 상점 구매 없이 마감을 맞추는 최소 몬파 비용만 표시합니다."} 이미 돌린 몬파 7판은 현재 경험치에 들어간 매몰비용입니다.</p>
        </div>
        <details className="value-settings"><summary>메이린 가치·환율 수정</summary><div className="field-grid"><InputField label="노말→하드 결정석 차이 · 억" value={s.mayrinMesoGap} step={0.1} onChange={v => set("mayrinMesoGap", Number(v))} /><InputField label="노말 조각 예상량" value={s.mayrinNormalFrag} onChange={v => set("mayrinNormalFrag", Number(v))} /><InputField label="조각 1개 · 만 메소" value={s.fragPrice} step={10} onChange={v => set("fragPrice", Number(v))} /><InputField label="메소 1억당 메포" value={s.mpPerEok} step={100} onChange={v => set("mpPerEok", Number(v))} /></div><Toggle label="9/17 초기화 후 추가 1회 가정" checked={s.postReset} onChange={v => set("postReset", v)} /></details>
      </div>
    </section>

    <section className="rewards-section main-leftovers">
      <div className="section-heading light"><span>잔여</span><div><p>{shortDate(r.reached)} 기준</p><h2>285 달성 후 남는 보상</h2></div></div>
      <div className="leftover-grid">{leftoverRows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="leftover-note">{momentumLeft ? "모멘텀 패스 4주차 보상은 285 달성 후 수령합니다." : "모멘텀 패스 4주차 보상까지 사용한 결과입니다."}</p>
    </section>

    <section className="mech-summary" aria-label="메카베리 사용 시점"><span>메카베리 모아쓰기</span><strong>{calculatedSettings.deferMomentumMech ? `Lv.${r.momentumMechLevel} 또는 ${shortDate(r.momentumMechDeadline)}부터 사용` : "즉시 사용"}</strong></section>
    </>}

    {activeTab === "efficiency" && <section className="standalone-panel tab-panel efficiency-screen" id="efficiency-panel" role="tabpanel" aria-labelledby="efficiency-tab">
      <section className="priority-story" aria-labelledby="lv280-priority-title">
        <div className="priority-story-head">
          <div><span>LV.280 · 메포 사용 판단</span><h2 id="lv280-priority-title">먼저 몬파 7판, 농장은 필요할 때만</h2></div>
          <p>메포샵 메카베리·블루베리는 필수가 아닙니다. 몬파를 반영한 뒤에도 285 도착 주차가 당겨질 때만 고려합니다.</p>
        </div>
        <div className="priority-flow">
          <article className="priority-step first"><span>1 · 가장 먼저</span><h3>스페셜 선데이 몬파 7판</h3><strong>831.4</strong><p>일요일 추가 5판을 우선 반영</p></article>
          <article className="priority-step second"><span>2 · 다음 판단</span><h3>평일 몬파 7판</h3><strong>318.2</strong><p>285 도착 주차가 당겨지는 날까지만</p></article>
          <article className="priority-step optional"><span>선택 · 메포샵</span><div><h3>메카베리 농장</h3><strong>312.6</strong></div><div><h3>블루베리 농장</h3><strong>298.3</strong></div><p>같은 날짜라면 더 적은 메포를 쓰는 경로 선택</p></article>
        </div>
        <div className="priority-rule"><b>한 줄 결론</b><p>일요일 7판 → 평일 7판 검토 → 그래도 한 주가 당겨질 때만 농장 구매</p></div>
      </section>

      <section className="video-priority-asset" aria-labelledby="video-priority-title">
        <div className="video-priority-meta"><span>VIDEO ASSET · 16:9</span><h2 id="video-priority-title">영상용 280구간 우선순위</h2><p>브라우저 화면을 녹화하거나 원본 이미지를 바로 편집 타임라인에 넣을 수 있습니다.</p><a href="/video-lv280-priority.png" download>16:9 원본 이미지 열기</a></div>
        <figure><img src="/video-lv280-priority.png" alt="Lv.280 메포 사용 우선순위. 스페셜 선데이 몬파, 평일 몬파 7판, 선택 항목인 메카베리와 블루베리 순서" /></figure>
      </section>

      <section className="efficiency-panel full-efficiency-table">
        <div className="efficiency-head"><div><span>LV.{s.level} · VIP 사우나 100 기준</span><h3>Lv.280~284 전체 효율표</h3></div><b>비교 지수</b></div>
        <div className="efficiency-list">
          {efficiencyRanking.map((source, index) => <div className={`efficiency-row ${index < 3 ? "top" : ""}`} key={source.id}>
            <strong>{index + 1}</strong><div className="efficiency-name"><b>{source.label}</b>{index === 0 && <small>현재 레벨 최고</small>}</div>
            <div className="efficiency-values">{efficiencyLevels.map(level => <span className={level === s.level ? "active" : ""} key={level}><small>Lv.{level}</small><b>{relativeEfficiencyScore(source, level).toFixed(1)}</b></span>)}</div>
          </div>)}
        </div>
        <p>수치는 경험치 %가 아닌 효율 비교 지수입니다. 하루1소재 Lv.281 수치를 기준으로 레벨별 경험치 감소율을 반영했습니다. 추가 경험치 50%와 소경축비는 기준값입니다.</p>
      </section>
    </section>}

    {activeTab === "passes" && <section className="rewards-section passes-panel tab-panel" id="passes-panel" role="tabpanel" aria-labelledby="passes-tab">
      <div className="section-heading light"><span>표</span><div><p>현재 패스 레벨 입력 가능</p><h2>패스 보상표</h2></div></div>
      <div className="pass-grid"><article><div className="table-title"><span>CHALLENGERS · 현재 {s.challengerPassLevel}레벨</span><h3>챌린저스 EXP 패스</h3></div><table><thead><tr><th>레벨 구간</th><th>일반</th><th>EXP 패스 포함</th></tr></thead><tbody><tr><td>1~10</td><td>-</td><td>블루베리 6 · 사우나 2시간 · 상급 EXP 2,000</td></tr><tr><td>11~20</td><td>-</td><td>블루베리 6 · 사우나 2시간 · 상급 EXP 2,000</td></tr><tr><td>21~25</td><td>상급 EXP 100</td><td>블루베리 3 · 사우나 1시간 · 상급 EXP 1,100</td></tr><tr><td>26~30</td><td>상급 EXP 2,100</td><td>블루베리 2 · 사우나 1시간 · 상급 EXP 3,100 · 비약 1</td></tr><tr className="total"><td>1~30 합계</td><td>상급 EXP 2,200</td><td>블루베리 17 · 사우나 6시간 · 상급 EXP 8,200 · 비약 1</td></tr></tbody></table></article><article><div className="table-title"><span>MOMENTUM · 현재 {s.momentumPassLevel}레벨</span><h3>모멘텀 패스</h3></div><table><thead><tr><th>레벨 구간</th><th>프라임 핵심 보상</th></tr></thead><tbody><tr><td>1~2</td><td>메카베리 2 · 사우나 30분 · 4배 쿠폰 2</td></tr><tr><td>3~5</td><td>메카베리 2 · 사우나 30분 · 상급 EXP 3,100 · 4배 2</td></tr><tr><td>6~8</td><td>메카베리 3 · 사우나 30분 · 상급 EXP 3,100 · 4배 2</td></tr><tr><td>9~10</td><td>메카베리 4 · 상급 EXP 3,300</td></tr><tr className="total"><td>1~10 합계</td><td>메카베리 11 · 사우나 1.5시간 · 상급 EXP 9,500</td></tr></tbody></table></article></div>
    </section>}

    <footer><div className="brand"><span className="brand-mark">M</span><span>285 CALCULATOR</span></div><p>경험치 기준 · 하루1소재 · 메이플로드 · 2026.07.17</p><div className="source-links"><a href="https://haru1sojae.kr/table" target="_blank" rel="noreferrer">하루1소재</a><a href="https://mapleroad.kr/utils/exp_calculator" target="_blank" rel="noreferrer">메이플로드</a><a href="https://maplestory.nexon.com/testworld/news/all/188" target="_blank" rel="noreferrer">테스트월드</a></div></footer>
  </main>;
}
