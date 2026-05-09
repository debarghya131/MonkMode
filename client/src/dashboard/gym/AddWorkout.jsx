import { motion as Motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { BODY_PART_GROUPS, EXERCISE_LIBRARY, WORKOUT_SPLITS } from "./workoutLibraryData";
import { createDummyWorkouts, RETIRED_DEMO_WORKOUT_IDS, createDummyLogs } from "../../../data/GymDummyData";

const PANEL_H = "min(720px, 78vh)";

const GOAL_TYPES = [
  { value: "muscle-gain",  label: "💪 Muscle Gain"  },
  { value: "fat-loss",     label: "🔥 Fat Loss"      },
  { value: "strength",     label: "🏋️ Strength"      },
  { value: "endurance",    label: "🏃 Endurance"     },
];
const CUSTOM_GOAL_TYPES_STORAGE_KEY = "monkmode_gym_custom_goal_types_v1";
const CUSTOM_WORKOUT_SPLITS_STORAGE_KEY = "monkmode_gym_custom_workout_splits_v1";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIFFICULTY_LEVELS = ["Beginner 🟢", "Intermediate 🟡", "Advanced 🔴"];
const DIFFICULTY_STYLES = {
  "Beginner 🟢":     "border-green-400/40 text-green-200 bg-green-500/10",
  "Intermediate 🟡": "border-yellow-400/40 text-yellow-200 bg-yellow-500/10",
  "Advanced 🔴":     "border-red-400/40 text-red-200 bg-red-500/10",
};

const formatBodyPart = (group, section) => (group ? (section ? `${group} - ${section}` : group) : "");

const parseBodyPart = (bodyPart = "") => {
  if (!bodyPart) return { group: "", section: "" };
  if (bodyPart.includes(" - ")) {
    const [group, section] = bodyPart.split(" - ").map((x) => x.trim());
    return { group: group || "", section: section || "" };
  }
  const matchedGroup = BODY_PART_GROUPS.find((bp) => bodyPart.toLowerCase().startsWith(`${bp.group.toLowerCase()} (`));
  if (matchedGroup) return { group: matchedGroup.group, section: "" };
  return { group: bodyPart, section: "" };
};

const BLANK_EXERCISE = {
  id: "", name: "", sets: "", reps: "", weight: "",
  duration: "", restTime: "", bodyPart: "", bodyPartGroup: "", bodyPartSection: "",
};

const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toGoalOption = (value, label = "") => {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return null;
  const fallbackLabel = cleanValue
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return {
    value: cleanValue,
    label: String(label || fallbackLabel).trim() || fallbackLabel,
  };
};

const mergeGoalOptions = (...groups) => {
  const byValue = new Map();
  groups.flat().forEach((option) => {
    const normalized = toGoalOption(option?.value, option?.label);
    if (!normalized) return;
    const existing = byValue.get(normalized.value);
    if (!existing) {
      byValue.set(normalized.value, normalized);
      return;
    }
    const nextLabel = /[\u{1F300}-\u{1FAFF}]/u.test(existing.label) ? existing.label : normalized.label;
    byValue.set(normalized.value, { ...existing, label: nextLabel });
  });
  return [...byValue.values()];
};

const readStoredCustomGoalOptions = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_GOAL_TYPES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toGoalOption(item?.value, item?.label))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const persistCustomGoalOptions = (options = []) => {
  try {
    const baseValues = new Set(GOAL_TYPES.map((item) => item.value));
    const customOnly = (Array.isArray(options) ? options : [])
      .map((item) => toGoalOption(item?.value, item?.label))
      .filter((item) => item && !baseValues.has(item.value));
    localStorage.setItem(CUSTOM_GOAL_TYPES_STORAGE_KEY, JSON.stringify(customOnly));
  } catch {
    // ignore storage errors
  }
};

const readStoredCustomSplitOptions = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_WORKOUT_SPLITS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toGoalOption(item?.value, item?.label))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const persistCustomSplitOptions = (options = []) => {
  try {
    const baseValues = new Set(WORKOUT_SPLITS.map((item) => item.value));
    const customOnly = (Array.isArray(options) ? options : [])
      .map((item) => toGoalOption(item?.value, item?.label))
      .filter((item) => item && !baseValues.has(item.value));
    localStorage.setItem(CUSTOM_WORKOUT_SPLITS_STORAGE_KEY, JSON.stringify(customOnly));
  } catch {
    // ignore storage errors
  }
};

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtTime = (t) => {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const toNonNegativeNumber = (value) => {
  const parsed = Number.parseFloat(String(value || "").trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const computeExerciseEstimatedMinutes = (exercise = {}) => {
  const setsRaw = Number.parseInt(String(exercise?.sets || "").trim(), 10);
  const sets = Number.isFinite(setsRaw) ? Math.max(0, setsRaw) : 0;
  const durationMinutes = toNonNegativeNumber(exercise?.duration);
  const restSeconds = toNonNegativeNumber(exercise?.restTime);
  if (sets <= 0 || durationMinutes <= 0) return 0;

  const workMinutes = durationMinutes * sets;
  const restMinutes = sets > 1 ? (restSeconds * (sets - 1)) / 60 : 0;
  return workMinutes + restMinutes;
};

const formatEstimatedMinutes = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  const rounded = Math.round(minutes * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const WORKOUT_DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;

const parseLogTimestampMs = (log = {}) => {
  if (log?.createdAt) {
    const createdAtMs = new Date(log.createdAt).getTime();
    if (Number.isFinite(createdAtMs)) return createdAtMs;
  }

  if (log?.date) {
    const datePart = String(log.date).trim();
    const timePart = String(log.time || "00:00").trim();
    const merged = new Date(`${datePart}T${timePart}:00`);
    const mergedMs = merged.getTime();
    if (Number.isFinite(mergedMs)) return mergedMs;
    const dateOnlyMs = new Date(datePart).getTime();
    if (Number.isFinite(dateOnlyMs)) return dateOnlyMs;
  }

  return null;
};

const getDeleteUndoMeta = (log = {}, nowMs = Date.now()) => {
  const deletedAtMs = parseLogTimestampMs(log);
  if (!Number.isFinite(deletedAtMs)) {
    return { canUndo: false, remainingMs: 0 };
  }
  const remainingMs = Math.max(0, deletedAtMs + WORKOUT_DELETE_UNDO_WINDOW_MS - nowMs);
  return {
    canUndo: remainingMs > 0,
    remainingMs,
  };
};

const formatUndoCountdown = (remainingMs = 0) => {
  if (remainingMs <= 0) return "expired";
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const parseLogCreatedAtMs = (log = {}) => {
  const fromCreatedAt = log?.createdAt ? new Date(log.createdAt).getTime() : NaN;
  if (Number.isFinite(fromCreatedAt)) return fromCreatedAt;
  return parseLogTimestampMs(log);
};

const BLANK_FORM = {
  title: "", goalType: "", workoutSplit: "",
  totalEstimatedTime: "", days: [],
  startDate: "",
  neverEnds: true, endDate: "", difficulty: "",
};

const DEMO_ACTIVE_WORKOUT_BY_DAY = {
  Mon: "demo-push-strength",
  Tue: "demo-upper-primer",
  Wed: "demo-pull-builder",
};


const mergeWithDemoWorkouts = (storedWorkouts, baseDate) => {
  const stored = (Array.isArray(storedWorkouts) ? storedWorkouts : []).filter(
    (workout) => !RETIRED_DEMO_WORKOUT_IDS.has(workout?.id)
  );
  const demos = createDummyWorkouts(baseDate);
  const demoById = new Map(demos.map((demo) => [demo.id, demo]));

  const refreshedStored = stored.map((workout) => {
    const demo = demoById.get(workout.id);
    if (!demo) return workout;
    return {
      ...demo,
      isActive: workout.isActive ?? demo.isActive,
      startDate: workout.startDate ?? demo.startDate,
      neverEnds: workout.neverEnds ?? demo.neverEnds,
      endDate: workout.endDate ?? demo.endDate,
    };
  });

  const storedIds = new Set(refreshedStored.map((w) => w.id));
  return [...refreshedStored, ...demos.filter((demo) => !storedIds.has(demo.id))];
};

const normalizeActiveByDay = (items) => {
  const usedDays = new Set();
  return (Array.isArray(items) ? items : []).map((item) => {
    if (!item?.isActive) return item;
    const days = Array.isArray(item.days) ? item.days : [];
    const hasConflict = days.some((day) => usedDays.has(day));
    if (hasConflict) return { ...item, isActive: false };
    days.forEach((day) => usedDays.add(day));
    return item;
  });
};

const enforceDemoActiveWorkouts = (items) =>
  (Array.isArray(items) ? items : []).map((item) => {
    const day = Array.isArray(item?.days) ? item.days[0] : null;
    const preferredId = day ? DEMO_ACTIVE_WORKOUT_BY_DAY[day] : null;

    if (!preferredId || !String(item?.id || "").startsWith("demo-")) {
      return item;
    }

    return {
      ...item,
      isActive: item.id === preferredId,
    };
  });


export default function AddWorkout() {
  const { isDemoMode } = useAuth();
  const today = useMemo(() => toISO(new Date()), []);
  const searchRef = useRef(null);
  const splitDropRef = useRef(null);
  const goalDropRef = useRef(null);
  const workoutListRef = useRef(null);

  const [form, setForm] = useState({ ...BLANK_FORM, startDate: today });
  const [exercises, setExercises] = useState([]);
  const [currentEx, setCurrentEx] = useState({ ...BLANK_EXERCISE });
  const [exSearch, setExSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [viewWorkout, setViewWorkout] = useState(null);
  const [exError, setExError] = useState("");
  const [splitOptions, setSplitOptions] = useState(() => mergeGoalOptions(WORKOUT_SPLITS, readStoredCustomSplitOptions()));
  const [showGoalDrop, setShowGoalDrop] = useState(false);
  const [goalOptions, setGoalOptions] = useState(() => mergeGoalOptions(GOAL_TYPES, readStoredCustomGoalOptions()));
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [showSplitDrop, setShowSplitDrop] = useState(false);
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [customSplit, setCustomSplit] = useState("");
  const [customLibraryExercises, setCustomLibraryExercises] = useState([]);
  const [error, setError] = useState("");
  const [workouts, setWorkouts] = useState(() =>
    isDemoMode
      ? enforceDemoActiveWorkouts(normalizeActiveByDay(createDummyWorkouts(new Date())))
      : []
  );
  const [loading, setLoading] = useState(!isDemoMode);
  const [workoutsView, setWorkoutsView] = useState("active");
  const [workoutDayFilter, setWorkoutDayFilter] = useState("all");
  const [logs, setLogs] = useState(() => isDemoMode ? createDummyLogs(new Date()) : []);
  const [editingId, setEditingId] = useState(null);
  const [copyWorkout, setCopyWorkout] = useState(null);
  const [copyDays, setCopyDays] = useState([]);
  const [copyError, setCopyError] = useState("");
  const [undoClockMs, setUndoClockMs] = useState(() => Date.now());

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
      if (splitDropRef.current && !splitDropRef.current.contains(e.target)) setShowSplitDrop(false);
      if (goalDropRef.current && !goalDropRef.current.contains(e.target)) setShowGoalDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setUndoClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setCustomLibraryExercises([]);
      return;
    }

    let isMounted = true;

    const refreshCustomLibrary = async () => {
      try {
        const { data } = await api.get("/gym/library");
        if (!isMounted) return;
        setCustomLibraryExercises(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        if (!isMounted) return;
        console.error("Failed to load custom gym library for workout search:", fetchError);
        setCustomLibraryExercises([]);
      }
    };

    refreshCustomLibrary();
    window.addEventListener("focus", refreshCustomLibrary);
    window.addEventListener("monkmode:gym-library-updated", refreshCustomLibrary);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshCustomLibrary);
      window.removeEventListener("monkmode:gym-library-updated", refreshCustomLibrary);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await api.get("/gym/plans");
        if (cancelled) return;
        const plans = Array.isArray(data) ? data : [];
        setWorkouts(plans);
        const planGoalOptions = plans
          .map((plan) => toGoalOption(plan?.goalType))
          .filter(Boolean);
        const planSplitOptions = plans
          .map((plan) => toGoalOption(plan?.workoutSplit))
          .filter(Boolean);
        setGoalOptions((prev) => mergeGoalOptions(GOAL_TYPES, prev, planGoalOptions));
        setSplitOptions((prev) => mergeGoalOptions(WORKOUT_SPLITS, prev, planSplitOptions));
      } catch {
        // keep empty on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    let cancelled = false;
    api.get("/gym/plans/logs")
      .then(({ data }) => { if (!cancelled) setLogs(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isDemoMode]);

  const persistLog = (entry) => {
    if (isDemoMode) return;
    api.post("/gym/plans/logs", {
      planId: entry.planId || "",
      title: entry.title,
      action: entry.action,
      note: entry.note || "",
      date: entry.date,
      time: entry.time,
      deletedItem: entry.deletedItem && typeof entry.deletedItem === "object" ? entry.deletedItem : null,
      restoredFromLogId: entry.restoredFromLogId || "",
    }).catch(() => {});
  };

  const libraryExercises = useMemo(
    () => [...EXERCISE_LIBRARY, ...customLibraryExercises],
    [customLibraryExercises]
  );

  const searchResults = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    if (!q) return [];
    return libraryExercises.filter(
      (e) => e.name.toLowerCase().includes(q) || e.bodyPart.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [exSearch, libraryExercises]);

  const selectedBodyPartGroup = BODY_PART_GROUPS.find((bp) => bp.group === currentEx.bodyPartGroup);
  const selectedBodyPartSections = selectedBodyPartGroup?.sections || [];
  const autoTotalEstimatedTime = useMemo(() => {
    if (!Array.isArray(exercises) || exercises.length === 0) return "";
    const totalMinutes = exercises.reduce(
      (sum, exercise) => sum + computeExerciseEstimatedMinutes(exercise),
      0
    );
    return formatEstimatedMinutes(totalMinutes);
  }, [exercises]);
  const remainingCopyDays = useMemo(() => {
    if (!copyWorkout) return [];
    const sourceId = copyWorkout.copiedFromId || copyWorkout.id;
    const occupiedDays = new Set(copyWorkout.days || []);
    workouts.forEach((item) => {
      if ((item.copiedFromId || item.id) === sourceId) {
        (item.days || []).forEach((day) => occupiedDays.add(day));
      }
    });
    return WEEK_DAYS.filter((day) => !occupiedDays.has(day));
  }, [copyWorkout, workouts]);

  useEffect(() => {
    setForm((prev) => (
      prev.totalEstimatedTime === autoTotalEstimatedTime
        ? prev
        : { ...prev, totalEstimatedTime: autoTotalEstimatedTime }
    ));
  }, [autoTotalEstimatedTime]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? [] : [day],
    }));
  };

  const handleSelectLibrary = (ex) => {
    const parsed = parseBodyPart(ex.bodyPart);
    setCurrentEx({
      ...BLANK_EXERCISE,
      id: ex.id,
      name: ex.name,
      bodyPart: formatBodyPart(parsed.group, parsed.section),
      bodyPartGroup: parsed.group,
      bodyPartSection: parsed.section,
    });
    setExSearch(ex.name);
    setShowDrop(false);
    setShowExForm(true);
  };

  const handleAddCustomEx = () => {
    if (!exSearch.trim()) { setExError("Enter an exercise name."); return; }
    setCurrentEx({ ...BLANK_EXERCISE, id: `custom-${Date.now()}`, name: exSearch.trim() });
    setShowDrop(false);
    setShowExForm(true);
  };

  const handleSaveExercise = () => {
    if (!currentEx.name.trim()) { setExError("Exercise name is required."); return; }
    if (!currentEx.sets) { setExError("Sets is required."); return; }
    if (!currentEx.duration) { setExError("Duration is required."); return; }
    if (!currentEx.restTime) { setExError("Rest time is required."); return; }
    if (!currentEx.bodyPartGroup) { setExError("Body part is required."); return; }
    if (selectedBodyPartSections.length > 0 && !currentEx.bodyPartSection) {
      setExError("Body part section is required.");
      return;
    }
    const resolvedBodyPart = formatBodyPart(currentEx.bodyPartGroup, currentEx.bodyPartSection);
    const { bodyPartGroup, bodyPartSection, ...exercisePayload } = currentEx;
    setExercises((prev) => [
      ...prev,
      { ...exercisePayload, bodyPart: resolvedBodyPart, id: currentEx.id || `ex-${Date.now()}` },
    ]);
    if (currentEx.id?.startsWith("custom-") && !isDemoMode) {
      api.post("/gym/library", {
        name: currentEx.name.trim(),
        bodyGroup: currentEx.bodyPartGroup,
        bodySection: currentEx.bodyPartSection,
        bodyPart: resolvedBodyPart,
      }).then(() => {
        window.dispatchEvent(new Event("monkmode:gym-library-updated"));
      }).catch(() => {});
    }
    setCurrentEx({ ...BLANK_EXERCISE });
    setExSearch("");
    setShowExForm(false);
    setExError("");
  };


  const handleRemoveFromView = async (exId) => {
    const updated = viewWorkout.exercises.filter((e) => e.id !== exId);
    if (!viewWorkout.id) {
      setExercises(updated);
    } else {
      setWorkouts((prev) =>
        prev.map((w) => w.id === viewWorkout.id ? { ...w, exercises: updated } : w)
      );
      if (!isDemoMode && viewWorkout.id) {
        try {
          const { data } = await api.patch(`/gym/plans/${viewWorkout.id}`, { exercises: updated });
          setWorkouts((prev) => prev.map((w) => w.id === viewWorkout.id ? data : w));
        } catch {
          // local update already applied above
        }
      }
    }
    setViewWorkout((prev) => ({ ...prev, exercises: updated }));
  };

  const handleAddGoal = () => {
    if (!customGoal.trim()) return;
    const newGoal = {
      value: customGoal.trim().toLowerCase().replace(/\s+/g, "-"),
      label: customGoal.trim(),
    };
    setGoalOptions((prev) => {
      const next = mergeGoalOptions(GOAL_TYPES, prev, [newGoal]);
      persistCustomGoalOptions(next);
      return next;
    });
    setField("goalType", newGoal.value);
    setCustomGoal("");
    setShowCustomGoal(false);
  };

  const handleAddSplit = () => {
    if (!customSplit.trim()) return;
    const newSplit = {
      value: customSplit.trim().toLowerCase().replace(/\s+/g, "-"),
      label: customSplit.trim(),
    };
    setSplitOptions((prev) => {
      const next = mergeGoalOptions(WORKOUT_SPLITS, prev, [newSplit]);
      persistCustomSplitOptions(next);
      return next;
    });
    setField("workoutSplit", newSplit.value);
    setCustomSplit("");
    setShowCustomSplit(false);
  };

  const validate = () => {
    if (!form.title.trim()) return "Workout title is required.";
    if (!form.goalType) return "Goal type is required.";
    if (!form.workoutSplit) return "Workout split is required.";
    if (exercises.length === 0) return "Add at least one exercise.";
    if (!form.totalEstimatedTime) return "Total estimated time is required.";
    if (form.days.length === 0) return "Select a day.";
    if (!form.startDate) return "Start date is required.";
    if (!form.neverEnds && !form.endDate) return "End date is required or select Never End.";
    if (!form.neverEnds && form.endDate && form.endDate <= today) return "End date must be after today.";
    if (!form.neverEnds && form.endDate && form.endDate <= form.startDate) return "End date must be after the start date.";
    if (!form.difficulty) return "Difficulty level is required.";
    return "";
  };

  const resetForm = () => {
    setForm({ ...BLANK_FORM, startDate: today });
    setExercises([]);
    setCurrentEx({ ...BLANK_EXERCISE });
    setExSearch("");
    setShowExForm(false);
    setExError("");
    setEditingId(null);
    setError("");
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setForm({
      title: w.title,
      goalType: w.goalType,
      workoutSplit: w.workoutSplit,
      totalEstimatedTime: w.totalEstimatedTime || "",
      days: w.days || [],
      startDate: w.startDate || today,
      neverEnds: w.neverEnds ?? true,
      endDate: w.endDate || "",
      difficulty: w.difficulty,
    });
    setExercises(w.exercises || []);
  };

  const handleDelete = async (id) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    if (isDemoMode) {
      setWorkouts((prev) => prev.filter((x) => x.id !== id));
      setLogs((prev) => [
        { id: `${id}-del-${Date.now()}`, action: "deleted", title: w.title, date: toISO(new Date()), time: nowTime(), deletedItem: w },
        ...prev,
      ]);
      if (editingId === id) resetForm();
      return;
    }
    try {
      await api.delete(`/gym/plans/${id}`);
      setWorkouts((prev) => prev.filter((x) => x.id !== id));
      const logEntry = { id: `${id}-del-${Date.now()}`, action: "deleted", title: w.title, date: toISO(new Date()), time: nowTime(), deletedItem: w };
      setLogs((prev) => [logEntry, ...prev]);
      persistLog({ ...logEntry, planId: id });
      if (editingId === id) resetForm();
    } catch {
      // silently fail
    }
  };

  const handleToggleWorkoutActive = async (id) => {
    const target = workouts.find((item) => item.id === id);
    if (!target) return;

    const nextIsActive = !target.isActive;
    const targetDays = target.days || [];

    if (isDemoMode) {
      setWorkouts((prev) => prev.map((item) => {
        if (item.id === id) return { ...item, isActive: nextIsActive };
        if (!nextIsActive) return item;
        const overlapsTargetDay = (item.days || []).some((day) => targetDays.includes(day));
        return overlapsTargetDay ? { ...item, isActive: false } : item;
      }));
      if (viewWorkout?.id === id) {
        setViewWorkout((prev) => (prev ? { ...prev, isActive: nextIsActive } : prev));
      }
      setLogs((prev) => [
        {
          id: `${id}-${nextIsActive ? "act" : "deact"}-${Date.now()}`,
          action: nextIsActive ? "activated" : "deactivated",
          title: target.title,
          note: targetDays.length > 0 ? `for ${targetDays.join(", ")}` : "",
          date: toISO(new Date()),
          time: nowTime(),
        },
        ...prev,
      ]);
      return;
    }

    try {
      const { data } = await api.patch(`/gym/plans/${id}/active`);
      setWorkouts(data);
      if (viewWorkout?.id === id) {
        setViewWorkout((prev) => (prev ? { ...prev, isActive: nextIsActive } : prev));
      }
      const logEntry = {
        id: `${id}-${nextIsActive ? "act" : "deact"}-${Date.now()}`,
        action: nextIsActive ? "activated" : "deactivated",
        title: target.title,
        note: targetDays.length > 0 ? `for ${targetDays.join(", ")}` : "",
        date: toISO(new Date()),
        time: nowTime(),
      };
      setLogs((prev) => [logEntry, ...prev]);
      persistLog({ ...logEntry, planId: id });
    } catch {
      // silently fail
    }
  };

  const openCopyWorkout = (id) => {
    const w = workouts.find((x) => x.id === id);
    if (!w) return;
    setCopyWorkout(w);
    setCopyDays([]);
    setCopyError("");
  };

  const toggleCopyDay = (day) => {
    setCopyDays((prev) => (
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    ));
    if (copyError) setCopyError("");
  };

  const handleCopyWorkout = async () => {
    if (!copyWorkout) return;
    if (copyDays.length === 0) {
      setCopyError("Select at least one remaining day.");
      return;
    }

    const sourceId = copyWorkout.copiedFromId || copyWorkout.id;
    const stamp = Date.now();

    if (isDemoMode) {
      const copies = copyDays.map((day, idx) => ({
        ...copyWorkout,
        id: `${stamp}-cpy-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        copiedFromId: sourceId,
        isActive: false,
        days: [day],
      }));
      setWorkouts((prev) => [...copies, ...prev]);
      setLogs((prev) => [
        {
          id: `${copyWorkout.id}-cpy-${stamp}`,
          action: "copied",
          title: copyWorkout.title,
          note: `to ${copyDays.join(", ")}`,
          date: toISO(new Date()),
          time: nowTime(),
        },
        ...prev,
      ]);
      setCopyWorkout(null);
      setCopyDays([]);
      setCopyError("");
      return;
    }

    try {
      const { id: _ignored, ...planData } = copyWorkout;
      const newPlans = await Promise.all(
        copyDays.map((day) =>
          api.post("/gym/plans", { ...planData, copiedFromId: sourceId, isActive: false, days: [day] })
            .then((res) => res.data)
        )
      );
      setWorkouts((prev) => [...newPlans, ...prev]);
      const logEntry = {
        id: `${copyWorkout.id}-cpy-${stamp}`,
        action: "copied",
        title: copyWorkout.title,
        note: `to ${copyDays.join(", ")}`,
        date: toISO(new Date()),
        time: nowTime(),
      };
      setLogs((prev) => [logEntry, ...prev]);
      persistLog({ ...logEntry, planId: copyWorkout.id });
      setCopyWorkout(null);
      setCopyDays([]);
      setCopyError("");
    } catch {
      setCopyError("Failed to copy workout. Please try again.");
    }
  };

  const handleUndo = async (logId) => {
    const log = logs.find((l) => l.id === logId);
    if (!log?.deletedItem) return;
    const undoMeta = getDeleteUndoMeta(log);
    if (!undoMeta.canUndo) return;
    const restored = { ...log.deletedItem, isActive: false };
    const restoredDays = restored.days || [];

    if (isDemoMode) {
      setWorkouts((prev) => {
        const withoutRestored = prev.filter((item) => item.id !== restored.id);
        const normalized = withoutRestored.map((item) => {
          const overlapsRestoredDay = (item.days || []).some((day) => restoredDays.includes(day));
          return overlapsRestoredDay ? { ...item, isActive: false } : item;
        });
        return [{ ...restored, isActive: true }, ...normalized];
      });
      if (viewWorkout?.id === restored.id) setViewWorkout({ ...restored, isActive: true });
      setWorkoutsView("active");
      setLogs((prev) => [
        {
          id: `${restored.id}-undo-${Date.now()}`,
          action: "restored",
          title: restored.title,
          note: restoredDays.length > 0 ? `restored for ${restoredDays.join(", ")}` : "restored",
          restoredFromLogId: log.id,
          date: toISO(new Date()),
          time: nowTime(),
        },
        ...prev.filter((l) => l.id !== logId),
      ]);
      return;
    }

    try {
      const { id: _ignored, ...planData } = restored;
      const { data } = await api.post("/gym/plans", planData);
      setWorkouts((prev) => [data, ...prev]);
      setWorkoutsView("active");
      const logEntry = {
        id: `${data.id}-undo-${Date.now()}`,
        action: "restored",
        title: data.title,
        note: restoredDays.length > 0 ? `restored for ${restoredDays.join(", ")}` : "restored",
        restoredFromLogId: log.id,
        date: toISO(new Date()),
        time: nowTime(),
      };
      setLogs((prev) => [logEntry, ...prev.filter((l) => l.id !== logId)]);
      persistLog({ ...logEntry, planId: data.id });
    } catch {
      // silently fail
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    const existingWorkout = editingId ? workouts.find((w) => w.id === editingId) : null;
    const payload = { ...form, title: form.title.trim(), exercises };

    if (isDemoMode) {
      const demoPayload = {
        ...payload,
        isActive: existingWorkout?.isActive ?? false,
        copiedFromId: existingWorkout?.copiedFromId,
      };
      if (editingId) {
        setWorkouts((prev) =>
          normalizeActiveByDay(prev.map((w) => (w.id === editingId ? { ...demoPayload, id: editingId } : w)))
        );
        setLogs((prev) => [
          { id: `${editingId}-upd-${Date.now()}`, action: "updated", title: demoPayload.title, date: toISO(new Date()), time: nowTime() },
          ...prev,
        ]);
      } else {
        const newWorkout = { ...demoPayload, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, isActive: false };
        setWorkouts((prev) => [newWorkout, ...prev]);
        setLogs((prev) => [
          { id: `${newWorkout.id}-cre`, action: "created", title: newWorkout.title, date: toISO(new Date()), time: nowTime() },
          ...prev,
        ]);
      }
      resetForm();
      return;
    }

    try {
      if (editingId) {
        const { data } = await api.patch(`/gym/plans/${editingId}`, payload);
        setWorkouts((prev) => prev.map((w) => w.id === editingId ? data : w));
        const logEntry = { id: `${editingId}-upd-${Date.now()}`, action: "updated", title: data.title, date: toISO(new Date()), time: nowTime() };
        setLogs((prev) => [logEntry, ...prev]);
        persistLog({ ...logEntry, planId: editingId });
      } else {
        const { data } = await api.post("/gym/plans", payload);
        setWorkouts((prev) => [data, ...prev]);
        const logEntry = { id: `${data.id}-cre`, action: "created", title: data.title, date: toISO(new Date()), time: nowTime() };
        setLogs((prev) => [logEntry, ...prev]);
        persistLog({ ...logEntry, planId: data.id });
      }
      resetForm();
    } catch (submitErr) {
      setError(submitErr?.response?.data?.message || "Failed to save workout.");
    }
  };

  const activeWorkouts  = workouts.filter((w) => w.neverEnds || !w.endDate || w.endDate >= today);
  const archivedByDateWorkouts = workouts.filter((w) => !w.neverEnds && w.endDate && w.endDate < today);
  const restoredFromDeleteLogIds = useMemo(() => {
    const toCleanKey = (value) => String(value || "").trim();
    const toTitleKey = (value) => toCleanKey(value).toLowerCase();
    const isRestoreLikeLog = (log) => (
      log?.action === "restored" ||
      (log?.action === "activated" && /(^|\s)restored(\s|$)/i.test(String(log?.note || "")))
    );
    const restoredSet = new Set();

    logs.forEach((log) => {
      if (!isRestoreLikeLog(log)) return;
      const linkedDeletedId = typeof log?.restoredFromLogId === "string" ? toCleanKey(log.restoredFromLogId) : "";
      if (linkedDeletedId) restoredSet.add(linkedDeletedId);
    });

    // Backward-compatibility for old logs created before `restoredFromLogId` existed.
    const ordered = [...logs]
      .filter((log) => log?.action === "deleted" || isRestoreLikeLog(log))
      .sort((a, b) => (parseLogCreatedAtMs(a) || 0) - (parseLogCreatedAtMs(b) || 0));

    const popFirstUnrestored = (bucket = []) => {
      while (bucket.length > 0) {
        const candidate = bucket.pop();
        if (!candidate?.id) continue;
        if (restoredSet.has(String(candidate.id))) continue;
        return candidate;
      }
      return null;
    };

    const unmatchedDeletedByPlanKey = new Map();
    const unmatchedDeletedByTitle = new Map();
    ordered.forEach((log) => {
      if (log?.action === "deleted") {
        const planKey = toCleanKey(log?.deletedItem?.id || log?.planId);
        if (planKey) {
          const planList = unmatchedDeletedByPlanKey.get(planKey) || [];
          planList.push(log);
          unmatchedDeletedByPlanKey.set(planKey, planList);
        }
        const titleKey = toTitleKey(log?.title);
        if (titleKey) {
          const titleList = unmatchedDeletedByTitle.get(titleKey) || [];
          titleList.push(log);
          unmatchedDeletedByTitle.set(titleKey, titleList);
        }
        return;
      }

      if (!isRestoreLikeLog(log)) return;
      const linkedDeletedId = typeof log?.restoredFromLogId === "string" ? toCleanKey(log.restoredFromLogId) : "";
      if (linkedDeletedId) return;

      let candidate = null;
      const restoredPlanKey = toCleanKey(log?.planId);
      if (restoredPlanKey) {
        const planList = unmatchedDeletedByPlanKey.get(restoredPlanKey) || [];
        candidate = popFirstUnrestored(planList);
        unmatchedDeletedByPlanKey.set(restoredPlanKey, planList);
      }
      if (!candidate) {
        const titleKey = toTitleKey(log?.title);
        if (!titleKey) return;
        const titleList = unmatchedDeletedByTitle.get(titleKey) || [];
        candidate = popFirstUnrestored(titleList);
        unmatchedDeletedByTitle.set(titleKey, titleList);
      }
      if (candidate?.id) restoredSet.add(String(candidate.id));
    });

    return restoredSet;
  }, [logs]);

  const archivedDeletedWorkouts = useMemo(() => {
    const byOriginalId = new Map();
    logs.forEach((log) => {
      if (log?.action !== "deleted" || !log?.deletedItem || typeof log.deletedItem !== "object") return;
      if (restoredFromDeleteLogIds.has(String(log.id))) return;
      const originalId = String(log.deletedItem.id || log.planId || "").trim();
      if (!originalId || byOriginalId.has(originalId)) return;
      const undoMeta = getDeleteUndoMeta(log, undoClockMs);
      byOriginalId.set(originalId, {
        ...log.deletedItem,
        _archiveSource: "deleted",
        _deletedLogId: log.id,
        _canUndoDelete: undoMeta.canUndo,
        _undoRemainingMs: undoMeta.remainingMs,
      });
    });
    return [...byOriginalId.values()];
  }, [logs, undoClockMs, restoredFromDeleteLogIds]);
  const archivedWorkouts = useMemo(() => {
    const base = [...archivedByDateWorkouts];
    const existingIds = new Set(base.map((w) => String(w.id)));
    archivedDeletedWorkouts.forEach((w) => {
      if (!existingIds.has(String(w.id))) base.push(w);
    });
    return base;
  }, [archivedByDateWorkouts, archivedDeletedWorkouts]);
  const statusWorkouts = workoutsView === "active" ? activeWorkouts : archivedWorkouts;
  const displayedWorkouts = workoutDayFilter === "all"
    ? statusWorkouts
    : statusWorkouts.filter((w) => w.days?.includes(workoutDayFilter));

  useEffect(() => {
    if (workoutListRef.current) workoutListRef.current.scrollTop = 0;
  }, [workoutsView, workoutDayFilter]);

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">

        {/* ── FORM ── */}
        <div
          className="journal-scroll min-w-0 rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20 lg:w-80 xl:w-[32rem] lg:shrink-0 lg:overflow-y-auto lg:[height:min(720px,78vh)]"
        >
          <h3 className="mb-4 text-sm font-semibold text-amber-200">
            {editingId ? "Edit Workout" : "New Workout"}
          </h3>

          <form className="space-y-3" onSubmit={handleSubmit}>

            {/* Title */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Push Day A"
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35 focus:ring-1 focus:ring-amber-300/30"
              />
            </div>

            {/* Goal Type */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Goal Type *</label>
              <div className="flex gap-1">
                <div ref={goalDropRef} className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setShowGoalDrop((p) => !p)}
                    className="relative h-9 w-full rounded-lg border border-amber-100/15 bg-stone-900 pl-2 pr-6 text-left text-[11px] text-stone-100 outline-none transition focus:border-amber-300/35"
                  >
                    {form.goalType
                      ? goalOptions.find((g) => g.value === form.goalType)?.label ?? form.goalType
                      : <span className="text-stone-500">Select goal type</span>}
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▾</span>
                  </button>
                  {showGoalDrop && (
                    <div className="journal-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto scroll-smooth rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/25 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/45">
                      {goalOptions.map((gt) => {
                        const isDefault = GOAL_TYPES.some((d) => d.value === gt.value);
                        return (
                          <div key={gt.value} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => { setField("goalType", gt.value); setShowGoalDrop(false); }}
                              className={`flex-1 px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${
                                form.goalType === gt.value ? "bg-amber-500/15 text-amber-200" : "text-stone-100"
                              }`}
                            >
                              {gt.label}
                            </button>
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGoalOptions((prev) => {
                                    const next = prev.filter((x) => x.value !== gt.value);
                                    persistCustomGoalOptions(next);
                                    return next;
                                  });
                                  if (form.goalType === gt.value) setField("goalType", "");
                                }}
                                className="mr-1.5 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomGoal((p) => !p)}
                  className="rounded-lg border border-amber-300/25 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/45"
                >
                  + Goal
                </button>
              </div>
              {showCustomGoal && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGoal(); } }}
                    placeholder="e.g. Flexibility"
                    className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-300/35"
                  />
                  <button
                    type="button"
                    onClick={handleAddGoal}
                    className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Workout Split */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Workout Split *</label>
              <div className="flex gap-1">
                <div ref={splitDropRef} className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setShowSplitDrop((p) => !p)}
                    className="relative h-9 w-full rounded-lg border border-amber-100/15 bg-stone-900 pl-2 pr-6 text-left text-[11px] text-stone-100 outline-none transition focus:border-amber-300/35"
                  >
                    {form.workoutSplit
                      ? splitOptions.find((s) => s.value === form.workoutSplit)?.label ?? form.workoutSplit
                      : <span className="text-stone-500">Select split</span>}
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">▾</span>
                  </button>
                  {showSplitDrop && (
                    <div className="journal-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto scroll-smooth rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-400/25 hover:[&::-webkit-scrollbar-thumb]:bg-amber-400/45">
                      {splitOptions.map((s) => {
                        const isDefault = WORKOUT_SPLITS.some((d) => d.value === s.value);
                        return (
                          <div key={s.value} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => { setField("workoutSplit", s.value); setShowSplitDrop(false); }}
                              className={`flex-1 px-3 py-1.5 text-left text-[11px] transition hover:bg-amber-500/10 hover:text-amber-200 ${
                                form.workoutSplit === s.value ? "bg-amber-500/15 text-amber-200" : "text-stone-100"
                              }`}
                            >
                              {s.label}
                            </button>
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSplitOptions((prev) => {
                                    const next = prev.filter((x) => x.value !== s.value);
                                    persistCustomSplitOptions(next);
                                    return next;
                                  });
                                  if (form.workoutSplit === s.value) setField("workoutSplit", "");
                                }}
                                className="mr-1.5 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomSplit((p) => !p)}
                  className="rounded-lg border border-amber-300/25 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/45"
                >
                  + Split
                </button>
              </div>
              {showCustomSplit && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={customSplit}
                    onChange={(e) => setCustomSplit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSplit(); } }}
                    placeholder="e.g. My Custom Split"
                    className="flex-1 rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-300/35"
                  />
                  <button
                    type="button"
                    onClick={handleAddSplit}
                    className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Add Exercises */}
            <div>
              <div className="mb-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Add Exercises *</label>
              </div>
              <div ref={searchRef} className="relative">
                <input
                  type="text"
                  value={exSearch}
                  onChange={(e) => { setExSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Search library or type custom name…"
                  className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35"
                />
                {showDrop && exSearch.trim().length > 0 && (
                  <div className="journal-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-amber-100/15 bg-stone-900 py-1 shadow-xl shadow-black/50">
                    {searchResults.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => handleSelectLibrary(ex)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] transition hover:bg-amber-500/10"
                      >
                        <span className="text-stone-100">{ex.name}</span>
                        <span className="text-stone-400">{ex.bodyPart}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddCustomEx}
                      className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] text-amber-300 transition hover:bg-amber-500/10"
                    >
                      <span>➕</span>
                      <span>Add &ldquo;{exSearch.trim()}&rdquo; as custom</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Exercise detail form */}
              {showExForm && (
                <div className="mt-2 space-y-2 rounded-lg border border-amber-100/15 bg-white/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">{currentEx.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Sets *</label>
                      <input type="number" min="1" value={currentEx.sets}
                        onChange={(e) => setCurrentEx((p) => ({ ...p, sets: e.target.value }))}
                        placeholder="e.g. 4"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Reps</label>
                      <input type="text" value={currentEx.reps}
                        onChange={(e) => setCurrentEx((p) => ({ ...p, reps: e.target.value }))}
                        placeholder="e.g. 8-12"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Weight (kg)</label>
                      <input type="text" value={currentEx.weight}
                        onChange={(e) => setCurrentEx((p) => ({ ...p, weight: e.target.value }))}
                        placeholder="e.g. 80"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Duration (min) / Set *</label>
                      <input type="number" min="0" value={currentEx.duration}
                        onChange={(e) => setCurrentEx((p) => ({ ...p, duration: e.target.value }))}
                        placeholder="e.g. 5"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Rest b/w Sets (sec) *</label>
                      <input type="number" min="0" value={currentEx.restTime}
                        onChange={(e) => setCurrentEx((p) => ({ ...p, restTime: e.target.value }))}
                        placeholder="e.g. 90"
                        className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Muscle Group *</label>
                      {currentEx.id?.startsWith("custom-") ? (
                        <select
                          value={currentEx.bodyPartGroup}
                          onChange={(e) => setCurrentEx((p) => ({ ...p, bodyPartGroup: e.target.value, bodyPartSection: "" }))}
                          className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35"
                        >
                          <option value="">Select group…</option>
                          {BODY_PART_GROUPS.map((bp) => (
                            <option key={bp.group} value={bp.group}>{bp.group}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={currentEx.bodyPartGroup}
                          disabled
                          placeholder="Auto selected"
                          className="w-full cursor-not-allowed rounded-lg border border-amber-100/15 bg-stone-900/70 px-2 py-1 text-xs text-stone-100 outline-none disabled:opacity-100"
                        />
                      )}
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-stone-400">Section {selectedBodyPartSections.length > 0 ? "*" : ""}</label>
                      {currentEx.id?.startsWith("custom-") ? (
                        <select
                          value={currentEx.bodyPartSection}
                          onChange={(e) => setCurrentEx((p) => ({ ...p, bodyPartSection: e.target.value }))}
                          disabled={selectedBodyPartSections.length === 0}
                          className="w-full rounded-lg border border-amber-100/15 bg-black/30 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">{selectedBodyPartSections.length === 0 ? "Select group first…" : "Select section…"}</option>
                          {selectedBodyPartSections.map((sec) => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={currentEx.bodyPartSection}
                          disabled
                          placeholder="Auto selected"
                          className="w-full cursor-not-allowed rounded-lg border border-amber-100/15 bg-stone-900/70 px-2 py-1 text-xs text-stone-100 outline-none disabled:opacity-100"
                        />
                      )}
                    </div>
                  </div>
                  {exError && <p className="text-[10px] text-red-300">{exError}</p>}
                  <div className="flex gap-2 pt-0.5">
                    <button type="button" onClick={handleSaveExercise}
                      className="flex-1 rounded-lg border border-amber-400/35 bg-amber-400/10 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/20">
                      Save Exercise
                    </button>
                    <button type="button" onClick={() => { setShowExForm(false); setExSearch(""); setCurrentEx({ ...BLANK_EXERCISE }); setExError(""); }}
                      className="rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1 text-[11px] text-stone-400 transition hover:text-stone-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {exercises.length > 0 && (
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-[10px] text-amber-300/70">{exercises.length} exercise{exercises.length > 1 ? "s" : ""} added</p>
                  <button
                    type="button"
                    onClick={() => setViewWorkout({ title: "Current Workout", exercises })}
                    className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    View
                  </button>
                </div>
              )}
            </div>

            {/* Total Estimated Time */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Total Estimated Time (min) *</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.totalEstimatedTime}
                onChange={(e) => setField("totalEstimatedTime", e.target.value)}
                placeholder="e.g. 60"
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-3 py-1.5 text-sm text-stone-100 outline-none transition focus:border-amber-300/35"
              />
              <p className="mt-1 text-[10px] text-stone-500">Auto-calculated from exercise sets, duration, and rest between sets. You can adjust manually.</p>
            </div>

            {/* Days */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Days *</label>
              <div className="grid grid-cols-7 gap-1">
                {WEEK_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded border py-1.5 text-[10px] font-semibold transition ${
                      form.days.includes(day)
                        ? "border-amber-300/55 bg-amber-400/15 text-amber-100"
                        : "border-amber-100/15 bg-white/5 text-stone-300"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-2 rounded-lg border border-amber-100/10 bg-white/5 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    disabled={!!(editingId && form.startDate && form.startDate <= today)}
                    onChange={(e) => setField("startDate", e.target.value)}
                    className={`w-full rounded-lg border border-amber-100/15 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35 ${editingId && form.startDate && form.startDate <= today ? "cursor-not-allowed bg-stone-900/70 opacity-60" : "bg-white/5"}`}
                  />
                  {editingId && form.startDate && form.startDate <= today && (
                    <p className="mt-0.5 text-[10px] text-amber-400/70">Workout already started — start date is locked.</p>
                  )}
                </div>
                {!form.neverEnds && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">End</label>
                    <input type="date" value={form.endDate} min={toISO(new Date(new Date(form.startDate > today ? form.startDate : today).getTime() + 86400000))}
                      onChange={(e) => setField("endDate", e.target.value)}
                      className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-2 py-1 text-xs text-stone-100 outline-none focus:border-amber-300/35" />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-300">
                <input type="checkbox" checked={form.neverEnds}
                  onChange={(e) => setField("neverEnds", e.target.checked)} className="accent-amber-400" />
                Never End
              </label>
            </div>


            {/* Difficulty */}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">Difficulty Level *</label>
              <div className="flex gap-1.5">
                {DIFFICULTY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setField("difficulty", lvl)}
                    className={`flex flex-1 items-center justify-center rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                      form.difficulty === lvl
                        ? DIFFICULTY_STYLES[lvl]
                        : "border-amber-100/15 bg-white/5 text-stone-300"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-300">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:from-amber-400/25 hover:to-orange-400/20"
            >
              {editingId ? "Update Workout" : "Add Workout"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="w-full rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100">
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* ── ALL WORKOUTS ── */}
        <section
          className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-5 shadow-xl shadow-black/20 lg:flex-1 lg:[height:min(720px,78vh)]"
        >
          <div className="mb-4 shrink-0 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200">All Workouts</p>
              <p className="mt-0.5 text-xs text-stone-400">Your saved workout plans.</p>
              <div className="mt-2 flex items-center gap-1.5">
                {["active", "archive"].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setWorkoutsView(view)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition ${
                      workoutsView === view
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-amber-300/35 hover:text-amber-200"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWorkoutDayFilter("all")}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                    workoutDayFilter === "all"
                      ? "border-sky-300/45 bg-sky-500/15 text-sky-100"
                      : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-sky-300/35 hover:text-sky-100"
                  }`}
                >
                  All Days
                </button>
                {WEEK_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setWorkoutDayFilter(day)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                      workoutDayFilter === day
                        ? "border-sky-300/45 bg-sky-500/15 text-sky-100"
                        : "border-amber-100/10 bg-white/5 text-stone-400 hover:border-sky-300/35 hover:text-sky-100"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 px-3 py-1 text-xs text-stone-300">
              {displayedWorkouts.length} total
            </span>
          </div>

          <div ref={workoutListRef} className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="mt-6 text-center text-xs text-stone-500">Loading workouts...</p>
            ) : displayedWorkouts.length === 0 ? (
              <p className="mt-6 text-center text-xs text-stone-500">
                {workoutsView === "active"
                  ? workoutDayFilter === "all"
                    ? "No workouts yet. Create one to get started."
                    : `No active workouts for ${workoutDayFilter}.`
                  : workoutDayFilter === "all"
                    ? "No archived workouts yet."
                    : `No archived workouts for ${workoutDayFilter}.`}
              </p>
            ) : (
              displayedWorkouts.map((w, wi) => (
                <Motion.article
                  key={w.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-amber-100/10 bg-white/5 p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: wi * 0.06, duration: 0.22 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 break-words pr-1 text-sm font-semibold leading-tight text-stone-100">{w.title}</p>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {w._archiveSource === "deleted" ? (
                          <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                            Deleted
                          </span>
                        ) : (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            w.isActive
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-stone-500/20 bg-white/5 text-stone-400"
                          }`}>
                            {w.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[w.difficulty] || "border-amber-100/10 text-stone-300"}`}>
                          {w.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => setViewWorkout(w)}
                        className="rounded border border-amber-100/20 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-stone-300 transition hover:text-stone-100">
                        View
                      </button>
                      {workoutsView !== "archive" && (
                        <>
                          <button type="button" onClick={() => handleToggleWorkoutActive(w.id)}
                            className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition ${
                              w.isActive
                                ? "border-stone-400/25 bg-white/5 text-stone-300 hover:text-stone-100"
                                : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                            }`}>
                            {w.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" onClick={() => openCopyWorkout(w.id)}
                            className="rounded border border-sky-300/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-500/20">
                            Copy
                          </button>
                          <button type="button" onClick={() => startEdit(w)}
                            className="rounded border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/20">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDelete(w.id)}
                            className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {w.goalType && (
                      <span className="rounded-full border border-amber-300/35 bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-200">
                        {GOAL_TYPES.find((g) => g.value === w.goalType)?.label ?? w.goalType}
                      </span>
                    )}
                    {w.workoutSplit && (
                      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                        {splitOptions.find((s) => s.value === w.workoutSplit)?.label ?? w.workoutSplit}
                      </span>
                    )}
                    {w.totalEstimatedTime && (
                      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                        ⏱ {w.totalEstimatedTime} min
                      </span>
                    )}
                    <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                      Total {(w.exercises?.length ?? 0)} exercise{(w.exercises?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    {w.startDate && (
                      <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                        Starts {w.startDate}
                      </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${w.neverEnds ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200" : "border-rose-400/25 bg-rose-500/10 text-rose-200"}`}>
                      {w.neverEnds ? "Never Ends" : `Ends ${w.endDate}`}
                    </span>
                    {w.days?.length > 0 && w.days.map((d) => (
                      <span key={d} className="rounded-full border border-amber-300/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200">
                        {d}
                      </span>
                    ))}
                  </div>

                </Motion.article>
              ))
            )}
          </div>
        </section>

        {/* ── SIDEBAR: Logs ── */}
        <aside className="min-w-0 lg:w-52 xl:w-[22rem] lg:shrink-0">
          <div
            className="flex flex-col rounded-2xl border border-amber-100/10 bg-gradient-to-b from-black/20 to-black/10 p-4 shadow-xl shadow-black/20 lg:[height:min(720px,78vh)]"
          >
            <div className="mb-3 shrink-0 border-b border-amber-100/10 pb-3">
              <p className="text-sm font-semibold tracking-wide text-amber-200">Workout Logs</p>
              <p className="mt-0.5 text-xs text-stone-400">Recent activity</p>
            </div>

            {logs.length === 0 ? (
              <p className="text-sm text-stone-400">No logs yet.</p>
            ) : (
              <div className="journal-scroll min-h-0 flex-1 space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
                {logs.map((log, li) => (
                  (() => {
                    const undoMeta = log.action === "deleted" ? getDeleteUndoMeta(log, undoClockMs) : null;
                    const isDeletedButAlreadyRestored = restoredFromDeleteLogIds.has(String(log.id));
                    const canUndoDelete = Boolean(log.deletedItem && undoMeta?.canUndo && !isDeletedButAlreadyRestored);
                    return (
                  <Motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: li * 0.04, duration: 0.18 }}
                    className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-[11px] ${
                      log.action === "deleted"
                        ? "border-rose-400/20 bg-rose-500/5 text-stone-300"
                        : log.action === "updated"
                          ? "border-amber-300/20 bg-amber-500/5 text-stone-300"
                        : log.action === "restored"
                          ? "border-cyan-300/20 bg-cyan-500/5 text-stone-300"
                          : log.action === "activated"
                            ? "border-emerald-400/20 bg-emerald-500/5 text-stone-300"
                            : log.action === "deactivated"
                              ? "border-stone-400/20 bg-white/5 text-stone-300"
                          : log.action === "copied"
                            ? "border-sky-300/20 bg-sky-500/5 text-stone-300"
                          : "border-amber-100/10 bg-white/5 text-stone-200"
                    }`}
                  >
                    <p className="min-w-0 flex-1">
                      <span className={`font-semibold ${
                        log.action === "deleted" ? "text-rose-300"
                        : log.action === "updated" ? "text-amber-200"
                        : log.action === "restored" ? "text-cyan-200"
                        : log.action === "activated" ? "text-emerald-300"
                        : log.action === "deactivated" ? "text-stone-300"
                        : log.action === "copied" ? "text-sky-200"
                        : "text-emerald-300"
                      }`}>
                        {log.action === "deleted" ? "Deleted" : log.action === "updated" ? "Updated" : log.action === "restored" ? "Restored" : log.action === "activated" ? "Activated" : log.action === "deactivated" ? "Deactivated" : log.action === "copied" ? "Copied" : "Created"}:
                      </span>{" "}
                      <span className="break-all font-semibold text-stone-100">{log.title}</span>
                      {log.note ? ` ${log.note}` : ""} on {log.date} at {fmtTime(log.time)}
                    </p>
                    {log.action === "deleted" && (
                      <div className="shrink-0 flex items-center gap-1">
                        {isDeletedButAlreadyRestored ? (
                          <span className="rounded border border-cyan-300/25 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200">
                            restored
                          </span>
                        ) : (
                          <span className="rounded border border-amber-300/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                            {formatUndoCountdown(undoMeta?.remainingMs || 0)}
                          </span>
                        )}
                        {canUndoDelete && (
                          <button type="button" onClick={() => handleUndo(log.id)}
                            className="shrink-0 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                            title="Undo delete">
                            ↺ Undo
                          </button>
                        )}
                      </div>
                    )}
                  </Motion.div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Exercise View Modal */}
      {viewWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="flex w-full max-w-md max-h-[80vh] flex-col rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.95),rgba(12,8,8,0.97))] p-5 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200/60">{viewWorkout.title}</p>
                <h3 className="mt-1 text-base font-semibold text-amber-100">
                  Exercises <span className="text-sm text-stone-400">({viewWorkout.exercises?.length ?? 0})</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewWorkout(null)}
                className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Close
              </button>
            </div>

            {!viewWorkout.exercises?.length ? (
              <p className="text-center text-xs text-stone-500">No exercises in this workout.</p>
            ) : (
              <div className="journal-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {viewWorkout.exercises.map((ex, idx) => (
                  <div key={ex.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-400/70">{idx + 1}.</span>
                      <p className="text-sm font-semibold text-stone-100">{ex.name}</p>
                      {ex.bodyPart && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-[10px] text-stone-300">
                          {ex.bodyPart}
                        </span>
                      )}
                      {!viewWorkout.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromView(ex.id)}
                          className="ml-auto shrink-0 rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 transition hover:bg-rose-500/20"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {ex.sets && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                          Sets: <span className="text-stone-100">{ex.sets}</span>
                        </span>
                      )}
                      {ex.reps && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                          Reps: <span className="text-stone-100">{ex.reps}</span>
                        </span>
                      )}
                      {ex.weight && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                          Weight: <span className="text-stone-100">{ex.weight} kg</span>
                        </span>
                      )}
                      {ex.duration && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                          Duration: <span className="text-stone-100">{ex.duration} min</span>
                        </span>
                      )}
                      {ex.restTime && (
                        <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-stone-300">
                          Rest: <span className="text-stone-100">{ex.restTime}s</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {copyWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="flex w-full max-w-md flex-col rounded-2xl border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_35%),linear-gradient(180deg,rgba(30,18,14,0.95),rgba(12,8,8,0.97))] p-5 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-200/60">{copyWorkout.title}</p>
                <h3 className="mt-1 text-base font-semibold text-stone-100">Copy Workout</h3>
                <p className="mt-1 text-xs text-stone-400">Choose the remaining day(s) for this workout.</p>
              </div>
              <button
                type="button"
                onClick={() => { setCopyWorkout(null); setCopyDays([]); setCopyError(""); }}
                className="rounded border border-amber-100/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Close
              </button>
            </div>

            {remainingCopyDays.length === 0 ? (
              <p className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-3 text-sm text-stone-400">
                This workout is already copied to all days.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {remainingCopyDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleCopyDay(day)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        copyDays.includes(day)
                          ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                          : "border-amber-100/10 bg-white/5 text-stone-300 hover:border-sky-300/35 hover:text-sky-100"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {copyError && <p className="mt-3 text-xs text-rose-300">{copyError}</p>}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWorkout}
                    className="flex-1 rounded-lg border border-sky-300/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20"
                  >
                    Copy To Selected Days
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCopyWorkout(null); setCopyDays([]); setCopyError(""); }}
                    className="rounded-lg border border-amber-100/15 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
