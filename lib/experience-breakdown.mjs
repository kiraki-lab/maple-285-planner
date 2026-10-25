// 순서나 새 출처 추가와 무관하게 실제 엔진 sourceRaw를 전부 표시한다.
export const EXPERIENCE_SOURCE_LABELS = {
  monsterPark: "몬스터파크", grandis: "그란디스 일퀘", extreme: "익스트림 몬파(주간)", epic: "에픽 던전(주간)", routine: "일과(직접 입력)", weekly: "주간 컨텐츠(직접 입력)",
  flame: "퍼스널 플레임", coupon: "퍼스널 EXP 교환권", boss: "퍼스널 보스 미션", missionReward: "성장 미션 단계 보상",
  crimson: "크림슨 메카베리", adv: "상급 EXP 교환권", sauna: "VIP 사우나", blue: "블루베리", mech: "메카베리", potion: "성장의 비약",
  detectiveFreeMagnifier: "무료 탐정예티 돋보기", detectiveBoughtMagnifier: "구매 탐정예티 돋보기", ordinaryMagnifier: "수상한 돋보기",
  hunt: "사냥", coupon4x: "경험치 4배 쿠폰(PLUS)", booster: "VIP 부스터(PLUS)",
  compensationAdv: "상급 EXP(사과 보상)", compensationBooster: "VIP 부스터(사과 보상)",
  attendanceAdv: "상급 EXP(출석·보유)", attendanceSauna: "VIP 사우나(출석·보유)", attendanceBooster: "VIP 부스터(출석·보유)", attendancePotion269: "성장의 비약(200~269)", attendancePotion279: "성장의 비약(200~279)",
};

// a6b0999의 잔여 배분 방식. 원본 EXP를 다시 계산하지 않고 정수 표시만 합계에 맞춘다.
export function roundedExperienceSources(sourceRaw) {
  const entries = Object.entries(sourceRaw).filter(([, raw]) => raw > 0).map(([id, raw]) => ({ id, raw, shown: Math.floor(raw), fraction: raw - Math.floor(raw) }));
  const total = Math.round(entries.reduce((sum, entry) => sum + entry.raw, 0));
  const order = [...entries].sort((a, b) => b.fraction - a.fraction);
  const remaining = total - entries.reduce((sum, entry) => sum + entry.shown, 0);
  for (let i = 0; i < remaining; i += 1) order[i % order.length].shown += 1;
  return { entries, total };
}

// 기간의 정수 표시를 출처별로 날짜에 배분해 일별·주별·기간 합계가 모두 일치하게 한다.
export function dailyExperienceBreakdown(rows, sourceRaw) {
  const period = roundedExperienceSources(sourceRaw);
  const days = rows.map(() => ({ entries: [], total: 0 }));
  for (const source of period.entries) {
    const allocations = rows.map((row, index) => ({ index, raw: row.sourceRaw[source.id] || 0 }))
      .filter(day => day.raw > 0).map(day => ({ ...day, shown: Math.floor(day.raw), fraction: day.raw - Math.floor(day.raw) }));
    const order = [...allocations].sort((a, b) => b.fraction - a.fraction);
    const remaining = source.shown - allocations.reduce((sum, day) => sum + day.shown, 0);
    for (let i = 0; i < remaining; i += 1) order[i % order.length].shown += 1;
    for (const day of allocations) {
      days[day.index].entries.push({ id: source.id, shown: day.shown });
      days[day.index].total += day.shown;
    }
  }
  return { period, days };
}
