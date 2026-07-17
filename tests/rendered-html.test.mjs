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

test("ships the finished calculator instead of the starter preview", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /285, 언제 찍을까\?/);
  assert.match(page, /평일 2판 · 일요일 7판/);
  assert.match(page, /울티마 작전 일지/);
  assert.match(page, /코어 6레벨 적용/);
  assert.match(page, /몇 주를 당겨올까요\?/);
  assert.match(page, /2026년 9월 16일 285 달성/);
  assert.match(page, /평일 몬파/);
  assert.match(page, /블루베리 구매/);
  assert.match(page, /메카베리 구매/);
  assert.match(page, /농장 둘 다/);
  assert.match(page, /직전 단계 대비 총 메포/);
  assert.match(page, /추천 · 순손익 최고/);
  assert.match(page, /같은 도달일이면 총 메포가 가장 적은 전략만 남기고/);
  assert.match(page, /같거나 더 늦게 도착하면서 메포가 더 드는 전략은 숨겼습니다/);
  assert.match(page, /내가 선택한 경로/);
  assert.match(page, /0주 비교 기준/);
  assert.match(page, /recommendedPlansByWeek/);
  assert.match(page, /스페셜 선데이 몬파 횟수/);
  assert.match(page, /기본 몬파 경험치 \+300%\(총 4배\)/);
  assert.match(page, /label: "소경축비"/);
  assert.match(page, /챌섭 EXP 패스 현재 레벨/);
  assert.match(page, /모멘텀 패스 현재 레벨/);
  assert.match(page, /무엇부터 챙기는 게 이득일까\?/);
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
