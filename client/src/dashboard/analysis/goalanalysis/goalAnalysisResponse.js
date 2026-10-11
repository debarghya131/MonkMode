import { journalMonthDays } from "../../../../../shared/journalAnalysisStats.js";
import { validReportDay } from "../../../../../shared/journalWeeklyStats.js";
import { habitAnalysisClockValid as clockValid } from "../habitanalysis/habitAnalysisResponse.js";
export { habitAnalysisClockValid as goalAnalysisClockValid } from "../habitanalysis/habitAnalysisResponse.js";
const count = value => Number.isSafeInteger(value) && value>=0;
const optionalCount = value => value===null || count(value);
const rate = value => value===null || (typeof value==="number" && Number.isFinite(value) && value>=0 && value<=100);
const rows = (value, check)=>Array.isArray(value) && value.every(row=>row && check(row));
const nullableDay = value => value===null || validReportDay(value);
const risks = ["On Track","Slightly Behind","Behind Schedule","Completed","No schedule","History unavailable"];
export function validGoalAnalysisResponse(data,period) {
  if (data?.year!==Number(period.year) || data.month!==Number(period.month) || !clockValid(data) || typeof data.dataNote!=="string" || !nullableDay(data.joinedDay)) return false;
  const a = data.analysis, calendar = journalMonthDays(period.year,period.month);
  const counts = ["goalCount","knownProgressGoals","unknownProgressGoals","completedGoals","eligibleDays","activeDays","activeGoals",
    "milestoneGoals","knownMilestoneGoals","totalMilestones","completedMilestones","milestoneCheckins","distinctMilestonesCompleted",
    "progressUpdates","overdueGoals","dueTodayGoals","lateMilestones","unknownMilestoneTimings","deletedGoals"];
  if (!a?.totals || !counts.every(key=>count(a.totals[key])) || !["avgProgress","score","consistency","activityScore"].every(key=>rate(a.totals[key]))
    || !nullableDay(a.asOf) || typeof a.scoreNote!=="string" || !(a.historyNote===null || typeof a.historyNote==="string")) return false;
  if (!rows(a.goals,row=>typeof row.id==="string" && typeof row.title==="string" && typeof row.label==="string"
    && ["Short Term","Long Term"].includes(row.type) && ["High","Medium","Low"].includes(row.priority) && risks.includes(row.risk)
    && ["progress","expected","consistency"].every(key=>rate(row[key]))
    && ["eligibleDays","activeDays","milestoneCheckins","progressUpdates","completedThisWeek","progressUpdatesThisWeek"].every(key=>count(row[key]))
    && ["total","completed"].every(key=>optionalCount(row[key])) && typeof row.isCompleted==="boolean" && typeof row.deleted==="boolean"
    && typeof row.historyLimited==="boolean" && typeof row.milestoneBased==="boolean" && typeof row.progressBasis==="string"
    && validReportDay(row.asOf) && nullableDay(row.deadlineDay)
    && (row.deadlineDays===null || Number.isSafeInteger(row.deadlineDays))
    && ["History unavailable","Deleted","Completed","No deadline","Overdue","Due today","Upcoming"].includes(row.deadlineStatus))) return false;
  if (new Set(a.goals.map(row=>row.id)).size!==a.goals.length || a.goals.length!==a.totals.goalCount
    || a.totals.knownProgressGoals+a.totals.unknownProgressGoals!==a.totals.goalCount
    || a.goals.filter(row=>row.progress!==null).length!==a.totals.knownProgressGoals
    || a.goals.filter(row=>row.isCompleted).length!==a.totals.completedGoals) return false;
  if (!rows(a.days,row=>validReportDay(row.date) && typeof row.label==="string" && typeof row.status==="string" && typeof row.future==="boolean"
    && ["goalCount","knownProgressGoals","activeGoals","progressUpdates","milestoneCheckins","cumulativeMilestoneCheckins"].every(key=>optionalCount(row[key]))
    && ["avgProgress","score"].every(key=>rate(row[key]))) || a.days.length!==calendar.length
    || a.days.some((row,index)=>row.date!==calendar[index] || row.future!== (row.date>data.today)
      || (row.future && ["goalCount","activeGoals","progressUpdates","milestoneCheckins","cumulativeMilestoneCheckins","avgProgress","score"].some(key=>row[key]!==null)))) return false;
  if (a.days.reduce((sum,row)=>sum+(row.milestoneCheckins||0),0)!==a.totals.milestoneCheckins
    || a.days.reduce((sum,row)=>sum+(row.progressUpdates||0),0)!==a.totals.progressUpdates) return false;
  return rows(a.weeks,row=>typeof row.label==="string" && validReportDay(row.from) && validReportDay(row.to) && nullableDay(row.asOf)
    && ["eligibleGoals","activeGoals","eligibleDays","activeDays"].every(key=>count(row[key]))
    && ["activityScore","consistency","score"].every(key=>rate(row[key]))) && a.weeks.length===Math.ceil(calendar.length/7);
}

