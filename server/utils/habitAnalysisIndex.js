export const HABIT_ANALYSIS_INDEX = { userId: 1, createdAt: -1 };
export const HABIT_ANALYSIS_INDEX_NAME = "userId_1_createdAt_-1";

export function hasHabitAnalysisIndex(indexes) {
  return indexes.some(index => !index.sparse && !index.partialFilterExpression && !index.hidden
    && JSON.stringify(index.key) === JSON.stringify(HABIT_ANALYSIS_INDEX));
}

export async function ensureHabitAnalysisIndex(collection, { apply = false } = {}) {
  let indexes;
  try { indexes = await collection.listIndexes().toArray(); }
  catch (error) { if (error.code !== 26) throw error; indexes = []; }
  if (hasHabitAnalysisIndex(indexes)) return "already-present";
  if (indexes.some(index => index.name === HABIT_ANALYSIS_INDEX_NAME)) {
    throw new Error("Habit analysis index name conflicts with an existing index; inspect it manually. Nothing dropped.");
  }
  if (!apply) return "would-create";
  await collection.createIndex(HABIT_ANALYSIS_INDEX, { name: HABIT_ANALYSIS_INDEX_NAME });
  return "created";
}
