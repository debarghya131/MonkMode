import Groq from "groq-sdk";
import Journal from "../models/Journal.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import TodoLog from "../models/TodoLog.js";
import Goal from "../models/Goal.js";
import GoalProgressLog from "../models/GoalProgressLog.js";
import GymExerciseProgress from "../models/GymExerciseProgress.js";
import GymMeasurement from "../models/GymMeasurement.js";

let groq = null;
const getGroq = () => {
  if (!groq) groq = new Groq({ apiKey: process.env.API_KEY });
  return groq;
};

function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getFromDate(scope) {
  const from = new Date();
  if (scope === "30d") from.setDate(from.getDate() - 30);
  else if (scope === "all") return null;
  else from.setDate(from.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  return from;
}

async function fetchUserContext(userId, scope) {
  const fromDate = getFromDate(scope);
  const fromDayKey = fromDate ? toDayKey(fromDate) : null;
  const todayKey = toDayKey(new Date());

  const dateFilter = fromDate ? { $gte: fromDate } : {};
  const dayKeyFilter = fromDayKey ? { $gte: fromDayKey, $lte: todayKey } : {};

  const [journalDocs, activeHabits, todoCompleted, todoCreated, activeGoals, progressLogs, exerciseProgress, measurements] = await Promise.all([
    Journal.find({ userId, ...(fromDate ? { date: dateFilter } : {}) }, { mood: 1, energyLevel: 1, overallRating: 1 }).lean(),
    Habit.find({ userId, deletedAt: null }, { _id: 1, frequency: 1 }).lean(),
    TodoLog.countDocuments({ userId, action: "ended", ...(fromDate ? { createdAt: dateFilter } : {}) }),
    TodoLog.countDocuments({ userId, action: "created", ...(fromDate ? { createdAt: dateFilter } : {}) }),
    Goal.find({ userId, deletedAt: null }, { _id: 1, completed: 1 }).lean(),
    GoalProgressLog.find({ userId, ...(fromDate ? { date: dateFilter } : {}) }).lean(),
    GymExerciseProgress.find({ userId, ...(fromDayKey ? { date: dayKeyFilter } : {}) }, { date: 1, exerciseName: 1, bodyPart: 1 }).lean(),
    GymMeasurement.find({ userId, deletedAt: null, ...(fromDayKey ? { checkInDate: dayKeyFilter } : {}) }, { checkInDate: 1 }).lean(),
  ]);

  const habitIds = activeHabits.map((h) => h._id);
  const habitLogs = fromDate
    ? await HabitLog.find({ habitId: { $in: habitIds }, date: dateFilter }).lean()
    : await HabitLog.find({ habitId: { $in: habitIds } }).lean();

  const dayCount = fromDate ? Math.max(1, Math.ceil((Date.now() - fromDate.getTime()) / 86400000)) : 0;
  const dailyCount = activeHabits.filter((h) => h.frequency !== "weekly").length;
  const weeklyCount = activeHabits.filter((h) => h.frequency === "weekly").length;
  const possibleLogs = fromDate
    ? dailyCount * dayCount + weeklyCount * Math.max(1, Math.floor(dayCount / 7))
    : habitLogs.length;
  const completedLogs = habitLogs.filter((l) => l.completed).length;

  const moodCounts = {};
  journalDocs.forEach((j) => { if (j.mood) moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const workoutDays = [...new Set(exerciseProgress.map((e) => e.date))].length;
  const uniqueExercises = [...new Set(exerciseProgress.map((e) => e.exerciseName?.toLowerCase().trim()).filter(Boolean))].length;
  const bodyPartsWorked = [...new Set(exerciseProgress.map((e) => e.bodyPart).filter(Boolean))];

  return {
    scope,
    journal: {
      entryCount: journalDocs.length,
      avgEnergyLevel: journalDocs.length ? Math.round(journalDocs.reduce((s, j) => s + (j.energyLevel ?? 50), 0) / journalDocs.length) : 0,
      avgOverallRating: journalDocs.length ? Math.round(journalDocs.reduce((s, j) => s + (j.overallRating ?? 50), 0) / journalDocs.length) : 0,
      topMood,
    },
    habits: {
      totalActiveHabits: activeHabits.length,
      completedLogs,
      completionRate: possibleLogs > 0 ? Math.min(100, Math.round((completedLogs / possibleLogs) * 100)) : 0,
    },
    todos: {
      completed: todoCompleted,
      created: todoCreated,
      completionRate: todoCreated > 0 ? Math.round((todoCompleted / todoCreated) * 100) : 0,
    },
    goals: {
      activeGoals: activeGoals.length,
      completedGoals: activeGoals.filter((g) => g.completed).length,
      progressUpdates: progressLogs.length,
      goalsUpdated: [...new Set(progressLogs.map((l) => l.goalId.toString()))].length,
    },
    gym: { workoutDays, uniqueExercises, bodyPartsWorked, measurementsTaken: measurements.length },
  };
}

function buildSystemPrompt(ctx) {
  const { scope, journal, habits, todos, goals, gym } = ctx;
  const scopeLabel = scope === "30d" ? "30 days" : scope === "all" ? "all time" : "7 days";

  return `You are Ming — a discipline guide inside MonkMode, a personal productivity app. You speak with calm authority and ancient wisdom. You are direct, specific, and practical. Never vague, never overly motivational.

Rules:
- Keep every response under 120 words
- Use the user's actual data below to personalize your advice
- If the user asks something unrelated to productivity, habits, goals, or health, gently redirect them
- Never say you are an AI or mention a language model
- Do not use bullet points unless listing steps — prefer flowing sentences

User's data (${scopeLabel}):
- Journal: ${journal.entryCount} ${journal.entryCount === 1 ? "entry" : "entries"}${journal.entryCount > 0 ? `, avg energy ${journal.avgEnergyLevel}/100, avg rating ${journal.avgOverallRating}/100${journal.topMood ? `, top mood: ${journal.topMood}` : ""}` : " — no entries this period"}
- Habits: ${habits.totalActiveHabits} active${habits.totalActiveHabits > 0 ? `, ${habits.completionRate}% completion rate, ${habits.completedLogs} completions` : " — none set up"}
- Todos: ${todos.created > 0 ? `${todos.completed} completed of ${todos.created} created (${todos.completionRate}%)` : "no tasks created"}
- Goals: ${goals.activeGoals} active${goals.activeGoals > 0 ? `, ${goals.progressUpdates} progress updates, ${goals.completedGoals} completed` : ""}
- Gym: ${gym.workoutDays > 0 ? `${gym.workoutDays} workout days, ${gym.uniqueExercises} exercises${gym.bodyPartsWorked.length ? `, body parts: ${gym.bodyPartsWorked.join(", ")}` : ""}` : "no sessions this period"}`;
}

export const chatWithMing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, history = [], scope = "7d" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ctx = await fetchUserContext(userId, scope);
    const systemPrompt = buildSystemPrompt(ctx);

    const pastMessages = (Array.isArray(history) ? history : [])
      .slice(-10)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: String(m.content || "") }));

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...pastMessages,
      { role: "user", content: message.trim() },
    ];

    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages,
      temperature: 0.72,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "The path forward requires stillness. Reflect on what you logged today and return.";

    res.json({ reply });
  } catch (err) {
    console.error("chatWithMing error:", err);
    res.status(500).json({ error: "Ming is unavailable. Try again shortly." });
  }
};
