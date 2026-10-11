export const DEFAULT_TODO_CATEGORIES = ["Work", "Study", "Fitness", "Health", "Personal", "Bill & Payment", "Shopping", "Others"];
export const DEFAULT_IMPORTANT_CATEGORIES = ["Health", "Bill & Payment"];

export function normalizeTodoPreferences(body) {
  const normalize = (values, defaults) => {
    if (!Array.isArray(values) || values.length > 100) throw new Error("Categories must be an array of at most 100 names");
    const names = new Map(defaults.map(name => [name.toLowerCase(), name]));
    for (const value of values) {
      if (typeof value !== "string" || !value.trim() || value.trim().length > 80) throw new Error("Category names must contain 1–80 characters");
      const name = value.trim();
      if (!names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
    }
    return [...names.values()];
  };
  return {
    categories: normalize(body.categories, DEFAULT_TODO_CATEGORIES),
    importantCategories: normalize(body.importantCategories, DEFAULT_IMPORTANT_CATEGORIES),
  };
}
