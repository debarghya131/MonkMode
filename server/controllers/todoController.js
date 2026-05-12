import Todo from "../models/Todo.js";
import TodoLog from "../models/TodoLog.js";
import mongoose from "mongoose";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETE_UNDO_WINDOW_MS = 48 * 60 * 60 * 1000;
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_WEEKDAY_SELECTION = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DEFAULT_IMPORTANT_TODO_CATEGORIES = ["Health", "Bill & Payment"];

const getStartOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDayKey = (value = new Date()) => {
  const date = getStartOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value);

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
      ) {
        return null;
      }
      return parsed;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const normalizeText = (value, maxLen = 2500) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") throw new Error("Invalid text field");
  return value.trim().slice(0, maxLen);
};

const normalizeTitle = (value) => {
  const title = normalizeText(value, 180);
  if (!title) throw new Error("Title is required");
  return title;
};

const normalizeTime = (value) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Time must be in HH:mm format");
  }
  return value;
};

const normalizePriority = (value) => {
  if (!value) return "Medium";
  const allowed = new Set(["High", "Medium", "Low"]);
  if (!allowed.has(value)) throw new Error("Priority must be High, Medium, or Low");
  return value;
};

const normalizeRepeatType = (value) => {
  if (!value) return "once";
  const allowed = new Set(["once", "daily", "weekdays", "weekend"]);
  if (!allowed.has(value)) throw new Error("Invalid repeatType");
  return value;
};

const normalizeDays = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("days must be an array");

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => WEEK_DAYS.includes(item));

  return [...new Set(cleaned)];
};

const normalizeCategoryKey = (value) => String(value || "").trim().toLowerCase();

const hasOccurrenceInRange = (repeatType, startDate, endDate, days = []) => {
  if (!startDate || !endDate) return true;
  const normalizedStart = getStartOfDay(startDate);
  const normalizedEnd = getStartOfDay(endDate);
  const rangeDays = Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / DAY_MS) + 1;
  if (rangeDays <= 0) return false;
  if (repeatType === "daily") return true;

  const startDay = normalizedStart.getDay();
  const includesDay = (dayIndex) => {
    const offset = (dayIndex - startDay + 7) % 7;
    return offset < rangeDays;
  };

  if (repeatType === "weekend") {
    return includesDay(0) || includesDay(6);
  }

  if (repeatType === "weekdays") {
    const selectedDays = Array.isArray(days) && days.length ? days : DEFAULT_WEEKDAY_SELECTION;
    return selectedDays.some((dayLabel) => {
      const index = WEEK_DAYS.indexOf(dayLabel);
      return index >= 0 && includesDay(index);
    });
  }

  return true;
};

const normalizeDayStatus = (value) => {
  const status = String(value || "").trim();
  if (!["pending", "completed", "missed"].includes(status)) {
    throw new Error("status must be pending, completed, or missed");
  }
  return status;
};

const getCurrentTimeKey = (value = new Date()) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const toTimeKey = (value = new Date()) => {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const createAuditLog = async (userId, task, action, at = new Date()) => {
  if (!task?.title) return null;
  const actionAt = new Date(at);

  return TodoLog.create({
    todoId: task?._id || null,
    userId,
    title: String(task.title).trim().slice(0, 180),
    date: toDayKey(actionAt),
    time: toTimeKey(actionAt),
    action
  });
};

const getDeleteUndoMeta = (task, now = new Date()) => {
  const deletedAt = task?.deletedAt ? new Date(task.deletedAt) : null;
  if (!deletedAt || Number.isNaN(deletedAt.getTime())) {
    return { canUndoDelete: false, deleteUndoExpiresAt: null, deleteUndoRemainingMs: 0 };
  }

  const expiresAt = new Date(deletedAt.getTime() + DELETE_UNDO_WINDOW_MS);
  const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

  return {
    canUndoDelete: remainingMs > 0,
    deleteUndoExpiresAt: expiresAt.toISOString(),
    deleteUndoRemainingMs: remainingMs
  };
};

const applyDeferredTaskChangesIfDue = async (task, todayStart = getStartOfDay(new Date())) => {
  if (!task) return false;

  let changed = false;

  if (task.pendingTime && task.timeChangeEffectiveFrom) {
    const effectiveTimeDay = getStartOfDay(task.timeChangeEffectiveFrom);
    if (effectiveTimeDay <= todayStart) {
      task.time = task.pendingTime;
      task.pendingTime = "";
      task.timeChangeEffectiveFrom = null;
      changed = true;
    }
  }

  if (Array.isArray(task.pendingDays) && task.pendingDays.length > 0 && task.daysChangeEffectiveFrom) {
    const effectiveDaysDay = getStartOfDay(task.daysChangeEffectiveFrom);
    if (effectiveDaysDay <= todayStart) {
      task.days = [...task.pendingDays];
      task.pendingDays = [];
      task.daysChangeEffectiveFrom = null;
      changed = true;
    }
  }

  if (!changed) return false;
  await task.save();
  return true;
};

const isTaskScheduledOnDay = (task, dayKey) => {
  const targetDate = parseDateInput(dayKey);
  if (!targetDate) return false;
  const normalizedTargetKey = toDayKey(targetDate);

  if (task.repeatType === "once") {
    const onceDate = task.date || task.startDate || task.createdAt;
    if (!onceDate) return false;
    return toDayKey(onceDate) === normalizedTargetKey;
  }

  const start = task.startDate || task.date || task.createdAt;
  if (!start) return false;
  const startKey = toDayKey(start);
  if (normalizedTargetKey < startKey) return false;

  if (task.endDate) {
    const endKey = toDayKey(task.endDate);
    if (normalizedTargetKey > endKey) return false;
  }

  const dayOfWeek = targetDate.getDay();

  if (task.repeatType === "daily") return true;
  if (task.repeatType === "weekend") return dayOfWeek === 0 || dayOfWeek === 6;
  if (task.repeatType === "weekdays") {
    const pendingDays = Array.isArray(task.pendingDays) && task.pendingDays.length
      ? task.pendingDays
      : null;
    const pendingDaysEffectiveFrom = task.daysChangeEffectiveFrom
      ? toDayKey(task.daysChangeEffectiveFrom)
      : null;
    const selectedDays = pendingDays && pendingDaysEffectiveFrom && dayKey >= pendingDaysEffectiveFrom
      ? pendingDays
      : (Array.isArray(task.days) && task.days.length ? task.days : DEFAULT_WEEKDAY_SELECTION);
    return selectedDays.includes(WEEK_DAYS[dayOfWeek]);
  }

  return false;
};

const isTaskAliveOnDay = (task, dayKey) => {
  const deletedKey = task?.deletedAt ? toDayKey(task.deletedAt) : null;
  if (!deletedKey) return true;
  return dayKey < deletedKey;
};

const isTaskArchived = (task, todayKey) => {
  if (task?.deletedAt) return true;

  if (task.repeatType === "once") {
    const onceDate = task.date || task.startDate || task.createdAt;
    if (!onceDate) return false;
    return toDayKey(onceDate) < todayKey;
  }

  if (task.endDate) {
    return toDayKey(task.endDate) < todayKey;
  }

  return false;
};

const getExistingDayState = (task, dayKey) => {
  if (!Array.isArray(task.dayStates)) return null;
  return task.dayStates.find((state) => state?.dayKey === dayKey) || null;
};

const hasTaskTimePassedForToday = (task, dayKey, now = new Date()) => {
  const todayKey = toDayKey(now);
  if (dayKey !== todayKey) return false;

  const taskTime = String(task?.time || "").slice(0, 5);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(taskTime)) return false;

  const nowTime = getCurrentTimeKey(now);
  return taskTime < nowTime;
};

const isValidTimeKey = (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || "").slice(0, 5));

const isLateCompletionForDay = (task, dayKey, todayKey, completedAt = "") => {
  if (dayKey < todayKey) return true;
  if (dayKey > todayKey) return false;

  const taskTime = String(task?.time || "").slice(0, 5);
  if (!isValidTimeKey(taskTime)) return false;

  const completionTime = isValidTimeKey(completedAt)
    ? String(completedAt).slice(0, 5)
    : getCurrentTimeKey(new Date());

  return completionTime > taskTime;
};

const getTodoStatusForDay = (task, dayKey, todayKey = toDayKey(new Date())) => {
  if (!isTaskScheduledOnDay(task, dayKey)) return "not_scheduled";
  const existingState = getExistingDayState(task, dayKey);
  if (existingState?.status) return existingState.status;
  if (dayKey < todayKey) return "missed";
  if (hasTaskTimePassedForToday(task, dayKey)) return "missed";
  return "pending";
};

const applyDayStatus = (task, dayKey, status, todayKey = toDayKey(new Date()), completedAt = "") => {
  const nextStates = Array.isArray(task.dayStates) ? [...task.dayStates] : [];
  const existingIndex = nextStates.findIndex((state) => state?.dayKey === dayKey);
  const isLateCompleted = status === "completed"
    ? isLateCompletionForDay(task, dayKey, todayKey, completedAt)
    : false;

  if (status === "pending") {
    if (existingIndex >= 0) nextStates.splice(existingIndex, 1);
  } else {
    const nextState = {
      dayKey,
      status,
      completedAt: status === "completed" ? completedAt : "",
      lateCompleted: status === "completed" ? isLateCompleted : false
    };
    if (existingIndex >= 0) nextStates[existingIndex] = nextState;
    else nextStates.push(nextState);
  }

  task.dayStates = nextStates.sort((a, b) => String(a.dayKey).localeCompare(String(b.dayKey)));

  if (task.repeatType === "once") {
    const onceDate = task.date || task.startDate || task.createdAt;
    const onceKey = onceDate ? toDayKey(onceDate) : null;
    if (onceKey === dayKey) {
      task.completed = status === "completed";
    }
  }
};

const buildTaskPayload = (body, fallbackDate = new Date()) => {
  const title = normalizeTitle(body.title);
  const description = normalizeText(body.description, 2500);
  const category = normalizeText(body.category || "Others", 80) || "Others";
  const priority = normalizePriority(body.priority);
  const repeatType = normalizeRepeatType(body.repeatType);
  const time = normalizeTime(body.time);
  const days = normalizeDays(body.days);

  if (!time) throw new Error("Time is required");

  if (repeatType === "once") {
    const oneTimeDate = parseDateInput(body.date || body.startDate || fallbackDate);
    if (!oneTimeDate) throw new Error("Valid date is required for one-time tasks");
    const normalizedDate = getStartOfDay(oneTimeDate);
    return {
      title,
      description,
      category,
      priority,
      repeatType,
      days: [],
      time,
      neverEnds: false,
      date: normalizedDate,
      startDate: normalizedDate,
      endDate: normalizedDate
    };
  }

  const startDate = parseDateInput(body.startDate || body.date || fallbackDate);
  if (!startDate) throw new Error("Valid startDate is required");
  const normalizedStart = getStartOfDay(startDate);

  let endDate = null;
  let neverEnds = true;
  if (body.neverEnds === false || body.endDate) {
    const parsedEndDate = parseDateInput(body.endDate);
    if (!parsedEndDate) throw new Error("Valid endDate is required when Never Ends is disabled");
    endDate = getStartOfDay(parsedEndDate);
    neverEnds = false;
    if (endDate.getTime() < normalizedStart.getTime()) {
      throw new Error("End date cannot be earlier than start date");
    }
  }

  if (repeatType === "weekdays" && days.length === 0) {
    throw new Error("Select at least one day for weekdays repeat");
  }

  if (endDate && !hasOccurrenceInRange(repeatType, normalizedStart, endDate, days)) {
    if (repeatType === "weekend") {
      throw new Error("Selected date range does not include any weekend day. Please choose a later end date.");
    }
    if (repeatType === "weekdays") {
      throw new Error("Selected date range does not include any chosen weekday. Please adjust start/end date.");
    }
  }

  return {
    title,
    description,
    category,
    priority,
    repeatType,
    days: repeatType === "weekdays" ? days : [],
    time,
    neverEnds,
    date: null,
    startDate: normalizedStart,
    endDate
  };
};

const toClientTask = (task, selectedDayKey = null, todayKey = toDayKey(new Date())) => {
  const item = task.toObject ? task.toObject() : { ...task };

  const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
  const undoMeta = getDeleteUndoMeta(item);

  const normalized = {
    ...item,
    id: String(item?._id || item?.id || ""),
    _id: item?._id,
    date: item?.date ? toDayKey(item.date) : null,
    startDate: item?.startDate ? toDayKey(item.startDate) : null,
    endDate: item?.endDate ? toDayKey(item.endDate) : null,
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
    pendingTime: item?.pendingTime || "",
    timeChangeEffectiveFrom: item?.timeChangeEffectiveFrom ? new Date(item.timeChangeEffectiveFrom).toISOString() : null,
    pendingDays: Array.isArray(item?.pendingDays) ? [...item.pendingDays] : [],
    daysChangeEffectiveFrom: item?.daysChangeEffectiveFrom ? new Date(item.daysChangeEffectiveFrom).toISOString() : null,
    ...undoMeta,
    dayStates: Array.isArray(item?.dayStates)
      ? item.dayStates.map((state) => ({
          dayKey: state.dayKey,
          status: state.status,
          completedAt: state.completedAt || "",
          lateCompleted: Boolean(state.lateCompleted)
        }))
      : [],
    completedAt: "",
    lateCompleted: false
  };

  if (selectedDayKey) {
    normalized.scheduled = isTaskScheduledOnDay(normalized, selectedDayKey);
    normalized.status = getTodoStatusForDay(normalized, selectedDayKey, todayKey);
    const selectedState = getExistingDayState(normalized, selectedDayKey);
    normalized.completedAt = selectedState?.completedAt || "";
    normalized.lateCompleted = Boolean(selectedState?.lateCompleted);
  }

  normalized.archived = isTaskArchived(normalized, todayKey);
  normalized.archiveReason = normalized.deletedAt ? "deleted" : (normalized.archived ? "ended" : null);
  return normalized;
};

export const createTodo = async (req, res) => {
  try {
    const now = new Date();
    const payload = buildTaskPayload(req.body, new Date());
    const todayKey = toDayKey(now);
    const nowTimeKey = getCurrentTimeKey(now);
    const anchorDateKey = payload.repeatType === "once"
      ? (payload.date ? toDayKey(payload.date) : null)
      : (payload.startDate ? toDayKey(payload.startDate) : null);
    const startsTodayWithPastTime = anchorDateKey === todayKey && payload.time <= nowTimeKey;

    // Do not allow creating tasks that start today when the selected time has already passed.
    if (startsTodayWithPastTime) {
      return res.status(400).json({
        message: "Time for today is already over. You need to start this task from the next day."
      });
    }

    const todo = await Todo.create({
      userId: req.user.id,
      ...payload
    });
    await createAuditLog(req.user.id, todo, "created", new Date());
    return res.status(201).json(toClientTask(todo));
  } catch (error) {
    return res.status(400).json({ message: error.message || "Invalid todo payload" });
  }
};

export const getTodos = async (req, res) => {
  try {
    const selectedDate = req.query.date ? parseDateInput(req.query.date) : null;
    if (req.query.date && !selectedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }

    const selectedDayKey = selectedDate ? toDayKey(selectedDate) : null;
    const todayKey = toDayKey(new Date());
    const view = String(req.query.view || "").trim().toLowerCase();
    const priorityFilter = String(req.query.priority || "").trim();
    const categoryFilter = String(req.query.category || "").trim().toLowerCase();
    const statusFilter = String(req.query.status || "").trim().toLowerCase();
    const includeUnscheduled = String(req.query.include_unscheduled || "") === "1";

    const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1, _id: -1 });
    const todayStart = getStartOfDay(new Date());
    for (const todo of todos) {
      await applyDeferredTaskChangesIfDue(todo, todayStart);
    }
    let result = todos.map((todo) => toClientTask(todo, selectedDayKey, todayKey));

    if (view === "active") {
      result = result.filter((todo) => !todo.archived);
    } else if (view === "archive" || view === "archived") {
      result = result.filter((todo) => todo.archived);
    }

    if (priorityFilter) {
      result = result.filter((todo) => todo.priority === priorityFilter);
    }

    if (categoryFilter) {
      result = result.filter((todo) => String(todo.category || "").trim().toLowerCase() === categoryFilter);
    }

    if (selectedDayKey) {
      if (!includeUnscheduled) {
        result = result.filter((todo) => todo.scheduled);
      }
      if (statusFilter && ["pending", "completed", "missed"].includes(statusFilter)) {
        result = result.filter((todo) => todo.status === statusFilter);
      }
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    await applyDeferredTaskChangesIfDue(todo, getStartOfDay(new Date()));
    const archiveTodayKey = toDayKey(new Date());
    if (isTaskArchived(todo, archiveTodayKey)) {
      return res.status(400).json({ message: "Archived tasks cannot be edited." });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "repeatType")) {
      const requestedRepeatType = normalizeRepeatType(req.body.repeatType);
      const currentRepeatType = normalizeRepeatType(todo.repeatType);
      if (requestedRepeatType !== currentRepeatType) {
        return res.status(400).json({ message: "Repeat type cannot be changed in edit mode." });
      }
    }

    const merged = {
      ...todo.toObject(),
      ...req.body
    };

    const payload = buildTaskPayload(merged, todo.startDate || todo.date || new Date());

    const today = new Date();
    const todayStart = getStartOfDay(today);
    const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
    const todayKey = toDayKey(todayStart);
    if (todo.repeatType === "once") {
      const currentDate = todo.date || todo.startDate || todo.createdAt;
      const currentKey = currentDate ? toDayKey(currentDate) : null;
      const nextKey = payload.date ? toDayKey(payload.date) : null;
      if (currentKey && nextKey && currentKey <= todayKey && currentKey !== nextKey) {
        return res.status(400).json({ message: "Date cannot be changed after the task has begun." });
      }
    } else {
      if (payload.endDate && toDayKey(payload.endDate) < todayKey) {
        return res.status(400).json({ message: "End date cannot be before today." });
      }

      const currentStart = todo.startDate || todo.createdAt;
      const currentStartKey = currentStart ? toDayKey(currentStart) : null;
      const nextStartKey = payload.startDate ? toDayKey(payload.startDate) : null;
      if (currentStartKey && nextStartKey && currentStartKey <= todayKey && currentStartKey !== nextStartKey) {
        return res.status(400).json({ message: "Start date cannot be changed after the task has begun." });
      }
    }

    let reflectFromNextDay = false;
    let reflectDaysFromNextDay = false;

    if (todo.repeatType !== "once") {
      const existingStart = todo.startDate || todo.createdAt;
      const existingStartKey = existingStart ? toDayKey(existingStart) : null;
      const hasStarted = Boolean(existingStartKey && existingStartKey <= todayKey);

      const currentEffectiveTime = todo.pendingTime || todo.time || "";
      const nextTime = payload.time || "";
      const timeChanged = currentEffectiveTime !== nextTime;

      const currentEffectiveDays = Array.isArray(todo.pendingDays) && todo.pendingDays.length
        ? todo.pendingDays
        : (Array.isArray(todo.days) ? todo.days : []);
      const nextDays = payload.repeatType === "weekdays"
        ? (Array.isArray(payload.days) ? payload.days : [])
        : [];
      const daysChanged = payload.repeatType === "weekdays"
        && JSON.stringify(currentEffectiveDays) !== JSON.stringify(nextDays);

      if (hasStarted && timeChanged) {
        payload.pendingTime = nextTime;
        payload.timeChangeEffectiveFrom = tomorrowStart;
        delete payload.time;
        reflectFromNextDay = true;
      } else if (timeChanged) {
        payload.pendingTime = "";
        payload.timeChangeEffectiveFrom = null;
      }

      if (hasStarted && daysChanged && payload.repeatType === "weekdays") {
        payload.pendingDays = [...nextDays];
        payload.daysChangeEffectiveFrom = tomorrowStart;
        delete payload.days;
        reflectDaysFromNextDay = true;
      } else if (daysChanged) {
        payload.pendingDays = payload.repeatType === "weekdays" ? [...nextDays] : [];
        payload.daysChangeEffectiveFrom = null;
      }
    } else {
      payload.pendingTime = "";
      payload.timeChangeEffectiveFrom = null;
      payload.pendingDays = [];
      payload.daysChangeEffectiveFrom = null;
    }

    Object.assign(todo, payload);
    await todo.save();
    await createAuditLog(req.user.id, todo, "edited", new Date());

    return res.json({
      ...toClientTask(todo),
      splitApplied: false,
      reflectFromNextDay,
      reflectsFromDate: reflectFromNextDay ? tomorrowStart.toISOString() : null,
      reflectDaysFromNextDay,
      reflectsDaysFromDate: reflectDaysFromNextDay ? tomorrowStart.toISOString() : null
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Invalid todo payload" });
  }
};

export const toggleTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    await applyDeferredTaskChangesIfDue(todo, getStartOfDay(new Date()));

    const selectedDate = req.body?.date ? parseDateInput(req.body.date) : new Date();
    if (!selectedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }

    const dayKey = toDayKey(selectedDate);
    const todayKey = toDayKey(new Date());

    if (!isTaskScheduledOnDay(todo, dayKey)) {
      return res.status(400).json({ message: "Task is not scheduled for the selected date" });
    }

    const currentStatus = getTodoStatusForDay(todo, dayKey, todayKey);
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    const completedAt = nextStatus === "completed" ? normalizeTime(req.body?.completedAt || "") : "";

    applyDayStatus(todo, dayKey, nextStatus, todayKey, completedAt);
    await todo.save();

    const normalized = toClientTask(todo, dayKey, todayKey);
    return res.json(normalized);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not update todo status" });
  }
};

export const setTodoStatus = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    await applyDeferredTaskChangesIfDue(todo, getStartOfDay(new Date()));

    const selectedDate = req.body?.date ? parseDateInput(req.body.date) : new Date();
    if (!selectedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }

    const status = normalizeDayStatus(req.body?.status);
    const dayKey = toDayKey(selectedDate);
    const todayKey = toDayKey(new Date());

    if (!isTaskScheduledOnDay(todo, dayKey)) {
      return res.status(400).json({ message: "Task is not scheduled for the selected date" });
    }

    const completedAt = status === "completed" ? normalizeTime(req.body?.completedAt || "") : "";
    applyDayStatus(todo, dayKey, status, todayKey, completedAt);
    await todo.save();

    const normalized = toClientTask(todo, dayKey, todayKey);
    return res.json(normalized);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not set todo status" });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    todo.deletedAt = new Date();
    await todo.save();
    await createAuditLog(req.user.id, todo, "deleted", todo.deletedAt);

    const normalized = toClientTask(todo);
    return res.json({
      message: "Todo deleted",
      todo: normalized,
      canUndoDelete: normalized.canUndoDelete,
      deleteUndoExpiresAt: normalized.deleteUndoExpiresAt,
      deleteUndoRemainingMs: normalized.deleteUndoRemainingMs,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const restoreTodo = async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    if (!todo.deletedAt) {
      return res.status(400).json({ message: "Todo is not deleted" });
    }

    if (!getDeleteUndoMeta(todo).canUndoDelete) {
      return res.status(410).json({
        message: "Restore window expired. Todo can only be restored within 48 hours of deletion."
      });
    }

    todo.deletedAt = null;
    await todo.save();
    await createAuditLog(req.user.id, todo, "restored", new Date());

    return res.json(toClientTask(todo));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTodoSummary = async (req, res) => {
  try {
    const selectedDate = req.query.date ? parseDateInput(req.query.date) : new Date();
    if (!selectedDate) {
      return res.status(400).json({ message: "date must be a valid YYYY-MM-DD value" });
    }
    const importantCategoriesQuery = String(req.query.importantCategories || "").trim();
    const requestedImportantCategories = importantCategoriesQuery
      ? importantCategoriesQuery
          .split(",")
          .map((category) => String(category || "").trim())
          .filter(Boolean)
      : [];
    const importantCategorySet = new Set(
      [...DEFAULT_IMPORTANT_TODO_CATEGORIES, ...requestedImportantCategories]
        .map(normalizeCategoryKey)
        .filter(Boolean)
    );

    const selectedDayKey = toDayKey(selectedDate);
    const todayKey = toDayKey(new Date());
    const weekStart = getStartOfDay(selectedDate);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

    const [activeTodos, allTodos] = await Promise.all([
      Todo.find({ userId: req.user.id, deletedAt: null }),
      Todo.find({ userId: req.user.id })
    ]);
    const deferredSeen = new Set();
    const summaryTodayStart = getStartOfDay(new Date());
    for (const todo of [...activeTodos, ...allTodos]) {
      const id = todo?._id?.toString?.();
      if (!id || deferredSeen.has(id)) continue;
      deferredSeen.add(id);
      await applyDeferredTaskChangesIfDue(todo, summaryTodayStart);
    }
    const todaySummary = { total: 0, completed: 0, pending: 0, missed: 0, important: 0 };

    for (const todo of activeTodos) {
      if (!isTaskScheduledOnDay(todo, selectedDayKey)) continue;
      todaySummary.total += 1;
      if (importantCategorySet.has(normalizeCategoryKey(todo.category))) {
        todaySummary.important += 1;
      }
      const status = getTodoStatusForDay(todo, selectedDayKey, todayKey);
      if (status === "completed") todaySummary.completed += 1;
      else if (status === "missed") todaySummary.missed += 1;
      else todaySummary.pending += 1;
    }

    const week = { total: 0, completed: 0, pending: 0, missed: 0 };
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(weekStart.getTime() + i * DAY_MS);
      const dayKey = toDayKey(day);
      for (const todo of activeTodos) {
        if (!isTaskScheduledOnDay(todo, dayKey)) continue;
        week.total += 1;
        const status = getTodoStatusForDay(todo, dayKey, todayKey);
        if (status === "completed") week.completed += 1;
        else if (status === "missed") week.missed += 1;
        else week.pending += 1;
      }
    }

    const completionRate = todaySummary.total > 0
      ? Number(((todaySummary.completed / todaySummary.total) * 100).toFixed(1))
      : 0;

    const lifetime = { total: 0, completed: 0, pending: 0, missed: 0 };
    if (allTodos.length > 0) {
      const earliest = allTodos.reduce((min, todo) => {
        const candidate = todo.date || todo.startDate || todo.createdAt;
        return !min || candidate < min ? candidate : min;
      }, null);

      const lifetimeStart = getStartOfDay(earliest || selectedDate);
      const lifetimeEnd = new Date(getStartOfDay(selectedDate).getTime() + DAY_MS);

      for (let cursor = new Date(lifetimeStart); cursor < lifetimeEnd; cursor = new Date(cursor.getTime() + DAY_MS)) {
        const dayKey = toDayKey(cursor);
        for (const todo of allTodos) {
          if (!isTaskAliveOnDay(todo, dayKey)) continue;
          if (!isTaskScheduledOnDay(todo, dayKey)) continue;
          lifetime.total += 1;
          const status = getTodoStatusForDay(todo, dayKey, todayKey);
          if (status === "completed") {
            lifetime.completed += 1;
          }
          else if (status === "missed") lifetime.missed += 1;
          else lifetime.pending += 1;
        }
      }
    }

    const streakExpectedByDay = new Map();
    const streakCompletedByDay = new Map();
    if (activeTodos.length > 0) {
      const earliestActive = activeTodos.reduce((min, todo) => {
        const candidate = todo.date || todo.startDate || todo.createdAt;
        return !min || candidate < min ? candidate : min;
      }, null);

      const streakRangeStart = getStartOfDay(earliestActive || selectedDate);
      const streakRangeEnd = new Date(getStartOfDay(selectedDate).getTime() + DAY_MS);

      for (
        let cursor = new Date(streakRangeStart);
        cursor < streakRangeEnd;
        cursor = new Date(cursor.getTime() + DAY_MS)
      ) {
        const dayKey = toDayKey(cursor);
        for (const todo of activeTodos) {
          if (!isTaskScheduledOnDay(todo, dayKey)) continue;
          streakExpectedByDay.set(dayKey, (streakExpectedByDay.get(dayKey) || 0) + 1);

          const status = getTodoStatusForDay(todo, dayKey, todayKey);
          if (status !== "completed") continue;

          const dayState = getExistingDayState(todo, dayKey);
          const isLate = Boolean(dayState?.lateCompleted);
          if (!isLate) {
            streakCompletedByDay.set(dayKey, (streakCompletedByDay.get(dayKey) || 0) + 1);
          }
        }
      }
    }

    let fullCompletionStreakDays = 0;
    const selectedDay = getStartOfDay(selectedDate);
    const streakStart = activeTodos.length > 0
      ? getStartOfDay(
          activeTodos.reduce((min, todo) => {
            const candidate = todo.date || todo.startDate || todo.createdAt;
            return !min || candidate < min ? candidate : min;
          }, null) || selectedDay
        )
      : selectedDay;

    const streakStartCursor = new Date(selectedDay);
    const streakDayKey = toDayKey(selectedDay);
    const selectedExpected = Number(streakExpectedByDay.get(streakDayKey) || 0);
    const selectedCompleted = Number(streakCompletedByDay.get(streakDayKey) || 0);

    // Keep yesterday's streak visible right after midnight if today's scheduled
    // tasks are not finished yet.
    if (selectedExpected <= 0 || selectedCompleted < selectedExpected) {
      streakStartCursor.setDate(streakStartCursor.getDate() - 1);
    }

    for (let cursor = new Date(streakStartCursor); cursor >= streakStart; cursor = new Date(cursor.getTime() - DAY_MS)) {
      const dayKey = toDayKey(cursor);
      const expected = Number(streakExpectedByDay.get(dayKey) || 0);
      const completed = Number(streakCompletedByDay.get(dayKey) || 0);
      if (expected <= 0 || completed < expected) break;
      fullCompletionStreakDays += 1;
    }

    const normalizedTotalExpectedLifetime = Math.max(lifetime.total, lifetime.completed);
    const lifetimeConsistency = normalizedTotalExpectedLifetime > 0
      ? Number(((lifetime.completed / normalizedTotalExpectedLifetime) * 100).toFixed(1))
      : 0;

    return res.json({
      date: selectedDayKey,
      today: todaySummary,
      thisWeek: week,
      completionRate,
      lifetime,
      importantToday: todaySummary.important,
      fullCompletionStreakDays,
      totalCompletedLifetime: lifetime.completed,
      totalExpectedLifetime: normalizedTotalExpectedLifetime,
      lifetimeConsistency
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTodoHeatmap = async (req, res) => {
  try {
    const { year } = req.query;
    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }
    if (hasYearFilter && (parsedYear < 1970 || parsedYear > 3000)) {
      return res.status(400).json({ message: "Year must be between 1970 and 3000" });
    }

    const todos = await Todo.find({ userId: req.user.id }).select(
      "date startDate endDate repeatType days pendingDays daysChangeEffectiveFrom time pendingTime timeChangeEffectiveFrom dayStates createdAt completed deletedAt"
    );

    const heatmapTodayStart = getStartOfDay(new Date());
    for (const todo of todos) {
      await applyDeferredTaskChangesIfDue(todo, heatmapTodayStart);
    }

    const today = getStartOfDay(new Date());
    const todayKey = toDayKey(today);

    let startDate;
    let endDate;

    if (hasYearFilter) {
      startDate = new Date(parsedYear, 0, 1);
      endDate = new Date(parsedYear + 1, 0, 1);
    } else if (todos.length > 0) {
      const earliest = todos.reduce((min, todo) => {
        const candidate = todo.date || todo.startDate || todo.createdAt;
        return !min || candidate < min ? candidate : min;
      }, null);
      startDate = getStartOfDay(earliest || new Date());
      endDate = new Date(today.getTime() + DAY_MS);
    } else {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear() + 1, 0, 1);
    }

    const groupedByDay = new Map();
    for (let cursor = new Date(startDate); cursor < endDate; cursor = new Date(cursor.getTime() + DAY_MS)) {
      const dayKey = toDayKey(cursor);
      let total = 0;
      let completed = 0;
      let missed = 0;

      for (const todo of todos) {
        if (!isTaskAliveOnDay(todo, dayKey)) continue;
        if (!isTaskScheduledOnDay(todo, dayKey)) continue;
        total += 1;
        const status = getTodoStatusForDay(todo, dayKey, todayKey);
        if (status === "completed") completed += 1;
        else if (status === "missed") missed += 1;
      }

      if (total > 0) {
        groupedByDay.set(dayKey, { total, completed, missed });
      }
    }

    const values = [...groupedByDay.entries()].map(([date, metrics]) => {
      const total = metrics.total;
      const completed = metrics.completed;
      const missed = metrics.missed;
      const pending = Math.max(0, total - completed - missed);

      let count = 1;
      if (total > 0 && completed === total && missed === 0) {
        count = 4;
      } else if (completed > 0) {
        const completionRatio = completed / total;
        if (completionRatio >= 0.8 && missed === 0) {
          count = 3;
        } else if (completionRatio >= 0.4 || completed >= 2) {
          count = 2;
        }
      }

      return { date, count, total, completed, missed, pending };
    });

    const years = [...new Set(
      values
        .map((item) => Number.parseInt(String(item.date).slice(0, 4), 10))
        .filter((item) => Number.isFinite(item))
    )].sort((a, b) => b - a);

    return res.json({
      values,
      years,
      totalActiveDays: values.length
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTodoCategories = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const categories = await Todo.aggregate([
      { $match: { userId } },
      { $group: { _id: "$category" } },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      categories: categories
        .map((item) => String(item?._id || "").trim())
        .filter(Boolean)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTodoLogs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rawLogs = await TodoLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean();

    const logs = [];
    const seenKeys = new Set();
    for (const log of rawLogs) {
      const dedupeKey = [
        String(log?.todoId || ""),
        String(log?.action || ""),
        String(log?.title || "").trim().toLowerCase(),
        String(log?.date || ""),
        String(log?.time || "")
      ].join("|");

      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      logs.push(log);
      if (logs.length >= limit) break;
    }

    const restoredTodoIds = new Set();
    const filteredLogs = [];
    for (const log of logs) {
      const todoIdKey = String(log?.todoId || "");

      if (log?.action === "restored" && todoIdKey) {
        restoredTodoIds.add(todoIdKey);
        filteredLogs.push(log);
        continue;
      }

      if (log?.action === "deleted" && todoIdKey && restoredTodoIds.has(todoIdKey)) {
        continue;
      }

      filteredLogs.push(log);
    }

    const todoIds = [...new Set(
      filteredLogs
        .map((log) => String(log?.todoId || ""))
        .filter(Boolean)
    )];
    const todos = todoIds.length
      ? await Todo.find({
          _id: { $in: todoIds },
          userId: req.user.id
        }).lean()
      : [];
    const todoMap = new Map(todos.map((todo) => [String(todo._id), todo]));

    return res.json(
      filteredLogs.map((log) => {
        const deletedItem = log.action === "deleted" && log.todoId
          ? (() => {
              const deletedTodo = todoMap.get(String(log.todoId));
              if (!deletedTodo?.deletedAt) return null;
              return toClientTask(deletedTodo);
            })()
          : null;

        return {
          id: String(log._id),
          todoId: log.todoId ? String(log.todoId) : null,
          title: log.title,
          date: log.date,
          time: log.time,
          logAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
          action: log.action === "created" ? undefined : log.action,
          deletedItem,
          canUndoDelete: Boolean(deletedItem?.canUndoDelete),
          deleteUndoExpiresAt: deletedItem?.deleteUndoExpiresAt || null,
          deleteUndoRemainingMs: Number(deletedItem?.deleteUndoRemainingMs || 0)
        };
      })
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTodoLog = async (req, res) => {
  try {
    const { title, date, time, action, todoId } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }
    const validActions = ["created", "edited", "deleted", "restored", "ended"];
    const normalizedAction = validActions.includes(action) ? action : "created";

    const log = await TodoLog.create({
      todoId: mongoose.isValidObjectId(todoId) ? todoId : null,
      userId: req.user.id,
      title: title.trim().slice(0, 180),
      date: typeof date === "string" ? date.slice(0, 10) : "",
      time: typeof time === "string" ? time.slice(0, 5) : "",
      action: normalizedAction,
    });

    return res.status(201).json({
      id: String(log._id),
      title: log.title,
      date: log.date,
      time: log.time,
      logAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
      action: log.action === "created" ? undefined : log.action,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const IMPORTANT_CATEGORIES = new Set(["Health", "Bill & Payment"]);
const TIME_SLOTS_ORDER = ["6 AM - 9 AM", "9 AM - 12 PM", "12 PM - 3 PM", "3 PM - 6 PM", "6 PM - 12 AM"];

const getTimeSlot = (time) => {
  if (!time) return "6 PM - 12 AM";
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 6 && h < 9)  return "6 AM - 9 AM";
  if (h >= 9 && h < 12) return "9 AM - 12 PM";
  if (h >= 12 && h < 15) return "12 PM - 3 PM";
  if (h >= 15 && h < 18) return "3 PM - 6 PM";
  return "6 PM - 12 AM";
};

export const getTodoAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m || m < 1 || m > 12) return res.status(400).json({ message: "Invalid year or month" });

    const prefix = `${y}-${String(m).padStart(2, "0")}`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const todayKey = toDayKey(new Date());

    // Fetch all todos including deleted ones — a todo deleted mid-month was still alive earlier
    const todos = await Todo.find(
      { userId },
      { category: 1, priority: 1, time: 1, dayStates: 1, repeatType: 1, date: 1, startDate: 1, endDate: 1, days: 1, pendingDays: 1, daysChangeEffectiveFrom: 1, deletedAt: 1, createdAt: 1, completed: 1 }
    ).lean();

    const dayMap = new Map();
    const categoryMap = new Map();
    const priorityMap = {
      High:   { total: 0, completed: 0, missed: 0 },
      Medium: { total: 0, completed: 0, missed: 0 },
      Low:    { total: 0, completed: 0, missed: 0 },
    };
    const slotMap = Object.fromEntries(TIME_SLOTS_ORDER.map(r => [r, { total: 0, completed: 0 }]));

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const date = `${prefix}-${String(dayNum).padStart(2, "0")}`;
      if (date > todayKey) break;

      for (const todo of todos) {
        if (!isTaskAliveOnDay(todo, date)) continue;
        if (!isTaskScheduledOnDay(todo, date)) continue;

        const status = getTodoStatusForDay(todo, date, todayKey);
        if (status === "pending") continue;

        const isCompleted = status === "completed";
        const dayState = getExistingDayState(todo, date);
        const isLate = isCompleted && Boolean(dayState?.lateCompleted);

        const cat  = (todo.category || "Others").trim();
        const pri  = todo.priority || "Medium";
        const slot = getTimeSlot(todo.time);

        if (!dayMap.has(date)) dayMap.set(date, { total: 0, completed: 0, missed: 0, lateCompleted: 0 });
        const d = dayMap.get(date);
        d.total++;
        if (isCompleted) d.completed++; else d.missed++;
        if (isLate) d.lateCompleted++;

        if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, completed: 0, missed: 0, lateCompleted: 0 });
        const c = categoryMap.get(cat);
        c.total++;
        if (isCompleted) c.completed++; else c.missed++;
        if (isLate) c.lateCompleted++;

        if (priorityMap[pri]) {
          priorityMap[pri].total++;
          if (isCompleted) priorityMap[pri].completed++; else priorityMap[pri].missed++;
        }

        slotMap[slot].total++;
        if (isCompleted) slotMap[slot].completed++;
      }
    }

    const WEEK_DAYS_LOCAL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const date   = `${prefix}-${String(dayNum).padStart(2, "0")}`;
      const weekday = WEEK_DAYS_LOCAL[new Date(y, m - 1, dayNum).getDay()];
      const entry  = dayMap.get(date) || { total: 0, completed: 0, missed: 0, lateCompleted: 0 };
      const score  = entry.total ? Math.round((entry.completed / entry.total) * 100) : null;
      return { date, weekday, ...entry, score, submitted: entry.total > 0 };
    });

    const categories = [...categoryMap.entries()]
      .map(([name, data]) => ({ name, ...data, important: IMPORTANT_CATEGORIES.has(name) }))
      .sort((a, b) => b.total - a.total);

    const priorities = ["High", "Medium", "Low"].map(name => ({ name, ...priorityMap[name] }));
    const timeSlots  = TIME_SLOTS_ORDER.map(range => ({ range, ...slotMap[range] }));

    return res.json({ year: y, month: m, days, categories, priorities, timeSlots });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
