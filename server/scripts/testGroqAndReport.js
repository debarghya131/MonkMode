import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Journal from "../models/Journal.js";
import JournalWeeklySummary from "../models/JournalWeeklySummary.js";
import Todo from "../models/Todo.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = mongoose.model("User", new mongoose.Schema({ email: String }, { strict: false }));
  const user = await User.findOne({ email: "rahul@gmail.com" }).lean();
  const uid = user._id;

  // Check cached AI summary
  const cached = await JournalWeeklySummary.findOne({ userId: uid, weekStart: "2026-05-04" }).lean();
  console.log("Cached AI summary:", cached ? `"${cached.aiSummary.slice(0, 80)}..."` : "NONE");

  // Todo data for May 4-10
  const todos = await Todo.find({ userId: uid, deletedAt: null }).lean();
  const weekTodos = todos.filter(t =>
    (t.dayStates || []).some(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10")
  );
  let totalTasks = 0, totalCompleted = 0, totalMissed = 0, totalPending = 0;
  for (const t of weekTodos) {
    const ws = (t.dayStates || []).filter(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10");
    for (const ds of ws) {
      totalTasks++;
      if (ds.status === "completed") totalCompleted++;
      else if (ds.status === "missed") totalMissed++;
      else totalPending++;
    }
  }
  console.log("\nTodo stats for May 4-10:");
  console.log(`  Total: ${totalTasks}, Completed: ${totalCompleted}, Missed: ${totalMissed}, Pending: ${totalPending}`);

  // Test Groq API with a minimal call
  console.log("\nTesting Groq API...");
  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "Say OK in one word." }],
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("Groq API ERROR:", res.status, err);
    } else {
      const data = await res.json();
      console.log("Groq API response:", data.choices?.[0]?.message?.content);
    }
  } catch (err) {
    console.log("Groq API fetch error:", err.message);
  }

  await mongoose.disconnect();
}
main().catch(console.error);
