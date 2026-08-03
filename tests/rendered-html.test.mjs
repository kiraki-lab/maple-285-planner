import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const importBuiltPage = async tag => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  return import(`${pageModuleUrl.href}?${tag}-${Date.now()}`);
};

test("keeps the 285 calculator primary, adds 290, and moves supporting content into tabs", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /type ViewTab = "calculator" \| "pre280" \| "efficiency" \| "passes"/);
  assert.match(page, /useState<ViewTab>\("calculator"\)/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /label: "285·290 계산"/);
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
  assert.match(page, /guard < 16/);
  assert.match(page, /\$\{s\.targetLevel\} 도달일 계산하기/);
  assert.match(page, /계산 취소/);
  assert.match(page, /화면 사용 가능/);
  assert.match(page, /입력값 변경됨/);
  assert.match(page, /285 도달일/);
  assert.match(page, /9\/16 종료 예상/);
  assert.match(page, /285 도달 시점 남는 보상/);
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
  assert.match(page, /모멘텀 1차 현재 레벨/);
  assert.match(page, /모멘텀 2차 현재 레벨/);
  assert.match(page, /특수 물자 지원 · 4배 쿠폰 몰아쓰기/);
  assert.match(page, /시작일 보유 · 당일 충전 포함/);
  assert.match(page, /실측 1회 경험치/);
  assert.match(page, /입력값이 없으면 0으로 계산/);
  assert.doesNotMatch(page, /77,024,335,674/);
  assert.match(page, /\{targetLevel\} 달성 후 남는 보상/);
  assert.match(page, /\["특수 물자 저장", calculatedSettings\.specialSupply/);
  assert.match(page, /에테리온 코어 6레벨/);
  assert.match(page, /Core6Choice title="일일 퀘스트"/);
  assert.match(page, /Core6Choice title="몬스터파크"/);
  assert.match(page, /Core6Choice title="에픽 던전"/);
  assert.match(page, /aria-label=\{accessibleLabel\}/);
  assert.match(page, /accessibleLabel=\{`\$\{title\} 코어 6레벨`\}/);
  assert.ok(page.indexOf("core6-picker") > page.indexOf("모멘텀 2차 현재 레벨"));
  assert.ok(page.indexOf("core6-picker") < page.indexOf("<details><summary>패스 · 이벤트 설정"));
  assert.doesNotMatch(page, /일일 사냥 경험치/);
  assert.doesNotMatch(page, /SPECTER_BLAST_END|specter|mpNow|dailyNow|epicNow|mpPatch|dailyPatch|epicPatch|afterPatch|patchDate|challengerPassCapForDate|7\/22|패치 전|패치 후/);
  assert.match(layout, /285 플래너/);
  assert.match(layout, /new URL\("og\.png", siteBase\)/);
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
  assert.match(page, /momentumPass1Level: 0, momentumPass2Level: 0/);
  assert.match(page, /shardDate: "2026-07-30"/);
  assert.match(page, /shardAdv: 5000/);
  assert.match(page, /core20Date: "2026-07-23"/);
  assert.match(page, /core25Date: "2026-08-06"/);
  assert.match(page, /0\.072458/);
  assert.match(page, /0\.49505/);
  assert.match(page, /paidMonsterParkMaplePoints\(dailyRuns\)/);
  assert.match(page, /pullWeeks: 0/);
  assert.match(page, /pullStrategy: "monsterPark"/);
  assert.match(page, /shopBlueCount/);
  assert.doesNotMatch(page, /shopBlueWeeks|shopMechWeeks/);
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
  assert.doesNotMatch(page, /SPECIAL_SUPPLY_EXP_PER_CHARGE/);
  assert.match(page, /SPECIAL_SUPPLY_BATCH_SIZE = 5/);
  assert.match(page, /MOMENTUM_PASS_1_START = "2026-07-23"/);
  assert.match(page, /MOMENTUM_PASS_2_START = "2026-08-20"/);
  assert.match(page, /specialSupply: false, specialSupplySaved: 0/);
  assert.match(page, /specialSupplyExpPerCharge \* SPECIAL_SUPPLY_BATCH_SIZE/);
  assert.doesNotMatch(page, /38[_ ,]?512[_ ,]?167[_ ,]?837\s*[×x*]\s*4/);
  assert.match(page, /울티마 스쿼드 상점 EXP 5,000장 \(예상\)/);
  assert.match(page, /2026\.08\.03 확인/);
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
    momentumPass1Level: 10,
    momentumPass2Level: 10,
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
    momentumPass1Level: 10,
    momentumPass2Level: 10,
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

test("buys one Blueberry on the first still-open Maple Point shop week", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?shop-week-regression`);
  const settings = {
    ...pageModule.createDefaultSettings("2026-07-27"),
    level: 280,
    exp: 0,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
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
  const result = pageModule.simulate(settings, { fixedRuns: 0, shopBlueCount: 1 });

  assert.equal(result.shopMaplePoints, 7000);
  assert.equal(result.shopBluePurchased, 1);
  assert.equal(result.rows[0].key, "2026-07-27");
  assert.equal(result.rows[0].events.some(event => event.startsWith("메포샵 1주차 · 블루 1개")), true);
});

test("prices, grants, and distributes Maple Point shop items by exact count", async () => {
  const pageModule = await importBuiltPage("shop-item-counts");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const settings = {
    ...pageModule.createDefaultSettings("2026-07-27"),
    level: 280,
    exp: 0,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
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
  const oneEach = pageModule.simulate(settings, { fixedRuns: 0, shopBlueCount: 1, shopMechCount: 1 });
  const twoEach = pageModule.simulate(settings, { fixedRuns: 0, shopBlueCount: 2, shopMechCount: 2 });
  const threeMech = pageModule.simulate(settings, { fixedRuns: 0, shopMechCount: 3 });

  assert.equal(oneEach.shopMaplePoints, 17_000);
  assert.equal(oneEach.shopBluePurchased, 1);
  assert.equal(oneEach.shopMechPurchased, 1);
  assert.equal(twoEach.shopMaplePoints, 34_000);
  assert.equal(twoEach.shopBluePurchased, 2);
  assert.equal(twoEach.shopMechPurchased, 2);
  assert.ok(Math.abs((twoEach.rows[0].progress - 280) - (oneEach.rows[0].progress - 280) * 2) < 1e-10);

  assert.equal(threeMech.shopMaplePoints, 30_000);
  assert.equal(threeMech.shopMechPurchased, 3);
  assert.deepEqual(pageModule.distributeShopPurchaseCount(3, 4), [2, 1, 0, 0]);
  assert.deepEqual(pageModule.distributeShopPurchaseCount(9, 4), [2, 2, 2, 2]);
  assert.equal(pageModule.distributeShopPurchaseCount(9, 4).every(count => count <= 2), true);
  assert.equal(threeMech.rows[0].events.some(event => event.includes("메카 2개")), true);
  assert.equal(threeMech.rows.find(row => row.key === "2026-07-30").events.some(event => event.includes("메카 1개")), true);
  assert.equal(pageModule.shopPurchasePlanLabel(1, 1), "메카 1개 + 블루 1개");
  assert.equal(pageModule.shopPurchasePlanLabel(0, 3), "메카 3개 · 2주(2+1)");
  const mixedPairs = pageModule.shopPurchasePairsForAvailableCount(4).both;
  assert.equal(mixedPairs.length, 16);
  assert.equal(mixedPairs.some(([blueCount, mechCount]) => blueCount === 1 && mechCount === 2), true);
  assert.match(page, /SHOP_BLUE_UNIT_PRICE = 7_000/);
  assert.match(page, /SHOP_MECH_UNIT_PRICE = 10_000/);
  assert.match(page, /availableShopItemCount = availableShopWeeks\.length \* SHOP_WEEKLY_ITEM_LIMIT/);
  assert.match(page, /shopPurchasePairsForAvailableCount\(availableShopItemCount\)/);
  assert.match(page, /candidateAt\(availableShopItemCount, availableShopItemCount, 64\)/);
  assert.match(page, /shopPurchasePlanLabel\(plan\.shopBlueCount, plan\.shopMechCount\)/);
  assert.match(page, /개별 구매 · 주당 각각 최대 2개/);
  assert.doesNotMatch(page, /caption: "메카 1개 \+ 블루 1개 · 17,000 메포"/);
  assert.equal((page.match(/shopPurchasePlanLabel\(r\.shopBluePurchased, r\.shopMechPurchased\)/g) || []).length, 2);
  const heroCardStart = page.indexOf('<article className="hero-card primary"><div className="card-label">{calc.effectivePullWeeks');
  const heroCardEnd = page.indexOf("</article>", heroCardStart);
  const chosenRouteStart = page.indexOf('<article className="route-card chosen"><div><div className="route-card-label"><span>선택 경로');
  const chosenRouteEnd = page.indexOf("</article>", chosenRouteStart);
  assert.match(page.slice(heroCardStart, heroCardEnd), /shopPurchasePlanLabel\(r\.shopBluePurchased, r\.shopMechPurchased\)/);
  assert.match(page.slice(chosenRouteStart, chosenRouteEnd), /shopPurchasePlanLabel\(r\.shopBluePurchased, r\.shopMechPurchased\)/);
  assert.doesNotMatch(page, /candidateAt\(4, 4, 64\)|shopBlueWeeks|shopMechWeeks|주당 2장|주당 4장/);
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
    momentumPass1Level: 10,
    momentumPass2Level: 10,
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

test("recalculates Lv.280 Monster Park efficiency for Eterion core levels 5 and 6", async () => {
  const manifest = JSON.parse(await readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"));
  const pageModuleUrl = new URL(`dist/client/${manifest["app/page.tsx"].file}`, root);
  const pageModule = await import(`${pageModuleUrl.href}?efficiency-core6-regression`);
  const rounded = value => Number(value.toFixed(1));

  assert.equal(rounded(pageModule.paidEfficiencyScore("monsterPark", 280, 95)), 333.6);
  assert.equal(rounded(pageModule.paidEfficiencyScore("monsterPark", 280, 100)), 342.2);
  assert.equal(rounded(pageModule.efficiencyScoreById("mpSpecial", 280, 95)), 846.8);
  assert.equal(rounded(pageModule.efficiencyScoreById("mpSpecial", 280, 100)), 855.4);

  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /eterionBonusesForDate\(s, efficiencyStartDate\)\.mp/);
  assert.match(page, /relativeEfficiencyScore\(source, efficiencyLevel, efficiencyMonsterParkBonus\)/);
});

test("offers a typed level picker and single-level icon ranking from 260 through 295", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(page, /const \[efficiencyLevel, setEfficiencyLevel\] = useState\(280\)/);
  assert.match(page, /const \[efficiencyLevelInput, setEfficiencyLevelInput\] = useState\("280"\)/);
  assert.match(page, /id="efficiency-level-input" type="number"/);
  assert.match(page, /list="efficiency-level-options"/);
  assert.match(page, /EFFICIENCY_LEVEL_MIN = 260/);
  assert.match(page, /EFFICIENCY_LEVEL_MAX = 295/);
  assert.match(page, /260~295 · 선택 또는 직접 입력/);
  assert.match(page, /<img src=\{efficiencyIconForLevel\(source, efficiencyLevel\)\} alt="" aria-hidden="true" \/>/);
  assert.match(page, /data-source=\{source\.id\}/);
  assert.match(page, /검증값이 없는 레벨은 앞뒤 레벨로 보간하지 않습니다/);
  assert.doesNotMatch(page, /const efficiencyLevels = \[/);
  assert.match(css, /\.efficiency-icon \{/);
  assert.match(css, /\.efficiency-row \{[^}]*grid-template-columns: 34px 42px minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.efficiency-values \{ grid-column: 3/);
});

test("bundles the verified Haru1Sojae PNG icons locally without runtime hotlinks", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const icons = [
    "extra-exp-50.png",
    "monster-park.png",
    "prime-momentum-pass.png",
    "high-mountain.png",
    "angler-company.png",
    "nightmare-paradise.png",
    "mekaberry.png",
    "blueberry.png",
    "small-exp-potion.png",
    "vip-sauna.png",
  ];
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const expectedHashes = {
    "high-mountain.png": "80B1E360D79A488E6C1D6C78B7730D3D25B0E3CBCEB845312D53BCAD0C726C1A",
    "angler-company.png": "A1E21E4FFFEDDF2286D328524F9109AE4AA3D1349CEADD1B2A436076D713E8A8",
  };

  for (const icon of icons) {
    assert.match(page, new RegExp(`/efficiency-icons/${icon.replaceAll(".", "\\.")}`));
    const asset = await readFile(new URL(`public/efficiency-icons/${icon}`, root));
    assert.equal(asset.subarray(0, 8).equals(pngSignature), true, `${icon} must remain a PNG`);
    if (expectedHashes[icon]) assert.equal(createHash("sha256").update(asset).digest("hex").toUpperCase(), expectedHashes[icon]);
  }
  assert.doesNotMatch(page, /https:\/\/haru1sojae\.kr\/icons\//);
});

test("reuses verified boundary data and hides level-280-only rewards below 280", async () => {
  const pageModule = await importBuiltPage("efficiency-level-boundaries");

  assert.equal(pageModule.EFFICIENCY_LEVEL_MIN, 260);
  assert.equal(pageModule.EFFICIENCY_LEVEL_MAX, 295);
  for (const level of [260, 279]) {
    const ids = pageModule.availableEfficiencySourceIdsForLevel(level);
    assert.equal(ids.includes("momentum"), false);
    assert.equal(ids.includes("mech"), false);
    assert.ok(Number.isFinite(pageModule.efficiencyScoreById("mpNormal", level, 95)));
    assert.equal(Number(pageModule.efficiencyScoreById("sauna", level).toFixed(8)), 100);
  }
  for (const level of [280, 290, 291, 295]) {
    const ids = pageModule.availableEfficiencySourceIdsForLevel(level);
    assert.equal(ids.includes("momentum"), true);
    assert.equal(ids.includes("mech"), true);
    assert.ok(Number.isFinite(pageModule.efficiencyScoreById("mpNormal", level, 95)));
    assert.equal(Number(pageModule.efficiencyScoreById("sauna", level).toFixed(8)), 100);
  }
});

test("applies Epic Dungeon cost and icon boundaries at levels 260, 270, and 280", async () => {
  const pageModule = await importBuiltPage("efficiency-epic-boundaries");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(260), 5 / 3);
  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(269), 5 / 3);
  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(270), 5 / 4);
  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(279), 5 / 4);
  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(280), 1);
  assert.equal(pageModule.epicDungeonEfficiencyCostMultiplier(295), 1);
  assert.equal(pageModule.epicDungeonIconForLevel(260), "/efficiency-icons/high-mountain.png");
  assert.equal(pageModule.epicDungeonIconForLevel(270), "/efficiency-icons/angler-company.png");
  assert.equal(pageModule.epicDungeonIconForLevel(280), "/efficiency-icons/nightmare-paradise.png");
  assert.equal(pageModule.epicDungeonLabelForLevel(260, "01"), "하이마운틴 · 0→1단계");
  assert.equal(pageModule.epicDungeonLabelForLevel(260, "12"), "하이마운틴 · 1→2단계");
  assert.doesNotMatch(page, /높은 산/);

  const epic260 = pageModule.efficiencyScoreById("epic01", 260, 95);
  const sunday260 = pageModule.efficiencyScoreById("mpSunday", 260, 95);
  assert.ok(Math.abs(epic260 - 389.031098) < 0.001);
  assert.ok(epic260 > sunday260);
  assert.ok(pageModule.rankedEfficiencySourceIdsForLevel(260, 95).indexOf("epic01") < pageModule.rankedEfficiencySourceIdsForLevel(260, 95).indexOf("mpSunday"));
});

test("uses exact post-290 ledgers and preserves the 294-to-295 ranking break", async () => {
  const pageModule = await importBuiltPage("efficiency-post-290-ledgers");

  assert.equal(pageModule.REQUIRED_EXP[291], 323_736_017_920_234n);
  assert.equal(pageModule.REQUIRED_EXP[295], 870_403_132_500_696n);
  assert.equal(pageModule.POST_290_EFFICIENCY_RAW[291].sauna, 442_047_471_120);
  assert.equal(pageModule.POST_290_EFFICIENCY_RAW[294].epic, 1_519_200_000_000);
  assert.equal(pageModule.POST_290_EFFICIENCY_RAW[295].mech, 7_747_012_416_000);
  assert.equal(pageModule.POST_290_EFFICIENCY_RAW[295].monsterParkPerRun, 218_575_316_000);
  assert.ok(Number.isFinite(pageModule.efficiencyScoreById("mpNormal", 291, 95)));
  assert.notEqual(pageModule.efficiencyScoreById("mpNormal", 290, 95), pageModule.efficiencyScoreById("mpNormal", 291, 95));

  const level294 = pageModule.rankedEfficiencySourceIdsForLevel(294, 95);
  const level295 = pageModule.rankedEfficiencySourceIdsForLevel(295, 95);
  assert.ok(level294.indexOf("epic01") < level294.indexOf("mech"));
  assert.ok(level295.indexOf("mech") < level295.indexOf("epic01"));
  assert.notDeepEqual(level294, level295);
});

test("requires the Monster Park schedule before shop candidates", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /minimumScheduleIndex = strategy === "monsterPark" \? 0 : monsterParkPlan\?\.scheduleIndex \?\? 0/);
  assert.match(page, /leastCostCandidate\(shopBlueCount, shopMechCount, targetClearWeeks, minimumScheduleIndex\)/);
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
    momentumPass1Level: 0,
    momentumPass2Level: 0,
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
  assert.equal(pageModule.simulationDateKey(recommended[0].result.reached), "2026-08-19");
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

test("keeps the approved A-C fixtures unchanged in target 285 mode", async () => {
  const pageModule = await importBuiltPage("target-285-fixtures");
  const fixtures = [
    {
      settings: pageModule.createDefaultSettings("2026-07-27"),
      reached: "2026-09-07",
      maplePoints: 18_000,
      leftovers: { blue: 0, mech: 0, sauna: 0, adv: 300, potion269: 0, potion279: 0, coupon3x: 93, coupon4x: 10 },
    },
    {
      settings: { ...pageModule.createDefaultSettings("2026-08-03"), level: 280, exp: 0 },
      reached: "2026-09-17",
      maplePoints: 135_000,
      leftovers: { blue: 0, mech: 0, sauna: 0, adv: 0, potion269: 0, potion279: 0, coupon3x: 78, coupon4x: 10 },
    },
    {
      settings: { ...pageModule.createDefaultSettings("2026-08-03"), level: 284, exp: 50 },
      reached: "2026-08-06",
      maplePoints: 0,
      leftovers: { blue: 0, mech: 4, sauna: 2.5, adv: 6700, potion269: 0, potion279: 0, coupon3x: 6, coupon4x: 10 },
    },
  ];

  for (const fixture of fixtures) {
    assert.equal(fixture.settings.targetLevel, 285);
    const result = pageModule.runPlanningImmediately(fixture.settings).basePlan.result;
    assert.equal(pageModule.simulationDateKey(result.reached), fixture.reached);
    assert.equal(result.rows.at(-1).key, fixture.reached);
    assert.equal(result.maplePoints, fixture.maplePoints);
    assert.equal(result.shopMaplePoints, 0);
    assert.deepEqual(result.leftovers, fixture.leftovers);
  }
});

test("uses the verified 285-290 integer ledgers and additive multipliers", async () => {
  const pageModule = await importBuiltPage("integer-ledgers");
  const cumulative = [285, 286, 287, 288, 289].reduce((sum, level) => sum + pageModule.REQUIRED_EXP[level], 0n);

  assert.equal(pageModule.REQUIRED_EXP[285], 99_512_176_519_276n);
  assert.equal(pageModule.REQUIRED_EXP[289], 145_695_777_641_870n);
  assert.equal(cumulative, 607_531_788_867_827n);
  assert.equal(pageModule.monsterParkRawForLevel(285, true) * 7, 1_092_124_992_000);
  assert.equal(pageModule.monsterParkRawForLevel(290, true, true) * 7, 1_530_027_212_000);
  assert.equal(pageModule.WEEKLY_CONTENT_RAW[285].epic * 5, 6_144_000_000_000);
  assert.equal(pageModule.WEEKLY_CONTENT_RAW[285].epic * (5 + 0.5), 6_758_400_000_000);
  assert.equal(pageModule.monsterParkRawForLevel(285, true) * (1 + 0.5 + 0.2), 265_230_355_200);
  assert.equal(pageModule.WEEKLY_CONTENT_RAW[290].adv1000, 1_078_497_000_000);
});

test("uses the calculation start date as the automatic Carcion boundary", async () => {
  const pageModule = await importBuiltPage("carcion-start-boundary");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const start = new Date("2026-08-03T00:00:00+09:00");
  const defaultsAtStart = pageModule.createDefaultSettings("2026-08-03");

  assert.equal("carcionUnlockDate" in defaultsAtStart, false);
  assert.doesNotMatch(page, /carcionUnlockDate|카르시온 콘텐츠 해금일/);
  assert.match(page, /carcionContentActive\(date, s\.start, currentLevel\)/);
  assert.equal(pageModule.carcionContentActive(start, "2026-08-03", 280), false);
  assert.equal(pageModule.carcionContentActive(start, "2026-08-03", 285), true);
  assert.equal(pageModule.carcionContentActive(start, "2026-08-04", 285), false);
  assert.equal(pageModule.monsterParkRawForLevel(285, false), 107_204_000_000);
  assert.equal(pageModule.monsterParkRawForLevel(285, true), 156_017_856_000);
  assert.equal(pageModule.grandisDailyRawForLevel(285, false), 129_794_096_544);
  assert.equal(pageModule.grandisDailyRawForLevel(285, true), 175_429_319_424);

  const firstDaySettings = {
    ...defaultsAtStart,
    targetLevel: 290,
    level: 285,
    exp: 0,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    specialSupply: false,
    todayDaily: true,
    weeklyOpen: false,
    grandis: false,
    extreme: false,
    epic: false,
  };
  const firstDay = pageModule.simulate(firstDaySettings, { fixedRuns: 1 });
  const firstDayBonuses = pageModule.eterionBonusesForDate(firstDaySettings, start);
  const monsterParkMultiplier = 1 + firstDayBonuses.mp / 100;
  const expectedFirstDayProgress = 285 + pageModule.monsterParkRawForLevel(285, true) * monsterParkMultiplier / Number(pageModule.REQUIRED_EXP[285]);
  assert.ok(Math.abs(firstDay.rows[0].progress - expectedFirstDayProgress) < 1e-12);
  const firstDayDaily = pageModule.simulate({ ...firstDaySettings, grandis: true }, { fixedRuns: 0 });
  const expectedDailyProgress = 285 + pageModule.grandisDailyRawForLevel(285, true) * (1 + firstDayBonuses.daily / 100) / Number(pageModule.REQUIRED_EXP[285]);
  assert.ok(Math.abs(firstDayDaily.rows[0].progress - expectedDailyProgress) < 1e-12);
});

test("preserves a 285 milestone snapshot in target 290 mode", async () => {
  const pageModule = await importBuiltPage("target-290-milestone");
  const settings = {
    ...pageModule.createDefaultSettings("2026-08-03"),
    targetLevel: 290,
    level: 289,
    exp: 99.999,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    specialSupply: false,
  };
  const result = pageModule.simulate(settings, { fixedRuns: 0 });

  assert.equal(pageModule.simulationDateKey(result.reach285At), "2026-08-03");
  assert.equal(result.reached, null);
  assert.equal(result.rows.at(-1).key, "2026-09-16");
  assert.equal(result.finalLevel, 290);
  assert.ok(Math.abs(result.finalExp - 33.0732093437634) < 1e-10);
  assert.ok(result.leftoversAt285);
  assert.notEqual(result.leftoversAt285, result.leftovers);
  assert.deepEqual(result.leftoversAt285, { blue: 0, mech: 0, sauna: 0, adv: 0, potion269: 0, potion279: 0, coupon3x: 0, coupon4x: 0 });
});

test("does not auto-apply Special Supply EXP without direct input", async () => {
  const pageModule = await importBuiltPage("special-supply-zero");
  const common = {
    ...pageModule.createDefaultSettings("2026-08-03"),
    level: 284,
    exp: 0,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    weeklyOpen: false,
    todayDaily: false,
    grandis: false,
    extreme: false,
    epic: false,
    ownedBlue: 0,
    ownedMech: 0,
    ownedSauna: 0,
    ownedAdv: 0,
    specialSupplySaved: 5,
    specialSupplyExpPerCharge: 0,
  };
  const excluded = pageModule.simulate({ ...common, specialSupply: false }, { fixedRuns: 0 });
  const includedWithoutValue = pageModule.simulate({ ...common, specialSupply: true }, { fixedRuns: 0 });

  assert.equal(includedWithoutValue.specialSupplyUsed, 0);
  assert.equal(includedWithoutValue.rows.at(-1).progress, excluded.rows.at(-1).progress);
});

test("keeps the target round-trip inputs in source instead of clamping state", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /targetLevel: 285 \| 290/);
  assert.match(page, /value=\{Math\.min\(s\.level, s\.targetLevel === 290 \? 295 : 284\)\}/);
  assert.doesNotMatch(page, /set\("level", 284\)/);
  assert.match(page, /Lv\.285~295 농장은 하루1소재 공개 퍼센트 기반 근사값/);
  assert.match(page, /challengerLevel < 30/);
});

test("forecasts the final level and EXP at the September 16 deadline", async () => {
  const pageModule = await importBuiltPage("target-290-deadline");
  const settings = {
    ...pageModule.createDefaultSettings("2026-08-03"),
    targetLevel: 290,
    level: 285,
    exp: 0,
    paidMonsterPark: false,
  };
  const planning = pageModule.runPlanningImmediately(settings);

  assert.equal(planning.basePlan.result.rows.at(-1).key, "2026-09-16");
  assert.equal(planning.basePlan.result.finalLevel, 286);
  assert.ok(Math.abs(planning.basePlan.result.finalExp - 86.66382688092085) < 1e-10);
  assert.equal(planning.basePlan.result.monsterParkMaplePoints, 0);
  assert.equal(planning.basePlan.result.reached, null);
  assert.equal(planning.basePlan.result.endReason, "horizon");
  assert.equal(planning.maxPullWeeks, 0);
  assert.equal(planning.basePlan.feasible, true);
  assert.ok(planning.recommendedPlansByWeek[0].length > 0);
  assert.ok(planning.bestPlansByWeek[0]);
});

test("caps the September 16 forecast at Lv.295 99.999%", async () => {
  const pageModule = await importBuiltPage("target-295-cap");
  const settings = {
    ...pageModule.createDefaultSettings("2026-09-16"),
    targetLevel: 290,
    level: 295,
    exp: 99.999,
    paidMonsterPark: false,
    challengerPassLevel: 30,
    momentumPass1Level: 10,
    momentumPass2Level: 10,
    apology: false,
    shardEvent: false,
    ultima: false,
    specialSupply: false,
    weeklyOpen: false,
    grandis: false,
    extreme: false,
    epic: false,
    todayDaily: true,
  };
  const result = pageModule.simulate(settings, { fixedRuns: 7 });

  assert.equal(result.rows.at(-1).key, "2026-09-16");
  assert.equal(result.finalLevel, 295);
  assert.ok(Math.abs(result.finalExp - 99.999) < 1e-10);
  assert.equal(result.monsterParkMaplePoints, 0);
  assert.ok(result.rows.at(-1).progress < 296);
});

test("keeps the two Momentum Prime purchases independent and adds only Prime rewards", async () => {
  const pageModule = await importBuiltPage("momentum-two-primes");
  const totals = prime => Array.from({ length: 10 }, (_, index) => pageModule.momentumRewardForLevel(index + 1, prime, false))
    .reduce((sum, reward) => ({
      mech: sum.mech + Number(reward.mech || 0),
      adv: sum.adv + Number(reward.adv || 0),
      coupon4x: sum.coupon4x + Number(reward.coupon4x || 0),
    }), { mech: 0, adv: 0, coupon4x: 0 });
  const normal = totals(false);
  const prime = totals(true);

  assert.deepEqual(normal, { mech: 1, adv: 500, coupon4x: 0 });
  assert.deepEqual(prime, { mech: 11, adv: 9500, coupon4x: 6 });
  assert.deepEqual({ mech: prime.mech - normal.mech, adv: prime.adv - normal.adv, coupon4x: prime.coupon4x - normal.coupon4x }, { mech: 10, adv: 9000, coupon4x: 6 });
});

test("shows both Prime prices as 99,600 Nexon Cash without adding them to Maple Points", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /모멘텀 1차 프라임 · 49,800 넥슨캐시/);
  assert.match(page, /모멘텀 2차 프라임 · 49,800 넥슨캐시/);
  assert.match(page, /두 패스 모두 ON이면 총 99,600 넥슨캐시/);
  assert.match(page, /메포 합계에는 섞지 않습니다/);
});

test("pins the 9/16 forecast selection while preserving the 285 strategy input", async () => {
  const pageModule = await importBuiltPage("target-round-trip-selection");

  for (const pullStrategy of ["blue", "mech", "both"]) {
    const target290 = {
      ...pageModule.createDefaultSettings("2026-08-03"),
      targetLevel: 290,
      level: 285,
      exp: 0,
      pullStrategy,
      paidMonsterPark: false,
    };
    const planning290 = pageModule.runPlanningImmediately(target290);
    const selected290 = pageModule.selectedPlanForSettings(planning290, target290);

    assert.equal(selected290, planning290.basePlan);
    assert.equal(selected290.result, planning290.basePlan.result);
    assert.equal(selected290.result.scheduleLabel, "매일 기본 2판");
    assert.equal(selected290.result.rows.at(-1).key, "2026-09-16");
    assert.equal(target290.pullStrategy, pullStrategy);

    const returnedTo285 = { ...target290, targetLevel: 285 };
    assert.equal(returnedTo285.pullStrategy, pullStrategy);
  }
});

test("keeps the target 285 simulation on the 120-day fast horizon", async () => {
  const pageModule = await importBuiltPage("target-285-fast-horizon");
  const started = performance.now();
  const planning = pageModule.runPlanningImmediately(pageModule.createDefaultSettings("2026-07-27"));
  const elapsed = performance.now() - started;

  assert.equal(planning.basePlan.result.horizonDays, 120);
  assert.ok(planning.basePlan.result.rows.length <= 120);
  assert.equal(pageModule.simulationDateKey(planning.basePlan.result.reached), "2026-09-07");
  assert.ok(elapsed < 2_000, `target 285 planning took ${elapsed.toFixed(1)}ms`);
});
