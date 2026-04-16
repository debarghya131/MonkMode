const DEFAULT_CATEGORIES = ["Work", "Study", "Fitness", "Health", "Personal", "Bill & Payment", "Shopping", "Others"];

const DEFAULT_IMPORTANT_CATEGORIES = ["Health", "Bill & Payment"];

const isDefaultCategory = (categoryName = "") =>
  DEFAULT_CATEGORIES.some((item) => item.toLowerCase() === categoryName.toLowerCase());

const isDefaultImportantCategory = (categoryName = "") =>
  DEFAULT_IMPORTANT_CATEGORIES.some((item) => item.toLowerCase() === categoryName.toLowerCase());

export { DEFAULT_CATEGORIES, DEFAULT_IMPORTANT_CATEGORIES, isDefaultCategory, isDefaultImportantCategory };
