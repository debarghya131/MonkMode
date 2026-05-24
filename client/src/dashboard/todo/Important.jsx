import { useEffect, useMemo, useState } from "react";
import { DEFAULT_IMPORTANT_CATEGORIES, isDefaultCategory } from "./todoShared";

const PRIORITY_FILTERS = ["High", "Medium", "Low", "All"];

const REPEAT_LABELS = {
  once: "One Time",
  daily: "Daily",
  weekdays: "Weekdays",
  weekend: "Weekend",
};

const DAY_SHORT = { Sun: "Su", Mon: "M", Tue: "T", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa" };

const priorityStyles = {
  High: "border-red-400/35 bg-red-500/10 text-red-200",
  Medium: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
  Low: "border-green-400/35 bg-green-500/10 text-green-200",
  All: "border-amber-100/15 bg-white/5 text-stone-300",
};

const formatTime = (timeValue) => {
  if (!timeValue) return "--";
  const [hours, minutes] = timeValue.split(":").map(Number);
  const dateObj = new Date();
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const getTaskDisplayDays = (task) => {
  const pendingDays = Array.isArray(task?.pendingDays) ? task.pendingDays : [];
  if (pendingDays.length > 0) return pendingDays;
  return Array.isArray(task?.days) ? task.days : [];
};

function TaskMeta({ task }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-300">
      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
        Repeat: {REPEAT_LABELS[task.repeatType] ?? task.repeatType}
      </span>
      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">Time: {formatTime(task.pendingTime || task.time)}</span>
      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5">
        Start: {task.repeatType === "once" ? task.date : task.startDate}
      </span>
      <span className={`rounded-full border px-2 py-0.5 ${task.endDate ? "border-rose-400/25 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
        End: {task.repeatType === "once" ? task.date : task.endDate ?? "Never"}
      </span>
      {task.repeatType === "weekdays" && getTaskDisplayDays(task).map((day) => (
        <span key={`${task.id}-${day}`} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
          {DAY_SHORT[day] ?? day}
        </span>
      ))}
    </div>
  );
}

export default function Important({
  tasks = [],
  importantCategories = DEFAULT_IMPORTANT_CATEGORIES,
  setImportantCategories = () => {},
}) {
  const [selectedPriority, setSelectedPriority] = useState("High");
  const [selectedCategory, setSelectedCategory] = useState(importantCategories[0] ?? DEFAULT_IMPORTANT_CATEGORIES[0]);
  const [categoryDeleteError, setCategoryDeleteError] = useState("");

  const normalizedImportantCategories = useMemo(
    () =>
      importantCategories.length > 0
        ? importantCategories
        : DEFAULT_IMPORTANT_CATEGORIES,
    [importantCategories]
  );

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task?.archived && !task?.deletedAt),
    [tasks]
  );

  const filteredByPriority = useMemo(
    () =>
      selectedPriority === "All"
        ? activeTasks
        : activeTasks.filter((task) => task.priority === selectedPriority),
    [selectedPriority, activeTasks]
  );

  const categoryTasks = useMemo(
    () => activeTasks.filter((task) => task.category.toLowerCase() === selectedCategory.toLowerCase()),
    [selectedCategory, activeTasks]
  );

  useEffect(() => {
    if (normalizedImportantCategories.length === 0) {
      setSelectedCategory(DEFAULT_IMPORTANT_CATEGORIES[0]);
      return;
    }

    const exists = normalizedImportantCategories.some(
      (category) => category.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (!exists) setSelectedCategory(normalizedImportantCategories[0]);
  }, [normalizedImportantCategories, selectedCategory]);

  const handleDeleteCategory = (categoryName) => {
    if (isDefaultCategory(categoryName)) {
      setCategoryDeleteError("Default categories cannot be deleted.");
      return;
    }

    setCategoryDeleteError("");
    setImportantCategories((prev) => prev.filter((item) => item.toLowerCase() !== categoryName.toLowerCase()));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-label-lg">Important</p>
        <h2 className="mt-2 text-2xl font-bold text-amber-100">Important Tasks</h2>
        <p className="mt-2 text-sm text-stone-400">High-priority view + important categories with repeat schedule details.</p>
      </div>

      <div className="important-layout">
        <section className="dashboard-glow-card important-main flex min-h-0 flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-amber-200">Important Categories</p>
            <p className="mt-0.5 text-xs text-stone-400">Default: Health and Bill & Payment. Custom starred categories appear here.</p>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {normalizedImportantCategories.map((category) => (
              <div key={category} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                selectedCategory === category
                  ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
                  : "border-amber-100/15 bg-white/5 text-stone-300"
              }`}>
                <button type="button" onClick={() => setSelectedCategory(category)}>
                  {category} {"\u2605"}
                </button>
                {!isDefaultCategory(category) ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    className="rounded border border-rose-400/30 bg-rose-500/10 px-1 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                    aria-label={`Remove ${category} from important categories`}
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {categoryDeleteError ? <p className="mb-2 text-xs text-red-300">{categoryDeleteError}</p> : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/75">{selectedCategory} Tasks</p>
            <span className="rounded-full border border-amber-100/10 bg-white/5 px-2 py-0.5 text-[10px] text-stone-300">
              {categoryTasks.length}
            </span>
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {categoryTasks.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">No tasks in this important category yet.</p>
            ) : (
              categoryTasks.map((task) => (
                <article key={`${selectedCategory}-${task.id}`} className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                  <TaskMeta task={task} />
                </article>
              ))
            )}
          </div>
        </section>

        <section className="dashboard-glow-card important-side flex min-h-0 flex-col rounded-[1.4rem] border border-amber-100/10 bg-white/6 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-2xl sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">User Created Tasks</p>
              <p className="mt-0.5 text-xs text-stone-400">Filtered by priority. Default is High Priority.</p>
            </div>
            <span className="rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
              {filteredByPriority.length} tasks
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {PRIORITY_FILTERS.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setSelectedPriority(priority)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  selectedPriority === priority ? priorityStyles[priority] : "border-amber-100/15 bg-white/5 text-stone-400"
                }`}
              >
                {priority}
              </button>
            ))}
          </div>

          <div className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredByPriority.length === 0 ? (
              <p className="mt-8 text-center text-xs text-stone-500">No tasks found for this priority filter.</p>
            ) : (
              filteredByPriority.map((task) => (
                <article key={task.id} className="dashboard-glow-card rounded-xl border border-amber-100/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-100">{task.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">{task.category}</p>
                  <TaskMeta task={task} />
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
