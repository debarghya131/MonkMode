import { validReportDay, shiftReportDay } from "../../../../shared/journalWeeklyStats.js";

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string";
const nonblank = value => text(value) && Boolean(value.trim());
const number = value => typeof value === "number" && Number.isFinite(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const percent = value => number(value) && value >= 0 && value <= 100;
const boolean = value => typeof value === "boolean";
const nullable = check => value => value === null || check(value);
const optional = check => value => value === undefined || check(value);
const rows = check => value => Array.isArray(value) && value.every(check);
const fields = schema => value => object(value) && Object.entries(schema).every(([key, check]) => check(value[key]));
const named = (names, check) => Object.fromEntries(names.split(" ").map(key => [key, check]));
const choice = values => value => values.includes(value);
const priority = choice(["High", "Medium", "Low"]);
const monday = value => validReportDay(value) && new Date(`${value}T12:00:00Z`).getUTCDay() === 1;
const counts = named("total completed missed pending", count);
const category = fields({ name: nonblank, ...counts });
const priorities = rows(fields({ priority, ...counts }));
const daily = fields({ dayKey: validReportDay, day: nonblank, future: boolean, ...counts });
const missed = fields({ id: nonblank, dayKey: validReportDay, day: nonblank, title: text, category: text, time: text });
const topMood = nullable(fields({ label: nonblank, emoji: text, days: count }));
const extreme = fields({ day: text, value: nullable(number) });
const metric = fields({ avg: nullable(percent), recordedDays: count, highest: extreme, lowest: extreme });
const countMetric = fields({ total: count, activeDays: count, highest: extreme, lowest: extreme });
const goal = fields({ id: nonblank, title: text, type: choice(["Short Term", "Long Term"]), priority,
  progress: nullable(percent), expected: nullable(percent), isCompleted: boolean, deadline: nullable(text), deadlineDay: nullable(validReportDay),
  completed: nullable(count), total: nullable(count), completedThisWeek: count, progressUpdatesThisWeek: count,
  currentValue: nullable(number), targetValue: nullable(number), historyLimited: boolean, progressBasis: text,
  deleted: boolean, asOf: validReportDay, risk: nonblank });
const countMap = value => object(value) && Object.values(value).every(count);
const photo = fields({ day: text, dayKey: validReportDay, photo: nullable(text), count });
const base = { id: monday, date: nonblank, status: choice(["Ready", "Draft"]), weeklyScore: nullable(percent),
  savedAnalysis: optional(value => validWeeklyAiResponse(value)), photosOmitted: optional(boolean) };
const activity = { signal: text, ...named("completed missed pending activeDays scheduledDays longestStreak", count),
  consistency: percent, completionRate: percent, categories: rows(category), priorityStats: priorities, dailyStats: rows(daily) };
const schemas = {
  journal: fields({ ...base, signal: text, ...named("loggedDays expectedDays longestStreak", count), consistency: percent, topMood,
    stats: fields({ energy: metric, rating: metric, wins: countMetric, mistakes: countMetric, achievements: countMetric,
      sleep: fields(named("avgWakeUp avgSleepTime avgDuration", text)) }),
    missedDays: rows(fields({ date: validReportDay, label: text, note: optional(text), reason: nullable(text) })) }),
  todo: fields({ ...base, ...activity, totalTasks: count, lateCompleted: count, importantCategories: rows(category),
    completionTiming: rows(fields({ range: text, count, total: count })), missedTiming: rows(fields({ range: text, count, total: count })),
    missedTasks: rows(value => missed(value) && priority(value.priority)), missedTasksTotal: count, missedTasksTruncated: boolean }),
  habit: fields({ ...base, ...activity, totalInstances: count,
    habits: rows(fields({ id: nonblank, name: text, category: text, priority,
      timeOfDay: choice(["Morning", "Afternoon", "Evening", "Night", "Unspecified"]), targetStreak: nullable(count), ...counts,
      ...named("streak longestStreak completedDays totalDays", count), repeat: text })),
    missedHabits: rows(missed), missedHabitsTotal: count, missedHabitsTruncated: boolean }),
  goal: fields({ ...base, signal: text, asOf: validReportDay, goals: rows(goal), historyNote: nullable(text),
    stats: fields({ ...named("goalCount knownProgressGoals unknownProgressGoals completedGoals totalMilestones completedMilestones pendingMilestones unknownMilestoneGoals completedMilestonesThisWeek progressUpdatesThisWeek activeDays", count),
      avgProgress: nullable(percent), riskCounts: countMap }) }),
  gym: fields({ ...base, asOf: validReportDay, workoutDays: count, totalDays: count, avgWorkoutTime: text, totalVolume: text,
    consistencyScore: percent, dataNote: text,
    stats: fields({ ...named("exerciseLogs uniqueExercises totalSets timedLogs timedDays volumeLogs measurementDays photoCount photoDays", count),
      totalTimeMin: number, avgTimeMin: nullable(number), totalVolumeKg: nullable(number), bodyGroupCounts: countMap }),
    strengthProgress: rows(fields({ id: nonblank, ...named("exercise bodyGroup previous current totalTime", text),
      previousDate: nullable(validReportDay), currentDate: validReportDay, improvement: nullable(text), sets: nullable(count),
      repsChange: nullable(number), timeChange: nullable(number), isFirstEntry: boolean })),
    bodyProgress: rows(fields({ id: nonblank, ...named("bodyPart category previous current change", text), delta: nullable(number),
      trend: choice(["up", "down", "flat"]), previousDate: nullable(validReportDay), currentDate: validReportDay })),
    progressPhotos: rows(photo), photoEntries: rows(fields({ id: nonblank, day: text, dayKey: validReportDay, photo: optional(text) })),
    nutrition: nullable(fields({ ...named("avgProtein avgCarbs avgFats avgFiber avgCalories avgWater avgSugar avgSodium note", text), dayCount: count, counts: countMap })) }),
};

// Optional summary metadata differs by module. Validate any supplied values
// that the views consume, without inventing missing metrics or empty history.
const summary = fields({ id: monday, date: nonblank, signal: optional(text), status: optional(text), topMood: optional(topMood),
  ...named("loggedDays expectedDays longestStreak taskCount totalTasks completed pending missed activeDays scheduledDays habitCount totalInstances goalCount completedMilestonesThisWeek progressUpdatesThisWeek workoutDays exerciseLogs measurementDays photoCount", optional(count)),
  ...named("consistency completionRate weeklyScore avgProgress", optional(nullable(percent))), goals: optional(rows(goal)) });

export function validWeeklySummaries(value) {
  return Array.isArray(value) && value.every(summary) && new Set(value.map(row => row.id)).size === value.length;
}

export function validWeeklyReport(value, module, week) {
  if (!Object.hasOwn(schemas, module) || !schemas[module](value) || value.id !== week) return false;
  // The seven daily rows must stay aligned with the selected calendar week.
  const days = module === "gym" ? value.progressPhotos : value.dailyStats;
  return !days || (days.length === 7 && days.every((row, index) => row.dayKey === shiftReportDay(week, index)));
}

export function validWeeklyAiResponse(value, requireText = false) {
  return fields({ aiSummary: requireText ? nonblank : nullable(nonblank), warning: optional(text), error: optional(text),
    ...named("cached stale needsGeneration persisted", optional(boolean)) })(value);
}

export function validWeeklyGymPhotos(value, week) {
  return fields({ id: monday, progressPhotos: rows(photo), photoEntries: rows(fields({
    id: nonblank, day: text, dayKey: validReportDay, photo: text,
  })) })(value) && value.id === week && value.progressPhotos.length === 7 &&
    value.progressPhotos.every((row, index) => row.dayKey === shiftReportDay(week, index)) &&
    value.photoEntries.every(row => row.dayKey >= week && row.dayKey <= shiftReportDay(week, 6));
}

// During a rolling deploy, the API may still return the old report shape.
// Only those responses need the legacy cache-only analysis request.
export async function readWeeklySavedAnalysis(report, api, path, config) {
  if (report.savedAnalysis) return report.savedAnalysis;
  const { data } = await api.get(path, config);
  if (!validWeeklyAiResponse(data)) throw new Error("Invalid analysis response");
  return data;
}

export function weeklyFailureMessage(error, fallback) {
  return [error?.response?.data?.error, error?.response?.data?.message].find(nonblank) || fallback;
}
