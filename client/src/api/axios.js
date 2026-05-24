import axios from "axios";

const RATE_LIMIT_EVENT = "monkmode:rate-limit";

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
  (error) => {
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
