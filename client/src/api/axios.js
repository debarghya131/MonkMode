import axios from "axios";

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

export default api;
