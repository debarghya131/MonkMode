import axios from "axios";

const RATE_LIMIT_EVENT = "monkmode:rate-limit";
const COLD_START_RETRY_DELAY_MS = 2_500;
const MAX_COLD_START_RETRIES = 3;

const delay = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const isRetryableColdStartError = (error) => {
  const status = error?.response?.status;
  return !status || [502, 503, 504].includes(status);
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"
});

let tokenProvider = async () => "";

export const setApiTokenProvider = (provider) => {
  tokenProvider = typeof provider === "function" ? provider : async () => "";
};

api.interceptors.request.use(async (config) => {
  const token = await tokenProvider();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const method = config?.method?.toLowerCase();
    const retries = Number(config?.coldStartRetries || 0);

    // Reads are safe to repeat. This covers a tab returning after Render has
    // slept, without ever replaying a form submission or other write action.
    if (
      typeof window !== "undefined"
      && method === "get"
      && !config?.skipColdStartRetry
      && !config?.signal?.aborted
      && retries < MAX_COLD_START_RETRIES
      && isRetryableColdStartError(error)
    ) {
      await delay(COLD_START_RETRY_DELAY_MS);
      return api({ ...config, coldStartRetries: retries + 1 });
    }

    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 429 && typeof window !== "undefined") {
      const normalizedMessage = typeof message === "string" ? message.trim() : "";
      const isDailyLimitMessage = /\bdaily\b|\btomorrow\b/i.test(normalizedMessage);

      window.dispatchEvent(
        new CustomEvent(RATE_LIMIT_EVENT, {
          detail: {
            message: isDailyLimitMessage
              ? "Today's limit is over for this feature. Try again tomorrow."
              : normalizedMessage || "Too many requests right now. Please try again shortly.",
          },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export default api;
