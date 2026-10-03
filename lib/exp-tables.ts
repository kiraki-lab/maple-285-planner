// 경험치 표와 계산 보조 함수. 화면(app/)과 분리해 두어 테스트가 빌드 없이 바로 불러온다.
// 출처: 하루1소재(haru1sojae.kr) 경험치 효율표·몬스터 기본 경험치·퍼스널 보스 표, 메이플로드, 넥슨 공식 공지.
import { monsterParkExperiencePercent } from "./calculator-core.mjs";

export type CustomRewardType = "adv" | "mech" | "crimson" | "blue" | "sauna" | "potion279";
export type ItemConversionInventory = Record<CustomRewardType, number>;
export type ItemConversionResult = {
  startLevel: number;
  startExp: number;
  level: number;
  exp: number;
  totalRawExperience: number;
  used: ItemConversionInventory;
  remaining: ItemConversionInventory;
  reachedUpperLimit: boolean;
};

type PlusReward = { deferMech: boolean; crimson: number; adv: number; sauna: number; coupon4x: number };

export const efficiency: Record<number, Record<string, number>> = {
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

// 크림슨 메카베리 농장은 전 구간 동렙몹 1,478,400마리 고정이다 (하루1소재).
// 메카베리는 구간마다 마릿수가 달라 배율이 레벨에 따라 바뀐다: 280~284 1.5556 · 285~289 1.1667 · 290+ 1.0769.
export const CRIMSON_FARM_MOBS = 1_478_400;
export const mechFarmMobsForLevel = (level: number) => level >= 290 ? 1_372_800 : level >= 285 ? 1_267_200 : 950_400;
export const crimsonPercentForLevel = (mechPercent: number, level: number) =>
  mechPercent * CRIMSON_FARM_MOBS / mechFarmMobsForLevel(level);

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
const GRANDIS_DAILY_BASE = 129_794_096_544;
const GRANDIS_DAILY_CARCION = 45_635_222_880;
const GRANDIS_DAILY_TALLAHART = 89_700_000_000;
const GRANDIS_DAILY_GEARDRAK = 105_300_000_000;
const ARTERIA_MONSTER_PARK_PER_RUN = 107_204_000_000;
const CARCION_MONSTER_PARK_PER_RUN = 156_017_856_000;
const TALLAHART_MONSTER_PARK_PER_RUN = 218_575_316_000;
export const WEEKLY_CONTENT_RAW: Record<number, { extreme: number; epic: number; sauna: number; adv1000: number }> = {
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

export const MOMENTUM_MAX_LEVEL = 10;

// 모멘텀 패스 PLUS. 챌섭 8/20~9/16 판과 본섭 9/17~10/21 판은 같은 사양이다.
// 본섭 공지 update-813의 레벨별 표를 옮겼다(2026-10-03 대조). 프리미엄 상급 EXP 1,500은 4·7·10레벨이다.
// 세 등급의 보상은 누적되며, 프라임은 프리미엄 선구매가 필수다.
export const MOMENTUM_PLUS_FREE: Record<number, { crimson?: number; adv?: number; sauna?: number }> = {
  1: { crimson: 1 }, 2: { sauna: 0.5 }, 4: { adv: 100 }, 5: { sauna: 0.5 }, 7: { adv: 100 }, 8: { sauna: 0.5 }, 10: { adv: 300 },
};
export const MOMENTUM_PLUS_PREMIUM: Record<number, { crimson?: number; adv?: number; coupon4x?: number }> = {
  2: { crimson: 1 }, 3: { coupon4x: 2 }, 4: { adv: 1500 }, 5: { crimson: 2 }, 7: { adv: 1500 }, 8: { crimson: 2 }, 9: { coupon4x: 2 }, 10: { adv: 1500 },
};
export const MOMENTUM_PLUS_PRIME: Record<number, { crimson?: number; adv?: number; coupon4x?: number }> = {
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
export const momentumPlusRewardForLevel = (level: number, tier: MomentumTier, deferMech: boolean): PlusReward => {
  const tables = [MOMENTUM_PLUS_FREE as Record<number, Record<string, number>>];
  if (tier !== "free") tables.push(MOMENTUM_PLUS_PREMIUM as Record<number, Record<string, number>>);
  if (tier === "prime") tables.push(MOMENTUM_PLUS_PRIME as Record<number, Record<string, number>>);
  const total = { crimson: 0, adv: 0, sauna: 0, coupon4x: 0 };
  tables.forEach(table => Object.entries(table[level] || {}).forEach(([key, value]) => { total[key as keyof typeof total] += value; }));
  return { deferMech, crimson: total.crimson, adv: total.adv, sauna: total.sauna, coupon4x: total.coupon4x };
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
export const itemConversionOrder: CustomRewardType[] = ["blue", "mech", "crimson", "sauna", "potion279", "adv"];
const emptyItemConversionInventory = (): ItemConversionInventory => ({ adv: 0, mech: 0, crimson: 0, blue: 0, sauna: 0, potion279: 0 });

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


// 본섭 퍼스널 버닝 계산용 경험치 표 어댑터. 엔진(lib/main-planner.mjs)은 표를 모르고 이 함수로만 받는다.
// 일과·아이템 값은 챌섭 계산기에서 검증한 표를 그대로 쓰되, 챌섭 전용 보너스(에테리온 코어 %)는 넣지 않는다.
export const createMainContext = () => ({
  levelCap: 296,
  reqRaw: (level: number) => itemConversionRequiredExperience(level),
  routineRaw: ({ level, runs, sundayKind, grandis }: { level: number; runs: number; sundayKind: "none" | "normal" | "special"; grandis: boolean }) => {
    const sundayBonus = sundayKind === "special" ? 3 : sundayKind === "normal" ? 0.5 : 0;
    const required = itemConversionRequiredExperience(level);
    const monsterPark = level >= 285
      ? monsterParkRawForLevel(level, true, true) * runs * (1 + sundayBonus)
      : required * monsterParkExperiencePercent({ baseSevenRunPercent: efficiency[level].mp7, runs, contentBonusPercent: 0, sundayKind }) / 100;
    const grandisRaw = !grandis ? 0 : level >= 285 ? grandisDailyRawForLevel(level, true) : required * efficiency[level].grandis / 100;
    return { monsterPark, grandis: grandisRaw };
  },
  weeklyRaw: ({ level, epicMult }: { level: number; epicMult: number }) => {
    if (level >= 291) return { extreme: POST_290_EFFICIENCY_RAW[level].extreme, epic: POST_290_EFFICIENCY_RAW[level].epic * epicMult };
    if (level >= 285) return { extreme: WEEKLY_CONTENT_RAW[level].extreme, epic: WEEKLY_CONTENT_RAW[level].epic * epicMult };
    const required = itemConversionRequiredExperience(level);
    return { extreme: required * efficiency[level].extreme / 100, epic: required * efficiency[level].epic / 100 * epicMult };
  },
  itemRaw: (type: string, level: number) => itemConversionRawExperience(type as CustomRewardType, level),
  plusReward: (level: number, tier: MomentumTier) => {
    const reward = momentumPlusRewardForLevel(level, tier, false);
    return { crimson: Number(reward.crimson || 0), adv: Number(reward.adv || 0), sauna: Number(reward.sauna || 0) };
  },
});
