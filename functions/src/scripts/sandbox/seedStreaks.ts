import { format, subDays } from 'date-fns';
import { SandboxContext } from './config';

export async function seedStreaks(ctx: SandboxContext): Promise<void> {
  const completedDates: string[] = [];
  for (let i = 0; i < ctx.assignments.length; i++) {
    const response = ctx.responses[i];
    if (response && response.user1Responded && response.user2Responded) {
      completedDates.push(format(ctx.assignments[i].date, 'yyyy-MM-dd'));
    }
  }

  completedDates.sort();

  const today = format(new Date(), 'yyyy-MM-dd');
  let currentStreak = 0;
  let checkDate = today;

  while (completedDates.includes(checkDate)) {
    currentStreak++;
    checkDate = format(subDays(new Date(checkDate), 1), 'yyyy-MM-dd');
  }

  let longestStreak = 0;
  let runningStreak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = new Date(completedDates[i - 1]);
    const curr = new Date(completedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      runningStreak++;
    } else {
      longestStreak = Math.max(longestStreak, runningStreak);
      runningStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runningStreak);

  const lastStreakDate = completedDates.length > 0 ? completedDates[completedDates.length - 1] : null;

  await ctx.db.collection('couples').doc(ctx.coupleId).update({
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_streak_date: lastStreakDate,
  });

  console.log(`  Streak: current=${currentStreak}, longest=${longestStreak}`);
}
