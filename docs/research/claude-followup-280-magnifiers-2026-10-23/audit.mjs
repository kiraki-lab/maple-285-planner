// 280~284 단계 간격과 돋보기 보정 후속 검산. 저장소 lib는 읽기만 한다.
// 실행: node --experimental-strip-types docs/research/claude-followup-280-magnifiers-2026-10-23/audit.mjs > docs/research/claude-followup-280-magnifiers-2026-10-23/audit-output.json
//
// 독립 계산과 엔진 비교를 나눈다.
// - 독립 계산: 필요 경험치 표(lib/exp-tables.ts)와 몬스터 기본 경험치 표(lib/personal-data.mjs)만 읽고,
//   단계 진행·간격 추정·가설 판정은 이 파일의 함수로 한다. 285 이상 간격은 이번 범위 밖이라 엔진 값을 입력으로 쓴다.
// - 엔진 비교: lib/main-planner.mjs 의 stepRawForLevel·buildMissionTable·stepRewardRawForLevel 결과를 따로 적는다.
import { readFileSync } from "node:fs";
import { createMainContext, itemConversionRequiredExperience as req } from "../../../lib/exp-tables.ts";
import { MOB_BASE_EXP } from "../../../lib/personal-data.mjs";
import { buildMissionTable, stepRawForLevel, stepRewardRawForLevel } from "../../../lib/main-planner.mjs";

const here = new URL(".", import.meta.url);
const live = JSON.parse(readFileSync(new URL("live-samples.json", here), "utf8"));
const out = { generatedFrom: "413d5587ed7dda78e82270ee3467829a025c0d50" };
const mob = l => MOB_BASE_EXP[l];
const U = 0.001; // 화면 % 표시 단위
const win = (shown, mode) => (mode === "round" ? [shown - U / 2, shown + U / 2] : [shown, shown + U]);
const pctOf = (raw, l) => raw / req(l) * 100;
const multOf = (pct, l) => pct / 100 * req(l) / mob(l);

// 한 단계 전진(레벨 경계를 넘으면 남은 비율을 다음 레벨 간격으로 잇는다). step(l) = 그 레벨 한 단계의 경험치.
function advance(level, pct, step) {
  let xp = req(level) * pct / 100, need = 1;
  while (need > 1e-12) {
    const size = step(level), avail = (req(level) - xp) / size;
    if (need <= avail) { xp += need * size; need = 0; if (xp >= req(level)) { level += 1; xp = 0; } }
    else { need -= avail; level += 1; xp = 0; }
  }
  return [level, xp / req(level) * 100];
}
const runFrom = (step, l, p, n) => { let c = [l, p]; for (let i = 0; i < n; i += 1) c = advance(c[0], c[1], step); return c; };
const fmt = c => `${c[0]}·${c[1].toFixed(4)}`;
const coord = c => c[0] + c[1] / 100;
const errPP = (a, b) => +((coord(a) - coord(b)) * 100).toFixed(4); // %p (같은 레벨일 때 % 차)
const bisect = (f, lo, hi) => { for (let k = 0; k < 90; k += 1) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; } return (lo + hi) / 2; };

const P = live.missionScreens280.find(s => s.id === "P");
const Q = live.missionScreens280.find(s => s.id === "Q");
const tgt = (s, stage) => s.targets.find(t => t[0] === stage);

// ── 1. 같은 레벨 연속 목표 → 레벨별 간격(배수) 구간. 반올림/버림 두 경우.
const withinRange = (l, a, b, n, mode) => {
  const A = win(a, mode), B = win(b, mode);
  return [(B[0] - A[1]) / n, (B[1] - A[0]) / n];
};
const levelEst = {};
for (const mode of ["round", "trunc"]) {
  const r = {};
  const put = (l, src, rng) => { const m = rng.map(x => multOf(x, l)); (r[l] ||= []).push({ src, pct: rng.map(x => +x.toFixed(5)), multiple: m.map(Math.round) }); };
  put(276, "P 10→11", withinRange(276, 31.662, 93.532, 1, mode));
  put(278, "P 13→14", withinRange(278, 7.414, 59.860, 1, mode));
  put(281, "P 21→24", withinRange(281, 15.516, 93.031, 3, mode));
  put(281, "P 22→24(흐린 21 제외)", withinRange(281, 41.354, 93.031, 2, mode));
  put(281, "Q 21→24", withinRange(281, 17.752, 95.267, 3, mode));
  put(282, "P 25→28", withinRange(282, 17.351, 88.631, 3, mode));
  put(282, "Q 25→28", withinRange(282, 19.408, 90.687, 3, mode));
  put(283, "P 29→30", withinRange(283, 11.409, 33.286, 1, mode));
  put(283, "Q 29→30", withinRange(283, 13.303, 35.180, 1, mode));
  levelEst[mode] = r;
}
out.withinLevel = levelEst;
// 교집합 중앙값(반올림 해석)으로 대표값을 잡는다.
const inter = (rows) => [Math.max(...rows.map(x => x.multiple[0])), Math.min(...rows.map(x => x.multiple[1]))];
const live281 = inter(levelEst.round[281]), live282 = inter(levelEst.round[282]), live283 = inter(levelEst.round[283]);
const mid = r => (r[0] + r[1]) / 2;
out.liveMultiples = { 281: live281, 282: live282, 283: live283, note: "반올림 해석 교집합. 버림 해석은 withinLevel.trunc 참고" };

// ── 2. 경계 통과로 279·280 구하기 (P 한 캐릭터, 추정용)
// 2-a. 279: 14단계 278·59.860 → 15단계 279·11.337 (278 간격은 13→14에서)
const m278 = mid(inter(levelEst.round[278]));
const solveNext = (l0, p0, l1, p1, m0) => {
  // l0 의 남은 부분 + l1 의 p1 까지가 1단계 → l1 간격
  const step0 = m0 * mob(l0), used = (req(l0) * (100 - p0) / 100) / step0;
  return (req(l1) * p1 / 100) / (1 - used) / mob(l1);
};
const m279 = solveNext(278, 59.860, 279, 11.337, m278);
const m279range = [solveNext(278, 59.8605, 279, 11.3365, inter(levelEst.round[278])[1]), solveNext(278, 59.8595, 279, 11.3375, inter(levelEst.round[278])[0])].map(Math.round).sort((a, b) => a - b);
// 2-b. 280: 15단계 279·11.337 → 21단계 281·15.516 (6단계), 279·281 은 위 값
const m280FromP = (p15, p21, mm279, mm281) => bisect(m => coord(runFrom(l => (l === 279 ? mm279 * mob(l) : l === 280 ? m * mob(l) : mm281 * mob(l)), 279, p15, 6)) - (281 + p21 / 100), 2.5e6, 3.0e6);
const m280 = m280FromP(11.337, 15.516, m279, mid(live281));
const m280lo = Math.min(m280FromP(11.3375, 15.5155, m279range[1], live281[1]), m280FromP(11.3365, 15.5165, m279range[0], live281[0]));
const m280hi = Math.max(m280FromP(11.3375, 15.5155, m279range[1], live281[1]), m280FromP(11.3365, 15.5165, m279range[0], live281[0]));
// 흐린 21단계 대신 22단계(281·41.354, 7단계)로도 계산
const m280b = bisect(m => coord(runFrom(l => (l === 279 ? m279 * mob(l) : l === 280 ? m * mob(l) : mid(live281) * mob(l)), 279, 11.337, 7)) - (281 + 41.354 / 100), 2.5e6, 3.0e6);
out.boundaryDerived = {
  m278: Math.round(m278), m279: Math.round(m279), m279range, m280: Math.round(m280), m280range: [Math.round(m280lo), Math.round(m280hi)], m280_via22: Math.round(m280b),
  slideStage1: { shown: 28.055, multipleRound: win(28.055, "round").map(x => Math.round(multOf(x, 280))), multipleTrunc: win(28.055, "trunc").map(x => Math.round(multOf(x, 280))) },
  note: "280은 P 한 캐릭터의 15→21단계(경계 2개 포함)에서 나온 값이고 279 추정에 의존한다. 슬라이드(테섭, 다른 캐릭터) 1단계 28.055%와 독립 대조한다",
};

// ── 3. 284: 본섭 표본 없음. 슬라이드(280·0% → 36단계 286·62.287%)에서 280~283을 본섭 값으로 두고 역산. 285는 두 가지로.
const m285engine = stepRawForLevel(285) / mob(285);
// 참고: maple.ai.kr 번들 표본(docs/research/mission-target-evidence.json ai-0, 서버·시점 미확인) 285·80.628 → 91.953 (11.325%p)
const m285trend = multOf(91.953 - 80.628, 285);
const H2base = { 280: m280, 281: mid(live281), 282: mid(live282), 283: mid(live283) };
const stepWith = (m, m285) => l => (m[l] !== undefined ? m[l] * mob(l) : l === 285 && m285 ? m285 * mob(l) : stepRawForLevel(l));
const solve284 = m285 => bisect(x => coord(runFrom(stepWith({ ...H2base, 284: x }, m285), 280, 0, 36)) - (286 + 62.287 / 100), 2.5e6, 3.0e6);
const m284eng = solve284(m285engine), m284trend = solve284(m285trend);
const extrap284 = mid(live283) - (mid(live282) - mid(live283));
out.level284 = { m285_aiSample: Math.round(m285trend), slideS36_H2_engine285: fmt(runFrom(stepWith({ ...H2base, 284: extrap284 }), 280, 0, 36)), slideS36_H2_ai285: fmt(runFrom(stepWith({ ...H2base, 284: extrap284 }, m285trend), 280, 0, 36)), fromSlideWithEngine285: Math.round(m284eng), fromSlideWithAi285: Math.round(m284trend), linearExtrapolation: Math.round(extrap284), engine285: Math.round(m285engine),
  note: "284는 본섭 화면이 없어 미확정. 슬라이드 역산값은 285 간격 가정에 크게 의존한다" };

// ── 4. 가설 비교 (같은 표본, 독립 진행)
// 279는 가설 대상이 아니다. P의 14→15단계 경계에서 구한 값을 모든 가설에 똑같이 넣는다(엔진은 279에도 below285를 쓰지만 지정 하한이 280이라 계산에 쓰이지 않는다).
const hyp = {
  H0_engine: { 279: m279, 280: 2_730_206, 281: 2_730_206, 282: 2_730_206, 283: 2_730_206, 284: 2_730_206 },
  H1_prev: { 279: m279, 280: 2_747_311, 281: 2_740_725, 282: 2_740_725, 283: 2_740_725, 284: 2_740_725 },
  H2_live: { 279: m279, ...H2base, 284: extrap284 },
};
const tests = [
  { id: "Q 21→30 (검증 전용, 다른 캐릭터)", from: tgt(Q, 21), stages: [22, 23, 24, 25, 26, 27, 28, 29, 30].map(s => tgt(Q, s)) },
  { id: "Q 22→30 (흐린 21 제외)", from: tgt(Q, 22), stages: [25, 28, 29, 30].map(s => tgt(Q, s)) },
  { id: "P 24→25, 28→29 경계 (같은 캐릭터, 추정에 안 쓴 경계)", from: tgt(P, 24), stages: [25, 29, 30].map(s => tgt(P, s)) },
  { id: "P 15→30 (H2는 280 추정에 15→21 사용 → H2에는 검증 아님)", from: tgt(P, 15), stages: [21, 22, 25, 29, 30].map(s => tgt(P, s)) },
];
out.hypothesisTests = tests.map(t => ({ id: t.id, rows: Object.fromEntries(Object.entries(hyp).map(([k, m]) => {
  const step = stepWith(m);
  return [k, t.stages.map(([stage, l, p]) => { const c = runFrom(step, t.from[1], t.from[2], stage - t.from[0]); return { stage, screen: `${l}·${p}`, model: fmt(c), errPP: errPP(c, [l, p]) }; })];
})) }));
// 슬라이드·은슐(테섭) 예측
out.testServerChecks = Object.fromEntries(Object.entries(hyp).map(([k, m]) => [k, {
  slide_s1: fmt(runFrom(stepWith(m), 280, 0, 1)), slide_s36: fmt(runFrom(stepWith(m), 280, 0, 36)), slide_s45: fmt(runFrom(stepWith(m), 280, 0, 45)),
  eunsul_280_11_s30: fmt(runFrom(stepWith(m), 280, 11, 30)),
  eunsul_startRange: [10.5, 11.5, 12].map(s => `${s}→${fmt(runFrom(stepWith(m), 280, s, 30))}`),
}]));

out.testServerChecks.H2_live_ai285 = (() => { const st = stepWith(hyp.H2_live, m285trend); return {
  slide_s1: fmt(runFrom(st, 280, 0, 1)), slide_s36: fmt(runFrom(st, 280, 0, 36)), slide_s45: fmt(runFrom(st, 280, 0, 45)),
  eunsul_280_11_s30: fmt(runFrom(st, 280, 11, 30)), eunsul_startRange: [10.5, 11.5, 12].map(x => `${x}→${fmt(runFrom(st, 280, x, 30))}`) }; })();

// ── 5. 판단 영향: 지정 280~284에서 H0 vs H2 목표 차이와 단계 판정이 갈리는 구간
{
  const rows = [];
  for (const l of [280, 281, 282, 283, 284]) for (const p of [0, 50]) {
    const r = {};
    for (const n of [1, 10, 30, 45]) {
      const a = runFrom(stepWith(hyp.H0_engine), l, p, n), b = runFrom(stepWith(hyp.H2_live), l, p, n);
      r[n] = { H0: fmt(a), H2: fmt(b), gapPctOfLevel: a[0] === b[0] ? +(b[1] - a[1]).toFixed(4) : `레벨 다름(${a[0]}/${b[0]})` };
    }
    rows.push({ designation: `${l}·${p}`, ...r });
  }
  out.decisionImpact = rows;
  const a = runFrom(stepWith(hyp.H0_engine), 280, 0, 30), b = runFrom(stepWith(hyp.H2_live), 280, 0, 30);
  out.decisionExample = { designation: "280·0", H0_stage30: fmt(a), H2_stage30: fmt(b),
    caseText: `현재 위치가 ${fmt(a)} 이상 ${fmt(b)} 미만이면 엔진은 30단계 완료(코인 1,000·보상 지급)로, 본섭 간격으로는 미완료로 판정한다`,
    rewardAtStake: Math.round(502_828.8 * mob(a[0])) };
}

// ── 6. 엔진 호출(참고 비교)
{
  const ctx = createMainContext();
  out.engineCall = {
    stepPct: Object.fromEntries([280, 281, 282, 283, 284, 285].map(l => [l, +pctOf(stepRawForLevel(l), l).toFixed(4)])),
    model280_0: (() => { const t = buildMissionTable({ mode: "model", designLevel: 280, designExp: 0, stepsDone: 0 }, ctx); return [1, 30, 36, 45].map(i => `${i}:${t.steps[i - 1].level}·${t.steps[i - 1].exp.toFixed(4)}`); })(),
  };
}

// ── 7. (범위 밖 발견) 단계 보상의 레벨 넘김: 목표 지점부터 몬스터 N마리분을 레벨 넘겨 계산
{
  const cross = (level, pct, kills) => { let xp = req(level) * pct / 100, total = 0, k = kills;
    while (k > 1e-9) { const rem = req(level) - xp, need = rem / mob(level); if (k <= need) { total += k * mob(level); k = 0; } else { total += rem; k -= need; level += 1; xp = 0; } } return total; };
  const rows = [...P.rewardsExact.map(r => ["P" + r[0], ...r]), ...Q.rewardsExact.map(r => ["Q" + r[0], ...r]), ["H40(전 보고서)", 40, 294, 505_210_474_188, 0.117]].map(([id, stage, l, shown]) => {
    const t = (id.startsWith("P") ? tgt(P, stage) : id.startsWith("Q") ? tgt(Q, stage) : [40, 294, 57.389]);
    const kills = stage > 30 ? 100_569.6 : 502_828.8;
    const plain = kills * mob(l), cr = cross(t[1], t[2], kills);
    return { id, target: `${t[1]}·${t[2]}`, shown, enginePlain: Math.round(stepRewardRawForLevel(l, stage)), diffPlain: Math.round(plain - shown), crossModel: Math.round(cr), diffCross: Math.round(cr - shown) };
  });
  const f5 = cross(294, 99.991, 100_569.6);
  out.rewardCrossing = { rows, prevF5: { target: "294·99.991 (31~45단계)", shownPct: 0.131, enginePct: +pctOf(stepRewardRawForLevel(294, 37), 294).toFixed(5), crossPct: +pctOf(f5, 294).toFixed(5) } };
}

// ── 8. 돋보기
const factor = gap => (gap >= 40 ? 0.7 : gap >= 21 ? (110 - gap) / 100 : gap >= 19 ? 0.95 : gap >= 17 ? 0.96 : gap >= 15 ? 0.97 : gap >= 13 ? 0.98 : gap >= 11 ? 0.99
  : gap === 10 ? 1 : gap >= 5 ? 1.05 : gap >= 2 ? 1.1 : gap >= -1 ? 1.2 : gap >= -4 ? 1.1 : gap >= -9 ? 1.05 : gap >= -20 ? (110 + gap) / 100 : gap >= -35 ? (4 * gap + 154) / 100 : gap >= -39 ? 0.1 : 0);
{
  const s = live.chatLogs.find(x => x.id === "T1");
  const base = mob(s.fieldMobLevel);
  out.chatLogT1 = {
    fieldMobBase: base, normalMobBase: s.normalMobBase,
    normalCandidates: [1, 1.05, 1.1, 1.2].map(f => ({ f, floor: Math.floor(base * f), round: Math.round(base * f), match: Math.floor(base * f) === s.normalMobBase || Math.round(base * f) === s.normalMobBase })),
    detectiveGhost: s.detectiveGhostBase, ghostDivBase: s.detectiveGhostBase / base,
    ghostIfSameFactorAsNormal: Math.floor(800 * base * 1.1),
    reading: "일반 몹 기본 줄은 기본 EXP×1.1(레벨 차 보정 포함). 같은 창의 탐정 유령 기본 줄은 정확히 800×기본 EXP로 1.1이 없다. 추가 경험치 줄(아이템·PC방·버프·버닝)은 일반 몹 뒤에만 있다",
  };
  const rows = [];
  for (const [char, field] of [[288, 288], [288, 289], [294, 294], [290, 294], [283, 284], [276, 279]]) for (const b of [0, 300]) {
    const v = 10 * mob(field) * 190 * (1 + b / 100);
    rows.push({ char, field, gap: char - field, bonusPct: b, levelFactor: factor(char - field), noFactor: Math.round(v), withFactor: Math.round(v * factor(char - field)), pctNo: +pctOf(v, char).toFixed(4), pctWith: +pctOf(v * factor(char - field), char).toFixed(4) });
  }
  out.ordinaryHypotheses = rows;
  const m = live.detectiveUses.find(x => x.id === "M1");
  const lo = (m.after - m.before - U) / 100 * req(m.charLevel), hi = (m.after - m.before + U) / 100 * req(m.charLevel);
  out.detectiveM1 = { mixed: m.mixed, perField: [280, 281, 282, 283, 284].map(f => ({ field: f, gap: m.charLevel - f, killsIfNoFactor: [+(lo / (800 * mob(f))).toFixed(2), +(hi / (800 * mob(f))).toFixed(2)], killsIfFactor: [+(lo / (800 * mob(f) * factor(m.charLevel - f))).toFixed(2), +(hi / (800 * mob(f) * factor(m.charLevel - f))).toFixed(2)] })) };
  out.measurementDesign = [[288, 289, 284], [294, 294, 289], [290, 294, 290]].map(([char, a, b]) => ({ char, fieldA: a, fieldB: b,
    perGhostA: { noFactor: 10 * mob(a), withFactor: Math.floor(10 * mob(a) * factor(char - a)) }, perGhostB: { noFactor: 10 * mob(b), withFactor: Math.floor(10 * mob(b) * factor(char - b)) },
    ratioAB_noFactor: +(mob(a) / mob(b)).toFixed(5), ratioAB_withFactor: +(mob(a) * factor(char - a) / (mob(b) * factor(char - b))).toFixed(5) }));
}

console.log(JSON.stringify(out, null, 2));
