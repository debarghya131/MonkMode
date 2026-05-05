const DEFAULT_CATEGORIES = ["Work", "Study", "Fitness", "Health", "Personal", "Bill & Payment", "Shopping", "Others"];

const DEFAULT_IMPORTANT_CATEGORIES = ["Health", "Bill & Payment"];
const IMPORTANT_TODO_CATEGORIES_STORAGE_KEY = "monkmode.todo.important_categories.v1";
const TODO_CATEGORY_STORAGE_KEY = "monkmode.todo.custom_categories.v1";

const isDefaultCategory = (categoryName = "") =>
  DEFAULT_CATEGORIES.some((item) => item.toLowerCase() === categoryName.toLowerCase());

const isDefaultImportantCategory = (categoryName = "") =>
  DEFAULT_IMPORTANT_CATEGORIES.some((item) => item.toLowerCase() === categoryName.toLowerCase());

export {
  DEFAULT_CATEGORIES,
  DEFAULT_IMPORTANT_CATEGORIES,
  IMPORTANT_TODO_CATEGORIES_STORAGE_KEY,
  TODO_CATEGORY_STORAGE_KEY,
  isDefaultCategory,
  isDefaultImportantCategory
};
