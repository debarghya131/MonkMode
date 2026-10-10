export const findActivityTtlIndexes = (indexes, field) => indexes.filter((index) =>
  index.expireAfterSeconds != null && index.key?.[field] === 1 && Object.keys(index.key).length === 1
);

export const findHabitCompletionTtlIndexes = (indexes) => findActivityTtlIndexes(indexes, "date");
