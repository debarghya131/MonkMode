import { useMemo, useState } from "react";

import { BODY_PART_GROUPS, EXERCISE_LIBRARY } from "./workoutLibraryData";

const getBodyGroup = (bodyPart = "") => {
  if (!bodyPart) return "";
  return bodyPart.split(" - ")[0]?.trim() || bodyPart;
};

const getBodySection = (bodyPart = "") => {
  if (!bodyPart || !bodyPart.includes(" - ")) return "";
  return bodyPart.split(" - ")[1]?.trim() || "";
};

const STORAGE_KEY = "monkmode_custom_exercises";

const loadCustom = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

function AddWorkoutModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState(BODY_PART_GROUPS[0].group);
  const [section, setSection] = useState(BODY_PART_GROUPS[0].sections[0]);
  const [error, setError] = useState("");

  const sections = BODY_PART_GROUPS.find((g) => g.group === group)?.sections || [];

  const handleGroupChange = (g) => {
    setGroup(g);
    setSection(BODY_PART_GROUPS.find((x) => x.group === g)?.sections[0] || "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a workout name."); return; }
    onAdd({ name: name.trim(), group, section });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-100/10 bg-[linear-gradient(180deg,rgba(30,18,14,0.98),rgba(12,8,8,0.99))] p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-amber-100">Add Workout</h3>
          <button type="button" onClick={onClose}
            className="rounded border border-amber-100/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Workout Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Cable Crossover"
              className="mt-1.5 w-full rounded-xl border border-amber-100/15 bg-white/5 px-3 py-2 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/35"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Body Group</span>
            <select
              value={group}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-amber-100/15 bg-[#1a100c] px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/35"
            >
              {BODY_PART_GROUPS.map(({ group: g }) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Sub Group</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-amber-100/15 bg-[#1a100c] px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/35"
            >
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit"
              className="flex-1 rounded-xl border border-amber-300/30 bg-amber-500/15 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25">
              Add to Library
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-stone-500/20 bg-white/5 px-4 py-2 text-sm font-semibold text-stone-300 transition hover:text-stone-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExerciseLibrary() {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [customExercises, setCustomExercises] = useState(loadCustom);
  const [showAddModal, setShowAddModal] = useState(false);

  const allExercises = useMemo(() => [...EXERCISE_LIBRARY, ...customExercises], [customExercises]);

  const groupCounts = useMemo(
    () =>
      BODY_PART_GROUPS.map(({ group }) => ({
        group,
        count: allExercises.filter((exercise) => getBodyGroup(exercise.bodyPart) === group).length,
      })).filter(({ count }) => count > 0),
    [allExercises]
  );

  const visibleGroups = useMemo(() => {
    const groups = selectedGroup === "all" ? groupCounts.map(({ group }) => group) : [selectedGroup];

    return groups
      .map((group) => ({
        group,
        exercises: allExercises.filter((exercise) => getBodyGroup(exercise.bodyPart) === group).sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))
      .filter(({ exercises }) => exercises.length > 0);
  }, [groupCounts, selectedGroup, allExercises]);

  const totalVisibleExercises = visibleGroups.reduce((sum, group) => sum + group.exercises.length, 0);

  const handleAdd = ({ name, group, section }) => {
    const newExercise = {
      id: `custom-${Date.now()}`,
      name,
      bodyPart: section ? `${group} - ${section}` : group,
      custom: true,
    };
    const updated = [...customExercises, newExercise];
    setCustomExercises(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    const updated = customExercises.filter((e) => e.id !== id);
    setCustomExercises(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <>
      <div className="rounded-[2rem] border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_38%),linear-gradient(180deg,rgba(30,18,14,0.96),rgba(12,8,8,0.98))] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl xl:max-w-sm">
            <h2 className="text-base font-semibold text-stone-100">All Workouts</h2>
            <p className="mt-1 text-xs text-stone-400">By Body Group</p>
          </div>

          <div className="w-full rounded-[1.5rem] border border-amber-100/10 bg-black/20 p-4 lg:p-5 xl:min-w-0 xl:flex-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedGroup("all")}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    selectedGroup === "all"
                      ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                      : "border-amber-100/10 bg-white/5 text-stone-300 hover:border-amber-300/20 hover:text-stone-100"
                  }`}
                >
                  All Groups ({allExercises.length})
                </button>
                {groupCounts.map(({ group, count }) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                      selectedGroup === group
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-amber-100/10 bg-white/5 text-stone-300 hover:border-amber-300/20 hover:text-stone-100"
                    }`}
                  >
                    {group} ({count})
                  </button>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="whitespace-nowrap rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-500/25"
                >
                  + Add Workout
                </button>
                <div className="whitespace-nowrap rounded-full border border-amber-100/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-stone-300">
                  {selectedGroup === "all" ? `${totalVisibleExercises} workouts` : `${totalVisibleExercises} in ${selectedGroup}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 max-h-[56vh] overflow-y-auto rounded-[1.5rem] border border-amber-100/10 bg-black/20 p-4 pr-2 scroll-smooth lg:p-5">
          {visibleGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 p-10 text-center text-stone-400">
              <p className="text-base font-semibold text-stone-200">No workouts found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleGroups.map(({ group, exercises }) => (
                <section key={group} className="rounded-2xl border border-amber-100/10 bg-black/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-amber-100">{group}</h3>
                    <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                      {exercises.length} workout{exercises.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {exercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className={`group relative max-w-full rounded-xl border bg-white/5 px-3 py-2.5 ${
                          exercise.custom ? "border-amber-300/25" : "border-amber-100/10"
                        }`}
                      >
                        <p className="text-sm font-semibold text-stone-100">{exercise.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                            {getBodyGroup(exercise.bodyPart)}
                          </span>
                          {getBodySection(exercise.bodyPart) && (
                            <span className="rounded-full border border-stone-400/20 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-300">
                              {getBodySection(exercise.bodyPart)}
                            </span>
                          )}
                          {exercise.custom && (
                            <>
                              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                custom
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelete(exercise.id)}
                                className="ml-1 rounded-full border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddWorkoutModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}
