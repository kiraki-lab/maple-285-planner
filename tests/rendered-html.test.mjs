import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advanceBurningBeyondExperience,
  growthPotionExperience,
  monsterParkExperiencePercent,
  paidMonsterParkMaplePoints,
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
  assert.doesNotMatch(page, /일일 사냥 경험치/);
  assert.match(layout, /285 플래너/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps verified calculator constants visible in source", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /mpNow: 86/);
  assert.match(page, /specialSundayCount: 1/);
  assert.match(page, /challengerPassLevel: 20/);
  assert.match(page, /momentumPassLevel: 0/);
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
  assert.match(page, /haru1sojae\.kr\/table/);
  assert.match(page, /ownedPotion279/);
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
