import assert from "node:assert/strict";
import test from "node:test";
import efficiencyFixture from "./exp-efficiency-fixture.json" with { type: "json" };
import haruCrosscheck from "../docs/research/haru1sojae-crosscheck-2026-10-25.json" with { type: "json" };
import dopingSource from '../docs/research/doping-breakeven-source-2026-10-25.json' with {type:'json'};
import { compareExpEfficiency, efficiencyDefaults } from "../lib/exp-efficiency.mjs";
import { defaultMainInput } from "../lib/main-planner.mjs";
import { epicDungeonForLevel } from '../lib/epic-dungeon.mjs';
import { experienceIcon } from '../lib/experience-source-icons.mjs';

test('280~299 에픽 표시 이름·아이콘은 엔진과 같은 290 경계이며 사냥터 레벨과 무관하다',()=>{
  const planner=defaultMainInput('2026-10-27');
  for(let level=280;level<=299;level++){
    const name=level>=290?'아우룸 레기스':'악몽선경',id=level>=290?'aurum':'nightmare';
    const dungeon=epicDungeonForLevel(level);
    assert.equal(dungeon.name,name);assert.equal(dungeon.icon,`/experience-icons/epic-${id}.png`);
    assert.equal(experienceIcon('epic',level),dungeon.icon);
    const result=compareExpEfficiency({...efficiencyDefaults(planner),level,fieldLevel:level>=290?280:299},planner);
    for(const [product,stage]of [['epic1','1단계'],['epic2','1→2단계']]){
      assert.equal(result.rows.find(row=>row.id===product).label,`에픽 던전 ${stage} (${name})`);
      for(const magnifier of result.magnifiers)assert.equal(magnifier.thresholds.find(ref=>ref.id===product).label,`에픽 던전 ${stage} (${name})`);
    }
  }
});
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
  BOSS_CUT_ORDER,
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

test("10/25 공개 청크 정수와 전 레벨 아이템·몬파·최선 던전을 대조한다", () => {
  const { tables } = haruCrosscheck;
  const ctx = createMainContext();
  for (let level = 260; level <= 299; level += 1) {
    assert.equal(MOB_BASE_EXP[level], tables.n.value[level]);
    assert.equal(ctx.reqRaw(level), tables.eo.value[level].required, `${level} 정본 필요 EXP`);
    for (const [type, key] of [["sauna", "l"], ["adv", "c"], ["blue", "eQ"]]) {
      assert.equal(ctx.itemRaw(type, level), tables[key].value[level], `${level} ${type}`);
    }
    assert.equal(couponRawForLevel(level), tables.o.value[level]);
    const zone = tables.Z.value[Math.floor((level - 260) / 5)].name;
    for (const [sundayKind, sundayBonus] of [["none", 0], ["normal", 0.5], ["special", 3]]) {
      const result = ctx.routineRaw({ level, runs: 7, sundayKind, grandis: false, monsterParkBonusPct: 50 });
      assert.equal(result.monsterPark, tables.d.value[zone] * 7 * (1 + sundayBonus + 0.5));
    }
    const dungeon = level >= 290 ? "b" : level >= 280 ? "u" : level >= 270 ? "p" : "h";
    for (const [stage, epicMult] of [[0, 1], [1, 5], [2, 9]]) {
      assert.equal(ctx.weeklyRaw({ level, epicMult }).epic, tables[dungeon].value[level][`stage${stage}`]);
    }
    if (level >= 280) {
      assert.equal(ctx.itemRaw("mech", level), tables.e_.value[level]);
      assert.equal(ctx.itemRaw("crimson", level), tables.i.value[level]);
    }
    if (WEEKLY_CONTENT_RAW[level]) {
      assert.equal(WEEKLY_CONTENT_RAW[level].sauna, tables.l.value[level]);
      assert.equal(WEEKLY_CONTENT_RAW[level].epic, tables[dungeon].value[level].stage0);
    }
    if (POST_290_EFFICIENCY_RAW[level]) {
      assert.equal(POST_290_EFFICIENCY_RAW[level].epic, tables[dungeon].value[level].stage0);
      assert.equal(POST_290_EFFICIENCY_RAW[level].monsterParkPerRun, tables.d.value[zone]);
    }
  }
});

test("280 일과는 반올림된 퍼센트 역산을 제거하고 보유 아이템은 레벨 경계에서 새 정수를 쓴다", () => {
  const ctx = createMainContext();
  assert.equal(ctx.routineRaw({ level: 280, runs: 1, sundayKind: "none", grandis: false }).monsterPark, 107_204_032_000);
  assert.equal(ctx.weeklyRaw({ level: 280, epicMult: 5 }).epic, 5_196_000_000_000);
  const result = simulateItemInventoryConversion({ level: 269, exp: 99.999, inventory: { adv: 2 } });
  assert.equal(result.level, 270);
  assert.equal(result.totalRawExperience, 489_212_000 + 550_174_000);
  assert.equal(result.used.adv, 2);
});

test("사냥30분은 하루 정본의240젠·40마리·몬스터기본·레벨차·추경과 전 레벨 일치한다", () => {
  const ctx=createMainContext(),table=haruCrosscheck.tables.n.value;
  for(let level=280;level<=299;level++)for(let field=Math.max(260,level-5);field<=Math.min(299,level+5);field++)for(const bonus of [0,300]){
    const factor=haruCrosscheck.rows.find(row=>row.group==='레벨 차 보정'&&row.name===`캐릭터−몬스터 ${level-field}`).haru;
    const expected=240*40*table[field]*factor*(1+bonus/100);
    assert.equal(ctx.huntRaw({level,fieldLevel:field})*(1+bonus/100),expected);
  }
});

test("269용과279용 비약은 범위 밖에서 마지막 레벨 필요 경험치의 정확한 정수를 준다", () => {
  assert.equal(itemConversionRawExperience("potion269", 269), 2_438_047_518_853);
  assert.equal(itemConversionRawExperience("potion269", 270), 2_438_047_518_853);
  assert.equal(itemConversionRawExperience("potion269", 286), 2_438_047_518_853);
  assert.equal(itemConversionRawExperience("potion279", 279), 16_657_228_589_191);
  assert.equal(itemConversionRawExperience("potion279", 288), 16_657_228_589_191);
  assert.equal(Number(itemConversionPercent("potion269", 286).toFixed(3)), 2.227);
  assert.equal(Number(itemConversionPercent("potion279", 288).toFixed(3)), 12.576);
  const r = simulateItemInventoryConversion({ level: 288, exp: 45, inventory: { potion269: 1, potion279: 1 } });
  assert.equal(r.totalRawExperience, 19_095_276_108_044);
  assert.equal(Number(r.exp.toFixed(6)), 59.416893);
  assert.equal(r.remaining.potion269 + r.remaining.potion279, 0);
});

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
  assert.equal(monsterParkRawForLevel(284, true), 107_204_032_000);
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
  assert.equal(upperLimit.level, 300);
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
  assert.equal(hash(PERSONAL_BOSS_TABLE.filter(entry => !entry.availableFrom)), "d82585afffe3898e57fa620c27d82c539af42aa6c3491a818e1c005f091d1ffa");
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

test("퍼스널 보스 표는 10/22 추가를 포함한 37개와 같다", () => {
  const official = [
    "데미안 하드", "스우 하드", "루시드 하드", "가디언 엔젤 슬라임 카오스", "더스크 카오스", "윌 하드", "듄켈 하드", "진 힐라 하드",
    "선택받은 세렌 노멀", "감시자 칼로스 이지", "최초의 대적자 이지", "카링 이지", "선택받은 세렌 하드", "벨로나 이지",
    "감시자 칼로스 노멀", "최초의 대적자 노멀", "스우 익스트림", "찬란한 흉성 노멀", "카링 노멀", "벨로나 노멀", "림보 노멀",
    "감시자 칼로스 카오스", "발드릭스 노멀", "최초의 대적자 하드", "카링 하드", "유피테르 노멀", "선택받은 세렌 익스트림",
    "림보 하드", "찬란한 흉성 하드", "벨로나 하드", "발드릭스 하드", "감시자 칼로스 익스트림", "최초의 대적자 익스트림",
    "유피테르 하드", "카링 익스트림", "림보 익스트림", "발드릭스 익스트림",
  ];
  assert.equal(PERSONAL_BOSS_TABLE.length, 37);
  assert.deepEqual(PERSONAL_BOSS_TABLE.map(entry => `${entry.boss} ${entry.difficulty}`).sort(), [...official].sort());
  assert.equal(new Set(PERSONAL_BOSS_TABLE.map(entry => entry.id)).size, 37, "id는 유일해야 한다");
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

test("보스 구간은 공통 목록 순서 이하에서 보스마다 한 난이도를 경험치 순으로 12개까지 고른다", () => {
  const cutoff = "bellona-hard";
  const preset = bossPreset({ cutoffId: cutoff });
  const limit = BOSS_CUT_ORDER.indexOf(cutoff);
  assert.equal(preset.length, 12);
  preset.forEach(boss => assert.ok(BOSS_CUT_ORDER.indexOf(boss.id) <= limit, `${boss.id}가 선택 범위를 넘는다`));
  assert.equal(new Set(preset.map(boss => bossEntry(boss.id).boss)).size, 12, "같은 보스를 두 난이도로 담으면 안 된다");
  for (let i = 1; i < preset.length; i += 1) assert.ok(bossEntry(preset[i - 1].id).unitExp >= bossEntry(preset[i].id).unitExp, "경험치 내림차순");
  assert.equal(preset[0].id, cutoff, "상한 보스가 가장 위에 온다");
  assert.ok(preset.every(boss => boss.party === 1 && boss.doneThisWeek === false));
  const max = bossPreset({ cutoffId: cutoff, partyMode: "max" });
  max.forEach(boss => assert.equal(boss.party, bossEntry(boss.id).maxParty));
  // 상한이 낮으면 담을 보스가 12개보다 적을 수 있다.
  const low = bossPreset({ cutoffId: "damien-hard" });
  assert.deepEqual(low.map(boss => boss.id), ["lotus-hard", "damien-hard"], "환산 목록은 하드 스우 → 하드 데미안이며 경험치순과 다르다");
  assert.deepEqual(bossPreset({ cutoffId: "없음" }), []);
  // 가장 높은 상한이면 보스 17종이 12개로 잘린다.
  const top = bossPreset({ cutoffId: "kaling-extreme" });
  assert.equal(top.length, 12);
  assert.equal(top[0].id, "kaling-extreme");
});

test("네 보스 묶음은 모두 여기까지 방식이며 보스당 하나와 12개 제한을 지킨다", () => {
  assert.deepEqual(BOSS_COMMUNITY_PRESETS.map(p => [p.label,p.cutoffId,p.ids.length]), [["검밑솔","hilla-hard",8],["하세이카","kaling-easy",12],["노칼·노적자","adversary-normal",12],["노흉·익스우","star-normal",12]]);
  for (const p of BOSS_COMMUNITY_PRESETS) {
    for (const mode of ["solo","max"]) {
      const picked=bossCommunityPreset(p.id,mode);
      assert.equal(new Set(picked.map(b => bossEntry(b.id).boss)).size,picked.length);
      assert.ok(picked.length<=12);
      assert.ok(picked.every(b => b.party === (mode==="solo" ? 1 : bossEntry(b.id).maxParty)));
    }
  }
  assert.deepEqual(bossCommunityPreset("없음"),[]);
});

// ── 엔진용 경험치 표 어댑터 ───────────────────────────────────────

test("어댑터가 필요 경험치와 일과 값을 표 그대로 돌려준다", () => {
  const ctx = createMainContext();
  assert.equal(ctx.levelCap, 300);
  for (let level = 280; level <= 299; level += 1) assert.equal(ctx.reqRaw(level), Number(REQUIRED_EXP[level]));
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
  assert.equal(real.boosterRaw(288), 8_013_299_400);
  assert.equal(real.huntKillsPer30Min, 9600);
  // 레벨 차 보정 구간
  const cases = [[0, 1.2], [-1, 1.2], [2, 1.1], [5, 1.05], [10, 1], [11, 0.99], [21, 0.89], [40, 0.7], [-2, 1.1], [-5, 1.05], [-10, 1], [-20, 0.9], [-21, 0.7], [-35, 0.14], [-39, 0.1], [-40, 0]];
  cases.forEach(([gap, factor]) => assert.ok(Math.abs(huntLevelFactor(gap) - factor) < 1e-12, `레벨 차 ${gap}`));
  assert.equal(real.huntRaw({ level: 288, fieldLevel: 999 }), 0, "표에 없는 몬스터 레벨은 0");
});

test("296~299 원본 정수 표: 필요 경험치·농장·사우나·상급 EXP·아우룸 레기스", () => {
  // 2026-10-10 공개 청크에서 직접 옮긴 값. 필요 경험치는 메이플 AI, 나머지는 하루1소재.
  const rows = [
    [296, 957_443_445_750_765n, 520_929_657_600, 7_841_362_214_400, 8_444_543_923_200, 2_591_100_000_000],
    [297, 1_053_187_790_325_840n, 527_234_496_000, 7_936_266_624_000, 8_546_748_672_000, 2_622_300_000_000],
    [298, 1_158_506_569_358_420n, 532_849_680_000, 8_020_789_920_000, 8_637_773_760_000, 2_650_500_000_000],
    [299, 1_737_759_854_037_630n, 539_191_363_200, 8_116_248_940_800, 8_740_575_782_400, 2_682_000_000_000],
  ];
  const real = createMainContext();
  for (const [level, required, sauna, mech, crimson, epic] of rows) {
    assert.equal(REQUIRED_EXP[level], required);
    assert.equal(itemConversionRawExperience("sauna", level), sauna);
    assert.equal(itemConversionRawExperience("mech", level), mech);
    assert.equal(itemConversionRawExperience("crimson", level), crimson);
    assert.equal(itemConversionRawExperience("blue", level), 2_180_965_564_800);
    assert.equal(itemConversionRawExperience("adv", level), 1_078_497_000);
    assert.equal(itemConversionRawExperience("potion269", level), 2_438_047_518_853);
    assert.equal(itemConversionRawExperience("potion279", level), 16_657_228_589_191);
    assert.equal(real.weeklyRaw({ level, epicMult: 1 }).epic, epic);
    assert.equal(monsterParkRawForLevel(level), 316_934_208_200);
    assert.equal(grandisDailyRawForLevel(level), 370_429_319_424);
  }
  assert.equal(REQUIRED_EXP[299], REQUIRED_EXP[298] * 3n / 2n);
});

test("메이플로드 296~299 응답의 %와 콘텐츠·아이템 값이 소수 넷째 자리까지 같다", () => {
  const real = createMainContext();
  const api = [
    [296, 0.1338, 0.2706, 0.0387, 0.0331, 0.0544, 0.1126, 0.2278, 0.819, 0.882, 0.2546, 1.7398],
    [297, 0.1216, 0.2490, 0.0352, 0.0301, 0.0501, 0.1024, 0.2071, 0.7535, 0.8115, 0.2315, 1.5816],
    [298, 0.1106, 0.2288, 0.0320, 0.0274, 0.0460, 0.0931, 0.1883, 0.6923, 0.7456, 0.2104, 1.4378],
    [299, 0.0737, 0.1543, 0.0213, 0.0182, 0.0310, 0.0621, 0.1255, 0.4671, 0.5030, 0.1403, 0.9585],
  ];
  for (const [level, ...expected] of api) {
    const weekly = real.weeklyRaw({ level, epicMult: 1 });
    const routine = real.routineRaw({ level, runs: 1, sundayKind: "none", grandis: true });
    const raw = [weekly.extreme, weekly.epic, routine.grandis, routine.monsterPark,
      itemConversionRawExperience("sauna", level), itemConversionRawExperience("adv", level) * 1000,
      ...["blue", "mech", "crimson", "potion269", "potion279"].map(type => itemConversionRawExperience(type, level))];
    raw.forEach((value, index) => assert.equal(Number((value / real.reqRaw(level) * 100).toFixed(4)), expected[index], `${level}:${index}`));
  }
});

test("299 사냥은 299 몬스터를 쓰고 아이템 환산은 300에서 멈춘다", () => {
  const real = createMainContext();
  assert.equal(real.huntRaw({ level: 299, fieldLevel: 299 }), 68_108_382_720);
  assert.equal(real.boosterRaw(299), 11_233_153_400);
  assert.equal(flameModelRaw(299), 425_677_392);
  assert.equal(couponRawForLevel(299), 2_837_849_280);
  const r = simulateItemInventoryConversion({ level: 299, exp: 99.999, inventory: { adv: 1000 } });
  assert.equal(r.level, 300); assert.equal(r.exp, 0); assert.ok(r.reachedUpperLimit);
  assert.equal(r.used.adv, 17); assert.equal(r.remaining.adv, 983);
});


test("퍼센트 역산 없이 원본 정수를 쓴다: 280·286·288·293 아이템", () => {
  // 하루1소재 i/eY/eG/l/c에서 손으로 옮긴 정수. 계산 함수/배수를 기대값으로 가져오지 않는다.
  for (const [level, mech, crimson, blue, sauna, adv] of [
    [280, 3_265_600_060_800, 5_079_822_316_800, 2_180_965_564_800, 313_365_646_080, 773_107_000],
    [286, 5_208_577_228_800, 6_076_673_433_600, 2_180_965_564_800, 374_859_704_880, 924_819_000],
    [288, 5_344_448_947_200, 6_235_190_438_400, 2_180_965_564_800, 384_638_351_040, 948_944_000],
    [293, 6_821_411_625_600, 7_346_135_596_800, 2_180_965_564_800, 453_170_678_400, 1_078_497_000],
  ]) {
    assert.equal(itemConversionRawExperience("mech", level), mech);
    assert.equal(itemConversionRawExperience("crimson", level), crimson);
    assert.equal(itemConversionRawExperience("blue", level), blue);
    assert.equal(itemConversionRawExperience("sauna", level), sauna);
    assert.equal(itemConversionRawExperience("adv", level), adv);
  }
});

test("아이템 환산의 경험치 합은 300 이후 버려지는 양을 포함하지 않는다", () => {
  const r = simulateItemInventoryConversion({ level: 299, exp: 99.999, inventory: { adv: 1000 } });
  assert.equal(r.level, 300);
  assert.ok(Math.abs(r.totalRawExperience - 17_377_598_540.25) < 1);
  assert.equal(r.used.adv, 17);
  assert.equal(r.remaining.adv, 983);
});

for (const level of [285, 290, 295]) test(`상품 효율 Lv.${level}: 팀장 스크립트의 패스·에픽·돋보기·충전·교환권 숫자`, () => {
  const planner = defaultMainInput("2026-10-25");
  planner.plus.tier = "free";
  const result = compareExpEfficiency({ ...efficiencyDefaults(planner), maplePoints: 2300, level, fieldLevel: level, ordinaryPrice: 1000000, detectivePrice: 50000000 }, planner);
  assert.deepEqual(result.errors, []);
  const expected = efficiencyFixture[level];
  for (const row of result.rows) {
    if(row.id==='vipBooster'){assert.equal(row.available,false);assert.equal(row.costMeso,null);assert.equal(row.rawExp,result.rows.find(r=>r.id==='ordinary').rawExp);continue;}
    assert.equal(row.available, true);
    for (const key of ["rawExp", "costMeso", "percent", "mesoPerMob", "relativeEpic1"]) {
      assert.ok(Math.abs(row[key] - expected[row.id][key]) <= Math.max(1e-8, Math.abs(expected[row.id][key]) * 1e-12), `${row.id}.${key}: ${row[key]} != ${expected[row.id][key]}`);
    }
  }
  assert.equal(result.rows.length, 10);
  for (const row of result.magnifiers) row.thresholds.forEach((ref, i) => {
    assert.ok(Math.abs(ref.price - expected.thresholds[row.id][i]) < 0.00001);
  });
  const bought=result.rows.filter(row=>row.available);
  assert.deepEqual(bought.map(row => row.mesoPerMob), bought.map(row => row.mesoPerMob).sort((a, b) => a - b));
});

test("상품 비교는 9월 구매로 살 수 없는 줄도 보여 주고 무료 보상을 유료 값에 넣지 않는다", () => {
  const p = defaultMainInput("2026-10-25"), v = { ...efficiencyDefaults(p), level: 285, fieldLevel: 285 };
  for (const [enabled, tier, expected] of [[true, "free", [true, true, true]], [false, "prime", [true, true, true]], [true, "premium", [false, true, false]], [true, "prime", [false, false, false]]]) {
    Object.assign(p.plus, { enabled, tier });
    const r = compareExpEfficiency(v, p);
    assert.deepEqual(["premium", "prime", "both"].map(id => r.rows.find(row => row.id === id).available), expected);
    assert.equal(r.rows.find(row => row.id === "prime").rawExp, 75761141118400);
    assert.equal(r.rows.find(row => row.id === "prime").label.includes("프리미엄 구매 뒤 추가분"), !enabled || tier === "free");
  }
});

test("시세 빈칸·0원·손익분기 위아래와 잘못 넣은 교환 비율을 구분한다", () => {
  const p = defaultMainInput("2026-10-25"), v = { ...efficiencyDefaults(p), maplePoints:2300, level: 285, fieldLevel: 285 };
  assert.equal(compareExpEfficiency({...v,ordinaryPrice:''}, p).rows.find(row => row.id === "ordinary").mesoPerMob, null);
  const cheap = compareExpEfficiency({ ...v, ordinaryPrice: 0, detectivePrice: 50000000 }, p);
  assert.equal(cheap.magnifiers[0].thresholds[0].verdict, "싸요");
  assert.equal(cheap.magnifiers[1].thresholds[0].verdict, "비싸요");
  assert.equal(cheap.magnifiers[1].thresholds[1].verdict, "싸요");
  assert.equal(cheap.rows[0].mesoPerMob, 0);
  const equal = compareExpEfficiency({ ...v, shardPrice: 7200, ordinaryPrice: 7600 }, p);
  assert.equal(equal.magnifiers[0].thresholds[2].verdict, "같아요");
  for (const change of [{ maplePoints: "" }, { won: 0 }, { bonus: -1 }, { fieldLevel: 300 }, { ordinaryPrice: -1 }]) assert.ok(compareExpEfficiency({ ...v, ...change }, p).errors.length > 0);
  const profitable = compareExpEfficiency({ ...v, maplePoints: 10000 }, p);
  assert.equal(profitable.rows.find(row => row.id === "epic1").costMeso, 12500 / 0.99 / 10000 * 1e8 - 160000000);
  assert.ok(profitable.rows.every(row => row.relativeEpic1 === null));
});

test("서로 다른 사냥터·커스텀 배분도 같은 몬스터 단위로 비교하고 플래너 입력은 바꾸지 않는다", () => {
  const p = defaultMainInput("2026-10-25");
  Object.assign(p, { level: 285 });
  Object.assign(p.routine, { huntFieldKey: "direct", huntFieldLevel: 290 });
  p.personal.flame.alloc = { exp: 3, shard: 0, erda: 0 };
  const before = structuredClone(p), v = efficiencyDefaults(p), r = compareExpEfficiency(v, p);
  assert.equal(v.fieldLevel, 290);
  assert.equal(r.rows.find(row => row.id === "ordinary").rawExp, 36429216800);
  assert.equal(r.rows.find(row => row.id === "detective").rawExp, 728584336000);
  assert.equal(r.rows.find(row => row.id === "monster").rawExp, 403625592);
  assert.equal(r.rows.find(row => row.id === "monster").costMeso, 10 / 0.99 / 2150 * 1e8);
  assert.deepEqual(p, before);
  p.personal.flame.alloc.exp = 2;
  assert.equal(compareExpEfficiency(v, p).rows.find(row => row.id === "monster").available, false);
});

test('최신 공개 식과 도핑별 가격선·갈림길·VIP 보유분은 285/290에서 일치한다',()=>{
  const p=defaultMainInput('2026-10-25');
  for(const level of [285,290])for(const [maplePoints,ordinaryPrice]of [[2300,2100000],[2150,2050000]]){
    const mob=dopingSource.tables.monsters.value[level];
    const epic=dopingSource.tables[level>=290?'aurum':'nightmare'].value[level];
    const point=dopingSource.tables.epicPoints.value[level>=290?'아우룸 레기스':'악몽선경'];
    const extra=epic.stage1-epic.stage0,cost=point.stage1/.99/maplePoints*1e8-16e7;
    const expected=(ordinaryPrice*extra/(1900*mob*cost)-1)*100;
    let detective;
    for(const bonus of [0,100,200,250,300,400,500,600,777.5]){
      const values={...efficiencyDefaults(p),level,fieldLevel:level,maplePoints,ordinaryPrice,detectivePrice:1e8,bonus};
      const r=compareExpEfficiency(values,p),normal=r.rows.find(x=>x.id==='ordinary'),vip=r.rows.find(x=>x.id==='vipBooster'),yeti=r.magnifiers.find(x=>x.id==='detective');
      assert.equal(normal.rawExp,1900*mob*(1+bonus/100));assert.equal(vip.rawExp,normal.rawExp);assert.equal(vip.available,false);assert.equal(vip.mesoPerMob,null);
      assert.equal(yeti.rawExp,800*190*mob);
      if(detective)assert.deepEqual(yeti,detective);detective=yeti;
      assert.ok(Math.abs(r.breakBonus.value-expected)<1e-10);
      assert.equal(r.dopingRows.find(x=>x.selected).bonus,bonus);
      for(const row of r.dopingRows){
        assert.equal(row.mesoPerExp,ordinaryPrice/(1900*mob*(1+row.bonus/100)));
        assert.ok(Math.abs(row.epic1Price-1900*mob*(1+row.bonus/100)/extra*cost)<1e-7);
        assert.ok(Math.abs(row.epic2Price-1900*mob*(1+row.bonus/100)/(epic.stage2-epic.stage1)*(point.stage2/.99/maplePoints*1e8-16e7))<1e-7);
      }
    }
    for(const [offset,verdict]of [[-0.01,'비싸요'],[0.01,'싸요']]){
      const r=compareExpEfficiency({...efficiencyDefaults(p),level,fieldLevel:level,maplePoints,ordinaryPrice,bonus:expected+offset},p);
      assert.equal(r.magnifiers.find(x=>x.id==='ordinary').thresholds[0].verdict,verdict);
    }
  }
});

test('도핑 도우미는 확인한 증가량을 더하며 쿠폰 배수를 전체 EXP에 곱하지 않는다',async()=>{
  const {dopingTotal,normalizeDoping}=await import('../lib/exp-doping.mjs');
  assert.equal(dopingTotal({coupon:200,potion:20,pendant:true}),250);
  assert.equal(dopingTotal({coupon:300,extra:70,potion:20,ring:15,pendant:true,title:true,other:65}),600);
  assert.equal(dopingTotal({coupon:999,extra:-50,other:'bad'}),0);
  assert.equal(normalizeDoping(null,300).other,300);
});

test('空시세·0원·음수 에픽 순비용·입력한도에서 갈림길 문구를 구분한다',()=>{
  const p=defaultMainInput('2026-10-25'),v={...efficiencyDefaults(p),level:285,fieldLevel:285};
  assert.equal(compareExpEfficiency({...v,ordinaryPrice:''},p).breakBonus.kind,'missing');
  assert.equal(compareExpEfficiency({...v,ordinaryPrice:0},p).breakBonus.kind,'always');
  assert.equal(compareExpEfficiency({...v,maplePoints:10000},p).breakBonus.kind,'unavailable');
  assert.ok(compareExpEfficiency({...v,bonus:10000},p).errors.length);
});

test("280 미만에서 시작해 비약으로 280을 넘기면 남은 메카베리·크림슨을 이어서 쓴다", () => {
  const crossed = simulateItemInventoryConversion({ level: 279, exp: 0, inventory: { potion279: 1, mech: 5, crimson: 2 } });
  const from280 = simulateItemInventoryConversion({ level: 280, exp: 0, inventory: { mech: 5, crimson: 2 } });
  assert.equal(crossed.level, 280);
  assert.equal(crossed.remaining.mech, 0);
  assert.equal(crossed.remaining.crimson, 0);
  assert.deepEqual([crossed.used.mech, crossed.used.crimson, crossed.used.potion279], [5, 2, 1]);
  assert.ok(Math.abs(crossed.exp - from280.exp) < 1e-9, `${crossed.exp} vs ${from280.exp}`);
  // 280에 닿지 못하면 메카베리·크림슨은 남는다.
  const stuck = simulateItemInventoryConversion({ level: 270, exp: 0, inventory: { mech: 5, crimson: 2 } });
  assert.deepEqual([stuck.level, stuck.exp, stuck.remaining.mech, stuck.remaining.crimson], [270, 0, 5, 2]);
});

test("시세·비교 도핑은 숫자와 숫자 문자열만 받고 true·배열·빈칸은 기본값으로 돌린다", async () => {
  const { normalizeMarket, MARKET_DEFAULTS } = await import("../lib/market.mjs");
  const { normalizeEfficiencyDoping } = await import("../lib/exp-doping.mjs");
  assert.deepEqual(normalizeMarket({ maplePoints: true, won: [1500], shardPrice: false, ordinaryPrice: " ", detectivePrice: "Infinity" }), { ...MARKET_DEFAULTS });
  assert.deepEqual(normalizeMarket({ maplePoints: "2300", won: 1600, shardPrice: "0", ordinaryPrice: 0, detectivePrice: "5e7" }),
    { maplePoints: 2300, won: 1600, shardPrice: 0, ordinaryPrice: 0, detectivePrice: 5e7 });
  for (const bonus of [false, true, [], [300], " ", null, "abc", -1]) assert.equal(normalizeEfficiencyDoping({ bonus }).bonus, null, JSON.stringify(bonus));
  assert.equal(normalizeEfficiencyDoping({ bonus: "250" }).bonus, 250);
  assert.equal(normalizeEfficiencyDoping({ bonus: 0 }).bonus, 0);
  const { parseSaved } = await import("../lib/saved-input.mjs");
  const saved = parseSaved(JSON.stringify({ version: 2, input: { routine: { huntBonusPct: 300 }, market: { maplePoints: true }, efficiency: { bonus: " " } } }), "2026-10-25");
  assert.equal(saved.market.maplePoints, MARKET_DEFAULTS.maplePoints);
  assert.equal(efficiencyDefaults(saved).bonus, 300, "깨진 비교 도핑은 사냥 추가 경험치를 덮지 않는다");
});

test("효율 비교는 null 시세를 0원이 아니라 빈칸으로 보고 숫자가 아닌 값은 오류로 돌린다", () => {
  const p = defaultMainInput("2026-10-25"), v = { ...efficiencyDefaults(p), level: 285, fieldLevel: 285 };
  for (const ordinaryPrice of [null, undefined, "", "  "]) {
    const r = compareExpEfficiency({ ...v, ordinaryPrice }, p);
    assert.deepEqual(r.errors, []);
    assert.equal(r.breakBonus.kind, "missing", String(ordinaryPrice));
    assert.equal(r.rows.find(row => row.id === "ordinary").mesoPerMob, null);
  }
  for (const change of [{ bonus: " " }, { bonus: true }, { shardPrice: null }, { maplePoints: false }, { ordinaryPrice: true }, { detectivePrice: "abc" }, { level: "285.5" }])
    assert.ok(compareExpEfficiency({ ...v, ...change }, p).errors.length > 0, JSON.stringify(change));
  assert.deepEqual(compareExpEfficiency({ ...v, level: "285", fieldLevel: "285", bonus: "300" }, p).errors, [], "입력칸의 숫자 문자열은 그대로 받는다");
});

test("반올림 배분은 출처가 없어도 목표 합계에서 멈추지 않는다", async () => {
  const { roundedExperienceSources, dailyExperienceBreakdown } = await import("../lib/experience-breakdown.mjs");
  assert.deepEqual(roundedExperienceSources({}, 5), { entries: [], total: 5 });
  assert.doesNotThrow(() => dailyExperienceBreakdown([{ sourceRaw: {}, levelSources: {} }], { hunt: 5 }));
});
