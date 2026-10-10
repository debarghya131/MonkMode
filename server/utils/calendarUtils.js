import "../config/runtime.js";

export const addCalendarDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

export const calendarDaysBetween = (start, end) => {
  const calendarTime = (value) => {
    const date = new Date(value);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return (calendarTime(end) - calendarTime(start)) / 86_400_000;
};
