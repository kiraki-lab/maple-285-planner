import { MOB_BASE_EXP } from "./personal-data.mjs";
import { createMainContext, epicDungeonBaseRaw, REQUIRED_EXP, MOMENTUM_PLUS_PREMIUM, MOMENTUM_PLUS_PRIME } from "./exp-tables.ts";
import { ordinaryFieldLevelFor, octoberPlusTierOptions } from "./main-planner.mjs";

const ctx = createMainContext();
const sumLine = table => Object.values(table).reduce((sum, row) => {
  for (const [key, value] of Object.entries(row)) sum[key] = (sum[key] ?? 0) + value;
  return sum;
}, { crimson: 0, adv: 0, sauna: 0, coupon4x: 0, booster: 0 });
const premium = sumLine(MOMENTUM_PLUS_PREMIUM);
const prime = sumLine(MOMENTUM_PLUS_PRIME);

export function efficiencyDefaults(planner) {
  return { level: planner.level, fieldLevel: ordinaryFieldLevelFor(planner.routine, planner.personal.flame, planner.level),
    bonus: planner.routine.huntBonusPct, maplePoints: 2300, won: 1550, shardPrice: 5900000,
    ordinaryPrice: "", detectivePrice: "" };
}

// 팀장 work/coin/calc_{october_pass,epic_coin,detective_magnifier,monster_pass}.mjs (2026-10-24).
// 일반 돋보기의 옛 스크립트에만 있던 레벨 차 1.2배는 제외한다. 모든 행의 분모는 캐릭터 레벨 몬스터다.
// 가격은 고정 레벨에서 입장권/쿠폰/부스터를 모두 쓸 때의 총량이다. 진행 시뮬레이터를 바꾸지 않는다.
export function compareExpEfficiency(values, planner) {
  const v = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : Number(value)]));
  const errors = [];
  if (!Number.isInteger(v.level) || v.level < 280 || v.level > 299) errors.push("캐릭터 레벨은 280~299로 넣어 주세요.");
  if (!Number.isInteger(v.fieldLevel) || v.fieldLevel < 260 || v.fieldLevel > 299) errors.push("몬스터 레벨은 260~299로 넣어 주세요.");
  for (const [key, label] of [["maplePoints", "메이플포인트"], ["won", "원"]]) {
    if (!(v[key] > 0) || !Number.isFinite(v[key])) errors.push(`1억 메소 값을 ${label}${key === "maplePoints" ? "로" : "으로"} 넣어 주세요.`);
  }
  for (const [key, label] of [["bonus", "사냥 추가 경험치"], ["shardPrice", "조각 시세"]]) {
    if (v[key] === null || !Number.isFinite(v[key]) || v[key] < 0) errors.push(`${label}를 0 이상으로 넣어 주세요.`);
  }
  for (const key of ["ordinaryPrice", "detectivePrice"]) {
    if (v[key] !== null && (!Number.isFinite(v[key]) || v[key] < 0)) errors.push("돋보기 시세는 0 이상으로 넣어 주세요.");
  }
  if (errors.length) return { errors, rows: [], magnifiers: [] };
  const base = MOB_BASE_EXP[v.level], field = MOB_BASE_EXP[v.fieldLevel], required = Number(REQUIRED_EXP[v.level]);
  const bonusFactor = 1 + v.bonus / 100;
  const mesoMP = mp => mp / v.maplePoints * 1e8;
  const lineRaw = line => line.crimson * ctx.itemRaw("crimson", v.level) + line.adv * ctx.itemRaw("adv", v.level)
    + line.sauna * ctx.itemRaw("sauna", v.level)
    + line.coupon4x * 3 * ctx.huntRaw({ level: v.level, fieldLevel: v.fieldLevel })
    + line.booster * 10 * 190 * field * bonusFactor;
  const available = octoberPlusTierOptions(planner.plus);
  const premiumAllowed = available.includes("premium");
  const primeAllowed = available.includes("prime");
  const epicMP = v.level >= 290 ? 15000 : 12500;
  const epicRaw = epicDungeonBaseRaw(v.level) * 4;
  const rows = [];
  const add = (id, label, rawExp, costMeso, canBuy = true, priceNote = "") => {
    const row = { id, label, rawExp, costMeso, available: canBuy, priceNote,
      percent: rawExp / required * 100,
      mesoPerMob: costMeso === null || !canBuy ? null : costMeso / (rawExp / base) };
    rows.push(row);
    return row;
  };
  add("premium", "10월 패스 프리미엄 줄", lineRaw(premium), 29800 / v.won * 1e8, premiumAllowed, "29,800원");
  add("prime", premiumAllowed ? "10월 패스 프라임 줄 · 프리미엄 구매 뒤 추가분" : "10월 패스 프라임 줄",
    lineRaw(prime), 39800 / v.won * 1e8, primeAllowed, "39,800원");
  add("both", "10월 패스 두 줄 모두", lineRaw(premium) + lineRaw(prime), 69600 / v.won * 1e8,
    premiumAllowed && primeAllowed, "69,600원");
  const epic1 = add("epic1", "에픽 EXP 보너스 1단계", epicRaw, mesoMP(epicMP) - 160000000, true, `${epicMP.toLocaleString("ko-KR")} 메이플포인트 − 주화 4개 값`);
  const epic2 = add("epic2", "에픽 EXP 보너스 1→2단계", epicRaw, mesoMP(epicMP * 3) - 160000000, true, `${(epicMP * 3).toLocaleString("ko-KR")} 메이플포인트 − 주화 4개 값`);
  const ordinary = add("ordinary", "수상한 돋보기 1개", 10 * 190 * field * bonusFactor, v.ordinaryPrice);
  const detective = add("detective", "탐정예티 돋보기 1개", 800 * 190 * field, v.detectivePrice);
  const alloc = planner.personal.flame.alloc;
  const validAlloc = [alloc.exp, alloc.shard, alloc.erda].every(n => Number.isInteger(n) && n >= 0) && alloc.exp + alloc.shard + alloc.erda === 3;
  add("monster", "플레임 1마리 충전", 72 * field + alloc.exp / 100 * 480 * base,
    mesoMP(10) - alloc.shard / 1500 * v.shardPrice, validAlloc,
    `10 메이플포인트 − 조각 값 · 조각 ${alloc.shard} / EXP ${alloc.exp} / 솔 에르다 ${alloc.erda}`);
  const coupon = add("coupon", "퍼스널 EXP 교환권 1장", 480 * base, v.shardPrice / 15, true, "조각 대신 EXP를 고를 때");
  for (const row of rows) row.relativeEpic1 = row.mesoPerMob === null || epic1.mesoPerMob <= 0 ? null : row.mesoPerMob / epic1.mesoPerMob;
  const magnifiers = [ordinary, detective].map(row => ({ ...row,
    thresholds: [epic1, epic2, coupon].map(ref => ({ id: ref.id, label: ref.label,
      price: row.rawExp / ref.rawExp * ref.costMeso,
      verdict: row.costMeso === null ? null : row.costMeso < row.rawExp / ref.rawExp * ref.costMeso ? "싸요" : row.costMeso > row.rawExp / ref.rawExp * ref.costMeso ? "비싸요" : "같아요" })) }));
  rows.sort((a, b) => (a.mesoPerMob ?? Infinity) - (b.mesoPerMob ?? Infinity));
  return { errors, rows, magnifiers, base, level: v.level };
}
