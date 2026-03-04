export function calculateConsistency(daysMet, totalDays) {
  return totalDays === 0 ? 0 : (daysMet / totalDays) * 100;
}

export function calculateTargetAdherence(totalMinutes, requiredMinutes) {
  return requiredMinutes === 0 ? 0 : (totalMinutes / requiredMinutes) * 100;
}

export function calculateStreakDominance(current, longest) {
  return longest === 0 ? 0 : current / longest;
}

export function weightedScore(binaryRate, adherence, streakRatio) {
  const w1 = 0.3, w2 = 0.4, w3 = 0.3;
  return (binaryRate*w1) + (adherence*w2) + (streakRatio*w3);
}