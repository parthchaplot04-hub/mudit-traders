import axios from "axios";

/**
 * Centralized API client - the ONLY place that knows the backend URL
 * (spec section 60). Every request/service module imports this instead
 * of calling axios/fetch directly against a hardcoded URL.
 */
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5001/api");

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("mt_token");
      localStorage.removeItem("mt_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || "Something went wrong.";
  }
  return "Something went wrong.";
}
