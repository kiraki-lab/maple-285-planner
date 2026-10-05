import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

const renderBuiltSsrHtml = async tag => {
  const workerUrl = new URL("dist/server/index.js", root);
  const worker = await import(`${workerUrl.href}?${tag}-${Date.now()}`);
  const response = await worker.default.fetch(new Request("http://localhost/"), {
    ASSETS: { fetch: async () => new Response("", { status: 404 }) },
  }, {});
  assert.equal(response.status, 200);
  return response.text();
};

test("탭은 퍼스널 버닝, 아이템 환산, 보상표·자료 세 개뿐이다", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /type ViewTab = "personal" \| "items" \| "reference"/);
  assert.match(page, /useState<ViewTab>\("personal"\)/);
  assert.match(page, /role="tablist"/);
  ["퍼스널 버닝", "아이템 환산", "보상표·자료"].forEach(label => assert.ok(page.includes(`label: "${label}"`), label));
  // 종료된 챌섭 계산기와 버닝 비욘드 탭은 없다.
  assert.doesNotMatch(page, /챌섭 계산기|260→280|버닝 비욘드|CHALLENGERS/);
  assert.doesNotMatch(page, /activeTab === "calculator"|activeTab === "pre280"/);
});

test("챌섭 계산기와 버닝 비욘드 코드가 소스에 남아 있지 않다", async () => {
  const [page, planner, items, reference, tables, hook] = await Promise.all([
    read("app/page.tsx"), read("app/personal-planner.tsx"), read("app/items-panel.tsx"), read("app/reference-panel.tsx"), read("lib/exp-tables.ts"), read("app/use-main-input.ts"),
  ]);
  const all = [page, planner, items, reference, tables, hook].join("\n");
  ["simulatePre280", "runPlanningImmediately", "calculateMayrinRoi", "eterionBonusesForDate", "challengerRewardForLevel", "simulateItemInventoryConversion(", "momentumRewardForLevel"].forEach(name => {
    if (name === "simulateItemInventoryConversion(") return; // 아이템 환산 패널이 쓰는 함수다.
    assert.ok(!all.includes(name), `${name} 가 남아 있다`);
  });
  assert.doesNotMatch(all, /advanceBurningBeyondExperience|메이린|메포샵|모멘텀 패스 1차/);
  assert.ok(!all.includes("2026-09-16"), "챌섭 종료일 상수가 남아 있다");
});

test("서버 렌더 첫 화면은 퍼스널 버닝 탭이고 고정 날짜로 시작한다", async () => {
  const html = await renderBuiltSsrHtml("ssr-personal");
  assert.doesNotMatch(html, /<title><\/title>/);
  assert.match(html, /<title>퍼스널 버닝 플래너/);
  assert.match(html, /id="personal-panel"/);
  assert.doesNotMatch(html, /id="calculator-panel"|id="pre280-panel"|id="items-panel"|id="reference-panel"/);
  assert.match(html, /퍼스널 버닝, 언제 어디까지\?/);
  // 날짜는 서버와 클라이언트가 같게 시작하고 마운트 뒤에 오늘로 바뀐다.
  assert.match(html, /value="2026-10-04"/);
  // 입력과 결과가 서버 렌더에도 있다.
  assert.match(html, /11\/18 마감 위치/);
  assert.match(html, /성장 미션/);
  assert.match(html, /보스 상한/);
  assert.match(html, /사냥터/);
  assert.match(html, /이 계산이 기대는 가정/);
});

test("입력은 이 브라우저에 저장하고, 저장소를 못 써도 계산은 된다", async () => {
  const hook = await read("app/use-main-input.ts");
  const saved = await read("lib/saved-input.mjs");
  assert.match(saved, /SAVED_INPUT_KEY = "maple-personal-planner-v2"/);
  // 저장소를 직접 만지는 곳은 saved-input.mjs 의 try/catch 안뿐이고, 훅은 window.localStorage 를 넘길 때도 감싼다.
  assert.equal((hook.match(/localStorage\.(getItem|setItem)/g) || []).length, 0);
  assert.equal((hook.match(/try \{/g) || []).length, 2);
  assert.match(hook, /useEffect\(\(\) => \{[\s\S]*kstToday\(\)/);
  assert.match(hook, /export const SSR_START = "2026-10-04"/);
  assert.match(hook, /loadSaved\(window\.localStorage, now\)/);
  assert.match(hook, /persistSaved\(window\.localStorage, input\)/);
  // 렌더 중에는 오늘 날짜를 읽지 않는다(서버와 첫 클라이언트 렌더가 같아야 한다).
  const initStart = hook.indexOf("useState<MainInput>");
  const initEnd = hook.indexOf("useEffect(", initStart);
  assert.ok(initStart > 0 && initEnd > initStart, "초기 상태 구간을 찾지 못함");
  const stateInit = hook.slice(initStart, initEnd);
  assert.match(stateInit, /defaultMainInput\(SSR_START\)/);
  assert.ok(!stateInit.includes("Date.now") && !stateInit.includes("kstToday"));
});

test("저장된 입력을 되살리는 규칙: 깨졌거나 옛 형식이면 기본값, 빠진 항목은 채운다", async () => {
  const { defaultMainInput } = await import(new URL("lib/main-planner.mjs", root).href);
  const { mergeSaved, parseSaved, serializeSaved, SAVED_INPUT_VERSION } = await import(new URL("lib/saved-input.mjs", root).href);
  const today = "2026-10-10";
  assert.equal(SAVED_INPUT_VERSION, 2);
  // 깨진 저장값
  assert.equal(parseSaved("", today), null);
  assert.equal(parseSaved(null, today), null);
  assert.equal(parseSaved("{not json", today), null);
  assert.equal(parseSaved("[]", today), null);
  assert.equal(parseSaved(JSON.stringify({ version: 1, input: {} }), today), null, "옛 버전");
  assert.equal(parseSaved(JSON.stringify({ version: 2 }), today), null, "입력 없음");
  assert.equal(parseSaved(JSON.stringify({ version: 2, input: 5 }), today), null, "입력이 객체가 아님");
  // 왕복
  const input = defaultMainInput(today);
  input.level = 291; input.personal.flame.stock = 1234; input.personal.bosses = [{ id: "lotus-hard", party: 2, doneThisWeek: true }];
  const restored = parseSaved(serializeSaved(input), "2026-10-11");
  assert.equal(restored.level, 291);
  assert.equal(restored.personal.flame.stock, 1234);
  assert.equal(restored.start, today, "저장한 기준일을 그대로 둔다(오늘로 바꾸는 건 화면의 선택)");
  assert.deepEqual(restored.personal.bosses, [{ id: "lotus-hard", party: 2, doneThisWeek: true }]);
  // 새로 생긴 항목은 기본값, 옛 형식 보스(id 없음)는 버림
  const old = { level: 289, personal: { bosses: [{ name: "벨로나", raw: 3e12 }, { id: "bellona-hard", party: 1 }, null], flame: { stock: 5 } }, routine: { runsPerDay: 3 } };
  const merged = mergeSaved(old, today);
  assert.equal(merged.level, 289);
  assert.equal(merged.routine.runsPerDay, 3);
  assert.equal(merged.routine.weeklyMeasuredPercent, 0, "나중에 생긴 항목은 기본값으로 채운다");
  assert.equal(merged.personal.flame.stock, 5);
  assert.deepEqual(merged.personal.flame.alloc, { shard: 3, exp: 0, erda: 0 });
  assert.deepEqual(merged.personal.bosses.map(boss => boss.id), ["bellona-hard"]);
  assert.equal(merged.plus.claimedLevel, 0);
  // 일요일 판수가 없던 때 저장한 값은 평일 판수를 따른다(기본값 2로 덮지 않는다).
  assert.equal(merged.routine.sundayRuns, 3);
  assert.equal(mergeSaved({ start: "2026-10-05", routine: { runsPerDay: 7 } }, "2026-10-05").routine.sundayRuns, 7);
  assert.equal(mergeSaved({ routine: { runsPerDay: 7, sundayRuns: 2 } }, today).routine.sundayRuns, 2, "저장된 값이 있으면 그대로");
  assert.equal(mergeSaved({}, today).routine.sundayRuns, 2);
  // 형식이 틀린 값(문자열 숫자, null, 깨진 날짜)은 화면이 죽지 않게 엔진 규칙으로 바로잡는다.
  const fixed = parseSaved(JSON.stringify({ version: 2, input: { exp: "45", level: "288", start: "bad" } }), today);
  assert.equal(fixed.exp, 45);
  assert.equal(fixed.level, 288);
  assert.equal(fixed.start, today, "깨진 기준일은 오늘로");
  const nulls = parseSaved(JSON.stringify({ version: 2, input: { exp: null, level: null, personal: { flame: { stock: null, alloc: { shard: 1.9 } } } } }), today);
  [nulls.exp, nulls.level, nulls.personal.flame.stock].forEach(value => assert.ok(Number.isFinite(value), String(value)));
  assert.equal(nulls.inputWarnings, undefined);
  assert.equal(nulls.end, undefined);
});

test("저장소가 던져도 loadSaved/persistSaved 는 죽지 않는다", async () => {
  const { defaultMainInput } = await import(new URL("lib/main-planner.mjs", root).href);
  const { loadSaved, persistSaved, SAVED_INPUT_KEY } = await import(new URL("lib/saved-input.mjs", root).href);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("quota"); } };
  assert.equal(loadSaved(broken, "2026-10-10"), null);
  assert.equal(persistSaved(broken, defaultMainInput("2026-10-10")), false);
  const memory = new Map();
  const fake = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.equal(loadSaved(fake, "2026-10-10"), null, "아직 저장 전");
  assert.equal(persistSaved(fake, defaultMainInput("2026-10-10")), true);
  assert.ok(memory.has(SAVED_INPUT_KEY));
  assert.equal(loadSaved(fake, "2026-10-11").level, 288);
});

test("보스 프리셋과 사냥터 선택이 화면에 연결돼 있다", async () => {
  const planner = await read("app/personal-planner.tsx");
  assert.match(planner, /보스 상한 \(여기까지 잡음\)/);
  assert.match(planner, /이하로 채우기/);
  assert.match(planner, /bossPreset\(\{ cutoffId: bossCutoff, partyMode: bossParty \}\)/);
  assert.match(planner, /자주 쓰는 구성 \(검밑솔·노세이칼…\)/);
  assert.match(planner, /bossCommunityPreset\(communityPreset, bossParty\)/);
  assert.match(planner, /전부 솔로/);
  assert.match(planner, /보스별 최대 인원/);
  assert.match(planner, /WEEKLY_BOSS_LIMIT/);
  assert.match(planner, /사냥터 \(몬스터 레벨이 경험치를 정합니다\)/);
  assert.match(planner, /FIELD_REGIONS\.map\(region => <optgroup/);
  assert.match(planner, /플레임 1마리<\/b> = 몬스터 Lv\./);
  assert.match(planner, /교환권 1장<\/b> = Lv\./);
  // 입력 방식과 가정이 숨지 않는다.
  assert.match(planner, />다음 목표 직접 입력</);
  assert.match(planner, />지정 당시 상태로 추정</);
  assert.doesNotMatch(planner, /\(정확\)/, "추정 모형을 정확하다고 쓰지 않는다");
  assert.match(planner, /본섭 두 캐릭터\(286·287레벨 지정\)의 30단계 목표가 0\.01%p 안쪽으로 맞습니다/);
  assert.match(planner, /몬스터 기본 경험치 × 502,828\.8/);
  assert.match(planner, /모멘텀 PLUS는 이벤트 시작부터 주 2,500포인트를 모두 채웠다고/);
  assert.match(planner, /주간 사냥 시간/);
  assert.match(planner, /커스텀 포인트 배분/);
  assert.match(planner, /compareAlloc\(input, ctx\)/);
  assert.match(planner, /이 배분으로/);
  assert.match(planner, /추천: 갈 수 있는 지역의 가장 높은 몬스터/);
  assert.match(planner, /<option value="same">내 레벨과 같은 몬스터/);
  assert.match(planner, /보유 퍼스널 EXP 포인트/);
  assert.match(planner, /사냥 추가 경험치 %/);
  assert.match(planner, /몬스터파크 추가 경험치 %/);
  assert.match(planner, /에픽 던전 추가 경험치 %/);
  assert.match(planner, /PLUS의 경험치 4배 쿠폰\(30분, 순수 사냥 경험치의 3배가 더 붙음\)과 VIP 부스터/);
  assert.match(planner, /hunt: "사냥", coupon4x: "경험치 4배 쿠폰\(PLUS\)", booster: "VIP 부스터\(PLUS\)"/);
  assert.match(planner, /주간 컨텐츠 직접 입력 %/);
  assert.match(planner, /이미 완료/);
  assert.match(planner, /나머지 30개는 화면과 대조하지 못했습니다/);
  assert.match(planner, /하루1소재에 플레임 계산식은 없습니다/);
});

test("스타일이 퍼스널 화면 부품을 모두 갖고 좁은 화면에서 한 줄로 쌓인다", async () => {
  const css = await read("app/globals.css");
  [".pb-cards", ".pb-card", ".pb-advice", ".pb-steps", ".pb-step", ".pb-sources", ".pb-assume", ".pb-formula", ".pb-boss", ".pb-boss-add", ".pb-choice", ".pb-check", ".pb-table-wrap"].forEach(selector => assert.ok(css.includes(selector), selector));
  assert.match(css, /\.view-tabs \{[^}]*grid-template-columns: repeat\(3, 1fr\)/);
  assert.match(css, /@media \(max-width: 1100px\) \{ \.pb-cards \{ grid-template-columns: 1fr; \} \}/);
  assert.match(css, /\.item-conversion-panel \{/);
});

test("아이템 환산 탭은 퍼스널 탭 입력을 쓰고 이동 버튼을 갖는다", async () => {
  const items = await read("app/items-panel.tsx");
  assert.match(items, /전부 쓰면 어디까지 오르나요/);
  assert.match(items, /퍼스널 탭 현재값 불러오기/);
  assert.match(items, /simulateItemInventoryConversion\(\{ level, exp, inventory \}\)/);
  assert.match(items, /assetUrl\(row\.iconSrc\)/);
  assert.match(items, /type: "potion279", mark: "비약", iconSrc: ""/);
  assert.match(items, /goPersonal/);
});

test("보상표·자료 탭이 공식 PLUS 표와 하루1소재 표를 보여 준다", async () => {
  const reference = await read("app/reference-panel.tsx");
  assert.match(reference, /모멘텀 패스 PLUS/);
  assert.match(reference, /10\/21 23:59 수령 마감/);
  assert.match(reference, /프리미엄·프라임은 10\/21 23:00까지 판매/);
  assert.match(reference, /퍼스널 보스 미션 35개/);
  assert.match(reference, /레벨별 플레임·교환권/);
  assert.match(reference, /카르마 블랙 큐브 85\(100개\)/);
  assert.match(reference, /36,500/);
  assert.match(reference, /30,000/);
  assert.match(reference, /11\/19 02:00까지/);
  // 프리미엄 상급 EXP 1,500은 4·7·10레벨 행에 있다.
  const premium = [...reference.matchAll(/\{ level: (\d+), free: "[^"]*", premium: "([^"]*)"/g)].map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(premium.filter(([, text]) => text.includes("상급 EXP 1,500")).map(([level]) => level), [4, 7, 10]);
});

test("배포 경로와 메타데이터가 퍼스널 버닝을 가리킨다", async () => {
  const [layout, workflow, pkg] = await Promise.all([read("app/layout.tsx"), read(".github/workflows/pages.yml"), read("package.json")]);
  assert.match(layout, /퍼스널 버닝 플래너/);
  assert.match(layout, /퍼스널 버닝, 언제 어디까지\?/);
  assert.match(layout, /new URL\("og\.png", siteBase\)/);
  assert.doesNotMatch(layout, /챌린저스 EXP 패스|메이린|285·290, 언제 찍을까/);
  assert.match(workflow, /pnpm run build/);
  assert.match(pkg, /tests\/exp-tables\.test\.mjs/);
  assert.match(pkg, /tests\/main-planner\.test\.mjs/);
  assert.match(pkg, /tests\/site\.test\.mjs/);
});
