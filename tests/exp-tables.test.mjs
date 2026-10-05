import assert from "node:assert/strict";
import test from "node:test";
import { monsterParkExperiencePercent } from "../lib/calculator-core.mjs";
import {
  createMainContext,
  epicDungeonBaseRaw,
  huntLevelFactor,
  itemConversionPercent,
  itemConversionRawExperience,
  MOMENTUM_PLUS_FREE,
  MOMENTUM_PLUS_PREMIUM,
  MOMENTUM_PLUS_PRIME,
  momentumPlusClaimedRewards,
  momentumPlusRewardForLevel,
  momentumPlusUnlockedLevel,
  monsterParkRawForLevel,
  grandisDailyRawForLevel,
  POST_290_EFFICIENCY_RAW,
  REQUIRED_EXP,
  simulateItemInventoryConversion,
  WEEKLY_CONTENT_RAW,
} from "../lib/exp-tables.ts";
import {
  BOSS_COMMUNITY_PRESETS,
  BOSS_EXP_UNIT,
  HUNTING_FIELDS,
  MOB_BASE_EXP,
  PERSONAL_BOSS_TABLE,
  PERSONAL_COUPON_MULTIPLE,
  PERSONAL_FLAME_MULTIPLE,
  WEEKLY_BOSS_LIMIT,
} from "../lib/personal-data.mjs";
import { bossCommunityPreset, bossEntry, bossLabel, bossPreset, bossRaw, couponRawForLevel, flameModelRaw, mobBaseExp } from "../lib/main-planner.mjs";

test("몬스터파크는 선데이 보너스를 더하는 방식으로 계산한다", () => {
  const mapleRoad280 = { baseSevenRunPercent: 2.2302, runs: 7, contentBonusPercent: 0 };
  const common = { baseSevenRunPercent: 2.0272, runs: 7, contentBonusPercent: 86 };
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "none" }), 2.2302);
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "normal" }), 3.3453);
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "special" }), 8.9208);
  assert.equal(monsterParkExperiencePercent({ ...common, sundayKind: "none" }), 3.770592);
  assert.ok(Math.abs(monsterParkExperiencePercent({ ...common, sundayKind: "special" }) - 9.852192) < 1e-12);
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, runs: 2, sundayKind: "none" }), 2.2302 * 2 / 7);
});

test("285~290 정수 경험치 표와 몬파·주간 상수를 그대로 쓴다", () => {
  const cumulative = [285, 286, 287, 288, 289].reduce((sum, level) => sum + REQUIRED_EXP[level], 0n);
  assert.equal(REQUIRED_EXP[285], 99_512_176_519_276n);
  assert.equal(REQUIRED_EXP[289], 145_695_777_641_870n);
  assert.equal(cumulative, 607_531_788_867_827n);
  assert.equal(monsterParkRawForLevel(285, true) * 7, 1_092_124_992_000);
  assert.equal(monsterParkRawForLevel(290, true, true) * 7, 1_530_027_212_000);
  assert.equal(monsterParkRawForLevel(284, true), 107_204_000_000);
  assert.equal(grandisDailyRawForLevel(285, true), 129_794_096_544 + 45_635_222_880);
  assert.equal(grandisDailyRawForLevel(290, true), 129_794_096_544 + 45_635_222_880 + 89_700_000_000);
  assert.equal(POST_290_EFFICIENCY_RAW[291].monsterParkPerRun, 218_575_316_000);
  assert.equal(WEEKLY_CONTENT_RAW[285].epic * 5, 6_144_000_000_000);
  assert.equal(WEEKLY_CONTENT_RAW[290].adv1000, 1_078_497_000_000);
});

test("보유 아이템을 경험치로 환산하는 값이 메이플스카우터 대조값과 맞는다", () => {
  const rounded = value => Number(value.toFixed(2));
  assert.equal(rounded(itemConversionPercent("mech", 285)), 5.17);
  assert.equal(rounded(itemConversionPercent("blue", 285)), 2.19);
  assert.equal(rounded(itemConversionPercent("potion279", 285)), 16.74);
  assert.equal(Math.round(itemConversionRawExperience("adv", 285) * 1000), 914_168_000_000);
  assert.equal(rounded(itemConversionPercent("adv", 285, 1000)), 0.92);
  assert.equal(rounded(itemConversionPercent("mech", 280)), 9.71);
  assert.equal(rounded(itemConversionPercent("blue", 280)), 6.48);
  assert.equal(rounded(itemConversionPercent("potion279", 260)), 100);
  assert.equal(rounded(itemConversionPercent("potion279", 280)), 49.5);

  const converted = simulateItemInventoryConversion({ level: 285, exp: 1.091, inventory: { mech: 1, blue: 1, potion279: 1, sauna: 0, adv: 1000 } });
  assert.equal(converted.startLevel, 285);
  assert.ok(converted.level > 285 || converted.exp > 1.091);
  assert.equal(converted.remaining.mech + converted.remaining.blue + converted.remaining.potion279 + converted.remaining.adv, 0);

  const upperLimit = simulateItemInventoryConversion({ level: 295, exp: 0, inventory: { potion279: 1000 } });
  assert.equal(upperLimit.reachedUpperLimit, true);
  assert.equal(upperLimit.level, 296);
  assert.equal(upperLimit.used.potion279 + upperLimit.remaining.potion279, 1000);
});

test("크림슨 메카베리는 레벨 구간별 동렙몹 마릿수 비율로 환산한다", () => {
  const mech = level => itemConversionRawExperience("mech", level);
  const crimson = level => itemConversionRawExperience("crimson", level);
  // 크림슨은 전 구간 1,478,400마리, 메카베리는 280~284 950,400 · 285~289 1,267,200 · 290+ 1,372,800마리.
  assert.ok(Math.abs(crimson(282) / mech(282) - 1_478_400 / 950_400) < 1e-9);
  assert.ok(Math.abs(crimson(287) / mech(287) - 1_478_400 / 1_267_200) < 1e-9);
  assert.ok(Math.abs(crimson(292) / mech(292) - 1_478_400 / 1_372_800) < 1e-9);
});

// ── 모멘텀 패스 PLUS 표 (넥슨 공지 update-813, 2026-10-03 대조) ───────────

test("PLUS 레벨별 보상표가 공식 표와 같다", () => {
  // 경험치로 쓰이는 것만 적는다: 크림슨 입장권, 상급 EXP 교환권, VIP 사우나(1개=0.5시간), 4배 쿠폰, VIP 부스터.
  assert.deepEqual(MOMENTUM_PLUS_FREE, { 1: { crimson: 1 }, 2: { sauna: 0.5 }, 4: { adv: 100 }, 5: { sauna: 0.5 }, 7: { adv: 100 }, 8: { sauna: 0.5 }, 10: { adv: 300 } });
  assert.deepEqual(MOMENTUM_PLUS_PREMIUM, { 1: { booster: 10 }, 2: { crimson: 1 }, 3: { coupon4x: 2 }, 4: { adv: 1500 }, 5: { crimson: 2 }, 6: { booster: 10 }, 7: { adv: 1500 }, 8: { crimson: 2 }, 9: { coupon4x: 2 }, 10: { adv: 1500 } });
  assert.deepEqual(MOMENTUM_PLUS_PRIME, { 1: { coupon4x: 2 }, 2: { adv: 3000 }, 3: { crimson: 3 }, 4: { coupon4x: 2 }, 5: { adv: 3000 }, 6: { crimson: 4 }, 7: { coupon4x: 2 }, 8: { adv: 3000 }, 9: { booster: 20 }, 10: { crimson: 4 } });
  // 등급별 합계: 프리미엄 부스터 20·4배 쿠폰 4, 프라임까지 부스터 40·4배 쿠폰 10 (커뮤니티 정리의 「VIP 부스터 40개」와 같다).
  const sumOf = (tier, key) => Array.from({ length: 10 }, (_, i) => momentumPlusRewardForLevel(i + 1, tier, false)[key]).reduce((a, b) => a + b, 0);
  assert.equal(sumOf("free", "booster"), 0);
  assert.equal(sumOf("premium", "booster"), 20);
  assert.equal(sumOf("prime", "booster"), 40);
  assert.equal(sumOf("premium", "coupon4x"), 4);
  assert.equal(sumOf("prime", "coupon4x"), 10);
});

test("프리미엄 상급 EXP는 6레벨이 아니라 7레벨이다", () => {
  assert.ok(!momentumPlusRewardForLevel(6, "premium", false).adv);
  assert.equal(momentumPlusRewardForLevel(7, "premium", false).adv, 1600);
});

test("PLUS 누적 보상은 등급마다 쌓인다", () => {
  const sum = tier => momentumPlusClaimedRewards(10, tier);
  assert.deepEqual(sum("free"), { crimson: 1, adv: 500, sauna: 1.5 });
  assert.deepEqual(sum("premium"), { crimson: 6, adv: 5000, sauna: 1.5 });
  assert.deepEqual(sum("prime"), { crimson: 17, adv: 14_000, sauna: 1.5 });
  assert.equal(momentumPlusUnlockedLevel(0), 3);
  assert.equal(momentumPlusUnlockedLevel(1), 6);
  assert.equal(momentumPlusUnlockedLevel(2), 10);
});

// ── 하루1소재 표 (퍼스널 버닝) ──────────────────────────────────

test("하루1소재 표 스냅샷: 표가 바뀌면 이 테스트가 먼저 알린다", async () => {
  const { createHash } = await import("node:crypto");
  const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  // 2026-10-04에 하루1소재 번들 청크(3pbsp2-ukxvfz.js)에서 읽은 값과 코덱스가 전수 대조한 상태의 해시다.
  assert.equal(hash(MOB_BASE_EXP), "d6c17daf3d9be86de0ed4eb43a391b503e939ed4ff433a8cc49002624bd37c66");
  assert.equal(hash(PERSONAL_BOSS_TABLE), "d82585afffe3898e57fa620c27d82c539af42aa6c3491a818e1c005f091d1ffa");
  assert.equal(hash(HUNTING_FIELDS), "13839d16f21a763ae5bbad9b34a4d1632c65d3906d8b4bf182da781f2d2e7296");
  // 코드와 무관하게 사이트에서 손으로 옮긴 값 몇 개
  assert.equal(MOB_BASE_EXP[260], 1_725_461);
  assert.equal(MOB_BASE_EXP[299], 5_912_186);
  assert.equal(PERSONAL_BOSS_TABLE.find(entry => entry.id === "lotus-hard").unitExp, 3_462_860);
  assert.equal(PERSONAL_BOSS_TABLE.find(entry => entry.id === "jupiter-hard").unitExp, 389_882_120);
  assert.equal(PERSONAL_BOSS_TABLE.find(entry => entry.id === "kaling-extreme").unitExp, 416_157_790);
  const robot = HUNTING_FIELDS.find(field => field.monster === "순찰형 경비 로봇");
  assert.deepEqual([robot.region, robot.level, MOB_BASE_EXP[robot.level]], ["기어드락", 295, 5_643_220]);
});

test("본섭 9/27 보스 미션 화면 5개 값이 표와 정확히 같다", () => {
  const screen = { "seren-normal": 112_885_300_000, "kalos-easy": 160_875_800_000, "adversary-easy": 176_423_000_000, "kaling-easy": 216_307_800_000, "seren-hard": 233_302_300_000 };
  Object.entries(screen).forEach(([id, raw]) => assert.equal(bossRaw(id, 1), raw, id));
});

test("몬스터 기본 경험치 표는 260~299를 모두 갖고 레벨이 오를수록 늘어난다", () => {
  for (let level = 260; level <= 299; level += 1) {
    assert.ok(MOB_BASE_EXP[level] > 0, `${level}레벨 값 없음`);
    if (level > 260) assert.ok(MOB_BASE_EXP[level] > MOB_BASE_EXP[level - 1], `${level - 1}→${level}`);
  }
  assert.equal(MOB_BASE_EXP[285], 4_062_965);
  assert.equal(mobBaseExp(100), MOB_BASE_EXP[260], "범위 밖은 끝값으로 자른다");
  assert.equal(mobBaseExp(500), MOB_BASE_EXP[299]);
});

test("플레임 경험치가 본섭 9/23 로그 3건과 정확히 일치한다", () => {
  assert.equal(PERSONAL_FLAME_MULTIPLE, 72);
  assert.equal(flameModelRaw(273), 183_322_728);
  assert.equal(flameModelRaw(275), 209_017_728);
  assert.equal(flameModelRaw(276), 211_652_352);
});

test("교환권 경험치가 하루1소재 교환권 표와 일치한다", () => {
  assert.equal(PERSONAL_COUPON_MULTIPLE, 480);
  // 하루1소재 교환권 표에서 옮긴 값 (2026-10-04).
  const haru = { 260: 828_221_280, 280: 1_649_292_960, 285: 1_950_223_200, 287: 1_998_600_480, 290: 2_300_792_640, 295: 2_708_745_600, 299: 2_837_849_280 };
  Object.entries(haru).forEach(([level, raw]) => assert.equal(couponRawForLevel(Number(level)), raw, `${level}레벨`));
});

test("사냥터 표는 몬스터 기본 경험치 표와 같은 값을 쓴다", () => {
  assert.equal(HUNTING_FIELDS.length, 63);
  const maps = HUNTING_FIELDS.reduce((sum, field) => sum + field.maps.length, 0);
  assert.equal(maps, 181);
  HUNTING_FIELDS.forEach(field => { assert.ok(field.level >= 260 && field.level <= 299); assert.ok(field.maps.length > 0); });
  assert.deepEqual([...new Set(HUNTING_FIELDS.map(field => field.region))], ["세르니움", "불타는 세르니움", "호텔 아르크스", "오디움", "도원경", "아르테리아", "카르시온", "탈라하트", "기어드락"]);
});

test("퍼스널 보스 표는 공식 지정 35개와 같다", () => {
  const official = [
    "데미안 하드", "스우 하드", "루시드 하드", "가디언 엔젤 슬라임 카오스", "더스크 카오스", "윌 하드", "듄켈 하드", "진 힐라 하드",
    "선택받은 세렌 노멀", "감시자 칼로스 이지", "최초의 대적자 이지", "카링 이지", "선택받은 세렌 하드", "벨로나 이지",
    "감시자 칼로스 노멀", "최초의 대적자 노멀", "스우 익스트림", "찬란한 흉성 노멀", "카링 노멀", "벨로나 노멀", "림보 노멀",
    "감시자 칼로스 카오스", "발드릭스 노멀", "최초의 대적자 하드", "카링 하드", "유피테르 노멀", "선택받은 세렌 익스트림",
    "림보 하드", "찬란한 흉성 하드", "벨로나 하드", "발드릭스 하드", "감시자 칼로스 익스트림", "최초의 대적자 익스트림",
    "유피테르 하드", "카링 익스트림",
  ];
  assert.equal(PERSONAL_BOSS_TABLE.length, 35);
  assert.deepEqual(PERSONAL_BOSS_TABLE.map(entry => `${entry.boss} ${entry.difficulty}`).sort(), [...official].sort());
  assert.equal(new Set(PERSONAL_BOSS_TABLE.map(entry => entry.id)).size, 35, "id는 유일해야 한다");
  assert.equal(BOSS_EXP_UNIT, 10_000);
  assert.equal(WEEKLY_BOSS_LIMIT, 12);
});

test("보스 미션 경험치는 표 값 × 10,000 ÷ 파티원 수이고 최대 파티를 넘지 않는다", () => {
  assert.equal(bossRaw("lotus-hard", 1), 34_628_600_000);
  assert.equal(bossRaw("jupiter-hard", 1), 3_898_821_200_000);
  assert.equal(bossRaw("jupiter-hard", 3), Math.floor(3_898_821_200_000 / 3));
  assert.equal(bossRaw("jupiter-hard", 99), bossRaw("jupiter-hard", 3), "최대 파티원 3인으로 자른다");
  assert.equal(bossRaw("lotus-extreme", 5), bossRaw("lotus-extreme", 2), "익스트림 스우는 2인까지");
  assert.equal(bossRaw("kaling-extreme", 1), 4_161_577_900_000);
  assert.equal(bossRaw("없는-보스", 1), 0);
  assert.equal(bossLabel("kaling-extreme"), "카링 익스트림");
  assert.equal(bossEntry("kaling-extreme").maxParty, 6);
});

test("보스 구간 프리셋은 상한 이하에서 보스마다 가장 센 난이도 하나를 경험치 순으로 12개까지 고른다", () => {
  const cutoff = "bellona-hard";
  const preset = bossPreset({ cutoffId: cutoff });
  const limit = bossEntry(cutoff).unitExp;
  assert.equal(preset.length, 12);
  preset.forEach(boss => assert.ok(bossEntry(boss.id).unitExp <= limit, `${boss.id}가 상한을 넘는다`));
  assert.equal(new Set(preset.map(boss => bossEntry(boss.id).boss)).size, 12, "같은 보스를 두 난이도로 담으면 안 된다");
  for (let i = 1; i < preset.length; i += 1) assert.ok(bossEntry(preset[i - 1].id).unitExp >= bossEntry(preset[i].id).unitExp, "경험치 내림차순");
  assert.equal(preset[0].id, cutoff, "상한 보스가 가장 위에 온다");
  assert.ok(preset.every(boss => boss.party === 1 && boss.doneThisWeek === false));
  const max = bossPreset({ cutoffId: cutoff, partyMode: "max" });
  max.forEach(boss => assert.equal(boss.party, bossEntry(boss.id).maxParty));
  // 상한이 낮으면 담을 보스가 12개보다 적을 수 있다.
  const low = bossPreset({ cutoffId: "damien-hard" });
  assert.deepEqual(low.map(boss => boss.id), ["damien-hard"]);
  assert.deepEqual(bossPreset({ cutoffId: "없음" }), []);
  // 가장 높은 상한이면 보스 17종이 12개로 잘린다.
  const top = bossPreset({ cutoffId: "kaling-extreme" });
  assert.equal(top.length, 12);
  assert.equal(top[0].id, "kaling-extreme");
});

test("커뮤니티 보스 구성은 퍼스널 대상 35개 안에서 보스당 난이도 하나이고 12개를 넘지 않는다", () => {
  assert.deepEqual(BOSS_COMMUNITY_PRESETS.map(preset => [preset.label, preset.ids.length]), [["검밑솔", 8], ["최소 구성", 10], ["노세이칼", 10], ["하세이칼", 10], ["하세이적자", 11], ["노칼이카", 12]]);
  BOSS_COMMUNITY_PRESETS.forEach(preset => {
    preset.ids.forEach(id => assert.ok(bossEntry(id), `${preset.label}: ${id} 가 표에 없다`));
    assert.equal(new Set(preset.ids.map(id => bossEntry(id).boss)).size, preset.ids.length, `${preset.label}: 같은 보스가 두 난이도`);
    assert.ok(preset.ids.length <= WEEKLY_BOSS_LIMIT);
    assert.ok(preset.ids.includes("damien-hard") && preset.ids.includes("gas-chaos") && preset.ids.includes("dusk-chaos"));
  });
  const byId = Object.fromEntries(BOSS_COMMUNITY_PRESETS.map(preset => [preset.id, preset.ids]));
  assert.ok(byId.noseical.includes("seren-normal") && byId.noseical.includes("kalos-easy"));
  assert.ok(byId.haseical.includes("seren-hard") && !byId.haseical.includes("seren-normal"));
  assert.ok(byId.nokalika.includes("kalos-normal") && !byId.nokalika.includes("kalos-easy"));
  const solo = bossCommunityPreset("noseical");
  assert.equal(solo.length, 10);
  assert.ok(solo.every(boss => boss.party === 1 && boss.doneThisWeek === false));
  bossCommunityPreset("noseical", "max").forEach(boss => assert.equal(boss.party, bossEntry(boss.id).maxParty));
  assert.deepEqual(bossCommunityPreset("없음"), []);
  // 구성이 커질수록 주간 경험치는 늘어난다.
  const total = id => bossCommunityPreset(id).reduce((sum, boss) => sum + bossRaw(boss.id, boss.party), 0);
  assert.ok(total("geommitsol") < total("noseical") && total("noseical") < total("haseical"));
  assert.ok(total("haseical") < total("haseijeokja") && total("haseijeokja") < total("nokalika"));
});

// ── 엔진용 경험치 표 어댑터 ───────────────────────────────────────

test("어댑터가 필요 경험치와 일과 값을 표 그대로 돌려준다", () => {
  const ctx = createMainContext();
  assert.equal(ctx.levelCap, 296);
  for (let level = 280; level <= 295; level += 1) assert.equal(ctx.reqRaw(level), Number(REQUIRED_EXP[level]));
  const routine = ctx.routineRaw({ level: 287, runs: 7, sundayKind: "none", grandis: true });
  assert.equal(routine.monsterPark, monsterParkRawForLevel(287, true, true) * 7);
  assert.equal(routine.grandis, grandisDailyRawForLevel(287, true));
  assert.equal(ctx.routineRaw({ level: 287, runs: 7, sundayKind: "none", grandis: false }).grandis, 0);
  assert.equal(ctx.routineRaw({ level: 287, runs: 7, sundayKind: "normal", grandis: false }).monsterPark, routine.monsterPark * 1.5);
  assert.equal(ctx.routineRaw({ level: 287, runs: 7, sundayKind: "special", grandis: false }).monsterPark, routine.monsterPark * 4);
  const weekly = ctx.weeklyRaw({ level: 287, epicMult: 5 });
  assert.equal(weekly.extreme, 1_061_756_505_000);
  assert.equal(weekly.epic, 1_259_200_000_000 * 5);
  assert.equal(ctx.weeklyRaw({ level: 292, epicMult: 1 }).extreme, POST_290_EFFICIENCY_RAW[292].extreme);
  assert.equal(ctx.plusReward(7, "premium").adv, 1600);
  assert.equal(ctx.itemRaw("adv", 285) * 1000, itemConversionRawExperience("adv", 285) * 1000);
});

test("에픽 던전: 285~289는 악몽선경(×2), 290부터는 아우룸 레기스(×3)이고 5배는 기본 + 400% 추가다", () => {
  const real = createMainContext();
  const weekly = (level, epicMult) => real.weeklyRaw({ level, epicMult }).epic;
  // 하루1소재 에픽던전 표(1배 환산)와 챌섭 계산기 값이 285~289에서 같다.
  assert.equal(epicDungeonBaseRaw(285), 1_228_800_000_000);
  assert.equal(epicDungeonBaseRaw(288), 1_275_400_000_000);
  assert.equal(weekly(288, 5), 1_275_400_000_000 * 5);
  // 290에서 던전이 바뀌어 한 번에 1.5배로 뛴다: 289→290 표 증가율(1.1237)보다 훨씬 크다.
  assert.ok(Math.abs(weekly(290, 1) / weekly(289, 1) - (0.7248 * 3) / (0.645 * 2)) < 1e-9);
  assert.ok(weekly(290, 1) / weekly(289, 1) > 1.68);
  // 하루1소재 표 stage1 = 5 × stage0 (기본 + 4배 추가), stage2 = 9 × stage0.
  assert.equal(weekly(293, 5), epicDungeonBaseRaw(293) * 5);
  assert.ok(Math.abs(weekly(295, 5) - 2.5599e12 * 5) < 1e8, "295는 아우룸 ×3, 이전 값(294와 같은 1.519조)이 아니다");
  assert.ok(weekly(295, 5) > weekly(294, 5));
  // 커뮤니티 296레벨 계산(에픽던전 4배 1.353%)과 295레벨 환산이 같은 자릿수다.
  const pct = weekly(295, 5) / real.reqRaw(295) * 100;
  assert.ok(pct > 1.4 && pct < 1.6, `295레벨 에픽 5배 ${pct.toFixed(3)}%`);
});

test("295레벨부터 몬스터파크는 기어드락 값을 쓴다", () => {
  const real = createMainContext();
  const run = level => real.routineRaw({ level, runs: 1, sundayKind: "none", grandis: false }).monsterPark;
  assert.equal(run(289), 156_017_856_000);
  assert.equal(run(290), 218_575_316_000);
  assert.equal(run(294), 218_575_316_000);
  assert.equal(run(295), 316_934_208_200);
});

test("몬스터파크 추가 경험치는 썬데이 보너스와 더해진다 (하루1소재 식)", () => {
  const real = createMainContext();
  const run = (sundayKind, bonus) => real.routineRaw({ level: 288, runs: 1, sundayKind, grandis: false, monsterParkBonusPct: bonus }).monsterPark;
  const base = 156_017_856_000;
  assert.equal(run("none", 0), base);
  assert.ok(Math.abs(run("none", 50) - base * 1.5) < 1);
  assert.ok(Math.abs(run("normal", 0) - base * 1.5) < 1);
  assert.ok(Math.abs(run("normal", 50) - base * 2) < 1, "썬데이 +50%와 가호 +50%는 곱이 아니라 합(2배)");
  assert.ok(Math.abs(run("special", 40) - base * 4.4) < 1);
  // 커뮤니티 296레벨 계산(평일 2판 × 6일 + 썬데이 7판, 가호 +40%) = 30.1판 분량과 같은 식이다.
  assert.ok(Math.abs((12 * 1.4 + 7 * 1.9) - 30.1) < 1e-9);
});

test("사냥 30분 순수 경험치와 VIP 부스터가 하루1소재 식과 같다", () => {
  const real = createMainContext();
  // 288레벨이 288레벨 몬스터를 잡으면 레벨 차 보정 1.2: 240 × 40 × 4,217,526 × 1.2
  assert.equal(MOB_BASE_EXP[288], 4_217_526);
  assert.ok(Math.abs(real.huntRaw({ level: 288, fieldLevel: 288 }) - 240 * 40 * 4_217_526 * 1.2) < 1);
  assert.equal(real.boosterRaw(288), 10 * 1710 * 4_217_526);
  assert.equal(real.huntKillsPer30Min, 9600);
  // 레벨 차 보정 구간
  const cases = [[0, 1.2], [-1, 1.2], [2, 1.1], [5, 1.05], [10, 1], [11, 0.99], [21, 0.89], [40, 0.7], [-2, 1.1], [-5, 1.05], [-10, 1], [-20, 0.9], [-21, 0.7], [-35, 0.14], [-39, 0.1], [-40, 0]];
  cases.forEach(([gap, factor]) => assert.ok(Math.abs(huntLevelFactor(gap) - factor) < 1e-12, `레벨 차 ${gap}`));
  assert.equal(real.huntRaw({ level: 288, fieldLevel: 999 }), 0, "표에 없는 몬스터 레벨은 0");
});
