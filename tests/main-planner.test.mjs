import assert from "node:assert/strict";
import test from "node:test";
import {
  addDay,
  analyzeMain,
  bossListWeeklyRaw,
  bossPreset,
  flameModelRaw,
  buildMissionTable,
  compareDesignation,
  compareTiers,
  couponRawForLevel,
  defaultMainInput,
  diffDays,
  FLAME_STOCK_CAP,
  FLAME_WEEKLY_ADD,
  MAIN_SCHEDULE,
  MISSION_STEPS,
  plusUnlockedLevel,
  simulateMain,
  stepRawForLevel,
  stepRewardRawForLevel,
} from "../lib/main-planner.mjs";
import { createMainContext } from "../lib/exp-tables.ts";
import { MOB_BASE_EXP, PERSONAL_BOSS_TABLE } from "../lib/personal-data.mjs";


// 필요 경험치는 app/page.tsx 의 표를 그대로 옮긴 값이다. 표가 바뀌면 아래 연동 테스트가 먼저 깨진다.
const REQ = {
  280: 33_647_601_750_165, 281: 37_012_361_925_181, 282: 40_713_598_117_699, 283: 44_784_957_929_468, 284: 49_263_453_722_414,
  285: 99_512_176_519_276, 286: 109_463_394_171_203, 287: 120_409_733_588_323, 288: 132_450_706_947_155, 289: 145_695_777_641_870,
  290: 294_305_470_836_577, 291: 323_736_017_920_234, 292: 356_109_619_712_257, 293: 391_720_581_683_482, 294: 430_892_639_851_830,
  295: 870_403_132_500_696,
};
// 일과·아이템은 단순한 상수로 둔 시험용 표다. 이 테스트는 엔진의 규칙(일정, 상한, 단계 판정)만 확인한다.
const makeCtx = (overrides = {}) => ({
  levelCap: 296,
  reqRaw: level => REQ[level],
  routineRaw: ({ runs, grandis, sundayKind }) => ({
    monsterPark: runs * 150e9 * (sundayKind === "normal" ? 1.5 : sundayKind === "special" ? 4 : 1),
    grandis: grandis ? 170e9 : 0,
  }),
  weeklyRaw: ({ epicMult }) => ({ extreme: 1.0e12, epic: 1.2e12 * epicMult }),
  itemRaw: (type, level) => ({ crimson: REQ[level] * 0.05, adv: REQ[level] * 0.0001, sauna: REQ[level] * 0.0035, mech: REQ[level] * 0.045, blue: REQ[level] * 0.02, potion279: REQ[level] * 0.4 })[type] || 0,
  plusReward: (level, tier) => {
    const free = { 1: { crimson: 1 }, 2: { sauna: 0.5 }, 4: { adv: 100 }, 5: { sauna: 0.5 }, 7: { adv: 100 }, 8: { sauna: 0.5 }, 10: { adv: 300 } };
    const premium = { 2: { crimson: 1 }, 4: { adv: 1500 }, 5: { crimson: 2 }, 7: { adv: 1500 }, 8: { crimson: 2 }, 10: { adv: 1500 } };
    const prime = { 2: { adv: 3000 }, 3: { crimson: 3 }, 5: { adv: 3000 }, 6: { crimson: 4 }, 8: { adv: 3000 }, 10: { crimson: 4 } };
    const total = { crimson: 0, adv: 0, sauna: 0 };
    const add = row => Object.entries(row || {}).forEach(([k, v]) => { total[k] += v; });
    add(free[level]);
    if (tier !== "free") add(premium[level]);
    if (tier === "prime") add(prime[level]);
    return total;
  },
  ...overrides,
});
const ctx = makeCtx();

// 9/17 본섭에서 지정한 287레벨·20.162% 캐릭터의 30단계 표 (게시자 표 + 화면 캡처). 08a 조사 원문 §1.
const SAMPLE_TARGETS = [
  [287, 29.741], [287, 39.321], [287, 48.900], [287, 58.480], [287, 68.060], [287, 77.639], [287, 87.219], [287, 96.799],
  [288, 5.870], [288, 14.685], [288, 23.501], [288, 32.316], [288, 41.132], [288, 49.948], [288, 58.763], [288, 67.579], [288, 76.394], [288, 85.210], [288, 94.026],
  [289, 2.611], [289, 10.712], [289, 18.813], [289, 26.914], [289, 35.015], [289, 43.115], [289, 51.216], [289, 59.317], [289, 67.418], [289, 75.519], [289, 83.620],
];
const SAMPLE_REWARD_RAW = [...Array(8).fill(2_093_653_887_402), ...Array(11).fill(2_120_693_506_122), ...Array(11).fill(2_144_810_694_332)];
const coord = (level, exp) => level + exp / 100;

test("성장 미션 단계 크기는 레벨마다 한 값이고 290에서 뛴다", () => {
  assert.ok(Math.abs(stepRawForLevel(287) - 11.5349e12) < 1e6);
  for (let level = 285; level < 289; level += 1) assert.ok(stepRawForLevel(level + 1) > stepRawForLevel(level), `${level}→${level + 1} 단계 크기가 늘어야 한다`);
  const jump = stepRawForLevel(290) / stepRawForLevel(289);
  assert.ok(jump > 1.2 && jump < 1.3, `290 구간 점프 ${jump.toFixed(3)}`);
  assert.ok(stepRawForLevel(295) > stepRawForLevel(290));
});

test("모형이 본섭 287레벨 사례의 30개 목표와 보상을 재현한다 (모형을 맞춘 표본이라 독립 검증은 아니다)", () => {
  const built = buildMissionTable({ mode: "model", designLevel: 287, designExp: 20.162, stepsDone: 0 }, ctx);
  assert.equal(built.steps.length, MISSION_STEPS);
  built.steps.forEach(step => {
    const [level, exp] = SAMPLE_TARGETS[step.index - 1];
    const errorPoints = Math.abs(coord(step.level, step.exp) - coord(level, exp)) * 100;
    assert.ok(errorPoints < 0.02, `${step.index}단계 목표 오차 ${errorPoints.toFixed(4)}%p`);
    const rewardError = Math.abs(step.rewardRaw / SAMPLE_REWARD_RAW[step.index - 1] - 1);
    assert.ok(rewardError < 0.002, `${step.index}단계 보상 오차 ${(rewardError * 100).toFixed(3)}%`);
  });
});

test("화면 입력 방식은 1단계 목표와 보상만으로 나머지 단계를 잇는다", () => {
  const rewardPct = SAMPLE_REWARD_RAW[0] / REQ[287] * 100;
  const built = buildMissionTable({ mode: "screen", stepsDone: 0, nextTarget: { level: 287, exp: 29.741 }, nextRewardPct: rewardPct }, ctx);
  assert.equal(built.steps.length, MISSION_STEPS);
  built.steps.forEach(step => {
    const [level, exp] = SAMPLE_TARGETS[step.index - 1];
    assert.ok(Math.abs(coord(step.level, step.exp) - coord(level, exp)) * 100 < 0.2, `${step.index}단계`);
  });
  // 13단계까지 끝낸 사용자는 14단계부터 받는다.
  const mid = buildMissionTable({ mode: "screen", stepsDone: 13, nextTarget: { level: 288, exp: 49.948 }, nextRewardPct: 1.601 }, ctx);
  assert.equal(mid.steps[0].index, 14);
  assert.equal(mid.steps.at(-1).index, 30);
  assert.equal(buildMissionTable({ mode: "screen", stepsDone: 30, nextTarget: { level: 289, exp: 83.62 }, nextRewardPct: 1.4 }, ctx).steps.length, 0);
});

test("9/11 테섭 표본 285 이상 6개를 0.007레벨 안쪽으로 맞춘다", () => {
  const samples = [[285, 71.5, 288.6561], [286, 0, 288.8775], [290, 6.3, 291.51851], [291, 0, 292.34842], [293, 8.4, 294.22975], [294, 0, 295.0401]];
  samples.forEach(([level, exp, target]) => {
    const built = buildMissionTable({ mode: "model", designLevel: level, designExp: exp, stepsDone: 0 }, ctx);
    const last = built.steps.at(-1);
    assert.ok(Math.abs(coord(last.level, last.exp) - target) < 0.007, `${level}/${exp}% 30단계 ${coord(last.level, last.exp).toFixed(4)} vs ${target}`);
  });
});

test("단계 보상은 레벨의 몬스터 기본 경험치 × 502,828.8이다 (본섭 화면 네 레벨)", () => {
  // 본섭 화면의 보상 원값. 286은 대표 캐릭터(286레벨 지정), 287~289는 9/17 지정 287레벨 캐릭터.
  const screen = { 286: 2_066_779_207_004, 287: 2_093_653_887_402, 288: 2_120_693_506_122, 289: 2_144_810_694_332 };
  Object.entries(screen).forEach(([level, rawReward]) => {
    const multiple = rawReward / MOB_BASE_EXP[level];
    assert.ok(Math.abs(multiple - 502_828.8) < 0.02, `${level}레벨 배수 ${multiple}`);
    assert.ok(Math.abs(stepRewardRawForLevel(Number(level)) - rawReward) / rawReward < 1e-7);
  });
  // 커뮤니티 296레벨 계산의 보상 0.300%(필요 경험치 957.54조 기준)도 같은 배수의 반올림 범위다.
  const req296 = 2.5911e12 / 0.002706;
  assert.ok(Math.abs(stepRewardRawForLevel(296) / req296 * 100 - 0.300) < 0.0005);
  // 단계표의 보상은 이 값을 그대로 쓴다.
  const built = buildMissionTable({ mode: "model", designLevel: 290, designExp: 6.3, stepsDone: 0 }, ctx);
  built.steps.forEach(step => assert.equal(step.rewardRaw, stepRewardRawForLevel(step.level)));
});

test("단계 간격은 구간마다 몬스터 기본 경험치의 배수다", () => {
  const multiple = level => stepRawForLevel(level) / MOB_BASE_EXP[level];
  // 286~289 실측 간격은 배수 2,766,980~2,772,069
  [286, 287, 288, 289].forEach(level => assert.ok(multiple(level) > 2_766_000 && multiple(level) < 2_773_000, `${level}: ${multiple(level)}`));
  assert.ok(Math.abs(multiple(285) - 2_779_473) < 1);
  [290, 291, 292, 293, 294].forEach(level => assert.ok(Math.abs(multiple(level) - 3_068_366) < 1));
  [295, 296, 299].forEach(level => assert.ok(Math.abs(multiple(level) - 3_119_741) < 1));
  [280, 284].forEach(level => assert.ok(Math.abs(multiple(level) - 2_730_206) < 1));
  // 커뮤니티 296레벨 계산의 단계 간격 1.861%
  const req296 = 2.5911e12 / 0.002706;
  assert.ok(Math.abs(stepRawForLevel(296) / req296 * 100 - 1.861) < 0.0005);
  // 이전 모형은 295에서 간격이 뛰지 않아 295 이상 목표를 약 11% 가깝게 잡았다.
  assert.ok(stepRawForLevel(295) / stepRawForLevel(294) > 1.13);
});

test("본섭 286레벨 캐릭터의 미션 화면을 다음 목표 하나로 재현한다 (5~9단계, 30단계)", () => {
  const real = createMainContext();
  // 화면: 4단계 완료, 5단계 목표 286·69.714%(보상 1.888%), 6·7단계 80.123%·90.532%, 8·9단계 287·0.866%·10.446%, 30단계 289·2.496%
  const built = buildMissionTable({ mode: "screen", stepsDone: 4, nextTarget: { level: 286, exp: 69.714 }, nextRewardPct: 1.888 }, real);
  const at = index => built.steps.find(step => step.index === index);
  const expected = { 5: [286, 69.714], 6: [286, 80.123], 7: [286, 90.532], 8: [287, 0.866], 9: [287, 10.446], 30: [289, 2.496] };
  Object.entries(expected).forEach(([index, [level, exp]]) => {
    const step = at(Number(index));
    assert.equal(step.level, level, `${index}단계 레벨`);
    assert.ok(Math.abs(step.exp - exp) < 0.01, `${index}단계 ${step.exp.toFixed(3)}% vs 화면 ${exp}%`);
  });
  assert.equal(built.steps.length, 26);
  assert.equal(built.scale, 1, "화면 보상 %의 반올림 차이로는 보상을 조정하지 않는다");
  assert.equal(built.warnings.length, 0);
  // 보상: 화면 5단계 2조 667억 7920만 7004, 8단계 2조 936억 5388만 7402, 30단계 2조 1448억 1069만 4332
  assert.ok(Math.abs(at(8).rewardRaw - 2_093_653_887_402) / 2_093_653_887_402 < 1e-7);
  assert.ok(Math.abs(at(30).rewardRaw - 2_144_810_694_332) / 2_144_810_694_332 < 1e-7);
  assert.ok(Math.abs(at(5).rewardRaw - 2_066_779_207_004) / 2_066_779_207_004 < 2e-4, "5단계는 입력한 % 그대로(반올림 오차)");
});

test("입력한 보상이 표와 크게 다르면 입력값 쪽으로 맞추고 알린다", () => {
  const real = createMainContext();
  const built = buildMissionTable({ mode: "screen", stepsDone: 4, nextTarget: { level: 286, exp: 69.714 }, nextRewardPct: 2.5 }, real);
  assert.ok(built.scale > 1.3);
  assert.ok(built.warnings.some(text => text.includes("입력한 단계 보상이 표")));
  const sixth = built.steps.find(step => step.index === 6);
  assert.ok(Math.abs(sixth.exp - 80.123) < 0.01, "목표 위치는 표의 간격 그대로");
  assert.ok(Math.abs(sixth.rewardRaw / stepRewardRawForLevel(286) - built.scale) < 1e-9);
});

const baseInput = (patch = {}) => {
  const input = defaultMainInput("2026-10-04");
  return { ...input, ...patch, personal: { ...input.personal, ...(patch.personal || {}), flame: { ...input.personal.flame, ...(patch.personal?.flame || {}) } } };
};

test("플레임 보유량은 36,000을 넘지 않고 넘친 만큼 소실로 센다", () => {
  const result = simulateMain(baseInput({ personal: { flame: { stock: 36_000, killsPerWeek: 0 } } }), ctx);
  result.rows.forEach(row => assert.ok(row.flameStock <= FLAME_STOCK_CAP + 1e-9));
  // 10/8, 10/15, ... 11/12 목요일 6번. 사냥을 안 하니 매번 24,000이 통째로 소실된다.
  assert.equal(result.flame.overflowLost, 6 * FLAME_WEEKLY_ADD);
  assert.equal(result.flame.killed, 0);
});

test("매주 24,000마리를 고르게 잡으면 소실이 없다", () => {
  const result = simulateMain(baseInput(), ctx);
  assert.equal(result.flame.overflowLost, 0);
  assert.ok(result.flame.killed > 100_000);
});

test("퍼스널 원천은 지정 전에는 0이고 지정일부터 돈다", () => {
  const input = baseInput({ personal: { designated: false, designDate: "2026-10-08", mission: { designLevel: 288, designExp: 45 } } });
  const result = simulateMain(input, ctx);
  const before = result.rows.filter(row => diffDays(row.date, "2026-10-08") < 0);
  assert.ok(before.length > 0);
  before.forEach(row => assert.equal(row.steps, 0));
  assert.ok(result.flame.killed > 0);
  // 10/8 이전 주에는 플레임이 없어야 하므로 첫 주(10/4~10/7)에 사냥한 마리 수는 0이다.
  assert.equal(result.weeks[0].kills, 0);
  assert.ok(result.weeks.find(week => week.start === "2026-10-08").kills > 0);
});

test("마감일 뒤에는 단계 보상을 주지 않는다", () => {
  const early = simulateMain(baseInput({ end: "2026-10-10" }), ctx);
  early.mission.newlyCleared.forEach(step => assert.ok(diffDays(step.date, "2026-10-10") <= 0));
  const full = simulateMain(baseInput(), ctx);
  assert.ok(full.mission.stepsCleared >= early.mission.stepsCleared);
  assert.ok(full.mission.coins >= early.mission.coins);
});

test("단계 보상으로 들어온 경험치가 새로 넘은 단계 보상의 합과 같고 코인은 단계당 1,000이다", () => {
  const result = simulateMain(baseInput(), ctx);
  assert.ok(result.mission.newlyCleared.length >= 5, "시험이 의미 있으려면 여러 단계를 넘어야 한다");
  const table = buildMissionTable(baseInput().personal.mission, ctx).steps;
  const expected = result.mission.newlyCleared.reduce((sum, step) => sum + table.find(row => row.index === step.index).rewardRaw, 0);
  assert.ok(Math.abs(result.sourceRaw.missionReward - expected) / expected < 1e-9);
  assert.equal(result.mission.coins, result.mission.newlyCleared.length * 1000);
  assert.equal(result.mission.stepsCleared, 13 + result.mission.newlyCleared.length);
  // 단계는 번호 순서대로, 같은 날이면 한 번에 넘을 수 있다.
  result.mission.newlyCleared.forEach((step, index) => { if (index) assert.equal(step.index, result.mission.newlyCleared[index - 1].index + 1); });
});

test("큰 경험치 한 방이 목표 여러 개를 한꺼번에 넘긴다", () => {
  const input = baseInput({ items: { adv: 40_000_000 }, plus: { enabled: false } });
  const result = simulateMain(input, ctx);
  const byDay = {};
  result.mission.newlyCleared.forEach(step => { byDay[step.date] = (byDay[step.date] || 0) + 1; });
  assert.ok(Math.max(...Object.values(byDay)) >= 3, "하루에 3단계 이상 넘어야 한다");
});

test("경험치 보존: 원천별 합이 시작과 끝 위치의 차이와 같다", () => {
  const input = baseInput({
    plus: { claimedLevel: 6, tier: "prime" },
    items: { crimson: 2, sauna: 3, adv: 500 },
    personal: { bosses: [{ id: "bellona-hard", party: 1, doneThisWeek: false }] },
  });
  const result = simulateMain(input, ctx);
  const raw = (level, exp) => {
    let sum = 0;
    for (let l = 280; l < level; l += 1) sum += REQ[l];
    return sum + REQ[level] * exp / 100;
  };
  const gained = raw(result.level, result.exp) - raw(input.level, input.exp);
  const summed = Object.values(result.sourceRaw).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(gained - summed) / gained < 1e-6, `차이 ${((gained - summed) / 1e12).toFixed(4)}조`);
});

test("크림슨은 모아 두면 10/21에, 즉시 쓰면 받는 날 쓴다", () => {
  const held = simulateMain(baseInput({ items: { crimson: 5 }, plus: { enabled: false }, crimsonHold: 999 }), ctx);
  assert.equal(held.items.crimsonUsed, 5);
  const heldDay = held.rows.find(row => row.events.some(event => event.startsWith("크림슨")));
  assert.equal(heldDay.date, "2026-10-21");
  const now = simulateMain(baseInput({ items: { crimson: 5 }, plus: { enabled: false }, crimsonHold: 0 }), ctx);
  assert.equal(now.rows[0].events.filter(event => event.startsWith("크림슨")).length, 1, "받는 즉시 쓰면 첫날 쓴다");
  // 같은 5장이라도 더 높은 레벨에서 쓰면 경험치가 달라진다. 시험표에서는 레벨이 오를수록 한 장이 커진다.
  assert.notEqual(Math.round(held.sourceRaw.crimson), Math.round(now.sourceRaw.crimson));
});

test("레벨 상한에 막혀 못 쓴 PLUS 아이템은 10/21에 소멸로 센다", () => {
  const input = baseInput({ level: 295, exp: 99.9, items: { crimson: 3, adv: 100, sauna: 2 }, plus: { enabled: false } });
  const result = simulateMain(input, ctx);
  assert.ok(result.atCap);
  assert.equal(result.items.expired.crimson + result.items.crimsonUsed, 3);
  const afterDeadline = simulateMain(baseInput({ start: "2026-10-23", items: { crimson: 5, sauna: 5, adv: 5 } }), ctx);
  assert.equal(afterDeadline.items.crimsonUsed, 0, "PLUS 마감 뒤에는 보유 크림슨이 이미 없다");
});

test("PLUS는 수령 레벨 다음부터 주차대로 열린다", () => {
  assert.equal(plusUnlockedLevel(0), 3);
  assert.equal(plusUnlockedLevel(1), 6);
  assert.equal(plusUnlockedLevel(2), 10);
  const lagging = simulateMain(baseInput({ start: "2026-09-24", plus: { claimedLevel: 0, tier: "free" } }), ctx);
  const caught = lagging.rows[0].events.join(" ");
  assert.match(caught, /PLUS 보상 수령/);
  const done = simulateMain(baseInput({ plus: { claimedLevel: 10 } }), ctx);
  assert.ok(!done.rows.some(row => row.events.includes("PLUS 보상 수령")), "10레벨까지 받았으면 더 받을 것이 없다");
});

test("프리미엄 6레벨이 아니라 7레벨에서 상급 EXP를 받는다", () => {
  const sixth = ctx.plusReward(6, "premium");
  const seventh = ctx.plusReward(7, "premium");
  assert.equal(sixth.adv, 0);
  assert.equal(seventh.adv, 1500 + 100);
});

test("보스 미션은 9/24부터 주 1회 들어가고 이미 한 주는 건너뛴다", () => {
  const boss = { id: "jupiter-hard", party: 3, doneThisWeek: true };
  const result = simulateMain(baseInput({ personal: { bosses: [boss] } }), ctx);
  // 시작(10/4 일) 주는 이미 처치. 10/8, 10/15, ... 11/12 목요일 6번만 센다.
  assert.equal(result.boss.clears, 6);
  const fresh = simulateMain(baseInput({ personal: { bosses: [{ ...boss, doneThisWeek: false }] } }), ctx);
  assert.equal(fresh.boss.clears, 7);
  assert.ok(fresh.progress > result.progress);
  const early = simulateMain(baseInput({ start: "2026-09-20", personal: { bosses: [{ ...boss, doneThisWeek: false }] } }), ctx);
  assert.ok(!early.rows.slice(0, 4).some(row => row.events.some(event => event.startsWith("보스 미션"))), "9/24 전에는 보스 미션이 없다");
});

test("교환권은 마감 직전에 몰아 써도 만료되지 않는다", () => {
  const input = baseInput({ personal: { couponPolicy: "end" } });
  const result = simulateMain(input, ctx);
  assert.equal(result.coupons.expired, 0);
  assert.equal(result.coupons.used, result.coupons.made);
  const last = result.rows.at(-1);
  assert.match(last.events.join(" "), /교환권/);
});

test("플레임 경험치를 늘리면 결과가 줄지 않는다", () => {
  const low = simulateMain(baseInput({ personal: { flame: { expPerKill: 100_000_000 } } }), ctx);
  const high = simulateMain(baseInput({ personal: { flame: { expPerKill: 300_000_000 } } }), ctx);
  assert.ok(high.progress >= low.progress);
  assert.ok(high.mission.stepsCleared >= low.mission.stepsCleared);
});

test("모든 계산이 같은 입력에서 같은 결과를 낸다", () => {
  const a = simulateMain(baseInput(), ctx);
  const b = simulateMain(baseInput(), ctx);
  assert.equal(JSON.stringify(a.rows), JSON.stringify(b.rows));
});

test("시점 비교는 통과 단계, 마감 위치 순으로 가장 좋은 조합을 고른다", () => {
  const input = baseInput({ items: { crimson: 4 }, plus: { claimedLevel: 6, tier: "prime" } });
  const analysis = analyzeMain(input, ctx);
  assert.ok(analysis.options.length >= 4);
  assert.equal(analysis.options.filter(option => option.best).length, 1);
  analysis.options.forEach(option => {
    assert.ok(analysis.best.summary.stepsCleared >= option.summary.stepsCleared);
    if (option.summary.stepsCleared === analysis.best.summary.stepsCleared) assert.ok(analysis.best.summary.progress >= option.summary.progress - 1e-9);
  });
});

test("마감 후에는 계산할 날이 없고, 시작일이 이벤트 이전이어도 퍼스널은 9/17부터다", () => {
  const over = simulateMain(baseInput({ start: "2026-11-20" }), ctx);
  assert.equal(over.rows.length, 0);
  const early = simulateMain(baseInput({ start: "2026-09-10", personal: { designated: false, designDate: "2026-09-10" } }), ctx);
  assert.ok(early.rows.length > 0);
  assert.ok(early.weeks[0].kills === 0, "9/17 전에는 플레임이 없다");
});

test("일정 상수는 공식 공지와 맞다", () => {
  assert.equal(MAIN_SCHEDULE.personalEnd, "2026-11-18");
  assert.equal(MAIN_SCHEDULE.plusLastUseDay, "2026-10-21");
  assert.equal(MAIN_SCHEDULE.bossStart, "2026-09-24");
  assert.equal(addDay("2026-10-21", 1), "2026-10-22");
});

test("등급 비교는 현재 등급 이상만 보여 주고 캐시를 센다", () => {
  const rows = compareTiers(baseInput({ plus: { claimedLevel: 10, tier: "free" } }), ctx);
  assert.deepEqual(rows.map(row => row.tier), ["free", "premium", "prime"]);
  assert.equal(rows[0].cash, 0);
  assert.equal(rows[1].cash, 29_800);
  assert.equal(rows[2].cash, 69_600, "프라임은 프리미엄을 먼저 사야 한다");
  rows.forEach(row => assert.ok(row.gainProgress >= -1e-9, "위 등급이 더 나쁘면 안 된다"));
  assert.ok(rows[2].extra.adv > rows[1].extra.adv, "이미 받은 레벨의 위 등급 보상도 받는다");
  const premiumOwned = compareTiers(baseInput({ plus: { claimedLevel: 10, tier: "premium" } }), ctx);
  assert.deepEqual(premiumOwned.map(row => row.tier), ["premium", "prime"]);
  assert.equal(premiumOwned[1].cash, 39_800);
  assert.equal(compareTiers(baseInput({ plus: { enabled: false } }), ctx).length >= 1, true);
});

test("지정 시점 비교는 지정 예정일 때만 나오고 늦을수록 나빠지지 않는 쪽이 없다", () => {
  assert.equal(compareDesignation(baseInput(), ctx).length, 0, "이미 지정했으면 비교하지 않는다");
  const planned = compareDesignation(baseInput({ personal: { designated: false, designDate: "2026-10-04", mission: { designLevel: 288, designExp: 45 } } }), ctx);
  assert.equal(planned.length, 3);
  assert.deepEqual(planned.map(row => row.designDate), ["2026-10-04", "2026-10-08", "2026-10-15"]);
  assert.ok(planned[0].summary.progress >= planned[1].summary.progress - 1e-9);
  assert.ok(planned[1].summary.progress >= planned[2].summary.progress - 1e-9);
  assert.ok(planned[0].flameKilled >= planned[2].flameKilled);
});

// ── 실제 경험치 표와 연결 ─────────────────────────────────────────

test("실제 표로 기본 입력을 돌려 앞뒤가 맞는 결과가 나온다", () => {
  const real = createMainContext();
  const input = defaultMainInput("2026-10-04");
  const result = simulateMain(input, real);
  assert.ok(result.rows.length === diffDays("2026-11-18", "2026-10-04") + 1);
  assert.ok(result.progress > result.startPosition);
  assert.ok(result.mission.stepsCleared >= 13);
  assert.ok(result.mission.stepsCleared <= 30);
  // 입력의 13단계 이후만 새로 센다.
  assert.equal(result.mission.stepsCleared, 13 + result.mission.newlyCleared.length);
  // 원천별 합이 위치 차이와 맞는다.
  const raw = (level, exp) => { let sum = 0; for (let l = 280; l < level; l += 1) sum += real.reqRaw(l); return sum + real.reqRaw(level) * exp / 100; };
  const gained = raw(result.level, result.exp) - raw(input.level, input.exp);
  const summed = Object.values(result.sourceRaw).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(gained - summed) / gained < 1e-6);
});

test("실제 표로 보스 프리셋을 넣으면 보스 경험치가 원천에 잡힌다", () => {
  const real = createMainContext();
  const input = defaultMainInput("2026-10-04");
  input.personal.bosses = [];
  const without = simulateMain(input, real);
  const withBosses = simulateMain({ ...input, personal: { ...input.personal, bosses: bossPreset({ cutoffId: "bellona-hard" }) } }, real);
  assert.ok(!without.sourceRaw.boss);
  assert.ok(withBosses.sourceRaw.boss > 0);
  assert.equal(withBosses.boss.clears, 12 * 7, "12개 × (시작 주 1회 + 목요일 6회)");
  assert.ok(withBosses.progress > without.progress);
  // 한 주 합계 × 7주 = 원천 합계
  assert.equal(withBosses.sourceRaw.boss, bossListWeeklyRaw(bossPreset({ cutoffId: "bellona-hard" })) * 7);
});

test("플레임은 몬스터 기본 경험치 ×72, 교환권은 레벨의 기본 경험치 ×480으로 쌓인다", () => {
  const real = createMainContext();
  const input = defaultMainInput("2026-10-04");
  const result = simulateMain(input, real);
  const killed = result.flame.killed;
  assert.ok(Math.abs(result.sourceRaw.flame - killed * flameModelRaw(288)) / result.sourceRaw.flame < 1e-9);
  // 교환권은 포인트 100p당 1장이고, EXP 3을 배분하면 한 마리당 3포인트가 쌓인다.
  assert.equal(result.coupons.made, Math.floor(killed * 3 / 100));
  // 사냥터를 높이면 플레임 경험치가 같은 비율로 커진다.
  const high = simulateMain({ ...input, personal: { ...input.personal, flame: { ...input.personal.flame, fieldLevel: 295 } } }, real);
  assert.ok(high.sourceRaw.flame > result.sourceRaw.flame);
  assert.ok(Math.abs(high.sourceRaw.flame / result.sourceRaw.flame - flameModelRaw(295) / flameModelRaw(288)) < 1e-9);
  // 입력한 로그 값이 표보다 우선한다.
  const logged = simulateMain({ ...input, personal: { ...input.personal, flame: { ...input.personal.flame, expPerKill: 100_000_000 } } }, real);
  assert.ok(Math.abs(logged.sourceRaw.flame - killed * 100_000_000) / logged.sourceRaw.flame < 1e-9);
});

test("295레벨 끝에서 296 상한에 닿아도 주간 컨텐츠 계산이 깨지지 않는다", () => {
  const real = createMainContext();
  const input = { ...defaultMainInput("2026-10-04"), level: 295, exp: 99, personal: { ...defaultMainInput("2026-10-04").personal, mission: { ...defaultMainInput("2026-10-04").personal.mission, nextTarget: { level: 295, exp: 99.5 } } } };
  const result = simulateMain(input, real);
  assert.ok(result.atCap);
  assert.equal(result.level, 296);
  assert.ok(result.rows.length > 0 && result.rows.every(row => Number.isFinite(row.progress)));
  assert.ok(analyzeMain(input, real).options.every(option => Number.isFinite(option.summary.progress)));
});

test("깨진 입력은 안전한 값으로 바로잡거나 무시한다", () => {
  const real = createMainContext();
  const base = defaultMainInput("2026-10-04");
  const finite = result => [result.level, result.exp, result.progress, ...Object.values(result.sourceRaw)].every(Number.isFinite);
  const cases = [
    { ...base, start: "abc" },
    { ...base, level: 300 }, { ...base, level: NaN }, { ...base, exp: -5 }, { ...base, exp: 150 }, { ...base, exp: "45" },
    { ...base, personal: { ...base.personal, flame: { ...base.personal.flame, stock: -10, killsPerWeek: NaN } } },
    { ...base, personal: { ...base.personal, bosses: [{ id: "없는보스", party: 1 }, { id: "lotus-hard", party: "3" }] } },
    { ...base, routine: { ...base.routine, runsPerDay: 99 } },
    { ...base, plus: { ...base.plus, claimedLevel: 99 } },
    { ...base, items: { ...base.items, crimson: -5, adv: -100 } },
    { ...base, personal: { ...base.personal, mission: { ...base.personal.mission, stepsDone: 40 } } },
  ];
  cases.forEach((input, index) => assert.ok(finite(simulateMain(input, real)), `${index}번째 입력에서 숫자가 깨졌다`));
  assert.equal(simulateMain({ ...base, start: "abc" }, real).start, "2026-09-17", "깨진 날짜는 이벤트 시작일로 둔다");
  // 같은 보스를 여러 번 넣으면 하나만 센다.
  const dup = simulateMain({ ...base, personal: { ...base.personal, bosses: Array.from({ length: 20 }, () => ({ id: "lotus-hard", party: 1 })) } }, real);
  assert.ok(dup.warnings.some(text => text.includes("겹친")));
  assert.equal(dup.boss.clears, 7, "스우 하드 하나 × 7주");
  // 17종을 전부 넣어도 12개까지만 센다.
  const allBosses = bossPreset({ cutoffId: "kaling-extreme", limit: 99 });
  assert.equal(allBosses.length, 12, "프리셋 자체도 12개를 넘지 않는다");
  const families = [...new Set(PERSONAL_BOSS_TABLE.map(entry => entry.boss))].map(name => PERSONAL_BOSS_TABLE.find(entry => entry.boss === name).id);
  assert.equal(families.length, 17);
  const many = simulateMain({ ...base, personal: { ...base.personal, bosses: families.map(id => ({ id, party: 1 })) } }, real);
  assert.ok(many.warnings.some(text => text.includes("12개까지")));
  assert.equal(many.boss.clears, 12 * 7);
});

// ── 독립 검증에서 지적된 경계 (2026-10-04 코덱스 REVISE 반영) ─────────

// 일과·PLUS·사냥을 꺼서 한 가지 현상만 보는 입력.
const isolated = () => {
  const x = defaultMainInput("2026-10-04");
  x.end = x.start;
  Object.assign(x.routine, { runsPerDay: 0, grandis: false, extreme: false, epic: false, todayPending: false });
  x.plus.enabled = false;
  x.personal.mission.stepsDone = 30;
  x.personal.flame.killsPerWeek = 0;
  x.personal.bosses = [];
  x.routine.huntHoursPerWeek = 0;
  return x;
};

test("아이템을 쓰는 도중 미션 보상으로 레벨이 오르면 남은 아이템은 새 레벨 값으로 쓴다", () => {
  const real = createMainContext();
  const input = isolated();
  Object.assign(input, { level: 289, exp: 90 });
  input.items.crimson = 5;
  input.personal.mission = { mode: "screen", stepsDone: 25, nextTarget: { level: 289, exp: 92 }, nextRewardPct: 1.472, designLevel: 287, designExp: 20.162 };
  const result = simulateMain(input, real);

  // 독립 기준: 한 장씩 쓰고 목표를 넘는 순간 보상을 바로 적용한다.
  const table = buildMissionTable(input.personal.mission, real).steps;
  let level = 289;
  let xp = real.reqRaw(289) * 0.9;
  let next = 0;
  const add = raw => {
    xp += raw;
    while (xp >= real.reqRaw(level)) { xp -= real.reqRaw(level); level += 1; }
  };
  const settle = () => {
    while (next < table.length && level + xp / real.reqRaw(level) >= table[next].coordinate - 1e-12) { add(table[next].rewardRaw); next += 1; }
  };
  for (let i = 0; i < 5; i += 1) { add(real.itemRaw("crimson", level)); settle(); }
  assert.ok(Math.abs(result.progress - (level + xp / real.reqRaw(level))) < 1e-9, `${result.progress} vs ${level + xp / real.reqRaw(level)}`);
  assert.ok(result.mission.newlyCleared.length >= 1, "시험이 의미 있으려면 미션 보상이 중간에 나와야 한다");
});

test("교환권도 미션 보상으로 레벨이 오르면 새 레벨 값으로 쓴다", () => {
  const real = createMainContext();
  const input = isolated();
  Object.assign(input, { level: 289, exp: 99 });
  input.personal.flame.couponsOwned = 1000;
  input.personal.mission = { mode: "screen", stepsDone: 29, nextTarget: { level: 289, exp: 99.001 }, nextRewardPct: 1.472, designLevel: 287, designExp: 20.162 };
  input.personal.couponPolicy = "now";
  const result = simulateMain(input, real);
  const table = buildMissionTable(input.personal.mission, real).steps;
  let level = 289;
  let xp = real.reqRaw(289) * 0.99;
  let next = 0;
  for (let i = 0; i < 1000; i += 1) {
    xp += couponRawForLevel(level);
    while (xp >= real.reqRaw(level)) { xp -= real.reqRaw(level); level += 1; }
    while (next < table.length && level + xp / real.reqRaw(level) >= table[next].coordinate - 1e-12) {
      xp += table[next].rewardRaw; next += 1;
      while (xp >= real.reqRaw(level)) { xp -= real.reqRaw(level); level += 1; }
    }
  }
  assert.ok(Math.abs(result.progress - (level + xp / real.reqRaw(level))) < 1e-9);
});

test("공식 종료일(11/18) 뒤에는 계산 종료일을 늘려도 퍼스널 원천이 멈춘다", () => {
  const real = createMainContext();
  const input = isolated();
  Object.assign(input, { start: "2026-11-19", end: "2026-11-25" });
  input.personal.flame.killsPerWeek = 700;
  input.personal.flame.couponsOwned = 21;
  input.personal.bosses = [{ id: "lotus-hard", party: 1, doneThisWeek: false }];
  input.personal.mission = { mode: "screen", stepsDone: 29, nextTarget: { level: 288, exp: 45.001 }, nextRewardPct: 1.601, designLevel: 287, designExp: 20 };
  const result = simulateMain(input, real);
  assert.equal(result.flame.killed, 0);
  assert.equal(result.boss.clears, 0);
  assert.equal(result.coupons.used, 0);
  assert.equal(result.mission.newlyCleared.length, 0);
  assert.equal(result.mission.coins, 0);
  // 종료일 안에서 시작해 종료일을 넘겨 계산해도 11/18 이후는 늘지 않는다.
  const spill = { ...defaultMainInput("2026-11-10"), end: "2026-11-30" };
  const stopped = simulateMain(spill, real);
  const onTime = simulateMain({ ...spill, end: "2026-11-18" }, real);
  assert.equal(stopped.flame.killed, onTime.flame.killed);
  assert.equal(stopped.boss.clears, onTime.boss.clears);
  assert.equal(stopped.mission.stepsCleared, onTime.mission.stepsCleared);
  stopped.mission.newlyCleared.forEach(step => assert.ok(diffDays(step.date, "2026-11-18") <= 0));
  assert.equal(stopped.coupons.used, onTime.coupons.used);
  assert.equal(stopped.coupons.expired, 0);
});

test("커스텀 포인트가 정확히 3이 아니면 플레임이 소환되지 않는다", () => {
  const real = createMainContext();
  const make = alloc => { const x = isolated(); x.end = "2026-10-10"; x.personal.flame.killsPerWeek = 700; x.personal.flame.alloc = alloc; return simulateMain(x, real); };
  const none = make({ shard: 0, exp: 0, erda: 0 });
  assert.equal(none.flame.killed, 0);
  assert.ok(none.warnings.some(text => text.includes("정수 3개로 나뉘어 있지 않아")));
  assert.equal(make({ shard: 3, exp: 3, erda: 3 }).flame.killed, 0, "합이 9여도 사냥하지 않는다");
  assert.equal(make({ shard: 2, exp: 0, erda: 0 }).flame.killed, 0, "합이 2여도 소환 불가");
  const fractional = make({ shard: 1.9, exp: 1.9, erda: 1.9 });
  assert.equal(fractional.flame.killed, 0, "소수 포인트는 합이 5.7이어도 버림으로 3이 되지 않는다");
  assert.ok(fractional.warnings.some(text => text.includes("정수 3개로 나뉘어 있지 않아")));
  assert.equal(make({ shard: 1.5, exp: 1.5, erda: 0 }).flame.killed, 0, "합이 3인 소수도 소환 불가");
  const ok = make({ shard: 1, exp: 1, erda: 1 });
  assert.ok(ok.flame.killed > 0);
  assert.ok(Math.abs(ok.flame.shardFragments - ok.flame.killed / 1500) < 1e-9);
  assert.ok(Math.abs(ok.flame.erdaEnergy - ok.flame.killed / 1500 * 6) < 1e-9);
  assert.equal(ok.coupons.made, Math.floor(ok.flame.killed * 1 / 100));
});

test("숫자 문자열과 깨진 값을 같은 규칙으로 정리한다", () => {
  const real = createMainContext();
  const base = defaultMainInput("2026-10-04");
  const received = { ...base.plus, claimedLevel: 10 };
  const strings = simulateMain({ ...base, level: "288", exp: "45", plus: received, items: { ...base.items, crimson: "2" } }, real);
  const numbers = simulateMain({ ...base, level: 288, exp: 45, plus: received, items: { ...base.items, crimson: 2 } }, real);
  assert.equal(strings.level, numbers.level);
  assert.equal(strings.progress, numbers.progress);
  assert.equal(strings.items.crimsonUsed, 2);
  // 등급 비교에서 문자열이 수량에 이어 붙지 않는다.
  const tiers = compareTiers({ ...base, items: { ...base.items, crimson: "2" }, plus: { ...base.plus, claimedLevel: 10 } }, real);
  const reference = analyzeMain({ ...base, plus: received, items: { ...base.items, crimson: 2 } }, real);
  assert.equal(tiers[0].summary.progress, reference.best.summary.progress);
  // 음수·NaN·모르는 값
  const odd = simulateMain({ ...base, personal: { ...base.personal, mission: { ...base.personal.mission, stepsDone: -2 }, flame: { ...base.personal.flame, stock: "bad", couponsOwned: "bad" }, bosses: [null, 3, { id: "lotus-hard", party: "2" }] } }, real);
  assert.ok(odd.mission.stepsCleared >= 0 && odd.mission.totalCoins >= 0);
  assert.ok(Number.isFinite(odd.flame.endStock) && Number.isFinite(odd.coupons.expired));
  assert.equal(odd.boss.clears, 7, "알 수 있는 보스 하나만 센다");
  // 존재하지 않는 날짜(2/30)는 이월되지 않고 기본 날짜로 돌아간다.
  const badDate = simulateMain({ ...base, start: "2026-02-30", end: "2026-03-02" }, real);
  assert.equal(badDate.start, "2026-09-17");
  assert.ok(badDate.warnings.some(text => text.includes("올바른 날짜가 아니라")));
  // 범위 밖 레벨은 끝값으로 바꾸고 알린다.
  const low = simulateMain({ ...base, level: 279 }, real);
  assert.ok(low.warnings.some(text => text.includes("280~295")));
  const outOfRange = simulateMain({ ...base, level: 296 }, real);
  assert.ok(outOfRange.warnings.some(text => text.includes("295레벨로 계산")));
});

test("296 상한에 닿은 뒤 지정하는 경우는 단계표를 만들지 않는다", () => {
  const real = createMainContext();
  const input = isolated();
  Object.assign(input, { level: 295, exp: 99.9, end: "2026-10-05" });
  input.items.potion279 = 1;
  input.personal.designated = false;
  input.personal.designDate = "2026-10-05";
  const result = simulateMain(input, real);
  assert.ok(result.atCap);
  assert.equal(result.mission.steps.length, 0);
  assert.ok(result.warnings.some(text => text.includes("296레벨에 닿은 뒤")));
});

test("주간 컨텐츠도 직접 입력으로 바꿀 수 있다", () => {
  const real = createMainContext();
  const input = defaultMainInput("2026-10-04");
  input.routine.weeklyMeasuredPercent = 3;
  const result = simulateMain(input, real);
  assert.ok(result.sourceRaw.weekly > 0);
  assert.ok(!result.sourceRaw.extreme && !result.sourceRaw.epic, "표 값은 쓰지 않는다");
  assert.ok(Math.abs(result.sourceRaw.weekly - 6 * real.reqRaw(288) * 0.03) < 1, "목요일 6번 × 288레벨의 3%");
});

test("퍼스널이 이미 끝난 기간만 계산하면 '시작하지 않아' 경고 대신 끝났다는 사실이 남는다", () => {
  const real = createMainContext();
  const input = isolated();
  Object.assign(input, { start: "2026-11-10", end: "2026-11-30" });
  const result = simulateMain(input, real);
  assert.ok(!result.warnings.some(text => text.includes("시작하지 않아")), result.warnings.join(" | "));
  assert.equal(result.start, "2026-11-10");
  assert.ok(result.mission.stepsCleared >= 0);
});

test("등급 비교와 시점 비교도 입력 경고를 잃지 않는다", () => {
  const real = createMainContext();
  const base = defaultMainInput("2026-10-04");
  const bad = { ...base, level: 279, items: { ...base.items, crimson: 1 }, plus: { ...base.plus, tier: "free" } };
  const has = result => result.warnings.filter(text => text.includes("280~295")).length;
  assert.equal(has(analyzeMain(bad, real).best.result), 1, "기준 계산에는 경고가 한 번 있다");
  const tiers = compareTiers(bad, real);
  assert.equal(tiers.length, 3);
  tiers.forEach(tier => assert.equal(has(tier.analysis.best.result), 1, `${tier.tier}: 경고가 남고 중복되지 않는다`));
  const designation = compareDesignation({ ...bad, personal: { ...bad.personal, designated: false, designDate: "2026-10-06" } }, real);
  assert.equal(designation.length, 3);
  designation.forEach(row => assert.equal(has(row.result), 1));
});

test("기본 보스 구성은 검밑솔 + 하드 세렌 + 이지 카링이고 솔로 10종이다", () => {
  const real = createMainContext();
  const input = defaultMainInput("2026-10-04");
  const ids = input.personal.bosses.map(boss => boss.id);
  assert.equal(ids.length, 10);
  ["damien-hard", "lotus-hard", "lucid-hard", "will-hard", "dunkel-hard", "hilla-hard", "dusk-chaos", "gas-chaos", "seren-hard", "kaling-easy"].forEach(id => assert.ok(ids.includes(id), id));
  assert.ok(input.personal.bosses.every(boss => boss.party === 1 && boss.doneThisWeek === false));
  const result = simulateMain(input, real);
  assert.equal(result.boss.clears, 10 * 7, "10개 × (시작 주 1회 + 목요일 6회)");
  assert.ok(result.sourceRaw.boss > 0);
});

test("기본 PLUS는 프라임 + 몰아쓰기라 기준일까지 열린 보상을 전부 모아 둔 것으로 본다", () => {
  const real = createMainContext();
  assert.deepEqual(defaultMainInput("2026-10-04").plus, { enabled: true, tier: "prime", claimedLevel: 0 });
  assert.deepEqual(defaultMainInput("2026-09-17").plus, { enabled: true, tier: "prime", claimedLevel: 0 });
  const result = analyzeMain(defaultMainInput("2026-10-04"), real);
  assert.ok(result.best.crimsonHold > 0, "추천은 모아서 쓰는 쪽");
  assert.ok(result.best.result.items.crimsonUsed > 10, "프라임 크림슨이 들어와 쓰인다");
  assert.ok(result.best.summary.progress > result.immediate.summary.progress);
});

test("아르고호의 가호: 몬스터파크·그란디스 경험치 증가가 그 두 원천에만 곱해진다", () => {
  const real = createMainContext();
  const make = (mp, gr) => {
    const x = isolated();
    Object.assign(x, { end: "2026-10-10" });
    Object.assign(x.routine, { runsPerDay: 2, grandis: true, argoMonsterPark: mp, argoGrandis: gr });
    return simulateMain(x, real);
  };
  const none = make(0, 0);
  const mp50 = make(50, 0);
  const gr10 = make(0, 10);
  assert.ok(none.sourceRaw.monsterPark > 0 && none.sourceRaw.grandis > 0);
  assert.ok(Math.abs(mp50.sourceRaw.monsterPark / none.sourceRaw.monsterPark - 1.5) < 1e-9);
  assert.ok(Math.abs(mp50.sourceRaw.grandis - none.sourceRaw.grandis) < 1e-6, "몬파 증가는 그란디스에 영향이 없다");
  assert.ok(Math.abs(gr10.sourceRaw.grandis / none.sourceRaw.grandis - 1.1) < 1e-9);
  assert.ok(Math.abs(gr10.sourceRaw.monsterPark - none.sourceRaw.monsterPark) < 1e-6);
  // 기본값은 대표 화면(몬파 Lv6 = 50%, 그란디스 Lv2 = 10%)이고 범위 밖은 끝값으로 바로잡는다.
  const d = defaultMainInput("2026-10-04").routine;
  assert.equal(d.argoMonsterPark, 50);
  assert.equal(d.argoGrandis, 10);
  const wild = simulateMain({ ...isolated(), end: "2026-10-05", routine: { ...isolated().routine, argoMonsterPark: 999, argoGrandis: -5 } }, real);
  assert.ok(Number.isFinite(wild.progress));
});

test("사냥 경험치는 시간과 추가 경험치에 비례하고 0시간이면 없다", () => {
  const real = createMainContext();
  const make = (hours, bonus) => {
    const x = isolated();
    Object.assign(x, { end: "2026-10-17" });
    Object.assign(x.routine, { huntHoursPerWeek: hours, huntBonusPct: bonus });
    return simulateMain(x, real);
  };
  assert.ok(!make(0, 300).sourceRaw.hunt);
  const pure = make(7, 0);
  // 하루 1시간(30분 2번) × 13일(시작일 제외) × 288레벨 순수 30분 경험치
  const perSession = real.huntRaw({ level: 288, fieldLevel: 288 });
  assert.ok(Math.abs(pure.sourceRaw.hunt - perSession * 2 * 13) / pure.sourceRaw.hunt < 1e-9, "레벨이 그대로인 동안은 단순 곱");
  assert.ok(Math.abs(make(7, 300).sourceRaw.hunt / pure.sourceRaw.hunt - 4) < 1e-9);
  assert.ok(Math.abs(make(14, 0).sourceRaw.hunt / pure.sourceRaw.hunt - 2) < 1e-9);
});

test("PLUS의 4배 쿠폰과 VIP 부스터는 사냥해야 쓰이고, 안 쓰면 10/21에 소멸로 센다", () => {
  const real = createMainContext();
  const make = hours => {
    const x = isolated();
    Object.assign(x, { end: "2026-10-25" });
    x.plus = { enabled: true, tier: "prime", claimedLevel: 0 };
    x.crimsonHold = 999;
    Object.assign(x.routine, { huntHoursPerWeek: hours, huntBonusPct: 0 });
    return simulateMain(x, real);
  };
  const none = make(0);
  assert.equal(none.items.plusReceived.coupon4x, 10);
  assert.equal(none.items.plusReceived.booster, 40);
  assert.equal(none.items.expired.coupon4x, 10);
  assert.equal(none.items.expired.booster, 40);
  assert.ok(!none.sourceRaw.coupon4x && !none.sourceRaw.booster);
  // 주 7시간(하루 30분 2번): 10/5~10/21 17일 동안 쿠폰 10장과 부스터 40개를 모두 쓴다.
  const some = make(7);
  assert.ok(Math.abs(some.items.huntItemsUsed.coupon4x - 10) < 1e-9);
  assert.ok(Math.abs(some.items.huntItemsUsed.booster - 40) < 1e-9);
  assert.equal(some.items.expired.coupon4x, 0);
  assert.ok(some.sourceRaw.coupon4x > 0 && some.sourceRaw.booster > 0);
  // 주 30분만 사냥하면 다 못 쓴다: 쿠폰은 30분당 1장, 부스터는 30분(9,600마리)당 9600/1710개.
  const little = make(0.5);
  const sessions = 17 / 7;
  assert.ok(Math.abs(little.items.huntItemsUsed.coupon4x - sessions) < 1e-9);
  assert.ok(Math.abs(little.items.huntItemsUsed.booster - sessions * 9600 / 1710) < 1e-9);
  assert.ok(Math.abs(little.items.expired.coupon4x - (10 - sessions)) < 1e-9);
  // 무료 등급은 둘 다 받지 않는다.
  const free = (() => { const x = isolated(); x.end = "2026-10-25"; x.plus = { enabled: true, tier: "free", claimedLevel: 0 }; x.routine.huntHoursPerWeek = 7; return simulateMain(x, real); })();
  assert.equal(free.items.plusReceived.booster, 0);
  assert.equal(free.items.plusReceived.coupon4x, 0);
});

test("익스트림 몬스터파크와 에픽 던전에도 추가 경험치가 붙는다", () => {
  const real = createMainContext();
  const make = patch => {
    const x = isolated();
    Object.assign(x, { end: "2026-10-08" });
    Object.assign(x.routine, { extreme: true, epic: true, epicMult: 5, argoMonsterPark: 0, epicBonus: 0, ...patch });
    return simulateMain(x, real);
  };
  const base = make({});
  assert.ok(Math.abs(base.sourceRaw.extreme - real.weeklyRaw({ level: 288, epicMult: 5 }).extreme) < 1);
  assert.ok(Math.abs(make({ argoMonsterPark: 40 }).sourceRaw.extreme / base.sourceRaw.extreme - 1.4) < 1e-9, "커뮤니티 계산의 익스트림 0.1873% = 기본 0.1338% × 1.4");
  assert.ok(Math.abs(make({ epicBonus: 20 }).sourceRaw.epic / base.sourceRaw.epic - 1.2) < 1e-9);
  assert.ok(Math.abs(make({ argoMonsterPark: 40 }).sourceRaw.epic - base.sourceRaw.epic) < 1e-6, "몬파 추가 경험치는 에픽 던전에 안 붙는다");
});
