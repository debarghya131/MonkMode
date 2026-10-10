import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Static imports run before server.js's body. Load configuration here so route
// limits, model hooks and controller formatters all see the same settings.
dotenv.config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || fileURLToPath(new URL("../.env", import.meta.url)) });

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";
// Fail early on a misspelled zone rather than silently grouping records wrongly.
new Intl.DateTimeFormat("en", { timeZone: APP_TIMEZONE }).format(new Date());
process.env.APP_TIMEZONE = APP_TIMEZONE;
// Existing calendar/schedule code uses local Date methods. Align those methods
// with the explicit timezone used by MongoDB aggregations and Intl formatters.
process.env.TZ = APP_TIMEZONE;
