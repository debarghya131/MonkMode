import { motion as Motion } from "framer-motion";
import { useState } from "react";
import { GOALS } from "./goalDemoData";

const PRIORITY_BADGE = {
  High: "border-red-400/30 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/30 bg-green-500/10 text-green-200",
};

const TYPE_BADGE = {
  "Long-term": "border-violet-400/30 bg-violet-500/10 text-violet-200",
  "Short-term": "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
};

const getDaysLeft = (deadlineISO) => {
  const [y, m, d] = deadlineISO.split("-").map(Number);
  const deadline = new Date(y, m - 1, d);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return Math.floor((deadline - todayStart) / (24 * 60 * 60 * 1000));
};

const getBarColor = (pct) => {
  if (pct >= 100) return "bg-emerald-400";
  if (pct >= 60) return "bg-amber-400";
  if (pct >= 30) return "bg-yellow-500";
  return "bg-rose-400";
};

const FILTER_OPTIONS = ["All", "Active", "Archived"];
const PRIORITY_FILTERS = ["All", "High", "Medium", "Low"];

export default function Progress({ importantByGoal = {}, milestonesByGoal = {} }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filtered = GOALS.filter((g) => {
    if (statusFilter !== "All" && g.status !== statusFilter) return false;
    if (priorityFilter !== "All" && g.priority !== priorityFilter) return false;
    return true;
  }).sort((a, b) => Number(Boolean(importantByGoal[b.id])) - Number(Boolean(importantByGoal[a.id])));

  const overall = (() => {
    const total = GOALS.reduce((s, g) => s + g.milestones.length, 0);
    const done = GOALS.reduce((s, g) => s + g.milestones.filter((m) => m.completed).length, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  })();

  return (
    <div className="h-[700px] rounded-[2rem] border border-amber-100/10 bg-white/6 p-6 shadow-2xl shadow-black/25 backdrop-blur flex flex-col">
      <p className="text-label-lg">Progress</p>
      <h2 className="mt-2 text-2xl font-bold text-amber-100">Goal Progress</h2>
      <p className="text-body-md mt-1 text-stone-300/90">
        Milestone completion progress for each goal.
      </p>

      <div className="mt-4 rounded-xl border border-amber-100/10 bg-black/20 px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-stone-300">Overall Progress</p>
          <span className="text-xs font-bold text-amber-100">{overall}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <Motion.div
            className={`h-full rounded-full ${getBarColor(overall)}`}
            initial={{ width: 0 }}
            animate={{ width: `${overall}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">
          {GOALS.reduce((s, g) => s + g.milestones.filter((m) => m.completed).length, 0)} of{" "}
          {GOALS.reduce((s, g) => s + g.milestones.length, 0)} milestones completed across all goals
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatusFilter(opt)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                statusFilter === opt
                  ? "border-amber-300/50 bg-amber-500/20 text-amber-100"
                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {PRIORITY_FILTERS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPriorityFilter(opt)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                priorityFilter === opt
                  ? opt === "High"
                    ? "border-red-400/50 bg-red-500/20 text-red-100"
                    : opt === "Medium"
                      ? "border-yellow-400/50 bg-yellow-500/20 text-yellow-100"
                      : opt === "Low"
                        ? "border-green-400/50 bg-green-500/20 text-green-100"
                        : "border-amber-300/50 bg-amber-500/20 text-amber-100"
                  : "border-amber-100/10 bg-white/5 text-stone-400 hover:text-stone-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="journal-scroll mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="mt-4 text-xs text-stone-500">No goals match the selected filters.</p>
        ) : (
          filtered.map((goal, i) => {
            const milestones = milestonesByGoal[goal.id] ?? goal.milestones;
            const total = milestones.length;
            const done = milestones.filter((m) => m.completed).length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const daysLeft = getDaysLeft(goal.deadline);

            return (
              <Motion.article
                key={goal.id}
                className="rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.25 }}
                whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-amber-100">{goal.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[goal.type]}`}>
                        {goal.type}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[goal.priority]}`}>
                        {goal.priority}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          goal.status === "Archived"
                            ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {goal.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {total === 0 ? (
                      <p className="text-[11px] text-stone-500 italic">No sub-goals</p>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-amber-100">{pct}%</p>
                        <p className="text-[11px] text-stone-400">{done}/{total} milestones</p>
                      </>
                    )}
                  </div>
                </div>

                {total === 0 ? (
                  <div className="rounded-lg border border-dashed border-amber-100/15 bg-white/[0.02] px-3 py-2.5 text-center">
                    <p className="text-[11px] text-stone-500">No sub-goals added yet. Break this goal down into milestones to track progress.</p>
                  </div>
                ) : (
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <Motion.div
                      className={`h-full rounded-full ${getBarColor(pct)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.07 + 0.2, ease: "easeOut" }}
                    />
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-stone-400">Deadline: {goal.deadline}</p>
                  <p
                    className={`text-[11px] font-semibold ${
                      daysLeft > 30
                        ? "text-emerald-300"
                        : daysLeft >= 0
                          ? "text-amber-300"
                          : "text-rose-300"
                    }`}
                  >
                    {daysLeft > 0
                      ? `${daysLeft} days left`
                      : daysLeft === 0
                        ? "Due today"
                        : `${Math.abs(daysLeft)} days overdue`}
                  </p>
                </div>
              </Motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
