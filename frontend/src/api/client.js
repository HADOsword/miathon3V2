import axios from "axios";

export const TOKEN_KEY = "token";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures; API calls will still surface auth errors.
  }
};

export const clearAuthToken = () => setAuthToken("");

const decodeJwtPayload = (token) => {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  return JSON.parse(atob(padded));
};

export const hasValidAuthToken = () => {
  const token = getAuthToken();

  if (!token) {
    return false;
  }

  try {
    const payload = decodeJwtPayload(token);
    const expiresAt = Number(payload?.exp || 0) * 1000;

    if (!expiresAt || expiresAt <= Date.now()) {
      clearAuthToken();
      return false;
    }

    return true;
  } catch {
    clearAuthToken();
    return false;
  }
};

export const getApiErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.msg ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const isUnauthorizedError = (error) => error?.response?.status === 401;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isUnauthorizedError(error)) {
      clearAuthToken();
    }

    return Promise.reject(error);
  }
);

export default api;
