export const valueLabel = (value, unit = "") => value === null || value === undefined ? "No data" : String(value) + (unit ? " " + unit : "");
export const countLabel = (value, singular) => `${value} ${singular}${value === 1 ? "" : "s"}`;
export const signedLabel = (value, unit = "") => value === null || value === undefined ? "No comparison" : (value > 0 ? "+" : "") + valueLabel(value, unit);

