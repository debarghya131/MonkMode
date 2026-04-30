import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";

const STORAGE_KEY = "monkmode_gym_measurements";

const MEASUREMENT_GROUPS = [
  {
    title: "Body Weight",
    description: "Track your daily body weight over time.",
    fields: [
      { key: "bodyWeight", label: "Body Weight", unit: "kg" },
    ],
  },
  {
    title: "Upper Body",
    description: "Track your key torso and upper-body numbers in one pass.",
    fields: [
      { key: "chest", label: "Chest", unit: "cm" },
      { key: "upperChest", label: "Upper Chest", unit: "cm" },
      { key: "lowerChest", label: "Lower Chest", unit: "cm" },
      { key: "waist", label: "Waist", unit: "cm" },
      { key: "upperWaist", label: "Upper Waist", unit: "cm" },
      { key: "lowerWaist", label: "Lower Belly", unit: "cm" },
      { key: "shoulders", label: "Shoulders", unit: "cm" },
      { key: "neck", label: "Neck", unit: "cm" },
      { key: "hips", label: "Hips (Glutes)", unit: "cm" },
    ],
  },
  {
    title: "Arms",
    description: "Keep both overall and left-right arm measurements together.",
    fields: [
      { key: "armsBiceps", label: "Arms (Biceps)", unit: "cm" },
      { key: "leftArm", label: "Left Arm", unit: "cm" },
      { key: "rightArm", label: "Right Arm", unit: "cm" },
      { key: "forearms", label: "Forearms", unit: "cm" },
      { key: "leftForearm", label: "Left Forearm", unit: "cm" },
      { key: "rightForearm", label: "Right Forearm", unit: "cm" },
    ],
  },
  {
    title: "Lower Body",
    description: "Log legs and ankle measurements for your lower-body progress.",
    fields: [
      { key: "thighs", label: "Thighs", unit: "cm" },
      { key: "leftThigh", label: "Left Thigh", unit: "cm" },
      { key: "rightThigh", label: "Right Thigh", unit: "cm" },
      { key: "calves", label: "Calves", unit: "cm" },
      { key: "leftCalf", label: "Left Calf", unit: "cm" },
      { key: "rightCalf", label: "Right Calf", unit: "cm" },
      { key: "ankle", label: "Ankle", unit: "cm" },
    ],
  },
];

const MEASUREMENT_FIELDS = MEASUREMENT_GROUPS.flatMap((group) => group.fields);

const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftISO = (baseDate, offsetDays) => {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offsetDays);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createDemoEntries = () => {
  const baseDate = new Date();
  return [
    {
      id: "demo-checkin-1",
      checkInDate: shiftISO(baseDate, -56),
      bodyWeight: "84.2",
      chest: "104.0",
      upperChest: "101.0",
      lowerChest: "103.0",
      waist: "92.0",
      upperWaist: "88.0",
      lowerWaist: "94.0",
      shoulders: "119.0",
      neck: "39.0",
      hips: "102.0",
      armsBiceps: "36.0",
      leftArm: "35.5",
      rightArm: "36.2",
      forearms: "30.0",
      leftForearm: "29.8",
      rightForearm: "30.2",
      thighs: "58.5",
      leftThigh: "58.0",
      rightThigh: "58.8",
      calves: "38.0",
      leftCalf: "37.8",
      rightCalf: "38.1",
      ankle: "23.0",
      updatedAt: `${shiftISO(baseDate, -56)}T08:10:00.000Z`,
    },
    {
      id: "demo-checkin-2",
      checkInDate: shiftISO(baseDate, -28),
      bodyWeight: "82.6",
      chest: "105.2",
      upperChest: "102.0",
      lowerChest: "104.1",
      waist: "89.8",
      upperWaist: "86.5",
      lowerWaist: "91.7",
      shoulders: "120.2",
      neck: "39.4",
      hips: "101.0",
      armsBiceps: "36.9",
      leftArm: "36.2",
      rightArm: "37.1",
      forearms: "30.5",
      leftForearm: "30.2",
      rightForearm: "30.7",
      thighs: "59.3",
      leftThigh: "58.9",
      rightThigh: "59.5",
      calves: "38.4",
      leftCalf: "38.2",
      rightCalf: "38.6",
      ankle: "23.1",
      updatedAt: `${shiftISO(baseDate, -28)}T08:10:00.000Z`,
    },
    {
      id: "demo-checkin-3",
      checkInDate: shiftISO(baseDate, -7),
      bodyWeight: "81.4",
      chest: "106.3",
      upperChest: "103.1",
      lowerChest: "105.2",
      waist: "87.9",
      upperWaist: "84.8",
      lowerWaist: "89.9",
      shoulders: "121.5",
      neck: "39.8",
      hips: "100.1",
      armsBiceps: "37.6",
      leftArm: "36.9",
      rightArm: "37.9",
      forearms: "30.9",
      leftForearm: "30.6",
      rightForearm: "31.2",
      thighs: "60.0",
      leftThigh: "59.6",
      rightThigh: "60.3",
      calves: "38.8",
      leftCalf: "38.6",
      rightCalf: "39.0",
      ankle: "23.2",
      updatedAt: `${shiftISO(baseDate, -7)}T08:10:00.000Z`,
    },
  ];
};

const createFormFromEntry = (entry = {}, checkInDate = todayISO()) => ({
  checkInDate,
  ...Object.fromEntries(MEASUREMENT_FIELDS.map(({ key }) => [key, entry[key] ?? ""])),
});

const createBlankForm = () => createFormFromEntry({}, todayISO());
const DEFAULT_GROUP_TITLE = MEASUREMENT_GROUPS[0]?.title ?? "";

const hasValue = (value) => value !== "" && value !== null && value !== undefined;

const filledCount = (entry) =>
  MEASUREMENT_FIELDS.filter(({ key }) => hasValue(entry?.[key])).length;

const getGroupGridClass = (title) =>
  title === "Body Weight" ? "lg:grid-cols-1" : title === "Upper Body" ? "lg:grid-cols-5" : title === "Arms" ? "lg:grid-cols-3" : "lg:grid-cols-4";

const buildUpdateSummary = (previousEntry, nextEntry) => {
  const changedFields = [];
  const unchangedFields = [];

  MEASUREMENT_FIELDS.forEach((field) => {
    const previousValue = String(previousEntry?.[field.key] ?? "").trim();
    const nextValue = String(nextEntry?.[field.key] ?? "").trim();
    const payload = {
      key: field.key,
      label: field.label,
      unit: field.unit,
      previousValue,
      nextValue,
    };

    if (previousValue === nextValue) {
      unchangedFields.push(payload);
    } else {
      changedFields.push(payload);
    }
  });

  return { changedFields, unchangedFields };
};

const sortEntries = (entries) =>
  [...entries].sort(
    (left, right) =>
      (right.checkInDate || "").localeCompare(left.checkInDate || "") ||
      (right.updatedAt || "").localeCompare(left.updatedAt || "")
  );

const readStoredEntries = () => {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return sortEntries(createDemoEntries());

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return sortEntries(createDemoEntries());

    const validEntries = parsed.filter(
      (entry) => entry && typeof entry === "object" && typeof entry.id === "string"
    );
    if (validEntries.length === 0) return sortEntries(createDemoEntries());

    return sortEntries(validEntries);
  } catch {
    return sortEntries(createDemoEntries());
  }
};

const formatDate = (value) => {
  if (!value) return "No date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function MeasurementInput({ field, value, onChange, readOnly = false, required = false }) {
  return (
    <label className="block min-w-0">
      <span className="flex min-h-[2.4rem] items-end break-words text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-stone-400">
        {field.label}
      </span>
      <div className="relative mt-1.5">
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={readOnly ? undefined : (event) => onChange(field.key, event.target.value)}
          placeholder="0.0"
          readOnly={readOnly}
          required={required && !readOnly}
          className={`w-full rounded-xl border border-amber-100/10 bg-black/20 px-2.5 py-2 pr-10 text-[12px] text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-amber-300/35 focus:bg-black/30 ${
            readOnly ? "cursor-default opacity-80" : ""
          }`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] font-semibold text-stone-500">
          {field.unit}
        </span>
      </div>
    </label>
  );
}

export default function Measurements() {
  const currentDate = todayISO();
  const [form, setForm] = useState(createBlankForm);
  const [entries, setEntries] = useState(readStoredEntries);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeGroupTitle, setActiveGroupTitle] = useState(DEFAULT_GROUP_TITLE);
  const [savedActiveGroupTitle, setSavedActiveGroupTitle] = useState(DEFAULT_GROUP_TITLE);
  const [updateSummary, setUpdateSummary] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event("monkmode:gym-measurements-updated"));
  }, [entries]);

  useEffect(() => {
    if (!entries.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    if (selectedId && entries.some((entry) => entry.id === selectedId)) return;
    setSelectedId(entries[0].id);
  }, [entries, selectedId]);

  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) || entries[0] || null;
  const todayEntry = entries.find((entry) => entry.checkInDate === currentDate) || null;
  const activeGroup =
    MEASUREMENT_GROUPS.find((group) => group.title === activeGroupTitle) || MEASUREMENT_GROUPS[0];
  const savedActiveGroup =
    MEASUREMENT_GROUPS.find((group) => group.title === savedActiveGroupTitle) || MEASUREMENT_GROUPS[0];
  const savedTodayMessage = todayEntry
    ? `Measurements saved successfully on ${formatDate(todayEntry.checkInDate)}.`
    : "";
  const isFirstSave = !todayEntry && !editingId;
  const isTodayLocked = Boolean(todayEntry) && !editingId;
  const allFieldsFilled = filledCount(form) === MEASUREMENT_FIELDS.length;

  useEffect(() => {
    if (editingId) return;

    if (todayEntry) {
      setForm(createFormFromEntry(todayEntry, currentDate));
      return;
    }

    setForm((current) =>
      current.checkInDate === currentDate ? current : createBlankForm()
    );
  }, [currentDate, editingId, todayEntry]);

  useEffect(() => {
    if (editingId || error || status || !savedTodayMessage) return;
    setStatus(savedTodayMessage);
  }, [editingId, error, savedTodayMessage, status]);

  const deleteEntry = (id) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setUpdateSummary(null);
    setError("");
    if (todayEntry) {
      setForm(createFormFromEntry(todayEntry, currentDate));
      setStatus(savedTodayMessage);
      return;
    }
    setForm(createBlankForm());
    setStatus("");
  };

  const updateFormField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
    if (status) setStatus("");
  };

  const startEditing = (entry) => {
    if (!entry || entry.checkInDate !== currentDate) return;
    setEditingId(entry.id);
    setSelectedId(entry.id);
    setUpdateSummary(null);
    setForm(createFormFromEntry(entry, currentDate));
    setError("");
    setStatus(`Editing check-in from ${formatDate(entry.checkInDate)}.`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isFirstSave && !allFieldsFilled) {
      setError(`Fill in all ${MEASUREMENT_FIELDS.length} measurements before saving for the first time.`);
      setStatus("");
      return;
    }

    if (!filledCount(form)) {
      setError("Add at least one measurement before saving.");
      setStatus("");
      return;
    }

    if (!editingId && todayEntry) {
      setSelectedId(todayEntry.id);
      setError("");
      setStatus(savedTodayMessage);
      setForm(createFormFromEntry(todayEntry, currentDate));
      return;
    }

    const timestamp = new Date().toISOString();
    const previousEntry = editingId
      ? entries.find((entry) => entry.id === editingId) || null
      : null;
    const nextEntry = {
      id: editingId || `measurement-${Date.now()}`,
      checkInDate: currentDate,
      updatedAt: timestamp,
      ...Object.fromEntries(
        MEASUREMENT_FIELDS.map(({ key }) => [key, String(form[key] ?? "").trim()])
      ),
    };

    setEntries((current) => {
      const nextEntries = editingId
        ? current.map((entry) => (entry.id === editingId ? nextEntry : entry))
        : [nextEntry, ...current];
      return sortEntries(nextEntries);
    });

    setSelectedId(nextEntry.id);
    setStatus(
      editingId
        ? `Measurements updated successfully on ${formatDate(currentDate)}.`
        : `Measurements saved successfully on ${formatDate(currentDate)}.`
    );
    if (previousEntry) {
      setUpdateSummary({
        date: nextEntry.checkInDate,
        ...buildUpdateSummary(previousEntry, nextEntry),
      });
    } else {
      setUpdateSummary(null);
    }
    setError("");
    setForm(createFormFromEntry(nextEntry, currentDate));
    setEditingId(null);
  };

  const visibleMeasurements = selectedEntry
    ? MEASUREMENT_FIELDS.filter(({ key }) => hasValue(selectedEntry[key]))
    : [];
  const visibleSavedMeasurements = selectedEntry
    ? savedActiveGroup.fields.filter(({ key }) => hasValue(selectedEntry[key]))
    : [];

  return (
    <>
      <div className="mt-8 grid gap-6 lg:h-[calc(100vh-17rem)] lg:min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-amber-100/10 bg-[linear-gradient(180deg,rgba(251,191,36,0.06),rgba(255,255,255,0.02))] p-6 shadow-lg shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="mt-2 text-xl font-semibold text-stone-100">
                {editingId ? "Update measurements" : "Add measurements"}
              </h3>
            </div>
            <div className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
              {filledCount(form)} field{filledCount(form) !== 1 ? "s" : ""} ready
            </div>
          </div>

          <form
            className="mt-4 flex-1 space-y-4 overflow-x-hidden overflow-y-auto pr-1"
            onSubmit={handleSubmit}
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Check-in Date
              </span>
              <input
                type="date"
                value={currentDate}
                readOnly
                className="mt-1.5 w-full rounded-2xl border border-amber-100/10 bg-black/20 px-3 py-2.5 text-xs text-stone-100 outline-none transition focus:border-amber-300/35 focus:bg-black/30"
              />
            </label>

            <div className="rounded-[1.5rem] border border-amber-100/10 bg-black/15 p-1">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MEASUREMENT_GROUPS.map((group) => {
                  const isActive = activeGroup.title === group.title;
                  return (
                    <Motion.button
                      key={group.title}
                      type="button"
                      onClick={() => setActiveGroupTitle(group.title)}
                      whileHover={!isActive ? {
                        scale: 1.05,
                        boxShadow: "0 0 14px rgba(251,191,36,0.4)",
                      } : {}}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
                        isActive
                          ? "border-amber-300/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] text-stone-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
                          : "border-amber-100/10 bg-white/5 text-stone-300 hover:border-amber-300/30 hover:bg-amber-500/10 hover:text-amber-200"
                      }`}
                    >
                      {group.title}
                    </Motion.button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-amber-100/10 bg-black/15 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100/10 pb-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-200">
                    {activeGroup.title}
                  </h4>
                  <p className="mt-1 text-xs text-stone-500">{activeGroup.description}</p>
                </div>
                <div className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-stone-400">
                  {activeGroup.fields.length} inputs
                </div>
              </div>

              <div className={`mt-4 grid gap-2.5 md:grid-cols-2 ${getGroupGridClass(activeGroup.title)}`}>
                {activeGroup.fields.map((field) => (
                  <MeasurementInput
                    key={field.key}
                    field={field}
                    value={form[field.key]}
                    onChange={updateFormField}
                    readOnly={isTodayLocked}
                    required={isFirstSave}
                  />
                ))}
              </div>
            </div>

            {(error || status) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  error
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {error || status}
              </div>
            )}

            <div className="ml-2 flex flex-wrap items-center gap-3">
              {(!todayEntry || editingId) && (
                <Motion.button
                  type="submit"
                  animate={{
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      "0 0 0px rgba(251,191,36,0)",
                      "0 0 14px rgba(251,191,36,0.55)",
                      "0 0 0px rgba(251,191,36,0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.06, boxShadow: "0 0 20px rgba(251,191,36,0.65), 0 0 40px rgba(251,191,36,0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  className="relative rounded-2xl border border-amber-300/40 bg-amber-500/15 px-5 py-3 text-sm font-semibold text-amber-100 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950"
                >
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <Motion.span
                      className="absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/25 blur-sm"
                      animate={{ left: ["-40%", "130%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
                    />
                  </span>
                  <span className="relative z-10">{editingId ? "Update measurements" : "Save measurements"}</span>
                </Motion.button>
              )}

              {!editingId && todayEntry && (
                <button
                  type="button"
                  onClick={() => startEditing(todayEntry)}
                  className="rounded-2xl border border-sky-300/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
                >
                  Update
                </button>
              )}

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-stone-500/20 bg-white/5 px-5 py-3 text-sm font-semibold text-stone-300 transition hover:text-stone-100"
                >
                  Cancel update
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_42%),linear-gradient(180deg,rgba(20,14,12,0.96),rgba(10,8,8,0.98))] p-6 shadow-lg shadow-black/25">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="mt-2 text-xl font-semibold text-stone-100">
                Saved measurements
              </h3>
            </div>
            <div className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
              {entries.length} saved
            </div>
          </div>

          {!selectedEntry ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-amber-100/10 bg-black/20 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-stone-200">No measurements saved yet.</p>
              <p className="mt-2 text-sm text-stone-500">
                Your first check-in will appear here as soon as you save it.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.6fr)]">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-amber-100/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-stone-100">
                        {formatDate(selectedEntry.checkInDate)}
                      </h4>
                      {entries[0]?.id === selectedEntry.id && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-amber-100/10 bg-black/15 p-1">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MEASUREMENT_GROUPS.map((group) => {
                      const isActive = savedActiveGroup.title === group.title;
                      return (
                        <Motion.button
                          key={group.title}
                          type="button"
                          onClick={() => setSavedActiveGroupTitle(group.title)}
                          whileHover={!isActive ? {
                            scale: 1.05,
                            boxShadow: "0 0 14px rgba(251,191,36,0.4)",
                          } : {}}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
                            isActive
                              ? "border-amber-300/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] text-stone-950 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
                              : "border-amber-100/10 bg-white/5 text-stone-300 hover:border-amber-300/30 hover:bg-amber-500/10 hover:text-amber-200"
                          }`}
                        >
                          {group.title}
                        </Motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-amber-100/10 bg-black/15 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100/10 pb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-200">
                        {savedActiveGroup.title}
                      </h4>
                      <p className="mt-1 text-xs text-stone-500">{savedActiveGroup.description}</p>
                    </div>
                    <div className="shrink-0 rounded-full border border-amber-100/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-stone-400">
                      {savedActiveGroup.fields.length} inputs
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto scroll-smooth pr-1">
                    {visibleSavedMeasurements.length === 0 ? (
                      <p className="text-sm text-stone-500">No measurements logged in this section.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleSavedMeasurements.map((field, fi) => (
                          <Motion.div
                            key={field.key}
                            className="min-w-0 rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-3"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: fi * 0.04, duration: 0.18 }}
                            whileHover={{ y: -2, borderColor: "rgba(251,191,36,0.2)", boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}
                          >
                            <p className="break-words text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-stone-500">
                              {field.label}
                            </p>
                            <p className="mt-2 text-base font-semibold text-stone-100">
                              {selectedEntry[field.key]}
                              <span className="ml-1 text-xs font-medium text-stone-500">
                                {field.unit}
                              </span>
                            </p>
                          </Motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[1.5rem] border border-amber-100/10 bg-black/20 p-4 xl:max-w-[18rem] xl:justify-self-end">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-300">
                    Check-in History
                  </h4>
                  <span className="text-xs text-stone-500">
                    Select a saved snapshot to preview it.
                  </span>
                </div>

                <div className="mt-3 flex-1 space-y-2.5 overflow-x-hidden overflow-y-auto scroll-smooth pr-1">
                  {entries.map((entry, ei) => {
                    const isSelected = entry.id === selectedEntry.id;

                    return (
                      <Motion.div
                        key={entry.id}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                          isSelected
                            ? "border-amber-300/35 bg-amber-500/10"
                            : "border-amber-100/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/10"
                        }`}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ei * 0.05, duration: 0.2 }}
                        whileHover={!isSelected ? { x: -2 } : {}}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(entry.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-[15px] font-semibold text-stone-100">
                            {formatDate(entry.checkInDate)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            {filledCount(entry)} fields
                            {hasValue(entry.bodyWeight) ? ` • ${entry.bodyWeight} kg` : ""}
                          </p>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-semibold text-stone-400">
                            {isSelected ? "Viewing" : "Open"}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteEntry(entry.id)}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-stone-500 transition hover:bg-rose-500/20 hover:text-rose-300"
                            aria-label="Delete check-in"
                          >
                            ✕
                          </button>
                        </div>
                      </Motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {updateSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-amber-100/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_40%),linear-gradient(180deg,rgba(27,18,14,0.96),rgba(10,8,8,0.98))] p-5 shadow-2xl shadow-black/50">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">
                  Update Summary
                </p>
                <h3 className="mt-2 text-xl font-semibold text-stone-100">
                  {formatDate(updateSummary.date)}
                </h3>
                <p className="mt-2 text-sm text-stone-400">
                  {updateSummary.changedFields.length} updated and {updateSummary.unchangedFields.length} not updated.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpdateSummary(null)}
                className="rounded-xl border border-amber-100/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:text-stone-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 gap-4 md:grid-cols-2">
              <section className="flex min-h-0 flex-col rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-200">Updated</p>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                    {updateSummary.changedFields.length}
                  </span>
                </div>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {updateSummary.changedFields.length === 0 ? (
                    <p className="text-xs text-stone-400">No measurements changed.</p>
                  ) : (
                    updateSummary.changedFields.map((field) => (
                      <div key={field.key} className="rounded-xl border border-emerald-400/15 bg-black/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                          {field.label}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {field.previousValue || "Empty"} to {field.nextValue || "Empty"} {field.unit}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="flex min-h-0 flex-col rounded-2xl border border-amber-100/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-200">Not Updated</p>
                  <span className="rounded-full border border-amber-100/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-stone-300">
                    {updateSummary.unchangedFields.length}
                  </span>
                </div>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {updateSummary.unchangedFields.map((field) => (
                    <div key={field.key} className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-200">
                        {field.label}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {field.nextValue || "Empty"} {field.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-4 flex justify-end border-t border-amber-100/10 pt-4">
              <button
                type="button"
                onClick={() => setUpdateSummary(null)}
                className="rounded-xl border border-amber-300/30 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
              >
                Final Measure Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
