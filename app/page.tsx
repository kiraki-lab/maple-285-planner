"use client";

import { useMemo, useState } from "react";

type Settings = {
  level: number;
  exp: number;
  start: string;
  sevenUntil: string;
  sundayMult: number;
  momentumMechLevel: number;
  momentumMechDeadline: string;
  mayrinMesoGap: number;
  mayrinNormalFrag: number;
  fragPrice: number;
  mpPerEok: number;
  postReset: boolean;
  challengerUnclaimed: boolean;
  challengerExp: boolean;
  momentumPrime: boolean;
  deferMomentumMech: boolean;
  core6Enabled: boolean;
  apology: boolean;
  specter: boolean;
  shardEvent: boolean;
  ultima: boolean;
  shopMech: boolean;
  shopBlue: boolean;
  mpNow: number;
  mpPatch: number;
  core20Date: string;
  core20Bonus: number;
  core6Date: string;
  mpCore6: number;
  dailyNow: number;
  dailyPatch: number;
  dailyCore6: number;
  hunt: number;
  shardDate: string;
  shardAdv: number;
  ultimaCount: number;
  ultimaWeek: number;
  ultimaStart: boolean;
  grandis: boolean;
  weeklyOpen: boolean;
  todayDaily: boolean;
  extreme: boolean;
  epic: boolean;
  epicMult: number;
  epicNow: number;
  epicPatch: number;
  core25Date: string;
  core25Bonus: number;
  epicArtifactDate: string;
  epicArtifact: number;
  epicCore6: number;
  epicCore6Artifact: number;
  ownedBlue: number;
  ownedMech: number;
  ownedSauna: number;
  ownedAdv: number;
};

type ItemType = "blue" | "mech" | "sauna" | "adv" | "potion269" | "potion279" | "coupon3x" | "coupon4x";
type Leftovers = Record<ItemType, number>;
type Reward = Partial<Leftovers> & {
  label: string;
  sourceLabel?: string;
  attendanceReward?: boolean;
  attendanceCount?: number;
  deferMech?: boolean;
  optionalPurchase?: boolean;
  maplePoints?: number;
  purchased?: boolean;
  date?: string;
  remaining?: Leftovers;
};
type Row = { date: Date; key: string; level: number; exp: number; progress: number; events: string[] };
type Simulation = {
  start: Date;
  startLevel: number;
  startExp: number;
  rows: Row[];
  reached: Date | null;
  leftovers: Leftovers;
  leftoverSources: string[];
  shopMaplePoints: number;
  monsterParkMaplePoints: number;
  maplePoints: number;
  scheduleLabel: string;
  sevenUntil: Date;
  sundayMultiplier: number;
  momentumMechLevel: number;
  momentumMechDeadline: Date;
  dailyDaysApplied: number;
  ultimaCountAtReach: number;
};

const efficiency: Record<number, Record<string, number>> = {
  280: { grandis: 0.3857, mp7: 2.2302, extreme: 2.604, epic: 3.0885, adv100: 0.22977, sauna: 0.9313, blue: 6.4818, mech: 9.7053 },
  281: { grandis: 0.3507, mp7: 2.0272, extreme: 2.3996, epic: 2.8461, adv100: 0.21173, sauna: 0.8582, blue: 5.8925, mech: 8.9434 },
  282: { grandis: 0.3188, mp7: 1.8431, extreme: 2.2077, epic: 2.6183, adv100: 0.19479, sauna: 0.7896, blue: 5.3568, mech: 8.2281 },
  283: { grandis: 0.2898, mp7: 1.6758, extreme: 2.0339, epic: 2.412, adv100: 0.17946, sauna: 0.7274, blue: 4.8699, mech: 7.5803 },
  284: { grandis: 0.2635, mp7: 1.5232, extreme: 1.8708, epic: 2.2187, adv100: 0.16507, sauna: 0.6691, blue: 4.4271, mech: 6.9727 },
};

const emptyLeftovers = (): Leftovers => ({ blue: 0, mech: 0, sauna: 0, adv: 0, potion269: 0, potion279: 0, coupon3x: 0, coupon4x: 0 });
const itemTypes = Object.keys(emptyLeftovers()) as ItemType[];
const parseDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDate = (date: Date | null) => date ? `${date.getMonth() + 1}/${date.getDate()}` : "미도달";
const longDate = (date: Date | null) => date ? `${date.getMonth() + 1}월 ${date.getDate()}일` : "120일 이후";
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const req = (level: number) => Math.pow(1.1, level - 280);
const formatMP = (value: number) => `${Math.round(value).toLocaleString("ko-KR")} MP`;
const eok = (value: number) => `${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;

const defaults: Settings = {
  level: 280, exp: 87.39, start: "2026-07-17", sevenUntil: "2026-08-01", sundayMult: 150,
  momentumMechLevel: 284, momentumMechDeadline: "2026-08-12", mayrinMesoGap: 3, mayrinNormalFrag: 30,
  fragPrice: 640, mpPerEok: 2500, postReset: true, challengerUnclaimed: true, challengerExp: true,
  momentumPrime: true, deferMomentumMech: true, core6Enabled: false, apology: true, specter: true,
  shardEvent: true, ultima: true, shopMech: true, shopBlue: true, mpNow: 86, mpPatch: 90,
  core20Date: "2026-07-23", core20Bonus: 5, core6Date: "2026-07-23", mpCore6: 95,
  dailyNow: 76, dailyPatch: 95, dailyCore6: 100, hunt: 0, shardDate: "2026-07-23", shardAdv: 5000,
  ultimaCount: 21, ultimaWeek: 1, ultimaStart: true, grandis: true, weeklyOpen: true, todayDaily: true,
  extreme: true, epic: true, epicMult: 5, epicNow: 30, epicPatch: 30, core25Date: "2026-08-06",
  core25Bonus: 10, epicArtifactDate: "2026-08-13", epicArtifact: 180, epicCore6: 40,
  epicCore6Artifact: 190, ownedBlue: 0, ownedMech: 0, ownedSauna: 0, ownedAdv: 0,
};

function simulate(s: Settings, schedule: { sevenUntil?: Date; fixedRuns?: number; deferMomentumMech?: boolean } = {}): Simulation {
  const start = parseDate(s.start);
  const patchDate = parseDate("2026-07-23");
  const core20Date = s.core20Date ? parseDate(s.core20Date) : null;
  const core25Date = s.core25Date ? parseDate(s.core25Date) : null;
  const epicArtifactDate = s.epicArtifactDate ? parseDate(s.epicArtifactDate) : null;
  const requestedCore6Date = s.core6Enabled && s.core6Date ? parseDate(s.core6Date) : null;
  const core6Date = requestedCore6Date && requestedCore6Date >= patchDate ? requestedCore6Date : requestedCore6Date ? patchDate : null;
  let level = Math.max(280, Math.min(284, s.level));
  let xp = req(level) * Math.max(0, Math.min(99.999, s.exp)) / 100;
  const selectedCutoff = s.sevenUntil ? parseDate(s.sevenUntil) : addDays(start, -1);
  const sevenUntil = schedule.sevenUntil ?? selectedCutoff;
  const fixedRuns = schedule.fixedRuns == null ? null : Math.max(0, Math.min(7, schedule.fixedRuns));
  const sundayMultiplier = Math.max(1, s.sundayMult / 100);
  const runsForDate = (date: Date) => fixedRuns == null ? (date.getDay() === 0 ? 7 : date <= sevenUntil ? 7 : 2) : fixedRuns;
  const scheduleLabel = fixedRuns == null
    ? sevenUntil < start ? "평일 2판 · 일요일 7판" : `${shortDate(sevenUntil)}까지 7판 · 이후 평일 2판`
    : `매일 ${fixedRuns}판`;
  const deferMomentumMech = schedule.deferMomentumMech ?? s.deferMomentumMech;
  const momentumMechLevel = Math.max(280, Math.min(284, s.momentumMechLevel));
  const momentumMechDeadline = s.momentumMechDeadline ? parseDate(s.momentumMechDeadline) : parseDate("2026-08-12");
  const rows: Row[] = [];
  const rewardDays = new Map<string, Reward[]>();

  const addReward = (date: Date, reward: Reward) => {
    const key = iso(date);
    if (!rewardDays.has(key)) rewardDays.set(key, []);
    reward.remaining = emptyLeftovers();
    itemTypes.forEach(type => { reward.remaining![type] = Math.max(0, Number(reward[type] || 0)); });
    reward.date = key;
    reward.purchased = false;
    rewardDays.get(key)!.push(reward);
  };

  if (s.challengerUnclaimed) addReward(start, { label: "챌린저스 21~25", blue: s.challengerExp ? 3 : 0, sauna: s.challengerExp ? 1 : 0, adv: s.challengerExp ? 1100 : 100 });
  addReward(patchDate, { label: "챌린저스 26~30", blue: s.challengerExp ? 2 : 0, sauna: s.challengerExp ? 1 : 0, adv: s.challengerExp ? 3100 : 2100, potion279: s.challengerExp ? 1 : 0 });
  addReward(parseDate("2026-07-23"), { label: "모멘텀 1주차", deferMech: deferMomentumMech, mech: s.momentumPrime ? 2 : 1, sauna: 0.5, coupon4x: s.momentumPrime ? 2 : 0 });
  addReward(parseDate("2026-07-30"), { label: "모멘텀 2주차", deferMech: deferMomentumMech, mech: s.momentumPrime ? 2 : 0, sauna: 0.5, adv: s.momentumPrime ? 3100 : 100, coupon4x: s.momentumPrime ? 2 : 0 });
  addReward(parseDate("2026-08-06"), { label: "모멘텀 3주차", deferMech: deferMomentumMech, mech: s.momentumPrime ? 3 : 0, sauna: 0.5, adv: s.momentumPrime ? 3100 : 100, coupon4x: s.momentumPrime ? 2 : 0 });
  addReward(parseDate("2026-08-13"), { label: "모멘텀 4주차", deferMech: deferMomentumMech, mech: s.momentumPrime ? 4 : 0, adv: s.momentumPrime ? 3300 : 300 });
  if (s.apology) addReward(start, { label: "7월 NOW 보상", mech: 1, sauna: 2, coupon4x: 4 });
  if (s.specter) addReward(start, { label: "스펙터 블래스트", adv: 3000 });
  if (s.shardEvent && s.shardDate) addReward(parseDate(s.shardDate), { label: "울티마 스쿼드 EXP", adv: s.shardAdv });

  let ultimaLastScheduled = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    let weekUsed = Math.max(0, Math.min(5, Math.floor(s.ultimaWeek)));
    const ultimaEnd = parseDate("2026-09-16");
    const saunaMilestones = new Set([2, 7, 12, 17, 22, 27, 32, 37, 42, 51, 56]);
    for (let day = 0; day < 120 && ultimaLastScheduled < 60; day += 1) {
      const date = addDays(start, day);
      if (date > ultimaEnd) break;
      if (day > 0 && date.getDay() === 4) weekUsed = 0;
      if ((day === 0 && !s.ultimaStart) || weekUsed >= 5) continue;
      ultimaLastScheduled += 1;
      weekUsed += 1;
      const reward: Reward = { label: `울티마 ${ultimaLastScheduled}회`, sourceLabel: "울티마 작전 일지", attendanceReward: true, attendanceCount: ultimaLastScheduled, coupon3x: 3 };
      if (saunaMilestones.has(ultimaLastScheduled)) reward.sauna = 0.5;
      if (ultimaLastScheduled === 25 || ultimaLastScheduled === 45) reward.potion269 = 1;
      if ([47, 52, 57].includes(ultimaLastScheduled)) reward.adv = 2000;
      if (ultimaLastScheduled === 60) reward.potion279 = 1;
      addReward(date, reward);
    }
  }

  if (s.shopBlue || s.shopMech) {
    ["2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13"].forEach((date, index) => addReward(parseDate(date), {
      label: `메포샵 ${index + 1}주차`, blue: s.shopBlue ? 2 : 0, mech: s.shopMech ? 2 : 0,
      maplePoints: (s.shopBlue ? 7000 : 0) + (s.shopMech ? 10000 : 0), optionalPurchase: true,
    }));
  }
  addReward(start, { label: "현재 보유분", blue: s.ownedBlue, mech: s.ownedMech, sauna: s.ownedSauna, adv: s.ownedAdv });

  const applyRaw = (initialRaw: number) => {
    let raw = initialRaw;
    while (raw > 0 && level < 285) {
      const remaining = req(level) - xp;
      if (raw < remaining) { xp += raw; raw = 0; } else { raw -= remaining; level += 1; xp = 0; }
    }
  };
  const applyPercent = (percent: number) => { if (level < 285 && efficiency[level]) applyRaw(req(level) * percent / 100); };
  const applyItems = (type: "blue" | "mech" | "sauna" | "adv", count: number) => {
    let remaining = type === "sauna" ? Math.max(0, Number(count || 0)) : Math.max(0, Math.floor(count || 0));
    let used = 0;
    if (type === "sauna") {
      while (remaining > 0.0000001 && level < 285) {
        const rawPerHour = req(level) * efficiency[level].sauna / 100;
        const hours = Math.min(remaining, (req(level) - xp) / rawPerHour);
        applyRaw(rawPerHour * hours); remaining -= hours; used += hours;
      }
      return used;
    }
    while (remaining > 0 && level < 285) {
      const percent = type === "adv" ? efficiency[level].adv100 / 100 : efficiency[level][type];
      applyPercent(percent); remaining -= 1; used += 1;
    }
    return used;
  };
  const applyGrowthPotion = (type: "potion269" | "potion279", count: number) => {
    let remaining = Math.max(0, Math.floor(count || 0)); let used = 0;
    const raw = type === "potion279" ? 0.49505 : 0.072458;
    while (remaining > 0 && level < 285) { applyRaw(raw); remaining -= 1; used += 1; }
    return used;
  };

  let reached: Date | null = null;
  let shopMaplePoints = 0;
  let monsterParkMaplePoints = 0;
  let dailyDaysApplied = 0;
  for (let day = 0; day < 120 && level < 285; day += 1) {
    const date = addDays(start, day); const key = iso(date); const events: string[] = [];
    (rewardDays.get(key) || []).forEach(reward => {
      if (reward.optionalPurchase && level >= 285) return;
      if (reward.optionalPurchase) reward.purchased = true;
      shopMaplePoints += reward.maplePoints || 0;
      const r = reward.remaining!;
      if ((reward.blue || 0) > 0) r.blue -= applyItems("blue", r.blue);
      if ((reward.mech || 0) > 0 && (!reward.deferMech || level >= momentumMechLevel || date >= momentumMechDeadline)) r.mech -= applyItems("mech", r.mech);
      if ((reward.sauna || 0) > 0) r.sauna -= applyItems("sauna", r.sauna);
      if ((reward.potion269 || 0) > 0) r.potion269 -= applyGrowthPotion("potion269", r.potion269);
      if ((reward.potion279 || 0) > 0) r.potion279 -= applyGrowthPotion("potion279", r.potion279);
      if ((reward.adv || 0) > 0) r.adv -= applyItems("adv", r.adv);
      const notableAttendance = reward.attendanceReward && (reward.sauna || reward.adv || reward.potion269 || reward.potion279);
      if ((!reward.attendanceReward && (reward.label !== "현재 보유분" || itemTypes.some(type => Number(reward[type] || 0) > 0))) || notableAttendance) events.push(reward.label);
    });

    const thursday = date.getDay() === 4;
    if ((thursday && day > 0) || (day === 0 && s.weeklyOpen)) {
      const afterPatch = date >= patchDate; const afterCore6 = Boolean(core6Date && date >= core6Date);
      const afterCore20 = Boolean(core20Date && date >= core20Date); const afterCore25 = Boolean(core25Date && date >= core25Date);
      const mpBase = afterCore6 ? s.mpCore6 : afterPatch ? s.mpPatch : s.mpNow;
      const mpBonus = mpBase + (afterPatch && afterCore20 ? s.core20Bonus : 0);
      if (s.extreme && level < 285) applyPercent(efficiency[level].extreme * (1 + mpBonus / 100));
      if (s.epic && level < 285) {
        const afterArtifact = Boolean(epicArtifactDate && date >= epicArtifactDate);
        const epicBase = afterCore6 ? (afterArtifact ? s.epicCore6Artifact : s.epicCore6) : (afterArtifact ? s.epicArtifact : afterPatch ? s.epicPatch : s.epicNow);
        const eterion = epicBase + (afterPatch && afterCore25 ? s.core25Bonus : 0);
        applyPercent(efficiency[level].epic * (s.epicMult + eterion / 100));
      }
      events.push("주간 콘텐츠");
    }

    if (level < 285 && (day > 0 || s.todayDaily)) {
      dailyDaysApplied += 1;
      const dailyRuns = runsForDate(date);
      monsterParkMaplePoints += Math.max(0, dailyRuns - 2) * 600;
      const afterPatch = date >= patchDate; const afterCore6 = Boolean(core6Date && date >= core6Date); const afterCore20 = Boolean(core20Date && date >= core20Date);
      const mpBase = afterCore6 ? s.mpCore6 : afterPatch ? s.mpPatch : s.mpNow;
      const mpBonus = mpBase + (afterPatch && afterCore20 ? s.core20Bonus : 0);
      const dailyBonus = afterCore6 ? s.dailyCore6 : afterPatch ? s.dailyPatch : s.dailyNow;
      applyPercent(efficiency[level].mp7 * dailyRuns / 7 * (1 + mpBonus / 100) * (date.getDay() === 0 ? sundayMultiplier : 1));
      if (s.grandis && level < 285) applyPercent(efficiency[level].grandis * (1 + dailyBonus / 100));
      if (level < 285) applyPercent(s.hunt);
    }

    if (deferMomentumMech && level < 285 && (level >= momentumMechLevel || date >= momentumMechDeadline)) {
      rewardDays.forEach(rewards => rewards.forEach(reward => {
        if (!reward.deferMech || (reward.date || "") > key || !reward.remaining || reward.remaining.mech <= 0 || level >= 285) return;
        reward.remaining.mech -= applyItems("mech", reward.remaining.mech);
        events.push(`${reward.label} 메카베리 사용`);
      }));
    }

    const progress = level >= 285 ? 285 : level + xp / req(level);
    rows.push({ date, key, level, exp: level >= 285 ? 0 : xp / req(level) * 100, progress, events });
    if (level >= 285) reached = date;
  }

  const leftovers = emptyLeftovers(); const leftoverSources: string[] = [];
  rewardDays.forEach(rewards => rewards.forEach(reward => {
    if (reward.optionalPurchase && !reward.purchased) return;
    if (reward.attendanceReward && reached && (reward.date || "") > iso(reached)) return;
    if (reward.remaining && itemTypes.some(type => reward.remaining![type] > 0)) leftoverSources.push(reward.sourceLabel || reward.label);
    if (reward.remaining) itemTypes.forEach(type => { leftovers[type] += reward.remaining![type] || 0; });
  }));
  let ultimaCountAtReach = Math.max(0, Math.min(60, Math.floor(s.ultimaCount)));
  if (s.ultima) {
    const reachKey = reached ? iso(reached) : "9999-12-31";
    rewardDays.forEach(rewards => rewards.forEach(reward => { if (reward.attendanceReward && (reward.date || "") <= reachKey) ultimaCountAtReach = Math.max(ultimaCountAtReach, reward.attendanceCount || 0); }));
  }
  return { start, startLevel: s.level, startExp: s.exp, rows, reached, leftovers, leftoverSources: [...new Set(leftoverSources)], shopMaplePoints, monsterParkMaplePoints, maplePoints: shopMaplePoints + monsterParkMaplePoints, scheduleLabel, sevenUntil, sundayMultiplier, momentumMechLevel, momentumMechDeadline, dailyDaysApplied, ultimaCountAtReach };
}

function weekStartThursday(date: Date) { const result = new Date(date); result.setDate(result.getDate() - ((result.getDay() + 3) % 7)); result.setHours(0, 0, 0, 0); return result; }
function mayrinClearWeeks(reached: Date | null) {
  const end = parseDate("2026-09-16"); if (!reached || reached > end) return 0;
  return Math.floor((weekStartThursday(end).getTime() - weekStartThursday(reached).getTime()) / 604800000) + 1;
}

function InputField({ label, value, onChange, type = "number", min, max, step, disabled }: { label: string; value: string | number; onChange: (value: string) => void; type?: "number" | "date"; min?: number; max?: number; step?: number; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} min={min} max={max} step={step} disabled={disabled} /></label>;
}
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`toggle-row ${disabled ? "is-disabled" : ""}`}><span>{label}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} /><i aria-hidden="true" /></label>;
}

function ProgressChart({ selected, sunday, free }: { selected: Simulation; sunday: Simulation; free: Simulation }) {
  const width = 900, height = 340, margin = { left: 44, right: 28, top: 32, bottom: 42 };
  const count = Math.max(1, selected.rows.length - 1, sunday.rows.length - 1, free.rows.length - 1);
  const x = (index: number) => margin.left + index / count * (width - margin.left - margin.right);
  const y = (progress: number) => margin.top + (285 - progress) / 5 * (height - margin.top - margin.bottom);
  const path = (rows: Row[]) => rows.map((row, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(row.progress).toFixed(1)}`).join(" ");
  const longest = [selected.rows, sunday.rows, free.rows].sort((a, b) => b.length - a.length)[0];
  const tickEvery = Math.max(1, Math.ceil(longest.length / 6));
  return <div className="chart-wrap">
    <div className="chart-legend"><span className="legend selected">선택 경로</span><span className="legend sunday">일요일 7판</span><span className="legend free">매일 2판</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="세 경로의 285레벨 도달 진행 비교">
      {[280, 281, 282, 283, 284, 285].map(level => <g key={level}><line x1={margin.left} x2={width - margin.right} y1={y(level)} y2={y(level)} className="grid-line" /><text x={margin.left - 10} y={y(level) + 4} textAnchor="end" className="axis-label">{level}</text></g>)}
      {longest.map((row, index) => (index % tickEvery === 0 || index === longest.length - 1) ? <text key={row.key} x={x(index)} y={height - 12} textAnchor="middle" className="axis-label">{shortDate(row.date)}</text> : null)}
      <path d={path(free.rows)} className="chart-line free" /><path d={path(sunday.rows)} className="chart-line sunday" /><path d={path(selected.rows)} className="chart-line selected" />
      {[selected, sunday, free].map((result, index) => { const row = result.rows[result.rows.length - 1]; return row ? <circle key={index} cx={x(result.rows.length - 1)} cy={y(row.progress)} r="5" className={["dot selected", "dot sunday", "dot free"][index]} /> : null; })}
    </svg>
  </div>;
}

export default function Home() {
  const [s, setS] = useState<Settings>(defaults);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS(current => ({ ...current, [key]: value }));
  const calc = useMemo(() => {
    const start = parseDate(s.start);
    const selected = simulate(s);
    const sunday = simulate(s, { sevenUntil: addDays(start, -1) });
    const free = simulate(s, { fixedRuns: 2 });
    const allSeven = simulate(s, { fixedRuns: 7 });
    const immediate = simulate(s, { sevenUntil: selected.sevenUntil, deferMomentumMech: false });
    const allSevenWeeks = mayrinClearWeeks(allSeven.reached);
    const candidates = [sunday, ...Array.from({ length: 45 }, (_, day) => simulate(s, { sevenUntil: addDays(start, day) }))];
    const recommended = candidates.filter(candidate => mayrinClearWeeks(candidate.reached) >= allSevenWeeks).sort((a, b) => a.maplePoints - b.maplePoints || a.monsterParkMaplePoints - b.monsterParkMaplePoints)[0] || allSeven;
    const hardValue = Math.max(0, s.mayrinMesoGap) * 100000000 + Math.max(0, s.mayrinNormalFrag) * Math.max(0, s.fragPrice) * 10000;
    const reset = s.postReset ? 1 : 0;
    const selectedHardWeeks = mayrinClearWeeks(selected.reached) + (selected.reached ? reset : 0);
    const sundayHardWeeks = mayrinClearWeeks(sunday.reached) + (sunday.reached ? reset : 0);
    const gainedHardWeeks = Math.max(0, selectedHardWeeks - sundayHardWeeks);
    const incrementalMP = selected.maplePoints - sunday.maplePoints;
    const extraCostValue = incrementalMP / Math.max(1, s.mpPerEok) * 100000000;
    const recoveredValue = gainedHardWeeks * hardValue;
    const netValue = recoveredValue - extraCostValue;
    const recoveryRate = extraCostValue > 0 ? recoveredValue / extraCostValue * 100 : 0;
    const mechRaw280 = efficiency[280].mech * req(280) / 100;
    const mechRawTarget = efficiency[selected.momentumMechLevel].mech * req(selected.momentumMechLevel) / 100;
    return { selected, sunday, free, allSeven, immediate, recommended, hardValue, selectedHardWeeks, sundayHardWeeks, gainedHardWeeks, incrementalMP, extraCostValue, recoveredValue, netValue, recoveryRate, mechGain: (mechRawTarget / mechRaw280 - 1) * 100 };
  }, [s]);
  const r = calc.selected;
  const pullDays = r.reached && calc.sunday.reached ? Math.max(0, Math.round((calc.sunday.reached.getTime() - r.reached.getTime()) / 86400000)) : 0;
  const recommendedPrefix = calc.recommended.sevenUntil < calc.recommended.start ? "평일 2판 · 일요일 7판" : `${shortDate(calc.recommended.sevenUntil)}까지만 평일 7판`;
  const savedFromAllSeven = calc.allSeven.maplePoints - calc.recommended.maplePoints;
  const extraForHard = calc.recommended.maplePoints - calc.sunday.maplePoints;
  const momentumLeft = calc.recommended.reached && calc.recommended.reached < parseDate("2026-08-13");
  const leftoverRows: [string, string][] = [
    ["상급 EXP 교환권", `${r.leftovers.adv.toLocaleString("ko-KR")}장`], ["VIP 사우나", `${r.leftovers.sauna.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}시간`],
    ["블루베리 농장", `${r.leftovers.blue.toLocaleString("ko-KR")}장`], ["메카베리 농장", `${r.leftovers.mech.toLocaleString("ko-KR")}장`],
    ["성장의 비약 200~269", `${r.leftovers.potion269.toLocaleString("ko-KR")}개`], ["성장의 비약 200~279", `${r.leftovers.potion279.toLocaleString("ko-KR")}개`],
    ["3배 쿠폰 · 30분", `${r.leftovers.coupon3x.toLocaleString("ko-KR")}개`], ["4배 쿠폰 · 30분", `${r.leftovers.coupon4x.toLocaleString("ko-KR")}개`],
  ];

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="285 플래너 홈"><span className="brand-mark">M</span><span>285 PLANNER</span></a><nav><a href="#compare">경로 비교</a><a href="#rewards">보상표</a><a href="#sources">근거</a></nav></header>
    <section className="hero" id="top">
      <div className="eyebrow"><span /> CHALLENGERS WORLD · 2026 SUMMER</div>
      <h1>285, 언제 찍을까?</h1>
      <p>패스를 바로 쓰지 않고, 몬파를 필요한 날까지만. 하드 메이린 한 주를 당기는 비용까지 계산합니다.</p>
      <div className="hero-grid">
        <article className="hero-card primary"><div className="card-label">선택 경로</div><strong>{longDate(r.reached)}</strong><span>{r.scheduleLabel}</span><div className="card-meta"><b>{formatMP(r.maplePoints)}</b><em>{pullDays ? `가성비 경로보다 ${pullDays}일 빠름` : "가성비 경로와 같은 날짜"}</em></div></article>
        <article className="hero-card"><div className="card-label">가성비 기준</div><strong>{longDate(calc.sunday.reached)}</strong><span>평일 2판 · 일요일 7판</span><div className="card-meta"><b>{formatMP(calc.sunday.maplePoints)}</b><em>선데이 몬파는 7판 가정</em></div></article>
        <article className="hero-card verdict"><div className="card-label">하드 +1회 손익</div><strong className={calc.netValue >= 0 ? "positive" : "negative"}>{calc.netValue >= 0 ? "+" : ""}{eok(calc.netValue)}</strong><span>추가 비용 회수율 {calc.recoveryRate.toFixed(1)}%</span><div className="card-meta"><b>{calc.gainedHardWeeks}회 추가</b><em>보상 {eok(calc.recoveredValue)}</em></div></article>
      </div>
      <div className="hero-note"><span className="pulse" /><p><b>현재 추천</b> {recommendedPrefix} → {shortDate(calc.recommended.reached)} · 일요일 경로보다 {formatMP(extraForHard)} 추가 · 매일 7판보다 {formatMP(savedFromAllSeven)} 절약</p></div>
    </section>

    <section className="calculator-shell" id="compare">
      <aside className="controls">
        <div className="section-heading"><span>01</span><div><p>내 캐릭터 입력</p><h2>계산 조건</h2></div></div>
        <div className="field-grid compact">
          <label className="field"><span>현재 레벨</span><select value={s.level} onChange={e => set("level", Number(e.target.value))}>{[280, 281, 282, 283, 284].map(level => <option key={level}>{level}</option>)}</select></label>
          <InputField label="현재 경험치 %" value={s.exp} min={0} max={99.999} step={0.001} onChange={v => set("exp", Number(v))} />
          <InputField label="계산 시작일" value={s.start} type="date" onChange={v => set("start", v)} />
          <InputField label="평일 7판 종료일" value={s.sevenUntil} type="date" onChange={v => set("sevenUntil", v)} />
          <InputField label="일요일 몬파 효율 %" value={s.sundayMult} min={100} max={500} step={10} onChange={v => set("sundayMult", Number(v))} />
          <InputField label="일일 사냥 경험치 %" value={s.hunt} min={0} max={100} step={0.1} onChange={v => set("hunt", Number(v))} />
        </div>
        <div className="quick-toggles"><Toggle label="오늘 일퀘·몬파 미완료" checked={s.todayDaily} onChange={v => set("todayDaily", v)} /><Toggle label="이번 주 주간 미완료" checked={s.weeklyOpen} onChange={v => set("weeklyOpen", v)} /><Toggle label="이번 주 챌린저스 미수령" checked={s.challengerUnclaimed} onChange={v => set("challengerUnclaimed", v)} /></div>
        <details><summary>패스 · 이벤트 설정 <span>11</span></summary><div className="detail-body">
          <Toggle label="챌린저스 EXP 패스" checked={s.challengerExp} onChange={v => set("challengerExp", v)} /><Toggle label="프라임 모멘텀 패스" checked={s.momentumPrime} onChange={v => set("momentumPrime", v)} /><Toggle label="모멘텀 메카베리 모아쓰기" checked={s.deferMomentumMech} onChange={v => set("deferMomentumMech", v)} />
          <div className="field-grid compact inset"><label className="field"><span>메카베리 사용 레벨</span><select value={s.momentumMechLevel} disabled={!s.deferMomentumMech} onChange={e => set("momentumMechLevel", Number(e.target.value))}>{[280, 281, 282, 283, 284].map(level => <option key={level}>{level}</option>)}</select></label><InputField label="최종 사용일" value={s.momentumMechDeadline} type="date" disabled={!s.deferMomentumMech} onChange={v => set("momentumMechDeadline", v)} /></div>
          <Toggle label="7월 NOW 보상" checked={s.apology} onChange={v => set("apology", v)} /><Toggle label="스펙터 블래스트 미완료" checked={s.specter} onChange={v => set("specter", v)} /><Toggle label="울티마 스쿼드 EXP 5,000장" checked={s.shardEvent} onChange={v => set("shardEvent", v)} /><Toggle label="울티마 작전 일지" checked={s.ultima} onChange={v => set("ultima", v)} /><Toggle label="메포샵 메카베리 · 매주 2장" checked={s.shopMech} onChange={v => set("shopMech", v)} /><Toggle label="메포샵 블루베리 · 매주 2장" checked={s.shopBlue} onChange={v => set("shopBlue", v)} />
        </div></details>
        <details><summary>에테리온 · 콘텐츠 보정 <span>18</span></summary><div className="detail-body">
          <Toggle label="코어 6레벨 적용" checked={s.core6Enabled} onChange={v => set("core6Enabled", v)} /><div className="callout-mini">이번 주는 변경 전 5레벨. 7/23부터 5레벨 기본, 6레벨은 선택 시 적용합니다.</div>
          <div className="field-grid compact"><InputField label="5레벨 몬파 · 7/22까지 %" value={s.mpNow} onChange={v => set("mpNow", Number(v))} /><InputField label="5레벨 몬파 · 7/23부터 %" value={s.mpPatch} onChange={v => set("mpPatch", Number(v))} /><InputField label="코어 총합 20 달성일" value={s.core20Date} type="date" onChange={v => set("core20Date", v)} /><InputField label="총합 20 몬파 추가 %" value={s.core20Bonus} onChange={v => set("core20Bonus", Number(v))} /><InputField label="6레벨 달성일" value={s.core6Date} type="date" disabled={!s.core6Enabled} onChange={v => set("core6Date", v)} /><InputField label="6레벨 몬파 %" value={s.mpCore6} disabled={!s.core6Enabled} onChange={v => set("mpCore6", Number(v))} /><InputField label="5레벨 일퀘 · 현재 %" value={s.dailyNow} onChange={v => set("dailyNow", Number(v))} /><InputField label="5레벨 일퀘 · 패치 후 %" value={s.dailyPatch} onChange={v => set("dailyPatch", Number(v))} /><InputField label="6레벨 일퀘 %" value={s.dailyCore6} disabled={!s.core6Enabled} onChange={v => set("dailyCore6", Number(v))} /></div>
          <Toggle label="그란디스 일퀘" checked={s.grandis} onChange={v => set("grandis", v)} /><Toggle label="익스트림 몬스터파크" checked={s.extreme} onChange={v => set("extreme", v)} /><Toggle label="악몽선경 1단계" checked={s.epic} onChange={v => set("epic", v)} />
          <div className="field-grid compact"><label className="field"><span>악몽선경 보상 배수</span><select value={s.epicMult} onChange={e => set("epicMult", Number(e.target.value))}><option value={1}>기본</option><option value={5}>4배 추가</option><option value={9}>8배 추가</option></select></label><InputField label="5레벨 에픽 · 현재 %" value={s.epicNow} onChange={v => set("epicNow", Number(v))} /><InputField label="5레벨 에픽 · 패치 후 %" value={s.epicPatch} onChange={v => set("epicPatch", Number(v))} /><InputField label="코어 총합 25 달성일" value={s.core25Date} type="date" onChange={v => set("core25Date", v)} /><InputField label="총합 25 에픽 추가 %" value={s.core25Bonus} onChange={v => set("core25Bonus", Number(v))} /><InputField label="에픽 아티팩트 활성일" value={s.epicArtifactDate} type="date" onChange={v => set("epicArtifactDate", v)} /><InputField label="아티팩트 후 5레벨 %" value={s.epicArtifact} onChange={v => set("epicArtifact", Number(v))} /><InputField label="6레벨 · 아티팩트 전 %" value={s.epicCore6} disabled={!s.core6Enabled} onChange={v => set("epicCore6", Number(v))} /><InputField label="6레벨 · 아티팩트 후 %" value={s.epicCore6Artifact} disabled={!s.core6Enabled} onChange={v => set("epicCore6Artifact", Number(v))} /></div>
        </div></details>
        <details><summary>보유 보상 · 울티마 <span>8</span></summary><div className="detail-body"><div className="field-grid compact"><InputField label="보유 블루베리" value={s.ownedBlue} min={0} onChange={v => set("ownedBlue", Number(v))} /><InputField label="보유 메카베리" value={s.ownedMech} min={0} onChange={v => set("ownedMech", Number(v))} /><InputField label="보유 사우나 시간" value={s.ownedSauna} min={0} onChange={v => set("ownedSauna", Number(v))} /><InputField label="보유 상급 EXP" value={s.ownedAdv} min={0} onChange={v => set("ownedAdv", Number(v))} /><InputField label="EXP 5,000 사용일" value={s.shardDate} type="date" disabled={!s.shardEvent} onChange={v => set("shardDate", v)} /><InputField label="상급 EXP 사용량" value={s.shardAdv} disabled={!s.shardEvent} onChange={v => set("shardAdv", Number(v))} /><InputField label="울티마 누적 출석" value={s.ultimaCount} disabled={!s.ultima} onChange={v => set("ultimaCount", Number(v))} /><InputField label="이번 주 이미 출석" value={s.ultimaWeek} disabled={!s.ultima} onChange={v => set("ultimaWeek", Number(v))} /></div><Toggle label="시작일 울티마 출석 예정" checked={s.ultimaStart} disabled={!s.ultima} onChange={v => set("ultimaStart", v)} /></div></details>
      </aside>

      <div className="results">
        <div className="section-heading"><span>02</span><div><p>시나리오 비교</p><h2>레벨업 타임라인</h2></div><button className="reset" onClick={() => setS(defaults)}>기본값 복원</button></div>
        <ProgressChart selected={r} sunday={calc.sunday} free={calc.free} />
        <div className="route-grid">
          <article className="route-card chosen"><div><span>선택</span><h3>{r.scheduleLabel}</h3></div><strong>{shortDate(r.reached)}</strong><dl><div><dt>몬파</dt><dd>{formatMP(r.monsterParkMaplePoints)}</dd></div><div><dt>메포샵</dt><dd>{formatMP(r.shopMaplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.selectedHardWeeks}회</dd></div></dl></article>
          <article className="route-card"><div><span>가성비</span><h3>평일 2판 · 일요일 7판</h3></div><strong>{shortDate(calc.sunday.reached)}</strong><dl><div><dt>총 비용</dt><dd>{formatMP(calc.sunday.maplePoints)}</dd></div><div><dt>하드</dt><dd>{calc.sundayHardWeeks}회</dd></div></dl></article>
          <article className="route-card"><div><span>무료</span><h3>매일 2판</h3></div><strong>{shortDate(calc.free.reached)}</strong><dl><div><dt>몬파</dt><dd>0 MP</dd></div><div><dt>총 비용</dt><dd>{formatMP(calc.free.maplePoints)}</dd></div></dl></article>
        </div>
        <div className="decision-card"><div className="decision-top"><div><span>HARD MAYRIN ROI</span><h3>한 주를 당기는 실제 가격</h3></div><strong className={calc.netValue >= 0 ? "positive" : "negative"}>{calc.netValue >= 0 ? "+" : ""}{eok(calc.netValue)} 메소</strong></div><div className="roi-grid"><div><span>추가 메이플포인트</span><b>{formatMP(calc.incrementalMP)}</b><small>{eok(calc.extraCostValue)} 환산</small></div><div><span>하드 추가 횟수</span><b>{calc.gainedHardWeeks}회</b><small>노말→하드 가치 {eok(calc.hardValue)}</small></div><div><span>보상 회수</span><b>{eok(calc.recoveredValue)}</b><small>회수율 {calc.recoveryRate.toFixed(1)}%</small></div></div><p>이미 돌린 몬파 7판은 현재 경험치에 들어간 매몰비용입니다. 이 표는 오늘 이후 평일 7판만 비교합니다.</p></div>
        <details className="value-settings"><summary>메이린 가치·환율 수정</summary><div className="field-grid"><InputField label="노말→하드 결정석 차이 · 억" value={s.mayrinMesoGap} step={0.1} onChange={v => set("mayrinMesoGap", Number(v))} /><InputField label="노말 조각 예상량" value={s.mayrinNormalFrag} onChange={v => set("mayrinNormalFrag", Number(v))} /><InputField label="조각 1개 · 만 메소" value={s.fragPrice} step={10} onChange={v => set("fragPrice", Number(v))} /><InputField label="메소 1억당 MP" value={s.mpPerEok} step={100} onChange={v => set("mpPerEok", Number(v))} /></div><Toggle label="9/17 초기화 후 추가 1회 가정" checked={s.postReset} onChange={v => set("postReset", v)} /></details>
      </div>
    </section>

    <section className="strategy-band"><div><span>03 · REWARD TIMING</span><h2>메카베리는<br />늦게 쓸수록 세다.</h2></div><div className="strategy-copy"><p>모멘텀 메카베리 1장은 280보다 <b>{r.momentumMechLevel}에서 절대 경험치가 약 {calc.mechGain.toFixed(1)}% 큽니다.</b> 기본 전략은 {r.momentumMechLevel}레벨 또는 {shortDate(r.momentumMechDeadline)} 중 빠른 시점까지 모아두는 것입니다.</p><div className="timing-compare"><span>모아쓰기 <b>{shortDate(r.reached)} · {formatMP(r.maplePoints)}</b></span><span>즉시사용 <b>{shortDate(calc.immediate.reached)} · {formatMP(calc.immediate.maplePoints)}</b></span></div><small>목요일 주차를 놓치거나 메포샵을 한 주 더 사게 되면 목표 레벨 전이라도 먼저 사용합니다.</small></div></section>

    <section className="rewards-section" id="rewards">
      <div className="section-heading light"><span>04</span><div><p>도달 시점 잔여분</p><h2>285 뒤에 남는 보상</h2></div></div>
      <div className="leftover-grid">{leftoverRows.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="leftover-note">{r.leftoverSources.length ? `남는 보상 출처 · ${r.leftoverSources.join(" · ")}` : "계산에 넣은 성장 보상은 모두 사용합니다."} {momentumLeft ? "추천 경로에서는 모멘텀 4주차 보상이 285 뒤에 남습니다." : "모멘텀 4주차 보상까지 사용합니다."}</p>
      <div className="pass-grid"><article><div className="table-title"><span>CHALLENGERS</span><h3>챌린저스 EXP 패스</h3></div><table><thead><tr><th>구간</th><th>일반</th><th>EXP 패스</th></tr></thead><tbody><tr><td>21~25</td><td>상급 EXP 100</td><td>블루베리 3 · 사우나 1시간 · 상급 EXP 1,100</td></tr><tr><td>26~30</td><td>상급 EXP 2,100</td><td>블루베리 2 · 사우나 1시간 · 상급 EXP 3,100 · 비약 1</td></tr><tr className="total"><td>합계</td><td>상급 EXP 2,200</td><td>블루베리 5 · 사우나 2시간 · 상급 EXP 4,200 · 비약 1</td></tr></tbody></table></article><article><div className="table-title"><span>MOMENTUM</span><h3>모멘텀 패스</h3></div><table><thead><tr><th>주차</th><th>프라임 핵심 보상</th></tr></thead><tbody><tr><td>1주 · 7/23</td><td>메카베리 2 · 사우나 30분 · 4배 쿠폰 2</td></tr><tr><td>2주 · 7/30</td><td>메카베리 2 · 사우나 30분 · 상급 EXP 3,100 · 4배 2</td></tr><tr><td>3주 · 8/6</td><td>메카베리 3 · 사우나 30분 · 상급 EXP 3,100 · 4배 2</td></tr><tr><td>4주 · 8/13</td><td>메카베리 4 · 상급 EXP 3,300</td></tr><tr className="total"><td>합계</td><td>메카베리 11 · 사우나 1.5시간 · 상급 EXP 9,500</td></tr></tbody></table></article></div>
    </section>

    <section className="audit" id="sources"><div><span>CALCULATION AUDIT</span><h2>무엇을 넣었는지<br />숨기지 않았습니다.</h2></div><ul><li><b>매일</b> 그란디스 일퀘, 몬스터파크, 선택한 사냥 경험치</li><li><b>매주</b> 익스트림 몬파, 악몽선경 1단계, 메포샵 농장 2장씩</li><li><b>패치</b> 7/23 코어 4개·총합 20, 8/6 코어 5개·총합 25</li><li><b>선택</b> 에테리온 아티팩트 코어 6레벨 토글과 달성일</li><li><b>이벤트</b> 스펙터 블래스트, 울티마 스쿼드 EXP 5,000, 울티마 작전 일지</li><li><b>비약</b> 200~269 고정 경험치 0.072458, 200~279 고정 경험치 0.49505</li></ul></section>
    <footer><div className="brand"><span className="brand-mark">M</span><span>285 PLANNER</span></div><p>경험치 효율표와 공식 업데이트 수치를 바탕으로 만든 전략 계산기 · 2026.07.17 기준</p><div className="source-links"><a href="https://mapleroad.kr/utils/exp_calculator" target="_blank" rel="noreferrer">메이플로드 계산기</a><a href="https://maplestory.nexon.com/news/update/805" target="_blank" rel="noreferrer">공식 업데이트</a><a href="https://maplestory.nexon.com/testworld/news/all/188" target="_blank" rel="noreferrer">테스트월드</a></div></footer>
  </main>;
}
