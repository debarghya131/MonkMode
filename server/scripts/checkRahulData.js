import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import Journal from "../models/Journal.js";
import Todo from "../models/Todo.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const User = mongoose.model("User", new mongoose.Schema({ email: String }, { strict: false }));
  const user = await User.findOne({ email: "rahul@gmail.com" }).lean();
  const uid = user._id;
  console.log("userId:", uid.toString());

  // All journal entries (any date)
  const allJournals = await Journal.find({ userId: uid }, { dayKey: 1, overallRating: 1 }).sort({ dayKey: 1 }).lean();
  console.log("\nAll journal entries:", allJournals.map(j => `${j.dayKey} (rating:${j.overallRating ?? "N/A"})`));

  // Todos with dayStates in May 4-10
  const todos = await Todo.find(
    { userId: uid, deletedAt: null },
    { title: 1, category: 1, dayStates: 1 }
  ).lean();

  const weekTodos = todos.filter(t =>
    (t.dayStates || []).some(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10")
  );
  console.log("\nTotal todos for user:", todos.length);
  console.log("Todos with dayStates in May 4-10:", weekTodos.length);
  weekTodos.slice(0, 5).forEach(t => {
    const week = (t.dayStates || []).filter(ds => ds.dayKey >= "2026-05-04" && ds.dayKey <= "2026-05-10");
    console.log(` - "${t.title}" [${t.category}]:`, week.map(ds => `${ds.dayKey}=${ds.status}`).join(", "));
  });

  await mongoose.disconnect();
}
main().catch(console.error);
