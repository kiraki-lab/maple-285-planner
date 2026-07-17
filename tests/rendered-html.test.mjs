import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(page, /메포샵 농장은 추천·손익에서 제외/);
  assert.match(layout, /285 플래너/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("keeps verified calculator constants visible in source", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /mpNow: 86/);
  assert.match(page, /sundayMult: 150/);
  assert.match(page, /shardAdv: 5000/);
  assert.match(page, /core20Date: "2026-07-23"/);
  assert.match(page, /core25Date: "2026-08-06"/);
  assert.match(page, /0\.072458/);
  assert.match(page, /0\.49505/);
  assert.match(page, /Math\.max\(0, dailyRuns - 2\) \* 600/);
  assert.match(page, /pullWeeks: 0/);
  assert.match(page, /shopMech: false, shopBlue: false/);
});
