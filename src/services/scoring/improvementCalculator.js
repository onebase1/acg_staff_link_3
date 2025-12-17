/**
 * 📈 IMPROVEMENT CALCULATOR
 * 
 * Calculates personalized tips for staff to improve their reliability score.
 * Based on current breakdown and streak data.
 */

/**
 * Calculate improvement tips based on current score breakdown
 * @param {Object} breakdown - Current score breakdown {base, attendance, ratings, loyalty, penalties, streak_bonus, urgency_bonus}
 * @param {number} currentStreak - Current consecutive shift streak
 * @returns {Array} - Array of improvement tips with action, points, and icon
 */
export const calculateImprovementTips = (breakdown = {}, currentStreak = 0) => {
  const tips = [];

  // 1. Streak tip - if not at max streak bonus
  if (currentStreak < 10) {
    if (currentStreak < 3) {
      tips.push({
        action: `Complete ${3 - currentStreak} more shifts without issues to start a streak`,
        points: 10,
        icon: '🔥',
        priority: 1
      });
    } else if (currentStreak < 5) {
      tips.push({
        action: `Complete ${5 - currentStreak} more shifts to reach 5-shift streak bonus (+15 pts)`,
        points: 5,
        icon: '🔥',
        priority: 1
      });
    } else if (currentStreak < 10) {
      tips.push({
        action: `Complete ${10 - currentStreak} more shifts to reach 10-shift streak bonus (+25 pts)`,
        points: 10,
        icon: '🔥',
        priority: 1
      });
    }
  }

  // 2. Rating tip - if ratings less than max (20)
  const currentRatings = breakdown.ratings || 0;
  if (currentRatings < 20) {
    const pointsNeeded = 20 - currentRatings;
    const ratingsNeeded = Math.ceil(pointsNeeded / 5);
    tips.push({
      action: `Get ${ratingsNeeded} more 5-star rating${ratingsNeeded > 1 ? 's' : ''} from clients`,
      points: pointsNeeded,
      icon: '⭐',
      priority: 2
    });
  }

  // 3. Attendance tip - if attendance less than max (20)
  const currentAttendance = breakdown.attendance || 0;
  if (currentAttendance < 20) {
    const shiftsNeeded = Math.ceil((20 - currentAttendance) / 2);
    tips.push({
      action: `Complete ${shiftsNeeded} more shift${shiftsNeeded > 1 ? 's' : ''} to max out attendance bonus`,
      points: 20 - currentAttendance,
      icon: '✅',
      priority: 3
    });
  }

  // 4. Penalty decay tip - if has penalties
  const penalties = breakdown.penalties || 0;
  if (penalties < 0) {
    tips.push({
      action: 'Stay incident-free for 1 month to reduce penalty impact by 5%',
      points: Math.abs(Math.round(penalties * 0.05)),
      icon: '⏳',
      priority: 4
    });
  }

  // 5. Urgency hero tip - if less than max (25)
  const urgencyBonus = breakdown.urgency_bonus || 0;
  if (urgencyBonus < 25) {
    tips.push({
      action: 'Cover an urgent shift (24h notice) to earn +5 Urgency Hero points',
      points: 5,
      icon: '⚡',
      priority: 5
    });
  }

  // Sort by priority and return top 3
  return tips
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map(({ action, points, icon }) => ({ action, points, icon }));
};

/**
 * Get badge eligibility status
 * @param {Object} staffData - Staff profile data
 * @returns {Array} - Array of badge eligibility info
 */
export const getBadgeEligibility = (staffData = {}) => {
  const eligibility = [];

  // Reliable badge - 10+ completed shifts
  const completedShifts = staffData.completed_shifts_count || 0;
  if (completedShifts < 10) {
    eligibility.push({
      badge: 'reliable',
      name: 'Reliable',
      progress: completedShifts,
      target: 10,
      remaining: 10 - completedShifts,
      description: 'Complete 10 shifts'
    });
  }

  // On Fire badge - 5+ streak
  const currentStreak = staffData.current_streak || 0;
  if (currentStreak < 5) {
    eligibility.push({
      badge: 'on_fire',
      name: 'On Fire',
      progress: currentStreak,
      target: 5,
      remaining: 5 - currentStreak,
      description: 'Reach a 5-shift streak'
    });
  }

  // Urgency Hero badge - 3+ urgent shifts
  const urgentCovered = staffData.urgent_shifts_covered || 0;
  if (urgentCovered < 3) {
    eligibility.push({
      badge: 'urgency_hero',
      name: 'Urgency Hero',
      progress: urgentCovered,
      target: 3,
      remaining: 3 - urgentCovered,
      description: 'Cover 3 urgent shifts'
    });
  }

  return eligibility;
};

export default {
  calculateImprovementTips,
  getBadgeEligibility
};

