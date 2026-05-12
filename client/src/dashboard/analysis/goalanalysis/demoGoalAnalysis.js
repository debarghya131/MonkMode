import { GOALS } from "../../../../data/GoalDummyData";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toGoalType = (type) => (String(type).toLowerCase().includes("long") ? "Long Term" : "Short Term");

const getDaysInMonth = (year, month) => new Date(Number(year), Number(month), 0).getDate();

const getDemoProgress = (goal, index) => {
  const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
  if (milestones.length) {
    const completed = milestones.filter((milestone) => milestone.completed).length;
    return Math.round((completed / milestones.length) * 100);
  }

  return clamp(24 + ((index * 17) % 58), 0, 100);
};

const getExpectedProgress = (goal, year, month, progress, index) => {
  if (!goal.deadline) return clamp(progress + 8, 0, 100);

  const deadline = new Date(`${goal.deadline}T00:00:00`);
  const checkpoint = new Date(Number(year), Number(month), 0);
  const demoStart = new Date(2026, 0, 1);
  const totalMs = Math.max(1, deadline.getTime() - demoStart.getTime());
  const elapsedMs = Math.max(0, Math.min(checkpoint.getTime(), deadline.getTime()) - demoStart.getTime());
  const calendarExpected = Math.round((elapsedMs / totalMs) * 100);

  return clamp(Math.max(calendarExpected, progress + ((index % 3) * 6 - 4)), 0, 100);
};

const buildSubgoalByDay = (year, month, activeGoals) => {
  const daysInMonth = getDaysInMonth(year, month);
  const events = new Map();

  activeGoals.forEach((goal, goalIndex) => {
    const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
    milestones.forEach((milestone, milestoneIndex) => {
      if (!milestone.completed) return;
      const day = 3 + ((goalIndex * 5 + milestoneIndex * 7) % Math.max(1, daysInMonth - 4));
      events.set(day, (events.get(day) || 0) + 1);
    });
  });

  let cumulative = 0;
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    cumulative += events.get(day) || 0;
    return { day, completed: cumulative };
  });
};

export function buildDemoGoalAnalysis(year, month) {
  const activeGoals = GOALS.filter((goal) => goal.status !== "Archived");
  const today = new Date();

  const goals = activeGoals.map((goal, index) => {
    const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
    const totalSubgoals = milestones.length;
    const completedSubgoals = milestones.filter((milestone) => milestone.completed).length;
    const progress = getDemoProgress(goal, index);
    const expected = getExpectedProgress(goal, year, month, progress, index);
    const deadline = goal.deadline ? new Date(`${goal.deadline}T00:00:00`) : null;
    const deadlineDays = deadline
      ? Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000))
      : null;

    return {
      title: goal.title,
      type: toGoalType(goal.type),
      priority: goal.priority,
      progress,
      totalSubgoals,
      completedSubgoals,
      lateCompletedSubgoals: milestones.filter((milestone) => milestone.completed && milestone.deadline < `${year}-${month}-01`).length,
      consistency: clamp(38 + ((index * 11 + completedSubgoals * 13) % 55), 0, 100),
      expected,
      deadlineDays,
      isCompleted: progress >= 100 || (totalSubgoals > 0 && completedSubgoals === totalSubgoals),
    };
  });

  return {
    year,
    month,
    goals,
    subgoalByDay: buildSubgoalByDay(year, month, activeGoals),
    weeklyScores: [72, 64, 81, 76],
  };
}
