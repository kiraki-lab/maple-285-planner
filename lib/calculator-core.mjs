// 몬스터파크 경험치 계산. 하루 7판 기준 %에 판수 비율과 보너스를 곱한다.
// sundayKind: "normal" 선데이 +50%, "special" 스페셜 선데이 +300% (보너스에 더하는 방식).
export function monsterParkExperiencePercent({
  baseSevenRunPercent,
  runs,
  contentBonusPercent,
  sundayKind = "none",
}) {
  const sundayBonus = sundayKind === "special" ? 3 : sundayKind === "normal" ? 0.5 : 0;
  return baseSevenRunPercent * (runs / 7) * (1 + contentBonusPercent / 100 + sundayBonus);
}
