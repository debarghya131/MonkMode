import { computeGoalWeeklyReport, goalReportDays } from "../../../../shared/goalWeeklyStats.js";
import { shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

const specifications = [["2026-04-13", [3, 2, 1], 7], ["2026-04-06", [2, 1, 1], 5], ["2026-03-30", [2, 2, 1], 4]];
export const DEMO_GOAL_REPORTS = Object.fromEntries(specifications.map(([id, completedCounts, books]) => {
  const days = goalReportDays(id), goals = [], logs = [];
  ["Build a portfolio", "Prepare for exams", "Learn databases"].forEach((title, index) => {
    const goalId = `${id}-milestones-${index}`;
    const subgoals = Array.from({ length: 4 }, (_, offset) => ({ _id: `${goalId}-sub-${offset}`, title: `Sample milestone ${offset + 1}`,
      createdAt: "2026-03-01", updatedAt: days[6], completed: offset < completedCounts[index],
      completedAt: offset < completedCounts[index] ? days[offset + 1] + "T12:00:00+05:30" : null }));
    goals.push({ _id: goalId, title, goalType: index === 1 ? "long-term" : "short-term", priority: index === 2 ? "Medium" : "High",
      createdAt: "2026-03-01", updatedAt: days[6], startDate: "2026-03-01", deadline: index === 1 ? "2026-12-31" : "2026-05-30",
      subgoals, activityLogs: subgoals.filter(sub => sub.completed).map(sub => ({ action: "subgoal_completed", subgoalId: sub._id, title: sub.title, at: sub.completedAt })) });
  });
  goals.push({ _id: `${id}-books`, title: "Read 20 books", priority: "Medium", goalType: "long-term", createdAt: "2026-03-01", updatedAt: days[6],
    startDate: "2026-03-01", deadline: "2026-12-31", currentValue: books, targetValue: 20, subgoals: [] });
  logs.push({ goalId: `${id}-books`, previousValue: books - 1, currentValue: books, date: days[4] + "T12:00:00+05:30" });
  goals.push({ _id: `${id}-practice`, title: "Practice drawing", priority: "Low", createdAt: "2026-03-01", updatedAt: days[6], currentValue: 5, targetValue: 20, subgoals: [] });
  goals.push({ _id: `${id}-imported`, title: "Imported goal", priority: "Low", createdAt: "2026-03-01", updatedAt: shiftReportDay(days[6], 2), currentValue: 90, targetValue: 100, subgoals: [] });
  const report = computeGoalWeeklyReport(goals, logs, days, { today: "2026-04-20" });
  report.aiSummary = `This sample week records ${report.stats.completedMilestonesThisWeek} distinct milestone completions and ${report.stats.progressUpdatesThisWeek} progress update. Average progress is ${report.stats.avgProgress}% across ${report.stats.knownProgressGoals} goals with known progress; ${report.stats.unknownProgressGoals} goal has unavailable history. Pace comparisons use each retained start date and deadline, not a prediction. For next week, choose one milestone from a goal behind its calendar pace and set a review reminder.`;
  return [id, report];
}));
export const DEMO_GOAL_SUMMARIES = Object.values(DEMO_GOAL_REPORTS).map(({ id, date, signal, stats, weeklyScore }) => ({ id, date, signal, goalCount: stats.goalCount,
  completedMilestonesThisWeek: stats.completedMilestonesThisWeek, progressUpdatesThisWeek: stats.progressUpdatesThisWeek, avgProgress: stats.avgProgress, weeklyScore }));
