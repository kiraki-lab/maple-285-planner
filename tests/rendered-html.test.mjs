import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advanceBurningBeyondExperience,
  FREE_MONSTER_PARK_RUNS,
  growthPotionExperience,
  monsterParkExperiencePercent,
  paidMonsterParkExperience,
  PAID_MONSTER_PARK_RUNS,
  paidMonsterParkMaplePoints,
  PAID_STRATEGY_PRIORITY,
  TOTAL_MONSTER_PARK_RUNS,
} from "../lib/calculator-core.mjs";

const root = new URL("../", import.meta.url);

test("keeps the 285 calculator primary and moves supporting content into tabs", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /type ViewTab = "calculator" \| "pre280" \| "efficiency" \| "passes"/);
  assert.match(page, /useState<ViewTab>\("calculator"\)/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /label: "285 계산"/);
  assert.match(page, /label: "260→280"/);
  assert.match(page, /label: "경험치 효율"/);
  assert.match(page, /label: "패스 보상"/);
  assert.match(page, /activeTab === "calculator"/);
  assert.match(page, /activeTab === "pre280"/);
  assert.match(page, /activeTab === "efficiency"/);
  assert.match(page, /activeTab === "passes"/);
  assert.doesNotMatch(page, /useDeferredValue/);
  assert.match(page, /leastCostCandidate/);
  assert.match(page, /calculatedSettings/);
  assert.match(page, /hasPendingChanges/);
  assert.match(page, /runPlanningInChunks/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /rawPerCoupon/);
  assert.match(page, /couponBatch/);
  assert.match(page, /guard < 8/);
  assert.match(page, /285 도달일 계산하기/);
  assert.match(page, /계산 취소/);
  assert.match(page, /화면 사용 가능/);
  assert.match(page, /입력값 변경됨/);
  assert.match(page, /285 계산 조건/);
  assert.match(page, /285 달성 후 남는 보상/);
  assert.match(page, /메카베리 모아쓰기/);
  assert.match(page, /패스 보상표/);
  assert.ok(page.indexOf("main-leftovers") > page.indexOf("main-calculator"));
  assert.ok(page.indexOf("mech-summary") > page.indexOf("main-leftovers"));
  assert.doesNotMatch(page, /무엇을 넣었는지/);
  assert.doesNotMatch(page, /숨기지 않았/);
  assert.doesNotMatch(page, /strategy-band/);
  assert.doesNotMatch(page, /메카베리는 늦게 쓸수록 세다/);
  assert.match(page, /recommendedPlansByWeek/);
  assert.match(page, /스페셜 선데이 몬파 횟수/);
  assert.match(page, /기본 몬파 경험치 \+300%\(총 4배\)/);
  assert.match(page, /label: "소경축비"/);
  assert.match(page, /챌섭 EXP 패스 현재 레벨/);
  assert.match(page, /모멘텀 패스 현재 레벨/);
  assert.match(page, /특수 물자 지원 · 4배 쿠폰 몰아쓰기/);
  assert.match(page, /시작일 보유 · 당일 충전 포함/);
  assert.match(page, /5회 저장 시 자동 사용/);
  assert.match(page, /커뮤니티 테섭 1표본 가정 · 등급 상승 미반영 · 실제값 변동 가능/);
  assert.match(page, /5회 사용은 총 12,500마리 처치 가정/);
  assert.match(page, /4배 쿠폰 보유·소모량은 차감하지 않음/);
  assert.match(page, /285 달성 후 남는 보상/);
  assert.match(page, /\["특수 물자 저장", calculatedSettings\.specialSupply/);
  assert.match(page, /에테리온 코어 6레벨/);
  assert.match(page, /Core6Choice title="일일 퀘스트"/);
  assert.match(page, /Core6Choice title="몬스터파크"/);
  assert.match(page, /Core6Choice title="에픽 던전"/);
  assert.match(page, /aria-label=\{accessibleLabel\}/);
  assert.match(page, /accessibleLabel=\{`\$\{title\} 코어 6레벨`\}/);
  assert.ok(page.indexOf("core6-picker") > page.indexOf("모멘텀 패스 현재 레벨"));
  assert.ok(page.indexOf("core6-picker") < page.indexOf("<details><summary>패스 · 이벤트 설정"));
  assert.doesNotMatch(page, /일일 사냥 경험치/);
  assert.doesNotMatch(page, /SPECTER_BLAST_END|specter|mpNow|dailyNow|epicNow|mpPatch|dailyPatch|epicPatch|afterPatch|patchDate|challengerPassCapForDate|7\/22|패치 전|패치 후/);
  assert.match(layout, /285 플래너/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /\.efficiency-values small \{ font-size: 11px/);
  assert.match(css, /\.leftover-note \{[^}]*font-size: 13px/);
  assert.match(css, /\.calculate-bar \{/);
  assert.match(css, /\.core6-picker \{/);
  assert.match(css, /\.core6-choice\.active \{/);
  assert.match(css, /\.controls, \.results \{[^}]*min-width: 0/);
  assert.match(css, /\.core6-picker \{[^}]*width: 100%;[^}]*min-width: 0;[^}]*max-width: 100%/);
  assert.match(css, /\.core6-picker-grid \{[^}]*min-width: 0;[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.core6-choice \{[^}]*min-width: 0/);
  assert.match(css, /@media \(max-width: 1100px\)[\s\S]*?\.calculator-shell \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.chart-wrap \{[^}]*overflow-x: auto/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*\.core6-picker/);
  assert.match(css, /@keyframes calculation-slide/);
  assert.doesNotMatch(css, /backdrop-filter/);
  assert.doesNotMatch(css, /\.tab-panel \{ animation/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps verified calculator constants visible in source", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /mpCore5: 90/);
  assert.match(page, /dailyCore5: 95, dailyCore6: 100/);
  assert.match(page, /epicCore5: 30/);
  assert.match(page, /mpCore6: 95/);
  assert.match(page, /epicCore6: 40/);
  assert.match(page, /epicArtifact: 180/);
  assert.match(page, /epicCore6Artifact: 190/);
  assert.match(page, /dailyCore6Enabled: false/);
  assert.match(page, /mpCore6Enabled: false/);
  assert.match(page, /epicCore6Enabled: false/);
  assert.match(page, /SSR_DEFAULT_START = "2026-07-27"/);
  assert.match(page, /specialSundayCount: 1/);
  assert.match(page, /challengerPassLevel: 30/);
  assert.match(page, /prePassLevel: 30, preUnclaimed: false/);
  assert.match(page, /challengerUnclaimed: false/);
  assert.match(page, /momentumPassLevel: 0/);
  assert.match(page, /shardDate: "2026-07-30"/);
  assert.match(page, /shardAdv: 5000/);
  assert.match(page, /core20Date: "2026-07-23"/);
  assert.match(page, /core25Date: "2026-08-06"/);
  assert.match(page, /0\.072458/);
  assert.match(page, /0\.49505/);
  assert.match(page, /paidMonsterParkMaplePoints\(dailyRuns\)/);
  assert.match(page, /pullWeeks: 0/);
  assert.match(page, /pullStrategy: "monsterPark"/);
  assert.match(page, /shopBlueWeeks/);
  assert.match(page, /shopMech: false, shopBlue: false/);
  assert.match(page, /preLevel: 270/);
  assert.match(page, /pre280Data/);
  assert.match(page, /simulatePre280/);
  assert.match(page, /pre280Content/);
  assert.match(page, /pre280MonsterParkRawPerRun/);
  assert.match(page, /37_475_000_000/);
  assert.match(page, /76_640_000_000/);
  assert.match(page, /daily: 3\.6049, extreme: 15\.3125, epic: 15\.0642/);
  assert.match(page, /daily: 0\.8235, extreme: 4\.6840, epic: 4\.1667/);
  assert.match(page, /매일 몬스터파크/);
  assert.match(page, /아케인·그란디스 일퀘/);
  assert.match(page, /익몬·에픽던전·아케인 주간/);
  assert.match(page, /paidMonsterParkMaplePoints\(completedRuns\)/);
  assert.doesNotMatch(page, /일퀘 \$\{pre280\./);
  assert.doesNotMatch(page, /몬파 \$\{pre280\./);
  assert.doesNotMatch(page, /주간 \$\{pre280\./);
  assert.match(page, /haru1sojae\.kr\/table/);
  assert.match(page, /ownedPotion279/);
  assert.match(page, /SPECIAL_SUPPLY_START = "2026-07-23"/);
  assert.match(page, /SPECIAL_SUPPLY_END = "2026-08-19"/);
  assert.match(page, /SPECIAL_SUPPLY_EXP_PER_CHARGE = 77_024_335_674/);
  assert.match(page, /SPECIAL_SUPPLY_BATCH_SIZE = 5/);
  assert.match(page, /MOMENTUM_PASS_START = "2026-07-23"/);
  assert.match(page, /specialSupply: false, specialSupplySaved: 0/);
  assert.match(page, /SPECIAL_SUPPLY_EXP_PER_CHARGE \* SPECIAL_SUPPLY_BATCH_SIZE \/ LEVEL_280_REQUIRED_EXP/);
  assert.match(page, /1회 77,024,335,674 EXP, 5회 385,121,678,370 EXP/);
  assert.doesNotMatch(page, /38[_ ,]?512[_ ,]?167[_ ,]?837\s*[×x*]\s*4/);
  assert.match(page, /울티마 스쿼드 상점 EXP 5,000장 \(예상\)/);
  assert.match(page, /2026\.07\.27 확인/);
});

test("uses the browser-local date and Challenger EXP Pass level 30 for defaults", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?local-defaults-regression`);

  const controlledLocalDate = new Date(2026, 0, 2, 23, 59, 59);
  const controlledNextDay = new Date(2026, 0, 3, 0, 0, 1);

  assert.equal(pageModule.localDateInputValue(controlledLocalDate), "2026-01-02");
  assert.equal(pageModule.localDateInputValue(controlledNextDay), "2026-01-03");
  assert.equal(pageModule.defaults.start, "2026-07-27");
  assert.equal(pageModule.createDefaultSettings("2026-07-27").start, "2026-07-27");
  const currentDefaults = pageModule.createDefaultSettings("2026-07-27");
  assert.equal(currentDefaults.challengerPassLevel, 30);
  assert.equal(currentDefaults.prePassLevel, 30);
  assert.equal(currentDefaults.challengerUnclaimed, false);
  assert.equal(currentDefaults.preUnclaimed, false);
  assert.equal(currentDefaults.dailyCore6Enabled, false);
  assert.equal(currentDefaults.mpCore6Enabled, false);
  assert.equal(currentDefaults.epicCore6Enabled, false);
  assert.equal(currentDefaults.shardDate, "2026-07-30");
  assert.equal(currentDefaults.ultimaCount, 29);
  assert.equal(currentDefaults.ultimaWeek, 4);
  assert.deepEqual(pageModule.ultimaProgressBefore("2026-07-17"), { count: 21, week: 1 });
  assert.deepEqual(pageModule.ultimaProgressBefore("2026-07-23"), { count: 25, week: 0 });
  assert.deepEqual(pageModule.ultimaProgressBefore("2026-07-27"), { count: 29, week: 4 });
  assert.deepEqual(pageModule.ultimaProgressBefore("2026-07-30"), { count: 30, week: 0 });
  assert.deepEqual(pageModule.ultimaProgressBefore("2026-09-17"), { count: 60, week: 0 });
});

test("applies the three Eterion level 6 cores independently by date", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?eterion-core6-regression`);
  const targetDate = new Date(2026, 7, 20);
  const isolated = {
    ...pageModule.createDefaultSettings("2026-08-20"),
    dailyCore6Date: "2026-08-20",
    mpCore6Date: "2026-08-20",
    epicCore6Date: "2026-08-20",
    core20Date: "2099-01-01",
    core25Date: "2099-01-01",
    epicArtifactDate: "2099-01-01",
  };

  assert.deepEqual(pageModule.eterionBonusesForDate(isolated, targetDate), { daily: 95, mp: 90, epic: 30 });
  assert.deepEqual(pageModule.eterionBonusesForDate({ ...isolated, dailyCore6Enabled: true }, targetDate), { daily: 100, mp: 90, epic: 30 });
  assert.deepEqual(pageModule.eterionBonusesForDate({ ...isolated, mpCore6Enabled: true }, targetDate), { daily: 95, mp: 95, epic: 30 });
  assert.deepEqual(pageModule.eterionBonusesForDate({ ...isolated, epicCore6Enabled: true }, targetDate), { daily: 95, mp: 90, epic: 40 });

  const afterArtifactAndTotals = {
    ...isolated,
    mpCore6Enabled: true,
    epicCore6Enabled: true,
    core20Date: "2026-08-01",
    core25Date: "2026-08-01",
    epicArtifactDate: "2026-08-13",
  };
  assert.deepEqual(pageModule.eterionBonusesForDate(afterArtifactAndTotals, targetDate), { daily: 95, mp: 100, epic: 200 });
  assert.deepEqual(pageModule.eterionBonusesForDate({ ...afterArtifactAndTotals, epicCore6Enabled: false }, targetDate), { daily: 95, mp: 100, epic: 190 });
});

test("uses the Epic Dungeon level 6 core in Nightmare Paradise stage 1", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?epic-core6-simulation`);
  const common = {
    ...pageModule.createDefaultSettings("2026-08-20"),
    level: 284,
    exp: 0,
    challengerPassLevel: 30,
    momentumPassLevel: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    specialSupply: false,
    todayDaily: false,
    weeklyOpen: true,
    grandis: false,
    extreme: false,
    epic: true,
    epicMult: 1,
    core25Date: "2099-01-01",
    epicArtifactDate: "2099-01-01",
    epicCore6Date: "2026-08-20",
  };
  const core5 = pageModule.simulate({ ...common, epicCore6Enabled: false }, { fixedRuns: 0 });
  const core6 = pageModule.simulate({ ...common, epicCore6Enabled: true }, { fixedRuns: 0 });

  assert.ok(core6.rows[0].progress > core5.rows[0].progress);
  assert.equal(core5.rows[0].events.includes("익몬 · 악몽선경"), true);
  assert.equal(core6.rows[0].events.includes("익몬 · 악몽선경"), true);
});

test("applies local defaults only after hydration and keeps reset in sync", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /const defaults = createDefaultSettings\(\)/);
  assert.match(page, /const localDefaultsApplied = useRef\(false\)/);
  assert.match(page, /useEffect\(\(\) => \{/);
  assert.match(page, /const localDefaults = createDefaultSettings\(localDateInputValue\(\)\)/);
  assert.match(page, /setS\(localDefaults\)/);
  assert.match(page, /setCalculatedSettings\(localDefaults\)/);
  assert.match(page, /setPlanning\(runPlanningImmediately\(localDefaults\)\)/);
  assert.equal((page.match(/const localDefaults = createDefaultSettings\(localDateInputValue\(\)\)/g) || []).length, 2);
  assert.doesNotMatch(page, /localDateInputValue[\s\S]{0,300}toISOString/);
});

test("ignores Ultima shop EXP rewards that are already past", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?past-reward-regression`);
  const inactiveSettings = start => ({
    ...pageModule.createDefaultSettings(start),
    level: 284,
    exp: 0,
    challengerPassLevel: 30,
    momentumPassLevel: 10,
    apology: false,
    ultima: false,
    specialSupply: false,
    todayDaily: false,
    weeklyOpen: false,
    grandis: false,
    extreme: false,
    epic: false,
  });

  const expired = pageModule.simulate({
    ...inactiveSettings("2026-07-27"),
    shardEvent: true,
    shardDate: "2026-07-26",
  }, { fixedRuns: 0 });
  const scheduledShopExp = pageModule.simulate({
    ...inactiveSettings("2026-07-27"),
    shardEvent: true,
    shardDate: "2026-07-30",
  }, { fixedRuns: 0 });

  assert.equal(expired.leftovers.adv, 0);
  assert.equal(expired.rows.some(row => row.events.some(event => event.includes("울티마 스쿼드 상점"))), false);
  assert.equal(scheduledShopExp.rows.some(row => row.key === "2026-07-30" && row.events.includes("울티마 스쿼드 상점 EXP 5,000장 (예상)")), true);
});

test("buys the first still-open Maple Point shop week on the calculation start date", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?shop-week-regression`);
  const settings = {
    ...pageModule.createDefaultSettings("2026-07-27"),
    level: 280,
    exp: 0,
    challengerPassLevel: 30,
    momentumPassLevel: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    specialSupply: false,
    todayDaily: false,
    weeklyOpen: false,
    grandis: false,
    extreme: false,
    epic: false,
  };
  const result = pageModule.simulate(settings, { fixedRuns: 0, shopBlueWeeks: 1 });

  assert.equal(result.shopMaplePoints, 7000);
  assert.equal(result.rows[0].key, "2026-07-27");
  assert.equal(result.rows[0].events.includes("메포샵 1주차"), true);
});

test("starts Thursday Ultima attendance from the new week without overwriting manual input", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?ultima-thursday-regression`);
  const settingsFor = start => ({
    ...pageModule.createDefaultSettings(start),
    level: 284,
    exp: 99.999,
    challengerPassLevel: 30,
    momentumPassLevel: 10,
    apology: false,
    shardEvent: false,
    specialSupply: false,
    todayDaily: false,
    weeklyOpen: false,
    grandis: false,
    extreme: false,
    epic: false,
    ownedBlue: 1,
  });

  const july23 = pageModule.simulate(settingsFor("2026-07-23"), { fixedRuns: 0 });
  const july30 = pageModule.simulate(settingsFor("2026-07-30"), { fixedRuns: 0 });
  const manuallyCompletedThursday = pageModule.simulate({
    ...settingsFor("2026-07-23"),
    ultimaWeek: 5,
  }, { fixedRuns: 0 });

  assert.equal(july23.ultimaCountAtReach, 26);
  assert.equal(july30.ultimaCountAtReach, 31);
  assert.equal(manuallyCompletedThursday.ultimaCountAtReach, 25);
});

test("applies normal and Special Sunday Monster Park bonuses additively", () => {
  const mapleRoad280 = { baseSevenRunPercent: 2.2302, runs: 7, contentBonusPercent: 0 };
  const common = { baseSevenRunPercent: 2.0272, runs: 7, contentBonusPercent: 86 };

  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "none" }), 2.2302);
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "normal" }), 3.3453);
  assert.equal(monsterParkExperiencePercent({ ...mapleRoad280, sundayKind: "special" }), 8.9208);
  assert.equal(monsterParkExperiencePercent({ ...common, sundayKind: "none" }), 3.770592);
  assert.equal(monsterParkExperiencePercent({ ...common, sundayKind: "normal" }), 4.784192);
  assert.ok(Math.abs(monsterParkExperiencePercent({ ...common, sundayKind: "special" }) - 9.852192) < 1e-12);
  assert.ok(Math.abs(monsterParkExperiencePercent({ ...common, sundayKind: "none" }) - 3.771) < 0.0021);
  assert.ok(Math.abs(monsterParkExperiencePercent({ ...common, sundayKind: "normal" }) - 4.785) < 0.0021);
  assert.ok(Math.abs(monsterParkExperiencePercent({ ...common, sundayKind: "special" }) - 9.854) < 0.0021);
  assert.equal(paidMonsterParkMaplePoints(7), 3000);
  assert.equal(paidMonsterParkMaplePoints(2), 0);
});

test("prices and compares only the five paid Monster Park runs", () => {
  assert.equal(FREE_MONSTER_PARK_RUNS, 2);
  assert.equal(PAID_MONSTER_PARK_RUNS, 5);
  assert.equal(TOTAL_MONSTER_PARK_RUNS, 7);
  assert.equal(paidMonsterParkExperience(7), 5);
  assert.equal(paidMonsterParkExperience(2.2302), 2.2302 * 5 / 7);
  assert.equal(paidMonsterParkMaplePoints(TOTAL_MONSTER_PARK_RUNS), 3000);
  assert.deepEqual(PAID_STRATEGY_PRIORITY, ["monsterPark", "mech", "blue"]);
});

test("requires the Monster Park schedule before shop candidates", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /minimumScheduleIndex = strategy === "monsterPark" \? 0 : monsterParkPlan\?\.scheduleIndex \?\? 0/);
  assert.match(page, /leastCostCandidate\(shopBlueWeeks, shopMechWeeks, targetClearWeeks, minimumScheduleIndex\)/);
  assert.match(page, /strategy === "monsterPark" \|\| !monsterParkPlan\?\.feasible/);
  assert.match(page, /strategyPlans\.monsterPark\[pullWeeks\]\?\.feasible \? strategyPlans\.monsterPark\[pullWeeks\]/);
  assert.match(page, /strategyPlans\.monsterPark\[effectivePullWeeks\]\?\.feasible \? "monsterPark" : roiWinner/);
  assert.match(page, /paidMonsterParkExperience\(efficiency\[level\]\.mp7\)/);
  assert.match(page, /유료 추가 5판 · 하루 3,000 메포/);
});

test("recommends paid weekday Monster Park for the reported Lv.282 case", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?priority-regression`);
  const settings = {
    ...pageModule.createDefaultSettings("2026-07-27"),
    level: 282,
    exp: 40.999,
    start: "2026-07-27",
    specialSundayCount: 0,
    challengerPassLevel: 30,
    momentumPassLevel: 0,
    pullWeeks: 1,
  };
  const planning = pageModule.runPlanningImmediately(settings);
  const recommended = planning.recommendedPlansByWeek[1];

  assert.equal(planning.maxPullWeeks, 2);
  assert.equal(planning.bestPlansByWeek[1].strategy, "monsterPark");
  assert.deepEqual(recommended.map(plan => plan.strategy), ["monsterPark"]);
  assert.equal(recommended[0].scheduleIndex, 10);
  assert.equal(recommended[0].result.shopMaplePoints, 0);
  assert.equal(recommended[0].result.monsterParkMaplePoints, 36_000);
  assert.equal(recommended[0].result.reached.toISOString().slice(0, 10), "2026-08-18");
});

test("carries the full growth-potion overflow into level 280 with Burning Beyond", () => {
  const required = {
    278: 15_142_935_081_083,
    280: 33_647_601_750_165,
  };
  const startExperience = required[278] * 0.275;
  const result = advanceBurningBeyondExperience({
    level: 278,
    experience: startExperience,
    gainedExperience: growthPotionExperience(required[278]),
    requiredExperience: level => required[level],
  });

  assert.equal(result.level, 280);
  assert.ok(Math.abs(result.experience / required[280] * 100 - 12.3762376237629) < 1e-10);
});

test("advances every Burning Beyond level-up by two levels through 280", () => {
  const requiredExperience = level => 1_000_000 + level;
  let state = { level: 260, experience: 0 };

  for (const expectedLevel of [262, 264, 266, 268, 270, 272, 274, 276, 278, 280]) {
    state = advanceBurningBeyondExperience({
      ...state,
      gainedExperience: requiredExperience(state.level) - state.experience,
      requiredExperience,
    });
    assert.equal(state.level, expectedLevel);
    assert.equal(state.experience, 0);
  }
});

test("shows the two-week Mayrin ROI as a cumulative comparison from week zero", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?cumulative-roi-regression`);
  const roi = pageModule.calculateMayrinRoi({
    selectedMaplePoints: 93_000,
    baselineMaplePoints: 9_000,
    previousMaplePoints: 93_000,
    selectedHardWeeks: 2,
    baselineHardWeeks: 0,
    previousHardWeeks: 2,
    hardValue: 492_000_000,
    mpPerEok: 2_500,
  });

  assert.equal(roi.cumulative.maplePoints, 84_000);
  assert.equal(roi.cumulative.hardWeeks, 2);
  assert.equal(roi.cumulative.costValue, 3_360_000_000);
  assert.equal(roi.cumulative.recoveredValue, 984_000_000);
  assert.equal(roi.cumulative.netValue, -2_376_000_000);
  assert.ok(Math.abs(roi.cumulative.recoveryRate - 29.285714285714285) < 1e-12);
  assert.equal(roi.marginal.maplePoints, 0);
  assert.equal(roi.marginal.netValue, 0);
});

test("labels cumulative ROI as the main result and keeps the prior step secondary", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /HARD MAYRIN ROI · \{calc\.effectivePullWeeks \? `0주 대비/);
  assert.match(page, /\$\{calc\.effectivePullWeeks\}주 당김 총손익/);
  assert.match(page, /0주 대비 추가 메포/);
  assert.match(page, /0주 대비 하드 추가/);
  assert.match(page, /0주 대비 누적 회수/);
  assert.match(page, /직전 \{calc\.effectivePullWeeks - 1\}주 경로 대비/);
  assert.match(page, /직전 \$\{calc\.effectivePullWeeks - 1\}주 경로와 같은 비용/);
});
