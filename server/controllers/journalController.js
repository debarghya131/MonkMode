import Journal from "../models/Journal.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const DAY_MS = 24 * 60 * 60 * 1000;
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const MOOD_MAP = new Map([
  ["motivated", "Motivated"],
  ["happy", "Happy"],
  ["calm", "Calm"],
  ["neutral", "Neutral"],
  ["sad", "Sad"],
  ["anxious", "Anxious"],
  ["focused", "Focused"],
  ["tired", "Tired"],
  ["excited", "Excited"],
  ["grateful", "Grateful"],
  ["inspired", "Inspired"],
  ["frustrated", "Frustrated"],
  ["overwhelmed", "Overwhelmed"],
  ["strong", "Strong"],
  ["peaceful", "Peaceful"],
  ["bored", "Bored"],
  ["confident", "Confident"],
  ["curious", "Curious"],
  ["emotional", "Emotional"],
  ["content", "Content"]
]);

const LEGACY_MOOD_MAP = new Map([
  ["happy", "Happy"],
  ["sad", "Sad"],
  ["neutral", "Neutral"]
]);

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

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value);
  }

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

const normalizeMood = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (MOOD_MAP.has(lower)) return MOOD_MAP.get(lower);
  if (LEGACY_MOOD_MAP.has(lower)) return LEGACY_MOOD_MAP.get(lower);

  // Accept already normalized labels.
  const direct = [...MOOD_MAP.values()].find((mood) => mood.toLowerCase() === lower);
  if (direct) return direct;

  return null;
};

const normalizeTime = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`${fieldName} must be in HH:mm format`);
  }
  return value;
};

const normalizeScore = (value, fieldName, fallback = 50) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(`${fieldName} must be between 1 and 100`);
  }
  return Math.round(parsed);
};

const normalizeText = (value, maxLen = 5000) => {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") throw new Error("Invalid text field");
  return value.trim().slice(0, maxLen);
};

const normalizeStringArray = (value, maxItemLen = 400) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Expected an array");
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((item) => item.slice(0, maxItemLen));
};

const normalizeCustomFields = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("customFields must be an array");

  const normalized = [];
  for (const item of value) {
    const title = normalizeText(item?.title || "", 120);
    const answer = normalizeText(item?.answer || "", 5000);
    const description = normalizeText(item?.description || "", 400);

    if (!title || !answer) continue;

    normalized.push({ title, description, answer });
  }

  return normalized;
};

const normalizeCustomFieldTemplates = (value) => {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("templates must be an array");

  const normalized = [];
  for (const item of value) {
    const title = normalizeText(item?.title || "", 120);
    if (!title) continue;
    const description = normalizeText(item?.description || "", 400);
    normalized.push({ title, description });
  }
  return normalized;
};

const buildJournalPayload = (body) => {
  const payload = {};

  // Backward compatibility: if only "content" exists, treat it as summary.
  const summarySource = body.summary ?? body.content ?? "";
  payload.summary = normalizeText(summarySource, 5000);
  payload.content = payload.summary;

  const normalizedMood = normalizeMood(body.mood);
  if (normalizedMood) payload.mood = normalizedMood;

  payload.wakeUpTime = normalizeTime(body.wakeUpTime, "wakeUpTime");
  payload.sleepTime = normalizeTime(body.sleepTime, "sleepTime");
  payload.energyLevel = normalizeScore(body.energyLevel, "energyLevel", 50);
  payload.overallRating = normalizeScore(body.overallRating, "overallRating", 50);

  payload.insight = normalizeText(body.insight, 5000);
  payload.affirmation = normalizeText(body.affirmation, 1000);
  payload.tomorrowPlan = normalizeText(body.tomorrowPlan, 5000);

  payload.wins = normalizeStringArray(body.wins);
  payload.mistakes = normalizeStringArray(body.mistakes);
  payload.gratitude = normalizeStringArray(body.gratitude);
  payload.achievement = normalizeStringArray(body.achievement);
  payload.distractions = normalizeStringArray(body.distractions);
  payload.customFields = normalizeCustomFields(body.customFields);

  return payload;
};

const buildPartialJournalPayload = (body) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "summary") || Object.prototype.hasOwnProperty.call(body, "content")) {
    payload.summary = normalizeText(body.summary ?? body.content ?? "", 5000);
    payload.content = payload.summary;
  }

  if (Object.prototype.hasOwnProperty.call(body, "mood")) {
    const normalizedMood = normalizeMood(body.mood);
    if (!normalizedMood) throw new Error("Invalid mood value");
    payload.mood = normalizedMood;
  }

  if (Object.prototype.hasOwnProperty.call(body, "wakeUpTime")) {
    payload.wakeUpTime = normalizeTime(body.wakeUpTime, "wakeUpTime");
  }
  if (Object.prototype.hasOwnProperty.call(body, "sleepTime")) {
    payload.sleepTime = normalizeTime(body.sleepTime, "sleepTime");
  }
  if (Object.prototype.hasOwnProperty.call(body, "energyLevel")) {
    payload.energyLevel = normalizeScore(body.energyLevel, "energyLevel", 50);
  }
  if (Object.prototype.hasOwnProperty.call(body, "overallRating")) {
    payload.overallRating = normalizeScore(body.overallRating, "overallRating", 50);
  }
  if (Object.prototype.hasOwnProperty.call(body, "insight")) {
    payload.insight = normalizeText(body.insight, 5000);
  }
  if (Object.prototype.hasOwnProperty.call(body, "affirmation")) {
    payload.affirmation = normalizeText(body.affirmation, 1000);
  }
  if (Object.prototype.hasOwnProperty.call(body, "tomorrowPlan")) {
    payload.tomorrowPlan = normalizeText(body.tomorrowPlan, 5000);
  }
  if (Object.prototype.hasOwnProperty.call(body, "wins")) {
    payload.wins = normalizeStringArray(body.wins);
  }
  if (Object.prototype.hasOwnProperty.call(body, "mistakes")) {
    payload.mistakes = normalizeStringArray(body.mistakes);
  }
  if (Object.prototype.hasOwnProperty.call(body, "gratitude")) {
    payload.gratitude = normalizeStringArray(body.gratitude);
  }
  if (Object.prototype.hasOwnProperty.call(body, "achievement")) {
    payload.achievement = normalizeStringArray(body.achievement);
  }
  if (Object.prototype.hasOwnProperty.call(body, "distractions")) {
    payload.distractions = normalizeStringArray(body.distractions);
  }
  if (Object.prototype.hasOwnProperty.call(body, "customFields")) {
    payload.customFields = normalizeCustomFields(body.customFields);
  }

  return payload;
};

const hasMeaningfulContent = (payload) => Boolean(
  payload.summary ||
  payload.mood ||
  payload.wakeUpTime ||
  payload.sleepTime ||
  payload.insight ||
  payload.affirmation ||
  payload.tomorrowPlan ||
  payload.wins.length ||
  payload.mistakes.length ||
  payload.gratitude.length ||
  payload.achievement.length ||
  payload.distractions.length ||
  payload.customFields.length
);

const toSafePagination = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

// Create journal entry for a day (upsert by dayKey).
export const createJournalEntry = async (req, res) => {
  try {
    const inputDate = parseDateInput(req.body.date) || new Date();
    const dayKey = toDayKey(inputDate);
    const todayKey = toDayKey(new Date());
    const payload = buildJournalPayload(req.body);

    if (!payload.mood && !hasMeaningfulContent(payload)) {
      return res.status(400).json({ message: "Please add journal content before saving." });
    }

    if (dayKey !== todayKey) {
      return res.status(403).json({
        message: "Only today's journal entry can be created or edited. Past entries are locked."
      });
    }

    // Keep legacy behavior valid if client only sends mood/content.
    if (!payload.mood) payload.mood = "Neutral";

    const entryDate = getStartOfDay(inputDate);

    const existing = await Journal.findOne({ userId: req.user.id, dayKey });
    if (existing) {
      Object.assign(existing, payload, { date: entryDate, dayKey });
      await existing.save();
      return res.status(200).json(existing);
    }

    try {
      const entry = await Journal.create({
        userId: req.user.id,
        dayKey,
        date: entryDate,
        ...payload
      });

      return res.status(201).json(entry);
    } catch (createError) {
      // If two requests race for the same day, recover by updating the winning document.
      if (createError?.code === 11000) {
        const winner = await Journal.findOne({ userId: req.user.id, dayKey });
        if (winner) {
          Object.assign(winner, payload, { date: entryDate, dayKey });
          await winner.save();
          return res.status(200).json(winner);
        }
      }
      throw createError;
    }
  } catch (error) {
    return res.status(400).json({ message: error.message || "Invalid journal payload" });
  }
};

export const updateJournalEntry = async (req, res) => {
  try {
    const entry = await Journal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    const todayKey = toDayKey(new Date());
    if (entry.dayKey !== todayKey) {
      return res.status(403).json({
        message: "Past journal entries are locked and cannot be edited."
      });
    }

    const payload = buildPartialJournalPayload(req.body);

    // Optional date update (moves dayKey accordingly).
    if (req.body.date !== undefined) {
      const parsedDate = parseDateInput(req.body.date);
      if (!parsedDate) {
        return res.status(400).json({ message: "Valid date is required" });
      }

      const nextDayKey = toDayKey(parsedDate);
      if (nextDayKey !== todayKey) {
        return res.status(403).json({
          message: "Only today's journal entry can be edited."
        });
      }

      const collidingEntry = await Journal.findOne({
        _id: { $ne: entry._id },
        userId: req.user.id,
        dayKey: nextDayKey
      });
      if (collidingEntry) {
        return res.status(409).json({
          message: "A journal entry already exists for that day."
        });
      }

      entry.date = getStartOfDay(parsedDate);
      entry.dayKey = nextDayKey;
    }

    Object.assign(entry, payload);
    if (!entry.mood) entry.mood = "Neutral";

    await entry.save();
    return res.json(entry);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Invalid journal payload" });
  }
};

export const getJournalEntries = async (req, res) => {
  try {
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = toSafePagination(req.query.page, 1, 1, 100000);
    const limit = toSafePagination(req.query.limit, 30, 1, 200);
    const skip = (page - 1) * limit;

    const fromDate = parseDateInput(req.query.from);
    const toDate = parseDateInput(req.query.to);

    const filter = { userId: req.user.id };
    if (req.query.mood) {
      const normalizedMood = normalizeMood(req.query.mood);
      if (!normalizedMood) {
        return res.status(400).json({ message: "Invalid mood filter" });
      }
      filter.mood = normalizedMood;
    }

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = getStartOfDay(fromDate);
      if (toDate) filter.date.$lt = new Date(getStartOfDay(toDate).getTime() + DAY_MS);
    }

    if (!hasPagination) {
      const entries = await Journal.find(filter).sort({ date: -1, _id: -1 });
      return res.json(entries);
    }

    const [entries, total] = await Promise.all([
      Journal.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit),
      Journal.countDocuments(filter)
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      entries
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getJournalEntryById = async (req, res) => {
  try {
    const entry = await Journal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }
    return res.json(entry);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteJournalEntry = async (req, res) => {
  try {
    const entry = await Journal.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    const todayKey = toDayKey(new Date());
    if (entry.dayKey !== todayKey) {
      return res.status(403).json({
        message: "Past journal entries are locked and cannot be deleted."
      });
    }

    await entry.deleteOne();
    return res.json({ message: "Journal entry deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getJournalSummary = async (req, res) => {
  try {
    const today = getStartOfDay();
    const todayKey = toDayKey(today);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));

    const [todayEntry, weekEntries, totalEntries, moodStats, loggedDaysAgg] = await Promise.all([
      Journal.findOne({ userId: req.user.id, dayKey: todayKey }).select("_id dayKey"),
      Journal.find({
        userId: req.user.id,
        date: { $gte: weekStart, $lt: new Date(today.getTime() + DAY_MS) }
      }).select("achievement wins mistakes energyLevel overallRating mood"),
      Journal.countDocuments({ userId: req.user.id }),
      Journal.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
        { $group: { _id: "$mood", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }
      ]),
      Journal.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
        {
          $project: {
            day: {
              $ifNull: [
                "$dayKey",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$date",
                    timezone: APP_TIMEZONE
                  }
                }
              ]
            }
          }
        },
        { $group: { _id: "$day" } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const achievementsThisWeek = weekEntries.reduce(
      (sum, entry) => sum + (Array.isArray(entry.achievement) ? entry.achievement.length : 0),
      0
    );
    const winsThisWeek = weekEntries.reduce(
      (sum, entry) => sum + (Array.isArray(entry.wins) ? entry.wins.length : 0),
      0
    );
    const mistakesThisWeek = weekEntries.reduce(
      (sum, entry) => sum + (Array.isArray(entry.mistakes) ? entry.mistakes.length : 0),
      0
    );
    const avgEnergyThisWeek = weekEntries.length > 0
      ? Math.round(weekEntries.reduce((sum, entry) => sum + (Number(entry.energyLevel) || 0), 0) / weekEntries.length)
      : 0;
    const avgDayRatingThisWeek = weekEntries.length > 0
      ? Math.round(weekEntries.reduce((sum, entry) => sum + (Number(entry.overallRating) || 0), 0) / weekEntries.length)
      : 0;
    const weekMoodCounts = new Map();
    for (const entry of weekEntries) {
      const mood = String(entry?.mood || "Neutral");
      weekMoodCounts.set(mood, (weekMoodCounts.get(mood) || 0) + 1);
    }
    const topMoodThisWeek = [...weekMoodCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    const loggedDays = loggedDaysAgg
      .map((item) => String(item?._id || ""))
      .filter(Boolean);
    const loggedDaySet = new Set(loggedDays);
    let currentStreakDays = 0;
    let cursor = getStartOfDay(today);
    // Keep yesterday's streak visible after midnight until today's entry is added.
    if (!todayEntry) {
      cursor = new Date(cursor.getTime() - DAY_MS);
    }
    while (loggedDaySet.has(toDayKey(cursor))) {
      currentStreakDays += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }

    const lifetimeLoggedDays = loggedDays.length;
    const firstLoggedDay = loggedDays[0] || null;
    const lifetimeExpectedDays = firstLoggedDay
      ? Math.max(1, Math.floor((today.getTime() - getStartOfDay(firstLoggedDay).getTime()) / DAY_MS) + 1)
      : 0;
    const lifetimeConsistency = lifetimeExpectedDays > 0
      ? Number(((lifetimeLoggedDays / lifetimeExpectedDays) * 100).toFixed(1))
      : 0;

    return res.json({
      todayLogged: Boolean(todayEntry),
      daysThisWeek: weekEntries.length,
      achievementsThisWeek,
      winsThisWeek,
      mistakesThisWeek,
      totalEntries,
      currentStreakDays,
      lifetimeLoggedDays,
      lifetimeExpectedDays,
      lifetimeConsistency,
      currentWeek: {
        daysLogged: weekEntries.length,
        avgEnergy: avgEnergyThisWeek,
        avgDayRating: avgDayRatingThisWeek,
        totalWins: winsThisWeek,
        totalMistakes: mistakesThisWeek,
        achievements: achievementsThisWeek,
        topMood: topMoodThisWeek
          ? { mood: topMoodThisWeek[0], count: topMoodThisWeek[1] }
          : null
      },
      topMoods: moodStats.slice(0, 5).map((item) => ({
        mood: item._id || "Neutral",
        count: item.count
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getJournalHeatmap = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { year } = req.query;

    const parsedYear = Number.parseInt(year, 10);
    const hasYearFilter = Number.isFinite(parsedYear);

    if (year !== undefined && !hasYearFilter) {
      return res.status(400).json({ message: "Year must be a valid number" });
    }
    if (hasYearFilter && (parsedYear < 1970 || parsedYear > 3000)) {
      return res.status(400).json({ message: "Year must be between 1970 and 3000" });
    }

    const match = { userId };
    if (hasYearFilter) {
      const startDate = new Date(parsedYear, 0, 1);
      const endDate = new Date(parsedYear + 1, 0, 1);
      match.date = { $gte: startDate, $lt: endDate };
    }

    const [byDay, byYear] = await Promise.all([
      Journal.aggregate([
        { $match: match },
        {
          $project: {
            day: {
              $ifNull: [
                "$dayKey",
                {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$date",
                    timezone: APP_TIMEZONE
                  }
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: "$day",
            entries: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Journal.aggregate([
        { $match: { userId } },
        {
          $project: {
            year: {
              $toInt: {
                $substr: [
                  {
                    $ifNull: [
                      "$dayKey",
                      {
                        $dateToString: {
                          format: "%Y-%m-%d",
                          date: "$date",
                          timezone: APP_TIMEZONE
                        }
                      }
                    ]
                  },
                  0,
                  4
                ]
              }
            }
          }
        },
        {
          $group: {
            _id: "$year"
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const values = byDay.map((item) => ({
      date: item._id,
      count: 1,
      entries: item.entries
    }));

    const years = byYear.map((item) => item._id).filter((item) => Number.isFinite(item));

    return res.json({
      values,
      years,
      totalSubmittedDays: values.length,
      totalEntries: byDay.reduce((sum, item) => sum + (Number(item.entries) || 0), 0)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getJournalCustomFields = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("journalCustomFieldTemplates");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      templates: Array.isArray(user.journalCustomFieldTemplates)
        ? user.journalCustomFieldTemplates
        : []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const replaceJournalCustomFields = async (req, res) => {
  try {
    const templates = normalizeCustomFieldTemplates(req.body?.templates);
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.journalCustomFieldTemplates = templates;
    await user.save();

    return res.json({ templates: user.journalCustomFieldTemplates });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Invalid templates payload" });
  }
};
