import { journalMonthDays } from "./journalAnalysisStats.js";
import { validReportDay } from "./journalWeeklyStats.js";
import { todoReportDay } from "./todoWeeklyStats.js";
import { computeGoalWeeklyReport } from "./goalWeeklyStats.js";

const rate = (part,total) => total ? Math.round(part/total*1000)/10 : null;
const distance = (a,b) => Math.round((Date.parse(b)-Date.parse(a))/86400000);
const stamp = value => Date.parse(value || "") || 0;
export const GOAL_ANALYSIS_NOTE = "Calculated from retained goals and progress history, not AI-generated. Past values may be unavailable after edits, milestone removal, or trimmed history. Unknown values are excluded, not treated as zero. Activity coverage is recorded engagement, not proof of daily goal adherence.";
export const GOAL_SCORE_NOTE = "Progress/pace score uses the weekly report formula: 60% mean known progress + 40% mean capped progress-to-linear-calendar-pace ratio. Goals without a usable schedule use their progress in the pace term. It is a heuristic, not a prediction. Activity score separately measures the share of eligible goals with recorded updates.";
export function computeGoalAnalysis(goals, logs, { year, month, today, timezone = "Asia/Kolkata", now = null }) {
  const calendar = journalMonthDays(year,month);
  if (!validReportDay(today)) throw new Error("Invalid app date");
  if (calendar[0]>today) throw new Error("Future months are not available for analysis.");
  const elapsed = calendar.filter(date=>date<=today), asOf = elapsed.at(-1) || null;
  const events = new Map(), dayCache = new Map();
  const monthly = computeGoalWeeklyReport(goals,logs,calendar,{today,timezone,now,dayCache,onActivity(event) {
    if (calendar.includes(event.day) && event.day <= today)
      events.set(event.goalId+":"+event.kind+":"+event.key+":"+event.day,event);
  }});
  const activities = [...events.values()];
  const dailyReports = new Map(elapsed.map(date=>[date,computeGoalWeeklyReport(goals,logs,[date],{today,timezone,now,dayCache})]));
  let cumulative = 0;
  const days = calendar.map(date=>{
    const future = date > today, report = dailyReports.get(date), daily = activities.filter(event=>event.day===date);
    const milestoneCheckins = future ? null : daily.filter(event=>event.kind==="milestone").length;
    if (!future) cumulative += milestoneCheckins;
    return { date,label:String(Number(date.slice(-2))),future,status:future ? "future" : report.stats.goalCount ? "eligible" : "no eligible goals",
      goalCount:future ? null : report.stats.goalCount, knownProgressGoals:future ? null : report.stats.knownProgressGoals,
      avgProgress:report?.stats.avgProgress ?? null, score:report?.weeklyScore ?? null,
      activeGoals:future ? null : new Set(daily.map(event=>event.goalId)).size,
      progressUpdates:future ? null : daily.filter(event=>event.kind==="progress").length,
      milestoneCheckins,cumulativeMilestoneCheckins:future ? null : cumulative };
  });
  const source = new Map();
  for (const goal of goals) {
    const id = String(goal._id || goal.id || ""), old = source.get(id);
    if (!old || stamp(goal.updatedAt)>=stamp(old.updatedAt)) source.set(id,{...goal,
      subgoals:Array.isArray(goal.subgoals) ? goal.subgoals.filter(Boolean) : [],
      activityLogs:Array.isArray(goal.activityLogs) ? goal.activityLogs.filter(Boolean) : []});
  }
  let lateMilestones = 0, unknownMilestoneTimings = 0;
  const rows = monthly.goals.map(goal=>{
    const raw = source.get(goal.id) || {}, goalEvents = activities.filter(event=>event.goalId===goal.id);
    const eligibleDays = elapsed.filter(date=>dailyReports.get(date).goals.some(row=>row.id===goal.id)).length;
    const activeDays = new Set(goalEvents.map(event=>event.day)).size;
    const metadataChanged = goal.asOf < today && (raw.activityLogs || []).some(entry=>entry.action==="edited" && todoReportDay(entry.at,timezone)>goal.asOf && (now===null || stamp(entry.at)<=now));
    const deadlineDay = metadataChanged ? null : goal.deadlineDay;
    const deadlineDays = deadlineDay ? distance(goal.asOf,deadlineDay) : null;
    const deadlineStatus = metadataChanged ? "History unavailable" : goal.deleted ? "Deleted" : goal.progress === null ? "History unavailable" : goal.isCompleted ? "Completed"
      : deadlineDays===null ? "No deadline" : deadlineDays<0 ? "Overdue" : deadlineDays===0 ? "Due today" : "Upcoming";
    const milestoneBased = raw.subgoals?.length>0 || goal.progressBasis==="Milestone history"
      || (goal.total===null && raw.activityLogs?.some(entry=>entry.action==="subgoal_deleted" && todoReportDay(entry.at,timezone)>goal.asOf));
    const result = { ...goal, label:goal.title, deadline:metadataChanged ? null : goal.deadline, deadlineDay, deadlineDays, deadlineStatus, eligibleDays,activeDays,consistency:rate(activeDays,eligibleDays),
      milestoneBased:Boolean(milestoneBased), milestoneCheckins:goalEvents.filter(event=>event.kind==="milestone").length,
      progressUpdates:goalEvents.filter(event=>event.kind==="progress").length };
    for (const sub of raw.subgoals || []) {
      const completedDay = todoReportDay(sub.completedAt,timezone), deadline = todoReportDay(sub.deadline,timezone);
      if (!sub.completed || !completedDay || completedDay>goal.asOf || todoReportDay(sub.createdAt,timezone)>goal.asOf || (now!==null && stamp(sub.completedAt)>now)) continue;
      const changed = (raw.activityLogs || []).some(entry=>entry.action==="subgoal_updated" && stamp(entry.at)>stamp(sub.completedAt)
        && (now===null || stamp(entry.at)<=now) && (entry.subgoalId && (sub._id || sub.id) ? String(entry.subgoalId)===String(sub._id || sub.id)
          : String(entry.title || "").split(" (Sub-goal in ")[0]===sub.title));
      if (!deadline || changed || metadataChanged || todoReportDay(sub.updatedAt,timezone)>goal.asOf) unknownMilestoneTimings++;
      else if (completedDay>deadline) lateMilestones++;
    }
    return result;
  });
  const titles = new Map(), ordinals = new Map();
  rows.forEach(row=>titles.set(row.title,(titles.get(row.title)||0)+1));
  rows.forEach(row=>{ if (titles.get(row.title)>1) { const ordinal=(ordinals.get(row.title)||0)+1;ordinals.set(row.title,ordinal);row.label=row.title+" · "+ordinal; } });
  const weeks = Array.from({length:Math.ceil(calendar.length/7)},(_,index)=>{
    const dates = calendar.slice(index*7,index*7+7), eligible = new Set(), active = new Set();
    for (const date of dates) for (const row of dailyReports.get(date)?.goals || []) eligible.add(row.id);
    for (const event of activities) if (dates.includes(event.day)) active.add(event.goalId);
    const eligibleDays = dates.filter(date=>(dailyReports.get(date)?.stats.goalCount || 0)>0).length;
    const activeDays = new Set(activities.filter(event=>dates.includes(event.day)).map(event=>event.day)).size;
    const checkpoint = dates.filter(date=>date<=today).at(-1);
    const report = checkpoint ? computeGoalWeeklyReport(goals,logs,dates,{today,timezone,now,dayCache}) : null;
    return { label:"Week "+(index+1),from:dates[0],to:dates.at(-1),asOf:checkpoint||null,
      eligibleGoals:eligible.size,activeGoals:active.size,eligibleDays,activeDays,
      activityScore:rate(active.size,eligible.size),consistency:rate(activeDays,eligibleDays),score:report?.weeklyScore ?? null };
  });
  const eligibleDays = days.filter(row=>row.goalCount>0).length, activeDays = new Set(activities.map(event=>event.day)).size;
  const totals = { goalCount:rows.length,knownProgressGoals:monthly.stats.knownProgressGoals,unknownProgressGoals:monthly.stats.unknownProgressGoals,
    completedGoals:monthly.stats.completedGoals,avgProgress:monthly.stats.avgProgress,score:monthly.weeklyScore,
    eligibleDays,activeDays,consistency:rate(activeDays,eligibleDays),activeGoals:rows.filter(row=>row.activeDays>0).length,
    milestoneGoals:rows.filter(row=>row.milestoneBased).length,
    knownMilestoneGoals:rows.filter(row=>row.milestoneBased && row.total!==null && row.completed!==null).length,
    totalMilestones:monthly.stats.totalMilestones,completedMilestones:monthly.stats.completedMilestones,
    milestoneCheckins:activities.filter(row=>row.kind==="milestone").length,distinctMilestonesCompleted:monthly.stats.completedMilestonesThisWeek,
    progressUpdates:activities.filter(row=>row.kind==="progress").length,
    overdueGoals:rows.filter(row=>row.deadlineStatus==="Overdue").length,dueTodayGoals:rows.filter(row=>row.deadlineStatus==="Due today").length,
    lateMilestones,unknownMilestoneTimings,deletedGoals:rows.filter(row=>row.deleted).length };
  totals.activityScore = rate(totals.activeGoals,totals.goalCount);
  return {asOf,goals:rows,days,weeks,totals,historyNote:monthly.historyNote,scoreNote:GOAL_SCORE_NOTE};
}

