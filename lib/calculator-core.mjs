export function monsterParkExperiencePercent({
  baseSevenRunPercent,
  runs,
  contentBonusPercent,
  sundayKind = "none",
}) {
  const sundayBonus = sundayKind === "special" ? 3 : sundayKind === "normal" ? 0.5 : 0;
  return baseSevenRunPercent * (runs / 7) * (1 + contentBonusPercent / 100 + sundayBonus);
}

export function growthPotionExperience(requiredExperience) {
  return Math.max(0, requiredExperience);
}

export function advanceBurningBeyondExperience({
  level,
  experience,
  gainedExperience,
  requiredExperience,
}) {
  let currentLevel = level;
  let currentExperience = experience;
  let remainingExperience = gainedExperience;

  while (remainingExperience > 0.000000001 && currentLevel < 280) {
    const needed = requiredExperience(currentLevel) - currentExperience;
    if (remainingExperience + 0.000000001 < needed) {
      currentExperience += remainingExperience;
      remainingExperience = 0;
    } else {
      remainingExperience -= needed;
      currentLevel = Math.min(280, currentLevel + 2);
      currentExperience = 0;
    }
  }

  if (currentLevel === 280 && remainingExperience > 0) {
    currentExperience += remainingExperience;
  }

  return { level: currentLevel, experience: currentExperience };
}

export function paidMonsterParkMaplePoints(runs) {
  return Math.max(0, runs - 2) * 600;
}
